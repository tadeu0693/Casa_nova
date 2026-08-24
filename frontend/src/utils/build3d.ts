// Generates a self-contained HTML document that renders a Three.js 3D "maquette"
// of the user's project. Rooms get materials based on the room name:
// piscina → water, churrasqueira → brick, área gourmet → wood, jardim → grass,
// garagem → asphalt, etc. Runs inside a WebView.
//
// Rooms can belong to different floors (r.floor: 0 = térreo, 1 = 1º andar, ...),
// so multi-story houses (sobrados) stack floors vertically instead of piling
// every room onto a single ground plane.

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
  if (n.includes("cozin")) return { floor: { color: "#efe6d7" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "kitchen", label: name };
  if (n.includes("suíte") || n.includes("suite")) return { floor: { color: "#efdcd0" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "bedroom", label: name };
  if (n.includes("quarto")) return { floor: { color: "#e8dcc9" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "bedroom", label: name };
  if (n.includes("sala") || n.includes("conceito") || n.includes("aberto") || n.includes("integr")) return { floor: { color: "#e6d7b8" }, wall: { color: "#f6f4ee", opacity: 0.85 }, kind: "living", label: name };
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
<style>
  html,body{margin:0;padding:0;overflow:hidden;background:#F8F7F4;color:#1A1A1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;height:100%;}
  #app{width:100vw;height:100vh;display:block;touch-action:none;}
  #hud{position:fixed;left:12px;right:12px;bottom:12px;background:rgba(255,255,255,.94);border-radius:14px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.08);display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;align-items:center;}
  #hud .kicker{font-size:11px;color:#706F6A;font-weight:700;letter-spacing:.8px;text-transform:uppercase;flex-basis:100%;margin-bottom:2px}
  #hud button{background:#FCECE6;color:#C85A32;border:none;font-weight:700;font-size:12px;padding:8px 12px;border-radius:999px;cursor:pointer;flex:1;min-width:70px;}
  #hud button.on{background:#C85A32;color:#fff}
  #hud button.share{background:#1A1A1A;color:#fff}
  #tip{position:fixed;top:12px;left:12px;right:12px;background:rgba(26,26,26,.75);color:#fff;font-size:11px;padding:8px 12px;border-radius:10px;font-weight:600;text-align:center;pointer-events:none;transition:opacity .6s;}
</style>
</head><body>
<canvas id="app"></canvas>
<div id="tip">Arraste para girar · pinça para dar zoom</div>
<div id="hud">
  <div class="kicker">Vista 3D · ${data.name}</div>
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
  const WALL_H = 2.6, WALL_T = 0.12, ROOF_OVERHANG = 0.6, ROOF_H = 1.4, SLAB_T = 0.15;
  const FLOOR_H = WALL_H + SLAB_T; // vertical distance between one floor's base and the next
  const canvas = document.getElementById('app');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF8F7F4);

  // Figure out which floors are actually used, and how tall the building is overall.
  const floorSet = {};
  PROJECT.rooms.forEach(function(r){ floorSet[r.floor || 0] = true; });
  const floorKeys = Object.keys(floorSet).map(Number).sort(function(a,b){ return a - b; });
  const topFloor = floorKeys.length ? floorKeys[floorKeys.length - 1] : 0;
  const buildingHeight = topFloor * FLOOR_H + WALL_H + ROOF_H;

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Center scene at (0,0)
  const cx = PROJECT.width / 2, cz = PROJECT.length / 2;

  // Camera default (farther out so the whole house, including upper floors, is framed)
  const diag = Math.hypot(PROJECT.width, PROJECT.length, buildingHeight);
  const midY = buildingHeight / 2;
  camera.position.set(diag * 1.1, diag * 0.9 + midY, diag * 1.1);
  camera.lookAt(0, midY * 0.6, 0);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = diag * 0.3;
  controls.maxDistance = diag * 2.5;
  controls.target.set(0, midY * 0.6, 0);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0xE6DFCF, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(diag, diag * 1.3, diag * 0.6);
  sun.castShadow = true;
  scene.add(sun);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(PROJECT.width * 1.8, PROJECT.length * 1.8),
    new THREE.MeshStandardMaterial({ color: 0xE9E4D7, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  const roomGroup = new THREE.Group();
  const roofGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  scene.add(roomGroup);
  scene.add(roofGroup);
  scene.add(labelGroup);

  function makeLabel(text, roomMinDim) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const pad = 10, fontSize = 34;
    ctx.font = 'bold ' + fontSize + 'px -apple-system,Roboto,sans-serif';
    const w = ctx.measureText(text).width + pad * 2;
    c.width = w; c.height = fontSize + pad * 2;
    ctx.font = 'bold ' + fontSize + 'px -apple-system,Roboto,sans-serif';
    ctx.fillStyle = 'rgba(26,26,26,.85)';
    if (ctx.roundRect) ctx.roundRect(0, 0, c.width, c.height, 14);
    else ctx.rect(0, 0, c.width, c.height);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    // Scale relative to THIS room's own footprint (clamped) so labels for small
    // rooms don't balloon to the size of the whole house and overlap neighbors.
    const scale = Math.max(0.55, Math.min(roomMinDim * 0.45, diag * 0.09));
    sprite.scale.set(scale, scale * (c.height / c.width), 1);
    return sprite;
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
  function buildLines(map, orientation, baseY) {
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
          roomGroup.add(addWall(coord, baseY, mid, WALL_T, WALL_H, length, mat));
        } else {
          roomGroup.add(addWall(mid, baseY, coord, length, WALL_H, WALL_T, mat));
        }
      });
    });
  }

  // Ground slab (térreo)
  const groundSlab = new THREE.Mesh(
    new THREE.BoxGeometry(PROJECT.width, SLAB_T, PROJECT.length),
    new THREE.MeshStandardMaterial({ color: 0xC7BFA9, roughness: 1 })
  );
  groundSlab.position.set(0, -SLAB_T / 2, 0);
  scene.add(groundSlab);

  floorKeys.forEach(function(floorNum){
    const baseY = floorNum * FLOOR_H;
    const roomsOnFloor = PROJECT.rooms.filter(function(r){ return (r.floor || 0) === floorNum; });

    // Every floor above the ground gets its own full slab (acts as the ceiling
    // of the floor below / floor of the one above) — a real building trait.
    if (floorNum > 0) {
      const levelSlab = new THREE.Mesh(
        new THREE.BoxGeometry(PROJECT.width, SLAB_T, PROJECT.length),
        new THREE.MeshStandardMaterial({ color: 0xC7BFA9, roughness: 1 })
      );
      levelSlab.position.set(0, baseY - SLAB_T / 2, 0);
      roomGroup.add(levelSlab);
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
        // Sunken pool with water surface
        const wall = new THREE.MeshStandardMaterial({ color: '#94b8c2', roughness: 0.5 });
        const shell = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.5, r.l), wall);
        shell.position.set(rx, baseY - 0.25, rz);
        roomGroup.add(shell);
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(r.w * 0.96, r.l * 0.96),
          new THREE.MeshStandardMaterial({ color: s.floor.color, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.set(rx, baseY + 0.05, rz);
        roomGroup.add(water);
      } else {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.l), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(rx, baseY + 0.005, rz);
        floor.receiveShadow = true;
        roomGroup.add(floor);
      }

      // Walls (skip walls for grass, deck, asphalt, pool) — only collected here,
      // actually built after this floor's loop once shared borders are merged.
      const skipWalls = ['grass', 'asphalt', 'pool', 'deck'].indexOf(s.kind) !== -1;
      if (!skipWalls) {
        const opacity = s.wall.opacity == null ? 1 : s.wall.opacity;
        const seg = { color: s.wall.color, opacity: opacity };
        pushSeg(vLines, keyOf(rx - r.w / 2), Object.assign({ z1: rz - r.l / 2, z2: rz + r.l / 2 }, seg));
        pushSeg(vLines, keyOf(rx + r.w / 2), Object.assign({ z1: rz - r.l / 2, z2: rz + r.l / 2 }, seg));
        pushSeg(hLines, keyOf(rz - r.l / 2), Object.assign({ x1: rx - r.w / 2, x2: rx + r.w / 2 }, seg));
        pushSeg(hLines, keyOf(rz + r.l / 2), Object.assign({ x1: rx - r.w / 2, x2: rx + r.w / 2 }, seg));
      }

      // Special props
      if (s.kind === 'grill') {
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(r.w * 0.85, 0.9, 0.4),
          new THREE.MeshStandardMaterial({ color: '#a94a2a', roughness: 0.9 })
        );
        bench.position.set(rx, baseY + 0.45, rz - r.l / 2 + 0.3);
        roomGroup.add(bench);
      }
      if (s.kind === 'kitchen') {
        const counter = new THREE.Mesh(
          new THREE.BoxGeometry(r.w * 0.8, 0.9, 0.55),
          new THREE.MeshStandardMaterial({ color: '#d8cbb3', roughness: 0.8 })
        );
        counter.position.set(rx, baseY + 0.45, rz - r.l / 2 + 0.4);
        roomGroup.add(counter);
      }
      if (s.kind === 'bedroom') {
        const bed = new THREE.Mesh(
          new THREE.BoxGeometry(Math.min(r.w * 0.7, 1.8), 0.4, Math.min(r.l * 0.55, 2.0)),
          new THREE.MeshStandardMaterial({ color: '#c9a986', roughness: 0.8 })
        );
        bed.position.set(rx, baseY + 0.22, rz);
        roomGroup.add(bed);
      }
      if (s.kind === 'wet') {
        const toilet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.45, 12),
          new THREE.MeshStandardMaterial({ color: '#f4f2ee' })
        );
        toilet.position.set(rx - r.w / 2 + 0.35, baseY + 0.22, rz - r.l / 2 + 0.35);
        roomGroup.add(toilet);
      }

      // Label
      const lab = makeLabel(s.label, Math.min(r.w, r.l));
      lab.position.set(rx, baseY + WALL_H + 0.55, rz);
      labelGroup.add(lab);
    });

    buildLines(vLines, 'v', baseY);
    buildLines(hLines, 'h', baseY);
  });

  // Roof (single pyramid over the TOP floor only)
  const topBaseY = topFloor * FLOOR_H;
  const roofMat = new THREE.MeshStandardMaterial({ color: '#8a3d1e', roughness: 0.7, side: THREE.DoubleSide });
  const roofBase = Math.max(PROJECT.width, PROJECT.length);
  const roofGeo = new THREE.ConeGeometry(roofBase * 0.72, ROOF_H, 4, 1);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, topBaseY + WALL_H + ROOF_H / 2, 0);
  roofGroup.add(roof);
  // Eave slab
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(PROJECT.width + ROOF_OVERHANG, 0.06, PROJECT.length + ROOF_OVERHANG),
    new THREE.MeshStandardMaterial({ color: '#7a3418', roughness: 0.9 })
  );
  eave.position.set(0, topBaseY + WALL_H + 0.03, 0);
  roofGroup.add(eave);

  // Controls
  let autoRotate = false;
  document.getElementById('btnRotate').addEventListener('click', function(){
    autoRotate = !autoRotate;
    this.classList.toggle('on', autoRotate);
    this.textContent = autoRotate ? '■ Parar' : '▶ Girar';
  });
  document.getElementById('btnRoof').addEventListener('click', function(){
    roofGroup.visible = !roofGroup.visible;
    this.classList.toggle('on', roofGroup.visible);
  });
  document.getElementById('btnLabels').addEventListener('click', function(){
    labelGroup.visible = !labelGroup.visible;
    this.classList.toggle('on', labelGroup.visible);
  });
  document.getElementById('btnTop').addEventListener('click', function(){
    camera.position.set(0, diag * 1.4, 0.01);
    controls.target.set(0, midY * 0.6, 0);
    controls.update();
  });

  window.addEventListener('resize', function(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Fade tip
  setTimeout(function(){ const t = document.getElementById('tip'); if (t) t.style.opacity = 0; }, 3200);

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
    renderer.render(scene, camera);
  }
  animate();
})();
</script>
</body></html>`;
}
