// Part A — history of generative models: n-gram → MLP → RNN → LSTM → seq2seq → Transformer.
import { el, h, svg, arrowDefs, uid, arrow, box, text, rng, gauss, randMat, matvec, add, norm,
  softmax, divColor, fmt, sci, bytes, slider, frame } from "../lib.js";

// ── n-gram: a real count table built from a tiny corpus ─────────────────────
const CORPUS = `the cat sat on the mat .
the dog sat on the rug .
the cat saw the dog .
the dog saw a cat on the mat .
a cat sat on a rug .
the dog ate the food .
the cat ate .`;

export function ngram(root) {
  const body = frame(root, "An n-gram model is a table of counts",
    "Built live from the seven sentences below. Pick tokens yourself to reach a context the corpus never contained.",
    "Every number here is counted from the corpus shown — nothing is learned. Try the trigram model and click <code>dog</code> then <code>mat</code>.");
  const toks = CORPUS.split(/\s+/).filter(Boolean);
  const vocab = [...new Set(toks)].sort();
  let order = 2, seq = [];

  const counts = n => {
    const t = new Map();
    for (let i = n - 1; i < toks.length; i++) {
      const ctx = toks.slice(i - n + 1, i).join(" ");
      if (!t.has(ctx)) t.set(ctx, new Map());
      const row = t.get(ctx);
      row.set(toks[i], (row.get(toks[i]) || 0) + 1);
    }
    return t;
  };
  let table = counts(order);

  const orderSel = h("select", { "aria-label": "model order" },
    h("option", { value: 2 }, "bigram (context = 1 token)"),
    h("option", { value: 3 }, "trigram (context = 2 tokens)"));
  const bSample = h("button", { class: "primary" }, "Sample next token");
  const bArg = h("button", {}, "Most likely next");
  const bReset = h("button", {}, "Reset");
  body.append(h("div", { class: "controls" }, h("label", {}, "Model", orderSel), bSample, bArg, bReset));

  const corpusBox = h("details", {}, h("summary", { class: "note" }, "Show the corpus (7 sentences, " + toks.length + " tokens)"),
    h("pre", { class: "readout" }, CORPUS));
  const seqRow = h("div", { class: "chips", "aria-live": "polite" });
  const pickRow = h("div", { class: "chips" });
  const tableBox = h("div");
  const stats = h("p", { class: "note" });
  body.append(
    h("h4", { style: "margin-top:0" }, "Generated so far"), seqRow,
    h("div", { class: "two" },
      h("div", {}, h("h4", {}, "Lookup table row for the current context"), tableBox),
      h("div", {}, h("h4", {}, "Or append a token yourself"), pickRow, stats, corpusBox)));

  vocab.forEach(w => pickRow.appendChild(h("button", { class: "chip", onclick: () => { seq.push(w); render(); } }, w)));

  const ctxOf = () => seq.slice(Math.max(0, seq.length - (order - 1))).join(" ");
  const rowOf = () => (seq.length >= order - 1 ? table.get(ctxOf()) : undefined);

  function reset() { seq = order === 2 ? ["the"] : ["the", "cat"]; render(); }
  function next(greedy) {
    const row = rowOf();
    if (!row) return;
    const items = [...row.entries()];
    const tot = items.reduce((s, [, c]) => s + c, 0);
    let pick;
    if (greedy) pick = items.sort((a, b) => b[1] - a[1])[0][0];
    else { let r = Math.random() * tot; for (const [w, c] of items) { if ((r -= c) <= 0) { pick = w; break; } } pick ??= items[0][0]; }
    seq.push(pick);
    if (seq.length > 24) seq = seq.slice(-24);
    render(true);
  }
  function render(justAdded) {
    seqRow.innerHTML = "";
    const ctxStart = seq.length - (order - 1);
    seq.forEach((w, i) => seqRow.appendChild(h("span", { class: "chip " + (i >= ctxStart ? "ctx" : "") + (justAdded && i === seq.length - 1 && i < ctxStart ? " new" : "") }, w)));
    seqRow.appendChild(h("span", { class: "chip new" }, "?"));
    const row = rowOf();
    tableBox.innerHTML = "";
    const ctxLabel = h("p", { style: "margin:.2rem 0 .6rem" }, "p( next | ", h("code", {}, ctxOf() || "∅"), " )");
    tableBox.appendChild(ctxLabel);
    if (!row) {
      tableBox.appendChild(h("div", { class: "callout warn" },
        h("b", {}, "This context never occurs in the corpus. "),
        "Every next token has count 0, so the model gives probability 0 to everything and cannot continue. That is the sparsity problem in one line."));
      bSample.disabled = bArg.disabled = true;
    } else {
      const items = [...row.entries()].sort((a, b) => b[1] - a[1]);
      const tot = items.reduce((s, [, c]) => s + c, 0);
      const bars = h("div", { class: "bars" });
      items.forEach(([w, c]) => {
        const i = h("i"); i.style.width = (100 * c / tot) + "%";
        bars.append(h("span", { class: "lab" }, w), h("span", { class: "bar" }, i), h("span", { class: "val" }, `${c}/${tot} = ${(c / tot).toFixed(2)}`));
      });
      tableBox.appendChild(bars);
      bSample.disabled = bArg.disabled = false;
    }
    const seen = [...table.values()].reduce((s, r) => s + r.size, 0);
    const possible = vocab.length ** order;
    stats.textContent = `V = ${vocab.length} word types. Distinct ${order === 2 ? "bigrams" : "trigrams"} seen: ${seen} of ${possible.toLocaleString()} possible (${(100 * seen / possible).toFixed(1)}%).`;
  }
  orderSel.addEventListener("change", () => { order = +orderSel.value; table = counts(order); reset(); });
  bSample.addEventListener("click", () => next(false));
  bArg.addEventListener("click", () => next(true));
  bReset.addEventListener("click", reset);
  reset();
}

