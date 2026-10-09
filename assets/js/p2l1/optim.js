// Visualizations for Part 2 · Lecture 1 · Session 02, Part A rebuilt around nanoGPT (6 Oct 2026).
// Registered in assets/js/main.js → load(). Helpers: ../lib.js (el, h, svg, text, slider, frame …).
// Steps ⑤ Clip and ⑥ Update of nanoGPT's train.py: gradient clipping, gradient descent → momentum
// → Adam → AdamW, the learning-rate schedule. nanoGPT values come from train.py and model.py
// (Karpathy, 2022); everything else is computed in the browser, and the toy losses say so.
import { el, h, svg, uid, slider, frame, rng, gauss } from "../lib.js";

// ── shared ───────────────────────────────────────────────────────────────────
// Colours for the four optimizers (Okabe–Ito hues, darkened for the light page), with dark-theme
// variants. Injected once; every rule is scoped to .optim-key, the class each visualization root gets.
const CSS = `
.optim-key { --o-sgd: #687482; --o-mom: #0a6aa6; --o-adam: #a3438a; --o-adamw: #c04f00; --o-fill: #466a88; }
@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) .optim-key { --o-sgd: #aab5c0; --o-mom: #62b8ec; --o-adam: #e59fd0; --o-adamw: #ff9e55; --o-fill: #9cc4ff; } }
:root[data-theme=dark] .optim-key { --o-sgd: #aab5c0; --o-mom: #62b8ec; --o-adam: #e59fd0; --o-adamw: #ff9e55; --o-fill: #9cc4ff; }
.optim-key svg text { font-family: var(--font); fill: var(--text); font-size: 17px; }
.optim-key svg text.m { fill: var(--muted); font-size: 15px; }
.optim-key svg text.s { fill: var(--muted); font-size: 13px; }
.optim-key svg text.b { font-weight: 700; }
.optim-key svg text.mono { font-family: var(--mono); font-size: 13.5px; }
.optim-key svg text.big { font-size: 19px; font-weight: 700; }
.optim-key svg.lg text { font-size: 20px; }
.optim-key svg.lg text.m { font-size: 18px; }
.optim-key svg.lg text.s { font-size: 15px; }
.optim-key svg .ax { stroke: var(--line); stroke-width: 1; fill: none; }
.optim-key svg .ax2 { stroke: var(--muted); stroke-width: 1.2; fill: none; }
.optim-key svg .grid { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 4; fill: none; }
.optim-key svg .curve { fill: none; stroke: var(--text); stroke-width: 2.4; }
.optim-key svg .dash { stroke-dasharray: 6 5; }
.optim-key svg .dot2 { stroke-dasharray: 2 4; }
.optim-key .c-sgd { stroke: var(--o-sgd); } .optim-key .f-sgd { fill: var(--o-sgd); } .optim-key text.t-sgd { fill: var(--o-sgd); font-weight: 700; }
.optim-key .c-mom { stroke: var(--o-mom); } .optim-key .f-mom { fill: var(--o-mom); } .optim-key text.t-mom { fill: var(--o-mom); font-weight: 700; }
.optim-key .c-adam { stroke: var(--o-adam); } .optim-key .f-adam { fill: var(--o-adam); } .optim-key text.t-adam { fill: var(--o-adam); font-weight: 700; }
.optim-key .c-adamw { stroke: var(--o-adamw); } .optim-key .f-adamw { fill: var(--o-adamw); } .optim-key text.t-adamw { fill: var(--o-adamw); font-weight: 700; }
.optim-key svg text.halo { paint-order: stroke; stroke: var(--bg); stroke-width: 5px; stroke-linejoin: round; }
.optim-key .legend { display: flex; flex-wrap: wrap; gap: 8px 10px; }
.optim-key .legend button { display: inline-flex; align-items: center; gap: 8px; }
.optim-key .legend button i { display: inline-block; width: 22px; height: 4px; border-radius: 2px; }
.optim-key .legend button[aria-pressed=false] { opacity: .45; }
.optim-key .readout { white-space: pre-wrap; }
`;
let styled = false;
function setup(root) {
  if (!styled) { document.head.appendChild(h("style", { "data-from": "optim.js" }, CSS)); styled = true; }
  root.classList.add("optim-key");
}
const linS = (lo, hi, a, b) => v => a + ((v - lo) / (hi - lo)) * (b - a);
const path = pts => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
const T = (s, x, y, t, cls = "", anchor = "middle", attrs = {}) => el("text", { x, y, "text-anchor": anchor, class: cls, text: t, ...attrs }, s);
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = e => String(e).split("").map(c => (/\d/.test(c) ? SUP[+c] : c === "-" ? "⁻" : c)).join("");
function sci(x, d = 1) {
  if (!Number.isFinite(x) || x === 0) return String(x);
  let e = Math.floor(Math.log10(Math.abs(x))), m = x / 10 ** e;
  if (Math.abs(+m.toFixed(d)) >= 10) { e += 1; m = x / 10 ** e; }
  return `${m.toFixed(d)} × 10${sup(e)}`;
}
// an arrow with its own head, coloured by class (lib.js's arrow() only knows two styles)
function vec(s, x1, y1, x2, y2, cls, w = 2.6, head = 9) {
  const g = el("g", {}, s);
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L < 1e-6) return g;
  const ux = dx / L, uy = dy / L, hl = Math.min(head, L * 0.6);
  el("line", { x1, y1, x2: x2 - ux * hl * 0.7, y2: y2 - uy * hl * 0.7, class: cls, "stroke-width": w, fill: "none" }, g);
  const px = -uy, py = ux;
  el("path", { d: `M${x2},${y2} L${x2 - ux * hl + px * hl * 0.5},${y2 - uy * hl + py * hl * 0.5} L${x2 - ux * hl - px * hl * 0.5},${y2 - uy * hl - py * hl * 0.5} Z`, class: cls.replace(/\bc-/g, "f-"), stroke: "none" }, g);
  return g;
}


