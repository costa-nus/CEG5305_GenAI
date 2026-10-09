// Visualizations for Part 2 · Lecture 1 · Session 02, Part A rebuilt around nanoGPT (6 Oct 2026).
// Registered in assets/js/main.js → load(). Helpers: ../lib.js (el, h, svg, text, slider, frame …).
// Every number is from nanoGPT (Karpathy, 2022) at the file and line named beside it, or from the
// paper named in the figure's footer; arithmetic done here says so. Text sizes are set inline in
// slide pixels (1 viewBox unit = 1 canvas px on the slides), so the figures read the same on the
// lecture page, where they scale with the column. Colours come from the theme variables only.
import { el, h, svg, arrowDefs, uid, arrow, slider, frame, rng, gauss } from "../lib.js";

// text with an explicit size; cls adds the site's s-text variants (m = muted)
function tx(g, x, y, s, size = 17, { cls = "", anchor = "start", weight = null, fill = null } = {}) {
  const e = el("text", { x, y, "text-anchor": anchor, class: `s-text ${cls}`, text: s }, g);
  e.style.fontSize = `${size}px`;
  if (weight) e.style.fontWeight = weight;
  if (fill) e.style.fill = fill;
  return e;
}
const rect = (g, x, y, w, hh, cls = "s-box", rx = 8, extra = {}) => el("rect", { x, y, width: w, height: hh, rx, class: cls, ...extra }, g);

// ── runMap: one nanoGPT run as a loop of seven steps ─────────────────────────
// data-show="overview" (default): what each step does, and the run's headline numbers; click a
// step for its line in train.py. data-show="summary": every component and number filled in.
const RUN_STEPS = [
  { n: "Batch", what: ["read a batch of", "token sequences"],
    sum: ["OpenWebText → GPT-2 BPE", "2 bytes per token", "12 × 1,024 × 40", "= 491,520 tokens"],
    code: "X, Y = get_batch('train')", where: "train.py 250, 303", comp: "data, tokens, batch" },
  { n: "Forward", what: ["predict each", "next token"],
    sum: ["bf16 (autocast)", "2N FLOPs per token"],
    code: "with ctx: logits, loss = model(X, Y)", where: "train.py 299–300", comp: "16-bit numbers (bf16)" },
  { n: "Loss", what: ["measure how wrong", "the predictions are"],
    sum: ["cross-entropy", "10.8 at the start → 2.85"],
    code: "F.cross_entropy(logits, targets)", where: "model.py 187", comp: "cross-entropy" },
  { n: "Backward", what: ["calculate a gradient", "for each weight"],
    sum: ["4N FLOPs per token", "the 8 GPUs average", "their gradients"],
    code: "scaler.scale(loss).backward()", where: "train.py 305; GPUs sync: 298", comp: "6N FLOPs; 8 GPUs" },
  { n: "Clip", what: ["limit the size", "of the gradient"],
    sum: ["if ‖g‖ > 1.0, set the", "length of g to 1.0"],
    code: "clip_grad_norm_(model.parameters(), grad_clip)", where: "train.py 309", comp: "clip at 1.0" },
  { n: "Update", what: ["change each weight", "by a small amount"],
    sum: ["AdamW: β₁ 0.9, β₂ 0.95", "weight decay 0.1", "learning rate 6×10⁻⁴, cosine", "16 bytes per parameter"],
    code: "scaler.step(optimizer)", where: "train.py 311", comp: "AdamW, learning-rate schedule, memory" },
  { n: "Repeat", what: ["do it again:", "600,000 iterations"],
    sum: ["600,000 iterations", "295 billion tokens", "2.2×10²⁰ FLOPs", "about 4 days; MFU ≈ 25%"],
    code: "iter_num += 1  # until max_iters", where: "train.py 328–333", comp: "iterations, GPU use (MFU)" },
];