// ── Board 1: how big does the table get? ─────────────────────────────────────
export function tableSize(root) {
  const body = frame(root, "Board 1 — how big is the table?",
    "An n-gram model needs one entry per possible context-and-next-token, V to the power n.",
    "Storage assumes 4 bytes per entry. The arithmetic is exact; the point is how few of those entries any corpus could ever fill.");
  const Vs = [1000, 5000, 10000, 32000, 50000, 100000, 250000];
  let vi = 4, n = 3;
  const s = svg(760, 250, null, "log-scale bar chart of table size by n");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" },
    slider("Vocabulary V", 0, Vs.length - 1, 1, vi, v => { vi = v; draw(); }, v => Vs[v].toLocaleString()),
    slider("Order n", 1, 6, 1, n, v => { n = v; draw(); })), s, read);
  function draw() {
    s.innerHTML = "";
    const V = Vs[vi];
    const maxE = 6 * Math.log10(250000);
    const x0 = 90, w = 640, y0 = 20, bh = 30, gap = 6;
    for (let k = 1; k <= 6; k++) {
      const e = k * Math.log10(V), y = y0 + (k - 1) * (bh + gap);
      text(s, x0 - 10, y + bh / 2 + 4, `n = ${k}`, k === n ? "b" : "m", "end");
      el("rect", { x: x0, y, width: w, height: bh, rx: 4, class: "s-box" }, s);
      el("rect", { x: x0, y, width: Math.max(2, w * e / maxE), height: bh, rx: 4, class: `s-bar ${k === n ? "on" : ""}` }, s);
      text(s, x0 + Math.max(2, w * e / maxE) + 8, y + bh / 2 + 4, `${sci(V ** k)} entries`, k === n ? "o" : "m", "start");
    }
    text(s, x0, 244, "bar length is log-scaled: each step to the right is ×10 more entries", "m", "start");
    const E = V ** n;
    read.innerHTML = `V = ${V.toLocaleString()},  n = ${n}   →   V<sup>n</sup> = <b>${sci(E)}</b> entries   ≈ <b>${bytes(4 * E)}</b> at 4 bytes each`;
  }
  draw();
}