// ── ⑤ Clip: why and what ─────────────────────────────────────────────────────
// Top: a schematic loss with a steep wall (after Pascanu et al., 2013, Fig. 6; no values).
// Bottom: a 2-D gradient, its norm-clipped version (nanoGPT) and an entry-wise clipped one.
export function clipPic(root) {
  setup(root);
  const body = frame(root, "Gradient clipping: g ← g · min(1, c / ‖g‖)",
    "Top: on a steep side of the loss, a step without clipping moves the parameters out of the valley. Bottom: move ‖g‖. Clipping the length makes g shorter and keeps its direction. Clipping each entry changes the direction.",
    "Wall picture after <a data-ref=\"pascanu2013\">Pascanu et al. (2013)</a>, Fig. 6 and §3.2 (schematic, no values). c = 1.0 is nanoGPT's <code>grad_clip</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>, <code>train.py</code>). The 2-D vector stands for all 124M gradient entries.");
  let G = 3;
  const s = svg(540, 420, null, "gradient clipping: a loss wall and a clipped vector");
  s.classList.add("lg");
  const read = h("div", { class: "readout" });
  body.append(s, h("div", { class: "controls" }, slider("‖g‖", 0.25, 4, 0.05, G, v => { G = v; draw(); }, v => v.toFixed(2))), read);
  const ANG = 20 * Math.PI / 180;
  function draw() {
    s.innerHTML = "";
    // ── panel 1: the wall
    const X = linS(0, 10, 36, 530), Y = linS(0, 10, 150, 18);
    el("line", { x1: 36, y1: 150, x2: 530, y2: 150, class: "ax2" }, s);
    el("line", { x1: 36, y1: 150, x2: 36, y2: 8, class: "ax2" }, s);
    T(s, 530, 170, "parameter", "m", "end");
    T(s, 44, 22, "loss", "m", "start");
    const L = w => 1.2 + 0.16 * (w - 6.2) ** 2;
    const pts = [];
    for (let w = 2.62; w <= 10.001; w += 0.05) pts.push([X(w), Y(L(w))]);
    el("path", { d: path([[X(1.9), Y(9.6)], [X(2.25), Y(9.2)], [X(2.5), Y(5.5)], [X(2.62), Y(L(2.62))]].concat(pts)), class: "curve" }, s);
    T(s, X(2.2) - 12, Y(8.2), "steep side", "m", "end");
    const px = X(2.46), py = Y(6.3);
    vec(s, px + 8, py, 534, py, "c-sgd dash", 2.4, 11);
    T(s, 528, py - 12, "step without clipping: leaves the valley", "t-sgd", "end");
    const lx = X(3.55), ly = Y(L(3.55));
    vec(s, px + 6, py + 6, lx - 3, ly - 6, "c-adamw", 3.4, 12);
    el("circle", { cx: lx, cy: ly, r: 5.5, class: "f-adamw" }, s);
    el("circle", { cx: px, cy: py, r: 6.5, fill: "var(--text)" }, s);
    T(s, lx + 12, ly - 14, "clipped step: near the bottom", "t-adamw", "start");
    T(s, 530, 190, "drawing based on Pascanu et al. (2013), Fig. 6", "s", "end");
    // ── panel 2: the vector
    const ox = 40, oy = 398, U = 92;
    el("line", { x1: ox - 12, y1: oy, x2: 534, y2: oy, class: "ax" }, s);
    el("line", { x1: ox, y1: oy + 10, x2: ox, y2: 218, class: "ax" }, s);
    el("path", { d: `M${ox + U},${oy} A${U},${U} 0 0 0 ${ox},${oy - U}`, class: "c-adamw dash", fill: "none", "stroke-width": 1.6 }, s);
    el("rect", { x: ox, y: oy - U, width: U, height: U, class: "c-adam dot2", fill: "none", "stroke-width": 1.6 }, s);
    T(s, ox + U, oy + 19, "c = 1", "m");
    const gx = G * Math.cos(ANG), gy = G * Math.sin(ANG), k = Math.min(1, 1 / G);
    const ex = Math.min(1, gx), ey = Math.min(1, gy);
    if (G > 1) {
      vec(s, ox, oy, ox + gx * U, oy - gy * U, "c-sgd", 2.6, 11);
      T(s, ox + gx * U + 8, oy - gy * U - 6, `g, ‖g‖ = ${G.toFixed(2)}`, "t-sgd", "start");
      vec(s, ox, oy, ox + ex * U, oy - ey * U, "c-adam", 2.6, 11);
      T(s, ox + 6, oy - U - 38, "each entry clipped to ±1: direction changes", "t-adam", "start");
      vec(s, ox, oy, ox + gx * k * U, oy - gy * k * U, "c-adamw", 3.8, 12);
      T(s, ox + gx * k * U + 14, oy - gy * k * U + 24, "length clipped (nanoGPT): same direction", "t-adamw", "start");
    } else {
      vec(s, ox, oy, ox + gx * U, oy - gy * U, "c-adamw", 3.8, 12);
      T(s, ox + gx * U + 10, oy - gy * U - 6, `‖g‖ = ${G.toFixed(2)} ≤ c: no change`, "t-adamw", "start");
    }
    const deg = (a, b) => (Math.atan2(b, a) * 180 / Math.PI).toFixed(0);
    read.textContent = G > 1
      ? `‖g‖ = ${G.toFixed(2)} > c: nanoGPT multiplies each entry by ${k.toFixed(2)}. The direction stays ${deg(gx, gy)}°.\n` +
        `Each entry clipped to ±1: (${gx.toFixed(2)}, ${gy.toFixed(2)}) → (${ex.toFixed(2)}, ${ey.toFixed(2)}). The direction changes from ${deg(gx, gy)}° to ${deg(ex, ey)}°.`
      : `‖g‖ = ${G.toFixed(2)} ≤ c = 1.0: nanoGPT does not change g.`;
  }
  draw();
}

