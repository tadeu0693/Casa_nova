import { FURNITURE_LIB_JS } from "@/src/utils/furniture3d";
import { THREE_BUNDLE_JS } from "@/src/utils/three-bundle";
import { SCENE_JS } from "@/src/utils/scene3d";
import type { PlanRoom, Project, Room } from "@/src/types";

// Older projects were stored as `rooms` (name + width + length, no position in the
// world). They get converted once, the first time the 3D screen opens, by laying the
// rooms out in rows — a starting point the person then arranges in plan mode.
// Ambientes que não são cômodo fechado: entram como área externa (sem paredes nem laje)
// e já nascem com a peça que os define. Sem isto, "Piscina" virava uma caixa de alvenaria
// com janelas — que foi o que apareceu na maquete.
const EXTERNOS: { re: RegExp; piso: PlanRoom["piso"]; itens: string[] }[] = [
  { re: /piscina/i, piso: "deck", itens: ["piscina", "espreguicadeira"] },
  { re: /jacuzzi|ofur[oó]/i, piso: "deck", itens: ["jacuzzi"] },
  { re: /churrasq|gourmet/i, piso: "pedra", itens: ["churrasqueira", "mesaExterna"] },
  { re: /garagem|vaga/i, piso: "pedra", itens: ["carro"] },
  { re: /quintal|jardim|gramado/i, piso: "grama", itens: ["arvore", "rede"] },
  { re: /deck|p[eé]rgola|pergolado/i, piso: "deck", itens: ["pergolado", "sofaExterno"] },
];

// Sacada e varanda continuam presas à casa (têm laje e guarda-corpo), não são área solta.
const SACADAS = /sacada|varanda|terra[cç]o/i;

