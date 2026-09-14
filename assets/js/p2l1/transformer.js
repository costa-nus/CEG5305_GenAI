// Part A (Transformer) and Part B — the architecture and its six components.
import { el, h, svg, arrowDefs, uid, arrow, box, text, rng, gauss, randMat, matmul, transpose, mapMat,
  matvec, add, norm, softmax, divColor, seqColor, fmt, slider, matTable, frame } from "../lib.js";

const typeset = node => { if (window.renderMathInElement) window.renderMathInElement(node, { delimiters: [{ left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }], throwOnError: false }); };

// ── the whole architecture, clickable ────────────────────────────────────────
const INFO = {
  c1: { t: "C1 · Token and position embeddings", f: "\\[ x = E[\\text{idx}] + P[0,\\dots,T-1] \\]",
    p: "A lookup table \\(E\\) of size \\(V\\times d\\) turns each token id into a vector. A second table \\(P\\) (\\(T\\times d\\)) adds one vector per position. GPT-2 and nanoGPT learn \\(P\\); the 2017 paper used fixed sinusoids. Attention itself has no notion of order, so this is where position enters.", a: "#c1" },
  c2: { t: "C2 · Causal self-attention", f: "\\[ \\mathrm{Attn}(Q,K,V) = \\mathrm{softmax}\\!\\Big(\\tfrac{QK^\\top}{\\sqrt{d_k}} + M\\Big)V \\]",
    p: "Every position emits a query, a key and a value. Scores between all pairs are softmaxed into weights, and each position takes a weighted sum of values. The mask \\(M\\) sets future positions to \\(-\\infty\\). Multi-head attention runs several of these in parallel on smaller subspaces. <b>This is the only place tokens exchange information.</b>", a: "#c2" },
  c3: { t: "C3 · MLP (feed-forward)", f: "\\[ \\mathrm{MLP}(x) = W_2\\,\\mathrm{GELU}(W_1 x),\\quad W_1\\in\\mathbb{R}^{4d\\times d} \\]",
    p: "Applied to each position separately, with no mixing across positions. The hidden layer is four times wider than \\(d\\), so it holds about two thirds of each block's parameters.", a: "#c3" },
  c4: { t: "C4 · Residual connections", f: "\\[ x \\leftarrow x + \\mathrm{Sublayer}(x) \\]",
    p: "Each sub-layer adds to its input instead of replacing it. Unrolled over \\(N\\) blocks, \\(x_N = x_0 + \\sum_n \\mathrm{Sublayer}_n\\): an identity path runs from the embeddings to the output, so gradients reach the first layer without being multiplied down.", a: "#c4" },
  c5: { t: "C5 · LayerNorm", f: "\\[ \\mathrm{LN}(x) = \\gamma \\odot \\frac{x-\\mu}{\\sqrt{\\sigma^2+\\epsilon}} + \\beta \\]",
    p: "Rescales each vector to zero mean and unit variance, then applies learned \\(\\gamma,\\beta\\). The 2017 Transformer normalises <em>after</em> adding the residual (\"Add &amp; Norm\", post-LN). GPT-2 and nanoGPT normalise <em>before</em> each sub-layer (pre-LN), which keeps the residual path clean.", a: "#c5" },
  c6: { t: "C6 · Output head and softmax", f: "\\[ p(x_{t+1}\\mid x_{\\le t}) = \\mathrm{softmax}\\big(\\mathrm{LN}(x_t)\\,E^\\top\\big) \\]",
    p: "A linear layer maps each final vector to one logit per vocabulary entry. nanoGPT reuses the embedding matrix \\(E\\) for this (weight tying), saving \\(V\\times d\\) parameters. Training maximises the probability of the true next token at every position.", a: "#c6" },
  cross: { t: "Cross-attention (encoder–decoder only)", f: "\\[ Q = \\text{decoder},\\quad K, V = \\text{encoder output} \\]",
    p: "In the original translation model the decoder also attends to the encoder's output. GPT-style models have no encoder and no cross-attention: one stack, causal self-attention only.", a: "#c2" },
};

