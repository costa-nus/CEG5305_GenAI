// Visualizations for Part 2 · Lecture 1 · Session 02, Part C rework (6 Oct 2026): LoRA merge animation, parameter cubes.
// Registered in assets/js/main.js → load(). Helpers: ../lib.js (el, h, svg, text, slider, frame …).
//
//   loraPlace  where LoRA's update goes (model → block → attention → W_q, W_v) and how B·A merges into W; animated
//   rankCubes  trainable parameters per rank as cubes (data-show="ranks"), and W_q, W_v in full (data-show="full")
//   loraScale  W against A and B, in cubes of one fixed size, for four model widths d; rank r adjustable
//   loraServe  one frozen base model and a 35 MB update per task, in cubes of 35 MB; pick the task
//   loraFit    memory against model size: full fine-tuning (16 B/param) and LoRA (2Ψ + 16ψ); data-qlora adds QLoRA
//
// Every number is from the paper named in the figure's footer or computed here, and says which.
// Each SVG's viewBox is its size on the slide (PC2.css sets the height), so text is drawn 1:1.
// Cubes are drawn in an oblique projection (depth up and to the right) and every cube in one figure
// stands for the same number of parameters (or bytes), stated in the figure. A fraction of a cube is
// drawn as a thinner slab.
import { el, h, svg, uid, arrowDefs, text, slider, frame, rng, randMat, matmul, divColor } from "../lib.js";

// ── shared ───────────────────────────────────────────────────────────────────
const comma = n => Math.round(n).toLocaleString("en-US");
function short(n) {
  const a = Math.abs(n);
  if (a >= 1e12) return `${+(n / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (a >= 1e8) return `${Math.round(n / 1e6)}M`;
  if (a >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
const gbytes = b => (b >= 1e12 ? `${+(b / 1e12).toFixed(2)} TB` : b >= 1e10 ? `${Math.round(b / 1e9)} GB` : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.round(b / 1e6)} MB`);
function cubesTxt(n) {
  const F = { 0.125: "⅛", 0.25: "¼", 0.5: "½", 0.75: "¾" };
  if (n < 1) return F[n] ? `${F[n]} cube` : `${n.toFixed(2)} cube`;
  const w = Math.abs(n - Math.round(n)) < 1e-9;
  return `${w ? comma(n) : n.toFixed(1)} cube${n === 1 ? "" : "s"}`;
}
const ratio = (d, r) => (Number.isInteger(d / (2 * r)) ? comma(d / (2 * r)) : (d / (2 * r)).toFixed(1));
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// text with subscripts: parts = ["W", ["q"], " and W", ["v"]]
function lab(s, x, y, parts, cls = "", anchor = "middle", attrs = {}) {
  const t = el("text", { x, y, "text-anchor": anchor, class: `s-text ${cls}`, ...attrs }, s);
  (Array.isArray(parts) ? parts : [parts]).forEach(p => {
    if (Array.isArray(p)) el("tspan", { "baseline-shift": "sub", "font-size": "72%", text: p[0] }, t);
    else el("tspan", { text: p }, t);
  });
  return t;
}