export function runMap(root) {
  const summary = root.dataset.show === "summary";
  // On the lecture page this 1,150-unit figure shrinks to about 0.7 of its slide size, so the overview
  // raises labels below 16.7 units to 16.7 there (the summary's lines already fill their boxes).
  const floor = root.closest(".slide") || summary ? 0 : 16.7;
  const T = (g, x, y, str, size = 17, o) => tx(g, x, y, str, Math.max(size, floor), o);
  const body = frame(root, summary ? "One nanoGPT iteration, filled in" : "One real run: nanoGPT reproduces GPT-2 small",
    summary ? "Every component of the run sits on one of the seven steps of train.py's loop."
      : "The seven steps of train.py repeat 600,000 times. Click a step to see its line of code.",
    "Run from <a data-ref=\"karpathy2022\">Karpathy (2022)</a>: README (8 × A100 40GB, about 4 days, loss ≈ 2.85), " +
    "<code>train.py</code> defaults (= <code>config/train_gpt2.py</code>), <code>data/openwebtext/readme.md</code> (8,013,769 documents, 9,035,582,198 training tokens). " +
    "Data: <a data-ref=\"gokaslan2019\">Gokaslan & Cohen (2019)</a>. Computed here: 12 × 1,024 × 40 = 491,520 tokens per step; × 600,000 = 2.95 × 10¹¹ tokens; " +
    "6 × 124M × 2.95 × 10¹¹ = 2.2 × 10²⁰ FLOPs; 2.2 × 10²⁰ / (4 days × 8 × 312 TFLOPS) ≈ 25%.");
  const W = 1150, LW = 130, PX = 146, PAD = 12, NW = 222, G = (W - PX - 2 * PAD - 4 * NW) / 3;
  const NH = summary ? 118 : 100, MID = summary ? 80 : 100, TY = summary ? 34 : 40, BY = TY + NH + MID, H = BY + NH + 12;
  const s = svg(W, H, null, summary ? "the seven steps of one nanoGPT iteration, with every component and number" : "the seven steps of one nanoGPT iteration");
  body.appendChild(s);
  let read = null;
  if (!summary) { read = h("div", { class: "readout" }); body.appendChild(read); }
  let sel = -1;
  const colX = i => PX + PAD + i * (NW + G);
  const mx = colX(1), mw = colX(2) + NW - colX(1);                    // the weights, under steps 2–3
  const pos = [[colX(0), TY], [colX(1), TY], [colX(2), TY], [colX(3), TY],
    [colX(3), BY], [mx + mw / 2 - NW / 2, BY], [colX(0), BY]];

  function draw() {
    s.innerHTML = "";
    uid(s); arrowDefs(s);
    // the GPU node that runs the loop
    rect(s, PX, TY - 22, W - PX - 1, H - TY + 21, "s-box", 12, { "stroke-dasharray": "6 5", style: "fill:none" });
    T(s, PX + 14, TY - 8, "one computer with 8 A100 GPUs (40 GB each) · about 4 days", 15, { cls: "m", weight: 600 });
    // in and out
    const io = (y, tag, l1, l2, l3) => {
      rect(s, 0, y, LW, NH, "s-box", 8);
      T(s, 12, y + 22, tag, 13, { cls: "m", weight: 700 });
      T(s, 12, y + 46, l1, summary ? 16 : 17, { weight: 700, fill: "var(--deep)" });
      T(s, 12, y + 67, l2, summary ? 16 : 17);
      if (l3) T(s, 12, y + 88, l3, summary ? 16 : 17);
    };
    io(TY, "IN · DATA", "OpenWebText", "9.04 billion", "tokens");
    io(BY, "OUT · MODEL", "GPT-2 small", "loss ≈ 2.85", null);
    arrow(s, LW + 2, TY + NH / 2, colX(0) - 3, TY + NH / 2);
    arrow(s, colX(0) - 3, BY + NH / 2, LW + 4, BY + NH / 2);
    // the weights: used by Forward, changed by Update
    const my = TY + NH + 18, mh = MID - 36;
    rect(s, mx, my, mw, mh, "rm-model", 8, { style: "fill:var(--blue);stroke:var(--blue)" });
    T(s, mx + mw / 2, my + mh / 2 + 6, summary ? "124 million weights: 12 layers, width 768" : "the weights of GPT-2 small: 124 million numbers", summary ? 16.5 : 17,
      { anchor: "middle", weight: 700, fill: "var(--bg)" });
    arrow(s, colX(1) + NW / 2, my - 1, colX(1) + NW / 2, TY + NH + 3);
    T(s, colX(1) + NW / 2 + 8, TY + NH + 14, "read", 14, { cls: "m" });
    arrow(s, pos[5][0] + NW / 2, BY - 1, pos[5][0] + NW / 2, my + mh + 3, true).setAttribute("style", "stroke-width:3");
    T(s, pos[5][0] + NW / 2 + 10, BY - 4, summary ? "changed" : "changed only here", 14.5, { weight: 700, fill: "var(--orange-2)" });
    // the loop's arrows
    const midY = TY + NH / 2, midB = BY + NH / 2;
    for (let i = 0; i < 3; i++) arrow(s, colX(i) + NW + 2, midY, colX(i + 1) - 3, midY, true);
    arrow(s, colX(3) + NW / 2, TY + NH + 2, colX(3) + NW / 2, BY - 3, true);
    arrow(s, colX(3) - 2, midB, pos[5][0] + NW + 3, midB, true);
    arrow(s, pos[5][0] - 2, midB, colX(0) + NW + 3, midB, true);
    arrow(s, colX(0) + NW / 2, BY - 2, colX(0) + NW / 2, TY + NH + 3, true);
    T(s, colX(0) + NW / 2 + 10, TY + NH + MID / 2 + 5, "next iteration", 14, { cls: "m" });
    // the seven steps
    RUN_STEPS.forEach((st, i) => {
      const [x, y] = pos[i], on = sel === i;
      const g = el("g", { class: "rm-step", tabindex: summary ? null : 0, role: summary ? null : "button",
        "aria-label": `step ${i + 1}: ${st.n}`, style: summary ? null : "cursor:pointer" }, s);
      rect(g, x, y, NW, NH, `s-box ${on ? "on" : ""}`, 8);
      el("circle", { cx: x + 22, cy: y + 23, r: 13, style: "fill:var(--orange)" }, g);
      T(g, x + 22, y + 28.5, String(i + 1), 15, { anchor: "middle", weight: 700, fill: "var(--bg)" });
      T(g, x + 44, y + 30, st.n, summary ? 21 : 22, { weight: 700, fill: "var(--deep)" });
      const lines = summary ? st.sum : st.what;
      lines.forEach((l, k) => T(g, x + 14, y + (summary ? 53 + k * 19.5 : 62 + k * 25), l, summary ? 15.5 : 19));
      if (!summary) {
        const pick = () => { sel = sel === i ? -1 : i; draw(); };
        g.addEventListener("click", pick);
        g.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); pick(); } });
      }
    });
    if (read) {
      const st = RUN_STEPS[sel];
      read.innerHTML = "";
      if (!st) read.append("One iteration = one pass through the 7 steps. Click a step to see its code.");
      else read.append(h("b", {}, `${sel + 1} ${st.n}`), h("code", {}, st.code), ` ${st.where} → ${st.comp}`);
    }
  }
  draw();
}