// ── Bengio et al. 2003: a fixed window of embeddings into one MLP ───────────
export function mlp(root) {
  const body = frame(root, "The 2003 neural language model",
    "Embed each word in a fixed window with one shared table C, concatenate, one tanh layer, softmax.",
    "Weights are random and untrained: read the <em>shape</em> of the computation, not the probabilities. Structure after Bengio et al., JMLR 3 (2003), Fig. 1 — redrawn.");
  const sent = ["the", "cat", "sat", "on", "the", "mat"];
  const vocab = ["cat", "mat", "on", "sat", "the"];
  const m = 4, H = 8;
  const r = rng(2003);
  const C = Object.fromEntries(vocab.map(w => [w, Array.from({ length: m }, () => gauss(r) * 0.8)]));
  let win = 3, t = 3;
  const s = svg(760, 470, null, "neural probabilistic language model diagram");
  uid(s);
  const read = h("div", { class: "readout" });
  const tSlider = slider("Predict word", win, sent.length - 1, 1, t, v => { t = v; draw(); }, v => `#${v + 1} “${sent[v]}”`);
  body.append(h("div", { class: "controls" },
    slider("Window n−1", 1, 4, 1, win, v => {
      win = v; tSlider.input.min = win; if (t < win) { t = win; tSlider.input.value = t; tSlider.querySelector("output").textContent = `#${t + 1} “${sent[t]}”`; } draw();
    }), tSlider), s, read);

  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const ctx = sent.slice(t - win, t);
    // sentence strip
    const sw = 96, sx = (760 - sent.length * sw) / 2;
    sent.forEach((w, i) => {
      const inCtx = i >= t - win && i < t, tgt = i === t;
      box(s, sx + i * sw + 6, 422, sw - 12, 32, w, tgt ? "blue" : inCtx ? "on" : "", tgt ? "w b" : inCtx ? "b" : "");
    });
    text(s, 380, 414, "context window (orange) → predict the blue word", "m");
    // per-word lookup → embedding
    const colW = 150, cx0 = 380 - (win * colW) / 2;
    const concat = [];
    el("rect", { x: 60, y: 300, width: 640, height: 40, rx: 6, class: "s-box" }, s);
    text(s, 70, 325, "C  (V × m, shared)", "m", "start");
    ctx.forEach((w, k) => {
      const x = cx0 + k * colW + colW / 2;
      arrow(s, x, 404, x, 342, true);
      const ey = 250, cw = 22;
      arrow(s, x, 300, x, ey + 26);
      C[w].forEach((v, j) => { const rr = el("rect", { x: x - (m * cw) / 2 + j * cw, y: ey, width: cw - 2, height: 24, rx: 3, class: "s-box" }, s); rr.style.fill = divColor(v); });
      text(s, x, ey - 6, `C(“${w}”)`, "m");
      concat.push(...C[w]);
    });
    // concatenation → tanh hidden
    const W = randMat(rng(7 + win), H, win * m, 0.7);
    const hid = matvec(W, concat).map(Math.tanh);
    const U = randMat(rng(11), vocab.length, H, 1.1);
    const p = softmax(matvec(U, hid));
    const hy = 160, hw = 30;
    ctx.forEach((_, k) => arrow(s, cx0 + k * colW + colW / 2, 246, 380, hy + 30));
    hid.forEach((v, j) => { const rr = el("rect", { x: 380 - (H * hw) / 2 + j * hw, y: hy, width: hw - 3, height: 26, rx: 3, class: "s-box" }, s); rr.style.fill = divColor(v); });
    text(s, 380 + (H * hw) / 2 + 12, hy + 18, `tanh hidden, h = ${H}`, "m", "start");
    // softmax
    arrow(s, 380, hy - 2, 380, 118);
    const bw = 88, bx0 = 380 - (vocab.length * bw) / 2;
    el("line", { x1: bx0, y1: 110, x2: bx0 + vocab.length * bw, y2: 110, class: "s-axis" }, s);
    vocab.forEach((w, i) => {
      const x = bx0 + i * bw, bh = Math.max(1, 64 * p[i]);
      el("rect", { x: x + 18, y: 110 - bh, width: bw - 36, height: bh, rx: 2, class: `s-bar ${w === sent[t] ? "on" : ""}` }, s);
      text(s, x + bw / 2, 36, fmt(p[i]), "m");
      text(s, x + bw / 2, 22, w, w === sent[t] ? "o" : "");
    });
    text(s, bx0 - 10, 80, "softmax", "m", "end");
    read.innerHTML = `Concatenated input: ${win} × ${m} = <b>${win * m}</b> numbers.  Hidden weights W: ${H} × ${win * m}.\n` +
      `Make the window longer and the input and W grow with it. A word outside the window has no path to the output at all.`;
  }
  draw();
}