// ── cubes ────────────────────────────────────────────────────────────────────
const DX = 0.45, DY = 0.3;                         // one unit of depth moves this far right and up
const KIND = {
  frozen: { c: "var(--blue-2)", f: 0.42, t: 0.22, r: 0.64 },
  train: { c: "var(--orange)", f: 0.78, t: 0.5, r: 0.98 },
  faint: { c: "var(--muted)", f: 0.18, t: 0.1, r: 0.28 },
};
const P = (o, u, x, y, z) => `${(o[0] + (x + z * DX) * u).toFixed(2)},${(o[1] - (y + z * DY) * u).toFixed(2)}`;
function face(g, o, u, pts, K, op, edge = K.c) {
  el("polygon", { points: pts.map(q => P(o, u, ...q)).join(" "), fill: K.c, "fill-opacity": op, stroke: edge, "stroke-width": edge === K.c ? 1 : 0.9, "stroke-linejoin": "round" }, g);
}
function gridLine(g, o, u, a, b) {
  const [x1, y1] = P(o, u, ...a).split(","), [x2, y2] = P(o, u, ...b).split(",");
  el("line", { x1, y1, x2, y2, stroke: "var(--card)", "stroke-width": u >= 8 ? 1 : 0.7 }, g);
}
// one cube (or a slab of height hh) on top of a box: ruled like the box, so a partly filled layer reads as cubes
function cube(g, o, u, x, y, z, K, hh = 1, edge = "var(--card)") {
  face(g, o, u, [[x, y, z], [x + 1, y, z], [x + 1, y + hh, z], [x, y + hh, z]], K, K.f, edge);
  face(g, o, u, [[x, y + hh, z], [x + 1, y + hh, z], [x + 1, y + hh, z + 1], [x, y + hh, z + 1]], K, K.t, edge);
  face(g, o, u, [[x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + hh, z + 1], [x + 1, y + hh, z]], K, K.r, edge);
}
// a solid a × b × c box drawn as its three visible faces, ruled into unit cubes
function box3(g, o, u, a, b, c, K) {
  face(g, o, u, [[0, 0, 0], [a, 0, 0], [a, c, 0], [0, c, 0]], K, K.f);
  face(g, o, u, [[0, c, 0], [a, c, 0], [a, c, b], [0, c, b]], K, K.t);
  face(g, o, u, [[a, 0, 0], [a, 0, b], [a, c, b], [a, c, 0]], K, K.r);
  for (let x = 1; x < a; x++) { gridLine(g, o, u, [x, 0, 0], [x, c, 0]); gridLine(g, o, u, [x, c, 0], [x, c, b]); }
  for (let y = 1; y < c; y++) { gridLine(g, o, u, [0, y, 0], [a, y, 0]); gridLine(g, o, u, [a, y, 0], [a, y, b]); }
  for (let z = 1; z < b; z++) { gridLine(g, o, u, [0, c, z], [a, c, z]); gridLine(g, o, u, [a, 0, z], [a, c, z]); }
  // redraw the outline over the rules
  [[[0, 0, 0], [a, 0, 0], [a, c, 0], [0, c, 0]], [[0, c, 0], [a, c, 0], [a, c, b], [0, c, b]], [[a, 0, 0], [a, 0, b], [a, c, b], [a, c, 0]]]
    .forEach(f => el("polygon", { points: f.map(q => P(o, u, ...q)).join(" "), fill: "none", stroke: K.c, "stroke-width": 1.1, "stroke-linejoin": "round" }, g));
}
// footprint a × b and c full layers for N cubes (N may be fractional): an exact box when N factors
// into a near-cube shape, otherwise a square footprint with a partly filled top layer
function cubeLayout(N) {
  const n = Math.floor(N + 1e-9), frac = N - n > 1e-9 ? N - n : 0;
  let best = null;
  if (!frac && n > 0 && n <= 20000) {
    for (let a = 1; a <= n; a++) {
      if (n % a) continue;
      for (let b = 1; b <= a; b++) {
        if ((n / a) % b) continue;
        const c = n / a / b, sc = Math.log(a / b) ** 2 + Math.log(c / (1.2 * a)) ** 2;
        if (!best || sc < best.sc) best = { a, b, c, rem: 0, frac: 0, sc };
      }
    }
  }
  if (!best || best.sc > 0.6) {
    const sd = Math.max(1, Math.round(Math.cbrt(N / 1.2))), c = Math.floor(n / (sd * sd));
    best = { a: sd, b: sd, c, rem: n - c * sd * sd, frac };
  }
  return best;
}
// draw N cubes with the front-bottom-left corner at o; returns the drawn size
function block(g, o, u, N, kind, lay = cubeLayout(N)) {
  const { a, b, c, rem, frac } = lay, K = KIND[kind];
  if (c > 0) box3(g, o, u, a, b, c, K);
  const extra = rem + (frac ? 1 : 0);
  let i = 0;
  for (let z = b - 1; z >= 0 && i < extra; z--) {
    for (let x = 0; x < a && i < extra; x++, i++) cube(g, o, u, x, c, z, K, i < rem ? 1 : frac, c > 0 ? "var(--card)" : K.c);
  }
  const layers = c + (rem ? 1 : frac);
  return { w: (a + b * DX) * u, h: (layers + b * DY) * u, top: o[1] - (layers + b * DY) * u, a, b };
}
const blockSize = (N, u, lay = cubeLayout(N)) => ({ w: (lay.a + lay.b * DX) * u, h: (lay.c + (lay.rem ? 1 : lay.frac) + lay.b * DY) * u });

