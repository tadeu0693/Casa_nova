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
    walls: r.walls && r.walls.length ? r.walls : ["n", "s", "w", "e"],
    openings: r.openings || [],
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
  .lbl.tappable{pointer-events:auto;cursor:pointer;}
  .lbl.tappable:active{background:var(--brand);}
  #roomBar{position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:10px;align-items:center;background:var(--glass);backdrop-filter:blur(10px);border-radius:14px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.12);}
  #roomBar .info{flex:1;min-width:0;}
  #roomBar #roomName{font-family:'Fraunces',serif;font-weight:700;font-size:15px;color:var(--brand-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #roomBar #roomMeta{font-size:11px;color:#5b5b5b;margin-top:2px;}
  #roomBar button{background:var(--brand);color:#fff;border:none;font-weight:700;font-size:12px;padding:10px 16px;border-radius:999px;cursor:pointer;}
</style>
</head><body>
<canvas id="app"></canvas>
<div id="labels"></div>
<div id="floorSwitch"></div>
<div id="tip">Arraste para girar · toque num cômodo para ver por dentro</div>
<div id="roomBar">
  <div class="info"><div id="roomName"></div><div id="roomMeta"></div></div>
  <button id="btnBackRoom">‹ Voltar</button>
</div>
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
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
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
  // Everything that belongs to the "outside world" (lawn, contact shadow, trees) lives
  // in one group, so isolating a single room can hide the whole exterior in one go.
  const worldDecor = new THREE.Group();
  scene.add(worldDecor);
  worldDecor.add(ground);

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

  const DOOR_H = 2.10, SILL_H = 0.95, WIN_H = 1.15;

  // Subtract a list of cuts from a span, returning whatever is left of it.
  function subtractSpans(pieces, cuts) {
    let out = pieces;
    cuts.forEach(function(c){
      const next = [];
      out.forEach(function(p){
        if (c.end <= p.start + 0.001 || c.start >= p.end - 0.001) { next.push(p); return; }
        if (c.start > p.start + 0.001) next.push({ start: p.start, end: c.start });
        if (c.end < p.end - 0.001) next.push({ start: c.end, end: p.end });
      });
      out = next;
    });
    return out.filter(function(p){ return p.end - p.start > 0.02; });
  }

  // One wall run, built as boxes. A door leaves a gap from the floor up to the lintel;
  // a window leaves a gap between the sill and the header. The pieces of wall above and
  // below an opening are still built, which is what makes it read as a real opening cut
  // into the wall rather than a wall that simply stops.
  function addWallRun(group, orientation, coord, start, end, baseY, mat, voidsHere) {
    function slab(a, b, y0, h) {
      if (b - a < 0.02 || h < 0.02) return;
      const mid = (a + b) / 2;
      const len = b - a;
      const m = new THREE.Mesh(
        orientation === 'v' ? new THREE.BoxGeometry(WALL_T, h, len) : new THREE.BoxGeometry(len, h, WALL_T),
        mat
      );
      m.position.set(orientation === 'v' ? coord : mid, baseY + y0 + h / 2, orientation === 'v' ? mid : coord);
      m.castShadow = true;
      m.material.polygonOffset = true;
      m.material.polygonOffsetFactor = 1;
      m.material.polygonOffsetUnits = 1;
      group.add(m);
    }
    const cuts = voidsHere.filter(function(v){ return v.end > start + 0.001 && v.start < end - 0.001; });
    // Solid stretches between the openings run the full height.
    subtractSpans([{ start: start, end: end }], cuts).forEach(function(p){ slab(p.start, p.end, 0, WALL_H); });
    // And each opening keeps its lintel (and sill, for a window).
    cuts.forEach(function(v){
      const a = Math.max(v.start, start), b = Math.min(v.end, end);
      if (v.kind === 'porta') {
        slab(a, b, DOOR_H, Math.max(0, WALL_H - DOOR_H));
      } else {
        slab(a, b, 0, SILL_H);
        slab(a, b, SILL_H + WIN_H, Math.max(0, WALL_H - SILL_H - WIN_H));
      }
    });
  }

  // The door leaf / window glass that sits inside the opening.
  function addOpeningPanel(group, orientation, coord, v, baseY) {
    const len = v.end - v.start;
    const mid = (v.start + v.end) / 2;
    if (v.kind === 'porta') {
      const leaf = new THREE.Mesh(
        orientation === 'v' ? new THREE.BoxGeometry(0.05, DOOR_H, len * 0.94) : new THREE.BoxGeometry(len * 0.94, DOOR_H, 0.05),
        new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.65 })
      );
      leaf.position.set(orientation === 'v' ? coord : mid, baseY + DOOR_H / 2, orientation === 'v' ? mid : coord);
      group.add(leaf);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8), new THREE.MeshStandardMaterial({ color: '#c9b06a', metalness: 0.7, roughness: 0.3 }));
      knob.rotation.z = Math.PI / 2;
      knob.position.set(
        orientation === 'v' ? coord + 0.06 : mid + len * 0.34,
        baseY + 1.02,
        orientation === 'v' ? mid + len * 0.34 : coord + 0.06
      );
      group.add(knob);
    } else {
      const glass = new THREE.Mesh(
        orientation === 'v' ? new THREE.BoxGeometry(0.04, WIN_H, len * 0.95) : new THREE.BoxGeometry(len * 0.95, WIN_H, 0.04),
        new THREE.MeshStandardMaterial({ color: '#bfe0ea', roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.55 })
      );
      glass.position.set(orientation === 'v' ? coord : mid, baseY + SILL_H + WIN_H / 2, orientation === 'v' ? mid : coord);
      group.add(glass);
      const frame = new THREE.Mesh(
        orientation === 'v' ? new THREE.BoxGeometry(0.06, 0.07, len) : new THREE.BoxGeometry(len, 0.07, 0.06),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })
      );
      frame.position.set(orientation === 'v' ? coord : mid, baseY + SILL_H, orientation === 'v' ? mid : coord);
      group.add(frame);
    }
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
    worldDecor.add(blob);
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
        worldDecor.add(tree(wx, wz, 0.85 + (i % 3) * 0.12));
      }
    });
  })();

  // ---------------- Furniture library ----------------
  // Each builder returns a THREE.Group whose origin is the CENTER of the room at floor
  // level (y = 0). The same group is used twice: placed inside the full house, and
  // rebuilt at the origin for the isolated single-room view. Sizes are clamped to the
  // room, so a 2x2 m room doesn't get a 2.2 m sofa sticking through its walls.
  const MAT = {
    wood:      new THREE.MeshStandardMaterial({ color: '#a9764c', roughness: 0.75 }),
    woodDark:  new THREE.MeshStandardMaterial({ color: '#6f4c33', roughness: 0.8 }),
    fabric:    new THREE.MeshStandardMaterial({ color: '#8a7f74', roughness: 0.95 }),
    fabricAlt: new THREE.MeshStandardMaterial({ color: '#6d7f83', roughness: 0.95 }),
    linen:     new THREE.MeshStandardMaterial({ color: '#f2ece1', roughness: 0.9 }),
    white:     new THREE.MeshStandardMaterial({ color: '#f6f4ef', roughness: 0.6 }),
    screen:    new THREE.MeshStandardMaterial({ color: '#20242a', roughness: 0.3, metalness: 0.3 }),
    metal:     new THREE.MeshStandardMaterial({ color: '#b9bcc0', roughness: 0.35, metalness: 0.6 }),
    stone:     new THREE.MeshStandardMaterial({ color: '#d6cfc0', roughness: 0.75 }),
    rug:       new THREE.MeshStandardMaterial({ color: '#c2a68a', roughness: 1 }),
    plant:     new THREE.MeshStandardMaterial({ color: '#5f8a52', roughness: 0.9 }),
    glassSoft: new THREE.MeshStandardMaterial({ color: '#cfe6ee', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 }),
  };

  function box(w, h, d, mat, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    return m;
  }
  function flat(w, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    return m;
  }
  function pottedPlant(x, z, scale) {
    const g = new THREE.Group();
    g.add(box(0.3, 0.3, 0.3, MAT.stone, 0, 0.15, 0));
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), MAT.plant);
    leaves.position.y = 0.58; leaves.castShadow = true;
    g.add(leaves);
    g.position.set(x, 0, z);
    if (scale) g.scale.setScalar(scale);
    return g;
  }

  // Furniture is laid out against the room's own walls: headboards and wardrobes go to
  // the back wall, TVs face them from the opposite wall, so nothing floats in the middle.
  function makeFurniture(kind, w, l) {
    const g = new THREE.Group();
    const halfW = w / 2, halfL = l / 2;
    const clamp = function(v, max){ return Math.max(0.3, Math.min(v, max)); };

    if (kind === 'bedroom') {
      const bedW = clamp(1.55, w * 0.62), bedL = clamp(2.0, l * 0.62);
      const bedZ = -halfL + bedL / 2 + 0.35;
      g.add(flat(clamp(bedW + 1.4, w * 0.9), clamp(bedL + 0.9, l * 0.75), MAT.rug, 0, 0.012, bedZ + 0.25));
      g.add(box(bedW, 0.32, bedL, MAT.woodDark, 0, 0.16, bedZ));                      // estrado
      g.add(box(bedW - 0.08, 0.2, bedL - 0.1, MAT.linen, 0, 0.42, bedZ));             // colchão
      g.add(box(bedW, 0.85, 0.1, MAT.wood, 0, 0.42, bedZ - bedL / 2 - 0.05));         // cabeceira
      const pw = bedW * 0.42;
      g.add(box(pw, 0.12, 0.36, MAT.white, -bedW * 0.22, 0.58, bedZ - bedL / 2 + 0.3));
      g.add(box(pw, 0.12, 0.36, MAT.white,  bedW * 0.22, 0.58, bedZ - bedL / 2 + 0.3));
      g.add(box(bedW - 0.06, 0.06, bedL * 0.45, MAT.fabricAlt, 0, 0.55, bedZ + bedL * 0.22)); // manta
      // criado-mudo
      if (w > bedW + 0.9) {
        g.add(box(0.42, 0.5, 0.38, MAT.wood, -bedW / 2 - 0.32, 0.25, bedZ - bedL / 2 + 0.25));
        g.add(box(0.16, 0.24, 0.16, MAT.white, -bedW / 2 - 0.32, 0.62, bedZ - bedL / 2 + 0.25));
      }
      // armário encostado na parede lateral
      const wardW = clamp(1.4, l * 0.45);
      g.add(box(0.58, 2.05, wardW, MAT.wood, halfW - 0.32, 1.02, halfL - wardW / 2 - 0.3));
      g.add(box(0.03, 1.7, 0.03, MAT.metal, halfW - 0.62, 1.0, halfL - wardW / 2 - 0.45));
      // TV na parede da frente, encarando a cama
      g.add(box(clamp(1.0, w * 0.5), 0.58, 0.05, MAT.screen, 0, 1.25, halfL - 0.1));
      g.add(box(clamp(1.2, w * 0.55), 0.4, 0.4, MAT.woodDark, 0, 0.2, halfL - 0.28));
      return g;
    }

    if (kind === 'living' || kind === 'openconcept' || kind === 'room') {
      const sofaW = clamp(2.1, w * 0.55);
      g.add(flat(clamp(sofaW + 1.0, w * 0.8), clamp(2.2, l * 0.55), MAT.rug, 0, 0.012, 0));
      // sofá (assento + encosto + braços + almofadas)
      const sz = -halfL + 0.75;
      g.add(box(sofaW, 0.42, 0.85, MAT.fabric, 0, 0.21, sz));
      g.add(box(sofaW, 0.55, 0.2, MAT.fabric, 0, 0.62, sz - 0.34));
      g.add(box(0.18, 0.55, 0.85, MAT.fabric, -sofaW / 2 + 0.09, 0.5, sz));
      g.add(box(0.18, 0.55, 0.85, MAT.fabric,  sofaW / 2 - 0.09, 0.5, sz));
      g.add(box(0.36, 0.12, 0.3, MAT.fabricAlt, -sofaW * 0.24, 0.5, sz - 0.16));
      g.add(box(0.36, 0.12, 0.3, MAT.fabricAlt,  sofaW * 0.24, 0.5, sz - 0.16));
      // mesa de centro
      g.add(box(clamp(1.1, w * 0.35), 0.06, 0.6, MAT.wood, 0, 0.4, sz + 0.95));
      g.add(box(clamp(1.0, w * 0.32), 0.36, 0.5, MAT.woodDark, 0, 0.2, sz + 0.95));
      // rack + TV na parede oposta
      g.add(box(clamp(1.7, w * 0.5), 0.42, 0.4, MAT.woodDark, 0, 0.21, halfL - 0.3));
      g.add(box(clamp(1.5, w * 0.45), 0.85, 0.05, MAT.screen, 0, 1.15, halfL - 0.12));
      if (w > 3) g.add(pottedPlant(halfW - 0.45, halfL - 0.5, 1));
      if (kind === 'openconcept') {
        // ilha/bancada da cozinha integrada
        g.add(box(clamp(1.9, w * 0.45), 0.9, 0.7, MAT.stone, -halfW + clamp(1.9, w * 0.45) / 2 + 0.3, 0.45, -halfL + 0.6));
        g.add(box(clamp(2.0, w * 0.46), 0.06, 0.78, MAT.white, -halfW + clamp(1.9, w * 0.45) / 2 + 0.3, 0.93, -halfL + 0.6));
      }
      return g;
    }

    if (kind === 'kitchen') {
      const runW = clamp(w - 0.6, w * 0.85);
      g.add(box(runW, 0.86, 0.62, MAT.wood, 0, 0.43, -halfL + 0.4));            // armários baixos
      g.add(box(runW, 0.06, 0.66, MAT.stone, 0, 0.89, -halfL + 0.4));           // bancada
      g.add(box(runW * 0.85, 0.6, 0.35, MAT.white, 0, 1.75, -halfL + 0.28));    // armários aéreos
      g.add(box(0.55, 0.02, 0.4, MAT.metal, -runW * 0.25, 0.92, -halfL + 0.4)); // cuba
      g.add(box(0.55, 0.02, 0.45, MAT.screen, runW * 0.22, 0.93, -halfL + 0.4));// cooktop
      g.add(box(0.7, 1.85, 0.68, MAT.white, halfW - 0.45, 0.93, halfL - 0.5));  // geladeira
      g.add(box(0.03, 1.1, 0.03, MAT.metal, halfW - 0.8, 1.1, halfL - 0.5));
      if (l > 3) {
        g.add(box(clamp(1.2, w * 0.4), 0.06, 0.7, MAT.wood, 0, 0.76, halfL - 0.9));
        g.add(box(0.08, 0.72, 0.08, MAT.woodDark, 0, 0.36, halfL - 0.9));
      }
      return g;
    }

    if (kind === 'wet') {
      // vaso
      g.add(box(0.38, 0.42, 0.6, MAT.white, -halfW + 0.35, 0.21, -halfL + 0.45));
      g.add(box(0.36, 0.5, 0.18, MAT.white, -halfW + 0.35, 0.46, -halfL + 0.2));
      // pia com bancada
      g.add(box(0.8, 0.06, 0.5, MAT.stone, halfW - 0.5, 0.85, -halfL + 0.4));
      g.add(box(0.76, 0.55, 0.46, MAT.wood, halfW - 0.5, 0.56, -halfL + 0.4));
      g.add(box(0.36, 0.14, 0.28, MAT.white, halfW - 0.5, 0.95, -halfL + 0.4));
      g.add(box(0.6, 0.7, 0.03, MAT.glassSoft, halfW - 0.5, 1.55, -halfL + 0.14)); // espelho
      // box do chuveiro
      const bw = clamp(0.95, w * 0.45), bl = clamp(0.95, l * 0.4);
      g.add(box(bw, 0.06, bl, MAT.stone, halfW - bw / 2 - 0.1, 0.03, halfL - bl / 2 - 0.1));
      g.add(box(0.03, 1.9, bl, MAT.glassSoft, halfW - bw - 0.1, 0.95, halfL - bl / 2 - 0.1));
      g.add(box(0.18, 0.04, 0.18, MAT.metal, halfW - bw / 2 - 0.1, 1.95, halfL - bl / 2 - 0.1));
      return g;
    }

    if (kind === 'closet') {
      g.add(box(0.55, 2.1, clamp(l - 0.5, l * 0.8), MAT.wood, -halfW + 0.3, 1.05, 0));
      g.add(box(0.55, 2.1, clamp(l - 0.5, l * 0.8), MAT.wood, halfW - 0.3, 1.05, 0));
      g.add(box(0.8, 0.42, 0.8, MAT.fabric, 0, 0.21, 0));
      return g;
    }

    if (kind === 'hall') {
      g.add(box(clamp(1.0, w * 0.5), 0.06, 0.35, MAT.wood, 0, 0.8, -halfL + 0.25));
      g.add(pottedPlant(halfW - 0.4, halfL - 0.4, 0.9));
      return g;
    }

    if (kind === 'deck' || kind === 'outdoor' || kind === 'grill') {
      const tw = clamp(1.1, Math.min(w, l) * 0.5);
      g.add(box(tw, 0.06, tw * 0.7, MAT.wood, 0, 0.74, 0));
      g.add(box(0.1, 0.72, 0.1, MAT.woodDark, 0, 0.36, 0));
      g.add(box(0.5, 0.06, 0.45, MAT.wood, 0, 0.44, -tw * 0.65));
      g.add(box(0.5, 0.06, 0.45, MAT.wood, 0, 0.44, tw * 0.65));
      g.add(pottedPlant(halfW - 0.45, -halfL + 0.45, 1.05));
      g.add(pottedPlant(-halfW + 0.45, halfL - 0.45, 0.9));
      return g;
    }

    return g;
  }

  // ---------------- Parapet / railing (sacada & varanda) ----------------
  // An open deck with nothing around its edge reads as an unfinished slab. A real
  // balcony has a parapet: a low wall, vertical balusters and a handrail on top —
  // but ONLY on the edges facing the open air, never on the side that meets the house.
  const RAIL_H = 1.02;
  function addRailing(group, rx, baseY, rz, w, l, openEdges) {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#efe9dd', roughness: 0.85 });
    const railMat = new THREE.MeshStandardMaterial({ color: '#6f4c33', roughness: 0.7 });
    const barMat  = new THREE.MeshStandardMaterial({ color: '#8a8f95', roughness: 0.4, metalness: 0.5 });
    const BASE_H = 0.34, T = 0.1;
    // edge: [axis, sign] -> 'n' (-z), 's' (+z), 'w' (-x), 'e' (+x)
    const edges = {
      n: { x: rx, z: rz - l / 2, len: w, horizontal: true },
      s: { x: rx, z: rz + l / 2, len: w, horizontal: true },
      w: { x: rx - w / 2, z: rz, len: l, horizontal: false },
      e: { x: rx + w / 2, z: rz, len: l, horizontal: false },
    };
    Object.keys(edges).forEach(function(k){
      if (openEdges.indexOf(k) === -1) return;
      const e = edges[k];
      const sw = e.horizontal ? e.len : T;
      const sd = e.horizontal ? T : e.len;
      // mureta baixa
      const low = new THREE.Mesh(new THREE.BoxGeometry(sw, BASE_H, sd), wallMat);
      low.position.set(e.x, baseY + BASE_H / 2, e.z);
      low.castShadow = true;
      group.add(low);
      // balaústres verticais
      const n = Math.max(2, Math.floor(e.len / 0.28));
      for (let i = 0; i <= n; i++) {
        const t = -e.len / 2 + (e.len * i) / n;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, RAIL_H - BASE_H - 0.06, 6), barMat);
        bar.position.set(
          e.horizontal ? e.x + t : e.x,
          baseY + BASE_H + (RAIL_H - BASE_H - 0.06) / 2,
          e.horizontal ? e.z : e.z + t
        );
        group.add(bar);
      }
      // corrimão de madeira
      const rail = new THREE.Mesh(new THREE.BoxGeometry(e.horizontal ? e.len + T : 0.14, 0.08, e.horizontal ? 0.14 : e.len + T), railMat);
      rail.position.set(e.x, baseY + RAIL_H, e.z);
      rail.castShadow = true;
      group.add(rail);
    });
  }

  const labelDefs = []; // {el, pos: THREE.Vector3, floor}
  const roomRefs = []; // {name, kind, w, l, rx, rz, baseY, floor, style}
  const pickTargets = []; // invisible floor planes used to tap a room in the 3D view
  const ceilingMeshes = []; // laje de cobertura de cada cômodo fechado

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

    // Every wall of every room on this floor, as an addressable spec. Openings are
    // shared voids on the line, and a wall the person deleted removes the wall on that
    // line entirely — that is what "integrar os ambientes" means: the partition is gone
    // for both rooms, not just for the one that was selected.
    const wallSpecs = [];   // {orientation, coord, start, end, color, opacity}
    const wallVoids = [];   // {orientation, coord, start, end, kind}
    const wallRemoved = []; // {orientation, coord, start, end}

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
      const roomWalls = (r.walls && r.walls.length) ? r.walls : ['n', 's', 'w', 'e'];
      // Geometry of each side, in world coords, keyed the way the 2D editor names them.
      const sideGeom = {
        n: { orientation: 'h', coord: rz - r.l / 2, start: rx - r.w / 2, end: rx + r.w / 2 },
        s: { orientation: 'h', coord: rz + r.l / 2, start: rx - r.w / 2, end: rx + r.w / 2 },
        w: { orientation: 'v', coord: rx - r.w / 2, start: rz - r.l / 2, end: rz + r.l / 2 },
        e: { orientation: 'v', coord: rx + r.w / 2, start: rz - r.l / 2, end: rz + r.l / 2 },
      };
      if (!skipWalls) {
        const opacity = s.wall.opacity == null ? 1 : s.wall.opacity;
        ['n', 's', 'w', 'e'].forEach(function(side){
          const g = sideGeom[side];
          if (roomWalls.indexOf(side) === -1) {
            wallRemoved.push({ orientation: g.orientation, coord: g.coord, start: g.start, end: g.end });
            return;
          }
          wallSpecs.push({ orientation: g.orientation, coord: g.coord, start: g.start, end: g.end, color: s.wall.color, opacity: opacity });
        });
      }
      (r.openings || []).forEach(function(o){
        const g = sideGeom[o.side];
        if (!g) return;
        const len = g.end - g.start;
        const center = g.start + Math.max(0, Math.min(1, o.pos)) * len;
        const half = Math.min(o.width, len) / 2;
        wallVoids.push({ orientation: g.orientation, coord: g.coord, start: center - half, end: center + half, kind: o.kind === 'porta' ? 'porta' : 'janela' });
      });

      // ---- Laje de cobertura ----
      // Every ENCLOSED room gets its own ceiling slab right on top of its walls. Before
      // this, only the floor above had a slab, so any ground-floor room that stuck out
      // past the upper floor's footprint (a bedroom, a living room on the side) was left
      // open to the sky. Sizing the slab per room guarantees no indoor space is uncovered,
      // whatever shape the floor above happens to have.
      if (!skipWalls) {
        const ceil = new THREE.Mesh(
          new THREE.BoxGeometry(r.w + WALL_T, SLAB_T, r.l + WALL_T),
          new THREE.MeshStandardMaterial({ color: 0xD9D2C2, roughness: 1 })
        );
        ceil.position.set(rx, baseY + WALL_H + SLAB_T / 2, rz);
        ceil.castShadow = true;
        ceil.receiveShadow = true;
        group.add(ceil);
        ceilingMeshes.push(ceil);
      }

      // ---- Parapeito de sacada/varanda ----
      // Only the edges that face open air get a parapet; an edge shared with a
      // neighbouring room is a doorway/passage, not a place for a railing.
      if (s.kind === 'deck') {
        const open = [];
        function edgeIsFree(axis, coord, spanStart, spanEnd) {
          return !roomsOnFloor.some(function(o){
            if (o.id === r.id) return false;
            if (axis === 'z') {
              const touches = Math.abs(o.y - coord) < 0.06 || Math.abs(o.y + o.l - coord) < 0.06;
              return touches && Math.min(o.x + o.w, spanEnd) - Math.max(o.x, spanStart) > 0.3;
            }
            const touchesX = Math.abs(o.x - coord) < 0.06 || Math.abs(o.x + o.w - coord) < 0.06;
            return touchesX && Math.min(o.y + o.l, spanEnd) - Math.max(o.y, spanStart) > 0.3;
          });
        }
        if (edgeIsFree('z', r.y, r.x, r.x + r.w)) open.push('n');
        if (edgeIsFree('z', r.y + r.l, r.x, r.x + r.w)) open.push('s');
        if (edgeIsFree('x', r.x, r.y, r.y + r.l)) open.push('w');
        if (edgeIsFree('x', r.x + r.w, r.y, r.y + r.l)) open.push('e');
        addRailing(group, rx, baseY, rz, r.w, r.l, open.length ? open : ['n', 's', 'w', 'e']);
      }

      // ---- Mobília ----
      const furn = makeFurniture(s.kind, r.w, r.l);
      furn.position.set(rx, baseY + 0.02, rz);
      group.add(furn);

      if (s.kind === 'grill') {
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

      const ref = { name: s.label, kind: s.kind, style: s, w: r.w, l: r.l, rx: rx, rz: rz, baseY: baseY, floor: floorNum, floorLabel: floorLabel, walls: roomWalls, openings: r.openings || [] };
      roomRefs.push(ref);
      el.classList.add('tappable');
      el.addEventListener('click', function(ev){ ev.stopPropagation(); enterRoom(ref); });

      // Invisible pick plane so tapping the room itself (not just its label) opens it.
      const pick = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.l), new THREE.MeshBasicMaterial({ visible: false }));
      pick.rotation.x = -Math.PI / 2;
      pick.position.set(rx, baseY + 0.03, rz);
      pick.userData.ref = ref;
      group.add(pick);
      pickTargets.push(pick);
    });

    // Emit the walls. Two rooms sharing a partition produce two identical specs, so we
    // track what has already been built per line and skip the duplicate — one physical
    // wall, not two flickering ones stacked on top of each other.
    const emitted = {};   // lineKey -> [{start,end}] already built
    const panelDone = {}; // so a shared opening only gets one door leaf / one pane
    function sameLine(a, b) { return a.orientation === b.orientation && Math.abs(a.coord - b.coord) < 0.06; }

    wallSpecs.forEach(function(spec){
      const key = spec.orientation + ':' + keyOf(spec.coord);
      const cuts = (emitted[key] || [])
        .concat(wallRemoved.filter(function(rm){ return sameLine(rm, spec); }));
      const pieces = subtractSpans([{ start: spec.start, end: spec.end }], cuts);
      if (!pieces.length) return;
      const voidsHere = wallVoids.filter(function(v){ return sameLine(v, spec); });
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        transparent: spec.opacity < 1,
        opacity: spec.opacity,
        roughness: 0.8,
      });
      pieces.forEach(function(p){
        addWallRun(group, spec.orientation, spec.coord, p.start, p.end, baseY, mat, voidsHere);
        (emitted[key] = emitted[key] || []).push(p);
        voidsHere.forEach(function(v, vi){
          if (v.end <= p.start + 0.001 || v.start >= p.end - 0.001) return;
          const pk = key + ':' + vi;
          if (panelDone[pk]) return;
          panelDone[pk] = true;
          addOpeningPanel(group, spec.orientation, spec.coord, v, baseY);
        });
      });
    });
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
    const roofOn = document.getElementById('btnRoof').classList.contains('on');
    roofGroup.visible = (activeFloor === 'all' || activeFloor === topFloor) && roofOn;
    // The ceiling slabs are what actually cover the rooms below. They stay on for the
    // whole house, but come off when you isolate a floor or turn the roof off — that is
    // exactly when someone is trying to look inside.
    ceilingMeshes.forEach(function(m){ m.visible = activeFloor === 'all' && roofOn; });
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

  // ---------------- Isolated room view ----------------
  // Tapping a room (or its label) hides the whole house and rebuilds just that room at
  // the origin: its own floor, three walls (the fourth is left low so you can see in),
  // a ceiling and its furniture laid out in place. "Voltar" restores the full house.
  const roomView = new THREE.Group();
  roomView.visible = false;
  scene.add(roomView);
  let currentRoom = null;
  const savedCam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.geometry) c.geometry.dispose();
    }
  }

  function enterRoom(ref) {
    if (currentRoom) return;
    currentRoom = ref;
    savedCam.pos.copy(camera.position);
    savedCam.target.copy(controls.target);

    clearGroup(roomView);
    const w = ref.w, l = ref.l, halfW = w / 2, halfL = l / 2;
    const s = ref.style;
    const isOutdoor = OUTDOOR_KINDS.indexOf(ref.kind) !== -1;

    // Piso
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, l),
      new THREE.MeshStandardMaterial({ color: s.floor.color, roughness: s.floor.roughness == null ? 0.7 : s.floor.roughness })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    roomView.add(floorMesh);

    if (!isOutdoor) {
      const wallMat = new THREE.MeshStandardMaterial({ color: s.wall.color, roughness: 0.85, side: THREE.DoubleSide });
      const keptWalls = (ref.walls && ref.walls.length) ? ref.walls : ['n', 's', 'w', 'e'];
      // The isolated view is the same room, so it shows the same walls: a wall deleted in
      // the 2D editor is missing here too, and its doors and windows are cut in the same
      // places. Only the south wall is treated specially — it is dropped to a low kerb so
      // the camera can see inside, which is a viewing aid, not an edit.
      const geom = {
        n: { orientation: 'h', coord: -halfL, start: -halfW, end: halfW },
        s: { orientation: 'h', coord: halfL, start: -halfW, end: halfW },
        w: { orientation: 'v', coord: -halfW, start: -halfL, end: halfL },
        e: { orientation: 'v', coord: halfW, start: -halfL, end: halfL },
      };
      ['n', 'w', 'e'].forEach(function(side){
        if (keptWalls.indexOf(side) === -1) return;
        const g = geom[side];
        const voids = (ref.openings || []).filter(function(o){ return o.side === side; }).map(function(o){
          const len = g.end - g.start;
          const center = g.start + Math.max(0, Math.min(1, o.pos)) * len;
          const half = Math.min(o.width, len) / 2;
          return { start: center - half, end: center + half, kind: o.kind === 'porta' ? 'porta' : 'janela' };
        });
        addWallRun(roomView, g.orientation, g.coord, g.start, g.end, 0, wallMat, voids);
        voids.forEach(function(v){ addOpeningPanel(roomView, g.orientation, g.coord, v, 0); });
      });
      if (keptWalls.indexOf('s') !== -1) {
        const front = new THREE.Mesh(new THREE.BoxGeometry(w + WALL_T, 0.35, WALL_T), wallMat);
        front.position.set(0, 0.175, halfL + WALL_T / 2);
        front.castShadow = true;
        roomView.add(front);
      }
      // Laje
      const ceil = new THREE.Mesh(
        new THREE.BoxGeometry(w + WALL_T * 2, SLAB_T, l + WALL_T * 2),
        new THREE.MeshStandardMaterial({ color: 0xE4DED0, roughness: 1, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      ceil.position.y = WALL_H + SLAB_T / 2;
      roomView.add(ceil);
      // Rodapé
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.1, l),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })
      );
      skirt.position.y = 0.05;
      skirt.scale.set(1.008, 1, 1.008);
      roomView.add(skirt);
    } else if (ref.kind === 'deck') {
      addRailing(roomView, 0, 0, 0, w, l, ['n', 's', 'w', 'e']);
    }

    roomView.add(makeFurniture(ref.kind, w, l));
    roomView.visible = true;

    // Esconde a casa inteira e o exterior
    floorKeys.forEach(function(f){ floorGroups[f].visible = false; });
    roofGroup.visible = false;
    worldDecor.visible = false;
    document.getElementById('labels').style.display = 'none';
    document.getElementById('floorSwitch').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    const bar = document.getElementById('roomBar');
    bar.style.display = 'flex';
    document.getElementById('roomName').textContent = ref.name;
    document.getElementById('roomMeta').textContent =
      ref.floorLabel + ' · ' + w.toFixed(1).replace('.', ',') + ' × ' + l.toFixed(1).replace('.', ',') + ' m · ' +
      (w * l).toFixed(1).replace('.', ',') + ' m²';

    const d = Math.hypot(w, l) + 2.2;
    camera.position.set(0, d * 0.62, d * 0.95);
    controls.target.set(0, 0.9, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = d * 2.2;
    controls.update();
  }

  function exitRoom() {
    if (!currentRoom) return;
    currentRoom = null;
    roomView.visible = false;
    clearGroup(roomView);
    worldDecor.visible = true;
    document.getElementById('labels').style.display =
      document.getElementById('btnLabels').classList.contains('on') ? 'block' : 'none';
    document.getElementById('floorSwitch').style.display = floorKeys.length > 1 ? 'flex' : 'none';
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('roomBar').style.display = 'none';
    applyFloorVisibility();
    controls.minDistance = diag * 0.3;
    controls.maxDistance = diag * 2.5;
    camera.position.copy(savedCam.pos);
    controls.target.copy(savedCam.target);
    controls.update();
  }

  document.getElementById('btnBackRoom').addEventListener('click', exitRoom);

  // Tap (not drag) on a room opens it. A small movement threshold keeps orbiting
  // the camera from being read as a tap.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0, downY = 0, downT = 0;
  canvas.addEventListener('pointerdown', function(e){ downX = e.clientX; downY = e.clientY; downT = Date.now(); });
  canvas.addEventListener('pointerup', function(e){
    if (currentRoom) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8 || Date.now() - downT > 500) return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const visibleTargets = pickTargets.filter(function(p){ return p.parent && p.parent.visible; });
    const hits = ray.intersectObjects(visibleTargets, false);
    if (hits.length && hits[0].object.userData.ref) enterRoom(hits[0].object.userData.ref);
  });

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

  document.getElementById('btnShare').addEventListener('click', function(){
    try {
      renderer.render(scene, camera); // make sure the buffer has the latest frame
      const dataUrl = renderer.domElement.toDataURL('image/png');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'share_screenshot', dataUrl: dataUrl }));
      }
    } catch (e) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'share_error', message: String(e) }));
      }
    }
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