// ── RNN: a state carried forward, and how fast x₁'s influence fades ─────────
export function rnn(root) {
  const body = frame(root, "Recurrence: one hidden state, updated every step",
    "hₜ = tanh(W hₜ₋₁ + U xₜ). Step through it, then change the scale of W.",
    "A real 6-unit tanh RNN with random weights, computed in your browser. The bottom chart is the exact norm of ∂hₜ/∂x₁ — how much the first input can still move the state.");
  const words = ["the", "cat", "that", "the", "dog", "chased", "was", "black"];
  const d = 6, T = 40;
  const r0 = rng(1990);
  const E = Array.from({ length: 12 }, () => Array.from({ length: d }, () => gauss(r0)));
  const W0 = randMat(rng(42), d, d, 1 / Math.sqrt(d));
  const U = randMat(rng(43), d, d, 0.8 / Math.sqrt(d));
  let sigma = 1.0, step = 0, timer = null;
  const s = svg(760, 250, null, "unrolled recurrent network");
  uid(s);
  const chart = svg(760, 170, null, "influence of the first input over time");
  const bStep = h("button", { class: "primary" }, "Step");
  const bPlay = h("button", {}, "Play");
  const bReset = h("button", {}, "Reset");
  body.append(h("div", { class: "controls" }, bStep, bPlay, bReset,
    slider("Scale of W", 0.4, 2.4, 0.05, sigma, v => { sigma = v; draw(); }, v => v.toFixed(2))), s,
    h("h4", {}, "How much can x₁ still change hₜ?"), chart);

  function run() {
    const W = W0.map(row => row.map(v => v * sigma * 1.6));
    const hs = [], infl = [];
    let hprev = Array(d).fill(0), J = null;
    for (let t = 0; t < T; t++) {
      const x = E[t % E.length];
      const hn = add(matvec(W, hprev), matvec(U, x)).map(Math.tanh);
      const D = hn.map(v => 1 - v * v);
      // J = ∂h_t/∂x_1 as a d×d matrix
      if (t === 0) J = U.map((row, i) => row.map(v => v * D[i]));
      else J = W.map((row, i) => J[0].map((_, j) => D[i] * row.reduce((acc, w, k) => acc + w * J[k][j], 0)));
      infl.push(Math.sqrt(J.flat().reduce((a, v) => a + v * v, 0)));
      hs.push(hn); hprev = hn;
    }
    return { hs, infl };
  }
  function draw() {
    const { hs, infl } = run();
    s.innerHTML = ""; arrowDefs(s);
    const n = words.length, cw = 760 / n;
    words.forEach((w, t) => {
      const cx = cw * t + cw / 2, on = t === step, done = t <= step;
      box(s, cx - 34, 196, 68, 30, w, on ? "on" : "", on ? "b" : "");
      text(s, cx, 244, `x${sub(t + 1)}`, "m");
      arrow(s, cx, 194, cx, 138, on);
      const g = el("g", { opacity: done ? 1 : 0.28 }, s);
      el("rect", { x: cx - 36, y: 98, width: 72, height: 38, rx: 6, class: `s-box ${on ? "on" : ""}` }, g);
      hs[t].forEach((v, j) => { const rr = el("rect", { x: cx - 31 + j * 10.5, y: 106, width: 9, height: 22, rx: 2 }, g); rr.style.fill = divColor(v); });
      text(s, cx + 8, 90, `h${sub(t + 1)}`, on ? "o" : "m", "start");
      if (t > 0) arrow(s, cx - cw + 37, 117, cx - 38, 117, on);
      arrow(s, cx, 96, cx, 50, on && done, done ? "" : "faint");
      box(s, cx - 22, 20, 44, 28, `y${sub(t + 1)}`, "", "m");
    });
    // influence chart (log scale)
    chart.innerHTML = "";
    const x0 = 60, y0 = 12, W = 680, Hh = 120;
    const lo = -12, hi = 2;
    el("line", { x1: x0, y1: y0 + Hh, x2: x0 + W, y2: y0 + Hh, class: "s-axis" }, chart);
    for (let e = lo; e <= hi; e += 2) {
      const y = y0 + Hh * (1 - (e - lo) / (hi - lo));
      el("line", { x1: x0, y1: y, x2: x0 + W, y2: y, class: "s-axis", opacity: .5 }, chart);
      text(chart, x0 - 6, y + 4, `1e${e}`, "m", "end");
    }
    const bw = W / T;
    infl.forEach((v, t) => {
      const e = Math.max(lo, Math.min(hi, Math.log10(Math.max(v, 1e-300))));
      const y = y0 + Hh * (1 - (e - lo) / (hi - lo));
      el("rect", { x: x0 + t * bw + 1, y, width: bw - 2, height: y0 + Hh - y, class: `s-bar ${t === step ? "on" : ""}` }, chart);
    });
    text(chart, x0, 160, "step t = 1 … 40", "m", "start");
    const last = infl[T - 1];
    text(chart, x0 + W, 160, `‖∂h₄₀/∂x₁‖ = ${last < 1e-3 || last > 1e3 ? last.toExponential(1) : last.toFixed(3)}`, "o", "end");
  }
  const sub = k => String(k).split("").map(c => "₀₁₂₃₄₅₆₇₈₉"[+c]).join("");
  bStep.addEventListener("click", () => { step = (step + 1) % words.length; draw(); });
  bReset.addEventListener("click", () => { step = 0; draw(); });
  bPlay.addEventListener("click", () => {
    if (timer) { clearInterval(timer); timer = null; bPlay.textContent = "Play"; return; }
    bPlay.textContent = "Pause";
    timer = setInterval(() => { step = (step + 1) % words.length; draw(); }, 700);
  });
  draw();
}