export function architecture(root) {
  const body = frame(root, "The Transformer, component by component",
    "Click any block. Run a forward pass to see the order information moves in. Switch between the GPT-style decoder and the original encoder–decoder.",
    "Redrawn in HTML. Decoder-only layout follows nanoGPT's <code>model.py</code>; encoder–decoder follows Vaswani et al., NeurIPS 2017, Fig. 1.");
  let mode = "gpt", N = 12, sel = "c2", timer = null;
  const bGpt = h("button", { "aria-pressed": "true" }, "GPT / nanoGPT (decoder-only)");
  const bEd = h("button", { "aria-pressed": "false" }, "Original encoder–decoder (2017)");
  const bRun = h("button", { class: "primary" }, "Run a forward pass");
  const s = svg(480, 720, null, "transformer architecture");
  uid(s);
  const info = h("div", { class: "card", style: "position:sticky;top:4.5rem" });
  body.append(h("div", { class: "controls" }, bGpt, bEd, bRun,
    slider("Layers N", 1, 12, 1, N, v => { N = v; draw(); })),
    h("div", { class: "two" }, h("div", {}, s), h("div", {}, info)));

  const setMode = m => { mode = m; bGpt.setAttribute("aria-pressed", m === "gpt"); bEd.setAttribute("aria-pressed", m === "ed"); draw(); };
  bGpt.addEventListener("click", () => setMode("gpt"));
  bEd.addEventListener("click", () => setMode("ed"));
  bRun.addEventListener("click", () => {
    if (timer) clearInterval(timer);
    const steps = [...s.querySelectorAll("[data-step]")].map(g => +g.dataset.step);
    const max = Math.max(...steps);
    let k = 0;
    timer = setInterval(() => {
      s.querySelectorAll("[data-step]").forEach(g => g.classList.toggle("flow", +g.dataset.step === k));
      s.querySelectorAll("[data-step] rect, [data-step] circle").forEach(r => r.classList.toggle("on", +r.closest("[data-step]").dataset.step === k));
      if (++k > max + 1) { clearInterval(timer); timer = null; draw(); }
    }, 420);
  });

  function comp(x, y, w, hh, label, id, step, cls = "") {
    const g = el("g", { "data-step": step, "data-id": id, tabindex: 0, role: "button", "aria-label": label }, s);
    el("rect", { x, y, width: w, height: hh, rx: 7, class: `s-box clickable ${id === sel ? "on" : ""} ${cls}` }, g);
    const lines = label.split("\n");
    lines.forEach((ln, i) => el("text", { x: x + w / 2, y: y + hh / 2 + 4.5 + (i - (lines.length - 1) / 2) * 15, "text-anchor": "middle", class: "s-text b", text: ln }, g));
    const pick = () => { sel = id; draw(); };
    g.addEventListener("click", pick);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    return g;
  }
  function plus(x, y, step, id = "c4") {
    const g = el("g", { "data-step": step, "data-id": id, tabindex: 0, role: "button", "aria-label": "residual add" }, s);
    el("circle", { cx: x, cy: y, r: 11, class: `s-box clickable ${sel === id ? "on" : ""}` }, g);
    el("text", { x, y: y + 5, "text-anchor": "middle", class: "s-text b", text: "+" }, g);
    g.addEventListener("click", () => { sel = id; draw(); });
    return g;
  }
  function stackShadow(x, y, w, hh) {
    const k = Math.min(4, N - 1);
    for (let i = k; i >= 1; i--) el("rect", { x: x + i * 5, y: y - i * 5, width: w, height: hh, rx: 14, class: "s-box", opacity: 0.55 }, s);
  }

  function drawGpt() {
    const cx = 240, bw = 210, bx = cx - bw / 2;
    // output distribution
    const r = rng(5), words = ["mat", "sofa", "floor", "roof", "…"], p = [0.46, 0.21, 0.17, 0.09, 0.07];
    const og = el("g", { "data-step": 12 }, s);
    el("line", { x1: 126, y1: 58, x2: 360, y2: 58, class: "s-axis" }, og);
    words.forEach((w, i) => {
      const x = 130 + i * 46;
      el("rect", { x: x + 3, y: 58 - 50 * p[i], width: 26, height: 50 * p[i], rx: 2, class: `s-bar ${i === 0 ? "on" : ""}` }, og);
      el("text", { x: x + 16, y: 72, "text-anchor": "middle", class: "s-text m", text: w }, og);
    });
    text(s, 110, 50, "p(next)", "m", "end");
    comp(bx, 90, bw, 32, "Softmax", "c6", 11);
    comp(bx, 140, bw, 32, "Linear head (tied to E)", "c6", 10);
    comp(bx, 190, bw, 32, "LayerNorm", "c5", 9);
    arrow(s, cx, 88, cx, 76); arrow(s, cx, 138, cx, 124); arrow(s, cx, 188, cx, 174);
    // block
    const by = 246, bh = 322;
    stackShadow(80, by, 320, bh);
    el("rect", { x: 80, y: by, width: 320, height: bh, rx: 14, class: "s-box" }, s);
    text(s, 410, by + 16, `× ${N}`, "o", "start");
    text(s, 88, by + 16, "Transformer block", "m", "start");
    plus(cx, 274, 8);
    arrow(s, cx, 262, cx, 224);
    comp(bx, 300, bw, 40, "MLP  (d → 4d → d)", "c3", 7);
    arrow(s, cx, 298, cx, 287);
    comp(bx, 356, bw, 28, "LayerNorm", "c5", 6);
    arrow(s, cx, 354, cx, 342);
    plus(cx, 420, 5);
    arrow(s, cx, 408, cx, 386);
    comp(bx, 446, bw, 46, "Causal self-attention\n(multi-head)", "c2", 4);
    arrow(s, cx, 444, cx, 433);
    comp(bx, 508, bw, 28, "LayerNorm", "c5", 3);
    arrow(s, cx, 506, cx, 494);
    // residual highways
    const res = sel === "c4";
    el("path", { d: `M${cx},548 L372,548 L372,420 L${cx + 13},420`, class: `s-edge ${res ? "on" : ""}` }, s);
    el("path", { d: `M${cx},398 L372,398 L372,274 L${cx + 13},274`, class: `s-edge ${res ? "on" : ""}` }, s);
    text(s, 380, 490, "residual", "m", "start");
    // embeddings
    plus(cx, 598, 2, "c1");
    arrow(s, cx, 586, cx, 538);
    comp(60, 624, 160, 38, "Token emb. E\n(V × d)", "c1", 1);
    comp(260, 624, 160, 38, "Position emb. P\n(T × d)", "c1", 1);
    arrow(s, 140, 622, cx - 10, 606); arrow(s, 340, 622, cx + 10, 606);
    // weight tying
    el("path", { d: `M${bx},156 C30,156 30,643 58,643`, class: `s-edge dash ${sel === "c6" || sel === "c1" ? "on" : ""}` }, s);
    text(s, 36, 400, "same matrix", "m", "middle").setAttribute("transform", "rotate(-90 36 400)");
    // tokens
    const tg = el("g", { "data-step": 0 }, s);
    ["The", "cat", "sat", "on", "the"].forEach((w, i) => {
      el("rect", { x: 90 + i * 62, y: 684, width: 54, height: 26, rx: 5, class: "s-box" }, tg);
      el("text", { x: 117 + i * 62, y: 701, "text-anchor": "middle", class: "s-text", text: w }, tg);
    });
    arrow(s, 140, 682, 140, 664);
  }

  function drawEd() {
    const ex = 125, dx = 355, w = 170;
    // encoder
    stackShadow(28, 364, 194, 206);
    el("rect", { x: 28, y: 364, width: 194, height: 206, rx: 14, class: "s-box" }, s);
    text(s, 30, 356, `N = ${N}`, "o", "start");
    comp(ex - w / 2, 520, w, 36, "Multi-head attention", "c2", 3);
    comp(ex - w / 2, 478, w, 26, "Add & Norm", "c5", 4);
    comp(ex - w / 2, 420, w, 36, "Feed forward", "c3", 5);
    comp(ex - w / 2, 378, w, 26, "Add & Norm", "c5", 6);
    arrow(s, ex, 518, ex, 506); arrow(s, ex, 476, ex, 458); arrow(s, ex, 418, ex, 406);
    el("path", { d: `M${ex},566 L40,566 L40,491 L${ex - w / 2},491`, class: `s-edge ${sel === "c4" ? "on" : ""}` }, s);
    el("path", { d: `M${ex},468 L40,468 L40,391 L${ex - w / 2},391`, class: `s-edge ${sel === "c4" ? "on" : ""}` }, s);
    plus(ex, 598, 2, "c1");
    arrow(s, ex, 586, ex, 558);
    comp(ex - w / 2, 626, w, 34, "Input embedding", "c1", 1);
    arrow(s, ex, 624, ex, 610);
    text(s, ex + 22, 602, "+ positional enc.", "m", "start");
    text(s, ex, 700, "inputs", "m");
    arrow(s, ex, 688, ex, 662);
    // decoder
    stackShadow(258, 240, 194, 330);
    el("rect", { x: 258, y: 240, width: 194, height: 330, rx: 14, class: "s-box" }, s);
    text(s, 450, 232, `N = ${N}`, "o", "end");
    comp(dx - w / 2, 520, w, 36, "Masked multi-head\nattention", "c2", 3);
    comp(dx - w / 2, 480, w, 26, "Add & Norm", "c5", 4);
    comp(dx - w / 2, 404, w, 40, "Cross-attention", "cross", 7);
    comp(dx - w / 2, 364, w, 26, "Add & Norm", "c5", 8);
    comp(dx - w / 2, 300, w, 36, "Feed forward", "c3", 9);
    comp(dx - w / 2, 256, w, 26, "Add & Norm", "c5", 10);
    arrow(s, dx, 518, dx, 508); arrow(s, dx, 478, dx, 446); arrow(s, dx, 402, dx, 392); arrow(s, dx, 362, dx, 338); arrow(s, dx, 298, dx, 284);
    const rr = sel === "c4";
    el("path", { d: `M${dx},566 L444,566 L444,493 L${dx + w / 2},493`, class: `s-edge ${rr ? "on" : ""}` }, s);
    el("path", { d: `M${dx},462 L444,462 L444,377 L${dx + w / 2},377`, class: `s-edge ${rr ? "on" : ""}` }, s);
    el("path", { d: `M${dx},352 L444,352 L444,269 L${dx + w / 2},269`, class: `s-edge ${rr ? "on" : ""}` }, s);
    // encoder output into cross-attention
    el("path", { d: `M${ex},376 L${ex},340 L240,340 L240,424 L${dx - w / 2 - 2},424`, class: `s-edge ${sel === "cross" ? "on" : ""}`, "marker-end": `url(#ah${s.dataset.uid})` }, s);
    plus(dx, 598, 2, "c1");
    arrow(s, dx, 586, dx, 558);
    comp(dx - w / 2, 626, w, 34, "Output embedding", "c1", 1);
    arrow(s, dx, 624, dx, 610);
    text(s, dx, 700, "outputs (shifted right)", "m");
    arrow(s, dx, 688, dx, 662);
    comp(dx - w / 2, 190, w, 30, "Linear", "c6", 11);
    comp(dx - w / 2, 140, w, 30, "Softmax", "c6", 12);
    arrow(s, dx, 254, dx, 222); arrow(s, dx, 188, dx, 172); arrow(s, dx, 138, dx, 110);
    text(s, dx, 100, "output probabilities", "m");
  }

  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    mode === "gpt" ? drawGpt() : drawEd();
    const d = INFO[sel];
    info.innerHTML = `<div class="tag">${mode === "gpt" ? "decoder-only" : "encoder–decoder"}</div><h4>${d.t}</h4><div>${d.f}</div><p>${d.p}</p>${sel !== "cross" ? `<p><a href="${d.a}">Go to the deep dive ↓</a></p>` : ""}`;
    typeset(info);
  }
  draw();
}

