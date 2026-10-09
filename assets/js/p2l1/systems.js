// Visualizations for Part 2 · Lecture 1 · Session 02, Part A rebuilt around nanoGPT (6 Oct 2026).
// Registered in assets/js/main.js → load(). Helpers: ../lib.js (el, h, svg, text, slider, frame …).
// Precision, compute, GPUs, memory and time of nanoGPT's GPT-2 (124M) run (Karpathy, 2022).
// Every number comes from nanoGPT (train.py, model.py, transformer_sizing.ipynb, README) or from
// the paper named in the figure's footer; arithmetic done here says "computed here".
// Each SVG's viewBox is its size on the slide (the deck sets its height), so text is drawn 1:1.
import { el, h, svg, text, slider, frame, rng, gauss } from "../lib.js";
import { floatBits } from "./training.js";

// ── shared ───────────────────────────────────────────────────────────────────
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = e => String(e).split("").map(c => (/\d/.test(c) ? SUP[+c] : c === "-" ? "⁻" : c)).join("");
function sci(x, d = 2) {
  let e = Math.floor(Math.log10(Math.abs(x))), m = x / 10 ** e;
  if (+m.toFixed(d) >= 10) { e += 1; m = x / 10 ** e; }
  return `${m.toFixed(d)} × 10${sup(e)}`;
}
const comma = n => Math.round(n).toLocaleString("en-US");
const clamp01 = v => Math.max(0, Math.min(1, v));

// nanoGPT's GPT-2 (124M) run: train.py defaults = config/train_gpt2.py; model.py
const RUN = {
  N: 124439808,          // GPT-2 small, as on the deck's compute slides (with biases, vocabulary 50,257)
  Nmfu: 123587328,       // what estimate_mfu counts: train.py's model (no biases, vocabulary 50,304) minus position embeddings; computed here
  L: 12, H: 12, Q: 64, T: 1024, d: 768, V: 50304,   // n_layer, n_head, d_head, T (positions), d, V
  micro: 12, accum: 40, gpus: 8, iters: 600000,
  peak: 312e12,          // "A100 GPU bfloat16 peak flops is 312 TFLOPS" (model.py, estimate_mfu)
};
RUN.stepTokens = RUN.micro * RUN.T * RUN.accum;   // 491,520
RUN.D = RUN.stepTokens * RUN.iters;               // 2.949e11