export function roomsToPlan(rooms: Room[]): PlanRoom[] {
  const PISO: Record<string, PlanRoom["piso"]> = {
    cozinha: "frio", banheiro: "frio", lavabo: "frio", area: "frio",
  };
  const externoDe = (nome: string) => EXTERNOS.find((e) => e.re.test(nome));

  const dentro = rooms.map((r, i) => ({ r, i })).filter(({ r }) => !externoDe(r.name));
  const fora = rooms.map((r, i) => ({ r, i })).filter(({ r }) => externoDe(r.name));

  const out: PlanRoom[] = [];
  const floors = [...new Set(dentro.map(({ r }) => r.floor || 0))].sort((a, b) => a - b);

  // A largura das fileiras sai da área do MAIOR andar; depois que o térreo é montado, os
  // andares de cima passam a usar a largura real dele como limite. Sem isso um pavimento
  // superior com cômodos largos ficava mais largo que o térreo e sobrava no ar, que é o
  // que aparecia na maquete.
  const areaDoAndar = (f: number) =>
    dentro.filter(({ r }) => (r.floor || 0) === f).reduce((a, { r }) => a + r.width * r.length, 0);
  const maiorArea = Math.max(0, ...floors.map(areaDoAndar));
  const rowMax = Math.max(
    ...dentro.map(({ r }) => r.width),
    Math.sqrt(Math.max(maiorArea, 1) * 1.6),
  );

  let bbox = { x0: 0, x1: 0, z0: 0, z1: 0 };
  let limite = rowMax; // vai virar a largura real do térreo depois do primeiro andar
  floors.forEach((f, ordem) => {
    const onFloor = dentro.filter(({ r }) => (r.floor || 0) === f);
    if (!onFloor.length) return;
    const placed: { room: PlanRoom; x: number; z: number }[] = [];
    let cursorX = 0, cursorZ = 0, rowD = 0;
    onFloor.forEach(({ r, i }) => {
      if (cursorX > 0 && cursorX + r.width > limite) { cursorX = 0; cursorZ += rowD; rowD = 0; }
      const room: PlanRoom = {
        id: r.name.toLowerCase().replace(/\s+/g, "_") + "_" + i,
        nome: r.name,
        f,
        w: r.width,
        d: r.length,
        cx: 0,
        cz: 0,
        piso: PISO[r.name.toLowerCase()] || "madeira",
        tipo: SACADAS.test(r.name) ? "sacada" : /circula|corredor|hall/i.test(r.name) ? "circ" : null,
        items: [],
      };
      placed.push({ room, x: cursorX + r.width / 2, z: cursorZ + r.length / 2 });
      cursorX += r.width;
      rowD = Math.max(rowD, r.length);
    });

    // Cada andar centrado no mesmo ponto, para empilharem alinhados.
    const minX = Math.min(...placed.map((p) => p.x - p.room.w / 2));
    const maxX = Math.max(...placed.map((p) => p.x + p.room.w / 2));
    const minZ = Math.min(...placed.map((p) => p.z - p.room.d / 2));
    const maxZ = Math.max(...placed.map((p) => p.z + p.room.d / 2));
    const ox = (minX + maxX) / 2, oz = (minZ + maxZ) / 2;
    // O térreo define a pegada; os andares acima não podem passar dela.
    if (ordem === 0) limite = Math.max(...onFloor.map(({ r }) => r.width), maxX - minX);
    placed.forEach(({ room, x, z }) => {
      room.cx = Number((x - ox).toFixed(2));
      room.cz = Number((z - oz).toFixed(2));
      out.push(room);
    });
    bbox = {
      x0: Math.min(bbox.x0, minX - ox), x1: Math.max(bbox.x1, maxX - ox),
      z0: Math.min(bbox.z0, minZ - oz), z1: Math.max(bbox.z1, maxZ - oz),
    };
  });

  // Áreas externas ficam EM VOLTA da casa, nunca dentro do bloco construído: alternando
  // frente, fundo, esquerda e direita, encostadas na fachada correspondente.
  const lados: ("frente" | "fundo" | "esq" | "dir")[] = ["frente", "fundo", "esq", "dir"];
  const usado = { frente: 0, fundo: 0, esq: 0, dir: 0 };
  fora.forEach(({ r, i }, n) => {
    const cfg = externoDe(r.name)!;
    const lado = lados[n % lados.length];
    let cx = 0, cz = 0;
    if (lado === "frente") { cz = bbox.z1 + r.length / 2 + usado.frente; usado.frente += r.length; }
    else if (lado === "fundo") { cz = bbox.z0 - r.length / 2 - usado.fundo; usado.fundo += r.length; }
    else if (lado === "esq") { cx = bbox.x0 - r.width / 2 - usado.esq; usado.esq += r.width; }
    else { cx = bbox.x1 + r.width / 2 + usado.dir; usado.dir += r.width; }
    out.push({
      id: r.name.toLowerCase().replace(/\s+/g, "_") + "_" + i,
      nome: r.name,
      f: 0,
      w: r.width,
      d: r.length,
      cx: Number(cx.toFixed(2)),
      cz: Number(cz.toFixed(2)),
      piso: cfg.piso,
      tipo: null,
      ext: 1,
      // As peças entram lado a lado, dentro dos limites da área.
      items: cfg.itens.slice(0, r.width > 3 ? 2 : 1).map((kind, k, arr) =>
        [kind, Number((((k + 0.5) / arr.length - 0.5) * r.width * 0.6).toFixed(2)), 0, 0] as [string, number, number, number]),
    });
  });

  return out;
}

// The 3D editor owns the `plan`, but the estimate, the material list and the PDF are all
// computed from `rooms` on the backend. So every save projects the plan back down into
// rooms — one direction only, plan is still the single source of truth. Outdoor areas
// (lawn, deck, pool surround) are left out: they aren't built area and would inflate the
// material count.
export function planToRooms(plan: PlanRoom[]): Room[] {
  return plan
    .filter((r) => !r.ext && r.piso !== "grama")
    .map((r) => ({
      name: r.nome,
      width: Number(r.w.toFixed(2)),
      length: Number(r.d.toFixed(2)),
      x: Number((r.cx - r.w / 2).toFixed(2)),
      y: Number((r.cz - r.d / 2).toFixed(2)),
      floor: r.f || 0,
    }));
}