// ── one hop: a long-range dependency, and how attention reaches it ───────────
export function longRange(root) {
  const body = frame(root, "What the change buys: one hop, not many",
    "Pick a word. In an RNN its information about earlier words has passed through every step in between; attention reads them directly.",
    "Weights are hand-set to show the idea. For weights from a trained GPT-2, use Transformer Explainer below.");
  const words = ["The", "keys", "that", "the", "man", "left", "on", "the", "kitchen", "table", "are", "missing"];
  const W = { 10: { 1: 0.62, 0: 0.05, 4: 0.08, 9: 0.1, 10: 0.15 }, 11: { 10: 0.3, 1: 0.45, 11: 0.25 }, 5: { 4: 0.55, 1: 0.2, 5: 0.25 }, 9: { 8: 0.6, 7: 0.15, 9: 0.25 } };
  let q = 10;
  const s = svg(760, 250, null, "long range attention");
  uid(s);
  const read = h("div", { class: "readout" });
  const chips = h("div", { class: "chips" });
  words.forEach((w, i) => chips.appendChild(h("button", { class: "chip", onclick: () => { q = i; draw(); } }, w)));
  body.append(chips, s, read);
  function draw() {
    [...chips.children].forEach((c, i) => c.classList.toggle("ctx", i === q));
    s.innerHTML = ""; arrowDefs(s);
    const x = i => 18 + i * 61.5, y = 200;
    const wts = W[q] || { [q]: 0.5, [Math.max(0, q - 1)]: 0.5 };
    Object.entries(wts).forEach(([k, v]) => {
      k = +k; if (k === q) return;
      const mid = (x(k) + x(q)) / 2 + 20;
      const p = el("path", { d: `M${x(q) + 20},${y - 14} Q${mid},${y - 40 - Math.abs(q - k) * 14} ${x(k) + 20},${y - 14}`, class: "s-edge on" }, s);
      p.style.strokeWidth = 1 + 9 * v; p.style.opacity = 0.35 + 0.65 * v;
      text(s, x(k) + 28, y - 20, v.toFixed(2), "o");
    });
    words.forEach((w, i) => box(s, x(i), y - 12, 56, 28, w, i === q ? "on" : "", i === q ? "b" : i > q ? "m" : ""));
    const target = +Object.entries(wts).filter(([k]) => +k !== q).sort((a, b) => b[1] - a[1])[0][0];
    read.innerHTML = `Query: “${words[q]}”. Strongest link: “${words[target]}”, ${q - target} positions back.\n` +
      `RNN: that information passed through <b>${q - target}</b> state updates.   Attention: <b>1</b> hop.`;
  }
  draw();
}