// ── ② Forward under autocast: which operations run in BF16 ───────────────────
export function autocastFlow(root) {
  const body = frame(root, "Inside autocast: which operations run in BF16",
    "nanoGPT's forward pass, coloured by the precision autocast gives each operation, and the share of the forward FLOPs each part does.",
    "Precision per operation: PyTorch's autocast lists (<a data-ref=\"pytorch2026amp\">PyTorch, 2026</a>) applied to nanoGPT's <code>model.py</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>); why sums stay in FP32: <a data-ref=\"micikevicius2018\">Micikevicius et al. (2018)</a>, §3.3. FLOPs per 1,024-token sequence from nanoGPT's <code>transformer_sizing.ipynb</code>, which counts the matrix products only (the other layers are “effectively irrelevant”).");
  const s = svg(1150, 296, null, "nanoGPT's forward pass: matrix products in BF16, LayerNorm and the loss in FP32");
  body.append(s);
  const OPS = [
    ["Embedding", "FP32", "table lookup"],
    ["LayerNorm", "FP32", "sums over 768"],
    ["Attention", "BF16", "4 matrix products"],
    ["LayerNorm", "FP32", "sums over 768"],
    ["MLP", "BF16", "2 matrix products"],
    ["LayerNorm", "FP32", "sums over 768"],
    ["Output layer", "BF16", "1 matrix product"],
    ["Loss", "FP32", "log-softmax"],
  ];
  const bw = 128, gap = 14, x0 = 13, y = 40, bh = 80;
  const bx = i => x0 + i * (bw + gap);
  // the twelve blocks
  const gx1 = bx(1) - 8, gx2 = bx(4) + bw + 8;
  el("path", { d: `M${gx1},${y - 6} V${y - 16} H${gx2} V${y - 6}`, class: "s-edge" }, s);
  text(s, (gx1 + gx2) / 2, y - 22, "one Transformer block, × 12", "b");
  OPS.forEach(([nm, dt, sub], i) => {
    const x = bx(i), bf = dt === "BF16";
    el("rect", { x, y, width: bw, height: bh, rx: 5, fill: bf ? "var(--tint)" : "var(--panel-2)", stroke: bf ? "var(--orange)" : "var(--blue-2)", "stroke-width": 2 }, s);
    text(s, x + bw / 2, y + 24, nm, "b");
    text(s, x + bw / 2, y + 48, dt, bf ? "o" : "bl");
    text(s, x + bw / 2, y + 70, sub, "m");
    if (i) el("path", { d: `M${x - gap + 2},${y + bh / 2} H${x - 3} M${x - 8},${y + bh / 2 - 5} L${x - 3},${y + bh / 2} L${x - 8},${y + bh / 2 + 5}`, class: "s-edge" }, s);
  });
  // legend
  const ly = 148;
  el("rect", { x: 13, y: ly - 15, width: 18, height: 18, rx: 3, fill: "var(--tint)", stroke: "var(--orange)", "stroke-width": 2 }, s);
  text(s, 40, ly, "BF16 (brain floating point), 2 bytes: every matrix product", "", "start");
  el("rect", { x: 580, y: ly - 15, width: 18, height: 18, rx: 3, fill: "var(--panel-2)", stroke: "var(--blue-2)", "stroke-width": 2 }, s);
  text(s, 607, ly, "FP32 (32-bit floating point), 4 bytes: sums, logs, exponentials", "", "start");
  // forward FLOPs for one 1,024-token sequence (transformer_sizing.ipynb, flops())
  const PARTS = [["attention products", 12 * 8053063680], ["MLP products", 12 * 9663676416], ["output layer", 79047426048]];
  const tot = PARTS.reduce((a, [, v]) => a + v, 0);   // 291,648,307,200
  const fy = 196, fx = 13, fw = 1124, fh = 40;
  text(s, fx, fy - 12, `Forward FLOPs for one 1,024-token sequence: ${sci(tot, 1)}, all in matrix products`, "b", "start");
  let acc = 0;
  const FILL = ["#ef7c00", "#c96800", "#a35500"];
  PARTS.forEach(([nm, v], i) => {
    const x = fx + (acc / tot) * fw, w = (v / tot) * fw;
    el("rect", { x, y: fy, width: w - 3, height: fh, rx: 3, fill: FILL[i] }, s);
    text(s, x + w / 2, fy + 26, `${nm} ${Math.round((100 * v) / tot)}%`, "w b");
    acc += v;
  });
  text(s, fx, fy + 68, "LayerNorm and the loss need almost no FLOPs. nanoGPT's transformer_sizing.ipynb calls them “effectively irrelevant”.", "n", "start");
  text(s, fx, fy + 94, "The weights stay in FP32. Autocast makes a BF16 copy of them for each matrix product. The gradients are in FP32.", "n", "start");
}

// ── ② Why BF16: training.js's floatBits, opened on data-value (default 0.1) ──────
// The deck asks "type 70000, then 1e-8" before showing them, so the strips open on a
// harmless value. floatBits itself is unchanged.
// The readout's status words are rewritten in plain English in place ("normal: all digits kept",
// "too large → ∞" …), keeping the columns.
export function floatBitsAt(root) {
  floatBits(root);
  const inp = root.querySelector("input"), read = root.querySelector(".readout");
  if (!inp) return;
  if (read) {
    const gloss = () => {
      const t = read.textContent;
      const u = t.replace(/subnormal \(few significant bits\)/g, "very small: fewer digits kept   ")
        .replace(/(^|\n)(\S+ +)normal {17}/g, "$1$2normal: all digits kept")
        .replace(/overflow → ∞ /g, "too large → ∞")
        .replace(/underflow → 0/g, "too small → 0")
        .replace("FP16's largest value is 65,504; BF16 reaches 3.4 × 10³⁸ like FP32, with less precision.",
          "FP16's largest number is 65,504. BF16 goes up to 3.4 × 10³⁸, like FP32, with fewer digits.");
      if (u !== t) read.textContent = u;
    };
    new MutationObserver(gloss).observe(read, { childList: true, characterData: true, subtree: true });
  }
  inp.value = root.dataset.value || "0.1";
  inp.dispatchEvent(new Event("input"));
}

