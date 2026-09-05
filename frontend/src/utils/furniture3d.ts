// Biblioteca de peças 3D — 36 construtores (móveis, área externa, mansão).
//
// JS puro injetado no HTML da WebView por build3d.ts. Depende de um THREE
// global (three.js por <script>, não import) e nada mais.
//
// Ver PATCH.md.

export const FURNITURE_LIB_JS = `

const M = {
  piso:     m('piso_madeira', 0xB08556, 0.72),
  pisoFrio: m('porcelanato', 0xDDD8CF, 0.35),
  parede:   m('parede', 0xF1EDE6, 0.95),
  rodape:   m('rodape', 0xFFFFFF, 0.6),
  tecido:   m('tecido', 0x8E9A93, 0.92),
  almofada: m('tecido_almofada', 0xC7643C, 0.9),
  madeira:  m('madeira', 0x7A5334, 0.6),
  madClara: m('madeira_clara', 0xC49A6C, 0.65),
  pedra:    m('pedra', 0xE4E1DA, 0.35),
  metal:    m('metal', 0xBFBCB6, 0.3, 0.35),
  escuro:   m('preto_fosco', 0x2B2B2D, 0.5),
  branco:   m('laca_branca', 0xF7F5F1, 0.45),
  tapete:   m('tapete', 0xD8CFC0, 0.98),
  verde:    m('folhagem', 0x4E7A50, 0.9),
  telha:    m('telha', 0xA9543A, 0.82),
  grama:    m('grama', 0x7E9463, 0.98),
  vidro:    new THREE.MeshStandardMaterial({ name: 'vidro', color: 0xA9C0CA, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.34 }),
  agua:     new THREE.MeshStandardMaterial({ name: 'agua', color: 0x3D7F96, roughness: 0.05, metalness: 0.35, transparent: true, opacity: 0.88 }),
  deck:     m('deck_madeira', 0x9A7248, 0.8),
  tijolo:   m('tijolo', 0xA45B3E, 0.88),
  lona:     m('lona', 0xE7E2D6, 0.95),
  tronco:   m('tronco', 0x5E4632, 0.9),
  carro:    m('pintura_carro', 0x33383D, 0.35, 0.5),
};
function m(name, color, roughness, metalness = 0) {
  const mm = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  mm.name = name; return mm;
}

function box(w, h, d, mat, x, y, z, name, ry = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  o.position.set(x, y, z); o.rotation.y = ry;
  o.castShadow = true; o.receiveShadow = true; o.name = name;
  return o;
}
function cyl(r, h, mat, x, y, z, name, seg = 20) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.name = name;
  return o;
}
function legs(g, w, d, h, mat, inset = 0.09, r = 0.03) {
  let i = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    g.add(cyl(r, h, mat, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), 'pe' + (++i), 10));
}

const PIECES = {
  sofa3() {
    const g = new THREE.Group(), w = 2.15, d = 0.92;
    g.add(box(w, 0.28, d, M.tecido, 0, 0.28, 0, 'sofa_base'));
    for (const x of [-w / 2 + 0.42, 0, w / 2 - 0.42]) g.add(box(0.62, 0.16, d - 0.2, M.tecido, x, 0.5, 0.05, 'assento'));
    g.add(box(w, 0.62, 0.2, M.tecido, 0, 0.59, -d / 2 + 0.1, 'encosto'));
    for (const s of [-1, 1]) g.add(box(0.2, 0.58, d, M.tecido, s * (w / 2 - 0.1), 0.43, 0, 'braco'));
    g.add(box(0.4, 0.14, 0.36, M.almofada, -0.6, 0.62, -d / 2 + 0.24, 'almofada1', 0.2));
    g.add(box(0.4, 0.14, 0.36, M.almofada, 0.62, 0.62, -d / 2 + 0.24, 'almofada2', -0.15));
    legs(g, w, d, 0.14, M.madeira, 0.14);
    return { g, w, d };
  },
  poltrona() {
    const g = new THREE.Group(), w = 0.86, d = 0.88;
    g.add(box(w, 0.26, d, M.almofada, 0, 0.3, 0, 'base'));
    g.add(box(w - 0.16, 0.14, d - 0.2, M.almofada, 0, 0.5, 0.04, 'assento'));
    g.add(box(w, 0.6, 0.18, M.almofada, 0, 0.6, -d / 2 + 0.09, 'encosto'));
    for (const s of [-1, 1]) g.add(box(0.14, 0.5, d - 0.1, M.almofada, s * (w / 2 - 0.07), 0.45, 0.03, 'braco'));
    legs(g, w, d, 0.18, M.madeira, 0.12, 0.025);
    return { g, w, d };
  },
  mesaCentro() {
    const g = new THREE.Group(), w = 1.1, d = 0.6;
    g.add(box(w, 0.05, d, M.madClara, 0, 0.4, 0, 'tampo'));
    g.add(box(w - 0.24, 0.03, d - 0.18, M.madClara, 0, 0.16, 0, 'prateleira'));
    legs(g, w, d, 0.4, M.escuro, 0.1, 0.022);
    g.add(box(0.24, 0.06, 0.18, M.branco, 0.22, 0.455, 0.02, 'livros'));
    return { g, w, d };
  },
  tapete() {
    const g = new THREE.Group(), w = 2.4, d = 1.7;
    const t = box(w, 0.015, d, M.tapete, 0, 0.008, 0, 'tapete'); t.castShadow = false; g.add(t);
    g.add(box(w - 0.3, 0.017, d - 0.3, M.tecido, 0, 0.009, 0, 'tapete_centro'));
    return { g, w, d };
  },
  rackTV() {
    const g = new THREE.Group(), w = 1.8, d = 0.42;
    g.add(box(w, 0.42, d, M.madeira, 0, 0.33, 0, 'rack_corpo'));
    for (const s of [-1, 1]) g.add(box(w / 2 - 0.04, 0.3, 0.02, M.escuro, s * w / 4, 0.33, d / 2 + 0.005, 'gaveta'));
    legs(g, w, d, 0.12, M.escuro, 0.12, 0.02);
    g.add(box(0.34, 0.03, 0.2, M.escuro, 0, 0.56, 0, 'tv_base'));
    g.add(box(0.08, 0.32, 0.06, M.escuro, 0, 0.71, 0, 'tv_haste'));
    g.add(box(1.34, 0.78, 0.05, M.escuro, 0, 1.26, 0, 'tv_painel'));
    return { g, w, d };
  },
  camaQueen() {
    const g = new THREE.Group(), w = 1.62, d = 2.05;
    g.add(box(w, 0.3, d, M.madeira, 0, 0.22, 0, 'estrado'));
    g.add(box(w - 0.06, 0.26, d - 0.08, M.branco, 0, 0.5, 0, 'colchao'));
    g.add(box(w - 0.06, 0.1, d * 0.6, M.tecido, 0, 0.66, d * 0.18, 'edredom'));
    for (const s of [-1, 1]) g.add(box(0.62, 0.16, 0.34, M.branco, s * 0.38, 0.71, -d / 2 + 0.3, 'travesseiro'));
    g.add(box(w + 0.1, 0.95, 0.08, M.madeira, 0, 0.48, -d / 2 - 0.02, 'cabeceira'));
    legs(g, w, d, 0.1, M.escuro, 0.12, 0.025);
    return { g, w, d };
  },
  criadoMudo() {
    const g = new THREE.Group(), w = 0.46, d = 0.4;
    g.add(box(w, 0.4, d, M.madeira, 0, 0.42, 0, 'corpo'));
    g.add(box(w - 0.08, 0.02, 0.02, M.metal, 0, 0.42, d / 2 + 0.01, 'puxador'));
    legs(g, w, d, 0.22, M.escuro, 0.07, 0.018);
    g.add(cyl(0.09, 0.02, M.escuro, 0, 0.63, 0, 'abajur_base', 16));
    g.add(cyl(0.012, 0.24, M.metal, 0, 0.75, 0, 'abajur_haste', 8));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.18, 20, 1, true), M.branco);
    cup.position.set(0, 0.94, 0); cup.name = 'abajur_cupula'; cup.castShadow = true;
    cup.material.side = THREE.DoubleSide; g.add(cup);
    return { g, w, d };
  },
  guardaRoupa() {
    const g = new THREE.Group(), w = 1.8, d = 0.6;
    g.add(box(w, 2.3, d, M.branco, 0, 1.15, 0, 'corpo'));
    for (const s of [-1, 1]) {
      g.add(box(w / 2 - 0.02, 2.2, 0.02, M.madClara, s * w / 4, 1.18, d / 2 + 0.012, 'porta'));
      g.add(cyl(0.012, 0.5, M.metal, s * 0.07, 1.25, d / 2 + 0.03, 'puxador', 8));
    }
    return { g, w, d };
  },
  bancadaIlha() {
    const g = new THREE.Group(), w = 1.9, d = 0.75;
    g.add(box(w, 0.82, d, M.branco, 0, 0.41, 0, 'corpo'));
    g.add(box(w + 0.08, 0.06, d + 0.08, M.pedra, 0, 0.85, 0, 'tampo_pedra'));
    g.add(box(0.5, 0.03, 0.36, M.metal, -0.4, 0.86, 0, 'cuba'));
    g.add(cyl(0.02, 0.3, M.metal, -0.4, 1.0, -0.16, 'torneira', 10));
    for (const s of [-1, 1]) {
      const bx = s * 0.5;
      g.add(cyl(0.17, 0.06, M.madClara, bx, 0.68, d / 2 + 0.34, 'banqueta_assento', 20));
      g.add(cyl(0.03, 0.65, M.escuro, bx, 0.33, d / 2 + 0.34, 'banqueta_haste', 10));
      g.add(cyl(0.17, 0.02, M.escuro, bx, 0.01, d / 2 + 0.34, 'banqueta_base', 20));
    }
    return { g, w, d };
  },
  bancadaDivisoria() {
    const g = new THREE.Group(), w = 2.6, d = 0.42;
    g.add(box(w, 1.05, d, M.madClara, 0, 0.525, 0, 'corpo'));
    g.add(box(w + 0.14, 0.06, d + 0.18, M.pedra, 0, 1.08, 0.02, 'tampo_pedra'));
    for (let i = 0; i < 5; i++) g.add(box(0.03, 0.9, 0.03, M.escuro, -w / 2 + 0.3 + i * ((w - 0.6) / 4), 0.55, d / 2 + 0.02, 'ripa' + i));
    return { g, w, d };
  },
  mesaJantar() {
    const g = new THREE.Group(), w = 1.7, d = 0.95;
    g.add(box(w, 0.06, d, M.madeira, 0, 0.75, 0, 'tampo'));
    legs(g, w, d, 0.75, M.madeira, 0.14, 0.035);
    for (const sz of [-1, 1]) for (const sx of [-0.42, 0.42]) {
      const c = new THREE.Group(); c.name = 'cadeira';
      c.add(box(0.44, 0.05, 0.44, M.madClara, 0, 0.45, 0, 'assento'));
      c.add(box(0.44, 0.48, 0.05, M.madClara, 0, 0.7, -0.2 * sz, 'encosto'));
      legs(c, 0.44, 0.44, 0.45, M.escuro, 0.05, 0.018);
      c.position.set(sx, 0, sz * 0.78);
      g.add(c);
    }
    return { g, w, d };
  },
  geladeira() {
    const g = new THREE.Group(), w = 0.75, d = 0.72;
    g.add(box(w, 1.85, d, M.metal, 0, 0.94, 0, 'corpo'));
    g.add(box(w - 0.02, 0.02, d, M.escuro, 0, 1.24, 0.002, 'vinco'));
    g.add(box(0.03, 0.34, 0.03, M.escuro, w / 2 - 0.12, 1.55, d / 2 + 0.02, 'puxador_sup'));
    g.add(box(0.03, 0.72, 0.03, M.escuro, w / 2 - 0.12, 0.62, d / 2 + 0.02, 'puxador_inf'));
    return { g, w, d };
  },
  armarioCozinha() {
    const g = new THREE.Group(), w = 2.2, d = 0.62;
    g.add(box(w, 0.84, d, M.branco, 0, 0.46, 0, 'balcao'));
    g.add(box(w + 0.04, 0.05, d + 0.04, M.pedra, 0, 0.9, 0, 'bancada_pedra'));
    for (let i = 0; i < 3; i++) g.add(box(w / 3 - 0.03, 0.74, 0.02, M.madClara, -w / 3 + i * (w / 3), 0.46, d / 2 + 0.012, 'porta' + i));
    g.add(box(w, 0.7, 0.36, M.branco, 0, 1.85, -d / 2 + 0.18, 'aereo'));
    g.add(box(0.58, 0.03, 0.4, M.metal, 0.4, 0.925, 0, 'cooktop'));
    return { g, w, d };
  },
  planta() {
    const g = new THREE.Group(), w = 0.5, d = 0.5;
    const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.36, 24), M.pedra);
    vaso.position.y = 0.18; vaso.castShadow = true; vaso.name = 'vaso'; g.add(vaso);
    g.add(cyl(0.02, 0.5, M.madeira, 0, 0.55, 0, 'caule', 8));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const f = box(0.34, 0.02, 0.16, M.verde, Math.cos(a) * 0.19, 0.78 + (i % 3) * 0.12, Math.sin(a) * 0.19, 'folha' + i, -a);
      f.rotation.z = 0.35; g.add(f);
    }
    return { g, w, d };
  },
  vasoSanitario() {
    const g = new THREE.Group(), w = 0.4, d = 0.68;
    g.add(box(0.36, 0.4, 0.5, M.branco, 0, 0.2, 0.05, 'bacia'));
    g.add(box(0.38, 0.05, 0.48, M.branco, 0, 0.42, 0.06, 'tampo'));
    g.add(box(0.4, 0.62, 0.18, M.branco, 0, 0.31, -0.24, 'caixa'));
    return { g, w, d };
  },
  pia() {
    const g = new THREE.Group(), w = 0.9, d = 0.5;
    g.add(box(w, 0.06, d, M.pedra, 0, 0.85, 0, 'bancada'));
    g.add(box(0.5, 0.16, 0.36, M.branco, 0, 0.78, 0.02, 'cuba'));
    g.add(cyl(0.02, 0.26, M.metal, 0, 1.0, -0.16, 'torneira', 10));
    g.add(box(w, 0.78, 0.02, M.branco, 0, 0.43, -d / 2 + 0.01, 'painel'));
    g.add(box(0.7, 0.9, 0.03, M.vidro, 0, 1.5, -d / 2 + 0.02, 'espelho'));
    return { g, w, d };
  },
  chuveiro() {
    const g = new THREE.Group(), w = 0.95, d = 0.95;
    const base = box(w, 0.06, d, M.pisoFrio, 0, 0.03, 0, 'base'); base.castShadow = false; g.add(base);
    for (const [x, z, ww, dd] of [[0, d / 2, w, 0.03], [w / 2, 0, 0.03, d]]) {
      const p = box(ww, 1.9, dd, M.vidro, x, 0.98, z, 'vidro_box'); p.castShadow = false; g.add(p);
    }
    g.add(cyl(0.015, 0.3, M.metal, -w / 2 + 0.12, 2.0, -d / 2 + 0.12, 'haste', 8));
    g.add(cyl(0.1, 0.03, M.metal, -w / 2 + 0.12, 1.95, -d / 2 + 0.26, 'ducha', 16));
    return { g, w, d };
  },

  // ---------------- área externa e lazer ----------------
  piscina() {
    const g = new THREE.Group(), w = 6.4, d = 3.4, b = 0.35;
    for (const [ww, dd, x, z] of [[w, b, 0, -d / 2 + b / 2], [w, b, 0, d / 2 - b / 2],
                                  [b, d - b * 2, -w / 2 + b / 2, 0], [b, d - b * 2, w / 2 - b / 2, 0]])
      g.add(box(ww, 0.14, dd, M.pedra, x, 0.07, z, 'borda'));
    const ag = box(w - b * 2, 0.06, d - b * 2, M.agua, 0, 0.03, 0, 'agua');
    ag.castShadow = false; g.add(ag);
    for (const s of [-1, 1]) g.add(box(w - b * 2, 1.3, 0.04, M.pisoFrio, 0, -0.62, s * (d / 2 - b), 'parede_interna'));
    for (let i = 0; i < 3; i++) g.add(box(0.9, 0.05, 0.26, M.pisoFrio, w / 2 - 1.0, -0.12 * i, -d / 2 + b + 0.16 + i * 0.26, 'degrau' + i));
    for (const s of [-1, 1]) g.add(cyl(0.025, 0.9, M.metal, w / 2 - 0.55 + s * 0.22, 0.5, -d / 2 + b + 0.1, 'corrimao', 10));
    return { g, w: w + 0.3, d: d + 0.3 };
  },
  jacuzzi() {
    const g = new THREE.Group(), w = 2.3, d = 2.3;
    const casco = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.0, 0.8, 32), M.deck);
    casco.position.y = 0.4; casco.castShadow = true; casco.receiveShadow = true; casco.name = 'casco';
    g.add(casco);
    const ag = cyl(1.02, 0.06, M.agua, 0, 0.78, 0, 'agua', 32); ag.castShadow = false; g.add(ag);
    g.add(cyl(1.15, 0.08, M.pedra, 0, 0.84, 0, 'borda', 32));
    return { g, w, d };
  },
  churrasqueira() {
    const g = new THREE.Group(), w = 2.6, d = 0.85;
    g.add(box(w, 0.9, d, M.tijolo, 0, 0.45, 0, 'base_alvenaria'));
    g.add(box(w + 0.1, 0.07, d + 0.1, M.pedra, 0, 0.93, 0, 'bancada'));
    g.add(box(1.3, 0.55, d - 0.1, M.tijolo, -w / 2 + 0.75, 1.24, 0, 'fornalha'));
    g.add(box(1.1, 0.03, d - 0.3, M.escuro, -w / 2 + 0.75, 1.3, 0, 'grelha'));
    const coifa = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.85, 0.75, 4), M.tijolo);
    coifa.position.set(-w / 2 + 0.75, 1.92, 0); coifa.rotation.y = Math.PI / 4;
    coifa.castShadow = true; coifa.name = 'coifa'; g.add(coifa);
    g.add(box(0.5, 0.9, 0.5, M.tijolo, -w / 2 + 0.75, 2.72, 0, 'chamine'));
    g.add(box(0.55, 0.03, 0.4, M.metal, w / 2 - 0.6, 0.965, 0, 'cuba'));
    return { g, w, d };
  },
  espreguicadeira() {
    const g = new THREE.Group(), w = 0.72, d = 1.95;
    g.add(box(w, 0.06, d * 0.62, M.deck, 0, 0.36, d * 0.18, 'assento'));
    const back = box(w, 0.06, d * 0.42, M.deck, 0, 0.55, -d * 0.26, 'encosto');
    back.rotation.x = -0.62; g.add(back);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      g.add(cyl(0.025, 0.34, M.metal, sx * (w / 2 - 0.06), 0.17, sz * (d * 0.28), 'pe', 10));
    g.add(box(w - 0.12, 0.08, 0.42, M.lona, 0, 0.62, -d * 0.12, 'almofada'));
    return { g, w, d };
  },
  mesaExterna() {
    const g = new THREE.Group(), w = 2.4, d = 2.4;
    g.add(cyl(0.78, 0.06, M.deck, 0, 0.74, 0, 'tampo', 28));
    g.add(cyl(0.07, 0.74, M.metal, 0, 0.37, 0, 'coluna', 12));
    g.add(cyl(0.42, 0.04, M.metal, 0, 0.02, 0, 'base', 20));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2, r = 1.05;
      const c = new THREE.Group();
      c.add(box(0.44, 0.05, 0.44, M.deck, 0, 0.44, 0, 'assento'));
      c.add(box(0.44, 0.46, 0.05, M.deck, 0, 0.68, -0.2, 'encosto'));
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        c.add(cyl(0.018, 0.44, M.metal, sx * 0.17, 0.22, sz * 0.17, 'pe', 8));
      c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      c.rotation.y = -a + Math.PI / 2;
      g.add(c);
    }
    g.add(cyl(0.035, 2.5, M.metal, 0, 1.25, 0, 'haste_guarda_sol', 12));
    const sol = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.42, 8), M.lona);
    sol.position.y = 2.36; sol.castShadow = true; sol.name = 'guarda_sol'; g.add(sol);
    return { g, w, d };
  },
  deckMadeira() {
    const g = new THREE.Group(), w = 4.0, d = 3.0, n = 14;
    for (let i = 0; i < n; i++) {
      const t = box(w, 0.06, d / n - 0.02, M.deck, 0, 0.03, -d / 2 + (i + 0.5) * (d / n), 'tabua' + i);
      t.castShadow = false; g.add(t);
    }
    return { g, w, d };
  },
  sofaExterno() {
    const g = new THREE.Group(), w = 2.0, d = 0.95;
    g.add(box(w, 0.34, d, M.deck, 0, 0.2, 0, 'estrutura'));
    g.add(box(w - 0.14, 0.18, d - 0.16, M.lona, 0, 0.46, 0.04, 'assento'));
    g.add(box(w - 0.14, 0.5, 0.2, M.lona, 0, 0.6, -d / 2 + 0.12, 'encosto'));
    for (const s of [-1, 1]) g.add(box(0.14, 0.5, d, M.deck, s * (w / 2 - 0.07), 0.45, 0, 'braco'));
    g.add(box(0.38, 0.13, 0.34, M.almofada, -0.55, 0.6, -d / 2 + 0.28, 'almofada'));
    return { g, w, d };
  },
  fogueira() {
    const g = new THREE.Group(), w = 1.2, d = 1.2, n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.add(box(0.26, 0.2, 0.2, M.pedra, Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5, 'pedra' + i, -a));
    }
    for (let i = 0; i < 4; i++) {
      const l = cyl(0.055, 0.72, M.tronco, 0, 0.1, 0, 'lenha' + i, 8);
      l.rotation.set(Math.PI / 2 - 0.35, (i / 4) * Math.PI, 0);
      g.add(l);
    }
    return { g, w, d };
  },
  arvore() {
    const g = new THREE.Group(), w = 2.2, d = 2.2;
    g.add(cyl(0.16, 1.9, M.tronco, 0, 0.95, 0, 'tronco', 10));
    for (const [r, y, x, z] of [[0.95, 2.3, 0, 0], [0.62, 2.9, 0.3, -0.15], [0.55, 2.55, -0.45, 0.3]]) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M.verde);
      s.position.set(x, y, z); s.castShadow = true; s.receiveShadow = true; s.name = 'copa';
      g.add(s);
    }
    return { g, w, d };
  },
  carro() {
    const g = new THREE.Group(), w = 1.85, d = 4.5;
    g.add(box(w, 0.5, d, M.carro, 0, 0.62, 0, 'carroceria'));
    g.add(box(w - 0.12, 0.42, d * 0.46, M.carro, 0, 1.05, -0.15, 'cabine'));
    g.add(box(w - 0.16, 0.34, 0.04, M.vidro, 0, 1.06, -0.15 + d * 0.23, 'para_brisa'));
    g.add(box(w - 0.16, 0.34, 0.04, M.vidro, 0, 1.06, -0.15 - d * 0.23, 'vidro_tras'));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const r = cyl(0.33, 0.22, M.escuro, sx * (w / 2 - 0.06), 0.33, sz * (d / 2 - 0.95), 'roda', 18);
      r.rotation.z = Math.PI / 2; g.add(r);
    }
    for (const sx of [-1, 1]) g.add(box(0.3, 0.12, 0.05, M.lona, sx * 0.55, 0.7, d / 2 - 0.02, 'farol'));
    return { g, w, d };
  },

  // ---------------- peças de mansão ----------------
  lareira() {
    const g = new THREE.Group(), w = 1.9, d = 0.5;
    g.add(box(w, 1.5, d, M.pedra, 0, 0.75, 0, 'moldura'));
    g.add(box(0.95, 0.85, 0.14, M.escuro, 0, 0.55, d / 2 - 0.05, 'boca'));
    g.add(box(w + 0.18, 0.12, d + 0.16, M.madeira, 0, 1.55, 0, 'consolo'));
    for (let i = 0; i < 3; i++) {
      const l = cyl(0.06, 0.6, M.tronco, 0, 0.24 + i * 0.09, d / 2 - 0.05, 'lenha' + i, 8);
      l.rotation.z = Math.PI / 2; g.add(l);
    }
    return { g, w, d };
  },
  escrivaninha() {
    const g = new THREE.Group(), w = 1.5, d = 0.72;
    g.add(box(w, 0.05, d, M.madeira, 0, 0.75, 0, 'tampo'));
    g.add(box(0.52, 0.62, d - 0.08, M.madeira, w / 2 - 0.3, 0.42, 0, 'gaveteiro'));
    for (const sz of [-1, 1]) g.add(cyl(0.03, 0.75, M.escuro, -w / 2 + 0.1, 0.375, sz * (d / 2 - 0.09), 'pe', 10));
    g.add(box(0.4, 0.26, 0.03, M.escuro, -0.1, 0.93, -d / 2 + 0.12, 'monitor'));
    g.add(box(0.12, 0.05, 0.1, M.escuro, -0.1, 0.79, -d / 2 + 0.12, 'monitor_base'));
    const c = new THREE.Group(); c.name = 'cadeira';
    c.add(box(0.46, 0.06, 0.46, M.tecido, 0, 0.46, 0, 'assento'));
    c.add(box(0.44, 0.52, 0.06, M.tecido, 0, 0.74, -0.2, 'encosto'));
    c.add(cyl(0.04, 0.44, M.escuro, 0, 0.22, 0, 'coluna', 10));
    c.add(cyl(0.26, 0.04, M.escuro, 0, 0.02, 0, 'base', 16));
    c.position.set(0, 0, 0.75); c.rotation.y = Math.PI;
    g.add(c);
    return { g, w, d };
  },
  estante() {
    const g = new THREE.Group(), w = 1.9, d = 0.36;
    g.add(box(w, 2.2, d, M.madeira, 0, 1.1, 0, 'corpo'));
    const cores = [M.almofada, M.tecido, M.branco, M.madClara, M.verde];
    for (let s = 0; s < 5; s++) {
      const y = 0.28 + s * 0.44;
      g.add(box(w - 0.1, 0.03, d - 0.04, M.madClara, 0, y, 0.01, 'prateleira' + s));
      for (let i = 0; i < 7; i++) {
        const bw = 0.06 + (i % 3) * 0.03, bh = 0.24 + ((i + s) % 3) * 0.05;
        g.add(box(bw, bh, d - 0.12, cores[(i + s) % 5], -w / 2 + 0.16 + i * 0.24, y + bh / 2 + 0.015, 0.02, 'livro'));
      }
    }
    return { g, w, d };
  },
  mesaJantar8() {
    const g = new THREE.Group(), w = 2.9, d = 1.15;
    g.add(box(w, 0.07, d, M.madeira, 0, 0.76, 0, 'tampo'));
    for (const sx of [-1, 1]) g.add(box(0.14, 0.72, d - 0.3, M.madeira, sx * (w / 2 - 0.35), 0.38, 0, 'pe_lateral'));
    g.add(box(w - 1.2, 0.1, 0.14, M.madeira, 0, 0.5, 0, 'travessa'));
    for (const sz of [-1, 1]) for (const sx of [-1.05, -0.35, 0.35, 1.05]) {
      const c = new THREE.Group(); c.name = 'cadeira';
      c.add(box(0.44, 0.05, 0.44, M.tecido, 0, 0.46, 0, 'assento'));
      c.add(box(0.44, 0.6, 0.06, M.madeira, 0, 0.78, -0.2 * sz, 'encosto'));
      for (const ax of [-1, 1]) for (const az of [-1, 1])
        c.add(cyl(0.02, 0.46, M.madeira, ax * 0.17, 0.23, az * 0.17, 'pe', 8));
      c.position.set(sx, 0, sz * 0.92);
      g.add(c);
    }
    return { g, w, d };
  },
  pianoCauda() {
    const g = new THREE.Group(), w = 1.5, d = 2.0;
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.28, 24, 1, false, -Math.PI / 2, Math.PI), M.escuro);
    corpo.position.set(0, 0.72, -0.3); corpo.castShadow = true; corpo.name = 'corpo'; g.add(corpo);
    g.add(box(1.5, 0.28, 0.62, M.escuro, 0, 0.72, 0.42, 'frente'));
    g.add(box(1.36, 0.05, 0.28, M.branco, 0, 0.9, 0.6, 'teclas'));
    for (let i = 0; i < 15; i++) g.add(box(0.03, 0.03, 0.18, M.escuro, -0.62 + i * 0.089, 0.93, 0.55, 'tecla_preta'));
    const tampa = box(1.4, 0.05, 1.5, M.escuro, 0.1, 1.2, -0.35, 'tampa');
    tampa.rotation.z = 0.42; g.add(tampa);
    g.add(cyl(0.06, 0.58, M.escuro, 0, 0.29, 0.55, 'pe1', 10));
    for (const sx of [-1, 1]) g.add(cyl(0.06, 0.58, M.escuro, sx * 0.6, 0.29, -0.55, 'pe', 10));
    const banco = box(0.6, 0.06, 0.32, M.tecido, 0, 0.5, 1.15, 'banco'); g.add(banco);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      g.add(cyl(0.02, 0.5, M.escuro, sx * 0.24, 0.25, 1.15 + sz * 0.11, 'pe_banco', 8));
    return { g, w, d };
  },
  banheira() {
    const g = new THREE.Group(), w = 0.85, d = 1.75;
    g.add(box(w, 0.52, d, M.branco, 0, 0.28, 0, 'casco'));
    const ag = box(w - 0.12, 0.05, d - 0.12, M.agua, 0, 0.52, 0, 'agua'); ag.castShadow = false; g.add(ag);
    g.add(box(w + 0.06, 0.05, d + 0.06, M.branco, 0, 0.56, 0, 'borda'));
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      g.add(cyl(0.04, 0.16, M.metal, sx * (w / 2 - 0.12), 0.08, sz * (d / 2 - 0.16), 'pe', 10));
    g.add(cyl(0.02, 0.3, M.metal, 0, 0.7, -d / 2 + 0.12, 'torneira', 10));
    return { g, w, d };
  },
  pergolado() {
    const g = new THREE.Group(), w = 3.6, d = 3.0, H = 2.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      g.add(box(0.13, H, 0.13, M.deck, sx * (w / 2 - 0.1), H / 2, sz * (d / 2 - 0.1), 'pilar'));
    for (const sz of [-1, 1]) g.add(box(w, 0.18, 0.11, M.deck, 0, H + 0.09, sz * (d / 2 - 0.1), 'viga'));
    const n = 13;
    for (let i = 0; i < n; i++)
      g.add(box(0.09, 0.13, d, M.madeira, -w / 2 + 0.22 + i * ((w - 0.44) / (n - 1)), H + 0.25, 0, 'caibro' + i));
    for (const sz of [-1, 1]) g.add(box(w - 0.3, 0.1, 0.06, M.deck, 0, H - 0.28, sz * (d / 2 - 0.14), 'travessa'));
    return { g, w, d };
  },
  rede() {
    const g = new THREE.Group(), w = 2.9, d = 0.95, H = 1.65;
    for (const sx of [-1, 1]) {
      g.add(cyl(0.07, H, M.tronco, sx * (w / 2 - 0.12), H / 2, 0, 'poste', 12));
      g.add(box(0.5, 0.09, 0.5, M.tronco, sx * (w / 2 - 0.12), 0.045, 0, 'pe'));
    }
    const span = w - 0.24, n = 11;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x = -span / 2 + t * span;
      const sag = 1.42 - Math.cos((t - 0.5) * Math.PI) * 0.42;
      const seg = box(span / n + 0.02, 0.05, d - 0.18, M.lona, x, sag, 0, 'lona' + i);
      seg.rotation.z = Math.sin((t - 0.5) * Math.PI) * 0.5;
      g.add(seg);
    }
    for (const sx of [-1, 1]) {
      const c = cyl(0.02, 0.42, M.lona, sx * (w / 2 - 0.28), 1.44, 0, 'corda', 8);
      c.rotation.z = Math.PI / 2 - sx * 0.5;
      g.add(c);
    }
    return { g, w, d };
  },
  lustre() {
    const g = new THREE.Group(), w = 0.9, d = 0.9;
    g.add(cyl(0.02, 0.5, M.metal, 0, 2.44, 0, 'haste', 8));
    g.add(cyl(0.34, 0.03, M.metal, 0, 2.18, 0, 'aro', 24));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 0.34, z = Math.sin(a) * 0.34;
      g.add(cyl(0.012, 0.22, M.metal, x, 2.06, z, 'braco', 8));
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.13, 16, 1, true), M.lona);
      cup.position.set(x, 1.93, z); cup.material.side = THREE.DoubleSide; cup.name = 'cupula';
      g.add(cup);
    }
    return { g, w, d };
  },
};

`;