// ── lossScale: what a loss value means ───────────────────────────────────────
// L = ln K for a uniform guess among K tokens: a straight line on a log axis. Start: K = 50,257
// (GPT-2's vocabulary; ln 50,257 = 10.82, computed). End: L ≈ 2.85 (nanoGPT README), e^2.85 = 17.3.
export function lossScale(root) {
  const body = frame(root, "The loss, read as a number of choices",
    "A random guess among K tokens has the loss ln K. The perplexity e^L changes a loss L back into K.",
    "Final loss ≈ 2.85 from the nanoGPT README (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>); 50,257 tokens: GPT-2's vocabulary (<a data-ref=\"radford2019\">Radford et al., 2019</a>). ln 50,257 = 10.82 and e^2.85 = 17.3 are computed here.");
  const W = 560, H = 298, x0 = 50, x1 = 528, yb = 246, yt = 12, LMAX = 12;
  const X = k => x0 + (Math.log10(k) / 5) * (x1 - x0);
  const Y = L => yb - (L / LMAX) * (yb - yt);
  const s = svg(W, H, null, "loss against perplexity: a straight line, L = ln K, on a log axis");
  const read = h("div", { class: "readout" });
  let L = 2.85;
  const sl = slider("Try a loss L", 0, 11, 0.05, L, v => { L = v; draw(); }, v => v.toFixed(2));
  body.append(s, h("div", { class: "controls" }, sl), read);
  const fmtK = k => (k >= 100 ? Math.round(k).toLocaleString("en-US") : k.toFixed(1));
  function draw() {
    s.innerHTML = "";
    uid(s); arrowDefs(s);
    [1, 10, 100, 1000, 10000, 100000].forEach((k, i) => {
      el("line", { x1: X(k), y1: yt, x2: X(k), y2: yb, class: "s-axis" }, s);
      tx(s, X(k), yb + 20, k.toLocaleString("en-US"), 15, { cls: "m", anchor: i === 5 ? "end" : i === 0 ? "start" : "middle" });
    });
    [0, 2, 4, 6, 8, 10, 12].forEach(v => {
      el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: "s-axis" }, s);
      tx(s, x0 - 8, Y(v) + 5, String(v), 15, { cls: "m", anchor: "end" });
    });
    tx(s, (x0 + x1) / 2, yb + 44, "perplexity e^L: a random choice among this many tokens", 15, { cls: "m", anchor: "middle", weight: 600 });
    const yl = tx(s, 14, (yt + yb) / 2, "loss L", 15, { cls: "m", anchor: "middle", weight: 600 });
    yl.setAttribute("transform", `rotate(-90 14 ${(yt + yb) / 2})`);
    // the line L = ln K
    el("line", { x1: X(1), y1: Y(0), x2: X(1e5), y2: Y(Math.log(1e5)), class: "s-edge", style: "stroke-width:2" }, s);
    // training: from the uniform guess to nanoGPT's final loss
    const K0 = 50257, L0 = Math.log(K0), L1 = 2.85, K1 = Math.exp(L1);
    const pt = (K, Lv, fill) => {
      el("line", { x1: X(K), y1: Y(Lv), x2: X(K), y2: yb, class: "s-edge dash" }, s);
      el("line", { x1: x0, y1: Y(Lv), x2: X(K), y2: Y(Lv), class: "s-edge dash" }, s);
      el("circle", { cx: X(K), cy: Y(Lv), r: 7, style: `fill:${fill}` }, s);
    };
    pt(K0, L0, "var(--blue)");
    pt(K1, L1, "var(--orange)");
    // the training arrow, just below the line
    const a = [X(K0), Y(L0)], b = [X(K1), Y(L1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy);
    const nx = (-dy / n) * -18, ny = (dx / n) * -18;
    arrow(s, a[0] + nx + dx * 0.05, a[1] + ny + dy * 0.05, b[0] + nx - dx * 0.06, b[1] + ny - dy * 0.06, true).setAttribute("style", "stroke-width:3");
    const mxp = (a[0] + b[0]) / 2 + nx * 1.9, myp = (a[1] + b[1]) / 2 + ny * 1.9;
    const lt = tx(s, mxp, myp, "600,000 training iterations", 15, { anchor: "middle", weight: 700, fill: "var(--orange-2)" });
    lt.setAttribute("transform", `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI + 180} ${mxp} ${myp})`);
    tx(s, X(K0) - 14, Y(L0) - 22, "start: a random guess", 16, { anchor: "end", weight: 700 });
    tx(s, X(K0) - 14, Y(L0) - 3, "ln 50,257 = 10.8", 16, { anchor: "end" });
    tx(s, x0 + 10, Y(L1) - 44, "end: trained nanoGPT", 16, { weight: 700 });
    tx(s, x0 + 10, Y(L1) - 25, "2.85; e^2.85 ≈ 17", 16);
    tx(s, X(K0) - 5, yb - 7, "50,257", 14, { anchor: "end", weight: 700, fill: "var(--blue)" });
    tx(s, X(K1) + 5, yb - 7, "17", 14, { weight: 700, fill: "var(--orange-2)" });
    // the reader's own value
    const K = Math.exp(L);
    el("circle", { cx: X(Math.max(1, K)), cy: Y(L), r: 10, style: "fill:none;stroke:var(--deep);stroke-width:2.5" }, s);
    read.innerHTML = "";
    read.append(h("b", {}, `L = ${L.toFixed(2)}`), ` → e^L = ${fmtK(K)} tokens; p(true token) ≈ ${(1 / K).toPrecision(2)}`);
  }
  draw();
}