// ── ④ Backward: one forward product, two backward products ───────────────────
export function matmulCost(root) {
  const body = frame(root, "One weight matrix, three matrix products",
    "nanoGPT's first MLP layer, W (768 × 3,072), on one micro-batch of n = 12 × 1,024 tokens. The forward pass is one product; the backward pass is two of the same size.",
    "Counting rule: <a data-ref=\"kaplan2020\">Kaplan et al. (2020)</a>, §2.1; “2N for forward and 4N for backward”: <a data-ref=\"chowdhery2023\">Chowdhery et al. (2023)</a>, App. B. Layer sizes from nanoGPT (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). FLOP counts computed here.");
  const STEPS = ["Forward", "Input gradient", "Weight gradient", "All three"];
  let sel = Math.max(0, Math.min(3, +(root.dataset.open ?? 3)));
  const bar = h("div", { class: "controls" });
  STEPS.forEach((t, i) => bar.appendChild(h("button", { onclick: () => { sel = i; draw(); } }, t)));
  bar.appendChild(h("span", { class: "lab" }, "n = 12 × 1,024 tokens · ∂X: gradient of the loss with respect to X"));
  const s = svg(1150, 328, null, "forward and backward matrix products of one linear layer");
  body.append(bar, s);
  const Tp = 100, np = 32, mp = 80;            // drawn sizes for n, 768 and 3,072 (not to scale: n = 12,288)
  const X = { fam: "x", nm: "X (input)", dims: "n × 768", w: np, h: Tp }, XT = { fam: "x", nm: "Xᵀ", dims: "768 × n", w: Tp, h: np };
  const Wm = { fam: "w", nm: "W", dims: "768 × 3,072", w: mp, h: np }, WT = { fam: "w", nm: "Wᵀ", dims: "3,072 × 768", w: np, h: mp };
  const PANELS = [
    { t: "Forward: the first MLP layer", f: "Y = X W", mats: [X, Wm, { fam: "y", nm: "Y (output)", dims: "n × 3,072", w: mp, h: Tp, out: true }], code: "model(X, Y)" },
    { t: "Backward: the gradient of the input", f: "∂X = ∂Y Wᵀ", mats: [{ fam: "y", nm: "∂Y", dims: "n × 3,072", w: mp, h: Tp, g: true }, WT, { fam: "x", nm: "∂X", dims: "n × 768", w: np, h: Tp, out: true, g: true }], code: "loss.backward()" },
    { t: "Backward: the gradient of the weights", f: "∂W = Xᵀ ∂Y", mats: [XT, { fam: "y", nm: "∂Y", dims: "n × 3,072", w: mp, h: Tp, g: true }, { fam: "w", nm: "∂W", dims: "768 × 3,072", w: mp, h: np, out: true, g: true }], code: "loss.backward()" },
  ];
  const FAM = { x: ["var(--panel-2)", "var(--blue-2)"], w: ["var(--tint)", "var(--orange)"], y: ["var(--panel)", "var(--muted)"] };
  const flops = 2 * RUN.micro * RUN.T * 768 * 3072;   // 5.80e10 per product, per micro-batch
  const PW = 383, yc = 128;
  function draw() {
    [...bar.querySelectorAll("button")].forEach((b, i) => b.setAttribute("aria-pressed", String(i === sel)));
    s.innerHTML = "";
    PANELS.forEach((P, i) => {
      // the chosen product in full; earlier ones faded; later ones not shown yet
      const g = el("g", { opacity: sel === 3 || sel === i ? 1 : i < sel ? 0.3 : 0 }, s);
      const px = i * PW, cx = px + PW / 2;
      text(g, cx, 22, P.t, i ? "b o" : "b bl");
      text(g, cx, 48, P.f, "f");
      const sw = P.mats.reduce((a, m) => a + m.w, 0), opw = Math.min(52, (PW - 12 - sw) / 2), tw = sw + 2 * opw;
      let x = cx - tw / 2;
      P.mats.forEach((m, j) => {
        const [fill, stroke] = FAM[m.fam];
        el("rect", { x, y: yc - m.h / 2, width: m.w, height: m.h, rx: 2, fill, stroke, "stroke-width": m.out ? 3 : 1.5, "stroke-dasharray": m.g ? "5 3" : null }, g);
        text(g, x + m.w / 2, yc + Tp / 2 + 22, m.nm, "b");
        text(g, x + m.w / 2, yc + Tp / 2 + 42, m.dims, "m");
        x += m.w;
        if (j < 2) {
          if (j) text(g, x + opw / 2, yc + 11, "=", "op");
          else el("circle", { cx: x + opw / 2, cy: yc, r: 4.5, fill: "var(--muted)" }, g);
          x += opw;
        }
      });
      text(g, cx, 246, `2 · n · 768 · 3,072 = ${sci(flops, 1)} FLOPs`, "b o");
      if (i < 2) el("line", { x1: px + PW, y1: 8, x2: px + PW, y2: 256, class: "s-axis" }, s);
    });
    // the tally: one forward product, two backward products of the same size
    const ty = 270, th = 32;
    PANELS.forEach((P, i) => {
      const on = sel === 3 || sel === i, shown = sel === 3 || i <= sel;
      if (!shown) {
        el("rect", { x: i * PW + 8, y: ty, width: PW - 16, height: th, rx: 3, fill: "none", stroke: "var(--line)", "stroke-width": 1.5, "stroke-dasharray": "5 4" }, s);
        text(s, i * PW + PW / 2, ty + 22, "?", "b m");
        return;
      }
      el("rect", { x: i * PW + 8, y: ty, width: PW - 16, height: th, rx: 3, fill: i ? "#ef7c00" : "#466a88", opacity: on ? 1 : 0.35 }, s);
      text(s, i * PW + PW / 2, ty + 22, i ? "backward: 2 FLOPs per weight per token" : "forward: 2 FLOPs per weight per token", "w b");
    });
    text(s, PW / 2, ty + 50, "forward: 2N per token", "b bl");
    if (sel >= 2) text(s, 2 * PW, ty + 50, "backward: 4N per token, two times the forward", "b o");
  }
  draw();
}

