import {
  W,
  H,
  START_VIEW,
  techs,
  minerals,
  crystalIncome,
  researchBlocked,
  startResearch,
  units,
  catalog,
  clamp,
  dist,
  createGame,
  blocked,
  enqueue,
  selected,
  order,
  stop,
  step,
  income,
  load,
  capacity,
  fleet,
  relayCount,
  mining,
} from "./sim.mjs";
import {
  terrain,
  vehicle,
  structure,
  relay,
  icon,
  marker,
  brackets,
  drawBurst,
  drawPlasma,
  drawSmoke,
  drawMissile,
} from "./art.js";
const $ = (id) => document.getElementById(id);
const canvas = $("map"),
  c = canvas.getContext("2d"),
  mini = $("mini"),
  mc = mini.getContext("2d");
const divisions = {
  units: {
    title: "部署单位",
    types: ["miner", "scout", "tank", "heavy", "raider", "assault"],
  },
  artillery: {
    title: "火炮支援",
    types: [
      "lightArtillery",
      "heavyArtillery",
      "missileTank",
      "plasmaTank",
      "missileT2",
    ],
  },
  build: {
    title: "基地建设",
    types: ["generator", "turret", "repair", "refinery", "mortar", "lab"],
  },
  tech: { title: "研究中心 · 科技树", types: Object.keys(techs) },
};
let g = createGame(),
  ground = terrain(g),
  radarGround = document.createElement("canvas"),
  camera = { ...START_VIEW },
  view = { x: 0, y: 0, s: 1 },
  paused = false,
  tab = "units",
  mode = "auto",
  pointer = null,
  lastTap = null,
  boxIds = null,
  ping = null,
  last = 0,
  acc = 0,
  lastUI = -1,
  lastNoise = -1000,
  shownResult = null,
  selectedKey = "",
  cards = [],
  sound = false,
  audio;
