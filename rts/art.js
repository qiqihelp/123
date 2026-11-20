import { W, H, catalog, units, clamp } from "./sim.mjs";
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
];
function seg(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax,
    dy = by - ay,
    t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}
function road(x, y) {
  let r = 500;
  for (const line of routes)
    for (let i = 1; i < line.length; i++)
      r = Math.min(r, seg(x, y, line[i - 1], line[i]));
  return r;
}
function water(x, y) {
  return Math.max(
    1 - Math.hypot((x - 124) / 196, (y - 24) / 113),
    1 - Math.hypot((x - 832) / 136, (y - 575) / 96),
    1 - Math.hypot((x - 959) / 64, (y - 536) / 123),
  );
}
const clearings = [
  [215, 450, 125],
  [767, 151, 115],
  [484, 179, 28],
  [624, 385, 30],
  [167, 354, 28],
  [791, 357, 30],
  [298, 162, 25],
];
function clearing(x, y) {
  return clearings.some(([a, b, r]) => Math.hypot(x - a, y - b) < r);
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
function mine(c, x, y) {
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
      i % 3 === 0 ? "#8ebfc4" : "#589da9",
    );
    poly(
      c,
      [
        [a + 1, b + 2],
        [a + k, b - 3],
        [a + k, b + 2],
        [a + 1, b + 4],
      ],
      "#41767b",
    );
    rect(c, a, b - k + 1, k / 2, 1, "#bad2bc");
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
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const sx = x & ~1,
        sy = y & ~1,
        n =
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
      const patch =
        Math.max(
          ...clearings.map(([a, b, r]) => 1 - Math.hypot(sx - a, sy - b) / r),
        ) +
        (noise(sx, sy, 29) - 0.5) * 0.32;
      let base = [79 + n * 49, 87 + n * 39, 59 + n * 26];
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
      const k = (y * W + x) * 4;
      d[k] = base[0] + j;
      d[k + 1] = base[1] + j;
      d[k + 2] = base[2] + j;
      d[k + 3] = 255;
    }
  c.putImageData(im, 0, 0);
  const r = rng(57193);
  for (let i = 0; i < 9100; i++) {
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
  for (let i = 0; i < 325; i++) {
    const x = Math.round(r() * W),
      y = Math.round(r() * H);
    if (water(x, y) > 0.1 || road(x, y) < 25 || clearing(x, y)) continue;
    const n = noise(x + 101, y + 213, 67);
    if (n > 0.57) rock(c, x, y, 0.32 + r() * 0.95, r() < 0.43);
  }
  const forest = [];
  for (let i = 0; i < 2100; i++) {
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
  for (const m of g.mines) mine(c, m.x, m.y);
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
export function vehicle(c, type, team, x, y, angle) {
  const set = colors[team],
    [d, m, b, l, hi, k] = set,
    big = type === "heavy",
    scout = type === "scout",
    miner = type === "miner",
    u = big ? 1.24 : scout ? 0.83 : 1;
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
  } else {
    box(c, -5, -4, 11, 8, set);
    rect(c, -3, -2, 4, 4, d);
    rect(c, -2, -2, 3, 1, hi);
    rect(c, 4, -2, big ? 17 : 13, 4, k);
    rect(c, 4, -1, big ? 16 : 12, 2, l);
    rect(c, 8, 0, big ? 10 : 6, 1, b);
    if (big) rect(c, 9, -3, 9, 1, "#c8c8ae");
  }
  c.restore();
}
export function structure(c, type, team, x, y, angle = 0) {
  const set = colors[team],
    [d, m, b, l, hi, k] = set;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (type === "hq") {
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
  } else {
    rect(c, -15, -10, 37, 30, "#1b221966");
    box(c, -15, -11, 30, 28, set);
    box(c, -11, -13, 22, 20, set);
    c.save();
    c.rotate(angle);
    box(c, -8, -5, 16, 10, set);
    rect(c, 4, -3, 19, 6, k);
    rect(c, 6, -2, 16, 3, l);
    rect(c, 8, 0, 13, 1, m);
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
  if (units[type]) vehicle(c, type, 1, 22, 21, -0.42);
  else {
    c.save();
    c.translate(24, 21);
    c.scale(0.63, 0.63);
    structure(c, type, 1, 0, 0, -0.57);
    c.restore();
  }
  return cv;
}
export function marker(c, x, y, text, team = 0) {
  const color = team === 1 ? "#c0d7d5" : team === -1 ? "#efb49a" : "#efce84";
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