// ── ④ Backward on 8 GPUs: data parallel, all-reduce on the last micro-step ───
export function ddpSync(root) {
  const body = frame(root, "Data parallel: 8 GPUs, one training step",
    "Every GPU holds the whole model and runs 5 micro-steps on its own micro-batches. Only the backward pass of the last micro-step averages the gradients across the GPUs (all-reduce).",
    "nanoGPT's <code>train.py</code>: <code>gradient_accumulation_steps = 5 * 8</code> divided by 8 GPUs; <code>require_backward_grad_sync</code> set on the last micro-step (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). DDP averages gradients with all-reduce, overlapped with the backward pass, and can skip synchronisation for gradient accumulation (<a data-ref=\"li2020\">Li et al., 2020</a>, §2.2, §3.2). Gradient values are made up for the picture (seeded noise around one shared direction).");
  const G = RUN.gpus, K = RUN.accum / RUN.gpus, DIM = 6;
  const r = rng(5305);
  const base = Array.from({ length: DIM }, () => gauss(r) * 0.55);
  const grad = Array.from({ length: G }, () => Array.from({ length: K }, () => base.map(b => b + gauss(r) * 0.9)));
  const local = (gi, t) => base.map((_, j) => grad[gi].reduce((a, gk, k) => a + clamp01(t - k) * gk[j], 0) / K);
  const full = Array.from({ length: G }, (_, gi) => local(gi, K));
  const avg = base.map((_, j) => full.reduce((a, v) => a + v[j], 0) / G);
  const END = K + 2;          // phases: micro-steps 0..K-1, all-reduce K, update K+1
  let t = END, timer = null, last = 0;
  const bPlay = h("button", { class: "primary" }, "Play");
  const bStep = h("button", {}, "Step");
  const bReset = h("button", {}, "Reset");
  const s = svg(1150, 268, null, "eight GPUs, five micro-steps each, gradients averaged by all-reduce");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bPlay, bStep, bReset), s, read);
  const stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; bPlay.textContent = "Play"; };
  const tick = now => {
    t = Math.min(END, t + (now - last) / 1100); last = now;
    draw();
    if (t >= END) { stop(); return; }
    timer = requestAnimationFrame(tick);
  };
  bPlay.addEventListener("click", () => {
    if (timer) { stop(); return; }
    if (t >= END) t = 0;
    bPlay.textContent = "Pause"; last = performance.now(); timer = requestAnimationFrame(tick);
  });
  bStep.addEventListener("click", () => { stop(); t = t >= END ? 1 : Math.floor(t) + 1; draw(); });
  bReset.addEventListener("click", () => { stop(); t = 0; draw(); });
  const y0 = 52, pitch = 27, ch = 22, gx = 150, cw = 106, cg = 8, chx = 742, arx = 930;
  const rowY = gi => y0 + gi * pitch;
  function draw() {
    s.innerHTML = "";
    // headers
    text(s, 0, 20, "8 GPUs", "b", "start");
    text(s, 66, 44, "full copy", "m", "start");
    text(s, gx + (K * (cw + cg) - cg) / 2, 20, "micro-steps on every GPU", "b");
    for (let k = 0; k < K; k++) {
      const x = gx + k * (cw + cg) + cw / 2, sync = k === K - 1;
      text(s, x, 44, `${k + 1} · ${sync ? "share" : "no sharing"}`, sync ? "o" : "m");
    }
    text(s, chx + 66, 20, "its gradient", "b");
    text(s, chx + 66, 44, "6 of 124M values", "m");
    const syncing = t > K - 0.6 && t < K + 1, mix = clamp01(t - K), updated = t > K + 1;
    for (let gi = 0; gi < G; gi++) {
      const y = rowY(gi), cy = y + ch / 2;
      text(s, 0, cy + 6, `GPU ${gi}`, "", "start");
      el("rect", { x: 66, y, width: 70, height: ch, rx: 3, fill: "var(--blue)", opacity: updated ? 1 : 0.85 }, s);
      text(s, 101, cy + 5, "model", "w sm");
      for (let k = 0; k < K; k++) {
        const x = gx + k * (cw + cg), f = clamp01(t - k);
        el("rect", { x, y, width: cw, height: ch, rx: 3, fill: "none", stroke: "var(--line)", "stroke-width": 1.2 }, s);
        if (f > 0) el("rect", { x, y, width: cw * f, height: ch, rx: 3, fill: k === K - 1 ? "#ef7c00" : "#4f86c6", opacity: 0.9 }, s);
        if (f >= 1) text(s, x + cw / 2, cy + 5, `batch ${k * G + gi + 1}`, "w sm");
      }
      // gradient sparkline: local sum, then the average after the all-reduce
      const lv = local(gi, Math.min(t, K)), v = lv.map((a, j) => (1 - mix) * a + mix * avg[j]);
      el("line", { x1: chx, y1: cy, x2: chx + 132, y2: cy, class: "s-axis" }, s);
      v.forEach((a, j) => {
        const hgt = Math.max(-11, Math.min(11, a * 20));
        el("rect", { x: chx + 2 + j * 22, y: hgt > 0 ? cy - hgt : cy, width: 18, height: Math.max(1.5, Math.abs(hgt)), fill: mix >= 1 ? "#ef7c00" : "#4f86c6" }, s);
      });
      el("line", { x1: chx + 140, y1: cy, x2: arx, y2: cy, class: `s-edge ${syncing ? "on" : "faint"}` }, s);
    }
    const top = rowY(0) + ch / 2, bot = rowY(G - 1) + ch / 2, mid = (top + bot) / 2;
    el("line", { x1: arx, y1: top, x2: arx, y2: bot, class: `s-edge ${syncing ? "on" : ""}`, "stroke-width": syncing ? 5 : 2 }, s);
    text(s, arx + 16, mid - 50, "all-reduce:", syncing || mix >= 1 ? "b o" : "b", "start");
    text(s, arx + 16, mid - 26, "every GPU gets the", "", "start");
    text(s, arx + 16, mid - 4, "average of 8 gradients", "", "start");
    if (mix >= 1) {
      text(s, arx + 16, mid + 32, "all 8 are now equal:", "b", "start");
      text(s, arx + 16, mid + 54, "the average over", "", "start");
      text(s, arx + 16, mid + 76, "40 micro-batches", "", "start");
    }
    // readout
    const ph = Math.ceil(t) - 1;   // the phase running, or just finished when stepping
    let msg;
    if (t <= 0) msg = "Start of a step: all 8 GPUs hold the same weights. Press Play or Step.";
    else if (ph < K - 1) msg = `Micro-step ${ph + 1} of 5: each GPU adds the gradient of its own micro-batch. No GPU sends data.`;
    else if (ph === K - 1) msg = "Micro-step 5: require_backward_grad_sync is True. The backward pass also starts the all-reduce.";
    else if (ph === K) msg = "All-reduce: every GPU gets the average of the 8 gradients.";
    else msg = "Every GPU has the average over 40 micro-batches. All 8 GPUs make the same update.";
    read.textContent = msg;
  }
  draw();
}