// ── ConvNeXt: the ablation staircase ─────────────────────────────────────────
const STEPS = [
  ["", "ResNet-50, original recipe", 76.1],
  ["Training", "modern training recipe", 78.8],
  ["Macro design", "stage ratio (3,4,6,3) → (3,3,9,3)", 79.4],
  ["Macro design", "“patchify” stem, 4×4 stride 4", 79.5],
  ["ResNeXt-ify", "depthwise convolution", 78.3],
  ["ResNeXt-ify", "width 64 → 96", 80.5],
  ["Inverted bottleneck", "inverted bottleneck", 80.6],
  ["Large kernel", "move depthwise conv up", 79.9],
  ["Large kernel", "kernel size 3 → 7", 80.6],
  ["Micro design", "ReLU → GELU", 80.6],
  ["Micro design", "fewer activation functions", 81.3],
  ["Micro design", "fewer normalisation layers", 81.4],
  ["Micro design", "BatchNorm → LayerNorm", 81.5],
  ["Micro design", "separate downsampling layers", 82.0],
];
export function convnext(root) {
  const body = frame(root, "ConvNeXt: one change at a time, measured",
    "ImageNet-1K top-1 accuracy after each step, ResNet-50 → ConvNeXt-T. The dashed line is Swin-T, the Transformer being chased. The training recipe is 300 epochs instead of 90, AdamW, and heavier augmentation and regularisation.",
    "Numbers from Liu et al., <em>A ConvNet for the 2020s</em>, CVPR 2022, Fig. 2 and §2. The paper also tried kernel sizes 5, 9 and 11; only the chosen 7 is shown.");
  let shown = 1;
  const bNext = h("button", { class: "primary" }, "Next change");
  const bAll = h("button", {}, "Show all");
  const bReset = h("button", {}, "Reset");
  const s = svg(760, 520, null, "ConvNeXt modernisation staircase");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bNext, bAll, bReset), s, read);
  bNext.addEventListener("click", () => { shown = Math.min(STEPS.length, shown + 1); draw(); });
  bAll.addEventListener("click", () => { shown = STEPS.length; draw(); });
  bReset.addEventListener("click", () => { shown = 1; draw(); });
  function draw() {
    s.innerHTML = "";
    const lo = 75, hi = 83, x0 = 300, W = 400, y0 = 20, rh = 32;
    const X = v => x0 + (W * (v - lo)) / (hi - lo);
    for (let v = 76; v <= 82; v += 1) {
      el("line", { x1: X(v), y1: y0 - 6, x2: X(v), y2: y0 + STEPS.length * rh, class: "s-axis" }, s);
      text(s, X(v), y0 + STEPS.length * rh + 16, v + "%", "m");
    }
    const sw = el("line", { x1: X(81.3), y1: y0 - 10, x2: X(81.3), y2: y0 + STEPS.length * rh, class: "s-edge dash" }, s);
    sw.style.stroke = "var(--blue-2)"; sw.style.strokeWidth = 2;
    text(s, X(81.3), y0 + STEPS.length * rh + 34, "Swin-T 81.3", "b");
    STEPS.forEach(([g, name, v], i) => {
      const y = y0 + i * rh, vis = i < shown, last = i === shown - 1;
      if (g && (i === 0 || STEPS[i - 1][0] !== g)) text(s, 8, y + rh / 2 + 4, g, "m", "start");
      text(s, x0 - 10, y + rh / 2 + 4, name, vis ? (last ? "b" : "") : "m", "end").setAttribute("opacity", vis ? 1 : 0.35);
      if (!vis) return;
      el("rect", { x: X(lo), y: y + 5, width: X(v) - X(lo), height: rh - 10, rx: 3, class: `s-bar ${last ? "on" : v > 81.3 ? "hi" : ""}` }, s);
      const d = i ? v - STEPS[i - 1][2] : 0;
      text(s, X(v) + 6, y + rh / 2 + 4, `${v.toFixed(1)}${i ? `  (${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)})` : ""}`, d < 0 ? "m" : last ? "o" : "", "start");
    });
    const cur = STEPS[shown - 1];
    const recipe = STEPS[1][2] - STEPS[0][2];
    read.innerHTML = shown === 1 ? "Start: a plain ResNet-50 at 76.1%. Press “Next change”." :
      `After “${cur[1]}”: <b>${cur[2].toFixed(1)}%</b>` + (shown === STEPS.length ?
        `\nThe training recipe alone was worth +${recipe.toFixed(1)} — more than any single architectural change. The final ConvNet has no attention anywhere and beats Swin-T by ${(82.0 - 81.3).toFixed(1)}.` :
        cur[2] < STEPS[shown - 2][2] ? "\nA step can go down on its own and still be kept: it is setting up the next one." : "");
  }
  draw();
}

// ── C1: embeddings, and what position embeddings are for ─────────────────────
export function embeddings(root) {
  const body = frame(root, "C1 — token embedding + position embedding",
    "Two sentences with the same words in a different order. Turn position embeddings off and compare the vectors.",
    "Random 6-dimensional tables, computed in the browser. Colour: orange positive, blue negative.");
  const d = 6, A = ["dog", "bites", "man"], B = ["man", "bites", "dog"];
  const r = rng(77);
  const E = Object.fromEntries(["bites", "dog", "man"].map(w => [w, Array.from({ length: d }, () => gauss(r))]));
  const P = Array.from({ length: 3 }, () => Array.from({ length: d }, () => gauss(r) * 0.9));
  let usePE = true;
  const bPE = h("button", { "aria-pressed": "true" }, "Position embeddings: on");
  const out = h("div", { class: "mats" });
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bPE), out, read);
  bPE.addEventListener("click", () => { usePE = !usePE; bPE.setAttribute("aria-pressed", usePE); bPE.textContent = `Position embeddings: ${usePE ? "on" : "off"}`; draw(); });
  function draw() {
    const X = S => S.map((w, i) => (usePE ? add(E[w], P[i]) : E[w].slice()));
    const XA = X(A), XB = X(B);
    out.innerHTML = "";
    out.append(
      matTable(A.map(w => E[w]), { cap: "E[tokens]  “dog bites man”", rowLabels: A, digits: 1, scale: 3 }),
      (() => { const m = matTable(P, { cap: usePE ? "P[0..2]" : "P (off — not added)", rowLabels: ["pos 0", "pos 1", "pos 2"], digits: 1, scale: 3 }); if (!usePE) m.classList.add("off"); return m; })(),
      matTable(XA, { cap: "x  “dog bites man”", rowLabels: A, digits: 1, scale: 3 }),
      matTable(XB, { cap: "x  “man bites dog”", rowLabels: B, digits: 1, scale: 3 }));
    const key = v => v.map(x => x.toFixed(6)).join(",");
    const same = XA.map(key).sort().join("|") === XB.map(key).sort().join("|");
    read.innerHTML = usePE
      ? "With P, the vector for “dog” depends on where it stands: the two sentences give different sets of vectors."
      : `Without P, both sentences give <b>${same ? "the same set of vectors" : "different vectors"}</b>, only reordered.\n` +
        "Attention with no mask is permutation-equivariant, so it could not tell them apart. A causal mask breaks that symmetry — each position sees a different prefix — which is why removing P from a GPT hurts less than you might expect.";
  }
  draw();
}