// Bumped whenever the migration itself changes; a plan saved by an older version is
// rebuilt from `rooms` instead of being trusted.
//   1 · rooms laid out with gaps — rendered as a scatter of loose boxes
//   2 · rooms packed edge to edge, floors centred
//   3 · pool/grill/garage/yard become outdoor areas around the house, and upper floors
//       are kept within the ground floor's footprint
export const PLAN_VERSION = 3;

export function build3DHtml(project: Project): string {
  // An empty plan makes the scene load its own sample house, so old projects are
  // migrated here rather than showing someone else's floor plan.
  const usable = project.plan && project.plan.length && project.plan_version === PLAN_VERSION;
  const planRooms = usable ? (project.plan as PlanRoom[]) : roomsToPlan(project.rooms || []);
  const plan = JSON.stringify(planRooms);
  const floors = project.floors || planRooms.reduce((n, r) => Math.max(n, (r.f || 0) + 1), 1);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  :root{--bg:#F8F7F4;--ink:#1A1A1A;--muted:#706F6A;--line:#E2DFD8;--card:#EFECE6;--brand:#C85A32;--pale:#FCECE6}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;font-family:Geist,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink)}
  #c{width:100%;height:100%}
  .topbar{display:flex;align-items:center;gap:10px;padding:6px 14px 12px;border-bottom:1px solid var(--line)}
  .ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;border:none;background:transparent;cursor:pointer;color:var(--ink)}
  .ico:active{background:var(--card)}
  .ttl{font-size:17px;font-weight:700;line-height:1.15}
  .sub{font-size:12px;color:var(--muted);margin-top:2px;height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stage{position:relative;width:100%;height:100%}
  canvas{display:block;width:100%;height:100%;touch-action:none}
  #labels{position:absolute;inset:0;pointer-events:none}
  .lbl{position:absolute;top:0;left:0;background:rgba(248,247,244,.9);border:1px solid var(--line);border-radius:10px;
    padding:5px 9px;text-align:center;backdrop-filter:blur(8px);white-space:nowrap;transition:opacity .25s}
  .lbl b{display:block;font-size:11.5px;font-weight:700;line-height:1.15}
  .lbl i{display:block;font-size:10px;color:var(--muted);font-style:normal;margin-top:1px}
  .hud{position:absolute;top:12px;left:0;right:0;padding:0 12px;display:flex;gap:8px;flex-wrap:nowrap;
    overflow-x:auto;overflow-y:hidden;pointer-events:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .hud::-webkit-scrollbar{display:none}
  .hud>*{flex:0 0 auto}
  .pill{pointer-events:auto;border:1px solid var(--line);background:rgba(248,247,244,.85);backdrop-filter:blur(12px);
    border-radius:999px;padding:8px 14px;font-size:12px;font-weight:600;color:var(--ink);cursor:pointer;min-height:36px;white-space:nowrap}
  .pill.on{background:var(--brand);border-color:var(--brand);color:#fff}
  .seg{pointer-events:auto;display:flex;border:1px solid var(--line);background:rgba(248,247,244,.85);
    backdrop-filter:blur(12px);border-radius:999px;padding:3px;gap:2px}
  .seg button{border:none;background:transparent;border-radius:999px;padding:0 12px;height:30px;
    font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap;font-family:inherit}
  .seg button.on{background:var(--brand);color:#fff}
  #loaderr{display:none;position:absolute;left:16px;right:16px;top:50%;transform:translateY(-50%);
    background:var(--pale);border:1px solid var(--brand);border-radius:14px;padding:14px 16px;text-align:center}
  #loaderr b{display:block;font-size:14px;color:var(--brand)}
  #loaderr i{display:block;font-size:11.5px;color:var(--muted);font-style:normal;margin-top:6px;word-break:break-word}
  .metaline{position:absolute;right:12px;bottom:28px;font-size:11.5px;color:var(--muted);
    background:rgba(248,247,244,.85);padding:7px 11px;border-radius:999px;backdrop-filter:blur(8px);
    white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
  #tip{position:absolute;left:12px;bottom:28px;font-size:11.5px;color:var(--muted);background:rgba(248,247,244,.85);
    padding:7px 11px;border-radius:999px;backdrop-filter:blur(8px)}
  #roomcard{position:absolute;left:12px;right:12px;bottom:12px;display:none;align-items:center;gap:8px;
    background:rgba(26,26,26,.93);color:#fff;border-radius:18px;padding:10px 10px;backdrop-filter:blur(14px);z-index:5}
  #roomcard.show{display:flex}
  #roomcard.slim{bottom:auto;top:56px;left:12px;right:12px}
  #roomcard .t{flex:1;min-width:0}
  #roomcard b{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #roomcard span{display:block;font-size:11px;color:#B9B6B0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #roomcard button{border:none;background:rgba(255,255,255,.15);color:#fff;border-radius:12px;height:44px;padding:0 13px;
    font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
  #btnEdit.done{background:var(--brand)}

  #sheet{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:20px 20px 0 0;z-index:6;
    box-shadow:0 -8px 28px rgba(0,0,0,.14);transform:translateY(103%);transition:transform .26s ease;
    max-height:46%;display:flex;flex-direction:column}
  #sheet.open{transform:translateY(0)}
  #sheet .hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px}
  #sheet .hd b{font-size:15px}
  #sheet.swap .hd b{color:var(--brand)}
  #sheet .hd button{background:none;border:none;font-size:13px;font-weight:700;color:var(--brand);cursor:pointer}
  #cats{display:flex;gap:8px;padding:0 16px 10px;overflow-x:auto;scrollbar-width:none}
  #cats::-webkit-scrollbar{display:none}
  #cats button{flex:0 0 auto;border:1px solid var(--line);background:var(--bg);border-radius:999px;padding:8px 14px;
    font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;min-height:36px}
  #cats button.on{background:var(--pale);border-color:var(--brand);color:var(--brand)}
  #grid{overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 20px}
  #grid button{border:1px solid var(--line);background:var(--bg);border-radius:14px;padding:10px 6px;min-height:64px;cursor:pointer}
  #grid button b{display:block;font-size:11px;line-height:1.2}
  #grid button i{display:block;font-size:10px;color:var(--muted);font-style:normal;margin-top:3px}
  #selbar{position:absolute;left:12px;right:12px;bottom:calc(46% + 10px);display:none;flex-direction:column;gap:7px;z-index:7;
    background:rgba(26,26,26,.93);color:#fff;border-radius:16px;padding:9px 10px;backdrop-filter:blur(14px)}
  #selbar.show{display:flex}
  #selbar .nm{font-size:12.5px;font-weight:600;padding:0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #selbar .row{display:flex;gap:6px}
  #selbar button{flex:1;min-width:0;height:44px;border:none;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;
    font-size:12px;font-weight:600;cursor:pointer;padding:0 6px;white-space:nowrap}
  #selbar button#rotL,#selbar button#rotR{flex:0 0 44px;font-size:15px}
  #selbar button.dl{background:rgba(211,47,47,.9)}
  #toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(46% + 104px);background:#1A1A1A;color:#fff;
    font-size:12px;font-weight:600;padding:8px 14px;border-radius:999px;opacity:0;transition:opacity .22s;pointer-events:none;z-index:8}
  #toast.show{opacity:1}

  #projpanel{position:absolute;top:8px;right:12px;width:268px;background:#fff;border:1px solid var(--line);
    border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.2);padding:12px 14px 14px;z-index:20;display:none}
  #projpanel.open{display:block}
  #projpanel .ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  #projpanel .ph b{font-size:14px}
  #projpanel .ph button{background:none;border:none;font-size:12.5px;font-weight:700;color:var(--brand);cursor:pointer}
  #projpanel .pl{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:10px 0 6px}
  #projpanel .pn{font-size:11px;line-height:1.4;color:var(--muted);margin:8px 0 0}
  .seg.wide{display:flex;width:100%}
  .seg.wide button{flex:1;height:34px;padding:0 6px}
  .wbtn{width:100%;height:42px;border:1px solid var(--line);background:var(--bg);border-radius:12px;
    font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;font-family:inherit}
  .wbtn.on{background:var(--brand);border-color:var(--brand);color:#fff}

  #planbar{position:absolute;left:12px;right:12px;bottom:12px;display:none;flex-direction:column;gap:8px;z-index:9;
    background:rgba(26,26,26,.93);color:#fff;border-radius:18px;padding:10px;backdrop-filter:blur(14px)}
  #planbar.show{display:flex}
  #planbar .pb1{display:flex;align-items:center;gap:8px}
  #planbar .pb2,#planbar .pb3{display:none;align-items:center;gap:8px}
  #planbar .pb2.on,#planbar .pb3.on{display:flex}
  #planbar .stp{flex:1;min-width:0;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.09);
    border-radius:12px;padding:3px 6px}
  #planbar .stp span{flex:0 0 auto;font-size:10.5px;font-weight:700;color:#B9B6B0}
  #planbar .stp b{flex:1 1 auto;min-width:52px;text-align:center;font-size:12px;font-weight:700;white-space:nowrap}
  #planbar .stp button{flex:0 0 auto;min-width:32px;height:34px;padding:0;font-size:16px;line-height:1}
  #planbar .pb3 button{flex:1}
  #planbar .t{flex:1;min-width:0}
  #planbar b{display:block;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #planbar span{display:block;font-size:11px;color:#B9B6B0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #planbar button{border:none;background:rgba(255,255,255,.15);color:#fff;border-radius:12px;height:44px;padding:0 12px;
    font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit}
  #planbar button:disabled{opacity:.35}
  #planbar button.dl{background:rgba(211,47,47,.9)}
  #planbar #protate{min-width:44px;padding:0}

  #roomsheet{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:20px 20px 0 0;z-index:10;
    box-shadow:0 -8px 28px rgba(0,0,0,.14);transform:translateY(103%);transition:transform .26s ease;
    max-height:44%;display:flex;flex-direction:column}
  #roomsheet.open{transform:translateY(0)}
  #roomsheet .hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px}
  #roomsheet .hd b{font-size:15px}
  #roomsheet .hd button{background:none;border:none;font-size:13px;font-weight:700;color:var(--brand);cursor:pointer}
  #rsgrid{overflow-y:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 16px 20px}
  #rsgrid button{border:1px solid var(--line);background:var(--bg);border-radius:14px;padding:11px 10px;cursor:pointer;
    text-align:left;font-family:inherit}
  #rsgrid button b{display:block;font-size:12.5px;font-weight:700}
  #rsgrid button i{display:block;font-size:10.5px;color:var(--muted);font-style:normal;margin-top:3px}