// ── ⑥ Memory of the run: model states against activations ─────────────────────
export function runMemory(root) {
  const body = frame(root, "Memory per GPU in nanoGPT's run",
    "Model states take 16 bytes for every parameter, whatever the batch. Activations grow with the sequences in each micro-batch. Move the slider.",
    "Model states: nanoGPT keeps parameters in FP32 and AdamW's m and v in the parameters' precision (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>, <code>train.py</code>, <code>transformer_sizing.ipynb</code>); ZeRO's mixed-precision count also gives 16 bytes (<a data-ref=\"rajbhandari2020\">Rajbhandari et al., 2020</a>, §3.1). Activations: about 12 × d × T × n_layer values per sequence in 16 bits (ibid., footnote 3), plus T × V logits in BF16. Estimates computed here; temporary buffers, the FP32 copy of the logits inside the loss and memory fragmentation are not counted. GB = 10⁹ bytes.");
  const { N, d, T, L, V } = RUN;
  const states = 16 * N;                                  // 1.99e9
  const perSeqBlocks = 12 * d * T * L * 2, perSeqLogits = T * V * 2;
  let b = RUN.micro;
  const sl = slider("Sequences per micro-batch", 1, 32, 1, b, v => { b = v; draw(); });
  const s = svg(1150, 286, null, "model states and activation memory against micro-batch size");
  body.append(h("div", { class: "controls" }, sl), s);
  const COL = [["weights", "#1f5aa6"], ["gradients", "#4f86c6"], ["AdamW m", "#5b6f8c"], ["AdamW v", "#3a4d63"]];
  const ACT = [["in the 12 blocks", "#ef7c00"], ["logits", "#b85f00"]];
  // chart frame
  const cx0 = 600, cx1 = 1100, cy0 = 232, cy1 = 14, bMax = 32, gMax = 14;
  const X = v => cx0 + (v / bMax) * (cx1 - cx0), Y = v => cy0 - (v / gMax) * (cy0 - cy1);
  function draw() {
    s.innerHTML = "";
    // left: 16 bytes per parameter
    text(s, 0, 22, "Model states: 4 FP32 numbers for each parameter", "t", "start");
    COL.forEach(([nm, c], i) => {
      const x = i * 116;
      el("rect", { x, y: 38, width: 110, height: 52, rx: 4, fill: c }, s);
      text(s, x + 55, 72, "4 bytes", "w b");
      text(s, x + 55, 112, nm, "");
    });
    text(s, 0, 150, `16 bytes × 124M = ${(states / 1e9).toFixed(1)} GB`, "big2", "start");
    text(s, 0, 182, "This does not change with the batch size.", "n", "start");
    text(s, 0, 214, "The saved model file has the weights, m and v:", "n", "start");
    text(s, 0, 236, "12 bytes, 1.49 GB (measured: 1.54 GB).", "n", "start");
    // right: memory against micro-batch size
    for (let g = 0; g <= gMax; g += 2) {
      el("line", { x1: cx0, y1: Y(g), x2: cx1, y2: Y(g), class: "s-axis" }, s);
      if (g % 4 === 0) text(s, cx0 - 8, Y(g) + 5, `${g}`, "m", "end");
    }
    [1, 8, 16, 24, 32].forEach(v => text(s, X(v), cy0 + 22, String(v), "m"));
    text(s, (cx0 + cx1) / 2, cy0 + 46, "sequences of 1,024 tokens per micro-batch", "m");
    text(s, cx0 + 8, cy1 + 4, "GB per GPU (estimates)", "m", "start");
    const sGB = states / 1e9, bl = perSeqBlocks / 1e9, lo = perSeqLogits / 1e9;
    const P = pts => pts.map(([u, v], i) => `${i ? "L" : "M"}${X(u).toFixed(1)},${Y(v).toFixed(1)}`).join("") + "Z";
    el("path", { d: P([[0, 0], [bMax, 0], [bMax, sGB], [0, sGB]]), fill: "#4f86c6", opacity: 0.9 }, s);
    el("path", { d: P([[0, sGB], [bMax, sGB + bl * bMax], [bMax, sGB + (bl + lo) * bMax], [0, sGB]]), fill: "#b85f00", opacity: 0.55 }, s);
    el("path", { d: P([[0, sGB], [bMax, sGB], [bMax, sGB + bl * bMax]]), fill: "#ef7c00", opacity: 0.6 }, s);
    // crossing: activations equal model states
    const bx = sGB / (bl + lo);
    el("circle", { cx: X(bx), cy: Y(2 * sGB), r: 5, fill: "var(--text)" }, s);
    text(s, X(bx) - 10, Y(2 * sGB) - 8, `equal at ${bx.toFixed(0)} sequences`, "sm", "end");
    // the chosen micro-batch
    const aB = bl * b, aL = lo * b, tot = sGB + aB + aL;
    el("line", { x1: X(b), y1: cy0, x2: X(b), y2: Math.max(cy1, Y(tot) - 8), class: "s-edge dash" }, s);
    const lx = X(b) + 10, anchor = b > 24 ? "end" : "start", lx2 = b > 24 ? X(b) - 10 : lx;
    const ty = b < 12 ? Math.min(Y(tot) - 12, Y(2 * sGB) - 26) : Math.max(cy1 + 14, Y(tot) - 12);
    text(s, lx2, ty, `${b} sequence${b > 1 ? "s" : ""}${b === RUN.micro ? " (nanoGPT)" : ""}: ≈ ${tot.toFixed(1)} GB`, "b", anchor);
    if (aB > 1.2) text(s, lx2, Y(sGB + aB / 2) + 5, `activations in 12 blocks: ${aB.toFixed(1)} GB`, "sm", anchor);
    if (aL > 0.9) text(s, lx2, Y(sGB + aB + aL / 2) + 5, `logits: ${aL.toFixed(1)} GB`, "sm", anchor);
    text(s, lx2, Y(sGB / 2) + 5, `model states ${sGB.toFixed(1)} GB`, "w sm b", anchor);
  }
  draw();
}