// ── C2: scaled dot-product attention, every matrix ───────────────────────────
export function attention(root) {
  const body = frame(root, "C2 — causal self-attention, one matrix at a time",
    "Five tokens, d = 4. Step through the computation, pick a query token, switch heads, toggle the mask.",
    "Real arithmetic, random weights — so the patterns mean nothing linguistically. Trained heads do learn structure: see Transformer Explainer and bbycroft below.");
  const toks = ["the", "cat", "sat", "on", "mat"], d = 4;
  const r = rng(314);
  const X = toks.map((_, i) => Array.from({ length: d }, () => gauss(r) * 0.9 + (i === 0 ? 0 : 0)));
  const heads = [1, 2, 3].map(k => { const rr = rng(1000 + k); return { Q: randMat(rr, d, d, 0.9), K: randMat(rr, d, d, 0.9), V: randMat(rr, d, d, 0.7) }; });
  let stage = 6, head = 0, causal = true, qi = 3;
  const stages = ["1 · input X", "2 · Q, K, V", "3 · scores QKᵀ/√d", "4 · mask", "5 · softmax", "6 · output"];
  const stepBtns = stages.map((t, i) => h("button", { onclick: () => { stage = i + 1; draw(); } }, t));
  const headSel = h("select", { "aria-label": "head" }, ...[1, 2, 3].map(k => h("option", { value: k - 1 }, `head ${k}`)));
  const bMask = h("button", { "aria-pressed": "true" }, "Causal mask: on");
  const chips = h("div", { class: "chips" });
  toks.forEach((w, i) => chips.appendChild(h("button", { class: "chip", onclick: () => { qi = i; draw(); } }, w)));
  const arcs = svg(760, 120, null, "attention weights of the selected query");
  uid(arcs);
  const mats = h("div", { class: "mats" });
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("div", { class: "steps" }, ...stepBtns)),
    h("div", { class: "controls" }, h("label", {}, "Head", headSel), bMask, h("span", { class: "note" }, "Query token:"), chips),
    arcs, mats, read);
  headSel.addEventListener("change", () => { head = +headSel.value; draw(); });
  bMask.addEventListener("click", () => { causal = !causal; bMask.setAttribute("aria-pressed", causal); bMask.textContent = `Causal mask: ${causal ? "on" : "off"}`; draw(); });

  function draw() {
    stepBtns.forEach((b, i) => b.setAttribute("aria-pressed", i + 1 === stage));
    [...chips.children].forEach((c, i) => c.classList.toggle("ctx", i === qi));
    const { Q: WQ, K: WK, V: WV } = heads[head];
    const Q = matmul(X, transpose(WQ)), K = matmul(X, transpose(WK)), V = matmul(X, transpose(WV));
    const S = mapMat(matmul(Q, transpose(K)), v => v / Math.sqrt(d));
    const masked = (i, j) => causal && j > i;
    const Sm = mapMat(S, (v, i, j) => (masked(i, j) ? -Infinity : v));
    const A = Sm.map(softmax);
    const O = matmul(A, V);
    const st = (k, node) => { node.classList.add("stage"); if (stage >= k) node.classList.add("on"); if (stage === k) node.style.outline = "2px solid var(--orange)"; node.style.outlineOffset = "4px"; node.style.borderRadius = "6px"; return node; };
    mats.innerHTML = "";
    mats.append(
      st(1, matTable(X, { cap: "X  (5 × 4)", rowLabels: toks, highlightRow: qi })),
      st(2, matTable(Q, { cap: "Q = X W_Q", rowLabels: toks, highlightRow: qi })),
      st(2, matTable(K, { cap: "K = X W_K", rowLabels: toks })),
      st(2, matTable(V, { cap: "V = X W_V", rowLabels: toks })),
      st(3, matTable(S, { cap: "QKᵀ / √4", rowLabels: toks, colLabels: toks, highlightRow: qi })),
      st(4, matTable(S, { cap: causal ? "+ causal mask" : "no mask", rowLabels: toks, colLabels: toks, masked, highlightRow: qi })),
      st(5, matTable(A, { cap: "A = softmax(rows)", rowLabels: toks, colLabels: toks, masked, color: seqColor, scale: 1, highlightRow: qi })),
      st(6, matTable(O, { cap: "output = A V", rowLabels: toks, highlightRow: qi })));
    // arcs for the selected query row
    arcs.innerHTML = ""; arrowDefs(arcs);
    const x = i => 90 + i * 145, y = 96;
    toks.forEach((w, j) => {
      if (stage >= 5 && !masked(qi, j) && j !== qi) {
        const p = el("path", { d: `M${x(qi)},${y - 14} Q${(x(qi) + x(j)) / 2},${y - 40 - Math.abs(qi - j) * 12} ${x(j)},${y - 14}`, class: "s-edge on" }, arcs);
        p.style.strokeWidth = 1 + 10 * A[qi][j]; p.style.opacity = 0.3 + 0.7 * A[qi][j];
      }
      box(arcs, x(j) - 30, y - 12, 60, 26, w, j === qi ? "on" : masked(qi, j) ? "" : "", masked(qi, j) ? "m" : j === qi ? "b" : "");
      if (stage >= 5) text(arcs, x(j), y + 22, masked(qi, j) ? "masked" : A[qi][j].toFixed(2), masked(qi, j) ? "m" : "o");
    });
    const row = A[qi].map((a, j) => (masked(qi, j) ? null : `${a.toFixed(2)}·v(${toks[j]})`)).filter(Boolean).join(" + ");
    read.innerHTML = stage < 5
      ? `Stage ${stage}: ${["each row of X is one token's vector", "three linear maps give every token a query, a key and a value", "row i, column j: how well query i matches key j", causal ? "future positions (above the diagonal) are set to −∞" : "without the mask every token sees every other, including later ones"][stage - 1]}.`
      : `output(“${toks[qi]}”) = ${row}\nRows of A sum to 1. ${causal ? `“${toks[qi]}” can only read positions 0…${qi}.` : "Mask off: it also reads the future, which a language model must not do."}`;
  }
  draw();
}

