// Part A (Transformer) and Part B — the architecture and its six components.
import { el, h, svg, arrowDefs, uid, arrow, box, text, rng, gauss, randMat, matmul, transpose, mapMat,
  matvec, add, norm, softmax, divColor, seqColor, fmt, slider, matTable, frame } from "../lib.js";

const typeset = node => { if (window.renderMathInElement) window.renderMathInElement(node, { delimiters: [{ left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }], throwOnError: false }); };

// ── the whole architecture, clickable ────────────────────────────────────────
const INFO = {
  c1: { t: "C1 · Token and position embeddings", f: "\\[ x = E[\\text{idx}] + P[0,\\dots,T-1] \\]",
    p: "A lookup table \\(E\\) of size \\(V\\times d\\) turns each token id into a vector. A second table \\(P\\) (\\(T\\times d\\)) adds one vector per position. GPT-2 and nanoGPT learn \\(P\\); the 2017 paper used fixed sinusoids. Attention itself has no notion of order, so this is where position enters.", a: "#c1" },
  c2: { t: "C2 · Causal self-attention", f: "\\[ \\mathrm{Attn}(Q,K,V) = \\mathrm{softmax}\\!\\Big(\\tfrac{QK^\\top}{\\sqrt{d_k}} + M\\Big)V \\]",
    p: "Every position emits a query, a key and a value. Scores between all pairs are softmaxed into weights, and each position takes a weighted sum of values. The mask \\(M\\) sets future positions to \\(-\\infty\\) <span class=\"ask\">(what weight do they get after the softmax?)</span>. Multi-head attention runs several of these in parallel on smaller subspaces. <b>This is the only place tokens exchange information.</b>", a: "#c2" },
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
    "Redrawn in HTML. Decoder-only layout follows nanoGPT's <code>model.py</code>; encoder–decoder follows <a data-ref=\"vaswani2017\">Vaswani et al. (2017)</a>, Fig. 1.");
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

// ── one hop: a long-range dependency, through an RNN chain and through attention ──
export function longRange(root) {
  const body = frame(root, "RNN vs attention: many updates, or one hop",
    "Click a word. Top: in an RNN, what an earlier word contributes has to survive every state update in between. Bottom: attention reads it directly.",
    "RNN decay is stylised: each update keeps a fraction g of what came before, as on the LSTM slide. Attention weights are hand-set. For weights from a trained GPT-2, use Transformer Explainer below.");
  const words = ["The", "keys", "that", "the", "man", "left", "on", "the", "kitchen", "table", "are", "missing"];
  const W = { 10: { 1: 0.62, 0: 0.05, 4: 0.08, 9: 0.1, 10: 0.15 }, 11: { 10: 0.3, 1: 0.45, 11: 0.25 }, 5: { 4: 0.55, 1: 0.2, 5: 0.25 }, 9: { 8: 0.6, 7: 0.15, 9: 0.25 } };
  let q = 10, g = 0.6;
  const s = svg(760, 330, null, "an RNN chain and attention reaching the same earlier word");
  uid(s);
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("RNN: fraction kept per update, g", 0.3, 0.95, 0.05, g, v => { g = v; draw(); }, v => v.toFixed(2))), s, read);
  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const x = i => 18 + i * 61.5, cx = i => x(i) + 28;
    const wts = W[q] || { [q]: 0.5, [Math.max(0, q - 1)]: 0.5 };
    const others = Object.entries(wts).filter(([k]) => +k !== q).sort((a, b) => b[1] - a[1]);
    const target = +others[0][0], hops = q - target;
    const word = (i, y) => {
      const b = box(s, x(i), y, 56, 26, words[i], i === q ? "on clickable" : i === target && q !== target ? "clickable" : "clickable", i === q || i === target ? "b" : i > q ? "m" : "");
      b.style.cursor = "pointer";
      b.addEventListener("click", () => { q = i; draw(); });
    };
    // RNN: word → state, state → state; what of each earlier word is left at q
    text(s, 18, 15, `RNN: “${words[target]}” reaches “${words[q]}” through ${hops} state update${hops === 1 ? "" : "s"}`, "b", "start");
    const yw = 24, yh = 84, yb = 152, bh = 40;
    words.forEach((_, i) => {
      word(i, yw);
      arrow(s, cx(i), yw + 28, cx(i), yh - 12, i === target && q !== target);
      if (i) arrow(s, cx(i - 1) + 11, yh, cx(i) - 13, yh, i > target && i <= q);
      el("circle", { cx: cx(i), cy: yh, r: 10, class: `s-box ${i === q ? "on" : ""}` }, s);
      if (i > q) return;
      const kept = g ** (q - i), hgt = Math.max(1.5, bh * kept);
      el("rect", { x: cx(i) - 9, y: yb - hgt, width: 18, height: hgt, rx: 2, class: `s-bar ${i === target ? "on" : ""}` }, s);
      if (i === target || i === q - 1) text(s, cx(i), yb - hgt - 5, kept < 0.01 ? kept.toExponential(0) : kept.toFixed(2), i === target ? "o" : "m");
    });
    el("line", { x1: 18, y1: yb, x2: 742, y2: yb, class: "s-axis" }, s);
    text(s, 742, yb + 15, `left of each word at “${words[q]}”: g^(distance)`, "m", "end");
    el("line", { x1: 0, y1: 178, x2: 760, y2: 178, class: "s-axis" }, s);
    // attention: arcs from q straight back
    text(s, 18, 200, `Attention: “${words[q]}” reads “${words[target]}” directly, in one hop`, "b", "start");
    const ya = 294;
    others.forEach(([k, v]) => {
      k = +k;
      const mid = (cx(k) + cx(q)) / 2;
      const p = el("path", { d: `M${cx(q)},${ya - 2} Q${mid},${ya - 30 - Math.abs(q - k) * 8} ${cx(k)},${ya - 2}`, class: "s-edge on" }, s);
      p.style.strokeWidth = 1 + 9 * v; p.style.opacity = 0.35 + 0.65 * v;
      if (k === target) text(s, (cx(k) + cx(q)) / 2, ya - 18 - Math.abs(q - k) * 4, v.toFixed(2), "o");
    });
    words.forEach((_, i) => word(i, ya));
    const near = g ** 1, far = g ** hops;
    read.innerHTML = `RNN: ${hops} update${hops === 1 ? "" : "s"}, ${g.toFixed(2)}^${hops} = <b>${far < 0.01 ? far.toExponential(1) : far.toFixed(3)}</b> of “${words[target]}” left` +
      (hops > 1 ? `; “${words[q - 1]}” keeps ${near.toFixed(2)}, ${(near / far).toFixed(0)}× more.` : ".") +
      `\nAttention: <b>1</b> hop, weight ${wts[target].toFixed(2)} on “${words[target]}”, however far back it is.`;
  }
  draw();
}