// ── 1 · Where the update goes, and the merge (animated) ──────────────────────
export function loraPlace(root) {
  const body = frame(root, "Where LoRA's update goes, and how LoRA adds it to W",
    "Press Play, Step or Reset. Choose the model and the rank r. Each matrix shows as 12 × 12 cells (B and A as 12 × r). The values are random (fixed seed), not values from a trained model.",
    "Where: <a data-ref=\"hu2022\">Hu et al. (2022)</a>, §4.2 and §7.1 (they change W<sub>q</sub> and W<sub>v</sub> and keep the MLP frozen). Start values and the addition: §4.1; loralib, <code>layers.py</code>: <code>self.weight.data += T(self.lora_B @ self.lora_A) * self.scaling</code>, with <code>scaling = lora_alpha / r</code>. nanoGPT's <code>c_attn</code> holds W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub> side by side (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>, model.py lines 35 and 56). GPT-3: 96 layers, d = 12,288 (<a data-ref=\"brown2020\">Brown et al., 2020</a>, Table 2.1). Counts computed here.");
  const MODELS = {
    gpt2: { name: "GPT-2 small", L: 12, d: 768, N: 124e6, why: "Part A's model" },
    gpt3: { name: "GPT-3 175B", L: 96, d: 12288, N: 175e9, why: "Hu et al.'s results" },
  };
  const R = rng(5305), n = 12;
  const W0 = randMat(R, n, n, 1), A8 = randMat(R, 8, n, 1), B8 = randMat(R, n, 8, 1);
  const LAST = 6, DUR = [2.2, 2.2, 2.6, 3.0, 3.0, 2.8, 2.6];
  let k = LAST, p = 1, mk = "gpt2", r = 4, playing = false, raf = 0, last = 0;

  const s = svg(1150, 300, null, "A Transformer, one of its blocks, its attention, and the LoRA update that training adds to W_q");
  const bPlay = h("button", { class: "primary" }, "▶ Play"), bStep = h("button", {}, "Step"), bReset = h("button", {}, "Reset");
  const mBtns = Object.entries(MODELS).map(([key, m]) => h("button", { onclick: () => { mk = key; draw(); } }, m.name));
  const rBtns = [1, 2, 4, 8].map(v => h("button", { onclick: () => { r = v; draw(); } }, `r = ${v}`));
  const cap = h("div", { class: "readout lp-cap" });
  body.append(s, h("div", { class: "controls" }, bPlay, bStep, bReset, h("span", { class: "lp-sep" }), ...mBtns, h("span", { class: "lp-sep" }), ...rBtns), cap);

  const CAPS = [
    m => `<b>1 · The model.</b> ${m.name} (${m.why}) has ${m.L} blocks of the same design. LoRA changes the same matrices in each block. We follow one block.`,
    () => `<b>2 · One block.</b> A block has attention, then the MLP. Each part has a residual connection. LoRA does not change the MLP.`,
    m => `<b>3 · Attention.</b> Hu et al. change the query matrix W<sub>q</sub> and the value matrix W<sub>v</sub> (§7.1). ${m.d === 768 ? "In nanoGPT, both are parts of one matrix, <code>c_attn</code>." : "Each one is 12,288 × 12,288."}`,
    (m, rr) => `<b>4 · Train.</b> A starts with random values. B starts at 0, so BA = 0 and the model starts unchanged. Only A and B learn: 2 × ${comma(m.d)} × ${rr} = ${comma(2 * m.d * rr)} numbers for this matrix.`,
    m => `<b>5 · Multiply.</b> B (${comma(m.d)} × r) times A (r × ${comma(m.d)}) gives BA. BA has the size of W, ${comma(m.d)} × ${comma(m.d)}, but its rank is only r.`,
    m => `<b>6 · Add.</b> After training, we add (α/r)·BA to W one time. W keeps its size, ${comma(m.d)} × ${comma(m.d)}, so the model is not slower.`,
    (m, rr) => `<b>7 · All blocks.</b> W<sub>q</sub> and W<sub>v</sub> in all ${m.L} blocks: ${m.L} × 2 × 2 × ${comma(m.d)} × ${rr} = <b>${comma(m.L * 4 * m.d * rr)}</b> trained numbers, ${(100 * m.L * 4 * m.d * rr / m.N).toPrecision(2)}% of ${short(m.N)}.${m.d === 12288 && rr === 4 ? " This is the “18M” of Hu et al." : ""}`,
  ];

  const stop = () => { playing = false; cancelAnimationFrame(raf); bPlay.textContent = "▶ Play"; };
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    p += dt / DUR[k];
    if (p >= 1) { if (k < LAST) { k++; p = 0; } else { p = 1; draw(); stop(); return; } }
    draw();
    raf = requestAnimationFrame(tick);
  }
  bPlay.addEventListener("click", () => {
    if (playing) { stop(); return; }
    if (k === LAST && p >= 1) { k = 0; p = 0; }
    playing = true; last = 0; bPlay.textContent = "❚❚ Pause";
    raf = requestAnimationFrame(tick);
  });
  bStep.addEventListener("click", () => { stop(); if (p < 1) p = 1; else { k = k < LAST ? k + 1 : 0; p = 1; } draw(); });
  bReset.addEventListener("click", () => { stop(); k = 0; p = 1; draw(); });

  function grid(g, x, y, M, cs, scale, op = 1) {
    const G = el("g", { opacity: op }, g);
    M.forEach((row, i) => row.forEach((v, j) => el("rect", { x: x + j * cs, y: y + i * cs, width: cs, height: cs, fill: divColor(v / scale), stroke: "var(--card)", "stroke-width": 0.7 }, G)));
    el("rect", { x, y, width: M[0].length * cs, height: M.length * cs, fill: "none", stroke: "var(--muted)", "stroke-width": 1 }, G);
    return G;
  }
  function frameBox(x, y, w, hh, on) {
    el("rect", { x, y, width: w, height: hh, rx: 8, fill: on ? "var(--panel)" : "none", stroke: on ? "var(--orange)" : "var(--line)", "stroke-width": on ? 1.6 : 1 }, s);
  }
  const zoom = (x1, y1, y2, x2, y3, y4) => {
    el("line", { x1, y1, x2, y2: y3, class: "s-edge dash faint" }, s);
    el("line", { x1, y1: y2, x2, y2: y4, class: "s-edge dash faint" }, s);
  };

  function draw() {
    const m = MODELS[mk], dd = comma(m.d);
    mBtns.forEach(b => b.setAttribute("aria-pressed", String(b.textContent === m.name)));
    rBtns.forEach(b => b.setAttribute("aria-pressed", String(b.textContent === `r = ${r}`)));
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const pa = clamp01(p / 0.65);                  // the movement takes the first 65% of a step; the rest is reading time
    const at = j => k > j || (k === j && pa > 0.02);
    const active = [0, 1, 2, 3, 3, 3, 0][k];
    // panel frames
    frameBox(4, 4, 156, 292, active === 0);
    frameBox(196, 4, 150, 292, active === 1);
    frameBox(382, 4, 228, 292, active === 2);
    frameBox(646, 4, 500, 292, active === 3);

    // A · the model: blocks between the embedding and the output layer
    const top = 34, bot = 226, L = m.L, bh = (bot - top) / L, zi = Math.floor(L / 2), thin = L > 20;
    el("rect", { x: 20, y: 12, width: 124, height: 18, rx: 3, class: "s-box" }, s); text(s, 82, 25, "LayerNorm, output", "m");
    el("rect", { x: 20, y: 230, width: 124, height: 18, rx: 3, class: "s-box" }, s); text(s, 82, 243, "embedding", "m");
    const marked = k === 6 ? Math.round(ease(pa) * L) : 0;
    for (let i = 0; i < L; i++) {
      const y = bot - (i + 1) * bh, z = i === zi;
      el("rect", { x: 26, y: y + (thin ? 0.4 : 1.5), width: 112, height: thin ? bh * 0.55 : bh - 3, rx: thin ? 0 : 2,
        fill: z ? "var(--tint)" : "var(--panel-2)", stroke: z ? "var(--orange)" : "none", "stroke-width": z ? 2 : 0 }, s);
      if (i < marked || (z && at(5))) el("rect", { x: 120, y: y + (thin ? 0.25 : 4), width: 14, height: Math.max(1, bh - (thin ? 0.5 : 8)), fill: "var(--orange)" }, s);
    }
    if (!thin) text(s, 44, bot - zi * bh - bh / 2 + 5, `block ${zi + 1}`, "m", "start");
    else text(s, 82, bot - zi * bh - 6, `block ${zi + 1}`, "m");
    text(s, 82, 270, m.name, "b");
    text(s, 82, 287, `${m.L} blocks, d = ${dd}`, "m");
    zoom(160, bot - (zi + 1) * bh, bot - zi * bh, 196, 4, 296);

    // B · one block, bottom to top: LN → attention → + → LN → MLP → +
    const cx = 271;
    el("line", { x1: cx, y1: 272, x2: cx, y2: 16, class: "s-edge" }, s);
    const bx = (y, hh, label, on, sub) => {
      el("rect", { x: cx - 52, y, width: 104, height: hh, rx: 5, fill: on ? "var(--tint)" : "var(--panel-2)", stroke: on ? "var(--orange)" : "var(--line)", "stroke-width": on ? 2.2 : 1 }, s);
      text(s, cx, y + hh / 2 + (sub ? -2 : 5), label, on ? "b" : "");
      if (sub) text(s, cx, y + hh / 2 + 15, sub, sub === "LoRA here" ? "o" : "m");
    };
    bx(234, 24, "LayerNorm");
    bx(176, 46, "attention", at(1), at(1) ? "LoRA here" : "");
    el("circle", { cx, cy: 156, r: 9, class: "s-box" }, s); text(s, cx, 161, "+");
    bx(118, 24, "LayerNorm");
    bx(60, 44, "MLP", false, at(1) ? "frozen" : "");
    el("circle", { cx, cy: 40, r: 9, class: "s-box" }, s); text(s, cx, 45, "+");
    el("path", { d: `M${cx},266 C${cx - 70},258 ${cx - 70},160 ${cx - 9},156`, class: "s-edge faint" }, s);
    el("path", { d: `M${cx},150 C${cx - 70},140 ${cx - 70},44 ${cx - 9},40`, class: "s-edge faint" }, s);
    text(s, cx, 288, "one block", "m");
    zoom(cx + 52, 176, 222, 382, 4, 296);

    // C · attention: W_q, W_k, W_v (nanoGPT: one c_attn) → softmax → W_o (c_proj)
    const qy = 186, sq = 52, qx = [402, 466, 530];
    el("line", { x1: 496, y1: 272, x2: 496, y2: qy + sq + 5, class: "s-edge" }, s);
    text(s, 496, 288, m.d === 768 ? "attention (names from nanoGPT)" : "attention", "m");
    ["q", "k", "v"].forEach((w, i) => {
      const on = at(2) && w !== "k";
      el("rect", { x: qx[i], y: qy, width: sq, height: sq, rx: 3, fill: on ? "var(--tint)" : "var(--panel-2)", stroke: on ? "var(--orange)" : "var(--line)", "stroke-width": on ? 2.4 : 1 }, s);
      lab(s, qx[i] + sq / 2, qy + sq / 2 + 6, ["W", [w]], on ? "b" : "");
      if (on) text(s, qx[i] + sq / 2, qy - 9, "+ BA", "o");
      el("line", { x1: qx[i] + sq / 2, y1: qy, x2: qx[i] + sq / 2, y2: 142, class: "s-edge faint" }, s);
    });
    if (m.d === 768) {
      el("rect", { x: qx[0] - 5, y: qy - 5, width: 3 * sq + 22, height: sq + 10, rx: 5, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "4 3" }, s);
      text(s, 496, qy + sq + 22, "c_attn: 768 × 2,304", "m mono");
    } else text(s, 496, qy + sq + 22, `each ${dd} × ${dd}`, "m");
    el("rect", { x: 418, y: 112, width: 156, height: 30, rx: 4, class: "s-box" }, s);
    text(s, 496, 132, "softmax(qkᵀ/√d)·v");
    el("line", { x1: 496, y1: 112, x2: 496, y2: 88, class: "s-edge" }, s);
    el("rect", { x: 470, y: 36, width: sq, height: sq, rx: 3, fill: "var(--panel-2)", stroke: "var(--line)" }, s);
    lab(s, 496, 68, ["W", ["o"]]);
    if (m.d === 768) text(s, 528, 50, "c_proj", "m mono", "start");
    text(s, 528, m.d === 768 ? 67 : 58, "output", "m", "start");
    text(s, 528, m.d === 768 ? 83 : 74, "projection", "m", "start");
    el("line", { x1: 496, y1: 36, x2: 496, y2: 14, class: "s-edge" }, s);
    zoom(qx[0] + sq, qy, qy + sq, 646, 4, 296);

    // D · the update for W_q (W_v gets its own pair), and the merge
    const cs = 10, side = n * cs, wx = 668, wy = 120, gx = 840, rr = r;
    const Bt = B8.map(row => row.slice(0, rr).map(v => v * 0.6 / Math.sqrt(rr)));
    const A = A8.slice(0, rr);
    const bScale = k < 3 ? 0 : k === 3 ? ease(pa) : 1;
    const B = Bt.map(row => row.map(v => v * bScale));
    const BA = matmul(Bt, A);
    const merge = k < 5 ? 0 : k === 5 ? ease(clamp01(pa / 0.6)) : 1;     // BA slides onto W
    const blend = k < 5 ? 0 : k === 5 ? clamp01((pa - 0.6) / 0.4) : 1;   // then W takes it in
    const g = el("g", { opacity: k < 3 ? 0.4 : 1 }, s);
    lab(g, 662, 24, blend > 0.5 ? ["after training: W", ["q"], " ← W", ["q"], " + (α/r)·BA"] : ["the update to W", ["q"], " (W", ["v"], " has its own A and B)"], "b", "start");
    // W
    grid(g, wx, wy, W0.map((row, i) => row.map((v, j) => v + blend * BA[i][j])), cs, 2.6);
    lab(g, wx + side / 2, wy - 10, blend > 0.5 ? ["W", ["q"], " with BA added"] : ["W", ["q"], ", frozen"], blend > 0.5 ? "o" : "b");
    text(g, wx + side / 2, wy + side + 18, `${dd} × ${dd}`, "m");
    if (blend > 0.5) text(g, wx + side / 2, wy + side + 36, "the same size as before", "o");
    // + B · A = BA
    const ax = gx + rr * cs + 8, ay = wy - 8 - rr * cs;
    text(g, 816, wy + side / 2 + 6, "+", "b");
    grid(g, gx, wy, B, cs, 1.4, merge > 0.5 ? 0.4 : 1);
    text(g, gx + rr * cs / 2, wy + side + 18, "B", "b");
    text(g, gx + rr * cs, wy + side + 36, `${dd} × r`, "m", "end");
    if (k === 3 && pa < 1) text(g, gx + rr * cs / 2, wy + side + 54, "B changes from 0", "o");
    grid(g, ax, ay, A, cs, 1.8, merge > 0.5 ? 0.4 : 1);
    text(g, ax + side + 8, ay + rr * cs / 2 + 5, "A", "b", "start");
    text(g, ax + side + 8, ay + rr * cs / 2 + 22, `r × ${dd}`, "m", "start");
    if (k === 3) text(g, ax + side + 8, ay + rr * cs / 2 - 13, "random", "o", "start");
    // BA, built row by row (row i of B times A), then moved onto W
    const rows = k < 4 ? 0 : k === 4 ? Math.round(ease(pa) * n) : n;
    el("rect", { x: ax, y: wy, width: side, height: side, fill: "none", stroke: "var(--line)", "stroke-dasharray": "4 3" }, g);
    if (rows > 0 && blend < 1) grid(g, ax + merge * (wx - ax), wy, BA.slice(0, rows), cs, 1.6, 1 - blend);
    if (k === 4 && rows < n) el("rect", { x: gx - 2, y: wy + rows * cs, width: rr * cs + 4, height: cs, fill: "none", stroke: "var(--orange)", "stroke-width": 2 }, g);
    if (merge < 0.3) {
      text(g, ax + side / 2, wy + side + 18, "BA", "b");
      text(g, ax + 4, wy + side + 36, `${dd} × ${dd}, rank r`, "m", "start");
    } else if (blend >= 1) {
      text(g, ax + side / 2, wy + side / 2 - 4, "We keep A and B", "m");
      text(g, ax + side / 2, wy + side / 2 + 14, "to change tasks later", "m");
    }
    cap.innerHTML = CAPS[k](m, r) + (!playing && k === LAST && p >= 1 ? " <span class=\"lp-hint\">Press Play to see each step.</span>" : "");
  }
  draw();
}