// ── LSTM: the gates, with numbers ────────────────────────────────────────────
export function lstm(root) {
  const body = frame(root, "An LSTM cell: gates decide what the cell state keeps",
    "cₜ = f·cₜ₋₁ + i·g,   hₜ = o·tanh(cₜ). Drag the gates.",
    "Scalar version of one cell so every number is visible. Structure after Graves (2013), Fig. 2 — redrawn.");
  let f = 0.9, i = 0.3, o = 0.8, g = 0.7, c0 = 1.2;
  const s = svg(760, 300, null, "LSTM cell");
  uid(s);
  const read = h("div", { class: "readout" });
  const chart = svg(760, 170, null, "what survives many steps");
  body.append(h("div", { class: "controls" },
    slider("forget f", 0, 1, 0.01, f, v => { f = v; draw(); }, v => v.toFixed(2)),
    slider("input i", 0, 1, 0.01, i, v => { i = v; draw(); }, v => v.toFixed(2)),
    slider("candidate g", -1, 1, 0.01, g, v => { g = v; draw(); }, v => v.toFixed(2)),
    slider("output o", 0, 1, 0.01, o, v => { o = v; draw(); }, v => v.toFixed(2)),
    slider("cₜ₋₁", -2, 2, 0.05, c0, v => { c0 = v; draw(); }, v => v.toFixed(2))),
    s, read, h("h4", {}, "What is left of cₜ₋₁ after T steps, if nothing is added"), chart);

  function draw() {
    const c = f * c0 + i * g, hh = o * Math.tanh(c);
    s.innerHTML = ""; arrowDefs(s);
    el("rect", { x: 150, y: 20, width: 470, height: 250, rx: 14, class: "s-box" }, s);
    const lw = v => 1.2 + 3.5 * Math.min(1, Math.abs(v));
    // cell-state highway
    const top = 60;
    text(s, 40, top + 4, "cₜ₋₁", "b", "start");
    el("line", { x1: 80, y1: top, x2: 268, y2: top, class: "s-edge on", "stroke-width": lw(c0) }, s);
    el("line", { x1: 292, y1: top, x2: 418, y2: top, class: "s-edge on", "stroke-width": lw(f * c0) }, s);
    arrow(s, 442, top, 690, top, true).setAttribute("stroke-width", lw(c));
    text(s, 700, top + 4, "cₜ", "b", "start");
    node(280, top, "×"); node(430, top, "+");
    // gates
    const gy = 200, gates = [["σ", "f", 250, f], ["σ", "i", 345, i], ["tanh", "g", 400, g], ["σ", "o", 520, o]];
    el("line", { x1: 80, y1: 230, x2: 540, y2: 230, class: "s-edge" }, s);
    text(s, 40, 234, "hₜ₋₁, xₜ", "m", "start");
    gates.forEach(([fn, name, x, v]) => {
      el("line", { x1: x, y1: 230, x2: x, y2: gy + 16, class: "s-edge" }, s);
      const b = box(s, x - 24, gy - 16, 48, 32, fn, "on", "b");
      b.querySelector("rect").style.fillOpacity = 0.25 + 0.75 * Math.abs(v);
      text(s, x, 252, `${name} = ${v.toFixed(2)}`, "m");
    });
    arrow(s, 250, gy - 18, 276, top + 14, f > 0.05).setAttribute("stroke-width", lw(f));
    node(372, 130, "×");
    arrow(s, 345, gy - 18, 366, 142, true).setAttribute("stroke-width", lw(i));
    arrow(s, 400, gy - 18, 378, 142, true).setAttribute("stroke-width", lw(g));
    arrow(s, 378, 118, 426, top + 14, true).setAttribute("stroke-width", lw(i * g));
    // output
    el("line", { x1: 560, y1: top, x2: 560, y2: 108, class: "s-edge on" }, s);
    box(s, 532, 108, 56, 28, "tanh", "", "m");
    node(560, 170, "×");
    arrow(s, 560, 136, 560, 158, true);
    arrow(s, 520, gy - 18, 550, 178, true).setAttribute("stroke-width", lw(o));
    arrow(s, 572, 170, 690, 170, true).setAttribute("stroke-width", lw(hh));
    text(s, 700, 174, "hₜ", "b", "start");
    read.innerHTML = `cₜ = f·cₜ₋₁ + i·g = ${f.toFixed(2)}·${c0.toFixed(2)} + ${i.toFixed(2)}·${g.toFixed(2)} = <b>${c.toFixed(3)}</b>\n` +
      `hₜ = o·tanh(cₜ) = ${o.toFixed(2)}·tanh(${c.toFixed(3)}) = <b>${hh.toFixed(3)}</b>\n` +
      `With f = 1 and i = 0 the cell state passes through unchanged: that additive path is what lets gradients survive.`;
    // survival chart: f^T vs a plain RNN whose per-step factor is 0.6
    chart.innerHTML = "";
    const x0 = 50, y0 = 10, W = 690, Hh = 120, T = 50;
    el("line", { x1: x0, y1: y0 + Hh, x2: x0 + W, y2: y0 + Hh, class: "s-axis" }, chart);
    el("line", { x1: x0, y1: y0, x2: x0, y2: y0 + Hh, class: "s-axis" }, chart);
    text(chart, x0 - 6, y0 + 4, "1", "m", "end"); text(chart, x0 - 6, y0 + Hh, "0", "m", "end");
    const path = fn => Array.from({ length: T + 1 }, (_, t) => `${t ? "L" : "M"}${x0 + (W * t) / T},${y0 + Hh * (1 - fn(t))}`).join("");
    const pf = el("path", { d: path(t => f ** t), class: "s-line" }, chart); pf.style.stroke = "var(--orange)";
    const pr = el("path", { d: path(t => 0.6 ** t), class: "s-line" }, chart); pr.style.stroke = "var(--blue-2)"; pr.style.strokeDasharray = "6 4";
    text(chart, x0 + W, y0 + 14, `LSTM cell, f = ${f.toFixed(2)}: ${(f ** T).toExponential(1)} left after 50 steps`, "o", "end");
    text(chart, x0 + W, y0 + 32, "dashed: a plain RNN shrinking by 0.6 per step (stylised)", "m", "end");
    text(chart, x0, 160, "T = 0 … 50", "m", "start");
  }
  function node(x, y, t) {
    el("circle", { cx: x, cy: y, r: 12, class: "s-box on" }, s);
    text(s, x, y + 5, t, "b");
  }
  draw();
}

