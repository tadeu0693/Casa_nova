// Editor 3D completo — é o ÚNICO editor do projeto: cria, move, gira,
// redimensiona e exclui cômodos; 1 a 3 pavimentos; paredes, portas, janelas,
// escada e telhado derivados dos retângulos; áreas externas; mobiliário.
//
// JS puro injetado no HTML da WebView por build3d.ts, DEPOIS de
// FURNITURE_LIB_JS (usa M, PIECES, box, cyl dele). Depende de um THREE global e
// de THREE.OrbitControls.
//
// Entrada:  window.PROJECT_PLAN   array de cômodos (vazio = carrega o exemplo)
//           window.PROJECT_FLOORS 1, 2 ou 3
// Saída:    postMessage {type:'save_plan', floors, plan} a cada alteração
//
// Ver PATCH.md.

export const SCENE_JS = `
const OrbitControls = THREE.OrbitControls;

// ---------- constantes ----------
const WH = 2.7, LAJE = 0.3, T = 0.14, FH = WH + LAJE;
const LOT = { w: 30, d: 26 };
const floorY = f => f * FH;

// ---------- planta ----------
// Cada cômodo é um retângulo (centro + tamanho) com seus móveis em coordenadas
// RELATIVAS ao centro. Mover o cômodo leva tudo junto.
let startFloors = 2;
const DEFAULT_PLAN = [
  // térreo
  { f: 0, id: 'sala', nome: 'Sala de estar', w: 5.9, d: 3.5, cx: -2.55, cz: 2.45, piso: 'madeira', items: [
    ['tapete', -0.35, 0.05, 0], ['sofa3', -0.35, 1.2, Math.PI], ['mesaCentro', -0.35, 0.05, 0],
    ['rackTV', -0.35, -1.4, 0], ['poltrona', 1.95, 0.45, -Math.PI / 2], ['planta', 2.25, 1.35, 0] ] },
  { f: 0, id: 'cozinha', nome: 'Cozinha e jantar', w: 5.1, d: 3.5, cx: 2.95, cz: 2.45, piso: 'frio', items: [
    ['armarioCozinha', -0.35, 1.4, Math.PI], ['geladeira', -2.0, 1.3, Math.PI],
    ['mesaJantar', 0.45, -0.55, 0], ['bancadaDivisoria', -2.3, -0.9, Math.PI / 2] ] },
  { f: 0, id: 'hall', nome: 'Circulação', tipo: 'circ', w: 11, d: 1.4, cx: 0, cz: 0, piso: 'frio', items: [
    ['planta', 4.9, 0.2, 0] ] },
  { f: 0, id: 'quarto2', nome: 'Quarto de hóspedes', w: 3.7, d: 3.5, cx: -3.65, cz: -2.45, piso: 'madeira', items: [
    ['camaQueen', 0.05, -0.6, 0], ['criadoMudo', 1.25, -1.5, 0], ['criadoMudo', -1.15, -1.5, 0],
    ['guardaRoupa', -1.45, 0.95, Math.PI / 2] ] },
  { f: 0, id: 'banho', nome: 'Banheiro', w: 2.8, d: 3.5, cx: -0.4, cz: -2.45, piso: 'frio', items: [
    ['pia', -0.5, -1.5, 0], ['vasoSanitario', 0.95, -1.45, 0], ['chuveiro', -0.9, 1.2, Math.PI] ] },
  { f: 0, id: 'escritorio', nome: 'Escritório', w: 4.5, d: 3.5, cx: 3.25, cz: -2.45, piso: 'madeira', items: [
    ['escrivaninha', 0.15, -0.2, 0], ['estante', 1.95, 0.6, -Math.PI / 2], ['planta', -1.75, -1.4, 0] ] },
  // 2º pavimento
  { f: 1, id: 'estar', nome: 'Estar íntimo', w: 4.5, d: 3.5, cx: -3.25, cz: 2.45, piso: 'madeira', items: [
    ['tapete', 0, 0.05, 0], ['sofa3', 0, 1.2, Math.PI], ['mesaCentro', 0, 0.05, 0],
    ['rackTV', 0, -1.4, 0], ['planta', 1.85, 1.35, 0] ] },
  { f: 1, id: 'sacada', nome: 'Sacada', tipo: 'sacada', w: 6.5, d: 3.5, cx: 2.25, cz: 2.45, piso: 'deck', items: [
    ['rede', -1.6, 0.2, Math.PI / 2], ['poltrona', 1.5, 0.9, Math.PI],
    ['mesaCentro', 1.5, -0.35, 0], ['planta', 2.9, 1.3, 0] ] },
  { f: 1, id: 'circ1', nome: 'Circulação', tipo: 'circ', w: 11, d: 1.4, cx: 0, cz: 0, piso: 'madeira', items: [
    ['planta', 4.9, 0.2, 0] ] },
  { f: 1, id: 'quarto3', nome: 'Quarto 2', w: 3.7, d: 3.5, cx: -3.65, cz: -2.45, piso: 'madeira', items: [
    ['camaQueen', 0.05, -0.6, 0], ['criadoMudo', 1.25, -1.5, 0], ['criadoMudo', -1.15, -1.5, 0],
    ['guardaRoupa', -1.45, 0.95, Math.PI / 2] ] },
  { f: 1, id: 'banho2', nome: 'Banheiro', w: 2.8, d: 3.5, cx: -0.4, cz: -2.45, piso: 'frio', items: [
    ['pia', -0.5, -1.5, 0], ['vasoSanitario', 0.95, -1.45, 0], ['chuveiro', -0.9, 1.2, Math.PI] ] },
  { f: 1, id: 'suiteM', nome: 'Suíte master', w: 4.5, d: 3.5, cx: 3.25, cz: -2.45, piso: 'madeira', items: [
    ['camaQueen', 0.05, -0.6, 0], ['criadoMudo', 1.25, -1.5, 0], ['criadoMudo', -1.15, -1.5, 0],
    ['guardaRoupa', 1.9, 0.85, -Math.PI / 2], ['poltrona', -1.65, 1.0, Math.PI / 4] ] },
  // 3º pavimento
  { f: 2, id: 'jogos', nome: 'Sala de jogos', w: 6.0, d: 3.5, cx: -2.5, cz: 2.45, piso: 'madeira', items: [
    ['tapete', -1.2, 0.1, 0], ['sofa3', -1.2, 1.2, Math.PI], ['pianoCauda', 1.85, -0.5, 0],
    ['estante', -2.65, -0.85, Math.PI / 2], ['lustre', 0, 0, 0] ] },
  { f: 2, id: 'terraco', nome: 'Terraço', tipo: 'sacada', w: 4.4, d: 3.5, cx: 3.3, cz: 2.45, piso: 'deck', items: [
    ['rede', 0, 0.35, Math.PI / 2], ['poltrona', 1.4, -1.0, Math.PI], ['planta', 1.75, 1.3, 0] ] },
  { f: 2, id: 'circ2', nome: 'Circulação', tipo: 'circ', w: 11, d: 1.4, cx: 0, cz: 0, piso: 'madeira', items: [
    ['planta', 4.9, 0.2, 0] ] },
  { f: 2, id: 'suite3', nome: 'Suíte 3', w: 5.4, d: 3.5, cx: -2.8, cz: -2.45, piso: 'madeira', items: [
    ['camaQueen', 0, -0.6, 0], ['criadoMudo', 1.2, -1.5, 0], ['criadoMudo', -1.2, -1.5, 0],
    ['lareira', 2.35, 0.8, -Math.PI / 2], ['poltrona', -2.0, 1.0, Math.PI / 4] ] },
  { f: 2, id: 'banho3', nome: 'Banheiro', w: 2.6, d: 3.5, cx: 1.2, cz: -2.45, piso: 'frio', items: [
    ['banheira', -0.15, -0.85, 0], ['pia', 0, 1.15, Math.PI], ['vasoSanitario', 0.95, 0.3, -Math.PI / 2] ] },
  { f: 2, id: 'closet', nome: 'Closet', w: 2.9, d: 3.5, cx: 4.05, cz: -2.45, piso: 'madeira', items: [
    ['guardaRoupa', 0, -1.25, 0], ['guardaRoupa', 0, 1.25, Math.PI] ] },
  // áreas externas
  { f: 0, ext: 1, id: 'lazer', nome: 'Área da piscina', w: 17.2, d: 5.4, cx: 0, cz: 7.9, piso: 'deck', items: [
    ['piscina', -1.4, 0.1, 0], ['espreguicadeira', 3.4, 0.4, -Math.PI / 2],
    ['espreguicadeira', 4.4, 0.4, -Math.PI / 2], ['jacuzzi', 6.9, 0.5, 0], ['sofaExterno', -6.6, -1.6, Math.PI] ] },
  { f: 0, ext: 1, id: 'gourmet', nome: 'Espaço gourmet', w: 4.5, d: 8.4, cx: -8.75, cz: 0, piso: 'pedra', items: [
    ['churrasqueira', -1.6, 1.2, Math.PI / 2], ['pergolado', -0.2, 1.2, 0],
    ['mesaExterna', 0.35, -1.9, 0], ['planta', 1.4, 3.6, 0] ] },
  { f: 0, ext: 1, id: 'garagem', nome: 'Garagem', w: 4.5, d: 8.4, cx: 8.75, cz: 0, piso: 'pedra', items: [
    ['carro', -1.15, 1.4, 0], ['carro', 1.15, 1.4, 0] ] },
  { f: 0, ext: 1, id: 'quintal', nome: 'Quintal', w: 17.2, d: 5.4, cx: 0, cz: -7.9, piso: 'grama', items: [
    ['arvore', -6.6, -0.7, 0], ['arvore', 6.4, -1.1, 0], ['fogueira', 0, 0.3, 0],
    ['deckMadeira', -3.2, 1.0, 0], ['rede', 4.0, 1.2, 0] ] },
];
const PLAN = (window.PROJECT_PLAN && window.PROJECT_PLAN.length) ? window.PROJECT_PLAN : DEFAULT_PLAN;
for (const r of PLAN) {
  r.rot = r.rot || 0;
  r.items = r.items || [];
  r.area = r.w * r.d;
}
if (window.PROJECT_FLOORS) startFloors = window.PROJECT_FLOORS;
const built = () => PLAN.filter(r => !r.ext);

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE9E5DD);
scene.fog = new THREE.Fog(0xE9E5DD, 48, 104);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 240);
const HOME = new THREE.Vector3(25, 22, 31);
const HOME_T = new THREE.Vector3(0, 2.6, 0);
camera.position.copy(HOME);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_T);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 78;
controls.maxPolarAngle = Math.PI / 2 - 0.04;

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w < 2 || h < 2) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
let sizedW = -1, sizedH = -1;
function syncSize() {
  if (window.omFit) window.omFit();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w < 2 || h < 2) return;
  if (w === sizedW && h === sizedH) return;
  sizedW = w; sizedH = h;
  resize();
}

scene.add(new THREE.HemisphereLight(0xE8EEF5, 0xB0A794, 1.1));
const sun = new THREE.DirectionalLight(0xFFF3E0, 2.3);
sun.position.set(12, 20, 11);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const S = 21;
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, far: 66 });
sun.shadow.bias = -0.0012;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xDCE6F0, 0.5);
fill.position.set(-10, 6, -11);
scene.add(fill);

const terreno = box(LOT.w, 0.3, LOT.d, M.grama, 0, -0.15, 0, 'terreno');
terreno.castShadow = false; scene.add(terreno);

// ---------- montagem ----------
const casa = new THREE.Group(); casa.name = 'projeto'; scene.add(casa);
const PISO_MAT = { madeira: M.piso, frio: M.pisoFrio, deck: M.deck, pedra: M.pedra, grama: M.grama };
const floorHit = [], wallPanels = [];

function localOf(r, wx, wz) {
  const c = Math.cos(-r.rot), s = Math.sin(-r.rot);
  const dx = wx - r.cx, dz = wz - r.cz;
  return { x: dx * c + dz * s, z: -dx * s + dz * c };
}
function worldOf(r, lx, lz) {
  const c = Math.cos(r.rot), s = Math.sin(r.rot);
  return { x: r.cx + lx * c + lz * s, z: r.cz - lx * s + lz * c };
}
function inside(r, wx, wz, pad = 0) {
  const p = localOf(r, wx, wz);
  return Math.abs(p.x) <= r.w / 2 + pad && Math.abs(p.z) <= r.d / 2 + pad;
}

function mountRoom(r) {
  const g = new THREE.Group();
  g.name = r.id;
  g.position.set(r.cx, floorY(r.f), r.cz);
  g.rotation.y = r.rot || 0;
  casa.add(g);
  r.g = g;
  makeSlab(r);
  r.mob = new THREE.Group(); r.mob.name = 'mobiliario';
  g.add(r.mob);
  for (const [kind, dx, dz, ry] of (r.items || [])) addPiece(r, kind, dx, dz, ry);
  r.wallsG = new THREE.Group(); r.wallsG.name = 'paredes';
  g.add(r.wallsG);
}
function makeSlab(r) {
  if (r.slab) {
    r.g.remove(r.slab);
    r.slab.geometry.dispose();
    const i = floorHit.indexOf(r.slab);
    if (i >= 0) floorHit.splice(i, 1);
  }
  const th = r.f === 0 ? 0.1 : LAJE;
  const p = box(r.w, th, r.d, PISO_MAT[r.piso] || M.pisoFrio, 0, -th / 2, 0, 'piso');
  p.castShadow = false;
  p.userData.room = r;
  r.g.add(p);
  r.slab = p;
  floorHit.push(p);
}
for (const r of PLAN) mountRoom(r);

function addPiece(r, kind, dx, dz, ry) {
  const b = PIECES[kind];
  if (!b) return null;
  const { g, w, d } = b();
  g.position.set(dx, 0.05, dz);
  g.rotation.y = ry || 0;
  g.name = kind;
  g.userData = { kind, w, d, room: r };
  r.mob.add(g);
  return g;
}

// ---------- paredes derivadas da planta ----------
function panelWith(len, openings) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, WH); s.lineTo(-len / 2, WH); s.closePath();
  for (const o of openings) {
    const p = new THREE.Path();
    p.moveTo(o.t - o.w / 2, o.y); p.lineTo(o.t + o.w / 2, o.y);
    p.lineTo(o.t + o.w / 2, o.y + o.h); p.lineTo(o.t - o.w / 2, o.y + o.h); p.closePath();
    s.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
  geo.translate(0, 0, -T / 2);
  const mesh = new THREE.Mesh(geo, M.parede);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'alvenaria';
  return mesh;
}
function gradil(g, len, y) {
  g.add(box(len, 0.05, T + 0.16, M.pedra, 0, y, 0, 'peitoril'));
  const n = Math.max(2, Math.round(len / 0.22));
  for (let i = 0; i <= n; i++) g.add(cyl(0.014, 0.9, M.escuro, -len / 2 + i * (len / n), y + 0.45, 0, 'gradil', 8));
  const cr = cyl(0.025, len, M.escuro, 0, y + 0.92, 0, 'corrimao', 10);
  cr.rotation.z = Math.PI / 2;
  g.add(cr);
}

const EDGES = [
  { key: 'N', rotY: 0,          off: [0, -1] },
  { key: 'S', rotY: Math.PI,    off: [0,  1] },
  { key: 'W', rotY: Math.PI / 2,  off: [-1, 0] },
  { key: 'E', rotY: -Math.PI / 2, off: [1,  0] },
];

function neighborOf(r, e, len) {
  // ponto de prova do lado de FORA do meio da aresta, em coordenadas do mundo
  const half = e.off[0] ? r.w / 2 : r.d / 2;
  const lx = e.off[0] * (half + 0.42), lz = e.off[1] * (half + 0.42);
  const p = worldOf(r, lx, lz);
  return PLAN.find(o => o !== r && !o.ext && o.f === r.f && o.visible !== false && inside(o, p.x, p.z));
}

function buildWalls(r) {
  const g = r.wallsG;
  while (g.children.length) {
    const c = g.children.pop();
    c.traverse(n => { if (n.geometry) n.geometry.dispose(); });
  }
  for (let i = wallPanels.length - 1; i >= 0; i--) if (wallPanels[i].room === r) wallPanels.splice(i, 1);
  if (r.ext) return;

  const isCirc = r.tipo === 'circ';
  for (const e of EDGES) {
    const along = e.off[0] ? r.d : r.w;
    const half = e.off[0] ? r.w / 2 : r.d / 2;
    const eg = new THREE.Group();
    eg.rotation.y = e.rotY;
    const inset = half - T / 2;
    eg.position.set(e.off[0] * inset, 0, e.off[1] * inset);

    const nb = neighborOf(r, e, along);
    const openings = [];
    if (r.tipo === 'sacada') {
      if (!nb) { gradil(eg, along, 1.02); g.add(eg); continue; }
      openings.push({ t: 0, w: Math.min(1.9, along - 0.6), h: 2.1, y: 0, vao: 1 });
    } else if (nb) {
      // porta só entre cômodo e circulação
      if (isCirc || nb.tipo === 'circ') openings.push({ t: 0, w: 0.9, h: 2.1, y: 0, vao: 1 });
    } else if (!isCirc) {
      const ww = Math.min(2.4, Math.max(0.9, along * 0.5));
      openings.push({ t: 0, w: ww, h: 1.45, y: 0.95, vidro: 1 });
    }

    eg.add(panelWith(along, openings));
    for (const o of openings) {
      if (o.vidro) {
        const fr = 0.06;
        for (const [w2, h2, x2, y2] of [[o.w, fr, o.t, o.y], [o.w, fr, o.t, o.y + o.h],
                                        [fr, o.h, o.t - o.w / 2, o.y + o.h / 2], [fr, o.h, o.t + o.w / 2, o.y + o.h / 2]])
          eg.add(box(w2, h2, T + 0.03, M.escuro, x2, y2, 0, 'caixilho'));
        const pane = box(o.w, o.h, 0.02, M.vidro, o.t, o.y + o.h / 2, 0, 'vidro');
        pane.castShadow = false;
        eg.add(pane);
        eg.add(box(o.w + 0.1, 0.05, T + 0.14, M.pedra, o.t, o.y - 0.02, 0, 'peitoril'));
      } else {
        const fr = 0.05;
        eg.add(box(o.w + fr * 2, fr, T + 0.02, M.rodape, o.t, o.y + o.h, 0, 'batente_sup'));
        for (const s2 of [-1, 1]) eg.add(box(fr, o.h, T + 0.02, M.rodape, o.t + s2 * (o.w / 2 + fr / 2), o.y + o.h / 2, 0, 'batente'));
      }
    }
    g.add(eg);
    wallPanels.push({ room: r, node: eg, lx: e.off[0] * inset, lz: e.off[1] * inset, nx: -e.off[0], nz: -e.off[1] });
  }
}

// ---------- escada ----------
const RISERS = 15, RISE = FH / RISERS, TREAD = 0.23, SW = 1.15;
function makeStair() {
  const g = new THREE.Group(); g.name = 'escada';
  const run = RISERS * TREAD;
  for (let i = 0; i < RISERS; i++) {
    g.add(box(TREAD, RISE, SW, M.madeira, -run / 2 + i * TREAD, RISE * (i + 0.5), 0, 'degrau' + (i + 1)));
    g.add(box(TREAD + 0.03, 0.03, SW + 0.05, M.madClara, -run / 2 + i * TREAD, RISE * (i + 1), 0, 'piso_degrau' + (i + 1)));
  }
  for (let i = 0; i <= RISERS; i += 3)
    g.add(cyl(0.015, 0.9, M.escuro, -run / 2 + i * TREAD, RISE * i + 0.45, SW / 2 - 0.05, 'balaustre', 8));
  const len = Math.hypot(run, FH);
  const cr = cyl(0.026, len, M.madeira, 0, FH / 2 + 0.9, SW / 2 - 0.05, 'corrimao', 12);
  cr.rotation.z = Math.atan2(FH, run) + Math.PI / 2;
  g.add(cr);
  return g;
}
for (const r of built()) {
  if (r.tipo !== 'circ') continue;
  const st = makeStair();
  st.position.set(-r.w / 2 + (RISERS * TREAD) / 2 + 0.4, 0, 0);
  r.g.add(st);
  r.stair = st;
}

// ---------- telhado ----------
let telhado = null;
function makeRoof(topF) {
  if (telhado) {
    telhado.traverse(n => { if (n.geometry) n.geometry.dispose(); });
    casa.remove(telhado);
    telhado = null;
  }
  const rooms = built().filter(r => r.f === topF);
  if (!rooms.length) return;
  let x1 = Infinity, x2 = -Infinity, z1 = Infinity, z2 = -Infinity;
  for (const r of rooms) {
    const hw = r.rot ? r.d / 2 : r.w / 2, hd = r.rot ? r.w / 2 : r.d / 2;
    x1 = Math.min(x1, r.cx - hw); x2 = Math.max(x2, r.cx + hw);
    z1 = Math.min(z1, r.cz - hd); z2 = Math.max(z2, r.cz + hd);
  }
  const OVER = 0.55, PITCH = 22 * Math.PI / 180;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const runH = (z2 - z1) / 2 + OVER, rise = runH * Math.tan(PITCH), slope = runH / Math.cos(PITCH);
  const roofLen = (x2 - x1) + OVER * 2;

  const g = new THREE.Group(); g.name = 'telhado';
  g.position.set(cx, floorY(topF) + WH + rise, cz);
  for (const s of [1, -1]) {
    const wrap = new THREE.Group();
    if (s < 0) wrap.rotation.y = Math.PI;
    const side = new THREE.Group();
    side.rotation.x = PITCH;
    side.add(box(roofLen, 0.09, slope, M.pedra, 0, -0.045, slope / 2, 'laje'));
    side.add(box(roofLen, 0.16, 0.06, M.madeira, 0, -0.11, slope - 0.03, 'testeira'));
    const step = 0.28, n = Math.floor(roofLen / step);
    for (let i = 0; i <= n; i++) {
      const t = cyl(0.09, slope, M.telha, -roofLen / 2 + i * step + (roofLen - n * step) / 2, 0.055, slope / 2, 'telha' + i, 12);
      t.rotation.x = Math.PI / 2;
      side.add(t);
    }
    wrap.add(side);
    g.add(wrap);
  }
  const cum = cyl(0.15, roofLen, M.telha, 0, 0.09, 0, 'cumeeira', 16);
  cum.rotation.z = Math.PI / 2;
  g.add(cum);
  const hd = (z2 - z1) / 2, edge = OVER * Math.tan(PITCH);
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(-hd, 0); sh.lineTo(hd, 0); sh.lineTo(hd, edge); sh.lineTo(0, rise); sh.lineTo(-hd, edge); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false });
    geo.translate(0, 0, -T / 2);
    const e = new THREE.Mesh(geo, M.parede);
    e.position.set(s * (x2 - x1) / 2, -rise, 0);
    e.rotation.y = Math.PI / 2;
    e.castShadow = true; e.receiveShadow = true; e.name = 'empena';
    g.add(e);
  }
  casa.add(g);
  telhado = g;
}

// ---------- etiquetas ----------
const labelsEl = document.getElementById('labels');
const labels = [];
function addLabel(r) {
  const el = document.createElement('div');
  el.className = 'lbl';
  el.innerHTML = \`<b>\${r.nome}</b><i>\${r.area.toFixed(1).replace('.', ',')} m²</i>\`;
  labelsEl.appendChild(el);
  labels.push({ el, r });
}
for (const r of PLAN) addLabel(r);

// ---------- estado ----------
let floors = startFloors;       // 1 = térrea, 2 = sobrado, 3 = três pavimentos
let floorView = 'all';
let roofOn = true, labelsOn = false, topView = false;
let current = null, camTween = null;
let editing = false, planEdit = false;
let selected = null, dragPiece = null, dragRoom = null, snapWalls = true;

const $ = id => document.getElementById(id);
labelsEl.style.display = 'none';
$('btnLabels').classList.remove('on');
const setPill = (id, on) => $(id) && $(id).classList.toggle('on', on);
const flyTo = (pos, target) => { camTween = { fp: camera.position.clone(), tp: pos.clone(), ft: controls.target.clone(), tt: target.clone(), t: 0 }; };

// altura necessária para o lote inteiro caber no frame, em vista de topo
function topHeight() {
  const fov = camera.fov * Math.PI / 180;
  const aspect = Math.max(0.2, camera.aspect || 1);
  const byD = (LOT.d / 2) / Math.tan(fov / 2);
  const byW = (LOT.w / 2) / Math.tan(fov / 2) / aspect;
  return Math.max(byD, byW) * 1.1;
}
function topTarget() {
  const f = floorView === 'all' ? 0 : floorView;
  return new THREE.Vector3(0, floorY(f), 0);
}
function flyTop() {
  const f = floorView === 'all' ? 0 : floorView;
  flyTo(new THREE.Vector3(0, floorY(f) + topHeight(), 0.02), topTarget());
}

function activeRooms() { return PLAN.filter(r => r.visible !== false); }

function applyStructure() {
  for (const r of PLAN) {
    r.visible = r.ext ? true : r.f < floors;
    r.g.visible = r.visible;
  }
  if (current && !current.visible) exitRoom();
  for (const r of built()) if (r.stair) r.stair.visible = r.f + 1 < floors;
  for (const r of built()) if (r.visible) buildWalls(r);
  makeRoof(floors - 1);
  renderFloorSeg();
  applyView();
}

function applyView() {
  const dentro = current && !current.ext;
  for (const r of PLAN) {
    const onView = floorView === 'all' || r.f === floorView || r.ext;
    r.g.visible = r.visible !== false && onView;
  }
  const showRoof = roofOn && floorView === 'all' && !dentro;
  if (telhado) telhado.visible = showRoof;
  for (const r of PLAN) {
    if (!r.mob) continue;
    r.mob.visible = !current || r === current;
  }
}

function renderFloorSeg() {
  const el = $('segFloors');
  el.innerHTML = '';
  const opts = [];
  for (let i = 0; i < floors; i++) opts.push([i, ['Térreo', '2º', '3º'][i]]);
  if (floors > 1) opts.push(['all', 'Todos']);
  for (const [v, label] of opts) {
    const b = document.createElement('button');
    b.textContent = label;
    if (v === floorView) b.className = 'on';
    b.onclick = () => {
      floorView = v;
      if (current && v !== 'all' && current.f !== v && !current.ext) exitRoom();
      renderFloorSeg(); applyView();
      if (topView) flyTop();
    };
    el.appendChild(b);
  }
  if (floorView !== 'all' && floorView >= floors) floorView = 'all';
}

// ---------- controles ----------
$('btnRoof').onclick = () => { roofOn = !roofOn; setPill('btnRoof', roofOn); applyView(); };
$('btnLabels').onclick = () => {
  labelsOn = !labelsOn;
  labelsEl.style.display = labelsOn ? '' : 'none';
  setPill('btnLabels', labelsOn);
};
$('btnTop').onclick = () => {
  topView = !topView;
  setPill('btnTop', topView);
  if (topView) {
    if (roofOn) $('btnRoof').click();
    if (!labelsOn) $('btnLabels').click();
    flyTop();
  } else flyTo(HOME, HOME_T);
};

// painel do projeto
$('btnProj').onclick = () => $('projpanel').classList.toggle('open');
$('projclose').onclick = () => $('projpanel').classList.remove('open');
for (const [n, id] of [[1, 'btnE1'], [2, 'btnE2'], [3, 'btnE3']]) {
  $(id).onclick = () => {
    floors = n;
    for (const b of ['btnE1', 'btnE2', 'btnE3']) $(b).classList.remove('on');
    $(id).classList.add('on');
    if (floorView !== 'all' && floorView >= floors) floorView = 'all';
    applyStructure();
    $('meta').textContent = metaText();
    savePlan();
    if (topView) flyTop();
    toast(['Casa térrea', 'Sobrado', '3 pavimentos'][n - 1]);
  };
}
$('btnPlan').onclick = () => setPlanEdit(!planEdit);
$('pclose').onclick = () => setPlanEdit(false);

function setPlanEdit(on) {
  planEdit = on;
  if (on) {
    setEditing(false);
    if (current) exitRoom();
    if (floorView === 'all') floorView = 0;
    if (!topView) $('btnTop').click();
    if (!labelsOn) $('btnLabels').click();
    renderFloorSeg(); applyView();
    $('projpanel').classList.remove('open');
  }
  if (!on) { floorView = 'all'; renderFloorSeg(); applyView(); }
  $('btnPlan').classList.toggle('on', on);
  $('planbar').classList.toggle('show', on);
  $('tip').style.display = on || current ? 'none' : '';
  selectRoom(null);
}

// ---------- cômodo ----------
function enterRoom(r) {
  current = r;
  if (!r.ext) floorView = r.f;
  if (!labelsOn) $('btnLabels').click();
  topView = false; setPill('btnTop', false);
  renderFloorSeg(); applyView();
  for (const l of labels) l.el.dataset.hide = l.r === r ? '' : '1';
  frameRoom(r);
  $('roomcard').classList.add('show');
  $('rcname').textContent = r.nome;
  $('tip').style.display = 'none';
  updateRoomMeta();
}
function frameRoom(r) {
  const dist = Math.max(r.w, r.d) * 1.15 + (editing ? 4.6 : 3.6);
  flyTo(new THREE.Vector3(r.cx + dist * 0.55, floorY(r.f) + dist * 0.78, r.cz + dist * 0.82),
        new THREE.Vector3(r.cx, floorY(r.f) + (editing ? -1.6 : 1.0), r.cz));
}
function exitRoom() {
  setEditing(false);
  current = null;
  floorView = 'all';
  renderFloorSeg(); applyView();
  for (const l of labels) l.el.dataset.hide = '';
  $('roomcard').classList.remove('show');
  if (!planEdit) $('tip').style.display = '';
  flyTo(HOME, HOME_T);
}
$('rcback').onclick = exitRoom;

function updateRoomMeta() {
  if (!current) return;
  const n = current.mob.children.length;
  $('rcdim').textContent =
    current.w.toFixed(2).replace('.', ',') + ' × ' + current.d.toFixed(2).replace('.', ',') + ' m · ' +
    current.area.toFixed(1).replace('.', ',') + ' m² · ' + n + (n === 1 ? ' peça' : ' peças');
}

// ---------- edição de peças ----------
function setEditing(on) {
  editing = on;
  $('sheet').classList.toggle('open', on);
  $('btnEdit').textContent = on ? 'Concluir' : 'Editar';
  $('btnEdit').classList.toggle('done', on);
  $('roomcard').classList.toggle('slim', on);
  if (!on) select(null);
  if (current) frameRoom(current);
}
$('btnEdit').onclick = () => setEditing(!editing);
$('sclose').onclick = () => setEditing(false);

// destaque do cômodo: preenchimento translúcido + 4 barras de borda (linhas de
// 1px desaparecem no mobile, então a borda é geometria de verdade)
const HL_MAT = new THREE.MeshBasicMaterial({ color: 0xC85A32, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
const roomOutline = new THREE.Group();
roomOutline.visible = false;
roomOutline.renderOrder = 6;
for (let i = 0; i < 4; i++) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 1), HL_MAT);
  b.castShadow = false; b.receiveShadow = false; b.renderOrder = 6;
  b.name = 'borda' + i;
  roomOutline.add(b);
}
scene.add(roomOutline);
const roomFill = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0xC85A32, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthTest: false, depthWrite: false })
);
roomFill.visible = false;
roomFill.renderOrder = 5;
scene.add(roomFill);
function outlineRoom(r) {
  if (!r) { roomOutline.visible = false; roomFill.visible = false; return; }
  const y = floorY(r.f) + 0.07;

  roomFill.geometry.dispose();
  roomFill.geometry = new THREE.PlaneGeometry(r.w, r.d);
  roomFill.position.set(r.cx, y, r.cz);
  roomFill.rotation.set(-Math.PI / 2, 0, -r.rot);
  roomFill.visible = true;

  const B = 0.08, hw = r.w / 2 + B / 2, hd = r.d / 2 + B / 2;
  const specs = [
    [r.w + B * 2, B, 0, -hd], [r.w + B * 2, B, 0, hd],
    [B, r.d, -hw, 0], [B, r.d, hw, 0],
  ];
  roomOutline.position.set(r.cx, y, r.cz);
  roomOutline.rotation.y = r.rot;
  roomOutline.children.forEach((b, i) => {
    const [w, d, x, z] = specs[i];
    b.geometry.dispose();
    b.geometry = new THREE.BoxGeometry(w, 0.02, d);
    b.position.set(x, 0, z);
  });
  roomOutline.visible = true;
}

const selRing = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.15, 48),
  new THREE.MeshBasicMaterial({ color: 0xC85A32, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
selRing.rotation.x = -Math.PI / 2; selRing.visible = false; selRing.renderOrder = 3;
scene.add(selRing);

function ringTo(g) {
  if (!g) { selRing.visible = false; return; }
  const r = g.userData.room;
  const p = worldOf(r, g.position.x, g.position.z);
  const rr = Math.max(g.userData.w, g.userData.d) / 2 + 0.12;
  selRing.geometry.dispose();
  selRing.geometry = new THREE.RingGeometry(rr, rr + 0.05, 64);
  selRing.position.set(p.x, floorY(r.f) + 0.02, p.z);
  selRing.visible = true;
}
function select(g) {
  selected = g;
  $('selbar').classList.toggle('show', !!g);
  ringTo(g);
  if (g) $('selname').textContent = pieceLabel(g.userData.kind);
}

const CATALOG = [
  { id: 'sofa3', cat: 'Sala', label: 'Sofá 3 lugares', dim: '2,15 × 0,92 m' },
  { id: 'poltrona', cat: 'Sala', label: 'Poltrona', dim: '0,86 × 0,88 m' },
  { id: 'mesaCentro', cat: 'Sala', label: 'Mesa de centro', dim: '1,10 × 0,60 m' },
  { id: 'tapete', cat: 'Sala', label: 'Tapete', dim: '2,40 × 1,70 m' },
  { id: 'rackTV', cat: 'Sala', label: 'Rack + TV', dim: '1,80 × 0,42 m' },
  { id: 'planta', cat: 'Sala', label: 'Vaso com planta', dim: '0,50 m' },
  { id: 'camaQueen', cat: 'Quarto', label: 'Cama queen', dim: '1,62 × 2,05 m' },
  { id: 'criadoMudo', cat: 'Quarto', label: 'Criado-mudo', dim: '0,46 × 0,40 m' },
  { id: 'guardaRoupa', cat: 'Quarto', label: 'Guarda-roupa', dim: '1,80 × 0,60 m' },
  { id: 'bancadaIlha', cat: 'Cozinha', label: 'Ilha com cuba', dim: '1,90 × 0,75 m' },
  { id: 'armarioCozinha', cat: 'Cozinha', label: 'Balcão + aéreo', dim: '2,20 × 0,62 m' },
  { id: 'geladeira', cat: 'Cozinha', label: 'Geladeira', dim: '0,75 × 0,72 m' },
  { id: 'mesaJantar', cat: 'Cozinha', label: 'Mesa 4 lugares', dim: '1,70 × 0,95 m' },
  { id: 'bancadaDivisoria', cat: 'Cozinha', label: 'Bancada divisória', dim: '2,60 × 0,42 m' },
  { id: 'pia', cat: 'Banho', label: 'Pia com espelho', dim: '0,90 × 0,50 m' },
  { id: 'vasoSanitario', cat: 'Banho', label: 'Vaso sanitário', dim: '0,40 × 0,68 m' },
  { id: 'chuveiro', cat: 'Banho', label: 'Box de vidro', dim: '0,95 × 0,95 m' },
  { id: 'banheira', cat: 'Banho', label: 'Banheira', dim: '0,85 × 1,75 m' },
  { id: 'piscina', cat: 'Externo', label: 'Piscina', dim: '6,40 × 3,40 m' },
  { id: 'jacuzzi', cat: 'Externo', label: 'Jacuzzi', dim: '2,30 m' },
  { id: 'churrasqueira', cat: 'Externo', label: 'Churrasqueira', dim: '2,60 × 0,85 m' },
  { id: 'pergolado', cat: 'Externo', label: 'Pergolado (cobertura)', dim: '3,60 × 3,00 m' },
  { id: 'rede', cat: 'Externo', label: 'Rede de descanso', dim: '2,90 × 0,95 m' },
  { id: 'espreguicadeira', cat: 'Externo', label: 'Espreguiçadeira', dim: '0,72 × 1,95 m' },
  { id: 'mesaExterna', cat: 'Externo', label: 'Mesa c/ guarda-sol', dim: '2,40 m' },
  { id: 'sofaExterno', cat: 'Externo', label: 'Sofá de área', dim: '2,00 × 0,95 m' },
  { id: 'deckMadeira', cat: 'Externo', label: 'Deck de madeira', dim: '4,00 × 3,00 m' },
  { id: 'fogueira', cat: 'Externo', label: 'Fogueira', dim: '1,20 m' },
  { id: 'arvore', cat: 'Externo', label: 'Árvore', dim: '2,20 m' },
  { id: 'carro', cat: 'Externo', label: 'Carro', dim: '1,85 × 4,50 m' },
  { id: 'lareira', cat: 'Mansão', label: 'Lareira', dim: '1,90 × 0,50 m' },
  { id: 'pianoCauda', cat: 'Mansão', label: 'Piano de cauda', dim: '1,50 × 2,00 m' },
  { id: 'mesaJantar8', cat: 'Mansão', label: 'Mesa 8 lugares', dim: '2,90 × 1,15 m' },
  { id: 'estante', cat: 'Mansão', label: 'Estante de livros', dim: '1,90 × 0,36 m' },
  { id: 'escrivaninha', cat: 'Mansão', label: 'Escrivaninha', dim: '1,50 × 0,72 m' },
  { id: 'lustre', cat: 'Mansão', label: 'Lustre', dim: '0,90 m' },
];
const pieceLabel = k => (CATALOG.find(c => c.id === k) || { label: k }).label;

let activeCat = 'Sala';
function renderCats() {
  const el = $('cats'); el.innerHTML = '';
  for (const c of ['Sala', 'Quarto', 'Cozinha', 'Banho', 'Externo', 'Mansão']) {
    const b = document.createElement('button');
    b.textContent = c;
    if (c === activeCat) b.className = 'on';
    b.onclick = () => { activeCat = c; renderCats(); renderItems(); };
    el.appendChild(b);
  }
}
function renderItems() {
  const el = $('grid'); el.innerHTML = '';
  for (const e of CATALOG.filter(i => i.cat === activeCat)) {
    const b = document.createElement('button');
    b.innerHTML = \`<b>\${e.label}</b><i>\${e.dim}</i>\`;
    b.onclick = () => {
      if (!current) return;
      const spot = freeSpot(current, e.id);
      const g = addPiece(current, e.id, spot.x, spot.z, 0);
      select(g); updateRoomMeta(); savePlan();
      toast(e.label + ' adicionado');
    };
    el.appendChild(b);
  }
}
renderCats(); renderItems();

function freeSpot(r, kind) {
  const probe = PIECES[kind]();
  const w = probe.w, d = probe.d;
  const others = r.mob.children;
  let best = null;
  for (let x = -r.w / 2 + w / 2 + 0.2; x <= r.w / 2 - w / 2 - 0.2; x += 0.25) {
    for (let z = -r.d / 2 + d / 2 + 0.2; z <= r.d / 2 - d / 2 - 0.2; z += 0.25) {
      let score = Math.hypot(x, z) * 0.12;
      for (const p of others) {
        const dx = Math.abs(p.position.x - x) - (p.userData.w + w) / 2;
        const dz = Math.abs(p.position.z - z) - (p.userData.d + d) / 2;
        score += (dx < 0.2 && dz < 0.2) ? 10 : 1 / (1 + Math.hypot(dx, dz));
      }
      if (!best || score < best.score) best = { x, z, score };
    }
  }
  return best || { x: 0, z: 0 };
}

let toastT;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1500);
}

$('rotL').onclick = () => { if (selected) { selected.rotation.y -= Math.PI / 4; } };
$('rotR').onclick = () => { if (selected) { selected.rotation.y += Math.PI / 4; } };
$('dup').onclick = () => {
  if (!selected || !current) return;
  const s = selected;
  const g = addPiece(current, s.userData.kind, s.position.x + 0.4, s.position.z + 0.4, s.rotation.y);
  select(g); updateRoomMeta();
};
$('del').onclick = () => {
  if (!selected) return;
  selected.userData.room.mob.remove(selected);
  select(null); updateRoomMeta(); savePlan(); toast('Peça removida');
};

// ---------- edição da planta ----------
function selectRoom(r) {
  window.selRoom = r;
  $('pname').textContent = r ? r.nome : 'Toque num cômodo';
  $('pinfo').textContent = r
    ? (r.ext ? 'Área externa' : (['Térreo', '2º pavimento', '3º pavimento'][r.f])) + ' · ' +
      r.area.toFixed(1).replace('.', ',') + ' m²'
    : 'Arraste para mover no lote';
  $('protate').disabled = !r;
  $('pb2').classList.toggle('on', !!r);
  $('pb3').classList.toggle('on', !!r);
  if (r) {
    $('pwv').textContent = r.w.toFixed(2).replace('.', ',') + ' m';
    $('pdv').textContent = r.d.toFixed(2).replace('.', ',') + ' m';
  }
  selRing.visible = false;
  outlineRoom(r);
}
$('protate').onclick = () => {
  const r = window.selRoom;
  if (!r) return;
  r.rot = (r.rot + Math.PI / 2) % (Math.PI * 2);
  r.g.rotation.y = r.rot;
  refreshFloor(r);
  outlineRoom(r);
  savePlan();
  toast('Cômodo girado 90°');
};
function refreshFloor(r) {
  for (const o of built()) if (o.f === r.f && o.visible !== false) buildWalls(o);
  if (r.f === floors - 1 || !r.ext) makeRoof(floors - 1);
  applyView();
}

// ---------- criar, excluir e redimensionar cômodos ----------
const ROOM_TYPES = [
  { nome: 'Quarto', w: 3.6, d: 3.4, piso: 'madeira' },
  { nome: 'Suíte', w: 4.4, d: 3.5, piso: 'madeira' },
  { nome: 'Sala de estar', w: 5.4, d: 3.6, piso: 'madeira' },
  { nome: 'Cozinha', w: 4.2, d: 3.2, piso: 'frio' },
  { nome: 'Banheiro', w: 2.4, d: 2.2, piso: 'frio' },
  { nome: 'Lavabo', w: 1.6, d: 1.8, piso: 'frio' },
  { nome: 'Circulação', w: 8.0, d: 1.4, piso: 'frio', tipo: 'circ' },
  { nome: 'Escritório', w: 3.2, d: 3.0, piso: 'madeira' },
  { nome: 'Closet', w: 2.6, d: 2.4, piso: 'madeira' },
  { nome: 'Lavanderia', w: 2.6, d: 2.2, piso: 'frio' },
  { nome: 'Sacada', w: 4.0, d: 2.2, piso: 'deck', tipo: 'sacada' },
  { nome: 'Área externa', w: 6.0, d: 4.0, piso: 'pedra', ext: 1 },
];

function freeRect(f, w, d) {
  const step = 0.5;
  let best = null;
  for (let x = -LOT.w / 2 + w / 2; x <= LOT.w / 2 - w / 2; x += step) {
    for (let z = -LOT.d / 2 + d / 2; z <= LOT.d / 2 - d / 2; z += step) {
      let hit = 0;
      for (const o of PLAN) {
        if (o.visible === false || o.f !== f) continue;
        const ow = (o.rot ? o.d : o.w), od = (o.rot ? o.w : o.d);
        if (Math.abs(o.cx - x) < (ow + w) / 2 - 0.05 && Math.abs(o.cz - z) < (od + d) / 2 - 0.05) hit++;
      }
      const score = hit * 100 + Math.hypot(x, z);
      if (!best || score < best.score) best = { x, z, score };
    }
  }
  return best || { x: 0, z: 0 };
}

function addRoom(t) {
  const f = floorView === 'all' ? 0 : floorView;
  const spot = freeRect(t.ext ? 0 : f, t.w, t.d);
  const base = t.nome.toLowerCase().replace(/[^a-z]+/g, '_');
  let n = 1;
  while (PLAN.some(r => r.id === base + '_' + n)) n++;
  const r = {
    id: base + '_' + n,
    nome: PLAN.some(o => o.nome === t.nome) ? t.nome + ' ' + n : t.nome,
    f: t.ext ? 0 : f,
    ext: t.ext ? 1 : 0,
    tipo: t.tipo || null,
    w: t.w, d: t.d, cx: spot.x, cz: spot.z, rot: 0,
    piso: t.piso, items: [],
  };
  r.area = r.w * r.d;
  PLAN.push(r);
  mountRoom(r);
  addLabel(r);
  refreshFloor(r);
  selectRoom(r);
  $('meta').textContent = metaText();
  savePlan();
  toast(r.nome + ' adicionado');
}

function deleteRoom(r) {
  if (!r) return;
  const i = PLAN.indexOf(r);
  if (i < 0) return;
  PLAN.splice(i, 1);
  const si = floorHit.indexOf(r.slab);
  if (si >= 0) floorHit.splice(si, 1);
  for (let k = wallPanels.length - 1; k >= 0; k--) if (wallPanels[k].room === r) wallPanels.splice(k, 1);
  r.g.traverse(n => { if (n.geometry) n.geometry.dispose(); });
  casa.remove(r.g);
  const li = labels.findIndex(l => l.r === r);
  if (li >= 0) { labels[li].el.remove(); labels.splice(li, 1); }
  selectRoom(null);
  const f = r.f;
  for (const o of built()) if (o.f === f && o.visible !== false) buildWalls(o);
  makeRoof(floors - 1);
  applyView();
  $('meta').textContent = metaText();
  savePlan();
  toast('Cômodo excluído');
}

function resizeRoom(r, dw, dd) {
  if (!r) return;
  const w = Math.max(1.2, Math.min(LOT.w - 1, +(r.w + dw).toFixed(2)));
  const d = Math.max(1.2, Math.min(LOT.d - 1, +(r.d + dd).toFixed(2)));
  r.w = w; r.d = d; r.area = w * d;
  makeSlab(r);
  // manter as peças dentro dos novos limites
  for (const g of r.mob.children) {
    const ew = g.userData.w / 2, ed = g.userData.d / 2;
    g.position.x = Math.max(-w / 2 + ew, Math.min(w / 2 - ew, g.position.x));
    g.position.z = Math.max(-d / 2 + ed, Math.min(d / 2 - ed, g.position.z));
  }
  const l = labels.find(x => x.r === r);
  if (l) l.el.innerHTML = '<b>' + r.nome + '</b><i>' + r.area.toFixed(1).replace('.', ',') + ' m²</i>';
  refreshFloor(r);
  selectRoom(r);
  $('meta').textContent = metaText();
  savePlan();
}

function renderRoomTypes() {
  const el = $('rsgrid');
  el.innerHTML = '';
  for (const t of ROOM_TYPES) {
    const b = document.createElement('button');
    b.innerHTML = '<b>' + t.nome + '</b><i>' + t.w.toFixed(1).replace('.', ',') + ' × ' +
      t.d.toFixed(1).replace('.', ',') + ' m' + (t.ext ? ' · externa' : '') + '</i>';
    b.onclick = () => { addRoom(t); $('roomsheet').classList.remove('open'); };
    el.appendChild(b);
  }
}
renderRoomTypes();
$('padd').onclick = () => $('roomsheet').classList.toggle('open');
$('rsclose').onclick = () => $('roomsheet').classList.remove('open');
$('pdel').onclick = () => deleteRoom(window.selRoom);
$('pwm').onclick = () => resizeRoom(window.selRoom, -0.25, 0);
$('pwp').onclick = () => resizeRoom(window.selRoom, 0.25, 0);
$('pdm').onclick = () => resizeRoom(window.selRoom, 0, -0.25);
$('pdp').onclick = () => resizeRoom(window.selRoom, 0, 0.25);

// ---------- ponteiro ----------
const rayc = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitPt = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), grab = new THREE.Vector3();
let downAt = null;

function toNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  rayc.setFromCamera(ndc, camera);
}
function pickRoom() {
  const vis = floorHit.filter(p => p.parent.visible);
  const hit = rayc.intersectObjects(vis, false)[0];
  return hit ? hit.object.userData.room : null;
}

canvas.addEventListener('pointerdown', e => {
  downAt = { x: e.clientX, y: e.clientY };
  toNdc(e);

  if (planEdit) {
    const r = pickRoom();
    selectRoom(r);
    if (!r) return;
    dragRoom = r;
    controls.enabled = false;
    plane.constant = -floorY(r.f);
    rayc.ray.intersectPlane(plane, hitPt);
    grab.set(r.cx - hitPt.x, 0, r.cz - hitPt.z);
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  if (!editing || !current) return;
  const list = current.mob.children;
  const inter = rayc.intersectObjects(list, true);
  if (!inter.length) { select(null); return; }
  let o = inter[0].object;
  while (o.parent && list.indexOf(o) === -1) o = o.parent;
  if (list.indexOf(o) === -1) return;
  select(o);
  dragPiece = o;
  controls.enabled = false;
  plane.constant = -(floorY(current.f) + 0.05);
  rayc.ray.intersectPlane(plane, hitPt);
  const wp = worldOf(current, o.position.x, o.position.z);
  grab.set(wp.x - hitPt.x, 0, wp.z - hitPt.z);
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
  if (!dragRoom && !dragPiece) return;
  toNdc(e);
  if (!rayc.ray.intersectPlane(plane, hitPt)) return;

  if (dragRoom) {
    const r = dragRoom;
    const hw = (r.rot ? r.d : r.w) / 2, hd = (r.rot ? r.w : r.d) / 2;
    let x = Math.round((hitPt.x + grab.x) * 4) / 4;
    let z = Math.round((hitPt.z + grab.z) * 4) / 4;
    x = Math.max(-LOT.w / 2 + hw, Math.min(LOT.w / 2 - hw, x));
    z = Math.max(-LOT.d / 2 + hd, Math.min(LOT.d / 2 - hd, z));
    r.cx = x; r.cz = z;
    r.g.position.set(x, floorY(r.f), z);
    outlineRoom(r);
    return;
  }

  const r = current;
  const p = localOf(r, hitPt.x + grab.x, hitPt.z + grab.z);
  const rot = Math.abs(Math.round(dragPiece.rotation.y / (Math.PI / 2))) % 2 === 1;
  const ew = (rot ? dragPiece.userData.d : dragPiece.userData.w) / 2;
  const ed = (rot ? dragPiece.userData.w : dragPiece.userData.d) / 2;
  const minX = -r.w / 2 + ew, maxX = r.w / 2 - ew, minZ = -r.d / 2 + ed, maxZ = r.d / 2 - ed;
  let x = Math.max(minX, Math.min(maxX, p.x));
  let z = Math.max(minZ, Math.min(maxZ, p.z));
  if (snapWalls) {
    const t = 0.45;
    if (x - minX < t) { x = minX + 0.02; dragPiece.rotation.y = Math.PI / 2; }
    else if (maxX - x < t) { x = maxX - 0.02; dragPiece.rotation.y = -Math.PI / 2; }
    else if (z - minZ < t) { z = minZ + 0.02; dragPiece.rotation.y = 0; }
    else if (maxZ - z < t) { z = maxZ - 0.02; dragPiece.rotation.y = Math.PI; }
  }
  dragPiece.position.set(Math.round(x * 20) / 20, dragPiece.position.y, Math.round(z * 20) / 20);
  ringTo(dragPiece);
});

function endDrag(e) {
  const wasRoom = dragRoom;
  if (!dragRoom && !dragPiece) return;
  dragRoom = null; dragPiece = null;
  controls.enabled = true;
  if (e && e.pointerId != null && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (wasRoom) { refreshFloor(wasRoom); savePlan(); }
}
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerup', e => {
  const moved = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6;
  const wasDrag = !!(dragRoom || dragPiece);
  endDrag(e);
  if (moved || wasDrag || editing || planEdit) return;
  toNdc(e);
  const r = pickRoom();
  if (r) enterRoom(r);
});

// ---------- loop ----------
const v = new THREE.Vector3(), wc = new THREE.Vector3(), wn = new THREE.Vector3();
function tick() {
  requestAnimationFrame(tick);
  syncSize();
  if (camTween) {
    camTween.t = Math.min(1, camTween.t + 0.04);
    const k = 1 - Math.pow(1 - camTween.t, 3);
    camera.position.lerpVectors(camTween.fp, camTween.tp, k);
    controls.target.lerpVectors(camTween.ft, camTween.tt, k);
    if (camTween.t >= 1) camTween = null;
  }
  const dentro = current && !current.ext;
  const fechada = roofOn && floorView === 'all' && !dentro && !planEdit;
  const refX = dentro ? current.cx : 0, refZ = dentro ? current.cz : 0;
  for (const p of wallPanels) {
    if (fechada) { p.node.visible = true; continue; }
    const w = worldOf(p.room, p.lx, p.lz);
    const c = Math.cos(p.room.rot), s = Math.sin(p.room.rot);
    const nx = p.nx * c + p.nz * s, nz = -p.nx * s + p.nz * c;
    const toRef = (refX - w.x) * nx + (refZ - w.z) * nz;
    if (Math.abs(toRef) < 0.08) { p.node.visible = true; continue; }
    const toCam = (camera.position.x - w.x) * nx + (camera.position.z - w.z) * nz;
    p.node.visible = !(toRef * toCam < 0);
  }
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  for (const l of labels) {
    const r = l.r;
    const onView = r.visible !== false && (floorView === 'all' || r.f === floorView || r.ext);
    v.set(r.cx, floorY(r.f) + 0.9, r.cz).project(camera);
    const vis = labelsOn && onView && v.z < 1 && !l.el.dataset.hide;
    l.el.style.display = vis ? '' : 'none';
    if (vis) l.el.style.transform =
      \`translate(-50%,-50%) translate(\${(v.x * 0.5 + 0.5) * cw}px,\${(-v.y * 0.5 + 0.5) * ch}px)\`;
  }
  controls.update();
  renderer.render(scene, camera);
}

let saveT;
function savePlan() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const plan = PLAN.map(r => ({
      id: r.id, nome: r.nome, f: r.f, ext: r.ext ? 1 : 0, tipo: r.tipo || null,
      w: r.w, d: r.d, cx: r.cx, cz: r.cz, rot: +(r.rot || 0).toFixed(3), piso: r.piso,
      items: r.mob.children.map(g => [
        g.userData.kind,
        Math.round(g.position.x * 100) / 100,
        Math.round(g.position.z * 100) / 100,
        Math.round(g.rotation.y * 1000) / 1000,
      ]),
    }));
    const msg = JSON.stringify({ type: 'save_plan', floors, plan });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    else if (window.parent !== window) window.parent.postMessage(msg, '*');
  }, 250);
}

function metaText() {
  const c = built().filter(r => r.f < floors);
  const nome = ['Casa térrea', 'Sobrado', '3 pavimentos'][floors - 1];
  return nome + ' · ' + c.reduce((s, r) => s + r.area, 0).toFixed(0) + ' m² · ' + c.length + ' cômodos';
}

applyStructure();
$('meta').textContent = metaText();
selectRoom(null);
resize();
tick();

`;
