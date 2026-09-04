// Biblioteca de peças de mobiliário posicionáveis + UI de posicionamento.
//
// Estes dois blocos são código JS puro injetado DENTRO do IIFE gerado por
// build3d.ts (portanto têm acesso a THREE, scene, camera, controls, canvas,
// PROJECT, roomRefs, placedItems). Não use crase nem ${ } aqui dentro: o
// conteúdo é interpolado no template literal de build3d.ts.
//
// Ver PATCH.md para os 6 pontos de aplicação.

export const FURNITURE_LIB_JS = `
  // ---------------- Peças posicionáveis ----------------
  var PMAT = {
    tecido:   new THREE.MeshStandardMaterial({ color: '#8E9A93', roughness: 0.92 }),
    almofada: new THREE.MeshStandardMaterial({ color: '#C7643C', roughness: 0.9 }),
    madeira:  new THREE.MeshStandardMaterial({ color: '#7A5334', roughness: 0.6 }),
    madClara: new THREE.MeshStandardMaterial({ color: '#C49A6C', roughness: 0.65 }),
    pedra:    new THREE.MeshStandardMaterial({ color: '#E4E1DA', roughness: 0.35 }),
    metal:    new THREE.MeshStandardMaterial({ color: '#BFBCB6', roughness: 0.3, metalness: 0.35 }),
    escuro:   new THREE.MeshStandardMaterial({ color: '#2B2B2D', roughness: 0.5 }),
    branco:   new THREE.MeshStandardMaterial({ color: '#F7F5F1', roughness: 0.45 }),
    tapete:   new THREE.MeshStandardMaterial({ color: '#D8CFC0', roughness: 0.98 }),
    verde:    new THREE.MeshStandardMaterial({ color: '#4E7A50', roughness: 0.9 })
  };

  function pbox(w, h, d, m, x, y, z, ry) {
    var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    if (ry) o.rotation.y = ry;
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }
  function pcyl(r, h, m, x, y, z, seg) {
    var o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 20), m);
    o.position.set(x, y, z);
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }
  function plegs(g, w, d, h, m, inset, r) {
    inset = inset || 0.09; r = r || 0.03;
    var sx, sz;
    for (sx = -1; sx <= 1; sx += 2)
      for (sz = -1; sz <= 1; sz += 2)
        g.add(pcyl(r, h, m, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), 10));
  }

  var PIECES = {
    sofa3: function () {
      var g = new THREE.Group(), w = 2.15, d = 0.92, i, xs = [-w / 2 + 0.42, 0, w / 2 - 0.42];
      g.add(pbox(w, 0.28, d, PMAT.tecido, 0, 0.28, 0));
      for (i = 0; i < xs.length; i++) g.add(pbox(0.62, 0.16, d - 0.2, PMAT.tecido, xs[i], 0.5, 0.05));
      g.add(pbox(w, 0.62, 0.2, PMAT.tecido, 0, 0.59, -d / 2 + 0.1));
      g.add(pbox(0.2, 0.58, d, PMAT.tecido, -(w / 2 - 0.1), 0.43, 0));
      g.add(pbox(0.2, 0.58, d, PMAT.tecido, w / 2 - 0.1, 0.43, 0));
      g.add(pbox(0.4, 0.14, 0.36, PMAT.almofada, -0.6, 0.62, -d / 2 + 0.24, 0.2));
      g.add(pbox(0.4, 0.14, 0.36, PMAT.almofada, 0.62, 0.62, -d / 2 + 0.24, -0.15));
      plegs(g, w, d, 0.14, PMAT.madeira, 0.14);
      return { g: g, w: w, d: d };
    },
    poltrona: function () {
      var g = new THREE.Group(), w = 0.86, d = 0.88;
      g.add(pbox(w, 0.26, d, PMAT.almofada, 0, 0.3, 0));
      g.add(pbox(w - 0.16, 0.14, d - 0.2, PMAT.almofada, 0, 0.5, 0.04));
      g.add(pbox(w, 0.6, 0.18, PMAT.almofada, 0, 0.6, -d / 2 + 0.09));
      g.add(pbox(0.14, 0.5, d - 0.1, PMAT.almofada, -(w / 2 - 0.07), 0.45, 0.03));
      g.add(pbox(0.14, 0.5, d - 0.1, PMAT.almofada, w / 2 - 0.07, 0.45, 0.03));
      plegs(g, w, d, 0.18, PMAT.madeira, 0.12, 0.025);
      return { g: g, w: w, d: d };
    },
    mesaCentro: function () {
      var g = new THREE.Group(), w = 1.1, d = 0.6;
      g.add(pbox(w, 0.05, d, PMAT.madClara, 0, 0.4, 0));
      g.add(pbox(w - 0.24, 0.03, d - 0.18, PMAT.madClara, 0, 0.16, 0));
      plegs(g, w, d, 0.4, PMAT.escuro, 0.1, 0.022);
      g.add(pbox(0.24, 0.06, 0.18, PMAT.branco, 0.22, 0.455, 0.02));
      return { g: g, w: w, d: d };
    },
    tapete: function () {
      var g = new THREE.Group(), w = 2.4, d = 1.7;
      var t = pbox(w, 0.015, d, PMAT.tapete, 0, 0.008, 0);
      t.castShadow = false; g.add(t);
      g.add(pbox(w - 0.3, 0.017, d - 0.3, PMAT.tecido, 0, 0.009, 0));
      return { g: g, w: w, d: d };
    },
    rackTV: function () {
      var g = new THREE.Group(), w = 1.8, d = 0.42;
      g.add(pbox(w, 0.42, d, PMAT.madeira, 0, 0.33, 0));
      g.add(pbox(w / 2 - 0.04, 0.3, 0.02, PMAT.escuro, -w / 4, 0.33, d / 2 + 0.005));
      g.add(pbox(w / 2 - 0.04, 0.3, 0.02, PMAT.escuro, w / 4, 0.33, d / 2 + 0.005));
      plegs(g, w, d, 0.12, PMAT.escuro, 0.12, 0.02);
      g.add(pbox(0.34, 0.03, 0.2, PMAT.escuro, 0, 0.56, 0));
      g.add(pbox(0.08, 0.32, 0.06, PMAT.escuro, 0, 0.71, 0));
      g.add(pbox(1.34, 0.78, 0.05, PMAT.escuro, 0, 1.26, 0));
      return { g: g, w: w, d: d };
    },
    camaQueen: function () {
      var g = new THREE.Group(), w = 1.62, d = 2.05;
      g.add(pbox(w, 0.3, d, PMAT.madeira, 0, 0.22, 0));
      g.add(pbox(w - 0.06, 0.26, d - 0.08, PMAT.branco, 0, 0.5, 0));
      g.add(pbox(w - 0.06, 0.1, d * 0.6, PMAT.tecido, 0, 0.66, d * 0.18));
      g.add(pbox(0.62, 0.16, 0.34, PMAT.branco, -0.38, 0.71, -d / 2 + 0.3));
      g.add(pbox(0.62, 0.16, 0.34, PMAT.branco, 0.38, 0.71, -d / 2 + 0.3));
      g.add(pbox(w + 0.1, 0.95, 0.08, PMAT.madeira, 0, 0.48, -d / 2 - 0.02));
      plegs(g, w, d, 0.1, PMAT.escuro, 0.12, 0.025);
      return { g: g, w: w, d: d };
    },
    criadoMudo: function () {
      var g = new THREE.Group(), w = 0.46, d = 0.4;
      g.add(pbox(w, 0.4, d, PMAT.madeira, 0, 0.42, 0));
      g.add(pbox(w - 0.08, 0.02, 0.02, PMAT.metal, 0, 0.42, d / 2 + 0.01));
      plegs(g, w, d, 0.22, PMAT.escuro, 0.07, 0.018);
      g.add(pcyl(0.09, 0.02, PMAT.escuro, 0, 0.63, 0, 16));
      g.add(pcyl(0.012, 0.24, PMAT.metal, 0, 0.75, 0, 8));
      var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.18, 20, 1, true), PMAT.branco);
      cup.position.set(0, 0.94, 0); cup.castShadow = true; cup.material.side = THREE.DoubleSide;
      g.add(cup);
      return { g: g, w: w, d: d };
    },
    guardaRoupa: function () {
      var g = new THREE.Group(), w = 1.8, d = 0.6, s;
      g.add(pbox(w, 2.3, d, PMAT.branco, 0, 1.15, 0));
      for (s = -1; s <= 1; s += 2) {
        g.add(pbox(w / 2 - 0.02, 2.2, 0.02, PMAT.madClara, s * w / 4, 1.18, d / 2 + 0.012));
        g.add(pcyl(0.012, 0.5, PMAT.metal, s * 0.07, 1.25, d / 2 + 0.03, 8));
      }
      return { g: g, w: w, d: d };
    },
    bancadaIlha: function () {
      var g = new THREE.Group(), w = 1.9, d = 0.75, s, bx;
      g.add(pbox(w, 0.82, d, PMAT.branco, 0, 0.41, 0));
      g.add(pbox(w + 0.08, 0.06, d + 0.08, PMAT.pedra, 0, 0.85, 0));
      g.add(pbox(0.5, 0.03, 0.36, PMAT.metal, -0.4, 0.86, 0));
      g.add(pcyl(0.02, 0.3, PMAT.metal, -0.4, 1.0, -0.16, 10));
      for (s = -1; s <= 1; s += 2) {
        bx = s * 0.5;
        g.add(pcyl(0.17, 0.06, PMAT.madClara, bx, 0.68, d / 2 + 0.34, 20));
        g.add(pcyl(0.03, 0.65, PMAT.escuro, bx, 0.33, d / 2 + 0.34, 10));
        g.add(pcyl(0.17, 0.02, PMAT.escuro, bx, 0.01, d / 2 + 0.34, 20));
      }
      return { g: g, w: w, d: d };
    },
    bancadaDivisoria: function () {
      var g = new THREE.Group(), w = 2.6, d = 0.42, i;
      g.add(pbox(w, 1.05, d, PMAT.madClara, 0, 0.525, 0));
      g.add(pbox(w + 0.14, 0.06, d + 0.18, PMAT.pedra, 0, 1.08, 0.02));
      for (i = 0; i < 5; i++) g.add(pbox(0.03, 0.9, 0.03, PMAT.escuro, -w / 2 + 0.3 + i * ((w - 0.6) / 4), 0.55, d / 2 + 0.02));
      return { g: g, w: w, d: d };
    },
    mesaJantar: function () {
      var g = new THREE.Group(), w = 1.7, d = 0.95, sz, sx, c, xs = [-0.42, 0.42];
      g.add(pbox(w, 0.06, d, PMAT.madeira, 0, 0.75, 0));
      plegs(g, w, d, 0.75, PMAT.madeira, 0.14, 0.035);
      for (sz = -1; sz <= 1; sz += 2) {
        for (sx = 0; sx < 2; sx++) {
          c = new THREE.Group();
          c.add(pbox(0.44, 0.05, 0.44, PMAT.madClara, 0, 0.45, 0));
          c.add(pbox(0.44, 0.48, 0.05, PMAT.madClara, 0, 0.7, -0.2 * sz));
          plegs(c, 0.44, 0.44, 0.45, PMAT.escuro, 0.05, 0.018);
          c.position.set(xs[sx], 0, sz * 0.78);
          g.add(c);
        }
      }
      return { g: g, w: w, d: d };
    },
    geladeira: function () {
      var g = new THREE.Group(), w = 0.75, d = 0.72;
      g.add(pbox(w, 1.85, d, PMAT.metal, 0, 0.94, 0));
      g.add(pbox(w - 0.02, 0.02, d, PMAT.escuro, 0, 1.24, 0.002));
      g.add(pbox(0.03, 0.34, 0.03, PMAT.escuro, w / 2 - 0.12, 1.55, d / 2 + 0.02));
      g.add(pbox(0.03, 0.72, 0.03, PMAT.escuro, w / 2 - 0.12, 0.62, d / 2 + 0.02));
      return { g: g, w: w, d: d };
    },
    armarioCozinha: function () {
      var g = new THREE.Group(), w = 2.2, d = 0.62, i;
      g.add(pbox(w, 0.84, d, PMAT.branco, 0, 0.46, 0));
      g.add(pbox(w + 0.04, 0.05, d + 0.04, PMAT.pedra, 0, 0.9, 0));
      for (i = 0; i < 3; i++) g.add(pbox(w / 3 - 0.03, 0.74, 0.02, PMAT.madClara, -w / 3 + i * (w / 3), 0.46, d / 2 + 0.012));
      g.add(pbox(w, 0.7, 0.36, PMAT.branco, 0, 1.85, -d / 2 + 0.18));
      g.add(pbox(0.58, 0.03, 0.4, PMAT.metal, 0.4, 0.925, 0));
      return { g: g, w: w, d: d };
    },
    planta: function () {
      var g = new THREE.Group(), w = 0.5, d = 0.5, i, a, f;
      var vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.36, 24), PMAT.pedra);
      vaso.position.y = 0.18; vaso.castShadow = true; g.add(vaso);
      g.add(pcyl(0.02, 0.5, PMAT.madeira, 0, 0.55, 0, 8));
      for (i = 0; i < 7; i++) {
        a = (i / 7) * Math.PI * 2;
        f = pbox(0.34, 0.02, 0.16, PMAT.verde, Math.cos(a) * 0.19, 0.78 + (i % 3) * 0.12, Math.sin(a) * 0.19, -a);
        f.rotation.z = 0.35;
        g.add(f);
      }
      return { g: g, w: w, d: d };
    }
  };

  var PIECE_LIST = [
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
    { id: 'bancadaDivisoria', cat: 'Divisórias', label: 'Bancada divisória', dim: '2,60 × 0,42 m' }
  ];

  function pieceLabel(id) {
    var i;
    for (i = 0; i < PIECE_LIST.length; i++) if (PIECE_LIST[i].id === id) return PIECE_LIST[i].label;
    return id;
  }
  function buildPiece(id) {
    var b = PIECES[id];
    return b ? b() : null;
  }
`;