// ── tokenPipe: from web pages to the token windows step 1 reads ──────────────
// nanoGPT data/openwebtext/prepare.py and readme.md; train.py get_batch (lines 116–131).
export function tokenPipe(root) {
  const body = frame(root, "From OpenWebText to pieces of text for step 1",
    "nanoGPT tokenizes the text one time, before training. It stores each token number in 2 bytes. Step 1 reads random pieces of 1,024 tokens.",
    "nanoGPT (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>): <code>data/openwebtext/prepare.py</code> (GPT-2 BPE via tiktoken; uint16 because the largest id, 50,256, is below 2¹⁶), <code>readme.md</code> (8,013,769 documents; 9,035,582,198 training tokens; ~17GB), <code>train.py</code> 116–125 (<code>get_batch</code>). OpenWebText: <a data-ref=\"gokaslan2019\">Gokaslan & Cohen (2019)</a>, an open re-creation of WebText (<a data-ref=\"radford2019\">Radford et al., 2019</a>, §2.1). Sizes in bytes are computed here.");
  const W = 1150, H = 348;
  const s = svg(W, H, null, "OpenWebText is tokenized once into 2-byte token ids; get_batch reads windows of 1,024");
  body.appendChild(s);
  uid(s); arrowDefs(s);
  // the pipeline
  const BW = 248, BH = 128, gap = (W - 4 * BW) / 3;
  const boxes = [
    ["THE TEXT", "OpenWebText", ["8,013,769 documents,", "an open re-creation", "of GPT-2’s WebText"]],
    ["TOKENIZE, ONE TIME", "GPT-2 BPE", ["50,257 tokens,", "numbered 0 … 50,256"]],
    ["STORE", "train.bin", ["9,035,582,198 token", "numbers, 2 bytes each"]],
    ["STEP 1, EACH MICRO-BATCH", "get_batch('train')", ["12 random pieces of", "1,024 tokens each:", "one micro-batch"]],
  ];
  boxes.forEach(([tag, name, lines], i) => {
    const x = i * (BW + gap), on = i === 3;
    rect(s, x, 0, BW, BH, on ? "s-box on" : "s-box", 8);
    tx(s, x + 14, 24, tag, 13, { cls: "m", weight: 700 });
    tx(s, x + 14, 52, name, 21, { weight: 700, fill: "var(--deep)" });
    lines.forEach((l, k) => tx(s, x + 14, 76 + k * 21, l, 17));
    if (i < 3) arrow(s, x + BW + 4, BH / 2, x + BW + gap - 4, BH / 2, true);
  });
  // why 2 bytes: the ids fit below 2^16
  const py = 160, px0 = 0, pw = 520;
  tx(s, px0, py, "GPT-2’s token numbers and 2¹⁶", 17, { weight: 700, fill: "var(--deep)" });
  const lx0 = px0, lx1 = px0 + pw, ly = py + 42, sc = v => lx0 + (v / 65536) * (lx1 - lx0);
  rect(s, lx0, ly - 14, lx1 - lx0, 28, "s-box", 4);
  rect(s, lx0, ly - 14, sc(50257) - lx0, 28, "s-box", 4, { style: "fill:var(--blue);stroke:var(--blue)" });
  tx(s, lx0 + 10, ly + 6, "GPT-2’s token numbers: 0 … 50,256", 15, { weight: 700, fill: "var(--bg)" });
  tx(s, lx1 - 8, ly + 6, "not used", 14, { cls: "m", anchor: "end" });
  tx(s, lx0, ly + 36, "0", 14, { cls: "m" });
  tx(s, sc(50257), ly + 36, "50,257", 14, { cls: "m", anchor: "middle" });
  tx(s, lx1, ly + 36, "2¹⁶ = 65,536", 14, { cls: "m", anchor: "end" });
  // stored size, computed: 9,035,582,198 tokens × bytes per id
  const T = 9035582198, bars = [["2 bytes each", 2], ["8 bytes each", 8]], by0 = ly + 66, bmax = 8 * T;
  bars.forEach(([lab, b], k) => {
    const y = by0 + k * 34, w = (b * T / bmax) * (pw - 150);
    tx(s, px0, y + 17, lab, 15, { cls: "m" });
    rect(s, px0 + 120, y, w, 24, "s-box", 3, { style: `fill:${b === 2 ? "var(--orange)" : "var(--panel-2)"};stroke:none` });
    tx(s, px0 + 128 + w, y + 18, `${(b * T / 1e9).toFixed(1)} GB`, 15, { weight: 700 });
  });
  // get_batch: X is a window, Y the same window shifted by one
  const gx = 610, gy = 160, cw = 60, toks = ["The", " quick", " brown", " fox", " jumps", " over", " the", " lazy"];
  tx(s, gx, gy, "One piece of text: the targets are the inputs, moved by one", 17, { weight: 700, fill: "var(--deep)" });
  const row = (y, lab, from, cls, on) => {
    tx(s, gx, y + 21, lab, 16, { weight: 700, fill: cls });
    toks.slice(from, from + 7).forEach((t, k) => {
      const x = gx + 34 + k * (cw + 4);
      rect(s, x, y, cw, 30, on ? "s-box on" : "s-box", 4);
      tx(s, x + cw / 2, y + 20, t.trim(), 15, { anchor: "middle" });
    });
  };
  row(gy + 22, "X", 0, "var(--blue)", false);
  row(gy + 82, "Y", 1, "var(--orange-2)", true);
  for (let k = 0; k < 7; k++) {
    const x = gx + 34 + k * (cw + 4) + cw / 2;
    arrow(s, x, gy + 55, x, gy + 79);
  }
  tx(s, gx, gy + 138, "X = data[i : i+1024],  Y = data[i+1 : i+1+1024]", 15, { cls: "m" });
  tx(s, gx, gy + 159, "Y is X moved by one: the target for each token is the next token", 15, { cls: "m" });
  tx(s, gx, gy + 179, "This example shows 7 words. A real piece has 1,024 token numbers.", 14, { cls: "m" });
}

