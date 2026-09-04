from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
import logging
import os
import re
import json
import uuid
import asyncio
import secrets
import smtplib
from email.mime.text import MIMEText

import requests
from fpdf import FPDF
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Header, Response
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI(title="ConstróiFácil API")
api = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

# Freight distance factor from São Paulo hub (a rough public heuristic — good enough for
# an estimate before checkout on the real store page). Multipliers over a base freight
# per kg of estimated weight, plus regional flat rate.
FREIGHT_TABLE: Dict[str, Dict[str, float]] = {
    "SP": {"base": 18.0, "days": 2}, "RJ": {"base": 24.0, "days": 3},
    "MG": {"base": 26.0, "days": 3}, "ES": {"base": 32.0, "days": 4},
    "PR": {"base": 28.0, "days": 3}, "SC": {"base": 32.0, "days": 4},
    "RS": {"base": 38.0, "days": 5}, "BA": {"base": 42.0, "days": 5},
    "PE": {"base": 48.0, "days": 6}, "CE": {"base": 52.0, "days": 6},
    "DF": {"base": 34.0, "days": 4}, "GO": {"base": 34.0, "days": 4},
    "MT": {"base": 44.0, "days": 5}, "MS": {"base": 38.0, "days": 5},
    "PA": {"base": 68.0, "days": 8}, "AM": {"base": 78.0, "days": 9},
    "RO": {"base": 72.0, "days": 8}, "AC": {"base": 82.0, "days": 9},
    "AP": {"base": 78.0, "days": 9}, "RR": {"base": 82.0, "days": 9},
    "TO": {"base": 52.0, "days": 6}, "MA": {"base": 55.0, "days": 6},
    "PI": {"base": 55.0, "days": 6}, "RN": {"base": 55.0, "days": 6},
    "PB": {"base": 52.0, "days": 6}, "AL": {"base": 52.0, "days": 6},
    "SE": {"base": 52.0, "days": 6},
}


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class SessionInput(BaseModel):
    session_id: str


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6)


class Opening(BaseModel):
    """A door or window attached to one wall of a room.

    `pos` is a 0..1 ratio along that wall (0.5 = centered) so the opening keeps its
    relative placement when the room is resized; `width` is in metres.
    """

    id: str = ""
    side: str = "n"
    kind: str = "janela"
    pos: float = 0.5
    width: float = Field(default=0.9, gt=0)


class PlacedItem(BaseModel):
    kind: str
    x: float = 0
    z: float = 0
    ry: float = 0


class Room(BaseModel):
    name: str
    width: float = Field(gt=0)
    length: float = Field(gt=0)
    x: float = 0
    y: float = 0
    floor: int = 0
    # Which of the four walls still exist. A side removed from this list was deleted on
    # purpose, to merge this room with the neighbouring one (open concept).
    walls: List[str] = ["n", "s", "w", "e"]
    openings: List[Opening] = []
    # Furniture the person positioned by hand in the 3D view. x/z are metres relative to
    # the centre of the room, ry is the rotation in radians.
    items: List[PlacedItem] = []


class ProjectInput(BaseModel):
    name: str = "Meu projeto"
    build_type: str = "Casa térrea"
    width: float = Field(gt=0)
    length: float = Field(gt=0)
    rooms: List[Room] = []
    cep: str = ""


class CartItem(BaseModel):
    offer_id: str
    title: str
    price: float
    store: str
    url: str = ""
    thumbnail: str = ""
    freight: float = 0.0
    quantity: int = 1
    purchased: bool = False


class PurchasedInput(BaseModel):
    purchased: bool


class AlertInput(BaseModel):
    query: str
    target_price: float = Field(gt=0)


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    # Strips fields that should never reach the client. password_hash only exists on
    # user documents (harmless no-op for projects/alerts/etc.), but without this,
    # every /auth/me call and every login response was sending the bcrypt hash of
    # the person's password straight to the app — never actually used there, and
    # exactly the kind of thing that shouldn't leave the server.
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def current_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sessão necessária")
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Sessão expirada")
    expires = session["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(401, "Sessão expirada")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user


async def issue_session(user: Dict[str, Any]) -> Dict[str, Any]:
    token = uuid.uuid4().hex + uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    await db.user_sessions.insert_one({"session_token": token, "user_id": user["user_id"], "created_at": now, "expires_at": now + timedelta(days=7)})
    return {"session_token": token, "user": clean(dict(user))}


@app.on_event("startup")
async def indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.password_resets.create_index("email", unique=True)
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    await db.projects.create_index([("user_id", 1), ("project_id", 1)], unique=True)
    await db.cart_items.create_index([("user_id", 1), ("offer_id", 1)], unique=True)
    await db.alerts.create_index([("user_id", 1), ("query", 1)])


@api.post("/auth/register")
async def register(body: Credentials):
    email = body.email.lower()
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(409, "Este e-mail já está cadastrado")
    user = {"user_id": "user_" + uuid.uuid4().hex[:12], "email": email, "name": body.name or email.split("@")[0], "password_hash": pwd_context.hash(body.password), "created_at": datetime.now(timezone.utc)}
    await db.users.insert_one(dict(user))
    user.pop("password_hash", None)
    return await issue_session(user)


@api.post("/auth/login")
async def login(body: Credentials):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash") or not pwd_context.verify(body.password, user["password_hash"]):
        raise HTTPException(401, "E-mail ou senha incorretos")
    user.pop("password_hash", None)
    return await issue_session(user)


@api.post("/auth/session")
async def google_session(body: SessionInput):
    try:
        response = await asyncio.to_thread(requests.get, "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": body.session_id}, timeout=15)
        if response.status_code != 200:
            raise HTTPException(401, "Não foi possível concluir o login Google")
        data = response.json()
        email = data.get("email", "").lower()
        if not email:
            raise HTTPException(401, "Identidade Google inválida")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            user = {"user_id": "user_" + uuid.uuid4().hex[:12], "email": email, "name": data.get("name") or email.split("@")[0], "picture": data.get("picture"), "created_at": datetime.now(timezone.utc)}
            await db.users.insert_one(dict(user))
        return await issue_session(user)
    except requests.RequestException:
        raise HTTPException(502, "Serviço Google indisponível")