radarGround.width = mini.width;
radarGround.height = mini.height;
radarGround.getContext("2d").drawImage(ground, 0, 0, mini.width, mini.height);
const keys = new Set();
const touches = new Map();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const rotated = matchMedia("(orientation: portrait) and (pointer: coarse)");
const two = (n) => String(n).padStart(2, "0");
function status(text) {
  if (text) $("status").textContent = text;
}
function beep(tone = 350, volume = 0.045) {
  if (!sound || !audio || audio.state !== "running") return;
  const o = audio.createOscillator(),
    v = audio.createGain(),
    t = audio.currentTime;
  o.type = "triangle";
  o.frequency.setValueAtTime(tone, t);
  o.frequency.exponentialRampToValueAtTime(tone * 0.65, t + 0.11);
  v.gain.setValueAtTime(volume, t);
  v.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(v).connect(audio.destination);
  o.start(t);
  o.stop(t + 0.13);
}
function calcView() {
  const s = Math.min(canvas.width / W, canvas.height / H) * camera.z;
  const hw = canvas.width / (2 * s),
    hh = canvas.height / (2 * s);
  camera.x = hw >= W / 2 ? W / 2 : clamp(camera.x, hw, W - hw);
  camera.y = hh >= H / 2 ? H / 2 : clamp(camera.y, hh, H - hh);
  view = {
    x: Math.round(canvas.width / 2 - camera.x * s),
    y: Math.round(canvas.height / 2 - camera.y * s),
    s,
  };
}
function resize() {
  canvas.width = Math.max(1, canvas.clientWidth);
  canvas.height = Math.max(1, canvas.clientHeight);
  pointer = boxIds = lastTap = null;
  touches.clear();
  calcView();
}
new ResizeObserver(resize).observe(canvas);
resize();
function zoom(change) {
  camera.z = clamp(camera.z * change, 1, 8);
  calcView();
}
function fractions(e, el) {
  const r = el.getBoundingClientRect();
  // The portrait fallback renders the whole cockpit 90° clockwise.
  return rotated.matches
    ? { x: (e.clientY - r.top) / r.height, y: (r.right - e.clientX) / r.width }
    : { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}
function pos(e) {
  const uv = fractions(e, canvas),
    sx = uv.x * canvas.width,
    sy = uv.y * canvas.height;
  return { sx, sy, x: (sx - view.x) / view.s, y: (sy - view.y) / view.s };
}
function fit(p) {
  return { x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) };
}
function setMode(next) {
  mode = next;
  $("move").classList.toggle("active", mode === "move");
  $("attack").classList.toggle("active", mode === "attack");
  $("move").setAttribute("aria-pressed", String(mode === "move"));
  $("attack").setAttribute("aria-pressed", String(mode === "attack"));
}
function issue(p, m, targetId) {
  if (g.result) return;
  const pt = fit(p);
  const text = order(g, pt.x, pt.y, m, targetId);
  if (selected(g).some((a) => units[a.type])) {
    ping = {
      ...pt,
      sweep: m === "sweep" || (m === "attack" && !text.includes("锁定")),
      start: performance.now(),
      color:
        m === "attack" || m === "sweep" || text.includes("锁定")
          ? "#f3aa85"
          : "#cadea0",
    };
    beep(430);
  }
  status(text);
  setMode("auto");
}
function setOrderButton(next) {
  if (!selected(g).some((a) => units[a.type])) {
    status("请先选择一支移动部队。");
    return;
  }
  const target = mode === next ? "auto" : next;
  setMode(target);
  status(
    target === "auto"
      ? "已取消指令。"
      : target === "move"
        ? "点击地图设置移动目标，或派采矿车前往矿床。"
        : "点击敌军攻击，或点击地面向该区域推进。",
  );
}
function halt() {
  if (!selected(g).some((a) => units[a.type])) {
    status("请先选择一支移动部队。");
    return;
  }
  stop(g);
  lastTap = null;
  setMode("auto");
  status("部队已停止，继续警戒。");
}
function touchBox() {
  if (!boxIds) return null;
  const [a, b] = boxIds.map((id) => touches.get(id));
  return a && b ? { from: pos(a), to: pos(b) } : null;
}
function selectBox({ from: a, to: b }, append = false, margin = 0) {
  if (!append) g.selected.clear();
  for (const u of g.actors)
    if (
      u.team === 1 &&
      units[u.type] &&
      u.x >= Math.min(a.x, b.x) - margin &&
      u.x <= Math.max(a.x, b.x) + margin &&
      u.y >= Math.min(a.y, b.y) - margin &&
      u.y <= Math.max(a.y, b.y) + margin
    )
      g.selected.add(u.id);
  setMode("auto");
  refreshSelection();
  if (g.selected.size) beep(530, 0.03);
}
function hitUnit(pt, touch = false, team = 0) {
  return g.actors
    .filter(
      (u) =>
        (!team || u.team === team) &&
        dist(u, pt) <
          Math.max(catalog[u.type].size + 5, touch ? 9 / view.s : 0),
    )
    .sort((a, b) => dist(a, pt) - dist(b, pt))[0];
}
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (e.pointerType !== "touch" && !touches.size) issue(pos(e), "auto");
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.button !== 1) return;
  canvas.setPointerCapture(e.pointerId);
  const touch = e.pointerType === "touch";
  if (touch) {
    touches.set(e.pointerId, e);
    if (touches.size >= 2) {
      if (touches.size === 2) boxIds = [...touches.keys()];
      pointer = lastTap = null;
      return;
    }
  }
  const p = pos(e);
  pointer = {
    id: e.pointerId,
    from: p,
    to: p,
    touch,
    shift: e.shiftKey,
    pan: e.button === 1 || e.altKey,
    cx: camera.x,
    cy: camera.y,
  };
});
canvas.addEventListener("pointermove", (e) => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, e);
  if (boxIds) return;
  const p = pos(e);
  $("coords").innerHTML =
    `SEC 07 <span>//</span> ${String(Math.floor(clamp(p.x, 0, W))).padStart(4, "0")} : ${String(Math.floor(clamp(p.y, 0, H))).padStart(3, "0")}`;
  if (pointer?.id !== e.pointerId) return;
  pointer.to = p;
  if (pointer.touch && isDrag(pointer) && !pointer.pan) {
    pointer.pan = true;
    lastTap = null;
    if (camera.z === 1) {
      camera.z = 1.45;
      calcView();
      // Make the point under the initial finger stay under the moving finger.
      pointer.cx =
        camera.x + pointer.from.x - (pointer.from.sx - view.x) / view.s;
      pointer.cy =
        camera.y + pointer.from.y - (pointer.from.sy - view.y) / view.s;
    }
  }
  if (pointer.pan) {
    camera.x = pointer.cx + (pointer.from.sx - p.sx) / view.s;
    camera.y = pointer.cy + (pointer.from.sy - p.sy) / view.s;
    calcView();
  }
});
const isDrag = (p) => Math.hypot(p.to.sx - p.from.sx, p.to.sy - p.from.sy) > 8;
function finishPointer(e, cancelled = false) {
  if (boxIds?.includes(e.pointerId)) {
    if (!cancelled) {
      touches.set(e.pointerId, e);
      const box = touchBox();
      if (box) selectBox(box, false, 5 / view.s);
    }
    boxIds = null;
  }
  touches.delete(e.pointerId);
  if (pointer?.id !== e.pointerId) return;
  const drag = pointer;
  pointer = null;
  if (cancelled || drag.pan) {
    lastTap = null;
    return;
  }
  drag.to = pos(e);
  const { from: a, to: b } = drag;
  const boxSelection = !drag.touch && isDrag(drag);
  if (drag.touch && isDrag(drag)) return;
  if (!boxSelection && mode !== "auto") {
    const enemy = mode === "attack" ? hitUnit(b, drag.touch, -1) : null;
    lastTap = null;
    issue(enemy || b, mode, enemy?.id);
    return;
  }
  const hit = boxSelection ? null : hitUnit(b, drag.touch, drag.touch ? 0 : 1);
  if (
    !boxSelection &&
    drag.touch &&
    selected(g).some((u) => units[u.type]) &&
    hit?.team !== 1
  ) {
    if (hit?.team === -1) {
      lastTap = null;
      issue(hit, "auto", hit.id);
    } else if (b.x >= 0 && b.x <= W && b.y >= 0 && b.y <= H) {
      const now = performance.now();
      const double =
        lastTap &&
        now - lastTap.now <= 350 &&
        Math.hypot(lastTap.sx - b.sx, lastTap.sy - b.sy) <= 26;
      lastTap = double ? null : { sx: b.sx, sy: b.sy, now };
      // The first tap is immediate; a second tap replaces it with a sweep.
      issue(b, double ? "sweep" : "move");
    }
    return;
  }
  lastTap = null;
  if (boxSelection) {
    selectBox({ from: a, to: b }, drag.shift);
    return;
  }
  if (!drag.shift) g.selected.clear();
  if (hit?.team === 1) {
    if (drag.shift && g.selected.has(hit.id)) g.selected.delete(hit.id);
    else g.selected.add(hit.id);
    if (hit.type === "lab") setTab("tech");
  }
  setMode("auto");
  refreshSelection();
  if (g.selected.size) beep(530, 0.03);
}
canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", (e) => finishPointer(e, true));
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const p = pos(e);
    zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    const after = pos(e);
    camera.x += p.x - after.x;
    camera.y += p.y - after.y;
    calcView();
  },
  { passive: false },
);
mini.addEventListener("pointerdown", (e) => {
  const uv = fractions(e, mini);
  if (camera.z === 1) camera.z = START_VIEW.z;
  camera.x = uv.x * W;
  camera.y = uv.y * H;
  calcView();
});
$("zoom-in").onclick = () => zoom(1.25);
$("zoom-out").onclick = () => zoom(0.8);
$("view-home").onclick = () => {
  camera = { ...START_VIEW };
  calcView();
};
$("move").onclick = () => setOrderButton("move");
$("attack").onclick = () => setOrderButton("attack");
$("stop").onclick = $("touch-stop").onclick = halt;
function togglePause() {
  if (g.result) return;
  paused = !paused;
  updatePause();
  status(paused ? "战斗已暂停。" : "战斗继续。");
}
function showMessage(text) {
  $("map-message").hidden = !text;
  $("map-message").textContent = text;
}
function updatePause() {
  const b = $("pause");
  b.classList.toggle("play", paused);
  b.setAttribute("aria-label", paused ? "继续" : "暂停");
  b.title = paused ? "继续 (P)" : "暂停 (P)";
  showMessage(
    g.result
      ? g.result === "victory"
        ? "任务完成 / VICTORY"
        : "任务失败 / DEFEAT"
      : paused
        ? "战斗暂停 / PAUSED"
        : "",
  );
}
$("pause").onclick = togglePause;
function modal(id) {
  keys.clear();
  $(id).showModal();
}
$("help").onclick = $("compact-help").onclick = () => modal("guide");
$("landscape").onclick = async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    /* iOS and some embeds do not support fullscreen. */
  }
  try {
    await screen.orientation?.lock?.("landscape");
  } catch {
    /* rotation lock is optional. */
  }
};
document.addEventListener("fullscreenchange", () => {
  $("landscape").setAttribute(
    "aria-pressed",
    String(Boolean(document.fullscreenElement)),
  );
});