// ── C3: the MLP and GELU ─────────────────────────────────────────────────────
export function mlpBlock(root) {
  const body = frame(root, "C3 — the MLP: widen, GELU, narrow",
    "The curve on the left is the activation. The bar on the right is where a block's parameters go.",
    "GELU(x) = x·Φ(x), Φ the standard normal CDF. Parameter counts include biases, as in nanoGPT.");
  let dm = 768;
  const plot = svg(360, 250, null, "GELU and ReLU");
  const bars = svg(360, 250, null, "parameter split of one block");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("d (n_embd)", 48, 1600, 16, dm, v => { dm = v; draw(); })),
    h("div", { class: "two" }, plot, bars), read);
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const gelu = x => x * 0.5 * (1 + erf(x / Math.SQRT2));
  function draw() {
    plot.innerHTML = "";
    const X = x => 30 + ((x + 3) / 6) * 310, Y = y => 210 - ((y + 0.5) / 3.5) * 190;
    el("line", { x1: X(-3), y1: Y(0), x2: X(3), y2: Y(0), class: "s-axis" }, plot);
    el("line", { x1: X(0), y1: Y(-0.5), x2: X(0), y2: Y(3), class: "s-axis" }, plot);
    const path = f => Array.from({ length: 121 }, (_, i) => { const x = -3 + i * 0.05; return `${i ? "L" : "M"}${X(x)},${Y(f(x))}`; }).join("");
    const pr = el("path", { d: path(x => Math.max(0, x)), class: "s-line" }, plot); pr.style.stroke = "var(--blue-2)"; pr.style.strokeDasharray = "6 4";
    const pg = el("path", { d: path(gelu), class: "s-line" }, plot); pg.style.stroke = "var(--orange)";
    text(plot, X(1.2), Y(2.4), "ReLU", "m", "start");
    text(plot, X(2.1), Y(1.55), "GELU", "o", "start");
    text(plot, X(-2.9), Y(-0.42), "GELU dips below 0; minimum near x ≈ −0.75", "m", "start");
    text(plot, 180, 244, "x from −3 to 3", "m");
    const attn = 4 * dm * dm + 4 * dm, mlpP = 8 * dm * dm + 5 * dm, ln = 4 * dm, tot = attn + mlpP + ln;
    bars.innerHTML = "";
    let y = 30;
    [["MLP", mlpP, "on"], ["Attention", attn, ""], ["LayerNorms", ln, ""]].forEach(([n, v, c]) => {
      text(bars, 10, y + 18, n, "b", "start");
      el("rect", { x: 110, y, width: 230, height: 26, rx: 4, class: "s-box" }, bars);
      el("rect", { x: 110, y, width: Math.max(2, 230 * v / tot), height: 26, rx: 4, class: `s-bar ${c}` }, bars);
      text(bars, 110, y + 44, `${v.toLocaleString()}  (${(100 * v / tot).toFixed(1)}%)`, "m", "start");
      y += 70;
    });
    read.innerHTML = `d = ${dm}: MLP ${dm} → ${4 * dm} → ${dm}.  One block = ${tot.toLocaleString()} parameters, of which the MLP is <b>${(100 * mlpP / tot).toFixed(1)}%</b>.`;
  }
  draw();
}

// ── C4: residuals as a gradient highway (random-matrix experiment) ───────────
export function residual(root) {
  const body = frame(root, "C4 — why the residual path matters at depth",
    "Push a vector back through L random layers, with and without x ← x + f(x). The y-axis is how much of its size survives.",
    "Each layer is a random 32×32 linear map with entries ~ N(0, σ²/32). This is a numerical experiment on random layers, computed now — not a trained model.");
  let sigma = 0.8, alpha = 0.5;
  const s = svg(760, 290, null, "signal norm versus depth");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" },
    slider("σ (layer gain)", 0.4, 1.6, 0.05, sigma, v => { sigma = v; draw(); }, v => v.toFixed(2)),
    slider("branch scale α", 0.1, 1, 0.05, alpha, v => { alpha = v; draw(); }, v => v.toFixed(2))), s, read);
  const D = 32, Lmax = 48;
  const r = rng(2015);
  const Ws = Array.from({ length: Lmax }, () => randMat(r, D, D, 1));
  const r9 = rng(9);
  const v0 = Array.from({ length: D }, () => gauss(r9));
  function draw() {
    let a = v0.slice(), b = v0.slice();
    const n0 = norm(v0), plain = [], resid = [];
    for (let l = 0; l < Lmax; l++) {
      const W = Ws[l].map(row => row.map(x => (x * sigma) / Math.sqrt(D)));
      a = matvec(W, a);
      b = add(b, matvec(W, b).map(x => x * alpha));
      plain.push(Math.log10(norm(a) / n0)); resid.push(Math.log10(norm(b) / n0));
    }
    s.innerHTML = "";
    const x0 = 60, y0 = 16, W = 660, Hh = 230, lo = -8, hi = 8;
    const X = l => x0 + (W * l) / (Lmax - 1), Y = e => y0 + Hh * (1 - (Math.max(lo, Math.min(hi, e)) - lo) / (hi - lo));
    for (let e = lo; e <= hi; e += 4) { el("line", { x1: x0, y1: Y(e), x2: x0 + W, y2: Y(e), class: "s-axis" }, s); text(s, x0 - 6, Y(e) + 4, e === 0 ? "1" : `1e${e}`, "m", "end"); }
    const line = (arr, col, dash) => { const p = el("path", { d: arr.map((e, l) => `${l ? "L" : "M"}${X(l)},${Y(e)}`).join(""), class: "s-line" }, s); p.style.stroke = col; if (dash) p.style.strokeDasharray = "6 4"; };
    line(plain, "var(--blue-2)", true); line(resid, "var(--orange)");
    text(s, X(Lmax - 1), Y(resid[Lmax - 1]) - 8, "with residual", "o", "end");
    text(s, X(Lmax - 1), Y(plain[Lmax - 1]) + 16, "no residual", "m", "end");
    text(s, x0 + W / 2, 284, "depth L = 1 … 48", "m");
    const f = e => (10 ** e < 1e-3 || 10 ** e > 1e3 ? (10 ** e).toExponential(1) : (10 ** e).toFixed(3));
    read.innerHTML = `After 48 layers:  no residual ×<b>${f(plain[Lmax - 1])}</b>   with residual ×<b>${f(resid[Lmax - 1])}</b>\n` +
      `Without the identity path the size is multiplied by roughly σ each layer, so it vanishes (σ < 1) or explodes (σ > 1). Gradients flowing backwards behave the same way.`;
  }
  draw();
}

