/* Procedural pixel art: enemy sprites (64x64) and scene backdrops (160x90).
   Shapes are drawn small, then snapped to a fixed palette so they scale up crisp. */
(function () {
  const LW = (window.LW = window.LW || {});

  function seeded(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function pen(ctx) {
    return {
      P(col, pts) {
        ctx.fillStyle = col; ctx.beginPath();
        for (let i = 0; i < pts.length; i += 2) i ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]);
        ctx.closePath(); ctx.fill();
      },
      E(col, x, y, rx, ry) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); },
      R(col, x, y, w, h) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); },
    };
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function snap(c, palette, cutout) {
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const pal = palette.map(hex);
    for (let i = 0; i < d.length; i += 4) {
      if (cutout && d[i + 3] < 128) { d[i + 3] = 0; continue; }
      let best = 0, bd = Infinity;
      for (let p = 0; p < pal.length; p++) {
        const dr = d[i] - pal[p][0], dg = d[i + 1] - pal[p][1], db = d[i + 2] - pal[p][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; best = p; }
      }
      d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const mirror = (pts) => pts.map((v, i) => (i % 2 ? v : 64 - v));

  /* ---------- Sprites ---------- */
  const SPRITES = {
    kraan: {
      pal: { body: '#3b2f4a', bone: '#5a4668', skin: '#8a6a86', dark: '#1d1726', eye: '#ff4a2e', beak: '#d8b24a', claw: '#c9c2b0' },
      draw({ P, E, R }, c) {
        const wing = [30, 27, 3, 7, 1, 22, 7, 19, 6, 32, 13, 27, 14, 40, 21, 33, 25, 42, 30, 36];
        P(c.skin, wing); P(c.skin, mirror(wing));
        const arm = [30, 23, 3, 7, 5, 12, 30, 29];
        P(c.bone, arm); P(c.bone, mirror(arm));
        const finger = [16, 17, 13, 27, 15, 27, 18, 18];
        P(c.bone, finger); P(c.bone, mirror(finger));
        R(c.dark, 27, 46, 3, 9); R(c.dark, 34, 46, 3, 9);
        P(c.claw, [24, 55, 32, 55, 28, 60]); P(c.claw, mirror([24, 55, 32, 55, 28, 60]));
        E(c.body, 32, 36, 9, 13);
        E(c.bone, 32, 39, 5, 8);
        E(c.body, 32, 19, 7, 7);
        P(c.dark, [32, 8, 28, 15, 36, 15]);
        P(c.beak, [28, 21, 36, 21, 32, 31]);
        R(c.eye, 27, 17, 3, 2); R(c.eye, 34, 17, 3, 2);
      },
    },
    giak: {
      pal: { skin: '#7f8f5a', shade: '#56653d', armor: '#4a4038', metal: '#9aa0a6', eye: '#ffd23e', fang: '#efe9d6', wood: '#7a5230', dark: '#22201c' },
      draw({ P, E, R }, c) {
        R(c.wood, 51, 9, 2, 50); P(c.metal, [52, 0, 48, 11, 56, 11]);
        R(c.shade, 24, 46, 6, 12); R(c.shade, 34, 46, 6, 12);
        R(c.dark, 21, 57, 10, 3); R(c.dark, 33, 57, 10, 3);
        P(c.armor, [20, 28, 44, 28, 46, 48, 18, 48]);
        R(c.dark, 18, 43, 28, 3); R(c.metal, 30, 43, 4, 3);
        P(c.skin, [43, 29, 50, 32, 54, 40, 48, 43]);
        E(c.skin, 52, 40, 3, 3);
        E(c.metal, 15, 39, 8, 10); E(c.armor, 15, 39, 5, 7); E(c.metal, 15, 39, 2, 2);
        const ear = [23, 17, 13, 11, 22, 24];
        P(c.skin, ear); P(c.skin, mirror(ear));
        E(c.skin, 32, 20, 10, 9);
        P(c.metal, [21, 17, 24, 9, 32, 6, 40, 9, 43, 17]); P(c.metal, [30, 7, 34, 7, 32, 1]);
        const eye = [24, 19, 30, 21, 25, 23];
        P(c.eye, eye); P(c.eye, mirror(eye));
        R(c.dark, 27, 25, 10, 3);
        const fang = [27, 25, 30, 25, 28.5, 29];
        P(c.fang, fang); P(c.fang, mirror(fang));
      },
    },
    vordak: {
      pal: { robe: '#7a1f24', shade: '#4a1216', hood: '#5c171b', bone: '#d9d2b8', eye: '#7dff5a', dark: '#140a0c', metal: '#8d8f96' },
      draw({ P, E, R }, c) {
        R(c.metal, 52, 18, 2, 28);
        E(c.metal, 53, 15, 5, 5); P(c.metal, [53, 6, 51, 11, 55, 11]); P(c.metal, [45, 15, 49, 13, 49, 17]); P(c.metal, [61, 15, 57, 13, 57, 17]);
        P(c.robe, [22, 22, 42, 22, 52, 56, 47, 61, 42, 56, 37, 61, 32, 56, 27, 61, 22, 56, 17, 61, 12, 56]);
        P(c.shade, [30, 28, 34, 28, 38, 57, 32, 56, 26, 57]);
        P(c.shade, [22, 24, 9, 40, 15, 47, 26, 35]);
        P(c.shade, [42, 24, 56, 38, 50, 45, 38, 35]);
        R(c.bone, 8, 41, 6, 4); R(c.bone, 6, 45, 2, 4); R(c.bone, 9, 45, 2, 5); R(c.bone, 12, 45, 2, 4);
        R(c.bone, 50, 40, 6, 4);
        E(c.hood, 32, 16, 12, 13);
        E(c.dark, 32, 18, 8, 9);
        E(c.bone, 32, 18, 5, 6); R(c.bone, 29, 22, 6, 4);
        R(c.eye, 28, 16, 3, 3); R(c.eye, 33, 16, 3, 3);
        R(c.dark, 31, 20, 2, 2); R(c.dark, 29, 24, 6, 1);
      },
    },
  };

  /* ---------- Scenes. Tones: 0 sky, 1 far, 2 mid, 3 near, 4 accent ---------- */
  const SCENES = {
    ruins: {
      pal: ['#2b2230', '#5b4a57', '#3a2c33', '#1a1418', '#ff7a2e'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        for (let i = 0; i < 7; i++) E(t[1], 40 + i * 5 + r() * 10, 30 - i * 5, 8 + i * 2, 4 + i);
        for (let i = 0; i < 6; i++) E(t[1], 116 + i * 6 + r() * 8, 18 - i * 4, 6 + i * 2, 3 + i);
        R(t[2], 30, 30, 18, 50); P(t[0], [30, 29, 39, 39, 48, 29]);
        R(t[2], 66, 46, 48, 34); P(t[0], [80, 45, 88, 56, 97, 45]);
        R(t[2], 110, 22, 14, 58); P(t[2], [110, 22, 113, 15, 117, 22, 120, 13, 124, 22]);
        R(t[4], 36, 46, 4, 8); R(t[4], 115, 34, 4, 7); R(t[4], 74, 60, 5, 5);
        P(t[3], [0, 76, 40, 71, 90, 75, 160, 69, 160, 90, 0, 90]);
        for (let i = 0; i < 14; i++) E(t[3], r() * 160, 70 + r() * 8, 3 + r() * 6, 2 + r() * 3);
      },
    },
    forest: {
      pal: ['#1f3a2d', '#2f5a3c', '#1b2a1f', '#0f1a13', '#9fd36a'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        for (let i = 0; i < 18; i++) E(t[1], i * 10 + r() * 6, 38 + r() * 8, 9 + r() * 5, 12 + r() * 6);
        for (let i = 0; i < 8; i++) { const x = 6 + i * 20 + r() * 8, w = 4 + r() * 5; R(t[2], x, 0, w, 82); }
        for (let i = 0; i < 16; i++) E(t[3], i * 11 + r() * 6, r() * 8, 12 + r() * 6, 8 + r() * 6);
        P(t[3], [0, 78, 50, 74, 110, 77, 160, 73, 160, 90, 0, 90]);
        for (let i = 0; i < 12; i++) { const x = r() * 160; P(t[2], [x, 80, x + 3, 68 + r() * 5, x + 6, 80]); }
      },
    },
    hill: {
      pal: ['#6fa3c7', '#9fbf8a', '#5d8a4e', '#2f4a2c', '#ffe28a'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        E(t[4], 124, 20, 8, 8);
        P(t[1], [0, 52, 30, 40, 70, 50, 110, 38, 160, 48, 160, 90, 0, 90]);
        for (let i = 0; i < 6; i++) E(t[3], 26 + i * 3 + r() * 4, 36 - i * 6, 3 + i, 3 + i * 0.6);
        P(t[2], [0, 66, 50, 54, 100, 64, 160, 56, 160, 90, 0, 90]);
        R(t[3], 101, 44, 2, 16); E(t[3], 102, 42, 8, 7);
        P(t[3], [0, 80, 60, 72, 160, 80, 160, 90, 0, 90]);
      },
    },
    river: {
      pal: ['#7fb0c9', '#3f6b4a', '#3d7fa6', '#23402b', '#cfe9f2'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        for (let i = 0; i < 17; i++) E(t[1], i * 10 + r() * 5, 36, 8 + r() * 4, 9 + r() * 6);
        R(t[1], 0, 36, 160, 8);
        R(t[2], 0, 44, 160, 46);
        for (let i = 0; i < 26; i++) R(t[4], r() * 150, 47 + r() * 28, 4 + r() * 10, 1);
        P(t[3], [0, 74, 40, 70, 70, 80, 120, 78, 160, 84, 160, 90, 0, 90]);
        for (let i = 0; i < 14; i++) { const x = r() * 60; R(t[3], x, 58 + r() * 8, 1, 16); }
      },
    },
    road: {
      pal: ['#c9b78a', '#8a9a63', '#a88f55', '#4a3b25', '#e9ddb8'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        E(t[4], 40, 18, 22, 5); E(t[4], 110, 12, 18, 4);
        P(t[1], [0, 44, 50, 36, 100, 42, 160, 34, 160, 90, 0, 90]);
        R(t[2], 0, 52, 160, 38);
        P(t[4], [72, 52, 84, 52, 130, 90, 30, 90]);
        for (let i = 0; i < 8; i++) E(t[1], r() * 160, 50, 5 + r() * 4, 4 + r() * 3);
        R(t[3], 118, 60, 8, 14); E(t[3], 122, 60, 4, 3);
        P(t[3], [0, 84, 30, 80, 0, 90]); P(t[3], [160, 84, 136, 82, 160, 90]);
      },
    },
    night: {
      pal: ['#0e1430', '#1a2248', '#121833', '#070a18', '#e8e6c8'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        for (let i = 0; i < 40; i++) R(t[4], r() * 160, r() * 50, 1, 1);
        E(t[4], 120, 18, 9, 9); E(t[0], 116, 16, 8, 8);
        P(t[1], [0, 56, 40, 46, 90, 54, 160, 44, 160, 90, 0, 90]);
        for (let i = 0; i < 12; i++) { const x = r() * 160, h = 18 + r() * 16; P(t[2], [x - 7, 70, x, 70 - h, x + 7, 70]); }
        P(t[3], [0, 72, 60, 66, 100, 76, 160, 70, 160, 90, 0, 90]);
      },
    },
    bridge: {
      pal: ['#8aa4b8', '#5d7486', '#3f6f8f', '#2a2d33', '#d8dde2'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        E(t[4], 50, 14, 24, 4); E(t[4], 120, 22, 18, 3);
        P(t[1], [0, 44, 40, 36, 80, 42, 130, 32, 160, 40, 160, 90, 0, 90]);
        R(t[2], 0, 54, 160, 36);
        for (let i = 0; i < 20; i++) R(t[4], r() * 150, 60 + r() * 26, 4 + r() * 8, 1);
        R(t[3], 0, 40, 160, 9); R(t[3], 0, 36, 160, 2);
        for (let i = 0; i < 16; i++) R(t[3], i * 10 + 2, 33, 4, 3);
        for (let i = 0; i < 3; i++) { const x = 26 + i * 54; R(t[3], x - 6, 49, 12, 30); }
        for (let i = 0; i < 4; i++) { const x = -1 + i * 54; E(t[3], x, 49, 22, 5); E(t[2], x, 56, 20, 9); R(t[2], x - 20, 56, 40, 20); }
        R(t[3], 132, 16, 16, 24); P(t[3], [130, 16, 140, 6, 150, 16]); R(t[4], 138, 24, 3, 5);
      },
    },
    city: {
      pal: ['#9cc3df', '#7fa07a', '#e6e2d6', '#5a6b47', '#c8202a'],
      draw({ P, E, R }, t, r) {
        R(t[0], 0, 0, 160, 90);
        P(t[1], [0, 50, 60, 40, 120, 48, 160, 42, 160, 90, 0, 90]);
        R(t[2], 14, 44, 132, 22);
        for (let i = 0; i < 17; i++) R(t[2], 14 + i * 8, 40, 4, 4);
        for (const x of [20, 62, 104, 134]) { R(t[2], x, 28, 12, 38); R(t[2], x - 1, 25, 3, 3); R(t[2], x + 5, 25, 3, 3); R(t[2], x + 10, 25, 3, 3); }
        R(t[2], 76, 14, 10, 30); P(t[1], [74, 14, 81, 4, 88, 14]);
        for (const x of [26, 68, 110, 140]) { R(t[3], x, 14, 1, 12); P(t[4], [x + 1, 14, x + 8, 17, x + 1, 20]); }
        R(t[3], 74, 52, 12, 14); E(t[3], 80, 52, 6, 5);
        P(t[3], [0, 70, 50, 64, 110, 68, 160, 62, 160, 90, 0, 90]);
        P(t[2], [76, 66, 84, 66, 100, 90, 60, 90]);
      },
    },
  };
  const INK = ['#d9d3c1', '#a9a087', '#6e6450', '#26221b', '#8c2a1c'];

  LW.Art = {
    sprite(name) {
      const def = SPRITES[name] || SPRITES.giak;
      const c = canvas(64, 64);
      def.draw(pen(c.getContext('2d')), def.pal);
      snap(c, Object.values(def.pal), true);
      return c;
    },
    /* ink=true renders the scene as a woodcut in the book's ink tones */
    scene(name, ink) {
      const def = SCENES[name] || SCENES.forest;
      const tones = ink ? INK : def.pal;
      const c = canvas(160, 90);
      def.draw(pen(c.getContext('2d')), tones, seeded(name.length * 7919 + name.charCodeAt(0)));
      snap(c, tones, false);
      return c;
    },
    seeded,
  };
})();