// ── self-attention as two matrix products, then the causal mask ─────────────
// Without a mask every token attends to every other, later ones included: attention has
// no built-in order. The button adds M (−∞ above the diagonal) before the softmax, so each
// token depends only on itself and earlier tokens, the causality an RNN gets from time.
export function attnMatrix(root) {
  const body = frame(root, "Self-attention in two matrix products, and the mask that makes it causal",
    "Each token's vector gives a query (what it looks for), a key (what it offers) and a value (what it passes on). Click a token to follow its row; switch the mask on and off.",
    "Shapes are real; the attention weights are hand-set to show the structure. Part B computes the same thing with real numbers.");
  const toks = ["The", "keys", "on", "the", "table", "are"], n = toks.length, d = 4;
  // hand-set weights; each row sums to 1. Unmasked rows spread over later tokens too.
  const A0 = [[0.30, 0.25, 0.05, 0.05, 0.15, 0.20], [0.05, 0.30, 0.05, 0.05, 0.20, 0.35], [0.05, 0.25, 0.20, 0.10, 0.35, 0.05],
    [0.05, 0.05, 0.15, 0.25, 0.45, 0.05], [0.05, 0.15, 0.25, 0.15, 0.30, 0.10], [0.05, 0.60, 0.05, 0.05, 0.15, 0.10]];
  const A1 = [[1], [0.3, 0.7], [0.1, 0.5, 0.4], [0.05, 0.15, 0.3, 0.5], [0.05, 0.1, 0.25, 0.3, 0.3], [0.05, 0.6, 0.05, 0.05, 0.15, 0.1]];
  let qi = 1, masked = false;
  const chips = h("div", { class: "chips" });
  toks.forEach((w, i) => chips.appendChild(h("button", { class: "chip", onclick: () => { qi = i; draw(); } }, w)));
  const bMask = h("button", { "aria-pressed": "false" }, "Add the causal mask M");
  bMask.addEventListener("click", () => { masked = !masked; bMask.setAttribute("aria-pressed", masked); bMask.textContent = masked ? "Remove the mask" : "Add the causal mask M"; draw(); });
  const s = svg(1085, 272, null, "self-attention as matrix products, with and without the causal mask");
  uid(s);
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("span", { class: "note" }, "Query token:"), chips, bMask), s, read);
  const c = 22, y0 = 76;
  // a rows × cols block of cells; fill(i, j) returns { cls, color, hide, label } or null
  function block(x, y, rows, cols, cap, fill, rowLab, colLab, meaning) {
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const f = fill(i, j) || {};
      const r = el("rect", { x: x + j * c, y: y + i * c, width: c - 3, height: c - 3, rx: 3, class: `s-box ${f.cls || ""}` }, s);
      if (f.color) r.style.fill = f.color;
      if (f.hide) r.style.opacity = 0.25;
      if (f.label) text(s, x + j * c + (c - 3) / 2, y + i * c + 14, f.label, "m").setAttribute("style", "font-size: 9.5px");
    }
    if (rowLab) toks.forEach((w, i) => text(s, x - 6, y + i * c + 15, w, i === qi ? "o" : "m", "end"));
    if (colLab) toks.forEach((w, j) => { const tx = x + j * c + 8, ty = y - 6; text(s, tx, ty, w, j > qi ? (masked ? "m" : "o") : "m", "start").setAttribute("transform", `rotate(-55 ${tx} ${ty})`); });
    text(s, x + (cols * c) / 2, y0 + n * c + 24, cap, "mono");
    if (meaning) text(s, x + (cols * c) / 2, y0 + n * c + 44, meaning, "mean");   // what the block is, in words
  }
  const sym = (x, t) => text(s, x, y0 + (n * c) / 2 + 6, t, "b");
  function draw() {
    [...chips.children].forEach((ch, i) => ch.classList.toggle("ctx", i === qi));
    s.innerHTML = ""; arrowDefs(s);
    const A = masked ? A1 : A0;
    const mine = i => (i === qi ? { cls: "on" } : null);
    const later = (i, j) => j > i;
    text(s, 20, 18, "1 · scores: every query against every key", "b", "start");
    block(60, y0, n, d, "Q  (n × d)", mine, true, false, "Query");
    sym(172, "×");
    block(192, y0 + c, d, n, "Kᵀ  (d × n)", () => null, false, true, "Key");
    sym(345, "=");
    block(415, y0, n, n, masked ? "QKᵀ/√d + M  (n × n)" : "QKᵀ/√d  (n × n)",
      (i, j) => (masked && later(i, j) ? { hide: true, label: "−∞" } : mine(i)), true, true, "Score");
    arrow(s, 552, y0 + (n * c) / 2, 606, y0 + (n * c) / 2, true);
    text(s, 579, y0 + (n * c) / 2 - 10, masked ? "+ M," : "", "o");
    text(s, 579, y0 + (n * c) / 2 + 22, "softmax", "m");
    text(s, 620, 18, "2 · weights, then a weighted sum of values", "b", "start");
    block(668, y0, n, n, "A  (n × n)", (i, j) => (masked && later(i, j) ? { hide: true, label: "0" }
      : { color: seqColor(A[i][j]), cls: i === qi ? "on" : "" }), true, true, "Attention");
    sym(815, "×");
    block(835, y0, n, d, "V  (n × d)", () => null, false, false, "Value");
    sym(945, "=");
    block(965, y0, n, d, "output  (n × d)", mine, false, false, "Output");
    const row = A[qi], terms = row.map((a, j) => `${a.toFixed(2)}·v(${toks[j]})`).join(" + ");
    const fut = row.map((a, j) => [a, j]).filter(([a, j]) => j > qi && a > 0);
    read.innerHTML = `output(“${toks[qi]}”) = ${terms}\n` + (masked
      ? `M adds −∞ above the diagonal <span class="ask">(what weight does −∞ get after the softmax?)</span>: “${toks[qi]}” now depends only on itself and earlier tokens, as in an RNN, still in two matrix products.`
      : fut.length
        ? `No mask: “${toks[qi]}” also draws on later words, ${fut.sort((p, q) => q[0] - p[0]).slice(0, 2).map(([a, j]) => `“${toks[j]}” ${a.toFixed(2)}`).join(", ")}. Attention has no order of its own; an RNN never sees a later word.`
        : `No mask, but “${toks[qi]}” is the last token, so there is nothing later to see. Click “keys”.`);
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
    "Numbers from <a data-ref=\"liu2022\">Liu et al. (2022)</a>, <em>A ConvNet for the 2020s</em>, Fig. 2 and §2. The paper also tried kernel sizes 5, 9 and 11; only the chosen 7 is shown.");
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
    text(s, X(81.3), y0 + STEPS.length * rh + 34, "Transformer (Swin-T), 81.3", "b");
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

