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
  html,body{margin:0;padding:0;overflow:hidden;background:#F8F7F4;color:var(--ink);font-family:'Inter',-apple-system,sans-serif;height:100%;}
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
  const topFloorRooms = PROJECT.rooms.filter(function(r){ return (r.floor || 0) === topFloor; });
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF8F7F4);
  scene.fog = new THREE.Fog(0xF8F7F4, 40, 140);

  // Center scene at (0,0) using the LOT dimensions (ground slab always covers the full lot).
  const cx = PROJECT.width / 2, cz = PROJECT.length / 2;

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const diag = Math.hypot(PROJECT.width, PROJECT.length, buildingHeight);
  const midY = buildingHeight / 2;
  camera.position.set(diag * 1.05, diag * 0.85 + midY, diag * 1.05);
  camera.lookAt(0, midY * 0.6, 0);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = diag * 0.3;
  controls.maxDistance = diag * 2.5;
  controls.target.set(0, midY * 0.6, 0);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0xE6DFCF, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(diag, diag * 1.3, diag * 0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // Ground (lawn beyond the building footprint)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(PROJECT.width * 2.2, PROJECT.length * 2.2),
    new THREE.MeshStandardMaterial({ color: 0xE9E4D7, roughness: 1 })
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

  // Ground slab (térreo) — always spans the full lot.
  const groundSlab = new THREE.Mesh(
    new THREE.BoxGeometry(PROJECT.width, SLAB_T, PROJECT.length),
    new THREE.MeshStandardMaterial({ color: 0xC7BFA9, roughness: 1 })
  );
  groundSlab.position.set(0, -SLAB_T / 2, 0);
  groundSlab.receiveShadow = true;
  scene.add(groundSlab);

  const labelDefs = []; // {el, pos: THREE.Vector3, floor}

  floorKeys.forEach(function(floorNum){
    const baseY = floorNum * FLOOR_H;
    const roomsOnFloor = PROJECT.rooms.filter(function(r){ return (r.floor || 0) === floorNum; });
    const group = new THREE.Group();
    floorGroups[floorNum] = group;
    scene.add(group);

    // Every floor above the ground gets its own full slab (acts as the ceiling
    // of the floor below / floor of the one above) — a real building trait.
    if (floorNum > 0) {
      const levelSlab = new THREE.Mesh(
        new THREE.BoxGeometry(PROJECT.width, SLAB_T, PROJECT.length),
        new THREE.MeshStandardMaterial({ color: 0xC7BFA9, roughness: 1 })
      );
      levelSlab.position.set(0, baseY - SLAB_T / 2, 0);
      levelSlab.receiveShadow = true;
      group.add(levelSlab);
    }

    const vLines = {}, hLines = {};

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

      const skipWalls = ['grass', 'asphalt', 'pool', 'deck'].indexOf(s.kind) !== -1;
      if (!skipWalls) {
        const opacity = s.wall.opacity == null ? 1 : s.wall.opacity;
        const seg = { color: s.wall.color, opacity: opacity };
        pushSeg(vLines, keyOf(rx - r.w / 2), Object.assign({ z1: rz - r.l / 2, z2: rz + r.l / 2 }, seg));
        pushSeg(vLines, keyOf(rx + r.w / 2), Object.assign({ z1: rz - r.l / 2, z2: rz + r.l / 2 }, seg));
        pushSeg(hLines, keyOf(rz - r.l / 2), Object.assign({ x1: rx - r.w / 2, x2: rx + r.w / 2 }, seg));
        pushSeg(hLines, keyOf(rz + r.l / 2), Object.assign({ x1: rx - r.w / 2, x2: rx + r.w / 2 }, seg));
      }

      if (s.kind === 'grill') {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(r.w * 0.85, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: '#a94a2a', roughness: 0.9 }));
        bench.position.set(rx, baseY + 0.45, rz - r.l / 2 + 0.3);
        group.add(bench);
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

      // DOM label (HTML overlay, crisper than a 3D sprite) with the floor as a subtitle.
      const floorLabel = floorNum === 0 ? 'térreo' : (floorNum + 'º andar');
      const el = makeLabelEl(s.label, floorKeys.length > 1 ? floorLabel : '');
      labelDefs.push({ el: el, pos: new THREE.Vector3(rx, baseY + WALL_H + 0.5, rz), floor: floorNum });
    });

    buildLines(vLines, 'v', baseY, group);
    buildLines(hLines, 'h', baseY, group);
  });

  // Roof (pitched, sized to the TOP floor's own footprint — not the whole lot —
  // and height-capped so large buildings don't get a giant flat diamond).
  const topBaseY = topFloor * FLOOR_H;
  const roofMat = new THREE.MeshStandardMaterial({ color: '#8a3d1e', roughness: 0.7, side: THREE.DoubleSide });
  const roofRadius = (roofSpan / 2) * 1.28; // small eave overhang beyond the footprint diagonal
  const roofGeo = new THREE.ConeGeometry(roofRadius, ROOF_H, 4, 1);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.position.set(roofFootprint.cx != null ? -cx + roofFootprint.cx : 0, topBaseY + WALL_H + ROOF_H / 2, roofFootprint.cz != null ? -cz + roofFootprint.cz : 0);
  roofGroup.add(roof);
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(roofFootprint.w + 0.6, 0.06, roofFootprint.l + 0.6),
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
    camera.position.set(0.15, diag * 1.5, 0.2);
    controls.target.set(0, midY * 0.6, 0);
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