$("close-guide").onclick = $("guide-ok").onclick = () => $("guide").close();
$("restart").onclick = () => modal("reset-dialog");
$("cancel-reset").onclick = () => $("reset-dialog").close();
$("confirm-reset").onclick = () => {
  $("reset-dialog").close();
  g = createGame();
  camera = { ...START_VIEW };
  calcView();
  paused = false;
  shownResult = null;
  pointer = ping = boxIds = lastTap = null;
  touches.clear();
  acc = 0;
  lastUI = -1;
  selectedKey = "";
  setMode("auto");
  setTab("units");
  updatePause();
  status("前线就绪。指挥官，等待您的指令。");
  refresh();
};
$("sound").onclick = () => {
  if (!window.AudioContext && !window.webkitAudioContext) {
    status("当前浏览器不支持游戏音效。");
    return;
  }
  sound = !sound;
  if (sound) {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio
      .resume()
      .then(() => beep(490))
      .catch(() => status("无法开启音效。"));
  }
  $("sound").setAttribute("aria-pressed", String(sound));
  $("sound").lastElementChild.textContent = sound ? "音效 开" : "音效 关";
};
window.addEventListener("blur", () => keys.clear());
const keyboardBlocked = () => $("guide").open || $("reset-dialog").open;
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (keyboardBlocked() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(k)
  ) {
    keys.add(k);
    e.preventDefault();
  }
  if (e.repeat) return;
  if (k === "p") togglePause();
  if (k === "m") setOrderButton("move");
  if (k === "f") setOrderButton("attack");
  if (k === "x") halt();
  if (k === "escape") {
    setMode("auto");
    g.selected.clear();
    refreshSelection();
  }
  if (k === "+" || k === "=") zoom(1.25);
  if (k === "-") zoom(0.8);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