// ── 2 · Trainable parameters per rank, in cubes ──────────────────────────────
// GPT-3 175B, LoRA on W_q and W_v in all 96 layers (d = 12,288): 2 × 96 × 2 × 12,288 × r.
// One cube = rank 1 = 4,718,592 parameters, Hu et al.'s "4.7M" (Table 4).
const G3 = { d: 12288, L: 96 };
const CUBE_R = 2 * G3.L * 2 * G3.d;                      // 4,718,592
export function rankCubes(root) {
  const show = root.dataset.show || "ranks";
  const body = frame(root, show === "full" ? "All of W_q and W_v, in the same cubes" : "Trained parameters at each rank, in cubes",
    "One cube is 4,718,592 parameters: LoRA at rank 1 on W_q and W_v in all 96 layers of GPT-3 175B.",
    "We calculated the counts: 2 matrices × 96 layers × r × (12,288 + 12,288). Rank 1 = Hu et al.'s 4.7M, rank 8 = 37.7M (Table 4); rank 4 = the “18M” budget of Table 5 (<a data-ref=\"hu2022\">Hu et al., 2022</a>). GPT-3's shape: <a data-ref=\"brown2020\">Brown et al. (2020)</a>, Table 2.1.");
  const u = 10;
  if (show === "full") {
    const N = (2 * G3.L * G3.d * G3.d) / CUBE_R;            // 6,144
    const sz = blockSize(N, u), Wd = 300, Ht = 52 + sz.h + 50; // room for the two lines under the block
    const s = svg(Wd, Ht, body, "6,144 cubes: W_q and W_v of GPT-3 in full");
    lab(s, Wd / 2, 18, ["all of W", ["q"], " and W", ["v"]], "b");
    text(s, Wd / 2, 38, `${short(2 * G3.L * G3.d * G3.d)} = ${comma(N)} cubes`, "");
    const o = [(Wd - sz.w) / 2, 52 + sz.h];
    block(s, o, u, N, "frozen");
    text(s, Wd / 2, 52 + sz.h + 24, "All of GPT-3, 175B:", "m");
    text(s, Wd / 2, 52 + sz.h + 42, `about ${comma(Math.round(175e9 / CUBE_R / 100) * 100)} cubes`, "m");
    return;
  }
  const RANKS = [1, 2, 4, 8, 64], W = 820, Ht = 92, c0 = 220, cw = 120, base = 84;
  const s = svg(W, Ht, body, "Cubes for ranks 1, 2, 4, 8 and 64");
  // legend in the label column
  block(s, [16, 52], u, 1, "train");
  text(s, 36, 49, "1 cube =", "", "start");
  text(s, 16, 72, `${short(CUBE_R)} parameters`, "m", "start");
  RANKS.forEach((rr, i) => {
    const cx = c0 + cw * i + cw / 2, sz = blockSize(rr, u);
    block(s, [cx - sz.w / 2, base], u, rr, "train");
    text(s, cx + sz.w / 2 + 4, base - 2, rr > 1 ? `${rr}` : "", "m", "start");
  });
}