</style>
</head>
<body>
<div class="stage">
    <canvas id="c"></canvas>
    <div id="meta" class="metaline"></div>
    <div id="loaderr"><b>Não foi possível abrir a maquete 3D</b><i></i></div>
    <div id="labels"></div>
    <div class="hud">
      <button class="pill on" id="btnRoof">Telhado</button>
      <button class="pill on" id="btnLabels">Etiquetas</button>
      <button class="pill" id="btnTop">Planta</button>
      <button class="pill" id="btnProj">Projeto</button>
      <button class="pill" id="btnShare">Compartilhar</button>
      <div class="seg" id="segFloors"></div>
    </div>
    <div id="tip">Toque num cômodo para entrar e mobiliar</div>
    <div id="roomcard">
      <div class="t"><b id="rcname"></b><span id="rcdim"></span></div>
      <button id="btnEdit">Editar</button>
      <button id="rcback">Sair</button>
    </div>
    <div id="toast"></div>
    <div id="projpanel">
      <div class="ph"><b>Projeto</b><button id="projclose">Fechar</button></div>
      <div class="pl">Estrutura</div>
      <div class="seg wide">
        <button id="btnE1">Térrea</button>
        <button class="on" id="btnE2">Sobrado</button>
        <button id="btnE3">3 andares</button>
      </div>
      <div class="pl">Planta</div>
      <button class="wbtn" id="btnPlan">Mover cômodos</button>
      <p class="pn">Reposicione cômodos e áreas externas no lote. Paredes, portas, janelas e telhado se refazem sozinhos.</p>
    </div>
    <div id="planbar">
      <div class="pb1">
        <div class="t"><b id="pname">Toque num cômodo</b><span id="pinfo">Arraste para mover no lote</span></div>
        <button id="padd">+ Cômodo</button>
        <button id="pclose">Concluir</button>
      </div>
      <div class="pb2" id="pb2">
        <div class="stp"><span>L</span><button id="pwm">−</button><b id="pwv">—</b><button id="pwp">+</button></div>
        <div class="stp"><span>P</span><button id="pdm">−</button><b id="pdv">—</b><button id="pdp">+</button></div>
      </div>
      <div class="pb3" id="pb3">
        <button id="protate">Girar 90°</button>
        <button id="pdel" class="dl">Excluir cômodo</button>
      </div>
    </div>
    <div id="roomsheet">
      <div class="hd"><b>Adicionar cômodo</b><button id="rsclose">Fechar</button></div>
      <div id="rsgrid"></div>
    </div>
    <div id="selbar">
      <span class="nm" id="selname"></span>
      <div class="row">
        <button id="rotL" aria-label="Girar à esquerda">↺</button>
        <button id="rotR" aria-label="Girar à direita">↻</button>
        <button id="swap">Trocar</button>
        <button id="dup">Duplicar</button>
        <button id="del" class="dl">Excluir</button>
      </div>
    </div>
    <div id="sheet">
      <div class="hd"><b id="shtitle">Adicionar peça</b><button id="sclose">Fechar</button></div>
      <div id="cats"></div>
      <div id="grid"></div>
    </div>