// ── why control: one comparison cannot tell mechanisms apart ────────────────
const CFACT = ["recipe", "LayerNorm", "attention"];
const TRUTHS = [
  ["only attention matters", [0, 0, 1], "the recipe and LayerNorm steps are flat; all of the gain arrives with attention"],
  ["only the recipe matters", [1, 0, 0], "all of the gain arrives with the training recipe; adding attention changes nothing"],
  ["a bit of each", [0.5, 0.2, 0.3], "each change adds its own part, and you can see how big each part is"],
];
export function controlled(root) {
  const body = frame(root, "Why control: one comparison, three different explanations",
    "Model B differs from model A in three ways and scores higher. Pick what is really going on, then compare what each experiment can see.",
    "Schematic: the effect sizes are made up. The measured ones are on the next slide.");
  let t = 0;
  const btns = TRUTHS.map(([name], i) => h("button", { onclick: () => { t = i; draw(); } }, name));
  const s = svg(760, 300, null, "an uncontrolled comparison next to a controlled one");
  uid(s);
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("span", { class: "note" }, "The implied truth is:"), ...btns), s, read);
  function draw() {
    btns.forEach((b, i) => b.setAttribute("aria-pressed", i === t));
    s.innerHTML = ""; arrowDefs(s);
    const eff = TRUTHS[t][1], yb = 240, base = 70, gain = 120, bw = 54;
    const bar = (x, lo, hi, cls) => el("rect", { x, y: yb - hi, width: bw, height: Math.max(0, hi - lo), rx: 2, class: `s-bar ${cls}` }, s);
    el("line", { x1: 10, y1: yb, x2: 750, y2: yb, class: "s-axis" }, s);
    // uncontrolled
    text(s, 10, 20, "Uncontrolled: A versus B", "b", "start");
    text(s, 10, 40, "three changes at once, one measurement", "m", "start");
    bar(40, 0, base, ""); text(s, 40 + bw / 2, yb + 20, "A", "b");
    bar(220, 0, base, ""); bar(220, base, base + gain, "on"); text(s, 220 + bw / 2, yb + 20, "B", "b");
    text(s, 220 + bw / 2, yb - base - gain / 2 + 8, "?", "b");
    CFACT.forEach((f, i) => text(s, 157, 108 + i * 20, `+ ${f}`, "m"));
    arrow(s, 104, 180, 212, 180);
    text(s, 145, yb + 44, "the same picture, whatever the truth", "o");
    el("line", { x1: 330, y1: 12, x2: 330, y2: yb + 50, class: "s-axis" }, s);
    // controlled
    text(s, 350, 20, "Controlled: one change at a time", "b", "start");
    text(s, 350, 40, "three measurements", "m", "start");
    let lvl = base;
    const xs = [360, 460, 560, 660];
    bar(xs[0], 0, base, ""); text(s, xs[0] + bw / 2, yb + 20, "A", "b");
    eff.forEach((e, i) => {
      const x = xs[i + 1], nxt = lvl + gain * e;
      el("line", { x1: xs[i] + bw, y1: yb - lvl, x2: x, y2: yb - lvl, class: "s-edge dash" }, s);
      bar(x, 0, lvl, "");
      if (e > 0) bar(x, lvl, nxt, "on");
      else text(s, x + bw / 2, yb - lvl - 8, "flat", "m");
      text(s, x + bw / 2, yb + 20, `+ ${CFACT[i]}`, e > 0 ? "o" : "m");
      lvl = nxt;
    });
    text(s, 555, yb + 44, "a different staircase for each truth", "o");
    read.innerHTML = `Controlled: ${TRUTHS[t][2]}.`;
  }
  draw();
}

// ── C1: embeddings, and what position embeddings are for ─────────────────────
export function embeddings(root) {
  const body = frame(root, "C1 — token embedding + position embedding",
    "Two sentences with the same words in a different order. Follow “dog”: turn position embeddings off and compare its two vectors.",
    "Random 6-dimensional tables, computed in the browser. Colour: orange positive, blue negative.");
  const d = 6, A = ["dog", "bites", "man"], B = ["man", "bites", "dog"];
  const r = rng(77);
  const E = Object.fromEntries(["bites", "dog", "man"].map(w => [w, Array.from({ length: d }, () => gauss(r))]));
  const P = Array.from({ length: 3 }, () => Array.from({ length: d }, () => gauss(r) * 0.9));
  const ia = A.indexOf("dog"), ib = B.indexOf("dog");          // "dog" stands at position 0, then at position 2
  let usePE = true;
  const bPE = h("button", { "aria-pressed": "true" }, "Position embeddings: on");
  const out = h("div", { class: "mats" });
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bPE), out, read);
  bPE.addEventListener("click", () => { usePE = !usePE; bPE.setAttribute("aria-pressed", usePE); bPE.textContent = `Position embeddings: ${usePE ? "on" : "off"}`; draw(); });
  // keep the rows that make up "dog" at full strength, dim the rest
  const focus = (m, rows) => { m.querySelectorAll("tr").forEach((tr, i) => tr.classList.add(rows.includes(i) ? "focus" : "dim")); return m; };
  function draw() {
    const X = S => S.map((w, i) => (usePE ? add(E[w], P[i]) : E[w].slice()));
    const XA = X(A), XB = X(B);
    const same = XA[ia].every((v, k) => v === XB[ib][k]);
    const mP = matTable(P, { cap: usePE ? "P[0..2]" : "P (off: not added)", rowLabels: ["pos 0", "pos 1", "pos 2"], digits: 1, scale: 3 });
    if (usePE) focus(mP, [ia, ib]); else mP.classList.add("off");
    const cmp = focus(matTable([XA[ia], XB[ib]], { cap: "“dog”, in each sentence", digits: 1, scale: 3,
      rowLabels: usePE ? [`E[dog]+P[${ia}]`, `E[dog]+P[${ib}]`] : ["E[dog]", "E[dog]"] }), [0, 1]);
    cmp.classList.add("cmp");
    cmp.append(h("div", { class: "verdict" }, same ? "= the same vector" : "≠ two different vectors"));
    out.innerHTML = "";
    out.append(
      focus(matTable(A.map(w => E[w]), { cap: "E[tokens]", rowLabels: A, digits: 1, scale: 3 }), [ia]),
      mP,
      focus(matTable(XA, { cap: "x  “dog bites man”", rowLabels: A, digits: 1, scale: 3 }), [ia]),
      focus(matTable(XB, { cap: "x  “man bites dog”", rowLabels: B, digits: 1, scale: 3 }), [ib]),
      cmp);
    read.innerHTML = usePE
      ? `With P, “dog” gets <b>a different vector in each sentence</b>: E[dog] + P[${ia}] in the first, E[dog] + P[${ib}] in the second. Its position is part of its vector.`
      : "Without P, “dog” gets <b>the same vector in both sentences</b>. The two sentences give the same three vectors, only reordered, so attention without a mask cannot tell them apart.";
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
  // why a nonlinearity, why GELU, and whether it matters. Sources: Hendrycks & Gimpel (2016), abstract;
  // GPT-1 (Radford et al., 2018), §4.1; BERT (Devlin et al., 2019), App. A.2 "following OpenAI GPT";
  // ConvNeXt (Liu et al., 2022), §2.6: ReLU → GELU left accuracy unchanged.
  const why = h("div", { class: "why-gelu", html:
    "<p><b>Why a nonlinearity?</b> Without one, W<sub>2</sub>W<sub>1</sub>x is a single matrix: the two layers collapse into one.</p>" +
    "<p><b>Why GELU, not ReLU?</b> Press <i>Slopes</i>. For x &lt; 0, ReLU's slope is exactly 0, so no gradient passes back through that unit. GELU is smooth; its slope there is small but not 0 (except at its minimum, x&nbsp;≈&nbsp;−0.75).</p>" +
    "<p><b>Where it comes from.</b> <a data-ref=\"hendrycks2016\">Hendrycks &amp; Gimpel (2016)</a> found it beat ReLU on all their tasks; <a data-ref=\"radford2018\">GPT-1</a> adopted it, and <a data-ref=\"devlin2019\">BERT</a>, GPT-2 and nanoGPT kept it.</p>" +
    "<p><b>Is it essential?</b> No: in <a data-ref=\"liu2022\">ConvNeXt</a>, ReLU → GELU changed nothing.</p>" });
  typeset(why);
  let slopes = false;                                       // values GELU(x), or slopes GELU'(x): the factor a gradient is multiplied by
  const bVal = h("button", { "aria-pressed": "true", onclick: () => { slopes = false; draw(); } }, "Values");
  const bSl = h("button", { "aria-pressed": "false", onclick: () => { slopes = true; draw(); } }, "Slopes");
  body.append(h("div", { class: "controls" }, bVal, bSl, slider("d (n_embd)", 48, 1600, 16, dm, v => { dm = v; draw(); })),
    h("div", { class: "two" }, plot, bars), why, read);
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const gelu = x => x * 0.5 * (1 + erf(x / Math.SQRT2));
  const dgelu = x => 0.5 * (1 + erf(x / Math.SQRT2)) + x * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  function draw() {
    plot.innerHTML = "";
    bVal.setAttribute("aria-pressed", !slopes); bSl.setAttribute("aria-pressed", slopes);
    const lo = slopes ? -0.3 : -0.5, hi = slopes ? 1.3 : 3;
    const X = x => 30 + ((x + 3) / 6) * 310, Y = y => 210 - ((y - lo) / (hi - lo)) * 190;
    el("line", { x1: X(-3), y1: Y(0), x2: X(3), y2: Y(0), class: "s-axis" }, plot);
    el("line", { x1: X(0), y1: Y(lo), x2: X(0), y2: Y(hi), class: "s-axis" }, plot);
    const path = f => Array.from({ length: 121 }, (_, i) => { const x = -3 + i * 0.05; return `${i ? "L" : "M"}${X(x)},${Y(f(x))}`; }).join("");
    const relu = slopes ? (x => (x > 0 ? 1 : 0)) : (x => Math.max(0, x));
    const pr = el("path", { d: path(relu), class: "s-line" }, plot); pr.style.stroke = "var(--blue-2)"; pr.style.strokeDasharray = "6 4";
    const pg = el("path", { d: path(slopes ? dgelu : gelu), class: "s-line" }, plot); pg.style.stroke = "var(--orange)";
    if (slopes) {
      el("line", { x1: X(-3), y1: Y(1), x2: X(3), y2: Y(1), class: "s-axis" }, plot).style.opacity = 0.4;
      text(plot, X(-0.1), Y(1) + 4, "1", "m", "end");
      text(plot, X(1.4), Y(0.88), "ReLU", "m", "start");
      text(plot, X(0.5), Y(0.45), "GELU", "o", "start");
      text(plot, X(-2.9), Y(0.78), "ReLU: slope 0", "m", "start");
      text(plot, X(-2.9), Y(0.64), "for every x < 0", "m", "start");
      text(plot, 180, 22, "slope = how much gradient passes back", "m");
    } else {
      text(plot, X(1.2), Y(2.4), "ReLU", "m", "start");
      text(plot, X(2.1), Y(1.55), "GELU", "o", "start");
      text(plot, X(-2.9), Y(-0.42), "GELU dips below 0; minimum near x ≈ −0.75", "m", "start");
    }
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
    read.innerHTML = `d = ${dm}: MLP ${dm} → ${4 * dm} → ${dm}. One block: ${tot.toLocaleString()} parameters; MLP <b>${(100 * mlpP / tot).toFixed(1)}%</b>.`;
  }
  draw();
}