// ── 3 · W against A and B, one cube size, four widths d ─────────────────────
export function loraScale(root) {
  const UNIT = 24576;                                     // 2 × 12,288: one rank of GPT-3's update for one matrix
  const MODELS = [
    { n: "GPT-2 small", s: "Part A's model", d: 768 },
    { n: "GPT-2 XL", s: "nanoGPT's fine-tuning example", d: 1600 },
    { n: "LLaMA 7B", s: "", d: 4096 },
    { n: "GPT-3 175B", s: "Hu et al.'s results", d: 12288 },
  ];
  const body = frame(root, "One attention matrix W and its LoRA update, in cubes of 24,576 parameters",
    "In each model, W (blue, frozen) is d × d. A and B (orange, trained) are r × d and d × r. Move the r slider. Each cube is 24,576 parameters in all models, so you can compare the blocks.",
    "d: GPT-2 small 768 and GPT-2 XL 1,600 (nanoGPT model.py, from_pretrained; <a data-ref=\"karpathy2022\">Karpathy, 2022</a>; <a data-ref=\"radford2019\">Radford et al., 2019</a>); LLaMA 7B 4,096 (<a data-ref=\"touvron2023a\">Touvron et al., 2023</a>, Table 2); GPT-3 12,288 (<a data-ref=\"brown2020\">Brown et al., 2020</a>, Table 2.1). We calculated the counts: W = d², A = B = r·d (<a data-ref=\"hu2022\">Hu et al., 2022</a>, eq. 3).");
  const RS = [1, 2, 4, 8, 16, 32, 64];
  let ri = 2;
  const u = 8, base = 240, Hs = base + 76;
  const s = svg(1150, Hs, null, "Cubes for W, A and B at four model widths");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("rank r", 0, RS.length - 1, 1, ri, v => { ri = v; draw(); }, v => String(RS[v]))), s, read);
  const SLOT = [[150, 360], [360, 580], [580, 820], [820, 1150]];
  function draw() {
    const r = RS[ri];
    s.innerHTML = "";
    // legend
    block(s, [6, 30], u, 1, "frozen"); text(s, 24, 26, "W, frozen", "", "start");
    block(s, [6, 54], u, 1, "train"); text(s, 24, 50, "A and B, trained", "", "start");
    text(s, 6, 78, "1 cube = 24,576", "m", "start");
    text(s, 6, 94, "parameters in", "m", "start");
    text(s, 6, 110, "all models", "m", "start");
    MODELS.forEach((m, i) => {
      const nW = m.d * m.d / UNIT, nA = r * m.d / UNIT;
      const lw = cubeLayout(nW), la = cubeLayout(nA);
      const sw = blockSize(nW, u, lw), sa = blockSize(nA, u, la), gap = 10;
      const tot = sw.w + gap + sa.w + 5 + sa.w;
      const [x0, x1] = SLOT[i], cx = (x0 + x1) / 2, ox = cx - tot / 2;
      block(s, [ox, base], u, nW, "frozen", lw);
      block(s, [ox + sw.w + gap, base], u, nA, "train", la);
      block(s, [ox + sw.w + gap + sa.w + 5, base], u, nA, "train", la);
      text(s, cx, base + 18, m.n, "b");
      text(s, cx, base + 35, `d = ${comma(m.d)}${m.s ? " · " + m.s : ""}`, "m");
      text(s, cx, base + 53, `W: ${short(m.d * m.d)} = ${cubesTxt(nW)}`, "");
      text(s, cx, base + 71, `A + B: ${short(2 * r * m.d)} = W / ${ratio(m.d, r)}`, "").setAttribute("fill", "var(--orange-2)");
    });
    const g2 = MODELS[0], g3 = MODELS[3];
    read.innerHTML = `r = ${r}. From GPT-2 small to GPT-3, d grows 16 times. W grows 256 times (d²), but A + B grows only 16 times (2dr). ` +
      `A + B is W / ${ratio(g3.d, r)} in GPT-3 and W / ${ratio(g2.d, r)} in GPT-2 small (2r / d).`;
  }
  draw();
}