function setTab(name) {
  tab = name;
  Object.keys(divisions).forEach((t) => {
    const el = $(t + "-tab");
    el.classList.toggle("active", t === tab);
    el.setAttribute("aria-pressed", String(t === tab));
  });
  $("list-title").textContent = divisions[tab].title;
  const list = $("unit-list");
  list.replaceChildren();
  cards = [];
  list.classList.toggle("research-tree", tab === "tech");
  for (const type of divisions[tab].types) {
    const isTech = tab === "tech",
      spec = isTech ? techs[type] : catalog[type];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = isTech
      ? "research-card" +
        (spec.requires ? " research-branch" : " research-root")
      : "unit-card" + (spec.tech ? " tier-unit" : "");
    const info = document.createElement("span");
    info.innerHTML = `<span class="unit-name">${spec.name}</span><span class="unit-desc">${isTech ? spec.short : spec.desc}</span>`;
    const cost = document.createElement("span");
    cost.className = "unit-cost";
    cost.innerHTML = `◆ ${spec.cost}${spec.crystal ? ` <span class="crystal-cost">◇ ${spec.crystal}</span>` : ""}`;
    if (!isTech) btn.append(icon(type));
    const state = document.createElement("span");
    state.className = "research-state";
    btn.append(info, cost);
    if (isTech) btn.append(state);
    btn.onclick = () => {
      const err = isTech ? startResearch(g, type) : enqueue(g, type);
      status(
        err ||
          (isTech
            ? "已开始研究 " + spec.name + "。"
            : spec.name + "已加入生产队列。"),
      );
      if (!err) beep(560, 0.035);
      refresh();
    };
    list.append(btn);
    cards.push({ btn, type, isTech, state });
  }
  refresh();
}
for (const category of Object.keys(divisions))
  $(category + "-tab").onclick = () => setTab(category);