// ── ⑥ Update, math 1: momentum adds up steady gradients and cancels zig-zags ────
export function momentumSum(root) {
  setup(root);
  const body = frame(root, "Momentum: u_t = μ u_{t−1} + g_t",
    "Two gradient sequences: the same g at each step, and a g that changes sign at each step. Move μ. With μ = 0, momentum is plain gradient descent.",
    "Momentum after <a data-ref=\"polyak1964\">Polyak (1964)</a>, in the form of <a data-ref=\"sutskever2013\">Sutskever et al. (2013)</a>, eq. 1–2. Values computed here.");
  let mu = +(root.dataset.mu || 0.9);
  const N = 40;
  const s = svg(560, 310, null, "momentum buffer for a steady and an alternating gradient");
  const read = h("div", { class: "readout" });
  body.append(s, h("div", { class: "controls" }, slider("μ", 0, 0.99, 0.01, mu, v => { mu = v; draw(); }, v => v.toFixed(2))), read);
  function draw() {
    s.innerHTML = "";
    const steady = [], alt = [];
    let a = 0, b = 0;
    for (let t = 1; t <= N; t++) { a = mu * a + 1; b = mu * b + (t % 2 ? 1 : -1); steady.push(a); alt.push(b); }
    const top = Math.max(2, Math.ceil(Math.max(...steady) * 1.1));
    const x0 = 52, x1 = 545, y0 = 262, y1 = 30;
    const X = linS(1, N, x0 + 8, x1), Y = linS(-1.6, top, y0, y1);
    const step = top > 30 ? 10 : top > 12 ? 5 : top > 4 ? 2 : 1;
    for (let v = 0; v <= top; v += step) { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: v ? "grid" : "ax2" }, s); T(s, x0 - 8, Y(v) + 5, String(v), "m", "end"); }
    T(s, x0 - 8, Y(-1) + 5, "−1", "m", "end");
    [1, 10, 20, 30].forEach(t => T(s, X(t), y0 + 22, String(t), "m"));
    T(s, X(40) + 10, y0 + 22, "40 steps", "m", "end");
    T(s, x0, 16, "uₜ, in units of g", "m", "start");
    const lim = 1 / (1 - mu), alim = 1 / (1 + mu);
    if (lim <= top) el("line", { x1: x0, y1: Y(lim), x2: x1, y2: Y(lim), class: "c-mom dash", "stroke-width": 1.4 }, s);
    el("line", { x1: x0, y1: Y(alim), x2: x1, y2: Y(alim), class: "c-adamw dash", "stroke-width": 1.2 }, s);
    el("line", { x1: x0, y1: Y(-alim), x2: x1, y2: Y(-alim), class: "c-adamw dash", "stroke-width": 1.2 }, s);
    el("path", { d: path(steady.map((v, i) => [X(i + 1), Y(v)])), class: "c-mom", "stroke-width": 2.8, fill: "none" }, s);
    el("path", { d: path(alt.map((v, i) => [X(i + 1), Y(v)])), class: "c-adamw", "stroke-width": 2.2, fill: "none" }, s);
    steady.forEach((v, i) => el("circle", { cx: X(i + 1), cy: Y(v), r: 3.2, class: "f-mom" }, s));
    alt.forEach((v, i) => el("circle", { cx: X(i + 1), cy: Y(v), r: 3.2, class: "f-adamw" }, s));
    const fmtL = lim > 99 ? lim.toFixed(0) : lim.toFixed(1);
    T(s, x1, Math.max(y1 + 6, Math.min(Y(steady[N - 1]), Y(lim)) - 12), lim <= top ? `same g at each step → ${fmtL} g` : `same g at each step: goes to ${fmtL} g`, "t-mom", "end");
    T(s, x1, Y(-alim) + 24, `g changes sign → ±${alim.toFixed(2)} g`, "t-adamw", "end");
    read.textContent = `μ = ${mu.toFixed(2)}. Same g at each step: u → g/(1−μ) = ${lim.toFixed(1)} g. A g that changes sign: u → ±g/(1+μ) = ±${alim.toFixed(2)} g.` +
      (mu > 0 ? `\nThe steps in the steady direction are ${(lim / alim).toFixed(0)} times larger than the side-to-side steps.` : "\nμ = 0: gradient descent. Each step uses only its own gradient.");
  }
  draw();
}