// ── 4 · Serving: one base model, a 35 MB update per task ─────────────────────
export function loraServe(root) {
  const body = frame(root, "One frozen base model and a small update for each task",
    "One cube is 35 MB, one GPT-3 LoRA update (r = 4 on W_q and W_v, 16-bit). The base model, 350 GB, is 10,000 cubes. Choose the task of a request.",
    "350 GB and 35 MB: <a data-ref=\"hu2022\">Hu et al. (2022)</a>, §4.2 (“roughly 10,000×”). We calculated 18,874,368 × 2 bytes = 37.7 MB. Tasks: the GPT-3 tasks of Table 4.");
  const TASKS = ["WikiSQL", "MultiNLI", "SAMSum"];
  let cur = 0;
  const s = svg(640, 330, null, "A base model of 10,000 cubes and three one-cube updates");
  const btns = TASKS.map((t, i) => h("button", { onclick: () => { cur = i; draw(); } }, t));
  body.append(h("div", { class: "controls" }, h("span", { class: "lp-lab" }, "request for:"), ...btns), s);
  const u = 8;
  function draw() {
    btns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === cur)));
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const N = 10000, lay = cubeLayout(N), sz = blockSize(N, u, lay), o = [40, 300];
    block(s, o, u, N, "frozen", lay);
    text(s, 40 + sz.w / 2, 318, "GPT-3 base, frozen: 350 GB = 10,000 cubes", "b");
    text(s, 40 + sz.w / 2, o[1] - sz.h - 10, "loaded one time, used by all tasks", "m");
    block(s, [8, 24], u, 1, "train"); text(s, 24, 21, "1 cube = 35 MB: one task's A and B", "", "start");
    // the update in use, next to the base
    const ux = 40 + sz.w + 26, uy = 180;
    block(s, [ux, uy], u, 1, "train");
    text(s, ux + 18, uy - 2, `${TASKS[cur]}: A, B`, "o", "start");
    lab(s, ux + 18, uy + 15, ["added to W", ["q"], " and W", ["v"]], "m", "start");
    el("line", { x1: ux - 4, y1: uy - 5, x2: 40 + sz.w - 4, y2: uy - 5, class: "s-edge on", "marker-end": `url(#ah-on${s.dataset.uid})` }, s);
    // the shelf of updates on disk
    const sx = 470, sy = 70;
    el("rect", { x: sx - 14, y: sy - 34, width: 170, height: 46 + 30 * TASKS.length, rx: 6, fill: "none", stroke: "var(--line)" }, s);
    text(s, sx - 6, sy - 16, "on disk, 35 MB each", "m", "start");
    TASKS.forEach((t, i) => {
      const y = sy + 16 + i * 30, on = i === cur;
      block(s, [sx, y], u, 1, on ? "faint" : "train");
      text(s, sx + 22, y - 2, t, on ? "m" : "", "start");
    });
    text(s, sx - 6, sy + 16 + TASKS.length * 30 + 4, "… one for each task or user", "m", "start");
    el("path", { d: `M${sx - 18},${sy + 12 + cur * 30} C${sx - 70},${sy + 12 + cur * 30} ${ux + 60},${uy - 60} ${ux + 30},${uy - 26}`, class: "s-edge on", "marker-end": `url(#ah-on${s.dataset.uid})` }, s);
  }
  draw();
}