// ── C4: residuals as a gradient highway (random-matrix experiment) ───────────
export function residual(root) {
  const body = frame(root, "C4 — why the residual path matters at depth",
    "Pass a vector through L random layers, with and without x ← x + f(x). The y-axis is the size of the vector after L layers, divided by its size at the input.",
    "Each layer is a random 32×32 linear map with entries ~ N(0, σ²/32). This is a numerical experiment on random layers, computed now — not a trained model.");
  let sigma = 0.8, alpha = 0.5, showRes = false;          // the residual path is hidden until asked for
  const s = svg(760, 290, null, "signal norm versus depth");
  const read = h("div", { class: "readout" });
  // the block: without the residual, x → f → f(x); with it, x goes round f and is added back
  const dg = svg(300, 250, null, "a layer, with or without a residual connection");
  uid(dg);
  function drawDg() {
    dg.innerHTML = ""; arrowDefs(dg);
    text(dg, 150, 238, "x", "b"); arrow(dg, 150, 224, 150, 196);
    box(dg, 90, 110, 120, 40, "Sublayer f", "", "b");
    arrow(dg, 150, 194, 150, 152);
    if (!showRes) { arrow(dg, 150, 108, 150, 26); text(dg, 150, 16, "f(x)", "b"); return; }
    el("circle", { cx: 150, cy: 188, r: 5, fill: "var(--orange)" }, dg);
    el("circle", { cx: 150, cy: 64, r: 14, class: "s-box on" }, dg); text(dg, 150, 69.5, "+", "b");
    arrow(dg, 150, 108, 150, 80);
    el("path", { d: "M150,188 L262,188 L262,64 L166,64", class: "s-edge on", "marker-end": `url(#ah-on${dg.dataset.uid})` }, dg);
    text(dg, 270, 130, "identity: x", "o", "start").setAttribute("transform", "rotate(90 270 130)");
    arrow(dg, 150, 48, 150, 20);
    text(dg, 150, 12, "x + f(x)", "b");
  }
  const bRes = h("button", { "aria-pressed": "false", onclick: () => {
    showRes = !showRes; bRes.setAttribute("aria-pressed", showRes); bRes.textContent = showRes ? "Hide the residual" : "Show with residual"; draw();
  } }, "Show with residual");
  body.append(h("div", { class: "controls" }, bRes,
    slider("σ (layer gain)", 0.4, 1.6, 0.05, sigma, v => { sigma = v; draw(); }, v => v.toFixed(2)),
    slider("branch scale α", 0.1, 1, 0.05, alpha, v => { alpha = v; draw(); }, v => v.toFixed(2))),
    h("div", { class: "res-row" }, dg, s), read);
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
    drawDg();
    s.innerHTML = "";
    const x0 = 92, y0 = 16, W = 640, Hh = 230, lo = -8, hi = 8;
    const X = l => x0 + (W * l) / (Lmax - 1), Y = e => y0 + Hh * (1 - (Math.max(lo, Math.min(hi, e)) - lo) / (hi - lo));
    for (let e = lo; e <= hi; e += 4) { el("line", { x1: x0, y1: Y(e), x2: x0 + W, y2: Y(e), class: "s-axis" }, s); text(s, x0 - 6, Y(e) + 4, e === 0 ? "1" : `1e${e}`, "m", "end"); }
    const line = (arr, col, dash) => { const p = el("path", { d: arr.map((e, l) => `${l ? "L" : "M"}${X(l)},${Y(e)}`).join(""), class: "s-line" }, s); p.style.stroke = col; if (dash) p.style.strokeDasharray = "6 4"; };
    line(plain, "var(--blue-2)", true);
    if (showRes) { line(resid, "var(--orange)"); text(s, X(Lmax - 1), Y(resid[Lmax - 1]) - 8, "with residual", "o", "end"); }
    text(s, X(Lmax - 1), Y(plain[Lmax - 1]) + 16, "no residual", "m", "end");
    text(s, x0 + W / 2, 284, "number of layers L (1 … 48)", "m");
    text(s, 16, y0 + Hh / 2, "‖x after L layers‖ / ‖x at input‖", "m").setAttribute("transform", `rotate(-90 16 ${y0 + Hh / 2})`);
    const f = e => (10 ** e < 1e-3 || 10 ** e > 1e3 ? (10 ** e).toExponential(1) : (10 ** e).toFixed(3));
    read.innerHTML = showRes
      ? `After 48 layers: ×<b>${f(plain[Lmax - 1])}</b> without the residual, ×<b>${f(resid[Lmax - 1])}</b> with it.\n` +
        `Without it, the size is multiplied by about σ per layer, and so is the gradient.`
      : `After 48 layers without a residual: ×<b>${f(plain[Lmax - 1])}</b>.\n` +
        `The size is multiplied by about σ per layer, and so is the gradient.`;
  }
  draw();
}