// ── seq2seq: the bottleneck, then attention as the patch ─────────────────────
export function seq2seq(root) {
  const body = frame(root, "2014–15: the encoder bottleneck, and attention as the fix",
    "Without attention the decoder sees one vector. With it, each decoder step looks back at every encoder state.",
    "Alignment weights are hand-set for illustration, not from a trained model.");
  const src = ["le", "chat", "noir", "dort"], tgt = ["the", "black", "cat", "sleeps"];
  const A = [[0.82, 0.08, 0.06, 0.04], [0.05, 0.12, 0.78, 0.05], [0.06, 0.8, 0.1, 0.04], [0.04, 0.05, 0.07, 0.84]];
  let att = false, j = 0;
  const s = svg(760, 270, null, "sequence to sequence model");
  uid(s);
  const bAtt = h("button", { "aria-pressed": "false" }, "Add attention");
  const bStep = h("button", { class: "primary" }, "Next decoder step");
  body.append(h("div", { class: "controls" }, bAtt, bStep), s);
  bAtt.addEventListener("click", () => { att = !att; bAtt.setAttribute("aria-pressed", att); bAtt.textContent = att ? "Remove attention" : "Add attention"; draw(); });
  bStep.addEventListener("click", () => { j = (j + 1) % tgt.length; draw(); });
  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const ex = k => 40 + k * 82, dx = k => 440 + k * 82, y = 170;
    src.forEach((w, k) => {
      box(s, ex(k), y, 62, 36, "", "", "");
      text(s, ex(k) + 31, y + 60, w, "b");
      arrow(s, ex(k) + 31, y + 44, ex(k) + 31, y + 38);
      if (k) arrow(s, ex(k - 1) + 62, y + 18, ex(k) - 2, y + 18);
    });
    text(s, 40, y + 84, "encoder RNN", "m", "start");
    const cx = 380;
    el("circle", { cx, cy: y + 18, r: 20, class: `s-box ${att ? "" : "on"}` }, s);
    text(s, cx, y + 23, "c", "b");
    arrow(s, ex(3) + 62, y + 18, cx - 22, y + 18, !att);
    arrow(s, cx + 22, y + 18, dx(0) - 2, y + 18, !att);
    if (!att) text(s, cx, y - 16, "everything must fit in c", "o");
    tgt.forEach((w, k) => {
      const on = k === j;
      box(s, dx(k), y, 62, 36, "", on ? "on" : "");
      if (k) arrow(s, dx(k - 1) + 62, y + 18, dx(k) - 2, y + 18);
      arrow(s, dx(k) + 31, y - 2, dx(k) + 31, y - 40, on);
      text(s, dx(k) + 31, y - 48, k <= j ? w : "…", on ? "o" : k < j ? "b" : "m");
    });
    text(s, 440, y + 84, "decoder RNN", "m", "start");
    if (att) {
      src.forEach((_, k) => {
        const wgt = A[j][k];
        const p = el("path", { d: `M${ex(k) + 31},${y} C${ex(k) + 31},${y - 120} ${dx(j) + 31},${y - 120} ${dx(j) + 20},${y}`, class: "s-edge on" }, s);
        p.style.strokeWidth = 0.5 + 7 * wgt; p.style.opacity = 0.25 + 0.75 * wgt;
        text(s, ex(k) + 31, y - 10, wgt.toFixed(2), "m");
      });
      text(s, 20, 26, `decoding “${tgt[j]}”: weights over the four encoder states`, "o", "start");
    } else {
      text(s, 20, 26, "no attention: the decoder only ever sees c", "m", "start");
    }
  }
  draw();
}