export const PLACEMENT_UI_JS = `
  // ---------------- Modo "Mobiliar": adicionar, arrastar, girar, excluir ----------------
  (function placementUI() {
    var style = document.createElement('style');
    style.textContent =
      '#fsheet{position:fixed;left:0;right:0;bottom:0;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -8px 28px rgba(0,0,0,.14);' +
      'transform:translateY(102%);transition:transform .25s ease;z-index:40;max-height:52vh;display:flex;flex-direction:column;}' +
      '#fsheet.open{transform:translateY(0);}' +
      '#fsheet .hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 6px;}' +
      '#fsheet .hd b{font-size:15px;}' +
      '#fsheet .hd button{background:none;border:none;font-size:13px;font-weight:700;color:#C85A32;}' +
      '#fcats{display:flex;gap:8px;padding:0 16px 10px;overflow-x:auto;}' +
      '#fcats button{flex:0 0 auto;border:1px solid #E2DFD8;background:#F8F7F4;border-radius:999px;padding:8px 14px;font-size:12.5px;font-weight:600;color:#706F6A;}' +
      '#fcats button.on{background:#FCECE6;border-color:#C85A32;color:#C85A32;}' +
      '#fgrid{overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 22px;}' +
      '#fgrid button{border:1px solid #E2DFD8;background:#F8F7F4;border-radius:14px;padding:10px 6px;min-height:66px;}' +
      '#fgrid button b{display:block;font-size:11px;line-height:1.2;}' +
      '#fgrid button i{display:block;font-size:10px;color:#706F6A;font-style:normal;margin-top:3px;}' +
      '#fbar{position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:8px;align-items:center;background:rgba(26,26,26,.92);' +
      'color:#fff;border-radius:16px;padding:8px 10px;z-index:41;}' +
      '#fbar.on{display:flex;}' +
      '#fbar .nm{flex:1;min-width:0;font-size:13px;font-weight:600;padding-left:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#fbar button{min-width:44px;height:44px;border:none;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:13px;font-weight:600;white-space:nowrap;padding:0 10px;}' +
      '#fbar button.del{background:rgba(211,47,47,.9);}';
    document.head.appendChild(style);

    var sheet = document.createElement('div');
    sheet.id = 'fsheet';
    sheet.innerHTML = '<div class="hd"><b>Adicionar peça</b><button id="fclose">Fechar</button></div>' +
      '<div id="fcats"></div><div id="fgrid"></div>';
    document.body.appendChild(sheet);

    var bar = document.createElement('div');
    bar.id = 'fbar';
    bar.innerHTML = '<span class="nm" id="fname"></span>' +
      '<button id="frotl" aria-label="Girar à esquerda">↺</button>' +
      '<button id="frotr" aria-label="Girar à direita">↻</button>' +
      '<button id="fdup">Duplicar</button><button id="fdel" class="del">Excluir</button>';
    document.body.appendChild(bar);

    var btnFurn = document.createElement('button');
    btnFurn.id = 'btnFurn';
    btnFurn.textContent = 'Mobiliar';
    document.getElementById('hud').insertBefore(btnFurn, document.getElementById('btnShare'));

    var selected = null, dragging = null, snapWalls = true;
    var rayc = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitPt = new THREE.Vector3();
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), grab = new THREE.Vector3();

    function roomOf(id) {
      var i;
      for (i = 0; i < roomRefs.length; i++) if (roomRefs[i].id === id) return roomRefs[i];
      return null;
    }
    function roomAt(x, z, floor) {
      var i, r;
      for (i = 0; i < roomRefs.length; i++) {
        r = roomRefs[i];
        if (r.floor !== floor) continue;
        if (Math.abs(x - r.rx) <= r.w / 2 && Math.abs(z - r.rz) <= r.l / 2) return r;
      }
      return null;
    }

    function select(g) {
      selected = g;
      bar.className = g ? 'on' : '';
      if (g) document.getElementById('fname').textContent = pieceLabel(g.userData.kind);
    }

    function addPiece(kind, room) {
      var built = buildPiece(kind);
      if (!built || !room) return null;
      built.g.position.set(room.rx, room.baseY + 0.02, room.rz);
      built.g.userData = { roomId: room.id, kind: kind, w: built.w, d: built.d, baseY: room.baseY + 0.02 };
      floorGroups[room.floor].add(built.g);
      placedItems.push(built.g);
      select(built.g);
      return built.g;
    }

    function pick(ev) {
      var t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      var r = canvas.getBoundingClientRect();
      ndc.set(((t.clientX - r.left) / r.width) * 2 - 1, -((t.clientY - r.top) / r.height) * 2 + 1);
      rayc.setFromCamera(ndc, camera);
      var inter = rayc.intersectObjects(placedItems, true);
      if (!inter.length) return null;
      var o = inter[0].object;
      while (o.parent && placedItems.indexOf(o) === -1) o = o.parent;
      return placedItems.indexOf(o) === -1 ? null : o;
    }

    function onDown(ev) {
      if (!document.body.classList.contains('furnish')) return;
      var p = pick(ev);
      if (!p) { select(null); return; }
      select(p);
      dragging = p;
      controls.enabled = false;
      plane.constant = -p.userData.baseY;
      rayc.ray.intersectPlane(plane, hitPt);
      grab.copy(p.position).sub(hitPt);
      ev.preventDefault();
    }
    function onMove(ev) {
      if (!dragging) return;
      var t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      var r = canvas.getBoundingClientRect();
      ndc.set(((t.clientX - r.left) / r.width) * 2 - 1, -((t.clientY - r.top) / r.height) * 2 + 1);
      rayc.setFromCamera(ndc, camera);
      if (!rayc.ray.intersectPlane(plane, hitPt)) return;
      var x = hitPt.x + grab.x, z = hitPt.z + grab.z;
      var room = roomOf(dragging.userData.roomId);
      var target = roomAt(x, z, room.floor) || room;
      if (target.id !== room.id) { dragging.userData.roomId = target.id; room = target; }
      var rot = Math.abs(Math.round(dragging.rotation.y / (Math.PI / 2))) % 2 === 1;
      var ew = (rot ? dragging.userData.d : dragging.userData.w) / 2;
      var ed = (rot ? dragging.userData.w : dragging.userData.d) / 2;
      var minX = room.rx - room.w / 2 + ew, maxX = room.rx + room.w / 2 - ew;
      var minZ = room.rz - room.l / 2 + ed, maxZ = room.rz + room.l / 2 - ed;
      x = Math.max(minX, Math.min(maxX, x));
      z = Math.max(minZ, Math.min(maxZ, z));
      if (snapWalls) {
        var t2 = 0.45;
        if (x - minX < t2) { x = minX + 0.02; dragging.rotation.y = Math.PI / 2; }
        else if (maxX - x < t2) { x = maxX - 0.02; dragging.rotation.y = -Math.PI / 2; }
        else if (z - minZ < t2) { z = minZ + 0.02; dragging.rotation.y = 0; }
        else if (maxZ - z < t2) { z = maxZ - 0.02; dragging.rotation.y = Math.PI; }
      }
      dragging.position.set(Math.round(x * 20) / 20, dragging.userData.baseY, Math.round(z * 20) / 20);
      ev.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = null;
      controls.enabled = true;
      saveItems();
    }
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);

    document.getElementById('frotl').onclick = function () { if (selected) { selected.rotation.y -= Math.PI / 4; saveItems(); } };
    document.getElementById('frotr').onclick = function () { if (selected) { selected.rotation.y += Math.PI / 4; saveItems(); } };
    document.getElementById('fdel').onclick = function () {
      if (!selected) return;
      selected.parent.remove(selected);
      placedItems.splice(placedItems.indexOf(selected), 1);
      select(null);
      saveItems();
    };
    document.getElementById('fdup').onclick = function () {
      if (!selected) return;
      var src = selected;
      var g = addPiece(src.userData.kind, roomOf(src.userData.roomId));
      if (!g) return;
      g.rotation.y = src.rotation.y;
      g.position.set(src.position.x + 0.4, src.position.y, src.position.z + 0.4);
      saveItems();
    };

    // catálogo
    var cats = ['Sala', 'Quarto', 'Cozinha', 'Divisórias'], activeCat = 'Sala';
    function renderCats() {
      var el = document.getElementById('fcats'), i, b;
      el.innerHTML = '';
      for (i = 0; i < cats.length; i++) {
        b = document.createElement('button');
        b.textContent = cats[i];
        if (cats[i] === activeCat) b.className = 'on';
        (function (c) { b.onclick = function () { activeCat = c; renderCats(); renderItems(); }; })(cats[i]);
        el.appendChild(b);
      }
    }
    function targetRoom() {
      // O cômodo mais perto do ponto para onde a câmera está olhando, considerando só o
      // andar visível. Assim a peça cai onde a pessoa está de fato olhando, e nunca num
      // andar que está escondido.
      var best = null, bestD = Infinity, i, r, d, fx = controls.target.x, fz = controls.target.z;
      for (i = 0; i < roomRefs.length; i++) {
        r = roomRefs[i];
        if (['grass', 'asphalt', 'pool', 'deck', 'outdoor'].indexOf(r.kind) !== -1) continue;
        if (!floorGroups[r.floor] || !floorGroups[r.floor].visible) continue;
        d = Math.abs(fx - r.rx) + Math.abs(fz - r.rz);
        if (d < bestD) { bestD = d; best = r; }
      }
      if (best) return best;
      // Nenhum andar visível casou (andar só de área externa, por exemplo): cai no maior
      // cômodo fechado, para o botão nunca ficar sem efeito.
      for (i = 0; i < roomRefs.length; i++) {
        r = roomRefs[i];
        if (['grass', 'asphalt', 'pool', 'deck', 'outdoor'].indexOf(r.kind) !== -1) continue;
        if (!best || r.w * r.l > best.w * best.l) best = r;
      }
      return best;
    }
    function renderItems() {
      var el = document.getElementById('fgrid'), i, e, b;
      el.innerHTML = '';
      for (i = 0; i < PIECE_LIST.length; i++) {
        e = PIECE_LIST[i];
        if (e.cat !== activeCat) continue;
        b = document.createElement('button');
        b.innerHTML = '<b>' + e.label + '</b><i>' + e.dim + '</i>';
        (function (kind) {
          b.onclick = function () {
            var room = targetRoom();
            if (!room) {
              var tipEl = document.getElementById('tip');
              if (tipEl) tipEl.textContent = 'Adicione um cômodo fechado antes de mobiliar';
              return;
            }
            addPiece(kind, room);
            saveItems();
          };
        })(e.id);
        el.appendChild(b);
      }
    }
    renderCats(); renderItems();

    document.getElementById('fclose').onclick = function () { sheet.classList.remove('open'); };
    btnFurn.onclick = function () {
      // The isolated-room view hides floorGroups, and pieces are added to floorGroups —
      // so furnishing from inside it would drop invisible furniture. Step back out first.
      if (typeof currentRoom !== 'undefined' && currentRoom && typeof exitRoom === 'function') exitRoom();
      var on = document.body.classList.toggle('furnish');
      btnFurn.classList.toggle('on', on);
      sheet.classList.toggle('open', on);
      if (!on) { select(null); }
      var tip = document.getElementById('tip');
      if (tip) tip.textContent = on ? 'Toque numa peça para adicionar · arraste para posicionar' : 'Arraste para girar · toque num cômodo para ver por dentro';
    };

    // persistência: devolve os itens agrupados por cômodo para o React Native
    function saveItems() {
      var byRoom = {}, i, g, r;
      for (i = 0; i < placedItems.length; i++) {
        g = placedItems[i];
        r = roomOf(g.userData.roomId);
        if (!r) continue;
        (byRoom[r.id] = byRoom[r.id] || []).push({
          kind: g.userData.kind,
          x: Math.round((g.position.x - r.rx) * 100) / 100,
          z: Math.round((g.position.z - r.rz) * 100) / 100,
          ry: Math.round(g.rotation.y * 1000) / 1000
        });
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'save_items', rooms: byRoom }));
      }
    }
  })();
`;