// ── C5: LayerNorm, and pre-LN vs post-LN ─────────────────────────────────────
export function layerNorm(root) {
  const body = frame(root, "C5 — LayerNorm, and where to put it",
    "Scale and shift the input: the normalised output does not move. Below, the two placements.",
    "γ = 1, β = 0 so only the normalisation is shown. Post-LN is Vaswani et al. 2017; pre-LN is GPT-2 and nanoGPT.");
  const r8 = rng(8);
  const x = Array.from({ length: 8 }, () => gauss(r8));
  let scale = 1, shift = 0, pre = true;
  const s = svg(760, 190, null, "layernorm input and output");
  const read = h("div", { class: "readout" });
  const bPre = h("button", { "aria-pressed": "true" }, "Pre-LN (nanoGPT)");
  const bPost = h("button", { "aria-pressed": "false" }, "Post-LN (2017)");
  const d2 = svg(760, 170, null, "layernorm placement");
  uid(d2);
  body.append(h("div", { class: "controls" },
    slider("scale input ×", 0.1, 10, 0.1, scale, v => { scale = v; draw(); }, v => v.toFixed(1)),
    slider("shift input +", -5, 5, 0.1, shift, v => { shift = v; draw(); }, v => v.toFixed(1))), s, read,
    h("div", { class: "controls", style: "margin-top:1rem" }, bPre, bPost), d2);
  bPre.addEventListener("click", () => { pre = true; draw(); });
  bPost.addEventListener("click", () => { pre = false; draw(); });
  function draw() {
    const xin = x.map(v => v * scale + shift);
    const mu = xin.reduce((a, b) => a + b, 0) / 8, sd = Math.sqrt(xin.reduce((a, b) => a + (b - mu) ** 2, 0) / 8 + 1e-5);
    const y = xin.map(v => (v - mu) / sd);
    s.innerHTML = "";
    const panel = (ox, vals, title, lim) => {
      text(s, ox + 170, 16, title, "b");
      el("line", { x1: ox, y1: 100, x2: ox + 340, y2: 100, class: "s-axis" }, s);
      vals.forEach((v, i) => {
        const hgt = (70 * Math.max(-lim, Math.min(lim, v))) / lim;
        const rr = el("rect", { x: ox + 10 + i * 41, y: hgt >= 0 ? 100 - hgt : 100, width: 30, height: Math.abs(hgt), rx: 3 }, s);
        rr.style.fill = divColor(v / lim);
        text(s, ox + 25 + i * 41, 188, v.toFixed(1), "m");
      });
    };
    panel(20, xin, "input x", Math.max(2, ...xin.map(Math.abs)));
    panel(400, y, "LN(x)", 2.5);
    read.innerHTML = `input: mean ${mu.toFixed(2)}, std ${sd.toFixed(2)}     output: mean 0.00, std 1.00`;
    bPre.setAttribute("aria-pressed", pre); bPost.setAttribute("aria-pressed", !pre);
    d2.innerHTML = ""; arrowDefs(d2);
    const y0 = 100;
    text(d2, 40, y0 + 5, "x", "b");
    const seq = pre ? [["LayerNorm", 120], ["Sublayer", 300], ["+", 470], ["out", 640]] : [["Sublayer", 170], ["+", 360], ["LayerNorm", 500], ["out", 660]];
    seq.forEach(([n, cx], k) => {
      if (n === "+") { el("circle", { cx, cy: y0, r: 13, class: "s-box on" }, d2); text(d2, cx, y0 + 5, "+", "b"); }
      else if (n === "out") text(d2, cx, y0 + 5, "out", "b");
      else box(d2, cx - 60, y0 - 18, 120, 36, n, n === "LayerNorm" && !pre ? "on" : "", "b");
    });
    const xs = seq.map(([n, cx]) => [n, cx]);
    let prevX = 56;
    xs.forEach(([n, cx]) => { const left = n === "+" ? cx - 14 : n === "out" ? cx - 22 : cx - 62; arrow(d2, prevX, y0, left, y0); prevX = n === "+" ? cx + 14 : cx + 60; });
    const plusX = seq.find(([n]) => n === "+")[1];
    el("path", { d: `M60,${y0} L60,${y0 - 60} L${plusX},${y0 - 60} L${plusX},${y0 - 14}`, class: "s-edge on", "marker-end": `url(#ah-on${d2.dataset.uid})` }, d2);
    text(d2, (60 + plusX) / 2, y0 - 68, "residual path", "o");
    text(d2, 380, 160, pre ? "Pre-LN: the residual path carries x to the output untouched — nothing normalises it." : "Post-LN: the residual sum passes through LayerNorm every block, so the identity path is rescaled N times.", "m");
  }
  draw();
}

