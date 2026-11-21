import { W, H, CORE_X, CORE_Y, field, catalog, units, clamp } from "./sim.mjs";
const rect = (c, x, y, w, h, color) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
function poly(c, pts, color) {
  c.beginPath();
  c.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) c.lineTo(...pts[i]);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function rng(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function hash(x, y) {
  let v = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, scale) {
  x /= scale;
  y /= scale;
  const i = Math.floor(x),
    j = Math.floor(y),
    a = x - i,
    b = y - j,
    u = a * a * (3 - 2 * a),
    v = b * b * (3 - 2 * b);
  return (
    (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) +
    (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v
  );
}
const routes = [
  [
    [0, 495],
    [130, 447],
    [231, 415],
    [324, 359],
    [414, 306],
    [503, 282],
    [600, 250],
    [705, 224],
    [770, 161],
    [960, 104],
  ],
  [
    [263, 567],
    [287, 463],
    [367, 411],
    [461, 365],
    [519, 302],
  ],
  [
    [600, 250],
    [627, 313],
    [631, 384],
    [712, 443],
    [960, 506],
  ],
  [
    [410, 306],
    [444, 244],
    [482, 177],
    [532, 113],
    [590, 0],
  ],
  [
    [0, 344],
    [133, 312],
    [241, 215],
    [298, 162],
    [385, 129],
    [530, 114],
  ],
  [
    [267, 488],
    [385, 475],
    [485, 483],
    [571, 449],
    [631, 384],
  ],
].map((line) => line.map(([x, y]) => field(x, y)));
routes.push(
  [[0, 755], [265, 746], [470, 665], [681, 675], field(0, 344)],
  [
    [238, 290],
    [260, 435],
    [382, 538],
    [470, 665],
    [410, 820],
    [487, 938],
    [625, 1127],
    [940, 1215],
    [1330, 1190],
    [1765, 1250],
    [2235, 1200],
    [2580, 1010],
    [2720, 1125],
    [3030, 1218],
    [3200, 1190],
  ],
  [[0, 1060], [255, 1038], [560, 995], field(0, 495)],
  [
    [630, 0],
    [680, 148],
    [900, 223],
    [1128, 185],
    [1372, 122],
    [1560, 188],
    [1735, 226],
    [2086, 198],
    [2460, 333],
    [2825, 390],
    [3200, 421],
  ],
  [field(590, 0), [1560, 188]],
  [field(960, 104), [2330, 482], [2460, 333]],
  [field(960, 506), [2375, 725], [2500, 825], [2580, 1010]],
  [
    [2375, 725],
    [2680, 750],
    [2885, 775],
    [3200, 700],
  ],
);
const segments = routes.flatMap((line) =>
  line.slice(1).map(([bx, by], i) => {
    const [ax, ay] = line[i],
      dx = bx - ax,
      dy = by - ay;
    return {
      ax,
      ay,
      dx,
      dy,
      inv: 1 / (dx * dx + dy * dy),
      left: Math.min(ax, bx) - 57,
      right: Math.max(ax, bx) + 57,
      top: Math.min(ay, by) - 57,
      bottom: Math.max(ay, by) + 57,
    };
  }),
);
function road(x, y) {
  let best = 3600;
  for (const s of segments) {
    if (x < s.left || x > s.right || y < s.top || y > s.bottom) continue;
    const dx = x - s.ax,
      dy = y - s.ay,
      t = clamp((dx * s.dx + dy * s.dy) * s.inv, 0, 1);
    const ux = dx - t * s.dx,
      uy = dy - t * s.dy;
    best = Math.min(best, ux * ux + uy * uy);
  }
  return Math.sqrt(best);
}
function water(x, y) {
  const oldX = (x - CORE_X) * 0.75,
    oldY = (y - CORE_Y) * 0.8;
  return Math.max(
    1 - Math.hypot((oldX - 124) / 196, (oldY - 24) / 113),
    1 - Math.hypot((oldX - 832) / 136, (oldY - 575) / 96),
    1 - Math.hypot((oldX - 959) / 64, (oldY - 536) / 123),
    1 - Math.hypot((x - 215) / 256, (y - 1260) / 206),
    1 - Math.hypot((x - 2800) / 444, (y - 104) / 199),
    1 - Math.hypot((x - 3070) / 213, (y - 970) / 140),
    1 - Math.hypot((x - 1650) / 249, (y - 1460) / 158),
  );
}
function rock(c, x, y, s, v) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const lite = v ? "#a19a73" : "#8c8c66",
    mid = v ? "#817956" : "#747855";
  poly(
    c,
    [
      [-7, 2],
      [-2, -5],
      [5, -5],
      [10, 0],
      [9, 5],
      [-3, 6],
    ],
    "#323c2e",
  );
  poly(
    c,
    [
      [-7, 1],
      [-2, -5],
      [5, -5],
      [9, -1],
      [6, 2],
      [-3, 3],
    ],
    lite,
  );
  poly(
    c,
    [
      [1, 4],
      [6, 2],
      [9, -1],
      [9, 3],
      [5, 5],
    ],
    mid,
  );
  rect(c, -2, -4, 4, 1, "#b3ab83");
  rect(c, 1, 1, 4, 1, mid);
  c.restore();
}
function tree(c, x, y, s, v) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  rect(c, -1, -3, 2, 7, "#3b3828");
  poly(
    c,
    [
      [-6, 0],
      [3, -3],
      [13, 1],
      [10, 4],
      [1, 5],
    ],
    "#26372880",
  );
  const dark = v ? "#303e2b" : "#35442d",
    mid = v ? "#49553a" : "#4e5a39",
    light = v ? "#646b45" : "#6b7449";
  poly(
    c,
    [
      [0, -15],
      [2, -12],
      [5, -10],
      [4, -8],
      [7, -5],
      [6, -3],
      [8, 0],
      [4, 2],
      [-5, 1],
      [-8, -1],
      [-5, -4],
      [-6, -5],
      [-3, -8],
      [-4, -9],
      [-1, -12],
    ],
    dark,
  );
  poly(
    c,
    [
      [0, -14],
      [4, -9],
      [1, -9],
      [5, -5],
      [1, -5],
      [6, -1],
      [2, 0],
      [-6, -1],
      [-3, -5],
      [-4, -5],
      [-1, -9],
      [-3, -9],
    ],
    mid,
  );
  rect(c, -1, -11, 2, 2, light);
  rect(c, -3, -6, 4, 1, light);
  rect(c, -5, -2, 5, 1, light);
  c.restore();
}
const mineColors = {
  ore: ["#8ebfc4", "#589da9", "#41767b", "#bad2bc"],
  rich: ["#e8c578", "#ba934c", "#82663f", "#ffe5a7"],
  crystal: ["#bcabea", "#8c74ce", "#605397", "#e7d6f9"],
  prism: ["#edabd1", "#cd73aa", "#8f5189", "#fbe4e9"],
  uranium: ["#d0e88a", "#99bf65", "#597a49", "#ebfac0"],
};
function mine(c, x, y, kind) {
  const palette = mineColors[kind];
  c.save();
  c.translate(x, y);
  const r = rng(x + y);
  for (let i = 0; i < 28; i++) {
    const angle = r() * 6.28,
      d = 5 + Math.sqrt(r()) * 25,
      k = 3 + Math.floor(r() * 8),
      a = Math.round(Math.cos(angle) * d),
      b = Math.round(Math.sin(angle) * d * 0.64);
    poly(
      c,
      [
        [a - k, b + 2],
        [a + 1, b - k],
        [a + k, b - 3],
        [a + k, b + 3],
        [a + 1, b + 5],
      ],
      "#32463f",
    );
    poly(
      c,
      [
        [a - k, b],
        [a + 1, b - k],
        [a + k, b - 3],
        [a + 1, b + 2],
      ],
      i % 3 === 0 ? palette[0] : palette[1],
    );
    poly(
      c,
      [
        [a + 1, b + 2],
        [a + k, b - 3],
        [a + k, b + 2],
        [a + 1, b + 4],
      ],
      palette[2],
    );
    rect(c, a, b - k + 1, k / 2, 1, palette[3]);
  }
  c.restore();
}
export function terrain(g) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");
  const im = c.createImageData(W, H),
    d = im.data;
  const clearings = [
    [...field(215, 450), 125],
    [...field(767, 151), 112],
    ...g.mines.map((m) => [m.x, m.y, 34]),
    ...g.relays.map((r) => [r.x, r.y, 35]),
  ];
  const clearing = (x, y) =>
    clearings.some(
      ([a, b, r]) =>
        Math.abs(x - a) < r &&
        Math.abs(y - b) < r &&
        Math.hypot(x - a, y - b) < r,
    );
  for (let sy = 0; sy < H; sy += 4)
    for (let sx = 0; sx < W; sx += 4) {
      const n =
          noise(sx, sy, 83) * 0.51 +
          noise(sx, sy, 30) * 0.29 +
          noise(sx, sy, 11) * 0.2,
        grit = hash(sx, sy),
        j = (grit - 0.5) * 10;
      const wet =
          water(sx, sy) +
          (noise(sx, sy, 21) - 0.5) * 0.27 +
          (noise(sx, sy, 7) - 0.5) * 0.1,
        path =
          road(sx, sy) +
          (noise(sx, sy, 23) - 0.5) * 20 +
          (noise(sx, sy, 7) - 0.5) * 8;
      let patch = 0;
      for (const [ax, ay, r] of clearings) {
        if (Math.abs(ax - sx) < r && Math.abs(ay - sy) < r)
          patch = Math.max(patch, 1 - Math.hypot(ax - sx, ay - sy) / r);
      }
      patch += (noise(sx, sy, 29) - 0.5) * 0.32;
      const regional = noise(sx + 483, sy + 196, 420);
      let base = [
        74 + n * 49 + regional * 10,
        83 + n * 39 + regional * 7,
        58 + n * 26,
      ];
      if (patch > 0.12) base = [89 + n * 60, 89 + n * 47, 61 + n * 30];
      if (path < 29)
        base =
          path < 16
            ? [119 + n * 39, 108 + n * 36, 77 + n * 27]
            : [101 + n * 45, 98 + n * 39, 68 + n * 29];
      if (wet > 0.105)
        base =
          wet > 0.21
            ? [45 + n * 24, 62 + n * 31, 56 + n * 29]
            : wet > 0.15
              ? [61 + n * 30, 74 + n * 27, 59 + n * 25]
              : [83 + n * 45, 88 + n * 34, 62 + n * 29];
      for (let dy = 0; dy < 4; dy++)
        for (let dx = 0; dx < 4; dx++) {
          const k = ((sy + dy) * W + sx + dx) * 4;
          d[k] = base[0] + j;
          d[k + 1] = base[1] + j;
          d[k + 2] = base[2] + j;
          d[k + 3] = 255;
        }
    }
  c.putImageData(im, 0, 0);
  const r = rng(57193);
  for (let i = 0; i < 62800; i++) {
    const x = Math.floor(r() * W),
      y = Math.floor(r() * H),
      v = r(),
      w = water(x, y);
    if (w > 0.16) {
      if (v < 0.14)
        rect(c, x, y, 2 + r() * 10, 1, v < 0.04 ? "#a9b19442" : "#b4caa524");
      continue;
    }
    if (road(x, y) < 14) {
      if (v < 0.38)
        rect(c, x, y, 1 + r() * 5, 1, v < 0.15 ? "#e4cf9a38" : "#4b482e48");
      continue;
    }
    if (v < 0.36) {
      const color =
        v < 0.14 ? "#414c3385" : v < 0.25 ? "#adb0795c" : "#c0a97647";
      rect(c, x, y, 1 + r() * 3, 1, color);
      if (v < 0.29) {
        rect(c, x + 1, y - 2, 1, 2, color);
        rect(c, x - 2, y - 1, 1, 1, color);
      }
    }
  }
  // Weathered survey pads and the reinforced foundations of each compound.
  for (const a of g.actors.filter((a) => !units[a.type])) {
    const s = catalog[a.type].size + 7,
      x = a.x - s,
      y = a.y - s;
    rect(c, x, y, 2 * s, 2 * s, "#635f4680");
    c.strokeStyle = "#363b2e8e";
    c.strokeRect(x + 0.5, y + 0.5, 2 * s, 2 * s);
    for (let i = 5; i < 2 * s; i += 8) {
      rect(c, x + i, y + 1, 4, 1, "#a79c6eaa");
      rect(c, x + i, y + 2 * s - 1, 4, 1, "#a79c6eaa");
    }
  }
  for (const p of g.relays) {
    const { x, y } = p;
    poly(
      c,
      [
        [x - 21, y - 14],
        [x - 9, y - 22],
        [x + 11, y - 22],
        [x + 21, y - 12],
        [x + 21, y + 12],
        [x + 10, y + 21],
        [x - 12, y + 21],
        [x - 21, y + 11],
      ],
      "#8b806066",
    );
    c.strokeStyle = "#a6a07566";
    c.strokeRect(x - 21.5, y - 16.5, 43, 33);
  }
  for (let i = 0; i < 2400; i++) {
    const x = Math.round(r() * W),
      y = Math.round(r() * H);
    if (water(x, y) > 0.1 || road(x, y) < 25 || clearing(x, y)) continue;
    const n = noise(x + 101, y + 213, 67);
    if (n > 0.57) rock(c, x, y, 0.32 + r() * 0.95, r() < 0.43);
  }
  const forest = [];
  for (let i = 0; i < 16500; i++) {
    const x = Math.round(r() * W),
      y = Math.round(r() * H),
      w = water(x, y),
      n = noise(x - 92, y + 720, 82);
    if (
      w > 0.145 ||
      road(x, y) < 31 ||
      clearing(x, y) ||
      n < 0.635 ||
      r() > 0.75
    )
      continue;
    forest.push([x, y, 0.55 + r() * 0.87, r() < 0.52]);
  }
  forest.sort((a, b) => a[1] - b[1]);
  for (const treeSpec of forest) tree(c, ...treeSpec);
  for (const m of g.mines) mine(c, m.x, m.y, m.kind);
  // Fine survey grid, deliberately faint so units remain legible.
  for (let x = 48; x < W; x += 48) rect(c, x, 0, 1, H, "#e4dec40c");
  for (let y = 48; y < H; y += 48) rect(c, 0, y, W, 1, "#e4dec40c");
  for (let y = 48; y < H; y += 48)
    for (let x = 48; x < W; x += 48) {
      rect(c, x - 2, y, 5, 1, "#d5c89634");
      rect(c, x, y - 2, 1, 5, "#d5c89634");
    }
  return cv;
}
const colors = {
  1: ["#263d46", "#3d6070", "#658eaa", "#9bb7bf", "#bad2d4", "#233339"],
  "-1": ["#49322d", "#79463c", "#a96554", "#cc9376", "#e1b79a", "#422c27"],
  0: ["#4b442b", "#77663c", "#a48b53", "#d8ba76", "#f1d68e", "#393425"],
};
function line(c, x, y, a, b, color, w = 1) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(a, b);
  c.stroke();
}
function box(c, x, y, w, h, set) {
  const [d, m, b, l, hi, k] = set;
  rect(c, x - 1, y - 1, w + 2, h + 3, k);
  rect(c, x, y, w, h, m);
  rect(c, x, y, w, Math.max(2, h * 0.65), b);
  rect(c, x, y, w, 2, l);
  rect(c, x, y, 2, h * 0.75, l);
  rect(c, x + w - 2, y + 2, 2, h - 2, d);
  rect(c, x + 2, y + h - 2, w - 4, 1, d);
}
function muzzle(c, x, y, t, size = 1) {
  if (t < 0.175) return;
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  poly(
    c,
    [
      [0, -2],
      [5, -5],
      [6, -2],
      [13, 0],
      [6, 2],
      [5, 5],
      [0, 2],
    ],
    "#f6a850bb",
  );
  poly(
    c,
    [
      [0, -1],
      [6, -2],
      [10, 0],
      [6, 2],
      [0, 1],
    ],
    "#fff4bb",
  );
  c.restore();
}
const kick = (t, scale) => scale * Math.pow(clamp(t / 0.24, 0, 1), 1.9);
const advancedStyles = {
  flak: [12, 8, 12, 5, "#83d9d3"],
  vanguard: [15, 10, 14, 6, "#d8bc7b"],
  interceptor: [12, 7, 14, 2, "#a7eddb"],
  railgun: [13, 8, 25, 4, "#bca9f4"],
  disruptor: [12, 8, 14, 3, "#6ad7f1"],
  fieldMedic: [12, 8, 0, 0, "#9de4a3"],
  siegeBreaker: [15, 10, 23, 6, "#ed9d76"],
  clusterLauncher: [14, 10, 14, 4, "#edbd80"],
  ionSkirmisher: [11, 8, 14, 5, "#c498f4"],
};
function advancedVehicle(c, type, set, x, y, angle, aim, recoil, salvoLane) {
  const [length, width, barrel, caliber, accent] = advancedStyles[type];
  const [d, m, b, l, hi, k] = set;
  const wheels = type === "interceptor" || type === "fieldMedic";
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  rect(c, -length - 2, -width + 2, length * 2 + 6, width * 2 + 3, "#161b1b68");
  for (const side of [-1, 1]) {
    const y = side * width;
    if (wheels) {
      for (const px of [-9, 0, 8]) {
        rect(c, px - 3, y - 2, 6, 5, k);
        rect(c, px - 1, y, 2, 2, d);
      }
    } else {
      rect(c, -length, y - 3, length * 2, 6, k);
      for (let px = -length + 2; px < length - 1; px += 4)
        rect(c, px, y - 2, 1, 4, "#626a59");
      rect(c, -length + 3, y - side * 4, length * 2 - 6, 2, accent);
    }
  }
  box(c, -length, -width + 3, length * 2, width * 2 - 6, set);
  rect(c, -length + 2, -width + 4, 4, width * 2 - 8, d);
  rect(c, length - 4, -width + 4, 3, 2, hi);
  rect(c, length - 4, width - 6, 3, 2, hi);
  if (type === "fieldMedic") {
    box(c, -7, -6, 13, 12, set);
    rect(c, -5, -4, 8, 8, k);
    rect(c, -4, -1, 6, 2, accent);
    rect(c, -2, -3, 2, 6, accent);
    line(c, -6, -3, -12, -11, k, 1);
    rect(c, -13, -12, 3, 2, accent);
  } else {
    c.rotate(aim - angle);
    box(c, -8, -6, 15, 12, set);
    rect(c, -7, -3, 5, 6, k);
    rect(c, -6, -2, 3, 4, accent);
    c.translate(-kick(recoil, 8), 0);
    if (type === "clusterLauncher") {
      for (const side of [-1, 1]) {
        const y = side * 4;
        box(c, 1, y - 3, barrel, 6, set);
        rect(c, 3, y - 1, 9, 2, accent);
        rect(c, barrel - 1, y - 1, 3, 3, k);
        if (salvoLane === side) muzzle(c, barrel + 1, y, recoil);
      }
    } else {
      rect(c, 4, -caliber / 2, barrel - 3, caliber, k);
      rect(c, 5, -caliber / 2, barrel - 6, Math.max(1, caliber * 0.45), l);
      rect(c, barrel - 4, -caliber / 2 - 1, 4, caliber + 2, accent);
      if (type === "railgun" || type === "disruptor")
        for (const side of [-1, 1])
          rect(c, 6, side * 3 - 1, barrel - 6, 2, accent);
      muzzle(c, barrel, 0, recoil);
    }
  }
  c.restore();
}
function multiTurretTank(c, type, set, x, y, angle, mountState) {
  const spec = units[type],
    [d, m, b, l, hi, k] = set,
    support = type === "aegis",
    accent = support ? "#aaebaa" : type === "skySiege" ? "#aeb9f5" : "#f2ce7d",
    length = support ? 17 : 20,
    width = support ? 13 : 15;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  rect(c, -length - 2, -width + 1, length * 2 + 6, width * 2 + 3, "#161b1b68");
  for (const side of [-1, 1]) {
    const y = side * width;
    box(c, -length, y - 4, length * 2, 8, set);
    rect(c, -length + 1, y - 3, length * 2 - 2, 6, k);
    for (let i = -length + 2; i < length - 1; i += 4)
      rect(c, i, y - 2, 1, 4, "#687164");
    rect(c, -length + 4, y - side * 4, length * 2 - 8, 2, accent);
  }
  box(c, -length + 2, -width + 4, length * 2 - 4, width * 2 - 8, set);
  rect(c, length - 7, -width + 6, 4, 2, hi);
  rect(c, length - 7, width - 7, 4, 2, hi);
  if (support || type === "titan") {
    const cx = support ? -9 : 16;
    box(c, cx - 4, -4, 8, 8, set);
    rect(c, cx - 3, -1, 6, 2, "#a5f8ae");
    rect(c, cx - 1, -3, 2, 6, "#a5f8ae");
  }
  for (const [i, mount] of spec.mounts.entries()) {
    const state = mountState?.[i],
      recoil = state?.recoil || 0;
    c.save();
    c.translate(mount.x, mount.y);
    c.rotate(state ? state.aim - angle : 0);
    if (mount.kind === "mg") {
      box(c, -4, -3, 7, 6, set);
      c.translate(-kick(recoil, 1.4), 0);
      rect(c, 2, -1, mount.barrel - 1, 2, k);
      rect(c, 3, -1, mount.barrel - 2, 1, l);
      muzzle(c, mount.barrel, 0, recoil, 0.5);
    } else if (mount.kind === "rocket") {
      box(c, -7, -8, 13, 16, set);
      c.translate(-kick(recoil, 4), 0);
      for (const side of [-1, 1]) {
        const y = side * 6;
        box(c, -2, y - 2, mount.barrel + 2, 5, set);
        rect(c, 1, y - 2, 8, 2, accent);
        rect(c, mount.barrel - 2, y - 1, 3, 3, k);
        if (state?.salvoLane === side) muzzle(c, mount.barrel, y, recoil, 0.9);
      }
    } else {
      box(c, -8, -7, 15, 14, set);
      c.translate(-kick(recoil, 8), 0);
      rect(c, 4, -4, mount.barrel - 3, 8, k);
      rect(c, 4, -3, mount.barrel - 6, 2, l);
      rect(c, mount.barrel - 4, -5, 4, 10, accent);
      muzzle(c, mount.barrel, 0, recoil, 1.55);
    }
    c.restore();
  }
  c.restore();
}
function aircraft(c, type, set, x, y, angle, time) {
  const [d, m, b, l, hi, k] = set,
    bomber = type === "stormBomber";
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  const wing = bomber ? 20 : 14,
    length = bomber ? 20 : 16;
  poly(
    c,
    [
      [length, 0],
      [5, -4],
      [-5, -wing],
      [-15, -wing],
      [-10, -5],
      [-length, -6],
      [-length, 6],
      [-10, 5],
      [-15, wing],
      [-5, wing],
      [5, 4],
    ],
    k,
  );
  poly(
    c,
    [
      [length - 2, 0],
      [4, -3],
      [-6, -wing + 2],
      [-13, -wing + 2],
      [-8, -4],
      [-length + 2, -4],
      [-length + 2, 4],
      [-8, 4],
      [-13, wing - 2],
      [-6, wing - 2],
      [4, 3],
    ],
    m,
  );
  poly(
    c,
    [
      [length, 0],
      [5, -3],
      [-length + 2, -3],
      [-length + 2, 3],
      [5, 3],
    ],
    l,
  );
  rect(c, 5, -2, 6, 3, "#d0f8ee");
  for (const side of [-1, 1]) {
    const sy = side * (bomber ? 10 : 6);
    box(c, -13, sy - 2, bomber ? 12 : 9, 4, set);
    rect(c, -15, sy - 1, 4, 2, "#8ce9f3");
    rect(
      c,
      -20 - (Math.floor(time * 15) % 3),
      sy,
      5 + (Math.floor(time * 15) % 3),
      1,
      "#c4fafe",
    );
    rect(c, -8, side * (wing - 3), 3, 1, hi);
  }
  c.restore();
}
function pulseVehicle(c, set, x, y, angle, aim, recoil, charge) {
  const [d, m, b, l, hi, k] = set;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  rect(c, -22, -15, 47, 34, "#161b1b68");
  for (const side of [-1, 1]) {
    box(c, -20, side * 13 - 4, 41, 8, set);
    for (let i = -18; i < 20; i += 4) rect(c, i, side * 13 - 3, 2, 5, k);
  }
  box(c, -19, -10, 38, 20, set);
  rect(c, -17, -7, 5, 14, d);
  rect(c, 15, -7, 3, 3, hi);
  rect(c, 15, 5, 3, 3, hi);
  c.rotate(aim - angle);
  box(c, -12, -9, 20, 18, set);
  c.translate(-kick(recoil, 11), 0);
  box(c, 1, -7, 30, 14, set);
  rect(c, 8, -5, 16, 10, k);
  rect(c, 25, -9, 7, 18, k);
  rect(c, 26, -8, 4, 16, l);
  rect(c, 30, -4, 3, 8, "#487180");
  for (const side of [-1, 1])
    rect(c, 8, side * 4 - 1, 17, 2, charge > 0 ? "#9cf6ff" : "#608f9b");
  if (charge > 0) {
    c.fillStyle = `rgba(99,237,255,${0.16 + charge * 0.36})`;
    c.beginPath();
    c.arc(32, 0, 5 + charge * 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#dcfdff";
    c.beginPath();
    c.arc(32, 0, 2 + charge * 3, 0, Math.PI * 2);
    c.fill();
  }
  muzzle(c, 32, 0, recoil, 1.5);
  c.restore();
}
export function vehicle(
  c,
  type,
  team,
  x,
  y,
  angle,
  aim = angle,
  recoil = 0,
  salvoLane = 0,
  mountState,
  charge = 0,
  time = 0,
) {
  if (units[type].air) {
    aircraft(c, type, colors[team], x, y, angle, time);
    return;
  }
  if (type === "pulseTank") {
    pulseVehicle(c, colors[team], x, y, angle, aim, recoil, charge);
    return;
  }
  if (units[type].mounts) {
    multiTurretTank(c, type, colors[team], x, y, angle, mountState);
    return;
  }
  if (advancedStyles[type]) {
    advancedVehicle(c, type, colors[team], x, y, angle, aim, recoil, salvoLane);
    return;
  }
  const set = colors[team],
    [d, m, b, l, hi, k] = set,
    missile = Boolean(units[type].missiles),
    artillery = Boolean(units[type].splash) && !missile,
    big = [
      "heavy",
      "heavyArtillery",
      "plasmaTank",
      "assault",
      "missileT2",
      "uraniumTank",
    ].includes(type),
    scout = type === "scout",
    miner = type === "miner",
    u = big ? 1.24 : scout ? 0.83 : type === "raider" ? 0.94 : 1;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(u, u);
  c.rotate(angle);
  rect(c, -11, -8, 27, 19, "#161b1b68");
  for (const sy of [-8, 4]) {
    rect(c, -12, sy, 23, 5, k);
    rect(c, -11, sy, 21, 1, "#636559");
    for (let i = -9; i < 10; i += 3) rect(c, i, sy + 1, 1, 3, "#55594d");
  }
  box(c, -11, -5, 23, 10, set);
  rect(c, -10, -4, 3, 8, d);
  for (let i = -10; i < -5; i += 2) rect(c, i, -4, 1, 7, k);
  rect(c, 9, -3, 2, 2, hi);
  rect(c, 9, 2, 2, 2, hi);
  if (miner) {
    box(c, -6, -4, 9, 8, set);
    rect(c, -4, -3, 5, 5, "#345363");
    rect(c, 4, -4, 7, 8, "#7e7145");
    rect(c, 5, -3, 5, 2, "#e8c779");
    rect(c, 8, 0, 3, 3, "#baa16a");
  } else if (missile) {
    c.rotate(aim - angle);
    box(c, -8, -6, 15, 12, set);
    c.translate(-kick(recoil, 6), 0);
    for (const y of [-7, 3]) {
      box(c, -5, y, 19, 5, set);
      rect(c, -2, y, 12, 1, type === "missileT2" ? "#e2b699" : "#c9bd8a");
      if (type === "missileT2") {
        rect(c, 0, y + 2, 5, 2, "#f2d489");
        rect(c, 7, y + 2, 2, 2, "#d9a963");
      }
      rect(c, 10, y + 1, 4, 3, "#101b1c");
      rect(c, 10, y, 2, 4, "#cdd0a7");
      if (salvoLane === (y < 0 ? -1 : 1)) muzzle(c, 14, y + 2, recoil, 0.82);
    }
  } else if (type === "uraniumTank") {
    c.rotate(aim - angle);
    box(c, -8, -6, 16, 12, set);
    rect(c, -5, -4, 8, 8, "#54704d");
    rect(c, -3, -2, 5, 4, "#c7e88d");
    for (const y of [-7, 5]) rect(c, -8, y, 11, 2, "#acc682");
    c.translate(-kick(recoil, 8), 0);
    rect(c, 3, -3, 18, 6, k);
    rect(c, 4, -2, 16, 3, l);
    rect(c, 13, -3, 4, 6, "#9dbc76");
    muzzle(c, 21, 0, recoil, 1.2);
  } else if (type === "plasmaTank") {
    c.rotate(aim - angle);
    box(c, -7, -5, 14, 10, set);
    rect(c, -5, -3, 8, 6, "#5a427e");
    rect(c, -4, -2, 6, 4, "#a584e9");
    rect(c, -2, -1, 3, 2, "#f1d9ff");
    c.translate(-kick(recoil, 7), 0);
    for (const py of [-4, 2]) {
      rect(c, 4, py, 14, 2, "#b694ef");
      rect(c, 13, py, 4, 2, "#f1e1ff");
    }
    if (recoil > 0.175) rect(c, 17, -2, 7, 4, "#ead6fc");
  } else if (artillery) {
    c.rotate(aim - angle);
    box(c, -8, -5, 13, 10, set);
    rect(c, -7, -3, 4, 5, "#b7a16a");
    rect(c, -6, -4, 2, 7, "#f0d392");
    c.translate(-kick(recoil, big ? 10 : 8), 0);
    rect(c, 2, -2, big ? 21 : 19, 5, k);
    rect(c, 3, -1, big ? 19 : 17, 2, hi);
    rect(c, big ? 19 : 17, -3, 4, 6, d);
    rect(c, big ? 19 : 17, -3, 4, 1, l);
    muzzle(c, big ? 23 : 21, 0, recoil, 1.45);
  } else {
    c.rotate(aim - angle);
    box(c, -5, -4, 11, 8, set);
    rect(
      c,
      -3,
      -2,
      4,
      4,
      type === "assault" ? "#c7af72" : type === "raider" ? "#9cbeb0" : d,
    );
    rect(c, -2, -2, 3, 1, hi);
    c.translate(-kick(recoil, big ? 7 : 6), 0);
    rect(c, 4, -2, big ? 17 : 13, 4, k);
    rect(c, 4, -1, big ? 16 : 12, 2, l);
    rect(c, 8, 0, big ? 10 : 6, 1, b);
    if (big) rect(c, 9, -3, 9, 1, "#c8c8ae");
    muzzle(c, big ? 21 : 17, 0, recoil);
  }
  c.restore();
}
export function structure(c, type, team, x, y, angle = 0, recoil = 0) {
  const set = colors[team],
    [d, m, b, l, hi, k] = set;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (type === "flakTower") {
    rect(c, -19, -11, 42, 29, "#20281d66");
    box(c, -17, -13, 34, 28, set);
    rect(c, -14, -11, 28, 3, "#77b9b2");
    rect(c, -14, 10, 28, 3, "#89cfc5");
    c.rotate(angle);
    box(c, -10, -9, 18, 18, set);
    c.translate(-kick(recoil, 5), 0);
    for (const y of [-5, 3]) {
      rect(c, 2, y, 16, 3, k);
      rect(c, 5, y, 12, 1, "#a0ded2");
      muzzle(c, 18, y + 1, recoil, 0.65);
    }
  } else if (type === "hq") {
    poly(
      c,
      [
        [-32, -20],
        [19, -23],
        [34, -9],
        [35, 24],
        [21, 33],
        [-24, 30],
        [-33, 17],
      ],
      "#20281d66",
    );
    box(c, -28, -17, 56, 40, set);
    rect(c, -23, -13, 46, 15, d);
    rect(c, -21, -17, 42, 18, m);
    box(c, -19, -23, 38, 24, set);
    rect(c, -14, -19, 27, 13, d);
    rect(c, -13, -18, 24, 10, b);
    rect(c, -12, -17, 22, 2, l);
    rect(c, -11, -13, 20, 3, k);
    for (let i = -9; i < 10; i += 5) rect(c, i, -12, 3, 1, hi);
    box(c, -30, 1, 13, 16, set);
    box(c, 18, 1, 13, 16, set);
    box(c, -14, 4, 27, 19, set);
    rect(c, -10, 9, 19, 14, k);
    for (let i = 10; i < 23; i += 3) rect(c, -8, i, 15, 1, d);
    rect(c, -15, 6, 28, 2, hi);
    rect(c, -24, 6, 3, 3, "#dec477");
    rect(c, 22, 6, 4, 3, "#dec477");
    line(c, 11, -22, 11, -37, k, 2);
    rect(c, 10, -37, 8, 3, l);
    rect(c, 5, -29, 12, 1, hi);
    c.save();
    c.rotate(angle);
    box(c, -5, -4, 9, 8, set);
    c.translate(-kick(recoil, 6), 0);
    rect(c, 3, -2, 13, 4, k);
    rect(c, 4, -1, 11, 2, l);
    muzzle(c, 16, 0, recoil);
    c.restore();
  } else if (type === "factory") {
    rect(c, -23, -16, 54, 42, "#171e1666");
    box(c, -24, -18, 47, 39, set);
    box(c, -21, -19, 39, 23, set);
    for (let i = -17; i < 14; i += 5) {
      rect(c, i, -15, 2, 13, m);
      rect(c, i + 2, -16, 1, 12, l);
    }
    box(c, -21, 4, 25, 16, set);
    rect(c, -16, 8, 15, 14, k);
    for (let i = 9; i < 22; i += 3) rect(c, -15, i, 13, 1, d);
    box(c, 10, 0, 13, 18, set);
    rect(c, 14, 3, 4, 9, k);
    rect(c, 15, 5, 2, 2, "#d8c787");
  } else if (type === "generator") {
    rect(c, -18, -13, 43, 32, "#18211766");
    box(c, -19, -13, 38, 29, set);
    box(c, -15, -16, 13, 26, set);
    box(c, 3, -16, 13, 26, set);
    for (let i = -11; i < 9; i += 5) {
      rect(c, -12, i, 7, 2, k);
      rect(c, 6, i, 7, 2, k);
      rect(c, -12, i, 6, 1, "#a9bc85");
      rect(c, 6, i, 6, 1, "#a9bc85");
    }
    rect(c, -3, -9, 6, 20, d);
    rect(c, -1, -7, 2, 12, "#cdd794");
  } else if (type === "uraniumPlant") {
    rect(c, -24, -17, 52, 41, "#222c1d70");
    box(c, -22, -18, 44, 37, set);
    for (const x of [-16, 3]) {
      box(c, x, -23, 13, 29, set);
      rect(c, x + 3, -19, 6, 21, "#566d43");
      rect(c, x + 4, -16, 4, 14, "#b2d67d");
      rect(c, x + 5, -15, 2, 10, "#e0f0a2");
    }
    box(c, -17, 10, 32, 7, set);
    rect(c, -11, 12, 20, 2, "#a7c675");
  } else if (type === "outpost") {
    rect(c, -24, -17, 52, 40, "#1f291b70");
    box(c, -21, -16, 42, 33, set);
    box(c, -17, -17, 34, 14, set);
    rect(c, -13, -14, 20, 5, k);
    for (let i = -11; i < 7; i += 4) rect(c, i, -13, 2, 2, hi);
    line(c, -13, -15, -13, -29, k, 2);
    rect(c, -17, -29, 8, 2, l);
    box(c, -11, 4, 22, 10, set);
    rect(c, -7, 8, 13, 6, k);
    c.save();
    c.rotate(angle);
    box(c, -4, -4, 9, 8, set);
    c.translate(-kick(recoil, 6), 0);
    rect(c, 3, -2, 13, 4, k);
    rect(c, 4, -1, 11, 2, l);
    muzzle(c, 16, 0, recoil);
    c.restore();
  } else if (type === "lab") {
    rect(c, -23, -15, 52, 39, "#22233575");
    box(c, -22, -16, 44, 32, set);
    box(c, -19, -19, 33, 26, set);
    c.fillStyle = "#5b4e79";
    c.beginPath();
    c.ellipse(-2, -8, 13, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#a990d6";
    c.beginPath();
    c.ellipse(-4, -11, 10, 5, 0, 0, Math.PI * 2);
    c.fill();
    rect(c, -8, -12, 7, 2, "#efdaff");
    rect(c, -12, 8, 26, 6, "#38334a");
    for (let i = -10; i < 13; i += 6) rect(c, i, 10, 3, 2, "#c8a9f3");
    line(c, 17, -5, 17, -24, k, 3);
    rect(c, 15, -25, 8, 3, "#d0ade8");
  } else if (type === "repair" || type === "uraniumRepair") {
    rect(c, -22, -13, 49, 36, "#1b221966");
    box(c, -22, -16, 44, 34, set);
    box(c, -18, -15, 36, 12, set);
    rect(c, -12, -2, 24, 17, k);
    for (let i = -11; i < 12; i += 3) rect(c, i, 0, 1, 14, "#4c6751");
    if (type === "uraniumRepair") {
      rect(c, -21, -16, 6, 31, "#a8c575");
      rect(c, 15, -16, 6, 31, "#a8c575");
    }
    rect(c, -4, -12, 8, 6, type === "uraniumRepair" ? "#a0bd6c" : "#719b7a");
    rect(c, -1, -13, 2, 8, "#d1eab9");
    rect(c, -4, -10, 8, 2, "#d1eab9");
    for (const x of [-18, 15]) {
      rect(c, x, 0, 3, 10, "#29372a");
      rect(c, x, 12, 3, 2, "#aad696");
    }
  } else if (type === "refinery") {
    rect(c, -23, -14, 51, 38, "#1b221966");
    box(c, -22, -16, 44, 37, set);
    for (const x of [-16, 4]) {
      box(c, x, -12, 12, 23, set);
      rect(c, x + 3, -11, 4, 14, "#5aa5a5");
      rect(c, x + 4, -10, 2, 8, "#ade0cc");
    }
    box(c, -10, 9, 20, 8, set);
    rect(c, -6, 12, 12, 2, "#dec16e");
    line(c, 16, 0, 17, -21, k, 4);
    rect(c, 16, -22, 7, 3, l);
  } else {
    const mortar = type === "mortar";
    rect(c, -15, -10, 37, 30, "#1b221966");
    box(c, -15, -11, 30, 28, set);
    box(c, -11, -13, 22, 20, set);
    c.save();
    c.rotate(angle);
    box(c, -8, -5, 16, 10, set);
    c.translate(-kick(recoil, mortar ? 10 : 7), 0);
    rect(c, 4, mortar ? -5 : -3, mortar ? 23 : 19, mortar ? 10 : 6, k);
    rect(c, 6, mortar ? -3 : -2, mortar ? 19 : 16, mortar ? 6 : 3, l);
    rect(c, 8, 0, 13, 1, m);
    if (mortar) rect(c, 21, -5, 4, 10, "#b5b48a");
    muzzle(c, mortar ? 27 : 23, 0, recoil, mortar ? 1.6 : 1);
    c.restore();
    rect(c, -13, 10, 3, 2, "#e8c578");
    rect(c, 10, 10, 3, 2, "#e8c578");
  }
  c.restore();
}
export function relay(c, r) {
  const { x, y } = r;
  const set = colors[r.owner],
    [d, m, b, l, hi, k] = set;
  c.save();
  c.translate(x, y);
  c.strokeStyle = l + "a0";
  c.setLineDash([4, 3]);
  c.lineWidth = 1;
  c.beginPath();
  c.arc(0, 0, 27, 0, 7);
  c.stroke();
  c.setLineDash([]);
  rect(c, -9, -5, 24, 16, "#1b211866");
  box(c, -10, -8, 20, 16, set);
  box(c, -6, -12, 12, 12, set);
  rect(c, -2, -21, 4, 15, d);
  rect(c, -1, -21, 2, 14, l);
  rect(c, -5, -21, 10, 3, hi);
  if (Math.abs(r.progress) > 0 && r.progress !== r.owner) {
    rect(c, -21, 15, 42, 3, k);
    rect(
      c,
      -21,
      15,
      42 * Math.abs(r.progress),
      2,
      r.progress > 0 ? "#a2cdd1" : "#e2957c",
    );
  }
  c.restore();
}
export function icon(type) {
  const cv = document.createElement("canvas");
  cv.width = 48;
  cv.height = 42;
  cv.setAttribute("aria-hidden", "true");
  const c = cv.getContext("2d");
  if (
    units[type]?.mounts ||
    units[type]?.air ||
    type === "pulseTank" ||
    type === "railgun" ||
    type === "siegeBreaker"
  ) {
    c.translate(23, 21);
    c.scale(0.8, 0.8);
    vehicle(c, type, 1, 0, 0, -0.42);
  } else if (units[type]) vehicle(c, type, 1, 22, 21, -0.42);
  else {
    c.save();
    c.translate(24, 21);
    c.scale(0.63, 0.63);
    structure(c, type, 1, 0, 0, -0.57);
    c.restore();
  }
  return cv;
}
export function marker(c, x, y, text, team = 0, tint = null) {
  const color =
    tint || (team === 1 ? "#c0d7d5" : team === -1 ? "#efb49a" : "#efce84");
  c.font = "bold 10px monospace";
  c.textAlign = "center";
  const w = Math.ceil(c.measureText(text).width) + 13;
  rect(c, Math.round(x - w / 2), Math.round(y - 11), w, 15, "#21281feb");
  rect(
    c,
    Math.round(x - w / 2),
    Math.round(y - 11),
    2,
    15,
    team === 1 ? "#79a1b6" : team === -1 ? "#ac6252" : "#c5a75f",
  );
  c.fillStyle = color;
  c.fillText(text, Math.round(x + 1), Math.round(y));
  c.textAlign = "start";
}
export function brackets(c, x, y, s, color) {
  const z = 5;
  c.fillStyle = color;
  for (const dx of [-1, 1])
    for (const dy of [-1, 1]) {
      const a = Math.round(x + dx * s),
        b = Math.round(y + dy * s);
      rect(c, a - (dx > 0 ? z - 1 : 0), b, z, 1, color);
      rect(c, a, b - (dy > 0 ? z - 1 : 0), 1, z, color);
    }
}

export function drawSmoke(c, g) {
  for (const s of g.smoke) {
    const p = 1 - s.life / s.total,
      r = 2 + p * 5;
    c.globalAlpha = (1 - p) * 0.66;
    const x = Math.round(s.x + s.lane * p * 4),
      y = Math.round(s.y - p * 5);
    rect(c, x - r, y - r, r * 2, r * 2, "#a9a998");
    rect(c, x - r / 2, y - r - 2, r + 1, r, "#e2d8bd");
  }
  c.globalAlpha = 1;
}
export function drawMissile(c, m) {
  if (m.age <= 0) return;
  c.save();
  c.translate(m.x, m.y);
  c.rotate(m.angle);
  poly(
    c,
    [
      [-5, -2],
      [-13, 0],
      [-5, 2],
    ],
    "#f7ac59",
  );
  rect(c, -9, -0.7, 6, 1.4, "#fff3bd");
  rect(c, -4, -2, 9, 4, "#343b30");
  rect(c, -3, -1, 8, 2, "#f2e8bc");
  rect(c, 4, -1, 3, 2, "#d57556");
  c.restore();
}
export function drawBurst(c, b) {
  const p = clamp(1 - b.life / b.total, 0, 1),
    plasma = b.style === "plasma",
    spark = b.style === "spark",
    big = b.style === "debris";
  const r = b.radius * (1 - Math.pow(1 - p, 2.2)) * (spark ? 1 : 1.55);
  c.globalAlpha = (1 - p) * (spark ? 0.8 : 0.94);
  c.strokeStyle = plasma ? "#ead9ff" : spark ? "#ffdd87" : "#f5dd9a";
  c.lineWidth = (spark ? 1.25 : 2.6) * (1 - 0.62 * p);
  c.beginPath();
  c.ellipse(b.x, b.y, Math.max(1, r), Math.max(1, r * 0.75), 0, 0, Math.PI * 2);
  c.stroke();
  if (!spark) {
    const second = Math.max(1, r * 0.65);
    c.lineWidth = 1.5;
    c.strokeStyle = plasma ? "#ae7fe9" : "#eaa068";
    c.beginPath();
    c.ellipse(b.x, b.y, second, second * 0.75, 0, 0, Math.PI * 2);
    c.stroke();
  }
  if (p < 0.33) {
    const f = b.radius * (spark ? 0.27 : 0.45) * (1 - p);
    c.globalAlpha = (1 - p) * 0.86;
    poly(
      c,
      [
        [b.x - f, b.y],
        [b.x, b.y - f],
        [b.x + f, b.y],
        [b.x, b.y + f],
      ],
      plasma ? "#b683e5" : "#ffaf53",
    );
    rect(c, b.x - f * 0.36, b.y - f * 0.36, f * 0.72, f * 0.72, "#fff6bd");
  }
  for (let i = 0; i < (spark ? 6 : 12); i++) {
    const angle = i * 2.39997 + b.x * 0.33;
    const v = (0.32 + (i % 5) * 0.15) * r;
    const x = b.x + Math.cos(angle) * v,
      y = b.y + Math.sin(angle) * v * 0.8 - p * ((i % 3) + 1) * 3;
    const size = (spark ? 1.5 : 3) + (i % 3) * 1.1;
    c.globalAlpha = (1 - p) * (i % 3 === 1 ? 0.56 : 0.9);
    rect(
      c,
      x - size * 0.5,
      y - size * 0.5,
      size,
      size,
      i % 3 === 0
        ? "#ffeab2"
        : i % 3 === 1 && p > 0.28
          ? big
            ? "#424135"
            : "#a99b7c"
          : "#e8964f",
    );
  }
  c.globalAlpha = 1;
}

export function drawPlasma(c, shot) {
  const t = 1 - shot.life / shot.total,
    dx = shot.tx - shot.x,
    dy = shot.ty - shot.y;
  const x = shot.x + dx * t,
    y = shot.y + dy * t;
  line(
    c,
    x - dx * Math.min(0.22, t),
    y - dy * Math.min(0.22, t),
    x,
    y,
    "#9f63e2a0",
    7,
  );
  line(
    c,
    x - dx * Math.min(0.1, t),
    y - dy * Math.min(0.1, t),
    x,
    y,
    "#edd1ff",
    2.5,
  );
  c.fillStyle = "#c997fb90";
  c.beginPath();
  c.arc(x, y, 7, 0, Math.PI * 2);
  c.fill();
  rect(c, x - 2, y - 2, 4, 4, "#fff0ff");
}