// ── ⑥ Update, math 2: Adam — bias correction, and one step size per parameter ──
// nanoGPT's β₁ = 0.9 and β₂ = 0.95 (train.py). Three toy gradient streams, seeded.
const B1 = 0.9, B2 = 0.95, EPS = 1e-8;
function adamSteps(gen, n) {
  let m = 0, v = 0; const out = [];
  for (let t = 1; t <= n; t++) {
    const g = gen(t);
    m = B1 * m + (1 - B1) * g; v = B2 * v + (1 - B2) * g * g;
    const mh = m / (1 - B1 ** t), vh = v / (1 - B2 ** t);
    out.push({ g, step: mh / (Math.sqrt(vh) + EPS) });
  }
  return out;
}
export function adamPerParam(root) {
  setup(root);
  const body = frame(root, "Adam: bias correction, and a step size for each parameter",
    "Top: for a constant gradient, the averages m and v start near 0. Division by 1 − βᵗ corrects the first steps. Bottom: the step size of three parameters for SGD and for Adam, in units of the learning rate η.",
    "β₁ = 0.9 and β₂ = 0.95 as in nanoGPT's <code>train.py</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>); update rule from <a data-ref=\"kingma2015\">Kingma &amp; Ba (2015)</a>, Algorithm 1, §2.1 and §3. The three gradient streams are toys (seeded); steps averaged over steps 51–150, computed here.");
  let scaleA = -3;
  const s = svg(520, 420, null, "Adam's bias correction and per-parameter steps");
  const read = h("div", { class: "readout" });
  body.append(s, h("div", { class: "controls" }, slider("gradient size of parameter 1", -4, 1, 0.1, scaleA, v => { scaleA = v; draw(); }, v => sci(10 ** v, 1))), read);
  const r = rng(5305), noise = Array.from({ length: 150 }, () => gauss(r));
  function draw() {
    s.innerHTML = "";
    // ── top: bias correction for a constant gradient g
    const x0 = 46, x1 = 505, y0 = 160, y1 = 30, N = 40;
    const X = linS(1, N, x0 + 6, x1), Y = linS(0, 1.12, y0, y1);
    T(s, 10, 16, "same gradient g at each step: the averages after t steps", "m", "start");
    [0, 0.5, 1].forEach(v => { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: v ? "grid" : "ax2" }, s); T(s, x0 - 8, Y(v) + 5, String(v), "m", "end"); });
    [1, 10, 20, 30].forEach(t => T(s, X(t), y0 + 20, String(t), "m"));
    T(s, X(40) + 10, y0 + 20, "40 steps", "m", "end");
    const mr = [], vr = [];
    for (let t = 1; t <= N; t++) { mr.push([X(t), Y(1 - B1 ** t)]); vr.push([X(t), Y(1 - B2 ** t)]); }
    el("line", { x1: X(1), y1: Y(1), x2: x1, y2: Y(1), class: "c-adamw", "stroke-width": 3 }, s);
    el("path", { d: path(mr), class: "c-mom", "stroke-width": 2.6, fill: "none" }, s);
    el("path", { d: path(vr), class: "c-adam", "stroke-width": 2.6, fill: "none" }, s);
    el("circle", { cx: X(1), cy: Y(0.1), r: 4.5, class: "f-mom" }, s);
    el("circle", { cx: X(1), cy: Y(0.05), r: 4.5, class: "f-adam" }, s);
    T(s, X(6), Y(0.07), "← t = 1: m₁ = 0.1 g, v₁ = 0.05 g²", "b", "start");
    T(s, X(13), Y(1 - B1 ** 13) - 10, "mₜ / g", "t-mom", "end");
    T(s, X(21), Y(1 - B2 ** 21) + 22, "vₜ / g²", "t-adam", "start");
    T(s, x1, Y(1) - 9, "corrected: m̂ₜ / g = v̂ₜ / g² = 1", "t-adamw", "end");
    // ── bottom: step per parameter, log scale, in units of η
    const ga = 10 ** scaleA;
    const P = [
      { name: "1", note: `same sign, size ${sci(ga, 1)}`, gen: t => ga * (1 + 0.3 * noise[t - 1]) },
      { name: "2", note: "same sign, size 1", gen: t => 1 + 0.3 * noise[(t * 7) % 150] },
      { name: "3", note: "size 1, random sign", gen: t => noise[(t * 13) % 150] },
    ];
    const lo = -4.5, hi = 1.5, L0 = 168, L1 = 505;
    const XL = v => linS(lo, hi, L0, L1)(Math.log10(Math.max(v, 10 ** lo)));
    T(s, 10, 214, "step size of three parameters, in units of η (log scale)", "m", "start");
    [-4, -3, -2, -1, 0, 1].forEach(e => { el("line", { x1: XL(10 ** e), y1: 226, x2: XL(10 ** e), y2: 400, class: e === 0 ? "ax2" : "grid" }, s); T(s, XL(10 ** e), 418, e === 0 ? "1" : e === 1 ? "10" : `10${sup(e)}`, "m"); });
    P.forEach((p, i) => {
      const st = adamSteps(p.gen, 150).slice(50);
      const sgd = st.reduce((a, q) => a + Math.abs(q.g), 0) / st.length;
      const adam = st.reduce((a, q) => a + Math.abs(q.step), 0) / st.length;
      const y = 232 + i * 58;
      T(s, 10, y + 17, p.name, "big", "start");
      T(s, 10, y + 39, p.note, "s", "start");
      el("rect", { x: L0, y, width: Math.max(2, XL(sgd) - L0), height: 20, rx: 2, class: "f-sgd", opacity: 0.85 }, s);
      el("rect", { x: L0, y: y + 24, width: Math.max(2, XL(adam) - L0), height: 20, rx: 2, class: "f-adamw" }, s);
      T(s, XL(sgd) + 6, y + 16, "SGD", "t-sgd", "start");
      T(s, XL(adam) + 6, y + 40, `Adam ${adam.toFixed(2)}`, "t-adamw", "start");
      p.sgd = sgd; p.adam = adam;
    });
    read.textContent = `The SGD step is η·|g|. It changes with the gradient's size (1: ${sci(P[0].sgd, 1)} η, 2: ${P[1].sgd.toFixed(2)} η).\n` +
      `The Adam step is η·m̂/√v̂. It is about η for each size (1: ${P[0].adam.toFixed(2)} η, 2: ${P[1].adam.toFixed(2)} η). It is smaller when the sign changes often (3: ${P[2].adam.toFixed(2)} η).`;
  }
  draw();
}