// ── C5: LayerNorm, and pre-LN vs post-LN ─────────────────────────────────────
export function layerNorm(root) {
  const body = frame(root, "C5 — LayerNorm, and where to put it",
    "Scale or shift the input: LN(x) does not change. Below, the two places it can go.",
    "γ = 1, β = 0 so only the normalisation is shown. Post-LN is <a data-ref=\"vaswani2017\">Vaswani et al. (2017)</a>; pre-LN is GPT-2 and nanoGPT.");
  const r8 = rng(8);
  const x = Array.from({ length: 8 }, () => gauss(r8));
  let scale = 1, shift = 0, pre = true;
  const s = svg(760, 190, null, "layernorm input and output");
  const read = h("div", { class: "readout" });
  const bPre = h("button", { "aria-pressed": "true" }, "Pre-LN (nanoGPT)");
  const bPost = h("button", { "aria-pressed": "false" }, "Post-LN (2017)");
  const d2 = svg(760, 136, null, "layernorm placement");
  uid(d2);
  const note = h("div", { class: "ln-note" });
  body.append(h("div", { class: "controls" },
    slider("scale input ×", 0.1, 10, 0.1, scale, v => { scale = v; draw(); }, v => v.toFixed(1)),
    slider("shift input +", -5, 5, 0.1, shift, v => { shift = v; draw(); }, v => v.toFixed(1))), s, read,
    h("div", { class: "controls", style: "margin-top:1rem" }, bPre, bPost), d2, note);
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
    read.innerHTML = `input x: mean μ = ${mu.toFixed(2)}, std σ = ${sd.toFixed(2)}\nLN(x):   mean 0.00, std 1.00`;
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
    note.innerHTML = pre ? "<b>Pre-LN</b> (GPT-2, nanoGPT): LayerNorm sits inside the branch. The residual path carries x to the output unchanged."
      : "<b>Post-LN</b> (2017): LayerNorm comes after the addition, so the residual path itself is normalised in every block.";
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

// ── the 2017 Transformer, wide: an encoder, a decoder, no recurrence ────────────
// Structure after Fig. 1 of Vaswani et al. (2017), simplified (no Add & Norm). The
// decoder's self-attention is masked; why is the subject of the next slide.
export function encDec(root) {
  const body = frame(root, "The 2017 Transformer: an encoder and a decoder, no recurrence",
    "Translation with attention only: the encoder reads the source at once, the decoder writes the target.",
    "Structure after Fig. 1 of <a data-ref=\"vaswani2017\">Vaswani et al. (2017)</a>, redrawn and simplified (no Add &amp; Norm).");
  const src = ["le", "chat", "noir", "dort"], inp = ["<s>", "the", "black", "cat"], out = ["the", "black", "cat", "sleeps"];
  const s = svg(1180, 350, null, "encoder–decoder Transformer");
  uid(s);
  body.append(s);
  const blk = (x, y, w, hgt, label, cls = "") => box(s, x, y, w, hgt, label, cls, "b");
  arrowDefs(s);
  // encoder
  const ex = 70, ew = 400, ecx = ex + ew / 2;
  text(s, ex, 76, "Encoder", "b", "start").setAttribute("style", "font-size: 18px");
  el("rect", { x: ex, y: 86, width: ew, height: 150, rx: 12, class: "s-box" }, s);
  text(s, ex + ew - 10, 106, "× N", "o", "end");
  blk(ex + 24, 176, ew - 48, 44, "Self-attention: every word ↔ every word");
  blk(ex + 24, 112, ew - 48, 40, "Feed-forward");
  arrow(s, ecx, 174, ecx, 154);
  blk(ex + 24, 256, ew - 48, 30, "embedding + position");
  arrow(s, ecx, 254, ecx, 238);
  src.forEach((w, i) => { const x = ex + 24 + i * 90; box(s, x, 306, 82, 28, w, "", "b"); arrow(s, x + 41, 304, x + 41, 290); });
  text(s, ecx, 348, "source: read all at once", "m");
  // encoder output → cross-attention
  const dx = 660, dw = 440, dcx = dx + dw / 2;
  el("path", { d: `M${ecx},86 L${ecx},58 L${dx - 50},58 L${dx - 50},160 L${dx + 22},160`, fill: "none", class: "s-edge on", "stroke-width": 2, "marker-end": `url(#ah-on${s.dataset.uid})` }, s);
  text(s, (ecx + dx - 50) / 2, 50, "encoder output → keys and values", "o");
  // decoder
  text(s, dx, 34, "Decoder", "b", "start").setAttribute("style", "font-size: 18px");
  el("rect", { x: dx, y: 44, width: dw, height: 192, rx: 12, class: "s-box" }, s);
  text(s, dx + dw - 10, 64, "× N", "o", "end");
  blk(dx + 24, 186, dw - 48, 38, "Masked self-attention: the English so far", "on");
  blk(dx + 24, 142, dw - 48, 36, "Cross-attention: looks at the encoder");
  blk(dx + 24, 72, dw - 48, 34, "Feed-forward");
  arrow(s, dcx, 184, dcx, 180); arrow(s, dcx, 140, dcx, 108);
  blk(dx + 24, 256, dw - 48, 30, "embedding + position");
  arrow(s, dcx, 254, dcx, 238);
  inp.forEach((w, i) => { const x = dx + 24 + i * 100; box(s, x, 306, 92, 28, w, "", "b"); arrow(s, x + 46, 304, x + 46, 290); });
  text(s, dcx, 348, "target, shifted right by one", "m");
  arrow(s, dcx, 44, dcx, 22, true);
  text(s, dcx + 12, 18, `predicts: ${out.join(" · ")}`, "o", "start");
}

// ── nanoGPT at a glance: the overview slide, and a small "you are here" copy on each component slide ──
// Same layout as the decoder-only diagram in architecture(). Line numbers are for the commit below.
const NANO = "https://github.com/karpathy/nanoGPT/blob/3adf61e154c3fe3fca428ad6bc3818b27a3b8291/model.py";
const PARTS = [
  ["c1", "Embeddings", "a vector for each token, plus one for its position", [["wte, wpe", "L127-L128"], ["tok_emb + pos_emb", "L177-L179"]]],
  ["c2", "Causal self-attention", "each token reads itself and earlier tokens; the only place tokens mix", [["CausalSelfAttention", "L29-L76"]]],
  ["c3", "MLP", "works on each token alone; two thirds of the parameters", [["MLP", "L78-L92"]]],
  ["c4", "Residual connections", "each sub-layer adds to x instead of replacing it", [["Block.forward", "L103-L106"]]],
  ["c5", "LayerNorm", "rescales each token's vector before each sub-layer", [["ln_1, ln_2", "L98-L100"], ["ln_f", "L131"]]],
  ["c6", "Output head", "one score per vocabulary token; shares its matrix with E", [["lm_head", "L133-L138"]]],
];
export function nanoMap(root) {
  const mini = root.dataset.mini;                     // "c1" … "c6": small, one part lit, no text
  let sel = mini || null;
  const s = svg(480, 720, null, mini ? `where ${mini.toUpperCase()} sits in nanoGPT` : "nanoGPT, decoder-only");
  uid(s);
  if (mini) s.setAttribute("viewBox", "44 80 392 592");
  const on = id => (sel === id ? "on" : "");
  const B = (x, y, w, hh, label, id) => box(s, x, y, w, hh, mini ? null : label, on(id), "b", 7);
  const A = (x1, y1, x2, y2) => { if (!mini) arrow(s, x1, y1, x2, y2); };   // the small copy has no arrowheads
  const P = (x, y, id) => { el("circle", { cx: x, cy: y, r: 11, class: `s-box ${on(id)}` }, s); if (!mini) text(s, x, y + 5, "+", "b"); };
  const badge = (x, y, id) => { if (mini) return; const g = el("g", { class: `badge ${on(id)}` }, s); el("circle", { cx: x, cy: y, r: 14 }, g); el("text", { x, y: y + 5, "text-anchor": "middle", text: id.toUpperCase() }, g); };
  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const cx = 240, bw = 210, bx = cx - bw / 2;
    if (!mini) {
      const words = ["mat", "sofa", "floor", "roof", "…"], p = [0.46, 0.21, 0.17, 0.09, 0.07];
      el("line", { x1: 126, y1: 58, x2: 360, y2: 58, class: "s-axis" }, s);
      words.forEach((w, i) => { const x = 130 + i * 46; el("rect", { x: x + 3, y: 58 - 50 * p[i], width: 26, height: 50 * p[i], rx: 2, class: `s-bar ${i === 0 ? "on" : ""}` }, s); text(s, x + 16, 72, w, "m"); });
      text(s, 110, 50, "p(next)", "m", "end");
    }
    const by = 246, bh = 322;
    if (!mini) for (let i = 3; i >= 1; i--) el("rect", { x: 80 + i * 5, y: by - i * 5, width: 320, height: bh, rx: 14, class: "s-box", opacity: 0.55 }, s);
    el("rect", { x: 80, y: by, width: 320, height: bh, rx: 14, class: "s-box" }, s);
    if (mini) el("line", { x1: cx, y1: 600, x2: cx, y2: 100, class: "s-edge" }, s);
    B(bx, 90, bw, 32, "Softmax", "c6");
    B(bx, 140, bw, 32, "Linear head (lm_head)", "c6");
    B(bx, 190, bw, 32, "LayerNorm (ln_f)", "c5");
    A(cx, 88, cx, 76); A(cx, 138, cx, 124); A(cx, 188, cx, 174);
    if (!mini) { text(s, 88, by + 16, "Block, × n_layer", "m", "start"); }
    P(cx, 274, "c4"); A(cx, 262, cx, 224);
    B(bx, 300, bw, 40, "MLP  (d → 4d → d)", "c3"); A(cx, 298, cx, 287);
    B(bx, 356, bw, 28, "LayerNorm (ln_2)", "c5"); A(cx, 354, cx, 342);
    P(cx, 420, "c4"); A(cx, 408, cx, 386);
    B(bx, 446, bw, 46, "Causal self-attention", "c2"); A(cx, 444, cx, 433);
    B(bx, 508, bw, 28, "LayerNorm (ln_1)", "c5"); A(cx, 506, cx, 494);
    el("path", { d: `M${cx},548 L372,548 L372,420 L${cx + 13},420`, class: `s-edge ${on("c4")}` }, s);
    el("path", { d: `M${cx},398 L372,398 L372,274 L${cx + 13},274`, class: `s-edge ${on("c4")}` }, s);
    P(cx, 598, "c1"); A(cx, 586, cx, 538);
    B(60, 624, 160, 38, "Token emb. (wte)", "c1");
    B(260, 624, 160, 38, "Position emb. (wpe)", "c1");
    A(140, 622, cx - 10, 606); A(340, 622, cx + 10, 606);
    if (!mini) {
      el("path", { d: `M${bx},156 C30,156 30,643 58,643`, class: `s-edge dash ${on("c6")}` }, s);
      text(s, 36, 400, "same matrix", "m").setAttribute("transform", "rotate(-90 36 400)");
      ["The", "cat", "sat", "on", "the"].forEach((w, i) => { el("rect", { x: 90 + i * 62, y: 684, width: 54, height: 26, rx: 5, class: "s-box" }, s); text(s, 117 + i * 62, 701, w); });
      arrow(s, 140, 682, 140, 664);
      badge(372, 156, "c6"); badge(108, 206, "c5"); badge(108, 320, "c3"); badge(398, 350, "c4"); badge(108, 469, "c2"); badge(240, 643, "c1");
    }
  }
  if (mini) {
    root.classList.add("minimap");
    const name = { c1: "embeddings", c2: "attention", c3: "MLP", c4: "residuals", c5: "LayerNorm", c6: "output head" }[mini];
    root.append(h("div", { class: "cap" }, h("span", {}, "In nanoGPT:"), h("b", {}, `${mini.toUpperCase()} · ${name}`)), s);
    draw();
    return;
  }
  // summary mode (slide "What makes GPT great"): the slide supplies its own table.parts, with rows
  // marked data-id="c1" …; it goes beside the same diagram and drives the same highlighting
  const given = root.hasAttribute("data-summary") ? root.querySelector("table") : null;
  if (given) {
    root.innerHTML = "";
    root.classList.add("viz");
    const pickG = id => { sel = sel === id ? null : id; draw(); [...given.rows].forEach(r => r.classList.toggle("on", r.dataset.id === sel)); };
    [...given.rows].forEach(tr => { if (!tr.dataset.id) return; tr.tabIndex = 0;
      tr.addEventListener("click", e => { if (!e.target.closest("a")) pickG(tr.dataset.id); });
      tr.addEventListener("keydown", e => { if (e.key === "Enter") pickG(tr.dataset.id); }); });
    root.append(h("div", { class: "viz-body" }, h("div", { class: "two" }, h("div", {}, s), h("div", {}, given))));
    draw();
    return;
  }
  const body = frame(root, "nanoGPT, one diagram",
    "Six kinds of component, C1–C6. Click a row to find it in the diagram; the code link opens that part of model.py.",
    `Redrawn from nanoGPT's <a href="${NANO}">model.py</a> (commit 3adf61e). The same layout as the decoder-only diagram in Part A.`);
  const rows = h("table", { class: "parts" });
  const pick = id => { sel = sel === id ? null : id; draw(); [...rows.rows].forEach(r => r.classList.toggle("on", r.dataset.id === sel)); };
  PARTS.forEach(([id, name, what, code]) => {
    const tr = h("tr", { "data-id": id, tabindex: 0 },
      h("td", { class: "id" }, id.toUpperCase()),
      h("td", {}, h("b", {}, name), h("span", {}, what)),
      h("td", { class: "code" }, ...code.map(([c, l]) => h("a", { href: `${NANO}#${l}`, target: "_blank", rel: "noopener" }, h("code", {}, c)))));
    tr.addEventListener("click", e => { if (!e.target.closest("a")) pick(id); });
    tr.addEventListener("keydown", e => { if (e.key === "Enter") pick(id); });
    rows.appendChild(tr);
  });
  body.append(h("div", { class: "two" }, h("div", {}, s), h("div", {}, rows)));
  draw();
}

