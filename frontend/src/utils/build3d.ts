// Generates a self-contained HTML document that renders a Three.js 3D "maquette"
// of the user's project. Rooms get materials based on the room name:
// piscina → water, churrasqueira → brick, área gourmet → wood, jardim → grass,
// garagem → asphalt, etc. Runs inside a WebView.
//
// Rooms can belong to different floors (r.floor: 0 = térreo, 1 = 1º andar, ...),
// so multi-story houses (sobrados) stack floors vertically instead of piling
// every room onto a single ground plane, and the person can isolate one floor
// at a time with the floor switcher in the HUD.

import type { Project, Room } from "@/src/types";

type Material = { color: string; roughness?: number; metalness?: number; opacity?: number };

function styleFor(name: string): { floor: Material; wall: Material; kind: string; label: string } {
  const n = name.toLowerCase();
  if (n.includes("piscina")) return { floor: { color: "#2b7ea1" }, wall: { color: "#94b8c2", opacity: 0.15 }, kind: "pool", label: name };
  if ((n.includes("churrasq") || n.includes("gourmet")) && n.includes("externa")) return { floor: { color: "#c9b48a", roughness: 0.85 }, wall: { color: "#c9b48a", opacity: 0.1 }, kind: "outdoor", label: name };
  if (n.includes("churrasq")) return { floor: { color: "#7a3d2a", roughness: 0.9 }, wall: { color: "#c85a32" }, kind: "grill", label: name };
  if (n.includes("gourmet")) return { floor: { color: "#c8a76a", roughness: 0.8 }, wall: { color: "#d8b47c" }, kind: "wood", label: name };
  if (n.includes("varand") || n.includes("sacada") || n.includes("terra")) return { floor: { color: "#b39471" }, wall: { color: "#b39471", opacity: 0.3 }, kind: "deck", label: name };
  if (n.includes("jardim") || n.includes("quintal")) return { floor: { color: "#6ba368", roughness: 1 }, wall: { color: "#6ba368", opacity: 0.05 }, kind: "grass", label: name };
  if (n.includes("garag")) return { floor: { color: "#4a4a4a", roughness: 1 }, wall: { color: "#8a8a8a", opacity: 0.4 }, kind: "asphalt", label: name };
  if (n.includes("banh") || n.includes("lavab")) return { floor: { color: "#e5eef3" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "wet", label: name };
  if (n.includes("conceito") || n.includes("integr")) return { floor: { color: "#e6d7b8" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "openconcept", label: name };
  if (n.includes("cozin")) return { floor: { color: "#efe6d7" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "kitchen", label: name };
  if (n.includes("suíte") || n.includes("suite")) return { floor: { color: "#efdcd0" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "bedroom", label: name };
  if (n.includes("quarto")) return { floor: { color: "#e8dcc9" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "bedroom", label: name };
  if (n.includes("sala") || n.includes("aberto")) return { floor: { color: "#e6d7b8" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "living", label: name };
  if (n.includes("corredor") || n.includes("hall") || n.includes("escada")) return { floor: { color: "#d8ccb6" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "hall", label: name };
  if (n.includes("closet")) return { floor: { color: "#e0cdb3" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "closet", label: name };
  return { floor: { color: "#efe6d7" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "room", label: name };
}

function serializeRooms(rooms: Room[]) {
  return rooms.map((r, i) => ({
    id: i,
    name: r.name,
    x: r.x ?? 0,
    y: r.y ?? 0,
    w: r.width,
    l: r.length,
    floor: r.floor || 0,
    style: styleFor(r.name),
  }));
}

export function build3DHtml(project: Project): string {
  const data = {
    name: project.name,
    build_type: project.build_type,
    width: project.width,
    length: project.length,
    rooms: serializeRooms(project.rooms),
  };
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{ --brand:#C85A32; --brand-dark:#A9451C; --ink:#1A1A1A; --glass:rgba(248,247,244,0.88); }
  html,body{margin:0;padding:0;overflow:hidden;background:#BFE0EA;color:var(--ink);font-family:'Inter',-apple-system,sans-serif;height:100%;}
  #app{width:100vw;height:100vh;display:block;touch-action:none;}
  #labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
  .lbl{position:absolute;transform:translate(-50%,-100%);background:rgba(26,26,26,.82);backdrop-filter:blur(4px);color:#fff;font-weight:600;font-size:12px;padding:4px 9px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18);}
  .lbl small{display:block;font-weight:400;font-size:9.5px;opacity:.75;margin-top:1px;}
  #floorSwitch{position:fixed;top:12px;left:12px;right:12px;display:flex;gap:6px;justify-content:center;}
  #floorSwitch button{font-family:'Inter',sans-serif;font-weight:700;font-size:12px;padding:8px 14px;border:none;border-radius:999px;background:var(--glass);backdrop-filter:blur(8px);color:var(--ink);box-shadow:0 4px 14px rgba(0,0,0,.1);}
  #floorSwitch button.on{background:var(--brand);color:#fff;}
  #hud{position:fixed;left:12px;right:12px;bottom:12px;background:var(--glass);backdrop-filter:blur(10px);border-radius:14px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.1);display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;align-items:center;}
  #hud .kicker{font-family:'Fraunces',serif;font-size:13px;color:var(--brand-dark);font-weight:700;flex-basis:100%;margin-bottom:4px}
  #hud button{background:#FCECE6;color:var(--brand);border:none;font-weight:700;font-size:12px;padding:8px 12px;border-radius:999px;cursor:pointer;flex:1;min-width:64px;}
  #hud button.on{background:var(--brand);color:#fff}
  #hud button.share{background:var(--ink);color:#fff}
  #tip{position:fixed;top:56px;left:12px;right:12px;background:rgba(26,26,26,.7);color:#fff;font-size:11px;padding:7px 12px;border-radius:10px;font-weight:600;text-align:center;pointer-events:none;transition:opacity .6s;}
</style>
</head><body>
<canvas id="app"></canvas>
<div id="labels"></div>
<div id="floorSwitch"></div>
<div id="tip">Arraste para girar · pinça para dar zoom</div>
<div id="hud">
  <div class="kicker">${data.name}</div>
  <button id="btnRotate">▶ Girar</button>
  <button id="btnRoof" class="on">Telhado</button>
  <button id="btnLabels" class="on">Etiquetas</button>
  <button id="btnTop">De cima</button>
  <button id="btnShare" class="share">📤 Compartilhar</button>
</div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
(function(){
  const PROJECT = ${payload};
  const WALL_H = 2.6, WALL_T = 0.12, SLAB_T = 0.15;
  const FLOOR_H = WALL_H + SLAB_T; // vertical distance between one floor's base and the next
  const canvas = document.getElementById('app');

  // Figure out which floors are actually used, and how tall the building is overall.
  const floorSet = {};
  PROJECT.rooms.forEach(function(r){ floorSet[r.floor || 0] = true; });
  const floorKeys = Object.keys(floorSet).map(Number).sort(function(a,b){ return a - b; });
  const topFloor = floorKeys.length ? floorKeys[floorKeys.length - 1] : 0;

  // Roof pitch scales with the TOP floor's own footprint (not the whole lot),
  // and is capped to a sane pitch so a large building doesn't get a giant flat diamond.
  // Only ROOFED (enclosed, walled) rooms belong under the pitched roof — a pool, lawn,
  // open driveway, balcony or an EXTERNAL grill/gourmet area is outdoor by nature and
  // must sit outside the roof's footprint.
  const OUTDOOR_KINDS = ['grass', 'asphalt', 'pool', 'deck', 'outdoor'];
  const topFloorRooms = PROJECT.rooms.filter(function(r){ return (r.floor || 0) === topFloor && OUTDOOR_KINDS.indexOf(r.style.kind) === -1; });
  function bboxOf(rooms){
    if (!rooms.length) return { w: PROJECT.width, l: PROJECT.length };
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    rooms.forEach(function(r){
      minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w);
      minZ = Math.min(minZ, r.y); maxZ = Math.max(maxZ, r.y + r.l);
    });
    return { w: maxX - minX, l: maxZ - minZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
  }
  const roofFootprint = bboxOf(topFloorRooms);
  const roofSpan = Math.max(roofFootprint.w, roofFootprint.l);
  const ROOF_H = Math.max(1.0, Math.min(roofSpan * 0.24, 2.6)); // proportional pitch, capped
  const buildingHeight = topFloor * FLOOR_H + WALL_H + ROOF_H;

  // The camera frames the ACTUAL BUILT FOOTPRINT (every room, every floor) — not the
  // lot size. A person can set a big lot and only build a modest house on it; framing
  // by lot size then makes the house look like a tiny speck in an empty field.
  const wholeFootprint = bboxOf(PROJECT.rooms);
  const focusW = Math.max(wholeFootprint.w || 0, 3);
  const focusL = Math.max(wholeFootprint.l || 0, 3);

  const scene = new THREE.Scene();
  // Sky: a soft vertical gradient (deeper blue up top, paler near the horizon) reads
  // far more like an actual sky than a single flat color.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2; skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, '#8FCBE0');
  skyGrad.addColorStop(0.6, '#CDE9EF');
  skyGrad.addColorStop(1, '#F3F1E6');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 2, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xCDE9EF, 45, 150);

  // Center scene at (0,0) using the LOT dimensions (ground slab always covers the full lot).
  const cx = PROJECT.width / 2, cz = PROJECT.length / 2;
  // Where the built footprint actually sits, in the same centered world coordinates.
  const focusX = wholeFootprint.cx != null ? -cx + wholeFootprint.cx : 0;
  const focusZ = wholeFootprint.cz != null ? -cz + wholeFootprint.cz : 0;

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const diag = Math.hypot(focusW, focusL, buildingHeight);
  const midY = buildingHeight / 2;
  camera.position.set(focusX + diag * 1.05, diag * 0.85 + midY, focusZ + diag * 1.05);
  camera.lookAt(focusX, midY * 0.6, focusZ);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = diag * 0.3;
  controls.maxDistance = diag * 2.5;
  controls.target.set(focusX, midY * 0.6, focusZ);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0xE6DFCF, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(focusX + diag, diag * 1.3, focusZ + diag * 0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // Ground (lawn beyond the building footprint) — a distinct sage green, so it doesn't
  // blend visually into the pale cream walls/background like a near-white tone would.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(PROJECT.width * 2.2, PROJECT.length * 2.2),
    new THREE.MeshStandardMaterial({ color: 0xAEC08C, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // One group PER FLOOR, so we can show/hide floors independently (the floor switcher).
  const floorGroups = {}; // floorNum -> THREE.Group (walls, floor plane, props)
  const labelGroup = new THREE.Group(); // DOM labels driven from here, not Three.js sprites
  const roofGroup = new THREE.Group();
  scene.add(roofGroup);

  function makeLabelEl(text, sub) {
    const el = document.createElement('div');
    el.className = 'lbl';
    el.innerHTML = text + (sub ? '<small>' + sub + '</small>' : '');
    document.getElementById('labels').appendChild(el);
    return el;
  }

  function addWall(px, baseY, pz, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, baseY + h / 2, pz);
    m.castShadow = true;
    m.material.polygonOffset = true;
    m.material.polygonOffsetFactor = 1;
    m.material.polygonOffsetUnits = 1;
    return m;
  }

  function keyOf(v) { return Math.round(v * 100); }
  function pushSeg(map, key, seg) {
    const k = String(key);
    if (!map[k]) map[k] = [];
    map[k].push(seg);
  }

  // Build every physical wall exactly once per floor: merge touching/overlapping
  // segments along each vertical (constant X) / horizontal (constant Z) line so
  // two adjacent rooms share a single wall instead of two stacked, flickering ones.
  function buildLines(map, orientation, baseY, group) {
    Object.keys(map).forEach(function (k) {
      const segs = map[k].slice().sort(function (a, b) {
        const aStart = orientation === 'v' ? a.z1 : a.x1;
        const bStart = orientation === 'v' ? b.z1 : b.x1;
        return aStart - bStart;
      });
      const merged = [];
      segs.forEach(function (seg) {
        const start = orientation === 'v' ? seg.z1 : seg.x1;
        const end = orientation === 'v' ? seg.z2 : seg.x2;
        const last = merged[merged.length - 1];
        if (last && start <= last.end + 0.03) {
          last.end = Math.max(last.end, end);
          if (seg.opacity > last.opacity) { last.color = seg.color; last.opacity = seg.opacity; }
        } else {
          merged.push({ start: start, end: end, color: seg.color, opacity: seg.opacity });
        }
      });
      const coord = parseInt(k, 10) / 100;
      merged.forEach(function (m) {
        const length = orientation === 'v' ? (m.end - m.start) : (m.end - m.start) + WALL_T;
        if (length <= 0.02) return;
        const mid = (m.start + m.end) / 2;
        const mat = new THREE.MeshStandardMaterial({
          color: m.color,
          transparent: m.opacity < 1,
          opacity: m.opacity,
          roughness: 0.8,
        });
        if (orientation === 'v') {
          group.add(addWall(coord, baseY, mid, WALL_T, WALL_H, length, mat));
        } else {
          group.add(addWall(mid, coord, length, WALL_H, WALL_T, mat));
        }
      });
    });
  }

  // Soft contact shadow under the BUILT footprint (not the lot) — a simple
  // radial-gradient blob that visually "grounds" the building.
  (function addContactShadow(){
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(focusW * 1.6, focusL * 1.6), mat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(focusX, -0.015, focusZ);
    scene.add(blob);
  })();

  // A handful of simple trees scattered around the lot, avoiding the built footprint —
  // purely decorative, but empty lawn with zero landscaping reads as flat/unfinished.
  (function addTrees(){
    const footprint = bboxOf(PROJECT.rooms.length ? PROJECT.rooms : []);
    const marginX = PROJECT.width / 2, marginZ = PROJECT.length / 2;
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a30', roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#5f8a52', roughness: 0.85 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: '#6f9a5f', roughness: 0.85 });
    function tree(x, z, scale) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.4, 7), trunkMat);
      trunk.position.y = 0.7; trunk.castShadow = true;
      const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), leafMat);
      c1.position.y = 1.7; c1.castShadow = true;
      const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), leafMat2);
      c2.position.set(0.35, 2.05, 0.15); c2.castShadow = true;
      g.add(trunk, c1, c2);
      g.position.set(x, 0, z);
      g.scale.setScalar(scale);
      return g;
    }
    // Try a handful of lot corners/edges; skip any spot too close to the building.
    const candidates = [
      [-marginX + 1.2, -marginZ + 1.2], [marginX - 1.2, -marginZ + 1.2],
      [-marginX + 1.2, marginZ - 1.2], [marginX - 1.2, marginZ - 1.2],
      [0, -marginZ + 1.0], [0, marginZ - 1.0],
    ];
    candidates.forEach(function(pos, i){
      const wx = pos[0], wz = pos[1];
      // Convert back to lot-space (0..width, 0..length) to test against the footprint.
      const lotX = wx + marginX, lotZ = wz + marginZ;
      const clear = lotX < footprint.cx - footprint.w / 2 - 0.8 || lotX > footprint.cx + footprint.w / 2 + 0.8 ||
                    lotZ < footprint.cz - footprint.l / 2 - 0.8 || lotZ > footprint.cz + footprint.l / 2 + 0.8;
      if (clear && marginX > 2 && marginZ > 2) {
        scene.add(tree(wx, wz, 0.85 + (i % 3) * 0.12));
      }
    });
  })();

  const labelDefs = []; // {el, pos: THREE.Vector3, floor}

  floorKeys.forEach(function(floorNum){
    const baseY = floorNum * FLOOR_H;
    const roomsOnFloor = PROJECT.rooms.filter(function(r){ return (r.floor || 0) === floorNum; });
    const group = new THREE.Group();
    floorGroups[floorNum] = group;
    scene.add(group);

    // Every floor gets its own slab, sized to what's ACTUALLY BUILT on that floor
    // (with a small margin), not the whole lot — a lot is very often bigger than
    // the house sitting on it.
    const floorFootprint = bboxOf(roomsOnFloor);
    const SLAB_MARGIN = 0.35;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(floorFootprint.w + SLAB_MARGIN * 2, SLAB_T, floorFootprint.l + SLAB_MARGIN * 2),
      new THREE.MeshStandardMaterial({ color: 0xC7BFA9, roughness: 1 })
    );
    slab.position.set(floorFootprint.cx != null ? -cx + floorFootprint.cx : 0, baseY - SLAB_T / 2, floorFootprint.cz != null ? -cz + floorFootprint.cz : 0);
    slab.receiveShadow = true;
    group.add(slab);

    const vLines = {}, hLines = {};

    // Which walls are truly EXTERIOR (facing outside, not a shared partition with the
    // room next door) — needed so windows only appear on the building's actual facade.
    const indoorOnFloor = roomsOnFloor.filter(function(r){ return OUTDOOR_KINDS.indexOf(r.style.kind) === -1; });
    const floorBounds = bboxOf(indoorOnFloor);
    const EPS = 0.05;

    roomsOnFloor.forEach(function(r){
      // World coords: house top-left at (-cx, -cz)
      const rx = -cx + r.x + r.w / 2;
      const rz = -cz + r.y + r.l / 2;
      const s = r.style;

      // Floor
      const floorMat = new THREE.MeshStandardMaterial({
        color: s.floor.color,
        roughness: s.floor.roughness == null ? 0.7 : s.floor.roughness,
      });
      if (s.kind === 'pool') {
        const wall = new THREE.MeshStandardMaterial({ color: '#94b8c2', roughness: 0.5 });
        const shell = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.5, r.l), wall);
        shell.position.set(rx, baseY - 0.25, rz);
        group.add(shell);
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(r.w * 0.96, r.l * 0.96),
          new THREE.MeshStandardMaterial({ color: s.floor.color, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.set(rx, baseY + 0.05, rz);
        group.add(water);
      } else {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.l), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(rx, baseY + 0.005, rz);
        floor.receiveShadow = true;
        group.add(floor);
      }

      const skipWalls = ['grass', 'asphalt', 'pool', 'deck', 'outdoor'].indexOf(s.kind) !== -1;
      if (!skipWalls) {
        const opacity = s.wall.opacity == null ? 1 : s.wall.opacity;
        const seg = { color: s.wall.color, opacity: opacity };
        pushSeg(vLines, keyOf(rx - r.w / 2), Object.assign({ z1: rz - r.l / 2, z2: rz + r.l / 2 }, seg));
        pushSeg(vLines, keyOf(rx + r.w / 2), Object.assign({ z1: rz - r.l / 2, z2: rz + r.l / 2 }, seg));
        pushSeg(hLines, keyOf(rz - r.l / 2), Object.assign({ x1: rx - r.w / 2, x2: rx + r.w / 2 }, seg));
        pushSeg(hLines, keyOf(rz + r.l / 2), Object.assign({ x1: rx - r.w / 2, x2: rx + r.w / 2 }, seg));
      }

      if (s.kind === 'grill' || s.kind === 'outdoor') {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(r.w * 0.85, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: '#a94a2a', roughness: 0.9 }));
        bench.position.set(rx, baseY + 0.45, rz - r.l / 2 + 0.3);
        group.add(bench);
      }
      if (s.kind === 'outdoor') {
        // Its own small pergola (posts + a flat cover), independent of the house's main
        // roof — keeps an EXTERNAL grill/gourmet area protected from rain/sun without
        // pretending it's an indoor room with walls.
        const PERGOLA_H = 2.3;
        const postMat = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.85 });
        [
          [rx - r.w / 2 + 0.18, rz - r.l / 2 + 0.18],
          [rx + r.w / 2 - 0.18, rz - r.l / 2 + 0.18],
          [rx - r.w / 2 + 0.18, rz + r.l / 2 - 0.18],
          [rx + r.w / 2 - 0.18, rz + r.l / 2 - 0.18],
        ].forEach(function(c){
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, PERGOLA_H, 8), postMat);
          post.position.set(c[0], baseY + PERGOLA_H / 2, c[1]);
          post.castShadow = true;
          group.add(post);
        });
        const pergolaRoof = new THREE.Mesh(
          new THREE.BoxGeometry(r.w + 0.3, 0.08, r.l + 0.3),
          new THREE.MeshStandardMaterial({ color: '#7a3418', roughness: 0.85 })
        );
        pergolaRoof.position.set(rx, baseY + PERGOLA_H, rz);
        pergolaRoof.castShadow = true;
        group.add(pergolaRoof);
      }
      if (s.kind === 'kitchen' || s.kind === 'openconcept') {
        const counter = new THREE.Mesh(
          new THREE.BoxGeometry(r.w * (s.kind === 'openconcept' ? 0.42 : 0.8), 0.9, 0.55),
          new THREE.MeshStandardMaterial({ color: '#d8cbb3', roughness: 0.8 })
        );
        counter.position.set(rx - (s.kind === 'openconcept' ? r.w * 0.22 : 0), baseY + 0.45, rz - r.l / 2 + 0.4);
        group.add(counter);
      }
      if (s.kind === 'openconcept') {
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(Math.min(r.w * 0.4, 2.2), 0.5, 0.8), new THREE.MeshStandardMaterial({ color: '#8a6f5a', roughness: 0.85 }));
        sofa.position.set(rx + r.w * 0.2, baseY + 0.25, rz + r.l / 2 - 0.6);
        group.add(sofa);
      }
      if (s.kind === 'bedroom') {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(Math.min(r.w * 0.7, 1.8), 0.4, Math.min(r.l * 0.55, 2.0)), new THREE.MeshStandardMaterial({ color: '#c9a986', roughness: 0.8 }));
        bed.position.set(rx, baseY + 0.22, rz);
        group.add(bed);
      }
      if (s.kind === 'wet') {
        const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 12), new THREE.MeshStandardMaterial({ color: '#f4f2ee' }));
        toilet.position.set(rx - r.w / 2 + 0.35, baseY + 0.22, rz - r.l / 2 + 0.35);
        group.add(toilet);
      }

      // A window on whichever side of this room is a real EXTERIOR wall (facing the
      // outside of the building, not a shared partition with the room next door).
      const WINDOWED_KINDS = ['bedroom', 'living', 'kitchen', 'openconcept', 'room', 'wet'];
      if (WINDOWED_KINDS.indexOf(s.kind) !== -1) {
        const isLeftExterior = r.x <= floorBounds.cx - floorBounds.w / 2 + EPS;
        const isRightExterior = r.x + r.w >= floorBounds.cx + floorBounds.w / 2 - EPS;
        const isTopExterior = r.y <= floorBounds.cz - floorBounds.l / 2 + EPS;
        const isBottomExterior = r.y + r.l >= floorBounds.cz + floorBounds.l / 2 - EPS;
        const glassMat = new THREE.MeshStandardMaterial({ color: '#bfe0ea', roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.6 });
        const frameMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
        const sill = 0.95, winH = 1.1;
        function addWindow(px, pz, spanAxisLen, vertical) {
          const winW = Math.min(spanAxisLen * 0.5, 1.6);
          if (winW < 0.5) return;
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(vertical ? winW : winW, winH * 0.85), glassMat);
          if (vertical) glass.rotation.y = Math.PI / 2;
          glass.position.set(px, baseY + sill + winH / 2, pz);
          group.add(glass);
          const frame = new THREE.Mesh(
            vertical ? new THREE.BoxGeometry(0.04, winH, winW) : new THREE.BoxGeometry(winW, winH, 0.04),
            frameMat
          );
          frame.position.set(px, baseY + sill + winH / 2, pz);
          group.add(frame);
        }
        if (isRightExterior) addWindow(rx + r.w / 2 + 0.01, rz, r.l, true);
        else if (isLeftExterior) addWindow(rx - r.w / 2 - 0.01, rz, r.l, true);
        else if (isBottomExterior) addWindow(rx, rz + r.l / 2 + 0.01, r.w, false);
        else if (isTopExterior) addWindow(rx, rz - r.l / 2 - 0.01, r.w, false);
      }

      // DOM label (HTML overlay, crisper than a 3D sprite) with the floor as a subtitle.
      const floorLabel = floorNum === 0 ? 'térreo' : (floorNum + 'º andar');
      const el = makeLabelEl(s.label, floorKeys.length > 1 ? floorLabel : '');
      labelDefs.push({ el: el, pos: new THREE.Vector3(rx, baseY + WALL_H + 0.5, rz), floor: floorNum });
    });

    buildLines(vLines, 'v', baseY, group);
    buildLines(hLines, 'h', baseY, group);
  });

  // Roof: a real hip roof (four sloped faces meeting at a ridge line), sized tightly
  // to the TOP floor's indoor footprint rectangle plus a small eave overhang — NOT a
  // circular cone. A cone-based "pyramid" always overshoots a rectangle's corners by
  // ~40%, which is exactly why it kept covering the pool/deck next to the house even
  // after they were excluded from the size calculation. A rectangular hip roof has no
  // such overshoot: it only extends past the walls by the small overhang margin.
  function buildHipRoofGeometry(halfW, halfL, apexHeight) {
    const v = [];
    function tri(p1, p2, p3) { v.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]); }
    const A = [-halfW, 0, -halfL], B = [halfW, 0, -halfL], C = [halfW, 0, halfL], D = [-halfW, 0, halfL];
    if (halfW <= halfL) {
      const ridgeHalf = Math.max(0, halfL - halfW);
      const R1 = [0, apexHeight, -ridgeHalf], R2 = [0, apexHeight, ridgeHalf];
      tri(A, D, R2); tri(A, R2, R1);       // slope facing -X
      tri(B, R1, R2); tri(B, R2, C);       // slope facing +X
      tri(A, B, R1);                        // hip end facing -Z
      tri(D, R2, C);                        // hip end facing +Z
    } else {
      const ridgeHalf = Math.max(0, halfW - halfL);
      const R1 = [-ridgeHalf, apexHeight, 0], R2 = [ridgeHalf, apexHeight, 0];
      tri(A, B, R2); tri(A, R2, R1);       // slope facing -Z
      tri(D, R1, R2); tri(D, R2, C);       // slope facing +Z
      tri(A, R1, D);                        // hip end facing -X
      tri(B, C, R2);                        // hip end facing +X
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    return geo;
  }

  const topBaseY = topFloor * FLOOR_H;
  const roofMat = new THREE.MeshStandardMaterial({ color: '#8a3d1e', roughness: 0.7, side: THREE.DoubleSide });
  const OVERHANG = 0.4; // small eave overhang past the walls, like a real roof
  const roofHalfW = roofFootprint.w / 2 + OVERHANG;
  const roofHalfL = roofFootprint.l / 2 + OVERHANG;
  const roofGeo = buildHipRoofGeometry(roofHalfW, roofHalfL, ROOF_H);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.castShadow = true;
  roof.position.set(roofFootprint.cx != null ? -cx + roofFootprint.cx : 0, topBaseY + WALL_H, roofFootprint.cz != null ? -cz + roofFootprint.cz : 0);
  roofGroup.add(roof);
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(roofFootprint.w + OVERHANG * 2, 0.06, roofFootprint.l + OVERHANG * 2),
    new THREE.MeshStandardMaterial({ color: '#7a3418', roughness: 0.9 })
  );
  eave.position.set(roof.position.x, topBaseY + WALL_H + 0.03, roof.position.z);
  roofGroup.add(eave);

  // ---------------- Floor switcher (HUD) ----------------
  let activeFloor = 'all';
  function applyFloorVisibility() {
    floorKeys.forEach(function(f){
      floorGroups[f].visible = activeFloor === 'all' || activeFloor === f;
    });
    roofGroup.visible = (activeFloor === 'all' || activeFloor === topFloor) && document.getElementById('btnRoof').classList.contains('on');
    labelDefs.forEach(function(l){
      l.showFloor = activeFloor === 'all' || activeFloor === l.floor;
    });
  }
  if (floorKeys.length > 1) {
    const sw = document.getElementById('floorSwitch');
    function makeBtn(label, value) {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = value === activeFloor ? 'on' : '';
      b.addEventListener('click', function(){
        activeFloor = value;
        Array.from(sw.children).forEach(function(c){ c.classList.remove('on'); });
        b.classList.add('on');
        applyFloorVisibility();
      });
      sw.appendChild(b);
      return b;
    }
    makeBtn('Casa toda', 'all');
    floorKeys.forEach(function(f){
      makeBtn(f === 0 ? 'Térreo' : (f + 'º Andar'), f);
    });
  }
  applyFloorVisibility();

  // Controls
  let autoRotate = false;
  document.getElementById('btnRotate').addEventListener('click', function(){
    autoRotate = !autoRotate;
    this.classList.toggle('on', autoRotate);
    this.textContent = autoRotate ? '■ Parar' : '▶ Girar';
  });
  document.getElementById('btnRoof').addEventListener('click', function(){
    this.classList.toggle('on');
    applyFloorVisibility();
  });
  document.getElementById('btnLabels').addEventListener('click', function(){
    const on = this.classList.toggle('on');
    document.getElementById('labels').style.display = on ? 'block' : 'none';
  });
  document.getElementById('btnTop').addEventListener('click', function(){
    camera.position.set(focusX + 0.15, diag * 1.5, focusZ + 0.2);
    controls.target.set(focusX, midY * 0.6, focusZ);
    controls.update();
  });

  window.addEventListener('resize', function(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  setTimeout(function(){ const t = document.getElementById('tip'); if (t) t.style.opacity = 0; }, 3200);

  const tmpV = new THREE.Vector3();
  function updateLabels() {
    labelDefs.forEach(function(l){
      if (l.showFloor === false) { l.el.style.display = 'none'; return; }
      tmpV.copy(l.pos).project(camera);
      const visible = tmpV.z < 1;
      l.el.style.display = visible ? 'block' : 'none';
      l.el.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      l.el.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) {
      const angle = 0.003;
      const dx = camera.position.x, dz = camera.position.z;
      camera.position.x = dx * Math.cos(angle) - dz * Math.sin(angle);
      camera.position.z = dx * Math.sin(angle) + dz * Math.cos(angle);
      camera.lookAt(controls.target);
    }
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
  }
  animate();
})();
</script>
</body></html>`;
}