// ── ⑥ Update: AdamW's pull points at 0; Adam + L2's pull is divided by √v̂ ─────
export function decayPull(root) {
  setup(root);
  const body = frame(root, "Weight decay: AdamW against Adam with L2",
    "Two parameters, θ₁ and θ₂. The gradients of θ₁ are R times smaller than those of θ₂. The arrows show the direction of the decay part of one step.",
    "Decay terms from <a data-ref=\"loshchilov2019\">Loshchilov &amp; Hutter (2019)</a>, Algorithm 2 and §2. ηλ = 6 × 10⁻⁴ × 0.1 from nanoGPT's <code>train.py</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). Schematic; the arrows show directions only.");
  let lr = 1;                                        // log10 of R
  const s = svg(470, 300, null, "direction of the weight-decay pull, AdamW and Adam with L2");
  const read = h("div", { class: "readout" });
  body.append(s, h("div", { class: "controls" }, slider("R, gradient size ratio", 0, 2, 0.05, lr, v => { lr = v; draw(); }, v => (10 ** v).toFixed(v < 1 ? 1 : 0))), read);
  function draw() {
    s.innerHTML = "";
    const R = 10 ** lr, Rs = R.toFixed(R < 10 ? 1 : 0);
    const ox = 46, oy = 262, U = 96;
    el("line", { x1: ox - 10, y1: oy, x2: 460, y2: oy, class: "ax2" }, s);
    el("line", { x1: ox, y1: oy + 10, x2: ox, y2: 16, class: "ax2" }, s);
    T(s, 460, oy + 26, "θ₁: small gradients", "m", "end");
    T(s, ox + 8, 24, "θ₂: gradients R × larger", "m", "start");
    T(s, ox - 6, oy + 20, "0", "b", "end");
    const th = [3.7, 2.2], px = ox + th[0] * U, py = oy - th[1] * U;
    el("line", { x1: px, y1: py, x2: ox, y2: oy, class: "ax", "stroke-dasharray": "4 4" }, s);
    const L = 118;
    const dW = [-th[0], -th[1]], nW = Math.hypot(...dW);
    const dA = [-th[0] * Math.sqrt(R), -th[1] / Math.sqrt(R)], nA = Math.hypot(...dA);
    const wx = px + (dW[0] / nW) * L, wy = py - (dW[1] / nW) * L, ax = px + (dA[0] / nA) * L, ay = py - (dA[1] / nA) * L;
    vec(s, px, py, wx, wy, "c-adamw", 3.6, 13);
    vec(s, px, py, ax, ay, "c-adam", 3.6, 13);
    el("circle", { cx: px, cy: py, r: 6, fill: "var(--text)" }, s);
    T(s, px + 10, py - 8, "θ", "big", "start");
    T(s, wx + 14, wy + 16, "AdamW: −ηλθ", "t-adamw", "start");
    T(s, ax - 6, ay - 14, "Adam + L2: −ηλθ / √v̂", "t-adam", "end");
    read.textContent = `R = ${Rs}: Adam + L2 makes θ₁ smaller ${Rs} times faster than θ₂.\nAdamW makes both smaller by ηλ = 6 × 10⁻⁵ at each step (nanoGPT, peak η).`;
  }
  draw();
}