// ── 5 · Memory against model size: what fits on one GPU ──────────────────────
export function loraFit(root) {
  const q = "qlora" in root.dataset;
  const MODELS = [
    { n: "GPT-2 small", P: 124e6, d: 768, L: 12 },
    { n: "GPT-2 XL", P: 1558e6, d: 1600, L: 48 },
    { n: "LLaMA 7B", P: 6.7e9, d: 4096, L: 32 },
    { n: "LLaMA 65B", P: 65.2e9, d: 8192, L: 80 },
    { n: "GPT-3", P: 175e9, d: 12288, L: 96 },
  ];
  const body = frame(root, q ? "Full fine-tuning, LoRA and QLoRA: memory against model size" : "Full fine-tuning and LoRA: memory against model size",
    "The chart counts the weights and AdamW's m and v only, not activations. Choose the GPU memory. Lines: bytes for a model with Ψ parameters. Dots: five models, LoRA at r = 8 on W_q and W_v (ψ trained parameters).",
    "We calculated all values. Full fine-tuning: 16 bytes per parameter, Part A's count (weights, gradients, AdamW's m and v, FP32). LoRA: 2Ψ + 16ψ (16-bit frozen weights; full states for A and B). " + (q ? "QLoRA: 0.5Ψ + 16ψ (4-bit frozen weights; quantisation constants left out). " : "") +
    "Shapes: nanoGPT model.py (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>); LLaMA, <a data-ref=\"touvron2023a\">Touvron et al. (2023)</a>, Table 2; GPT-3, <a data-ref=\"brown2020\">Brown et al. (2020)</a>, Table 2.1. Marked: <a data-ref=\"hu2022\">Hu et al. (2022)</a>, §4.2 (GPT-3: 1.2 TB → 350 GB)" + (q ? "; <a data-ref=\"dettmers2023\">Dettmers et al. (2023)</a> (65B on one 48 GB GPU)." : "."));
  const GPUS = q ? [24e9, 48e9, 80e9] : [24e9, 40e9, 80e9];
  let G = q ? 48e9 : 80e9;
  const W = q ? 560 : 720, Hs = q ? 270 : 318;
  const s = svg(W, Hs, null, "Memory against parameters, log scales");
  const btns = GPUS.map(v => h("button", { onclick: () => { G = v; draw(); } }, `${v / 1e9} GB`));
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("span", { class: "lp-lab" }, "one GPU with"), ...btns), s, read);
  const x0 = 62, x1 = W - 14, y0 = Hs - 42, y1 = 14;
  const lg = Math.log10, X = v => x0 + (lg(v) - 8) / 4 * (x1 - x0), Y = v => y0 - (lg(v) - 8) / 5 * (y0 - y1);
  const LINES = [
    { k: "full", c: "var(--blue-2)", b: 16, lab: "full fine-tuning: 16Ψ" },
    { k: "lora", c: "var(--orange)", b: 2, lab: "LoRA: 2Ψ + 16ψ" },
  ].concat(q ? [{ k: "qlora", c: "var(--good)", b: 0.5, lab: "QLoRA: 0.5Ψ + 16ψ" }] : []);
  const psi = m => m.L * 2 * 2 * m.d * 8;
  const mem = (m, b) => (b === 16 ? 16 * m.P : b * m.P + 16 * psi(m));
  function draw() {
    btns.forEach((b, i) => b.setAttribute("aria-pressed", String(GPUS[i] === G)));
    s.innerHTML = "";
    // fits region and axes
    el("rect", { x: x0, y: Y(G), width: x1 - x0, height: y0 - Y(G), fill: "var(--good)", "fill-opacity": 0.07 }, s);
    [1e8, 1e9, 1e10, 1e11, 1e12].forEach(v => { el("line", { x1: X(v), y1: y1, x2: X(v), y2: y0, class: "s-axis" }, s); text(s, X(v), y0 + 17, short(v), "m"); });
    [1e8, 1e9, 1e10, 1e11, 1e12, 1e13].forEach(v => { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: "s-axis" }, s); text(s, x0 - 6, Y(v) + 4, gbytes(v).replace(".0 ", " "), "m", "end"); });
    text(s, (x0 + x1) / 2, y0 + 36, "parameters Ψ (log scale)", "m");
    el("line", { x1: x0, y1: Y(G), x2: x1, y2: Y(G), stroke: "var(--good)", "stroke-width": 2, "stroke-dasharray": "6 4" }, s);
    text(s, x0 + 6, Y(G) + 17, `one ${G / 1e9} GB GPU`, "b", "start").setAttribute("fill", "var(--good)");
    // lines, their crossing with the GPU, and the models
    LINES.forEach((Lc, li) => {
      const a = Math.max(1e8, 1e8 / Lc.b), b = Math.min(1e12, 1e13 / Lc.b);   // keep the line inside 100 MB … 10 TB
      el("line", { x1: X(a), y1: Y(Lc.b * a), x2: X(b), y2: Y(Lc.b * b), stroke: Lc.c, "stroke-width": 3 }, s);
      const cross = G / Lc.b;
      if (cross >= 1e8 && cross <= 1e12) {
        el("line", { x1: X(cross), y1: Y(G), x2: X(cross), y2: y0, stroke: Lc.c, "stroke-width": 1.5, "stroke-dasharray": "3 3" }, s);
        el("circle", { cx: X(cross), cy: Y(G), r: 5, fill: Lc.c }, s);
        const t = text(s, X(cross) + 5, y0 - 8 - li * 18, `${short(cross)}`, "b", "start"); t.setAttribute("fill", Lc.c);
      }
      MODELS.forEach(m => { if (mem(m, Lc.b) >= 1e8) el("circle", { cx: X(m.P), cy: Y(mem(m, Lc.b)), r: 4.5, fill: "var(--card)", stroke: Lc.c, "stroke-width": 2 }, s); });
    });
    MODELS.forEach((m, i) => {
      if (q && i < 3) return;                                  // the QLoRA chart is narrow: name only the large models
      if (i === 0) text(s, X(m.P) + 8, Y(mem(m, 16)) + 18, m.n, "m", "start");
      else text(s, X(m.P) - 6, Y(mem(m, 16)) - 11, m.n, "m", "end");
    });
    // what the papers report
    const mark = (P, B) => el("path", { d: `M${X(P)},${Y(B) - 7} l6,7 l-6,7 l-6,-7 z`, fill: "var(--card)", stroke: "var(--deep)", "stroke-width": 1.8 }, s);
    mark(175e9, 1.2e12); mark(175e9, 350e9);
    if (q) mark(65.2e9, 48e9);
    // legend, top left, where no line passes
    const lx = x0 + 10, ly = y1 + 6;
    el("rect", { x: lx - 6, y: ly - 2, width: q ? 190 : 250, height: 20 * (LINES.length + 1) + 6, rx: 4, fill: "var(--card)", stroke: "var(--line)" }, s);
    LINES.forEach((Lc, i) => {
      el("line", { x1: lx, y1: ly + 12 + 20 * i, x2: lx + 22, y2: ly + 12 + 20 * i, stroke: Lc.c, "stroke-width": 3 }, s);
      text(s, lx + 30, ly + 17 + 20 * i, Lc.lab, "", "start");
    });
    const iy = ly + 12 + 20 * LINES.length;
    el("path", { d: `M${lx + 11},${iy - 7} l6,7 l-6,7 l-6,-7 z`, fill: "var(--card)", stroke: "var(--deep)", "stroke-width": 1.8 }, s);
    text(s, lx + 30, iy + 5, q ? "values from the papers" : "values from Hu et al. for GPT-3", "", "start");
    const fit = LINES.map(Lc => `${Lc.k === "full" ? "full fine-tuning" : Lc.k === "lora" ? "LoRA" : "QLoRA"} up to <b>${short(G / Lc.b)}</b>`).join(", ");
    read.innerHTML = `One ${G / 1e9} GB GPU holds the weights and AdamW's m and v for: ${fit} parameters. Activations need more memory.`;
  }
  draw();
}