// ── the training loss: every position predicts the next token ───────────────
export function nextTokenLoss(root) {
  const body = frame(root, "Next-token prediction, and its loss",
    "Each position predicts the token after it. Drag a bar to set the probability given to the true next token.",
    "The probabilities are set by hand, not by a trained model. nanoGPT computes the same average with <code>F.cross_entropy(logits, targets)</code>.");
  const toks = ["The", "cat", "sat", "on", "the", "mat"], T = toks.length - 1;
  const start = [0.2, 0.3, 0.6, 0.7, 0.4];
  let p = start.slice();
  const s = svg(1100, 292, null, "next-token prediction and the loss");
  uid(s);
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" },
    h("button", { onclick: () => { p = start.slice(); draw(); } }, "Example"),
    h("button", { onclick: () => { p = p.map(() => 1 / 65); draw(); } }, "Uniform guess over 65 characters"),
    h("button", { onclick: () => { p = p.map(() => 0.99); draw(); } }, "Almost always right")), s, read);
  const cx = i => 120 + i * 180, FT = 62, FH = 94, FW = 46;    // bar frames: top y, height, width
  const setFrom = (i, evt) => {
    const pt = s.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const y = pt.matrixTransform(s.getScreenCTM().inverse()).y;
    p[i] = Math.min(1, Math.max(0.001, (FT + FH - y) / FH));
    draw();
  };
  let drag = -1;
  s.addEventListener("pointermove", e => { if (drag >= 0) setFrom(drag, e); });
  window.addEventListener("pointerup", () => { drag = -1; });
  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const nll = p.map(v => -Math.log(v)), L = nll.reduce((a, b) => a + b, 0) / T;
    text(s, 18, 32, "true next", "m", "start");
    text(s, 18, 272, "input", "m", "start");
    text(s, 18, FT + FH / 2 - 6, "p(true", "m", "start"); text(s, 18, FT + FH / 2 + 12, "next)", "m", "start");
    el("rect", { x: 70, y: 194, width: 880, height: 32, rx: 8, class: "s-box" }, s);
    text(s, 510, 215, "GPT (causal): position t sees x₁ … xₜ only", "b");
    for (let i = 0; i < T; i++) {
      const x = cx(i);
      box(s, x - 34, 256, 68, 28, toks[i], "", "b");
      arrow(s, x, 254, x, 228);
      arrow(s, x, 192, x, FT + FH + 20);
      // the bar: probability of the true next token
      const g = el("g", { style: "cursor:ns-resize" }, s);
      el("rect", { x: x - FW / 2, y: FT, width: FW, height: FH, rx: 4, class: "s-box" }, g);
      el("rect", { x: x - FW / 2, y: FT + FH * (1 - p[i]), width: FW, height: FH * p[i], rx: 4, class: "s-bar on" }, g);
      g.addEventListener("pointerdown", e => { drag = i; setFrom(i, e); e.preventDefault(); });
      text(s, x + FW / 2 + 6, FT + FH * (1 - p[i]) + 5, p[i] < 0.01 ? p[i].toExponential(1) : p[i].toFixed(2), "o", "start");
      text(s, x, FT + FH + 16, `−log p = ${nll[i].toFixed(2)}`, "m");
      el("line", { x1: x, y1: FT - 2, x2: x, y2: 44, class: "s-edge dash" }, s);
      box(s, x - 34, 14, 68, 28, toks[i + 1], "on", "b");
    }
    // the average
    const ax = 1030;
    text(s, ax, 92, "loss L", "m");
    text(s, ax, 130, L.toFixed(2), "o").style.fontSize = "30px";
    text(s, ax, 154, "mean of −log p", "m");
    read.innerHTML = `L = (${nll.map(v => v.toFixed(2)).join(" + ")}) / ${T} = <b>${L.toFixed(3)}</b> nats` +
      `\nA uniform guess over V tokens gives L = ln V; for 65 characters, ln 65 = ${Math.log(65).toFixed(2)}.`;
  }
  draw();
}