// ── Board 2: a chain versus a fan ────────────────────────────────────────────
export function chainFan(root) {
  const body = frame(root, "Board 2 — a chain versus a fan",
    "How far information travels from the first token to the last, and how many steps must run one after another.",
    "Recurrence: n−1 hops and n sequential steps. Self-attention: one hop, all positions at once — at the price of n² pairs.");
  let n = 10;
  const s = svg(760, 330, null, "chain versus fan");
  uid(s);
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("Sequence length n", 3, 24, 1, n, v => { n = v; draw(); })), s, read);
  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const x = k => 40 + (680 * k) / (n - 1), r = Math.max(5, Math.min(12, 180 / n));
    text(s, 20, 24, "RNN / LSTM", "b", "start");
    for (let k = 0; k < n; k++) {
      if (k) arrow(s, x(k - 1) + r, 60, x(k) - r - 2, 60, true);
      el("circle", { cx: x(k), cy: 60, r, class: `s-box ${k === 0 || k === n - 1 ? "on" : ""}` }, s);
    }
    text(s, 380, 100, `path from token 1 to token ${n}: ${n - 1} hops`, "o");
    text(s, 20, 150, "Self-attention (causal)", "b", "start");
    const y = 290;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const on = a === 0 && b === n - 1;
      const mid = (x(a) + x(b)) / 2, hgt = Math.min(120, 12 + (x(b) - x(a)) * 0.36);
      el("path", { d: `M${x(a)},${y - r} Q${mid},${y - r - hgt * 1.6} ${x(b)},${y - r}`, class: `s-edge ${on ? "on" : "faint"}` }, s);
    }
    for (let k = 0; k < n; k++) el("circle", { cx: x(k), cy: y, r, class: `s-box ${k === 0 || k === n - 1 ? "on" : ""}` }, s);
    text(s, 380, 322, `path from token 1 to token ${n}: 1 hop`, "o");
    const pairs = (n * (n + 1)) / 2;
    read.innerHTML = `n = ${n}\n` +
      `            path length   sequential steps to train   pairs compared\n` +
      `RNN / LSTM  ${String(n - 1).padEnd(13)} ${String(n).padEnd(27)} —\n` +
      `Attention   1             1 (all positions at once)    <b>${pairs}</b>  = n(n+1)/2, grows as n²`;
  }
  draw();
}