function refreshSelection() {
  const sel = selected(g);
  $("touch-selection").textContent = two(sel.length);
  $("touch-stop").disabled =
    !sel.some((u) => units[u.type]) || Boolean(g.result);
  const key = sel.map((a) => a.id).join(",");
  $("select-count").textContent = two(sel.length);
  const parent = $("selected-body");
  if (key !== selectedKey || !parent.firstChild) {
    selectedKey = key;
    parent.replaceChildren();
    if (!sel.length) {
      parent.textContent = "还未选择任何单位";
    } else {
      parent.append(icon(sel[0].type));
      const info = document.createElement("div");
      info.className = "selection-details";
      info.innerHTML = `<strong>${sel.length === 1 ? catalog[sel[0].type].name : "混合编队 × " + sel.length}</strong><span class="health-label"></span><div class="hp"><i></i></div>`;
      parent.append(info);
    }
  }
  if (sel.length) {
    const hp = sel.reduce((sum, a) => sum + a.hp, 0),
      max = sel.reduce((sum, a) => sum + catalog[a.type].hp, 0);
    const shieldMax = sel.reduce(
      (sum, a) => sum + (catalog[a.type].shield || 0),
      0,
    );
    const shield = sel.reduce((sum, a) => sum + (a.shield || 0), 0);
    parent.querySelector(".health-label").textContent =
      `${Math.ceil(hp)} / ${max}` +
      (shieldMax ? ` · 护盾 ${shield}/${shieldMax}` : "");
    parent.querySelector(".hp i").style.width = (hp / max) * 100 + "%";
  }
  for (const id of ["attack", "move", "stop"])
    $(id).disabled = !sel.some((a) => units[a.type]) || Boolean(g.result);
}
function refresh() {
  const t = Math.floor(g.time);
  $("clock").textContent = two(Math.floor(t / 60)) + ":" + two(t % 60);
  $("ore").textContent = Math.floor(g.ore);
  $("income").textContent = "+" + income(g);
  $("crystal").textContent = Math.floor(g.crystal);
  $("crystal-income").textContent = "+" + crystalIncome(g);
  $("research-hud").hidden = tab !== "tech";
  $("production-hud").hidden = tab === "tech";
  $("research-tier").textContent = g.tech.has("t2") ? "T2" : "T1";
  $("power").innerHTML = load(g) + ` <span>/ ${capacity(g)}</span>`;
  $("population").innerHTML = fleet(g) + " <span>/ 30</span>";
  const remaining = Math.max(0, Math.ceil(g.nextWave - g.time));
  const reinforces = g.actors.some(
    (a) => a.team === -1 && a.type === "factory",
  );
  $("wave-time").textContent = reinforces
    ? two(Math.floor(remaining / 60)) + ":" + two(remaining % 60)
    : "—";
  $("wave-progress").style.width = reinforces
    ? 100 * clamp((g.time - g.lastWave) / (g.nextWave - g.lastWave), 0, 1) + "%"
    : "0%";
  const count = relayCount(g);
  $("relay-count").textContent = count + " / " + g.relays.length;
  $("objective-relay").classList.toggle("done", count === g.relays.length);
  $("objective-main").classList.toggle("done", g.result === "victory");
  const job = g.queue[0];
  $("queue").textContent = job
    ? `${two(g.queue.length)} · ${Math.ceil(job.left)}s`
    : "00";
  $("queue").title = job ? catalog[job.type].name : "";
  for (const { btn, type, isTech, state } of cards) {
    const spec = isTech ? techs[type] : catalog[type];
    const reason = isTech ? researchBlocked(g, type) : blocked(g, type);
    btn.disabled = Boolean(reason);
    if (isTech) {
      const researching = g.research?.key === type;
      btn.classList.toggle("research-done", g.tech.has(type));
      btn.classList.toggle("research-active", researching);
      btn.style.setProperty(
        "--research-progress",
        researching ? 100 * (1 - g.research.left / spec.time) + "%" : "0%",
      );
      state.textContent = researching
        ? load(g) > capacity(g)
          ? "供电不足 · 已暂停"
          : "研究中 · " + Math.ceil(g.research.left) + "s"
        : reason || "可研究 · " + spec.time + "s";
      btn.title = spec.desc;
    } else {
      btn.title =
        reason ||
        (spec.range
          ? `射程 ${spec.range} · 单发伤害 ${spec.damage} · 间隔 ${spec.rate} 秒`
          : `部署${spec.name} · ${spec.time} 秒`);
    }
  }
  if (g.events.length) {
    status(g.events.join(" "));
    g.events.length = 0;
  }
  if (g.result && shownResult !== g.result) {
    shownResult = g.result;
    updatePause();
    status(
      g.result === "victory"
        ? "敌方指挥中心已摧毁，灰烬盆地已夺取。"
        : "我方指挥中心已失守。可重新部署，再战灰烬盆地。",
    );
    beep(g.result === "victory" ? 780 : 170, 0.07);
  }
  refreshSelection();
}
function render(now) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = "#363e2e";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.imageSmoothingEnabled = false;
  const impulse = reducedMotion.matches
    ? 0
    : g.bursts.reduce(
        (k, b) =>
          b.style !== "spark" &&
          b.total - b.life < 0.14 &&
          b.x * view.s + view.x >= 0 &&
          b.x * view.s + view.x <= canvas.width &&
          b.y * view.s + view.y >= 0 &&
          b.y * view.s + view.y <= canvas.height
            ? Math.max(k, 1 - (b.total - b.life) / 0.14)
            : k,
        0,
      );
  const shakeX = Math.round(Math.sin(g.time * 210) * impulse * 2.8),
    shakeY = Math.round(Math.cos(g.time * 168) * impulse * 1.7);
  c.setTransform(view.s, 0, 0, view.s, view.x + shakeX, view.y + shakeY);
  // Upload only the visible region of the fivefold map; the minimap has its own cache.
  const gx = clamp(Math.floor(-view.x / view.s) - 5, 0, W - 1),
    gy = clamp(Math.floor(-view.y / view.s) - 5, 0, H - 1);
  const gw =
    clamp(Math.ceil((canvas.width - view.x) / view.s) + 5, gx + 1, W) - gx;
  const gh =
    clamp(Math.ceil((canvas.height - view.y) / view.s) + 5, gy + 1, H) - gy;
  c.drawImage(ground, gx, gy, gw, gh, gx, gy, gw, gh);
  const visible = (x, y) =>
    x >= gx - 55 && x <= gx + gw + 55 && y >= gy - 55 && y <= gy + gh + 55;
  for (const r of g.relays) if (visible(r.x, r.y)) relay(c, r);
  const marked = new Set(
    selected(g)
      .filter((a) => a.order?.kind === "target")
      .map((a) => a.order.id),
  );
  const ordered = [...g.actors].sort((a, b) => a.y - b.y);
  for (const u of ordered) {
    if (!visible(u.x, u.y)) continue;
    const s = catalog[u.type];
    if (units[u.type])
      vehicle(
        c,
        u.type,
        u.team,
        u.x,
        u.y,
        u.angle,
        u.aim,
        u.recoil,
        u.salvoLane,
      );
    else structure(c, u.type, u.team, u.x, u.y, u.aim, u.recoil);
    if (s.shield && u.shield > 0) {
      c.strokeStyle = u.shieldFlash > 0 ? "#bce8ffe0" : "#b2b0f593";
      c.lineWidth = u.shieldFlash > 0 ? 2.3 : 1;
      c.beginPath();
      c.ellipse(u.x, u.y, s.size + 5, s.size * 0.7 + 5, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (u.hitFlash > 0)
      brackets(
        c,
        u.x,
        u.y,
        s.size * 0.9,
        `rgba(255,194,116,${u.hitFlash * 5})`,
      );
    if (u.repairGlow > 0) {
      const y = u.y - s.size - 15 - ((g.time * 11) % 6);
      c.fillStyle = "#c1ecad";
      c.fillRect(u.x - 4, y, 8, 2);
      c.fillRect(u.x - 1, y - 3, 2, 8);
    }
    if (marked.has(u.id)) brackets(c, u.x, u.y, s.size + 6, "#f4a783");
    if (g.selected.has(u.id)) {
      brackets(c, u.x, u.y, s.size + 5, "#d6e8ae");
      if (u.order && Number.isFinite(u.order.x) && !mining(g, u)) {
        c.beginPath();
        c.setLineDash([3, 4]);
        c.moveTo(u.x, u.y);
        c.lineTo(u.order.x, u.order.y);
        c.strokeStyle = "#d4e9ad91";
        c.lineWidth = 1;
        c.stroke();
        c.setLineDash([]);
      }
    }
    if (
      g.selected.has(u.id) ||
      u.hp < s.hp ||
      (s.shield && u.shield < s.shield)
    ) {
      const x = Math.round(u.x - s.size),
        y = Math.round(u.y - s.size - 8);
      c.fillStyle = "#263020";
      c.fillRect(x - 1, y - 1, s.size * 2 + 2, 5);
      c.fillStyle = u.team === 1 ? "#a9c687" : "#db937b";
      c.fillRect(x, y, Math.ceil((s.size * 2 * u.hp) / s.hp), 3);
      if (s.shield) {
        c.fillStyle = "#33344e";
        c.fillRect(x, y - 4, s.size * 2, 2);
        c.fillStyle = "#a9dbff";
        c.fillRect(x, y - 4, Math.ceil((s.size * 2 * u.shield) / s.shield), 2);
      }
    }
  }
  for (const r of g.relays)
    if (visible(r.x, r.y)) marker(c, r.x, r.y + 49, "RELAY " + r.name, r.owner);
  for (const u of g.actors.filter((a) => a.type === "hq"))
    marker(c, u.x, u.y - 46, u.team === 1 ? "BLUE HQ" : "RED HQ", u.team);
  for (const mine of g.mines)
    if (visible(mine.x, mine.y)) {
      const spec = minerals[mine.kind];
      marker(c, mine.x, mine.y + 34, "◆ " + spec.label, 0, spec.color);
    }
  for (const s of g.shots) {
    const p = 1 - s.life / 0.14;
    c.strokeStyle = s.team === 1 ? "#f5de9a" : "#f5ad7b";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(s.x + (s.tx - s.x) * p * 0.75, s.y + (s.ty - s.y) * p * 0.75);
    c.lineTo(s.x + (s.tx - s.x) * p, s.y + (s.ty - s.y) * p);
    c.stroke();
  }
  for (const shell of g.shells) {
    const p = 1 - shell.life / shell.total,
      tail = Math.max(0, p - 0.11);
    const curve = (v) => Math.sin(Math.PI * v) * 26;
    c.strokeStyle = "#f5cea0";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(
      shell.x + (shell.tx - shell.x) * tail,
      shell.y + (shell.ty - shell.y) * tail - curve(tail),
    );
    c.lineTo(
      shell.x + (shell.tx - shell.x) * p,
      shell.y + (shell.ty - shell.y) * p - curve(p),
    );
    c.stroke();
  }
  drawSmoke(c, g);
  for (const missile of g.missiles) drawMissile(c, missile);
  for (const plasma of g.plasma) drawPlasma(c, plasma);
  for (const burst of g.bursts)
    if (visible(burst.x, burst.y)) drawBurst(c, burst);
  if (ping) {
    const p = (now - ping.start) / 680;
    if (p > 1) ping = null;
    else {
      c.strokeStyle = ping.color;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(
        ping.x,
        ping.y,
        ping.sweep ? 15 + p * 31 : 7 + p * 13,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = "bold 13px monospace";
  c.textAlign = "center";
  c.lineWidth = 2.4;
  c.strokeStyle = "#161813";
  for (const d of g.damageText)
    if (visible(d.x, d.y)) {
      const p = 1 - d.life / d.total,
        x = d.x * view.s + view.x,
        y = d.y * view.s + view.y - p * 23;
      const label = "−" + d.value;
      c.globalAlpha = 1 - Math.max(0, (p - 0.55) / 0.45);
      c.fillStyle = d.shield ? "#bcebff" : "#ffd28e";
      c.strokeText(label, x, y);
      c.fillText(label, x, y);
    }
  c.globalAlpha = 1;
  c.textAlign = "start";
  const selectionBox =
    touchBox() ||
    (pointer && !pointer.touch && !pointer.pan && isDrag(pointer)
      ? pointer
      : null);
  if (selectionBox) {
    const { from: a, to: b } = selectionBox;
    c.fillStyle = "#d7efac37";
    c.fillRect(a.sx, a.sy, b.sx - a.sx, b.sy - a.sy);
    c.strokeStyle = "#e0f4bd";
    c.lineWidth = 1;
    c.strokeRect(a.sx + 0.5, a.sy + 0.5, b.sx - a.sx, b.sy - a.sy);
  }
  mc.imageSmoothingEnabled = true;
  mc.drawImage(radarGround, 0, 0);
  const mw = mini.width / W,
    mh = mini.height / H;
  for (const m of g.mines) {
    mc.fillStyle = minerals[m.kind].color;
    mc.fillRect(Math.round(m.x * mw) - 1, Math.round(m.y * mh) - 1, 2, 2);
  }
  for (const a of g.actors) {
    mc.fillStyle = a.team === 1 ? "#8cc5d7" : "#df8d76";
    const size = a.type === "hq" ? 5 : units[a.type] ? 2 : 3;
    mc.fillRect(
      Math.round(a.x * mw - size / 2),
      Math.round(a.y * mh - size / 2),
      size,
      size,
    );
  }
  for (const r of g.relays) {
    mc.fillStyle =
      r.owner === 1 ? "#8cc5d7" : r.owner === -1 ? "#df8d76" : "#ecd288";
    mc.fillRect(r.x * mw - 1, r.y * mh - 1, 3, 3);
  }
  const vx = clamp(-view.x / view.s, 0, W),
    vy = clamp(-view.y / view.s, 0, H),
    vw = clamp((canvas.width - view.x) / view.s, 0, W) - vx,
    vh = clamp((canvas.height - view.y) / view.s, 0, H) - vy;
  mc.strokeStyle = "#e2d5a1";
  mc.lineWidth = 1;
  mc.strokeRect(
    vx * mw + 0.5,
    vy * mh + 0.5,
    Math.max(0, vw * mw - 1),
    Math.max(0, vh * mh - 1),
  );
}
function frame(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  const dx =
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("arrowleft")),
    dy =
      Number(keys.has("s") || keys.has("arrowdown")) -
      Number(keys.has("w") || keys.has("arrowup"));
  if (dx || dy) {
    if (camera.z === 1) camera.z = 1.32;
    camera.x += (dx * dt * 250) / camera.z;
    camera.y += (dy * dt * 250) / camera.z;
    calcView();
  }
  if (!paused && !keyboardBlocked() && !g.result) {
    acc += dt;
    while (acc >= 1 / 30) {
      step(g, 1 / 30);
      acc -= 1 / 30;
    }
  }
  if (
    sound &&
    !paused &&
    !keyboardBlocked() &&
    !g.result &&
    now - lastNoise > 110
  ) {
    const blast = g.bursts.some(
      (b) => b.style !== "spark" && b.total - b.life < 0.065,
    );
    const fired = g.actors.some((a) => a.recoil > 0.19);
    if (blast || fired) {
      beep(blast ? 72 : 166, blast ? 0.065 : 0.027);
      lastNoise = now;
    }
  }
  if (now - lastUI > 120) {
    lastUI = now;
    refresh();
  }
  render(now);
  requestAnimationFrame(frame);
}
setTab("units");
setMode("auto");
requestAnimationFrame(frame);