// ── C6: count the parameters, with and without weight tying ─────────────────
const PRESETS = {
  "bbycroft nano-gpt": { V: 3, T: 11, L: 3, d: 48 },
  "nanoGPT Shakespeare (char)": { V: 65, T: 256, L: 6, d: 384 },
  "GPT-2 small": { V: 50257, T: 1024, L: 12, d: 768 },
  "GPT-2 medium": { V: 50257, T: 1024, L: 24, d: 1024 },
  "GPT-2 XL": { V: 50257, T: 1024, L: 48, d: 1600 },
};
export function params(root) {
  const body = frame(root, "C6 — where the parameters are, and what weight tying saves",
    "Counts follow nanoGPT's model.py exactly: biases on, weights tied by default.",
    "Check: GPT-2 small gives 124,439,808 and bbycroft's nano-gpt gives 85,584, the number printed on its 3D view. nanoGPT's <code>get_num_params()</code> leaves out the position embedding by default, so it prints a slightly smaller figure. The number of heads does not change the count.");
  let cfg = { ...PRESETS["GPT-2 small"] }, tied = true;
  const sel = h("select", { "aria-label": "preset" }, ...Object.keys(PRESETS).map(k => h("option", { value: k, selected: k === "GPT-2 small" }, k)));
  const bTie = h("button", { "aria-pressed": "true" }, "Weight tying: on");
  const inputs = ["V", "T", "L", "d"].map(k => {
    const inp = h("input", { type: "number", min: 1, value: cfg[k], style: "width:6.5em;font:inherit;padding:.2rem .35rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
    inp.addEventListener("input", () => { cfg[k] = Math.max(1, +inp.value || 1); draw(); });
    return [k, inp];
  });
  const names = { V: "vocab V", T: "context T", L: "layers L", d: "width d" };
  const s = svg(760, 230, null, "parameter breakdown");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("label", {}, "Preset", sel), bTie),
    h("div", { class: "controls" }, ...inputs.map(([k, inp]) => h("label", {}, names[k], inp))), s, read);
  sel.addEventListener("change", () => { cfg = { ...PRESETS[sel.value] }; inputs.forEach(([k, inp]) => (inp.value = cfg[k])); draw(); });
  bTie.addEventListener("click", () => { tied = !tied; bTie.setAttribute("aria-pressed", tied); bTie.textContent = `Weight tying: ${tied ? "on" : "off"}`; draw(); });
  function draw() {
    const { V, T, L, d } = cfg;
    const parts = [
      ["token embedding  V·d", V * d],
      ["position embedding  T·d", T * d],
      ["attention  L·(4d²+4d)", L * (4 * d * d + 4 * d)],
      ["MLP  L·(8d²+5d)", L * (8 * d * d + 5 * d)],
      ["LayerNorms  L·4d + 2d", L * 4 * d + 2 * d],
      ["output head  V·d", tied ? 0 : V * d],
    ];
    const tot = parts.reduce((a, [, v]) => a + v, 0);
    s.innerHTML = "";
    parts.forEach(([n, v], i) => {
      const y = 8 + i * 36;
      text(s, 220, y + 19, n, i === 5 && tied ? "m" : "", "end");
      el("rect", { x: 232, y, width: 400, height: 26, rx: 4, class: "s-box" }, s);
      el("rect", { x: 232, y, width: Math.max(v ? 2 : 0, 400 * v / tot), height: 26, rx: 4, class: `s-bar ${i === 3 ? "on" : ""}` }, s);
      text(s, 640, y + 19, i === 5 && tied ? "0 (shares E)" : `${(100 * v / tot).toFixed(1)}%`, "m", "start");
    });
    const blocks = parts[2][1] + parts[3][1];
    read.innerHTML = `Total: <b>${tot.toLocaleString()}</b> parameters${tied ? `  (untied would add ${(V * d).toLocaleString()})` : ""}\n` +
      `Inside the blocks the MLP holds ${(100 * parts[3][1] / blocks).toFixed(1)}% and attention ${(100 * parts[2][1] / blocks).toFixed(1)}%.`;
  }
  draw();
}

// ── Board 3: cross-entropy and perplexity ────────────────────────────────────
export function perplexity(root) {
  const body = frame(root, "Board 3 — what the model is trained to do",
    "Set the probability the model gives to the correct next token at each position.",
    "Loss = mean negative log-likelihood per token. Perplexity = exp(loss): the number of equally likely choices the model is effectively picking between.");
  const toks = ["The", "cat", "sat", "on", "the", "mat"];
  let p = [0.05, 0.2, 0.3, 0.6, 0.7, 0.4];
  const sliders = h("div", { class: "controls" });
  const read = h("div", { class: "readout" });
  const presets = h("div", { class: "controls" },
    h("button", { onclick: () => { p = p.map(() => 1 / 65); build(); } }, "Uniform over 65 characters"),
    h("button", { onclick: () => { p = p.map(() => 1 / 50257); build(); } }, "Uniform over GPT-2's 50,257 tokens"),
    h("button", { onclick: () => { p = p.map(() => 0.99); build(); } }, "Almost always right"));
  body.append(presets, sliders, read);
  function build() {
    sliders.innerHTML = "";
    toks.slice(1).forEach((w, i) => sliders.appendChild(slider(`p(“${w}” | …)`, 0.00001, 1, 0.00001, p[i + 1], v => { p[i + 1] = v; calc(); }, v => (v < 0.01 ? v.toExponential(1) : v.toFixed(2)))));
    calc();
  }
  function calc() {
    const ps = p.slice(1), L = -ps.reduce((a, v) => a + Math.log(v), 0) / ps.length;
    read.innerHTML = `L = −(1/${ps.length}) Σ log p = <b>${L.toFixed(3)}</b> nats\nPPL = exp(L) = <b>${Math.exp(L) < 1e5 ? Math.exp(L).toFixed(1) : Math.exp(L).toExponential(2)}</b>\n` +
      "A uniform guess over V choices gives PPL = V. Lower is better; 1 means certain and correct.";
  }
  build();
}

// ── Part C: commit to a prediction before seeing results ────────────────────
export function predict(root) {
  const body = frame(root, "Predict before you look",
    "Rank the four removals from most damaging to least. Click them in order. Your ranking is kept in this browser only.",
    "Results are filled in after the live run in class. Nothing here reveals them.");
  const opts = ["LayerNorm", "Residual connections", "Positional embeddings", "Multi-head → one head"];
  const KEY = "ceg5305-p2l1-ranking";
  let order = [];
  try { order = JSON.parse(localStorage.getItem(KEY) || "[]").filter(o => opts.includes(o)); } catch { order = []; }
  const grid = h("div", { class: "grid", style: "grid-template-columns:repeat(auto-fit,minmax(160px,1fr))" });
  const read = h("div", { class: "readout" });
  const bReset = h("button", {}, "Clear my ranking");
  body.append(grid, h("div", { class: "controls", style: "margin-top:.8rem" }, bReset), read);
  bReset.addEventListener("click", () => { order = []; save(); draw(); });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(order)); } catch { /* storage unavailable */ } };
  function draw() {
    grid.innerHTML = "";
    opts.forEach(o => {
      const k = order.indexOf(o);
      grid.appendChild(h("button", { class: `card ${k >= 0 ? "accent" : ""}`, style: "text-align:left", onclick: () => { if (k < 0 && order.length < 4) { order.push(o); save(); draw(); } } },
        h("div", { class: "tag" }, k >= 0 ? `rank ${k + 1}` : "click to rank"), h("h4", {}, "Remove: " + o)));
    });
    read.textContent = order.length === 4 ? `Your prediction, worst first: ${order.join("  >  ")}` : `${order.length} of 4 ranked.`;
  }
  draw();
}