// ── The small GPT's training curve (slide "What we will break") ─────────────
// Baseline of ablation_base.py, training loss every 10 steps, mean of seeds 1337–1339;
// laptop CPU run of 29 Sep 2026 (materials: demo_outputs/ablation_base_cpu_2026-09-29.json).
const SMALL_CURVE = [4.34,3.46,3.23,3.07,2.94,2.81,2.8,2.73,2.68,2.63,2.63,2.6,2.6,2.57,2.54,2.53,2.57,2.5,2.57,2.53,2.48,2.45,2.46,2.47,2.43,2.44,2.42,2.4,2.45,2.42,2.39,2.41,2.39,2.37,2.37,2.37,2.31,2.38,2.32,2.33,2.33,2.33,2.31,2.29,2.3,2.29,2.26,2.24,2.27,2.26,2.29,2.21,2.22,2.19,2.19,2.21,2.19,2.18,2.18,2.17,2.16,2.17,2.17,2.17,2.16,2.18,2.14,2.15,2.12,2.1,2.12,2.11,2.08,2.08,2.11,2.06,2.09,2.05,2.08,2.07,2.04,2.04,2.05,2.05,2.0,2.06,2.03,2.01,2.03,2.03,2.03,2.03,2.01,1.98,1.98,2.0,1.97,2.01,2.0,2.01,2.03,1.99,1.94,1.96,1.96,1.99,1.92,1.95,1.92,1.93,1.93,1.96,1.93,1.93,1.92,1.92,1.92,1.92,1.89,1.9,1.94,1.9,1.93,1.93,1.88,1.87,1.88,1.88,1.92,1.87,1.9,1.9,1.87,1.91,1.86,1.87,1.89,1.88,1.83,1.86,1.87,1.86,1.77,1.79,1.82,1.85,1.8,1.82,1.84,1.82,1.84,1.83,1.84,1.84,1.81,1.82,1.79,1.8,1.81,1.77,1.77,1.8,1.79,1.78,1.8,1.78,1.8,1.82,1.76,1.8,1.79,1.83,1.77,1.79,1.75,1.77,1.8,1.8,1.77,1.74,1.85,1.77,1.72,1.76,1.75,1.78,1.76,1.75,1.78,1.77,1.77,1.76,1.75,1.74,1.75,1.68,1.71,1.72,1.75,1.71,1.74,1.73,1.7,1.7,1.74,1.73,1.68,1.73,1.71,1.67,1.73,1.72,1.69,1.7,1.69,1.66,1.66,1.7,1.69,1.74,1.68,1.67,1.62,1.73,1.68,1.7,1.69,1.71,1.67,1.7,1.71,1.66,1.63,1.65,1.72,1.62,1.7,1.68,1.67,1.65,1.67,1.66,1.64,1.7,1.64,1.63,1.65,1.62,1.66,1.64,1.67,1.65,1.64,1.67,1.67,1.61,1.63,1.63,1.62,1.6,1.62,1.66,1.68,1.61,1.61,1.64,1.63,1.67,1.66,1.66,1.65,1.59,1.58,1.61,1.58,1.6,1.64,1.62,1.61,1.64,1.58,1.63,1.62,1.62,1.6,1.64,1.59,1.63,1.6,1.61,1.65,1.59,1.61,1.58,1.6,1.6,1.62,1.64,1.58,1.62,1.58];
const SMALL_VAL = 1.759;                                  // validation loss after 3,000 steps, mean of 3 seeds
export function smallGptCurve(root) {
  root.innerHTML = "";
  const W = 380, H = 190, x0 = 44, x1 = 354, y0 = 14, y1 = 156, s = svg(W, H, root, "Training loss of the small GPT over 3,000 steps");
  uid(s);
  const X = st => x0 + (x1 - x0) * st / 3000, Y = v => y0 + (y1 - y0) * (4.6 - v) / (4.6 - 1.2);
  for (const v of [2, 3, 4]) { el("line", { x1: x0, x2: x1, y1: Y(v), y2: Y(v), class: "s-axis", "stroke-dasharray": "2 4" }, s); text(s, x0 - 6, Y(v) + 4, v, "m ax", "end"); }
  el("line", { x1: x0, x2: x1, y1: y1, y2: y1, class: "s-axis" }, s);
  for (const st of [0, 1000, 2000, 3000]) text(s, X(st), y1 + 16, st.toLocaleString("en"), "m ax");
  text(s, (x0 + x1) / 2, y1 + 32, "training step", "m ax");
  const ln65 = Math.log(65);
  el("line", { x1: x0, x2: x1, y1: Y(ln65), y2: Y(ln65), stroke: "var(--muted)", "stroke-dasharray": "6 4" }, s);
  text(s, x1, Y(ln65) - 6, "uniform guess: ln 65 = 4.17", "m ax", "end");
  el("polyline", { points: SMALL_CURVE.map((v, i) => `${X(10 * i).toFixed(1)},${Y(v).toFixed(1)}`).join(" "), fill: "none", stroke: "var(--blue-2)", "stroke-width": 2 }, s);
  el("circle", { cx: X(3000), cy: Y(SMALL_VAL), r: 4.5, fill: "var(--orange)" }, s);
  text(s, X(3000) - 8, Y(SMALL_VAL) - 22, `validation ${SMALL_VAL.toFixed(2)}`, "m ax val", "end");
  text(s, X(3000) - 8, Y(SMALL_VAL) + 20, "training", "m ax tr", "end");
}