// ── ⑥ Update, the animation: four optimizers on one narrow valley ───────────────
// Toy loss f(x, y) = 0.05 (x − 3)² + 10 (y − 1)², condition number 200, minimum ★ at (3, 1).
// Each step's gradient gets seeded Gaussian noise (σ = 0.05 in x, 1 in y), the same noise for
// every optimizer, as if all four saw the same batches. β₁ = 0.9, β₂ = 0.95, ε = 10⁻⁸ (nanoGPT).
const VAL = { a: 0.1, b: 20, xs: 3, ys: 1, sx: 0.05, sy: 1, start: [0.3, -0.35], steps: 200 };
const OPT = [
  { k: "sgd", name: "SGD", lr: 0.09 },
  { k: "mom", name: "Momentum", lr: 0.02 },
  { k: "adam", name: "Adam", lr: 0.03 },
  { k: "adamw", name: "AdamW", lr: 0.03 },
];
function runValley(k, lr, lam, noise) {
  const { a, b, xs, ys, sx, sy, start, steps } = VAL;
  let p = [...start], m = [0, 0], v = [0, 0], u = [0, 0];
  const pts = [[...p]], pulls = [[0, 0]];
  let diverged = false;
  for (let t = 1; t <= steps; t++) {
    let g = [a * (p[0] - xs) + sx * noise[t - 1][0], b * (p[1] - ys) + sy * noise[t - 1][1]];
    if (k !== "adamw") g = g.map((gi, i) => gi + lam * p[i]);          // L2 inside the gradient
    let pull = [0, 0];
    if (k === "sgd") p = p.map((pi, i) => pi - lr * g[i]);
    else if (k === "mom") { u = u.map((ui, i) => 0.9 * ui + g[i]); p = p.map((pi, i) => pi - lr * u[i]); }
    else {
      m = m.map((mi, i) => B1 * mi + (1 - B1) * g[i]);
      v = v.map((vi, i) => B2 * vi + (1 - B2) * g[i] * g[i]);
      const mh = m.map(mi => mi / (1 - B1 ** t)), sh = v.map(vi => Math.sqrt(vi / (1 - B2 ** t)) + EPS);
      // the decay part of this step: Adam + L2's λθ goes through the division by √v̂, AdamW's does not
      pull = k === "adam" ? p.map((pi, i) => -lr * lam * pi / sh[i]) : p.map(pi => -lr * lam * pi);
      p = p.map((pi, i) => pi - lr * mh[i] / sh[i] - (k === "adamw" ? lr * lam * pi : 0));
    }
    if (!p.every(Number.isFinite) || Math.abs(p[0]) > 60 || Math.abs(p[1]) > 60) { diverged = true; break; }
    pts.push([...p]); pulls.push(pull);
  }
  return { pts, pulls, diverged };
}
export function optimValley(root) {
  setup(root);
  const decay = root.dataset.show === "decay", ghost = root.dataset.ghost !== "0";
  const body = frame(root, "SGD, momentum, Adam and AdamW on one narrow valley",
    "A toy loss, not a network: f(x, y) = 0.05(x − 3)² + 10(y − 1)², with noisy gradients. All four methods have the same start and the same noise. Use Play, Step or Reset. Change the learning rates and the weight decay λ.",
    "Toy function and noise defined here (seeded); β₁ = 0.9, β₂ = 0.95, ε = 10⁻⁸ as in nanoGPT (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). Adam adds λθ to the gradient (PyTorch's <code>Adam(weight_decay=λ)</code>, “L2 penalty”); AdamW shrinks θ directly (<a data-ref=\"loshchilov2019\">Loshchilov &amp; Hutter, 2019</a>, Algorithm 2). Learning rates: SGD 0.09, momentum 0.02 with μ = 0.9, Adam and AdamW 0.03, times the multiplier.");
  const r = rng(5305), noise = Array.from({ length: VAL.steps }, () => [gauss(r), gauss(r)]);
  let lam = decay ? 0.1 : 0, mult = 1, t = 0, playing = false, raf = 0, last = 0;
  const shown = { sgd: !decay, mom: !decay, adam: true, adamw: decay };
  let runs = {};
  const s = svg(600, 420, null, "optimizer trajectories on a toy valley");
  const bPlay = h("button", {}, "▶ Play"), bStep = h("button", {}, "Step"), bReset = h("button", {}, "Reset");
  const legend = h("div", { class: "controls legend" });
  const read = h("div", { class: "readout" });
  const lrSl = slider("learning rates ×", -2, 1, 0.5, 0, v => { mult = 2 ** v; compute(); draw(); }, v => `${+(2 ** v).toFixed(2)}`);
  const lamSl = slider("weight decay λ", 0, 0.3, 0.05, lam, v => { lam = v; compute(); draw(); }, v => v.toFixed(2));
  body.append(s, h("div", { class: "controls" }, bPlay, bStep, bReset), legend, h("div", { class: "controls" }, lrSl, lamSl), read);
  OPT.forEach(o => {
    const b = h("button", { "aria-pressed": String(shown[o.k]) }, h("i", { style: `background: var(--o-${o.k})` }), o.name);
    b.addEventListener("click", () => { shown[o.k] = !shown[o.k]; b.setAttribute("aria-pressed", String(shown[o.k])); draw(); });
    legend.appendChild(b);
  });
  const stop = () => { playing = false; cancelAnimationFrame(raf); bPlay.textContent = "▶ Play"; };
  bPlay.addEventListener("click", () => {
    if (playing) { stop(); return; }
    if (t >= VAL.steps) t = 0;
    playing = true; bPlay.textContent = "❚❚ Pause"; last = 0;
    const tick = now => {
      if (!playing) return;
      if (!root.isConnected) { stop(); return; }
      if (now - last > 40) { t += 1; last = now; draw(); }
      if (t >= VAL.steps) { stop(); draw(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  bStep.addEventListener("click", () => { stop(); t = t >= VAL.steps ? 1 : t + 1; draw(); });
  bReset.addEventListener("click", () => { stop(); t = 0; draw(); });
  function compute() { runs = {}; OPT.forEach(o => { runs[o.k] = runValley(o.k, o.lr * mult, lam, noise); }); }
  const x0 = 54, x1 = 594, y0 = 376, y1 = 30, XR = [-0.6, 3.8], YR = [-0.75, 2.3];
  const X = linS(XR[0], XR[1], x0, x1), Y = linS(YR[0], YR[1], y0, y1);
  function draw() {
    s.innerHTML = ""; uid(s);
    const cid = `oclip${s.dataset.uid}`;
    el("rect", { x: x0, y: y1, width: x1 - x0, height: y0 - y1 }, el("clipPath", { id: cid }, el("defs", {}, s)));
    const g = el("g", { "clip-path": `url(#${cid})` }, s);
    // the valley: f = c is an ellipse with semi-axes √(2c/a) in x and √(2c/b) in y
    [12, 6, 3, 1.5, 0.6, 0.25, 0.08].forEach(c => el("ellipse", { cx: X(VAL.xs), cy: Y(VAL.ys), rx: X(VAL.xs + Math.sqrt(2 * c / VAL.a)) - X(VAL.xs), ry: Y(VAL.ys) - Y(VAL.ys + Math.sqrt(2 * c / VAL.b)), fill: "var(--o-fill)", "fill-opacity": 0.07, stroke: "var(--o-fill)", "stroke-opacity": 0.35, "stroke-width": 1 }, g));
    el("line", { x1: X(0), y1: y1, x2: X(0), y2: y0, class: "ax" }, g);
    el("line", { x1: x0, y1: Y(0), x2: x1, y2: Y(0), class: "ax" }, g);
    el("rect", { x: x0, y: y1, width: x1 - x0, height: y0 - y1, class: "ax2" }, s);
    [0, 1, 2, 3].forEach(v => T(s, X(v), y0 + 20, String(v), "m"));
    [0, 1, 2].forEach(v => T(s, x0 - 8, Y(v) + 5, String(v), "m", "end"));
    T(s, x1, y0 + 40, "x: small slope, small gradients", "m", "end");
    T(s, 16, (y0 + y1) / 2, "y: large slope, large gradients", "m", "middle", { transform: `rotate(-90 16 ${(y0 + y1) / 2})` });
    T(s, x0, 20, "toy loss 0.05(x − 3)² + 10(y − 1)², noisy gradients; ★ minimum", "s", "start");
    T(s, x1, 20, `step ${t} / ${VAL.steps}`, "b", "end");
    el("circle", { cx: X(0), cy: Y(0), r: 5, fill: "var(--bg)", stroke: "var(--text)", "stroke-width": 1.6 }, s);
    T(s, X(0) - 8, Y(0) + 20, "0", "b", "end");
    el("path", { d: star(X(VAL.xs), Y(VAL.ys), 10, 4.5), fill: "var(--text)" }, s);
    el("circle", { cx: X(VAL.start[0]), cy: Y(VAL.start[1]), r: 4, fill: "var(--text)" }, s);
    T(s, X(VAL.start[0]) + 8, Y(VAL.start[1]) + 18, "start", "m", "start");
    // trajectories: the whole run faint, the part so far bright
    const now = {};
    OPT.forEach(o => {
      if (!shown[o.k]) return;
      const R = runs[o.k], P = R.pts.map(([x, y]) => [X(x), Y(y)]);
      const n = Math.min(t, P.length - 1);
      if (ghost) el("path", { d: path(P), class: `c-${o.k}`, fill: "none", "stroke-width": 1.8, "stroke-opacity": 0.5 }, g);
      if (n > 0) el("path", { d: path(P.slice(0, n + 1)), class: `c-${o.k}`, fill: "none", "stroke-width": 2.6, "stroke-linejoin": "round" }, g);
      now[o.k] = { p: R.pts[n], q: P[n], pull: R.pulls[n], div: R.diverged && t >= P.length - 1 };
    });
    // with decay: the minimum of loss + λ‖θ‖²/2, where L2 in the gradient settles (SGD, momentum, Adam + L2)
    if (lam > 0) {
      const xL = (VAL.a * VAL.xs) / (VAL.a + lam), yL = (VAL.b * VAL.ys) / (VAL.b + lam), cx = X(xL), cy = Y(yL);
      el("path", { d: `M${cx},${cy - 12} L${cx + 12},${cy} L${cx},${cy + 12} L${cx - 12},${cy} Z`, fill: "none", stroke: "var(--text)", "stroke-width": 2 }, s);
      T(s, cx, cy - 22, "◇ minimum of loss + λ‖θ‖²/2", "b halo", "middle");
    }
    // the decay part of the step, direction only, at the current point of Adam and AdamW,
    // with a dashed guide from that point to 0
    if (lam > 0 && t > 0) ["adam", "adamw"].forEach(k => {
      const c = now[k];
      if (!c || (c.pull[0] === 0 && c.pull[1] === 0)) return;
      el("line", { x1: c.q[0], y1: c.q[1], x2: X(0), y2: Y(0), class: `c-${k}`, "stroke-width": 1.4, "stroke-dasharray": "5 5", opacity: 0.8 }, s);
      const L = Math.hypot(c.pull[0], c.pull[1]), d = [c.pull[0] / L, -c.pull[1] / L];
      vec(s, c.q[0], c.q[1], c.q[0] + d[0] * 50, c.q[1] + d[1] * 50, `c-${k}`, 3, 11);
    });
    const done = t >= VAL.steps;
    const lab = { sgd: [0, 30, "middle"], mom: [0, -16, "middle"], adam: lam > 0 ? [0, 30, "middle"] : done ? [0, 74, "end"] : [-14, 6, "end"], adamw: done ? [0, 30, "middle"] : [14, 26, "start"] };
    OPT.forEach(o => {
      const c = now[o.k];
      if (!c) return;
      el("circle", { cx: c.q[0], cy: c.q[1], r: 6.5, class: `f-${o.k}`, stroke: "var(--bg)", "stroke-width": 1.5 }, s);
      if (t > 0) {
        const [dx, dy, an] = lab[o.k];
        const x = Math.max(x0 + 50, Math.min(x1 - 50, c.q[0] + dx)), y = Math.max(y1 + 16, Math.min(y0 - 8, c.q[1] + dy));
        T(s, x, y, c.div ? `${o.name}: unstable` : done ? `${o.name}: x = ${c.p[0].toFixed(2)}` : o.name, `t-${o.k} halo`, an);
      }
    });
    const pos = k => `(${now[k].p[0].toFixed(2)}, ${now[k].p[1].toFixed(2)})`;
    let txt = `step ${t} / ${VAL.steps}   λ = ${lam.toFixed(2)}   learning rates × ${+mult.toFixed(2)}`;
    if (t > 0) txt += "\n" + OPT.filter(o => now[o.k]).map(o => `${o.name} ${now[o.k].div ? "unstable" : pos(o.k)}`).join("   ");
    if (lam > 0 && t > 0 && now.adam && now.adamw) {
      const pa = now.adam.pull, pw = now.adamw.pull;
      txt += `\ndecay part of this step: Adam + L2 (${pa[0].toFixed(4)}, ${pa[1].toFixed(4)}), AdamW (${pw[0].toFixed(4)}, ${pw[1].toFixed(4)})`;
    }
    read.textContent = txt;
  }
  compute();
  t = root.dataset.t === "end" ? VAL.steps : Math.max(0, Math.min(VAL.steps, +(root.dataset.t || 0)));
  draw();
}
function star(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; pts.push([cx + q * Math.cos(a), cy + q * Math.sin(a)]); }
  return path(pts) + "Z";
}

// ── ⑥ Update: nanoGPT's learning-rate schedule, get_lr() in train.py ──────────
const LR = { max: 6e-4, min: 6e-5, warm: 2000, decay: 600000, iters: 600000 };
function getLr(it, decayIters = LR.decay) {
  if (it < LR.warm) return (LR.max * (it + 1)) / (LR.warm + 1);
  if (it > decayIters) return LR.min;
  const r = (it - LR.warm) / (decayIters - LR.warm);
  return LR.min + 0.5 * (1 + Math.cos(Math.PI * r)) * (LR.max - LR.min);
}
export function lrSchedule(root) {
  setup(root);
  const body = frame(root, "nanoGPT's learning rate, step by step",
    "get_lr() in train.py: a linear warm-up for 2,000 steps to 6 × 10⁻⁴, then a cosine decay to 6 × 10⁻⁵ at step 600,000. The small plot shows the first 6,000 steps.",
    "Schedule and values from nanoGPT's <code>train.py</code>, <code>get_lr()</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>); cosine annealing from <a data-ref=\"loshchilov2017\">Loshchilov &amp; Hutter (2017)</a>, eq. 5. The longer cycle is the 5× case of <a data-ref=\"hoffmann2022\">Hoffmann et al. (2022)</a>, Fig. A1, applied to nanoGPT's numbers (computed here).");
  let long = root.dataset.long === "1";
  const s = svg(600, 320, null, "nanoGPT learning-rate schedule");
  const bLong = h("button", { "aria-pressed": String(long) }, "Decay planned for 5 × the run");
  const read = h("div", { class: "readout" });
  body.append(s, h("div", { class: "controls" }, bLong), read);
  bLong.addEventListener("click", () => { long = !long; bLong.setAttribute("aria-pressed", String(long)); draw(); });
  function draw() {
    s.innerHTML = "";
    const x0 = 52, x1 = 588, y0 = 290, y1 = 30;
    const X = linS(0, LR.iters, x0, x1), Y = linS(0, 6.6e-4, y0, y1);
    [0, 1e-4, 2e-4, 3e-4, 4e-4, 5e-4, 6e-4].forEach(v => { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: v ? "grid" : "ax2" }, s); T(s, x0 - 8, Y(v) + 5, v ? `${Math.round(v * 1e4)}` : "0", "m", "end"); });
    T(s, 6, 16, "learning rate (× 10⁻⁴) at each step", "m", "start");
    [0, 1e5, 2e5, 3e5, 4e5, 5e5, 6e5].forEach(v => T(s, X(v), y0 + 22, v ? `${v / 1000}k` : "0", "m", v === 6e5 ? "end" : "middle"));
    const pts = [[X(0), Y(getLr(0))]];
    for (let it = 1000; it <= LR.iters; it += 1000) pts.push([X(it), Y(getLr(it))]);
    el("path", { d: path(pts), class: "c-adamw", "stroke-width": 3.2, fill: "none" }, s);
    T(s, X(230000) - 10, Y(getLr(230000)) + 26, "cosine decay", "t-adamw", "end");
    el("circle", { cx: X(LR.iters), cy: Y(LR.min), r: 5.5, class: "f-adamw" }, s);
    T(s, X(LR.iters) - 4, y0 - 8, "6 × 10⁻⁵ = peak ÷ 10", "t-adamw", "end");
    if (long) {
      const lp = [];
      for (let it = 0; it <= LR.iters; it += 1000) lp.push([X(it), Y(getLr(it, 5 * LR.decay))]);
      el("path", { d: path(lp), class: "c-adam dash", "stroke-width": 2.8, fill: "none" }, s);
      const e = getLr(LR.iters, 5 * LR.decay);
      el("circle", { cx: X(LR.iters), cy: Y(e), r: 5.5, class: "f-adam" }, s);
      T(s, X(LR.iters) - 6, Y(e) + 26, `planned for 3M steps: ${sci(e)} at the end`, "t-adam", "end");
    }
    // inset: the first 6,000 steps, in the empty corner under the curve
    const ix0 = 142, ix1 = 300, iy0 = 252, iy1 = 202;
    el("rect", { x: ix0 - 36, y: iy1 - 22, width: ix1 - ix0 + 76, height: iy0 - iy1 + 52, rx: 4, fill: "var(--bg)", stroke: "var(--line)" }, s);
    const IX = linS(0, 6000, ix0, ix1), IY = linS(0, 6.6e-4, iy0, iy1);
    el("line", { x1: ix0, y1: iy0, x2: ix1, y2: iy0, class: "ax2" }, s);
    el("line", { x1: ix0, y1: iy0, x2: ix0, y2: iy1, class: "ax2" }, s);
    [0, 2000, 4000, 6000].forEach(v => T(s, IX(v), iy0 + 17, v ? `${v / 1000}k` : "0", "s"));
    T(s, ix0 - 6, IY(6e-4) + 5, "6", "s", "end");
    const ip = [];
    for (let it = 0; it <= 6000; it += 50) ip.push([IX(it), IY(getLr(it))]);
    el("path", { d: path(ip), class: "c-adamw", "stroke-width": 2.8, fill: "none" }, s);
    T(s, ix1 + 32, iy1 - 4, "warm-up: 2,000 steps", "m b", "end");
    el("rect", { x: X(0), y: Y(6.4e-4), width: X(6000) - X(0) + 3, height: y0 - Y(6.4e-4), fill: "none", stroke: "var(--muted)", "stroke-width": 1 }, s);
    el("line", { x1: X(6000) + 3, y1: Y(2.6e-4), x2: ix0 - 36, y2: iy1 + 10, class: "ax2", "stroke-dasharray": "3 3" }, s);
    read.textContent = `step 0: ${sci(getLr(0), 1)}   step 2,000: 6.0 × 10⁻⁴   step 301,000: ${sci(getLr(301000), 1)}   step 600,000: 6.0 × 10⁻⁵` +
      (long ? `\ndecay planned for 3,000,000 steps, stopped at 600,000: ends at ${sci(getLr(LR.iters, 5 * LR.decay), 1)}, 9 × higher` : "");
  }
  draw();
}