</div>
<script>
  window.PROJECT_PLAN = ${plan};
  window.PROJECT_FLOORS = ${floors};
  // A blank canvas gives nothing to go on, so any failure is surfaced on screen.
  window.__failed = function (msg) {
    var el = document.getElementById("loaderr");
    if (!el) return;
    el.style.display = "block";
    el.querySelector("i").textContent = msg || "erro desconhecido";
  };
  window.addEventListener("error", function (e) {
    if (e && e.message) window.__failed(e.message);
  }, true);
  setTimeout(function () {
    if (!window.__sceneReady) window.__failed("a cena não terminou de montar");
  }, 12000);
</script>
<!-- three.js vai embutido no app: nada de CDN, nada de import map, funciona sem internet -->
<script>${THREE_BUNDLE_JS}</script>
<script>
  if (!window.THREE) window.__failed("three.js não inicializou");
  ${FURNITURE_LIB_JS}
  ${SCENE_JS}
  window.__sceneReady = true;

  // Sharing keeps working: the renderer is created with preserveDrawingBuffer, so the
  // canvas can be read back straight into the app's existing screenshot flow.
  const shareBtn = document.getElementById("btnShare");
  if (shareBtn) shareBtn.addEventListener("click", function () {
    try {
      const dataUrl = document.getElementById("c").toDataURL("image/png");
      const msg = JSON.stringify({ type: "share_screenshot", dataUrl: dataUrl });
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
      else if (window.parent !== window) window.parent.postMessage(msg, "*");
    } catch (e) {}
  });
</script>
</body>
</html>`;
}