@api.get("/auth/me")
async def me(authorization: Optional[str] = Header(default=None)):
    return {"user": clean(dict(await current_user(authorization)))}


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordInput, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    if not user.get("password_hash") or not pwd_context.verify(body.current_password, user["password_hash"]):
        raise HTTPException(401, "Senha atual incorreta")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": pwd_context.hash(body.new_password)}})
    return {"ok": True}


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Sends a plain-text email over SMTP. Works with Gmail (with an App Password),
    Outlook, or any transactional email provider that exposes SMTP — configure via
    the SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM environment variables.
    Returns False (never raises) if SMTP isn't configured or sending fails, so a
    misconfigured mail server never crashes the request — the caller decides what
    to tell the user.
    """
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASS")
    port = int(os.environ.get("SMTP_PORT", "587"))
    from_addr = os.environ.get("SMTP_FROM", user or "")
    if not host or not user or not password:
        logging.warning("SMTP not configured — skipping email send to %s", to_email)
        return False
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = to_email
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        return True
    except Exception as e:
        logging.warning("Failed to send email to %s: %s", to_email, e)
        return False


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordInput):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    # Always return the same generic message whether or not the email exists —
    # this avoids letting someone probe which emails have an account here.
    generic = {"ok": True, "message": "Se esse e-mail tiver uma conta, enviamos um código de 6 dígitos para ele."}
    if not user:
        return generic
    code = f"{secrets.randbelow(1000000):06d}"
    now = datetime.now(timezone.utc)
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"email": email, "code_hash": pwd_context.hash(code), "created_at": now, "expires_at": now + timedelta(minutes=30), "attempts": 0}},
        upsert=True,
    )
    sent = await asyncio.to_thread(
        _send_email,
        email,
        "Seu código para redefinir a senha — ConstróiFácil",
        f"Seu código de redefinição de senha é: {code}\n\nEle vale por 30 minutos. Se você não pediu isso, pode ignorar este e-mail.",
    )
    if not sent:
        logging.warning("Password reset email not sent (SMTP not configured or failed) for %s", email)
    return generic


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordInput):
    email = body.email.lower()
    reset = await db.password_resets.find_one({"email": email})
    if not reset:
        raise HTTPException(400, "Código inválido ou expirado. Peça um novo.")
    expires = reset["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"email": email})
        raise HTTPException(400, "Código expirado. Peça um novo.")
    if reset.get("attempts", 0) >= 5:
        await db.password_resets.delete_one({"email": email})
        raise HTTPException(400, "Muitas tentativas erradas. Peça um novo código.")
    if not pwd_context.verify(body.code, reset["code_hash"]):
        await db.password_resets.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(400, "Código incorreto")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": pwd_context.hash(body.new_password)}})
    await db.password_resets.delete_one({"email": email})
    return {"ok": True}


@api.get("/cep/{cep}")
async def cep_lookup(cep: str):
    digits = re.sub(r"\D", "", cep)
    if len(digits) != 8:
        raise HTTPException(400, "CEP inválido — informe 8 dígitos")
    try:
        response = await asyncio.to_thread(requests.get, f"https://viacep.com.br/ws/{digits}/json/", timeout=8)
        response.raise_for_status()
        data = response.json()
        if data.get("erro"):
            raise HTTPException(404, "CEP não encontrado")
        uf = data.get("uf", "").upper()
        region = FREIGHT_TABLE.get(uf, {"base": 45.0, "days": 6})
        return {
            "cep": digits,
            "city": data.get("localidade", ""),
            "uf": uf,
            "neighborhood": data.get("bairro", ""),
            "street": data.get("logradouro", ""),
            "freight_base": region["base"],
            "freight_days": region["days"],
        }
    except requests.RequestException:
        raise HTTPException(502, "Serviço de CEP indisponível")


@api.post("/projects")
async def create_project(body: ProjectInput, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    project = body.model_dump()
    project.update({"project_id": "project_" + uuid.uuid4().hex[:12], "user_id": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()})
    await db.projects.insert_one(dict(project))
    return clean(project)


@api.get("/projects")
async def projects(authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    docs = await db.projects.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [clean(d) for d in docs]


@api.put("/projects/{project_id}")
async def update_project(project_id: str, body: ProjectInput, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    payload = body.model_dump()
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one({"user_id": user["user_id"], "project_id": project_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(404, "Projeto não encontrado")
    doc = await db.projects.find_one({"user_id": user["user_id"], "project_id": project_id}, {"_id": 0})
    return clean(dict(doc))


@api.delete("/projects/{project_id}")
async def delete_project(project_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    result = await db.projects.delete_one({"user_id": user["user_id"], "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Projeto não encontrado")
    return {"ok": True}


@api.post("/projects/{project_id}/duplicate")
async def duplicate_project(project_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    original = await db.projects.find_one({"user_id": user["user_id"], "project_id": project_id}, {"_id": 0})
    if not original:
        raise HTTPException(404, "Projeto não encontrado")
    copy = dict(original)
    copy["project_id"] = "project_" + uuid.uuid4().hex[:12]
    base_name = original.get("name", "Meu projeto")
    copy["name"] = f"{base_name} (cópia)" if "(cópia" not in base_name else base_name
    copy["created_at"] = datetime.now(timezone.utc).isoformat()
    copy.pop("updated_at", None)
    await db.projects.insert_one(dict(copy))
    return clean(copy)


@api.get("/projects/{project_id}/pdf")
async def project_pdf(project_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    project = await db.projects.find_one({"user_id": user["user_id"], "project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Projeto não encontrado")
    rooms = [Room(**r) for r in (project.get("rooms") or [])]
    est = _compute_estimate(rooms, project.get("width", 8), project.get("length", 8))
    pdf_bytes = _build_project_pdf(project, rooms, est)
    safe_name = re.sub(r"[^a-zA-Z0-9]+", "-", project.get("name", "projeto")).strip("-").lower() or "projeto"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
    )


def _pdf_safe(text: str) -> str:
    """The PDF's core Helvetica font doesn't include glyphs for things like ² or ³
    (superscript digits aren't in the standard base-14 font subset), so m² -> m2,
    m³ -> m3, and anything else outside Latin-1 gets swapped for its closest
    plain-ASCII form so the PDF never silently drops a character mid-word.
    """
    text = str(text).replace("²", "2").replace("³", "3")
    return text.encode("latin-1", "replace").decode("latin-1")


def _build_project_pdf(project: Dict[str, Any], rooms: List[Room], est: Dict[str, Any]) -> bytes:
    BRAND = (200, 90, 50)       # #C85A32
    BRAND_DARK = (169, 69, 28)  # #A9451C
    INK = (26, 26, 26)
    MUTED = (112, 111, 106)
    LINE = (226, 223, 216)
    CARD = (239, 236, 230)

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(15, 15, 15)
    page_w = pdf.w - 30  # usable width between the two 15mm margins

    # ---------- Cover ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*INK)
    pdf.cell(0, 12, _pdf_safe(project.get("name", "Meu projeto")), ln=1)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 8, _pdf_safe(f"{project.get('build_type', '')} - {project.get('width')} x {project.get('length')} m"), ln=1)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Gerado em {datetime.now(timezone.utc).strftime('%d/%m/%Y')} pelo ConstruiFacil", ln=1)
    pdf.set_draw_color(*LINE)
    pdf.line(15, pdf.get_y() + 3, pdf.w - 15, pdf.get_y() + 3)
    pdf.ln(10)

    # ---------- Floor plans (one simplified diagram per floor) ----------
    floor_groups: Dict[int, List[Room]] = {}
    for r in rooms:
        floor_groups.setdefault(r.floor or 0, []).append(r)

    for floor_num in sorted(floor_groups.keys()):
        floor_rooms = floor_groups[floor_num]
        floor_label = "Terreo" if floor_num == 0 else f"{floor_num} Andar"
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(*BRAND_DARK)
        pdf.cell(0, 9, f"Planta - {floor_label}", ln=1)

        min_x = min(r.x for r in floor_rooms)
        max_x = max(r.x + r.width for r in floor_rooms)
        min_y = min(r.y for r in floor_rooms)
        max_y = max(r.y + r.length for r in floor_rooms)
        span_x = max(max_x - min_x, 0.5)
        span_y = max(max_y - min_y, 0.5)

        draw_w = page_w
        draw_h = 95.0
        scale = min(draw_w / span_x, draw_h / span_y)
        used_w = span_x * scale
        used_h = span_y * scale
        origin_x = pdf.get_x() + (draw_w - used_w) / 2
        origin_y = pdf.get_y()
        # Center the room drawing vertically within the reserved box too (origin_x
        # already centers it horizontally) — previously only the horizontal offset
        # was applied, so short/wide floor plans looked pinned to the top instead
        # of centered in their card.
        content_origin_y = origin_y + (draw_h - used_h) / 2

        pdf.set_fill_color(*CARD)
        pdf.rect(pdf.get_x(), origin_y, draw_w, draw_h, style="F")

        for r in floor_rooms:
            rx = origin_x + (r.x - min_x) * scale
            ry = content_origin_y + (r.y - min_y) * scale
            rw = max(r.width * scale, 2)
            rl = max(r.length * scale, 2)
            pdf.set_draw_color(*BRAND)
            pdf.set_fill_color(255, 255, 255)
            pdf.rect(rx, ry, rw, rl, style="DF")
            pdf.set_xy(rx, ry + rl / 2 - 2)
            pdf.set_font("Helvetica", "", 6.5)
            pdf.set_text_color(*INK)
            pdf.cell(rw, 4, _pdf_safe(r.name[:14]), align="C")

        pdf.set_xy(15, origin_y + draw_h + 4)
        pdf.ln(4)

    # ---------- Materials list ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*INK)
    pdf.cell(0, 10, "Lista de materiais", ln=1)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 6, _pdf_safe(f"Area construida considerada: {est['area']} m2"), ln=1)
    pdf.ln(3)

    col_w = [70, 30, 28, 30, 32]
    headers = ["Material", "Categoria", "Quantidade", "Custo unit.", "Subtotal"]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*BRAND)
    pdf.set_text_color(255, 255, 255)
    for w, h in zip(col_w, headers):
        pdf.cell(w, 8, h, border=0, fill=True, align="C")
    pdf.ln(8)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*INK)
    fill = False
    for m in est["materials"]:
        subtotal = round(m["quantity"] * m.get("unit_cost", 0), 2)
        pdf.set_fill_color(*(CARD if fill else (255, 255, 255)))
        pdf.cell(col_w[0], 8, _pdf_safe(m["name"][:34]), border=0, fill=True)
        pdf.cell(col_w[1], 8, _pdf_safe(m["category"][:16]), border=0, fill=True, align="C")
        pdf.cell(col_w[2], 8, _pdf_safe(f"{m['quantity']} {m['unit']}"), border=0, fill=True, align="C")
        pdf.cell(col_w[3], 8, f"R$ {m.get('unit_cost', 0):.2f}", border=0, fill=True, align="C")
        pdf.cell(col_w[4], 8, f"R$ {subtotal:.2f}", border=0, fill=True, align="C")
        pdf.ln(8)
        fill = not fill

    pdf.ln(8)
    pdf.set_draw_color(*LINE)
    pdf.line(15, pdf.get_y(), pdf.w - 15, pdf.get_y())
    pdf.ln(6)

    # ---------- Budget total ----------
    pdf.set_fill_color(*INK)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "", 10)
    pdf.rect(15, pdf.get_y(), page_w, 26, style="F")
    pdf.set_xy(20, pdf.get_y() + 4)
    pdf.cell(0, 6, "ESTIMATIVA INICIAL DE CUSTO TOTAL", ln=1)
    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, f"R$ {est['estimated_total']:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), ln=1)
    pdf.ln(6)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 5, _pdf_safe(est["note"] + " Este documento e uma referencia inicial gerada automaticamente pelo app ConstruiFacil e nao substitui um orcamento fechado com engenheiro ou arquiteto responsavel."))

    output = pdf.output()
    return bytes(output)


def _compute_estimate(rooms: List[Room], width: float, length: float) -> Dict[str, Any]:
    rooms = rooms or [Room(name="Ambiente principal", width=width, length=length)]
    # IMPORTANT: use the BUILT area (sum of each room) for materials/cost, not the lot
    # size (width × length). The lot can be much bigger than what's actually being built
    # (e.g. a 30×30m lot with a modest house on it) — using lot size there would wildly
    # overestimate every material quantity and the total project cost.
    area = round(sum(r.width * r.length for r in rooms), 2) or (width * length)
    materials = [
        {"name": "Cimento 50kg", "quantity": max(1, round(area * 0.35)), "unit": "sacos", "category": "Estrutura", "room": "Todos", "search": "cimento saco 50kg", "unit_cost": 42.0},
        {"name": "Areia média", "quantity": round(area * 0.045, 1), "unit": "m³", "category": "Estrutura", "room": "Todos", "search": "areia média construção", "unit_cost": 130.0},
        {"name": "Bloco cerâmico", "quantity": round(area * 16), "unit": "un", "category": "Alvenaria", "room": "Todos", "search": "bloco cerâmico 9x19x19", "unit_cost": 2.5},
        {"name": "Piso/ revestimento", "quantity": round(area * 1.1, 1), "unit": "m²", "category": "Acabamento", "room": "Todos", "search": "piso porcelanato 60x60", "unit_cost": 65.0},
        {"name": "Tinta acrílica", "quantity": max(1, round(area * 0.12)), "unit": "galões", "category": "Acabamento", "room": "Todos", "search": "tinta acrílica 3,6L", "unit_cost": 155.0},
    ]
    # CUB (Custo Unitário Básico) médio nacional, padrão médio residencial, ~2026: a
    # faixa real fica entre R$1.800/m² (padrão baixo) e R$4.500/m² (alto padrão),
    # publicada mensalmente pelos Sinduscons estaduais. Usamos R$1.900/m² como base
    # de padrão médio — ainda assim é uma REFERÊNCIA, não um orçamento fechado (não
    # inclui terreno, projeto, taxas, mão de obra especializada fora da média, etc.,
    # igual o próprio CUB oficial também não inclui).
    total = round(area * 1900.0, 2)
    # Per-room cost: proportional to area × room-type multiplier.
    # Higher = mais caro por m² (hidráulica, revestimento cerâmico, impermeabilização).
    # Ordem importa (mais específico primeiro).
    def room_multiplier(name: str) -> float:
        n = name.lower().strip()
        # Piscina: impermeabilização + azulejo + bomba
        if "piscina" in n:
            return 2.0
        # Banheiro / Lavabo: muito revestimento + hidráulica
        if "banh" in n or "lavab" in n or "wc" in n:
            return 1.35
        # Cozinha / Área gourmet / Churrasqueira: hidráulica, exaustão, coifa
        if "cozin" in n or "gourmet" in n or "churrasq" in n:
            return 1.30
        # Área de serviço / Lavanderia
        if "serviço" in n or "servico" in n or "lavand" in n:
            return 1.15
        # Suíte: quarto + banheirinho pequeno (menos que banheiro puro)
        if "suíte" in n or "suite" in n:
            return 1.15
        # Escada
        if "escada" in n:
            return 1.10
        # Closet
        if "closet" in n:
            return 1.05
        # Conceito aberto / integrado: economia estrutural (sem paredes)
        if "conceito" in n or "integr" in n or "aberto" in n or "living" in n:
            return 0.95
        # Sacada / Varanda / Terraço
        if "sacada" in n or "varand" in n or "terra" in n:
            return 0.70
        # Corredor / Hall
        if "corredor" in n or "hall" in n or "circula" in n:
            return 0.55
        # Garagem / Vaga
        if "garag" in n or "vaga" in n:
            return 0.65
        # Jardim / Quintal / Externo
        if "jardim" in n or "quintal" in n or "extern" in n:
            return 0.50
        # Quarto / Sala / demais: base
        return 1.0
    # Normalize so weighted sum = total.
    weighted = [
        (r, r.width * r.length * room_multiplier(r.name))
        for r in rooms
    ]
    weighted_total = sum(w for _, w in weighted) or 1
    per_room = []
    for r, w in weighted:
        room_cost = round(total * (w / weighted_total), 2)
        room_area = round(r.width * r.length, 2)
        per_room.append({
            "name": r.name,
            "area": room_area,
            "cost": room_cost,
            "cost_per_m2": round(room_cost / room_area, 2) if room_area else 0,
            "share": round((w / weighted_total) * 100, 1),
        })
    return {
        "area": round(area, 1),
        "rooms": [r.model_dump() for r in rooms],
        "materials": materials,
        "estimated_total": total,
        "per_room": per_room,
        "note": "Estimativa inicial. Confirme o projeto com um profissional responsável.",
    }


@api.post("/estimate")
async def estimate(body: ProjectInput, authorization: Optional[str] = Header(default=None)):
    await current_user(authorization)
    return _compute_estimate(body.rooms, body.width, body.length)


@api.get("/templates")
async def templates():
    """Public catalog of pre-configured project templates users can start from."""
    return {
        "templates": [
            {
                "id": "kitnet_30",
                "name": "Kitnet 30m²",
                "description": "Ambiente único integrado + banheiro. Perfeito para primeiro imóvel ou locação.",
                "icon": "bed-outline",
                "build_type": "Edícula",
                "width": 5.0,
                "length": 6.0,
                "rooms": [
                    {"name": "Sala/Quarto", "width": 5.0, "length": 4.0, "x": 0, "y": 0},
                    {"name": "Cozinha", "width": 3.0, "length": 2.0, "x": 0, "y": 4},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 3.0, "y": 4},
                ],
            },
            {
                "id": "edicula_25",
                "name": "Edícula 25m²",
                "description": "Área externa com sala/quarto, cozinha e banheiro. Ideal para quintal.",
                "icon": "home-outline",
                "build_type": "Edícula",
                "width": 5.0,
                "length": 5.0,
                "rooms": [
                    {"name": "Sala/Quarto", "width": 3.0, "length": 5.0, "x": 0, "y": 0},
                    {"name": "Cozinha", "width": 2.0, "length": 3.0, "x": 3.0, "y": 0},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 3.0, "y": 3.0},
                ],
            },
            {
                "id": "casa_60",
                "name": "Casa 60m² · 2 quartos",
                "description": "Sala, cozinha, 2 quartos, banheiro e área de serviço.",
                "icon": "home",
                "build_type": "Casa térrea",
                "width": 8.0,
                "length": 7.5,
                "rooms": [
                    {"name": "Sala", "width": 4.0, "length": 4.0, "x": 0, "y": 0},
                    {"name": "Cozinha", "width": 4.0, "length": 3.5, "x": 4.0, "y": 0},
                    {"name": "Quarto 1", "width": 3.0, "length": 3.5, "x": 0, "y": 4.0},
                    {"name": "Quarto 2", "width": 3.0, "length": 3.5, "x": 3.0, "y": 4.0},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 6.0, "y": 4.0},
                    {"name": "Área de serviço", "width": 2.0, "length": 1.5, "x": 6.0, "y": 6.0},
                ],
            },
            {
                "id": "casa_90",
                "name": "Casa 90m² · 3 quartos",
                "description": "Sala ampla, cozinha, 3 quartos (1 suíte), banheiro social e área de serviço.",
                "icon": "business-outline",
                "build_type": "Casa térrea",
                "width": 10.0,
                "length": 9.0,
                "rooms": [
                    {"name": "Sala", "width": 5.0, "length": 4.5, "x": 0, "y": 0},
                    {"name": "Cozinha", "width": 5.0, "length": 3.5, "x": 5.0, "y": 0},
                    {"name": "Suíte", "width": 3.5, "length": 4.0, "x": 0, "y": 4.5},
                    {"name": "Banh. suíte", "width": 2.0, "length": 2.0, "x": 3.5, "y": 4.5},
                    {"name": "Quarto 2", "width": 3.0, "length": 3.5, "x": 0, "y": 8.5},
                    {"name": "Quarto 3", "width": 3.0, "length": 3.5, "x": 3.0, "y": 8.5},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 5.5, "y": 4.5},
                    {"name": "Área serviço", "width": 2.5, "length": 2.5, "x": 7.5, "y": 4.5},
                ],
            },
            {
                "id": "conceito_aberto_70",
                "name": "Conceito Aberto 70m²",
                "description": "Sala, cozinha e jantar integrados + área gourmet, 1 quarto e banheiro. Poucas paredes, mais luz.",
                "icon": "expand-outline",
                "build_type": "Casa térrea",
                "width": 8.5,
                "length": 8.5,
                "rooms": [
                    {"name": "Conceito aberto", "width": 8.5, "length": 5.0, "x": 0, "y": 0},
                    {"name": "Área gourmet", "width": 4.5, "length": 3.5, "x": 0, "y": 5.0},
                    {"name": "Quarto", "width": 3.0, "length": 3.5, "x": 4.5, "y": 5.0},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 7.5, "y": 5.0},
                ],
            },
            {
                "id": "casa_piscina_110",
                "name": "Casa 110m² com Piscina",
                "description": "Sala, cozinha, 2 quartos, banheiro, área gourmet com churrasqueira e piscina.",
                "icon": "water-outline",
                "build_type": "Casa térrea",
                "width": 11.0,
                "length": 10.0,
                "rooms": [
                    {"name": "Sala", "width": 5.0, "length": 4.5, "x": 0, "y": 0},
                    {"name": "Cozinha", "width": 4.0, "length": 3.5, "x": 5.0, "y": 0},
                    {"name": "Quarto 1", "width": 3.5, "length": 3.5, "x": 0, "y": 4.5},
                    {"name": "Quarto 2", "width": 3.5, "length": 3.5, "x": 3.5, "y": 4.5},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 7.0, "y": 4.5},
                    {"name": "Área gourmet", "width": 4.0, "length": 3.0, "x": 0, "y": 8.0},
                    {"name": "Churrasqueira", "width": 2.5, "length": 2.0, "x": 4.0, "y": 8.0},
                    {"name": "Piscina", "width": 4.5, "length": 2.5, "x": 6.5, "y": 7.5},
                ],
            },
            {
                "id": "sobrado_120",
                "name": "Sobrado 120m² · 2 pavimentos",
                "description": "Térreo: sala, cozinha, lavabo, garagem. Superior: 3 quartos (suíte), 2 banheiros.",
                "icon": "layers-outline",
                "build_type": "Sobrado",
                "width": 8.0,
                "length": 8.0,
                "rooms": [
                    {"name": "Sala (térreo)", "width": 4.0, "length": 4.0, "x": 0, "y": 0, "floor": 0},
                    {"name": "Cozinha (térreo)", "width": 4.0, "length": 3.5, "x": 4.0, "y": 0, "floor": 0},
                    {"name": "Lavabo (térreo)", "width": 1.5, "length": 2.0, "x": 4.0, "y": 3.5, "floor": 0},
                    {"name": "Garagem", "width": 5.0, "length": 4.0, "x": 0, "y": 4.0, "floor": 0},
                    {"name": "Escada", "width": 1.5, "length": 3.0, "x": 5.5, "y": 4.5, "floor": 0},
                    {"name": "Suíte (superior)", "width": 4.0, "length": 4.0, "x": 0, "y": 4.0, "floor": 1},
                    {"name": "Quarto 2 (superior)", "width": 3.0, "length": 3.5, "x": 4.0, "y": 4.5, "floor": 1},
                    {"name": "Banheiro (superior)", "width": 2.0, "length": 2.0, "x": 6.0, "y": 6.0, "floor": 1},
                ],
            },
            {
                "id": "sobrado_180",
                "name": "Sobrado 180m² · 4 quartos",
                "description": "Sobrado amplo com 2 suítes, sala 2 ambientes, cozinha gourmet, escritório e garagem.",
                "icon": "business",
                "build_type": "Sobrado",
                "width": 10.0,
                "length": 9.0,
                "rooms": [
                    {"name": "Sala 2 ambientes", "width": 6.0, "length": 4.5, "x": 0, "y": 0, "floor": 0},
                    {"name": "Cozinha gourmet", "width": 4.0, "length": 4.5, "x": 6.0, "y": 0, "floor": 0},
                    {"name": "Lavabo", "width": 1.5, "length": 2.0, "x": 0, "y": 4.5, "floor": 0},
                    {"name": "Garagem 2 vagas", "width": 5.0, "length": 4.5, "x": 5.0, "y": 4.5, "floor": 0},
                    {"name": "Escada", "width": 1.5, "length": 3.0, "x": 1.5, "y": 4.5, "floor": 0},
                    {"name": "Suíte master", "width": 4.5, "length": 4.0, "x": 0, "y": 0, "floor": 1},
                    {"name": "Closet", "width": 2.0, "length": 2.5, "x": 4.5, "y": 0, "floor": 1},
                    {"name": "Suíte 2", "width": 3.5, "length": 3.5, "x": 6.5, "y": 0.5, "floor": 1},
                    {"name": "Quarto 3", "width": 3.0, "length": 3.0, "x": 0, "y": 4.0, "floor": 1},
                    {"name": "Quarto 4", "width": 3.0, "length": 3.0, "x": 3.0, "y": 4.0, "floor": 1},
                    {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 6.0, "y": 4.0, "floor": 1},
                ],
            },
        ]
    }


def _freight_for(uf: str, price: float) -> float:
    """Rough freight heuristic: regional base + 3% of item value, capped."""
    base = FREIGHT_TABLE.get(uf, {}).get("base", 45.0)
    return round(min(base + price * 0.03, base + 120.0), 2)


def _extract_cheapest_from_jsonld(html: str) -> Optional[Dict[str, Any]]:
    """Many storefronts (regardless of the underlying e-commerce platform) embed
    schema.org "JSON-LD" structured data in the raw page HTML so Google can show
    price/rating snippets in search results. It's meant for search engines, but it's
    plain public HTML — no JS execution, no login, nothing hidden — so a normal GET
    can read it. This tends to survive site redesigns better than guessing an internal
    API path, since it's a stable web-wide SEO convention rather than one store's
    internal implementation detail.
    """
    cheapest: Optional[Dict[str, Any]] = None

    def consider(node: Any):
        nonlocal cheapest
        if isinstance(node, list):
            for item in node:
                consider(item)
            return
        if not isinstance(node, dict):
            return
        node_type = node.get("@type")
        types = node_type if isinstance(node_type, list) else [node_type]
        if any(t in ("Product", "Offer") for t in types if t):
            offers = node.get("offers")
            offer_list = offers if isinstance(offers, list) else ([offers] if isinstance(offers, dict) else [])
            for off in offer_list:
                if not isinstance(off, dict):
                    continue
                price = off.get("price") or off.get("lowPrice")
                availability = str(off.get("availability", "")).lower()
                if not price:
                    continue
                if availability and "outofstock" in availability:
                    continue
                try:
                    price_f = float(str(price).replace(",", "."))
                except (TypeError, ValueError):
                    continue
                if price_f <= 0:
                    continue
                if cheapest is None or price_f < cheapest["price"]:
                    cheapest = {
                        "price": round(price_f, 2),
                        "title": node.get("name") or "",
                        "url": off.get("url") or node.get("url"),
                    }
        # Keep walking in case of nested @graph structures.
        for value in node.values():
            if isinstance(value, (dict, list)):
                consider(value)

    for match in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
        try:
            data = json.loads(match.strip())
        except (json.JSONDecodeError, ValueError):
            continue
        consider(data)
    return cheapest


async def _fetch_price_by_scraping(url: str, ua_headers: Dict[str, str]) -> Any:
    """Best-effort real price by reading a store's own search-results page HTML and
    pulling out its embedded JSON-LD (see docstring above). Same disclaimer as the
    Leroy Merlin catalog call: this is not an official integration, can stop working
    without notice, and always falls back to the reference estimate on any failure."""
    try:
        response = await asyncio.to_thread(requests.get, url, headers=ua_headers, timeout=8)
        status = response.status_code
        if status >= 400:
            return None, f"HTTP {status}"
        cheapest = _extract_cheapest_from_jsonld(response.text)
        if cheapest is None:
            return None, "pagina carregada mas sem dados estruturados (JSON-LD) de produto"
        return cheapest, None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"[:300]


async def _fetch_leroy_price(query: str, ua_headers: Dict[str, str]) -> Any:
    """Best-effort real price from Leroy Merlin's own catalog search endpoint (the
    platform they run on — VTEX — exposes this for the storefront's own search-as-you-type).
    This is NOT an official partner API: it's the same public endpoint the site's own
    frontend calls, so it can change or start blocking without notice. If it fails for
    any reason we simply return (None, "reason") and the caller falls back to the
    reference estimate — nothing breaks, but we keep the reason for diagnostics.
    """
    try:
        response = await asyncio.to_thread(
            requests.get,
            f"https://www.leroymerlin.com.br/api/catalog_system/pub/products/search/{quote_plus(query)}",
            params={"map": "ft"},
            headers=ua_headers,
            timeout=6,
        )
        status = response.status_code
        response.raise_for_status()
        products = response.json()
        if not isinstance(products, list) or not products:
            return None, f"HTTP {status}, resposta vazia ou formato inesperado"
        cheapest: Optional[Dict[str, Any]] = None
        for product in products[:10]:
            items = product.get("items") or []
            for item in items:
                sellers = item.get("sellers") or []
                for seller in sellers:
                    offer = seller.get("commertialOffer") or {}
                    price = offer.get("Price")
                    available = offer.get("AvailableQuantity", 0)
                    if not price or price <= 0 or available <= 0:
                        continue
                    if cheapest is None or price < cheapest["price"]:
                        link_text = product.get("linkText")
                        cheapest = {
                            "price": round(float(price), 2),
                            "title": product.get("productName") or query,
                            "url": f"https://www.leroymerlin.com.br/{link_text}/p" if link_text else None,
                        }
        if cheapest is None:
            return None, "produtos encontrados mas nenhum com preco/estoque valido"
        return cheapest, None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"[:300]


async def _fetch_mercadolivre(query: str, uf: str, ua_headers: Dict[str, str]):
    ml_offers: List[Dict[str, Any]] = []
    try:
        response = await asyncio.to_thread(
            requests.get,
            "https://api.mercadolibre.com/sites/MLB/search",
            params={"q": query, "limit": 10},
            headers=ua_headers,
            timeout=12,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        for x in results:
            price = float(x.get("price") or 0)
            ml_offers.append({
                "id": x.get("id"),
                "title": x.get("title"),
                "price": price,
                "currency": x.get("currency_id", "BRL"),
                "thumbnail": x.get("thumbnail"),
                "url": x.get("permalink"),
                "store": "Mercado Livre",
                "freight": _freight_for(uf.upper(), price) if uf else 0.0,
                "freight_days": FREIGHT_TABLE.get(uf.upper(), {}).get("days") if uf else None,
            })
        return ml_offers, None, None
    except requests.RequestException as e:
        return [], "Não foi possível consultar o Mercado Livre agora", f"{type(e).__name__}: {e}"[:300]


@api.get("/offers")
async def offers(q: str = "cimento", cep: str = "", uf: str = ""):
    """Aggregate offers: Mercado Livre API results + deep-link search URLs for
    Leroy Merlin and C&C (public search endpoints). Freight is estimated based on UF."""
    query = re.sub(r"[^\w\s-]", "", q, flags=re.UNICODE)[:80] or "cimento"
    ua_headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }

    # All four lookups are independent of one another — run them concurrently so the
    # total wait is only as long as the SLOWEST one (worst case ~12s), not the sum of
    # all four one after another (which could add up to 30+ seconds).
    encoded = quote_plus(query)
    cec_url = f"https://www.cec.com.br/busca-produto?text={encoded}"
    telha_url = f"https://www.telhanorte.com.br/s?q={encoded}"
    (
        (ml_offers, error, error_detail),
        (leroy_real, leroy_error_detail),
        (cec_real, cec_error_detail),
        (telha_real, telha_error_detail),
    ) = await asyncio.gather(
        _fetch_mercadolivre(query, uf, ua_headers),
        _fetch_leroy_price(query, ua_headers),
        _fetch_price_by_scraping(cec_url, ua_headers),
        _fetch_price_by_scraping(telha_url, ua_headers),
    )

    # Reference median price per unit (BRL) — Brazilian construction market averages 2025.
    # Used to give the user a "typical range" when the marketplace API is unavailable
    # or as a benchmark to know whether a partner-store price is fair.
    ref = _reference_price(query, ml_offers)

    # Public search deep-links — we don't scrape, we surface the store's own search URL
    # so the user always sees fresh, real prices on the store's site.
    partner_stores = [
        {
            "id": f"leroy_{encoded}",
            "title": leroy_real["title"] if leroy_real else f"{q} no Leroy Merlin",
            "price_range": ref["range"],
            "estimated_price": leroy_real["price"] if leroy_real else ref["median"],
            "store": "Leroy Merlin",
            "url": leroy_real["url"] if (leroy_real and leroy_real.get("url")) else f"https://www.leroymerlin.com.br/search?term={encoded}",
            "thumbnail": None,
            "type": "search",
            "note": "Preço real do site (agora)" if leroy_real else ref["note"],
            "real_price": bool(leroy_real),
        },
        {
            "id": f"cec_{encoded}",
            "title": cec_real["title"] if (cec_real and cec_real.get("title")) else f"{q} na C&C",
            "price_range": ref["range"],
            "estimated_price": cec_real["price"] if cec_real else ref["median"],
            "store": "C&C Casa e Construção",
            "url": cec_real["url"] if (cec_real and cec_real.get("url")) else cec_url,
            "thumbnail": None,
            "type": "search",
            "note": "Preço real do site (agora)" if cec_real else ref["note"],
            "real_price": bool(cec_real),
        },
        {
            "id": f"telha_{encoded}",
            "title": telha_real["title"] if (telha_real and telha_real.get("title")) else f"{q} na Telhanorte",
            "price_range": ref["range"],
            "estimated_price": telha_real["price"] if telha_real else ref["median"],
            "store": "Telhanorte",
            "url": telha_real["url"] if (telha_real and telha_real.get("url")) else telha_url,
            "thumbnail": None,
            "type": "search",
            "note": "Preço real do site (agora)" if telha_real else ref["note"],
            "real_price": bool(telha_real),
        },
    ]
    return {
        "source": "Multi-loja",
        "location": cep or "Brasil",
        "uf": uf.upper() or None,
        "offers": ml_offers,
        "partner_stores": partner_stores,
        "reference": ref,
        "error": error,
        "error_detail": error_detail,
        "leroy_error_detail": leroy_error_detail,
        "cec_error_detail": cec_error_detail,
        "telha_error_detail": telha_error_detail,
    }


# Reference median prices for common Brazilian construction materials (BRL, 2025).
# These are ballpark national averages used to give the user a range before they
# click through to a store's search page. Not authoritative — labeled as "estimate".
_REFERENCE_PRICES: List[Dict[str, Any]] = [
    {"match": ["cimento", "cp ii", "cp v"], "unit": "saco 50kg", "median": 42.00, "min": 32.00, "max": 55.00},
    {"match": ["areia média", "areia media"], "unit": "m³", "median": 130.00, "min": 95.00, "max": 180.00},
    {"match": ["areia"], "unit": "m³", "median": 120.00, "min": 85.00, "max": 170.00},
    {"match": ["brita", "pedra britada"], "unit": "m³", "median": 145.00, "min": 110.00, "max": 195.00},
    {"match": ["bloco cerâmico", "bloco ceramico", "tijolo baiano"], "unit": "un", "median": 2.50, "min": 1.60, "max": 3.80},
    {"match": ["tijolo maciço", "tijolo macico"], "unit": "un", "median": 1.20, "min": 0.80, "max": 1.90},
    {"match": ["tijolo"], "unit": "un", "median": 2.20, "min": 1.30, "max": 3.50},
    {"match": ["porcelanato"], "unit": "m²", "median": 65.00, "min": 35.00, "max": 130.00},
    {"match": ["piso", "revestimento"], "unit": "m²", "median": 55.00, "min": 28.00, "max": 110.00},
    {"match": ["azulejo"], "unit": "m²", "median": 42.00, "min": 22.00, "max": 90.00},
    {"match": ["tinta acrílica", "tinta acrilica"], "unit": "galão 3,6L", "median": 155.00, "min": 95.00, "max": 280.00},
    {"match": ["tinta"], "unit": "galão 3,6L", "median": 145.00, "min": 85.00, "max": 260.00},
    {"match": ["telha"], "unit": "un", "median": 4.20, "min": 2.20, "max": 12.00},
    {"match": ["laje"], "unit": "m²", "median": 145.00, "min": 95.00, "max": 220.00},
    {"match": ["gesso"], "unit": "saco 40kg", "median": 32.00, "min": 22.00, "max": 48.00},
    {"match": ["cal"], "unit": "saco 20kg", "median": 28.00, "min": 18.00, "max": 42.00},
    {"match": ["argamassa"], "unit": "saco 20kg", "median": 35.00, "min": 22.00, "max": 58.00},
    {"match": ["cerâmica"], "unit": "m²", "median": 38.00, "min": 20.00, "max": 75.00},
    {"match": ["porta"], "unit": "un", "median": 320.00, "min": 180.00, "max": 850.00},
    {"match": ["janela"], "unit": "un", "median": 450.00, "min": 220.00, "max": 1200.00},
    {"match": ["vaso sanitário", "vaso sanitario"], "unit": "un", "median": 320.00, "min": 180.00, "max": 780.00},
    {"match": ["pia"], "unit": "un", "median": 380.00, "min": 180.00, "max": 950.00},
    {"match": ["torneira"], "unit": "un", "median": 120.00, "min": 45.00, "max": 380.00},
    {"match": ["chuveiro"], "unit": "un", "median": 180.00, "min": 55.00, "max": 480.00},
    {"match": ["fio", "cabo"], "unit": "rolo 100m", "median": 220.00, "min": 130.00, "max": 420.00},
    {"match": ["cano", "tubo pvc"], "unit": "barra 6m", "median": 45.00, "min": 25.00, "max": 95.00},
    {"match": ["forro pvc"], "unit": "m²", "median": 45.00, "min": 28.00, "max": 75.00},
]


def _reference_price(query: str, ml_offers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Find a matching reference price. If Mercado Livre returned real offers,
    use the median from those; otherwise fall back to the curated table."""
    if ml_offers:
        prices = sorted(float(o["price"]) for o in ml_offers if o.get("price"))
        if prices:
            median = prices[len(prices) // 2]
            lo, hi = prices[0], prices[-1]
            return {
                "median": round(median, 2),
                "min": round(lo, 2),
                "max": round(hi, 2),
                "unit": "",
                "range": f"R$ {lo:.2f} — R$ {hi:.2f}",
                "note": f"Faixa vista no Mercado Livre agora (mediana R$ {median:.2f})",
                "source": "live",
            }
    q = query.lower()
    for entry in _REFERENCE_PRICES:
        if any(term in q for term in entry["match"]):
            return {
                "median": entry["median"],
                "min": entry["min"],
                "max": entry["max"],
                "unit": entry["unit"],
                "range": f"R$ {entry['min']:.2f} — R$ {entry['max']:.2f}",
                "note": f"Referência nacional {entry['unit']} (mediana R$ {entry['median']:.2f})",
                "source": "reference",
            }
    return {
        "median": None,
        "min": None,
        "max": None,
        "unit": "",
        "range": "",
        "note": "Sem referência nacional — confira no site da loja",
        "source": "unknown",
    }


@api.get("/cart")
async def cart_list(authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    docs = await db.cart_items.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("added_at", -1).to_list(100)
    total_price = round(sum((d.get("price", 0) or 0) * (d.get("quantity", 1) or 1) for d in docs), 2)
    total_freight = round(sum(d.get("freight", 0) or 0 for d in docs), 2)
    purchased_total = round(sum((d.get("price", 0) or 0) * (d.get("quantity", 1) or 1) for d in docs if d.get("purchased")), 2)
    stores = sorted({d.get("store", "") for d in docs if d.get("store")})
    return {
        "items": docs,
        "total_price": total_price,
        "total_freight": total_freight,
        "grand_total": round(total_price + total_freight, 2),
        "purchased_total": purchased_total,
        "stores": stores,
    }


@api.post("/cart")
async def cart_add(body: CartItem, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    doc = body.model_dump()
    doc.update({"user_id": user["user_id"], "added_at": datetime.now(timezone.utc).isoformat()})
    await db.cart_items.update_one({"user_id": user["user_id"], "offer_id": doc["offer_id"]}, {"$set": doc}, upsert=True)
    return {"ok": True}


@api.patch("/cart/{offer_id}/purchased")
async def cart_set_purchased(offer_id: str, body: PurchasedInput, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    result = await db.cart_items.update_one(
        {"user_id": user["user_id"], "offer_id": offer_id},
        {"$set": {"purchased": body.purchased}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Item não encontrado no carrinho")
    return {"ok": True}


@api.delete("/cart/{offer_id}")
async def cart_remove(offer_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    await db.cart_items.delete_one({"user_id": user["user_id"], "offer_id": offer_id})
    return {"ok": True}


@api.get("/alerts")
async def alerts_list(authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    docs = await db.alerts.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    return docs


@api.post("/alerts")
async def alerts_create(body: AlertInput, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    alert = {"alert_id": "alert_" + uuid.uuid4().hex[:10], "user_id": user["user_id"], "query": body.query, "target_price": body.target_price, "created_at": datetime.now(timezone.utc).isoformat(), "active": True}
    await db.alerts.insert_one(dict(alert))
    return clean(alert)


@api.delete("/alerts/{alert_id}")
async def alerts_remove(alert_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    await db.alerts.delete_one({"user_id": user["user_id"], "alert_id": alert_id})
    return {"ok": True}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