// ── accumBatch: 40 micro-batches, averaged, give the gradient of one large batch ────────────
// nanoGPT: batch_size = 12 sequences of block_size = 1,024 tokens per micro-batch;
// gradient_accumulation_steps = 5 * 8 = 40 micro-batches per step (train.py 48–50). How the 8 GPUs
// share them is step 4's slide; here they are one strip, added one after another.
// The arrows are 2-D stand-ins for gradients, drawn here from a seeded random generator:
// each sequence's gradient = the true gradient + noise; a micro-batch's gradient is the mean of 12.
// The figure opens at 0 of 40, so the question "how far off is the mean of 40?" is asked first.
export function accumBatch(root) {
  const body = frame(root, "Gradient accumulation: 40 micro-batches make one batch of 491,520 tokens",
    "Each cell is one micro-batch of 12 sequences × 1,024 tokens. Press Play to add them one at a time. Their mean gradient moves near the true gradient.",
    "Batch settings from nanoGPT's <code>train.py</code> 48–50 (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). The batch gradient is an average whose variance falls as 1/(batch size) (<a data-ref=\"mccandlish2018\">McCandlish et al., 2018</a>, eq. 2.2), so its spread falls as 1/√(batch size). The arrows are 2-D stand-ins drawn here from a seeded random generator, not nanoGPT's gradients; the angles are computed from them.");
  const N = 40, SEQ = 12, SIG = 1.6;
  const r = rng(2080), TH = (32 * Math.PI) / 180, G = [Math.cos(TH), Math.sin(TH)];
  const seqs = Array.from({ length: N }, () => Array.from({ length: SEQ }, () => [G[0] + SIG * gauss(r), G[1] + SIG * gauss(r)]));
  const mean = arr => [arr.reduce((a, v) => a + v[0], 0) / arr.length, arr.reduce((a, v) => a + v[1], 0) / arr.length];
  const micro = seqs.map(mean);                                 // one gradient per micro-batch
  const whole = mean(seqs.flat());                              // all 480 sequences at once
  const ang = v => Math.abs(((Math.atan2(v[1], v[0]) - TH + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI;
  const oneAng = micro.reduce((a, v) => a + ang(v), 0) / N;   // one micro-batch, on average
  const expect = oneAng / Math.sqrt(N);                          // spread falls as 1/√B

  const W = 640, H = 300;
  const s = svg(W, H, null, "a strip of 40 micro-batches, and the running mean of their gradients");
  const bPlay = h("button", { class: "primary" }, "Play");
  const bReset = h("button", {}, "Reset");
  let k = 0, timer = null;
  const sl = slider("Added", 0, N, 1, k, v => { stop(); k = v; draw(); });
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bPlay, bReset, sl), s, read);
  const setK = v => { k = v; sl.input.value = v; sl.querySelector("output").textContent = v; draw(); };
  function stop() { if (timer) cancelAnimationFrame(timer); timer = null; bPlay.textContent = "Play"; }
  bPlay.addEventListener("click", () => {
    if (timer) { stop(); return; }
    if (k >= N) setK(0);
    bPlay.textContent = "Pause";
    let last = performance.now();
    const tick = t => {
      if (t - last > 120) { last = t; setK(k + 1); }
      if (k >= N) { stop(); return; }
      timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
  });
  bReset.addEventListener("click", () => { stop(); setK(0); });

  const cw = 14, gap = 2, sy = 24, sh = 26;
  const cx = 200, cy = 186, SC = 76, AX = 100;
  function draw() {
    s.innerHTML = "";
    uid(s); arrowDefs(s);
    // the strip: 40 micro-batches, one after another
    tx(s, 0, 15, "40 micro-batches (12 × 1,024 tokens each), added one at a time", 14.5, { cls: "m", weight: 600 });
    for (let i = 0; i < N; i++) rect(s, i * (cw + gap), sy, cw, sh, i < k ? "s-box on" : "s-box", 3);
    [1, 10, 20, 30, 40].forEach(v => tx(s, (v - 1) * (cw + gap) + cw / 2, sy + sh + 16, String(v), 13, { cls: "m", anchor: "middle" }));
    tx(s, W, sy + sh + 34, "how the 8 GPUs share them: step 4", 14, { cls: "m", anchor: "end" });
    // the compass: every added micro-batch gradient, their running mean, and the true gradient
    el("line", { x1: cx - AX, y1: cy, x2: cx + AX, y2: cy, class: "s-axis" }, s);
    el("line", { x1: cx, y1: cy - AX, x2: cx, y2: cy + AX, class: "s-axis" }, s);
    const tip = v => [cx + v[0] * SC, cy - v[1] * SC];
    micro.slice(0, k).forEach(v => {
      const t = tip(v);
      el("line", { x1: cx, y1: cy, x2: t[0], y2: t[1], class: "s-edge", style: "stroke-width:1;opacity:.5" }, s);
      el("circle", { cx: t[0], cy: t[1], r: 2.6, style: "fill:var(--muted);opacity:.75" }, s);
    });
    const run = k ? mean(micro.slice(0, k)) : null;
    if (run) { const tm = tip(run); arrow(s, cx, cy, tm[0], tm[1], true).setAttribute("style", "stroke-width:4"); }
    const tg = tip([G[0] * 1.3, G[1] * 1.3]);
    el("line", { x1: cx, y1: cy, x2: tg[0], y2: tg[1], "stroke-dasharray": "6 4", style: "stroke:var(--blue);stroke-width:2.2;fill:none" }, s);
    if (k === N) el("circle", { cx: tip(whole)[0], cy: tip(whole)[1], r: 11, style: "fill:none;stroke:var(--deep);stroke-width:2" }, s);
    // legend
    const lx = 350, ly = 116;
    el("line", { x1: lx, y1: ly - 5, x2: lx + 26, y2: ly - 5, "stroke-dasharray": "6 4", style: "stroke:var(--blue);stroke-width:2.6" }, s);
    tx(s, lx + 34, ly, "true gradient (all the data)", 15, {});
    el("line", { x1: lx, y1: ly + 23, x2: lx + 26, y2: ly + 23, class: "s-edge", style: "stroke-width:1" }, s);
    tx(s, lx + 34, ly + 28, "gradient of one micro-batch", 15, { cls: "m" });
    el("line", { x1: lx, y1: ly + 51, x2: lx + 26, y2: ly + 51, style: "stroke:var(--orange);stroke-width:4" }, s);
    tx(s, lx + 34, ly + 56, `mean of ${k} micro-batch${k === 1 ? "" : "es"}`, 15, { weight: 700, fill: "var(--orange-2)" });
    if (k === N) {
      el("circle", { cx: lx + 13, cy: ly + 79, r: 8, style: "fill:none;stroke:var(--deep);stroke-width:2" }, s);
      tx(s, lx + 34, ly + 84, "all 480 sequences together:", 15, {});
      tx(s, lx + 34, ly + 103, "the same gradient", 15, {});
    }
    // readout: the angle off the true gradient, computed from the drawn arrows
    read.innerHTML = "";
    if (!k) read.append(h("b", {}, "0 of 40."), ` One micro-batch alone is ${oneAng.toFixed(0)}° from the true gradient, on average.`);
    else read.append(h("b", {}, `${k} of 40:`), ` the mean is ${ang(run).toFixed(1)}° from the true gradient` +
      (k === N ? ` (expected: ${oneAng.toFixed(0)}°/√40 ≈ ${expect.toFixed(0)}°).` : `. One micro-batch: ${oneAng.toFixed(0)}°.`));
  }
  draw();
}