// ── Slide 44: the ConvNeXt staircase again, recoloured for each claim ───────
// The slide's claims carry data-claim="attn" | "train" | "design"; clicking one recolours the bars.
export function convnextClaims(root) {
  const slide = root.closest(".slide") || document;
  const claims = [...slide.querySelectorAll("[data-claim]")];
  let mode = "attn";
  const s = svg(760, 400, root, "ConvNeXt staircase, coloured by claim");
  const pick = m => { mode = m; claims.forEach(c => c.classList.toggle("on", c.dataset.claim === m)); draw(); };
  claims.forEach(c => { c.setAttribute("role", "button"); c.tabIndex = 0; c.addEventListener("click", () => pick(c.dataset.claim)); });
  const base = STEPS[1][2];                                // 78.8: after the training recipe
  function draw() {
    s.innerHTML = "";
    const lo = 75, hi = 83, x0 = 280, W = 420, y0 = 44, rh = 23;
    const X = v => x0 + (W * (v - lo)) / (hi - lo), n = STEPS.length;
    for (let v = 76; v <= 82; v++) {
      el("line", { x1: X(v), y1: y0 - 4, x2: X(v), y2: y0 + n * rh, class: "s-axis" }, s);
      text(s, X(v), y0 + n * rh + 16, v + "%", "m");
    }
    const sw = el("line", { x1: X(81.3), y1: y0 - 8, x2: X(81.3), y2: y0 + n * rh, class: `cx-swin ${mode === "attn" ? "on" : ""}` }, s);
    text(s, X(81.3), y0 + n * rh + 34, "Transformer (Swin-T), 81.3", mode === "attn" ? "cx-swin-t" : "m");
    STEPS.forEach(([, name, v], i) => {
      const y = y0 + i * rh, prev = i ? STEPS[i - 1][2] : v;
      text(s, x0 - 8, y + rh / 2 + 4, name, "cx-lab", "end");
      const bar = (a, b, cls) => el("rect", { x: X(a), y: y + 4, width: Math.max(0, X(b) - X(a)), height: rh - 8, rx: 2, class: cls }, s);
      if (mode === "attn") bar(lo, v, "cx-noattn");
      else if (mode === "train") { bar(lo, v, "cx-dim"); if (i === 1) bar(prev, v, "cx-hi"); }
      else { bar(lo, Math.min(v, base), "cx-dim"); if (i >= 2 && v > base) bar(base, v, "cx-hi"); }
    });
    const head = {
      attn: ["No step adds attention: the ConvNet ends at 82.0,", "above Swin-T (81.3), which has attention."],
      train: [`Training recipe alone: ${STEPS[0][2]} → ${base}, +${(base - STEPS[0][2]).toFixed(1)} points,`, "before any change to the architecture."],
      design: [`Twelve design changes together: ${base} → 82.0, +${(82.0 - base).toFixed(1)} points,`, "on top of the new training recipe."],
    }[mode];
    text(s, 10, 16, head[0], "cx-head", "start"); text(s, 10, 34, head[1], "cx-head", "start");
  }
  pick("attn");
}

// ── Slide 41: a ConvNet and a Transformer (ViT), reduced to their key parts ──
// Both classify the same image. Orange badges ①–⑥ match the numbered differences on the slide.
export function convVsVit(root) {
  root.innerHTML = "";
  const s = svg(1160, 214, root, "A ConvNet and a Vision Transformer, side by side");
  uid(s); arrowDefs(s);
  const IMG = new URL("../../img/p2l1/vit_eagle.jpg", import.meta.url).href, Y = 118;
  const blk = (x, w, label, hot) => { box(s, x, Y - 16, w, 32, label, hot ? "on" : "", "b cvv"); };
  const badge = (x, y, n) => { el("circle", { cx: x, cy: y, r: 10, class: "cvv-badge" }, s); text(s, x, y + 4.5, String(n), "cvv-num"); };
  const pic = (x, grid) => {
    el("image", { href: IMG, x, y: Y - 30, width: 60, height: 60, preserveAspectRatio: "xMidYMid slice" }, s);
    if (grid) for (let k = 1; k < 4; k++) { el("line", { x1: x + 15 * k, x2: x + 15 * k, y1: Y - 30, y2: Y + 30, class: "cvv-cut" }, s); el("line", { x1: x, x2: x + 60, y1: Y - 30 + 15 * k, y2: Y - 30 + 15 * k, class: "cvv-cut" }, s); }
  };
  const residual = (x1, x2) => el("path", { d: `M${x1},${Y - 20} C${x1},${Y - 44} ${x2},${Y - 44} ${x2},${Y - 20}`, fill: "none", class: "s-edge", "marker-end": `url(#ah${s.dataset.uid})` }, s);

  // ConvNet (ResNet-50)
  text(s, 8, 20, "ConvNet (ResNet-50)", "cvv-title", "start");
  pic(8, false);
  arrow(s, 70, Y, 84, Y);
  blk(86, 78, "7×7 conv", true); badge(125, Y + 30, 5); text(s, 125, Y + 52, "stem", "m");
  arrow(s, 166, Y, 180, Y);
  el("rect", { x: 182, y: Y - 60, width: 300, height: 104, rx: 10, class: "cvv-group" }, s);
  text(s, 192, Y - 44, "stages of (3, 4, 6, 3) blocks", "cvv-sub", "start"); badge(470, Y - 48, 6);
  blk(196, 84, "3×3 conv", true); badge(238, Y + 30, 1);
  arrow(s, 282, Y, 294, Y);
  blk(296, 70, "BN", true); badge(331, Y + 30, 2);
  arrow(s, 368, Y, 380, Y);
  blk(382, 84, "ReLU", true); badge(424, Y + 30, 3);
  residual(210, 452);
  arrow(s, 484, Y, 498, Y);
  blk(500, 52, "pool", false);
  text(s, 526, Y + 44, "→ “eagle”", "cvv-out");

  // Transformer (ViT)
  const X0 = 588;
  el("line", { x1: X0 - 16, x2: X0 - 16, y1: 10, y2: 204, class: "s-axis" }, s);
  text(s, X0, 20, "Transformer (ViT)", "cvv-title", "start");
  pic(X0, true); badge(X0 + 30, Y + 44, 5); text(s, X0 + 30, Y + 66, "patches", "m");
  arrow(s, X0 + 62, Y, X0 + 76, Y);
  el("rect", { x: X0 + 78, y: Y - 60, width: 406, height: 104, rx: 10, class: "cvv-group" }, s);
  text(s, X0 + 88, Y - 44, "× L identical blocks, one stage", "cvv-sub", "start"); badge(X0 + 472, Y - 48, 6);
  blk(X0 + 92, 44, "LN", true); badge(X0 + 114, Y + 30, 2);
  arrow(s, X0 + 138, Y, X0 + 148, Y);
  blk(X0 + 150, 120, "self-attention", true); badge(X0 + 210, Y + 30, 1);
  arrow(s, X0 + 272, Y, X0 + 282, Y);
  blk(X0 + 284, 44, "LN", true);
  arrow(s, X0 + 330, Y, X0 + 340, Y);
  blk(X0 + 342, 128, "MLP, GELU", true); badge(X0 + 406, Y + 30, 3);
  residual(X0 + 100, X0 + 460);
  arrow(s, X0 + 486, Y, X0 + 500, Y);
  text(s, X0 + 536, Y + 5, "“eagle”", "cvv-out");
}