// ── ⑦ Repeat: model FLOPs utilisation of the whole run ────────────────────────
export function mfuRun(root) {
  const body = frame(root, "How much of the GPUs' peak did the run use?",
    "Training time at the GPUs' peak speed against the time the run took. Their ratio is the model FLOPs utilisation (MFU), compared with other reported runs.",
    "MFU, the 6N + 12 · n_layer · n_head · d_head · T count and the other runs' MFU: <a data-ref=\"chowdhery2023\">Chowdhery et al. (2023)</a>, §4.1, Table 3 and App. B. nanoGPT: 312 TFLOP/s per A100 and <code>estimate_mfu</code> from <code>model.py</code>; “about 4 days” from the README, “~5 days” from <code>config/train_gpt2.py</code>; 37% on one A100 from <code>transformer_sizing.ipynb</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). Run totals and ratios computed here.");
  let attn = false, days = 4;
  const bF = [h("button", {}, "6N"), h("button", {}, "6N + attention")];
  const bD = [h("button", {}, "4 days (README)"), h("button", {}, "5 days (config)")];
  bF.forEach((b, i) => b.addEventListener("click", () => { attn = !!i; draw(); }));
  bD.forEach((b, i) => b.addEventListener("click", () => { days = i ? 5 : 4; draw(); }));
  const s = svg(1150, 236, null, "time at peak against actual time, and the MFU of reported runs");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("span", { class: "lab" }, "FLOPs per token:"), ...bF, h("span", { class: "lab" }, "Run time:"), ...bD), s, read);
  const ax0 = 140, ax1 = 480, dMax = 5;
  const XD = v => ax0 + (v / dMax) * (ax1 - ax0);
  const RUNS = [["PaLM 540B", 46.2], ["nanoGPT, one A100", 37.14], ["Megatron-Turing NLG 530B", 30.2], ["GPT-3 175B", 21.3]];
  function draw() {
    bF.forEach((b, i) => b.setAttribute("aria-pressed", String(!!i === attn)));
    bD.forEach((b, i) => b.setAttribute("aria-pressed", String((i ? 5 : 4) === days)));
    const fpt = attn ? 6 * RUN.Nmfu + 12 * RUN.L * RUN.H * RUN.Q * RUN.T : 6 * RUN.N;
    const C = fpt * RUN.D, peak = RUN.gpus * RUN.peak, tPeak = C / peak / 86400, mfu = tPeak / days;
    s.innerHTML = "";
    // left: days at peak against days taken
    text(s, 0, 20, `Time for ${sci(C, 1)} FLOPs`, "t", "start");
    [["at peak speed", tPeak, "#466a88", `${tPeak.toFixed(2)} days`], ["the real run", days, "#ef7c00", `about ${days} days`]].forEach(([nm, v, c, lab], i) => {
      const y = 40 + i * 48;
      text(s, ax0 - 12, y + 23, nm, "b", "end");
      el("rect", { x: ax0, y, width: XD(v) - ax0, height: 34, rx: 3, fill: c }, s);
      text(s, XD(v) + 10, y + 23, lab, "b", "start");
    });
    el("line", { x1: ax0, y1: 132, x2: ax1, y2: 132, class: "s-axis" }, s);
    for (let dd = 0; dd <= dMax; dd++) {
      el("line", { x1: XD(dd), y1: 128, x2: XD(dd), y2: 136, class: "s-axis" }, s);
      text(s, XD(dd), 154, `${dd}`, "m");
    }
    text(s, ax1 + 14, 154, "days", "m", "start");
    text(s, 0, 190, `MFU = ${tPeak.toFixed(2)} ÷ ${days} =`, "b", "start");
    text(s, 0, 226, `${(100 * mfu).toFixed(1)}% of peak speed`, "big", "start");
    // right: reported MFU, sorted, this run highlighted
    const rows = RUNS.map(([nm, v]) => [nm, v, false]).concat([["this run, 8 A100s", 100 * mfu, true]]).sort((a, b) => b[1] - a[1]);
    const rx0 = 870, rx1 = 1090, XM = v => rx0 + (v / 50) * (rx1 - rx0);
    text(s, 640, 20, "MFU of other published runs", "t", "start");
    rows.forEach(([nm, v, me], i) => {
      const y = 36 + i * 40;
      text(s, rx0 - 12, y + 21, nm, me ? "b o" : "", "end");
      el("rect", { x: rx0, y, width: XM(v) - rx0, height: 28, rx: 3, fill: me ? "#ef7c00" : "#466a88", opacity: me ? 1 : 0.75 }, s);
      text(s, XM(v) + 8, y + 21, `${v.toFixed(1)}%`, me ? "b o" : "", "start");
    });
    read.textContent = `${attn ? "(6 × 123.6M + 1.13 × 10⁸)" : "6 × 124.4M"} × ${sci(RUN.D)} = ${sci(C)} FLOPs; ÷ (8 × 312 TFLOP/s) = ${comma(C / peak)} s`;
  }
  draw();
}
