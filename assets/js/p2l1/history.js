// Part A — history of generative models: n-gram → MLP → RNN → LSTM → seq2seq → Transformer.
import { el, h, svg, arrowDefs, uid, arrow, box, text, rng, gauss, randMat, matvec, add, norm,
  softmax, divColor, fmt, sci, bytes, slider, frame } from "../lib.js";
import { apa, sortRefs } from "../bib.js";

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
  const Vs = [10, 100, 1000, 5000, 10000, 32000, 50000, 100000, 250000];
  let vi = 6, n = 3, logScale = false;                     // opens at V = 50,000, linear scale
  const s = svg(760, 250, null, "bar chart of table size by n");
  const read = h("div", { class: "readout" });
  const bLog = h("button", { "aria-pressed": "false", onclick: () => { logScale = !logScale; bLog.setAttribute("aria-pressed", logScale); draw(); } }, "Log scale");
  body.append(h("div", { class: "controls" },
    slider("Vocabulary V", 0, Vs.length - 1, 1, vi, v => { vi = v; draw(); }, v => Vs[v].toLocaleString()),
    slider("Order n", 1, 6, 1, n, v => { n = v; draw(); }), bLog), s, read);
  function draw() {
    s.innerHTML = "";
    const V = Vs[vi];
    const maxE = 6 * Math.log10(250000);
    const x0 = 90, w = 640, y0 = 20, bh = 30, gap = 6;
    // rows 1 … n only. log: length ∝ log10(V^k) on a fixed axis; linear: length ∝ V^k, with V^n filling the width
    const len = k => logScale ? w * k * Math.log10(V) / maxE : w * V ** (k - n);
    for (let k = 1; k <= n; k++) {
      const y = y0 + (k - 1) * (bh + gap), bw = Math.min(w, Math.max(2, len(k)));
      text(s, x0 - 10, y + bh / 2 + 4, `n = ${k}`, k === n ? "b" : "m", "end");
      el("rect", { x: x0, y, width: w, height: bh, rx: 4, class: "s-box" }, s);
      el("rect", { x: x0, y, width: bw, height: bh, rx: 4, class: `s-bar ${k === n ? "on" : ""}` }, s);
      const inside = bw > w - 150;                          // a full bar carries its label inside, in white
      text(s, inside ? x0 + bw - 8 : x0 + bw + 8, y + bh / 2 + 4, `${sci(V ** k)} entries`, inside ? "w" : k === n ? "o" : "m", inside ? "end" : "start");
    }
    text(s, x0, 244, logScale ? "log scale: each step to the right is ×10 more entries"
      : n === 1 ? "linear scale" : `linear scale: n = ${n} fills the width; n = ${n - 1} is 1/${V.toLocaleString()} of it${V >= 1000 ? ", too small to see" : ""}`, "m", "start");
    const E = V ** n;
    read.innerHTML = `V = ${V.toLocaleString()},  n = ${n}   →   V<sup>n</sup> = <b>${sci(E)}</b> entries   ≈ <b>${bytes(4 * E)}</b> at 4 bytes each`;
  }
  draw();
}

// ── Bengio et al. 2003: a fixed window of embeddings into one MLP ───────────
// Left to right, the steps of eq. 1 in the paper (with the optional direct connections
// W set to zero): look up a row of C per context word, concatenate, Hx + d, tanh,
// Uh + b, softmax. H has one block of columns per window slot, so its width is the
// window: a longer window is a different, retrained model, and a word outside the
// window has no slot at all.
export function mlp(root) {
  const body = frame(root, "NPLM (2003): the neural probabilistic language model",
    "Look up each context word's row of C, concatenate, Hx + d, tanh, Uh + b, softmax.",
    "Weights are random and untrained: read the <em>shape</em> of the computation, not the probabilities. Eq. 1 of <a data-ref=\"bengio2003\">Bengio et al. (2003)</a> with its optional direct connections set to zero; redrawn.");
  const sent = ["the", "cat", "sat", "on", "the", "mat"];
  const vocab = ["cat", "mat", "on", "sat", "the"];
  const m = 4, Hn = 8;
  const r = rng(2003);
  const C = Object.fromEntries(vocab.map(w => [w, Array.from({ length: m }, () => gauss(r) * 0.8)]));
  let win = 3, t = 5;
  const s = svg(1180, 246, null, "neural probabilistic language model, left to right");
  uid(s);
  const read = h("div", { class: "readout" });
  const tSlider = slider("Predict word", win, sent.length - 1, 1, t, v => { t = v; draw(); }, v => `#${v + 1} “${sent[v]}”`);
  body.append(h("div", { class: "controls" },
    slider("Window n−1", 1, 4, 1, win, v => {
      win = v; tSlider.input.min = win; if (t < win) { t = win; tSlider.input.value = t; tSlider.querySelector("output").textContent = `#${t + 1} “${sent[t]}”`; } draw();
    }), tSlider), s, read);

  const cells = (x, y, vals, cw, ch, vertical) => vals.forEach((v, j) => {
    const rr = el("rect", { x: vertical ? x : x + j * cw, y: vertical ? y + j * ch : y, width: cw - 2, height: ch - 2, rx: 2, class: "s-box" }, s);
    rr.style.fill = divColor(v);
  });

  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const MID = 128;
    const ctx = sent.slice(t - win, t);
    // the sentence: window in orange, outside in grey and crossed out, next word in blue
    sent.forEach((w, i) => {
      const inCtx = i >= t - win && i < t, tgt = i === t, out = i < t - win, x = 10 + i * 74;
      if (i > t) return;
      box(s, x, 6, 66, 28, w, tgt ? "blue" : inCtx ? "on" : "", tgt ? "w b" : inCtx ? "b" : "m");
      if (out) el("line", { x1: x + 8, y1: 20, x2: x + 58, y2: 20, stroke: "var(--muted)", "stroke-width": 1.5 }, s);
    });
    const outN = t - win;
    text(s, 10 + (t + 1) * 74 + 8, 25, outN > 0
      ? `grey: outside the window. No slot, so ${outN === 1 ? "it" : "they"} cannot change the prediction.`
      : "orange: the n−1 words in the window · blue: the word to predict", "m", "start");

    // ① look up one row of C per slot
    const top = 44, bot = 212, rowH = Math.min(62, (bot - top) / win), y0 = (top + bot) / 2 - (rowH * win) / 2;
    const xc = Math.min(12, (bot - top - 20) / (win * m)), xTop = (top + bot) / 2 - (win * m * xc) / 2;
    ctx.forEach((w, k) => {
      const cy = y0 + rowH * k + rowH / 2;
      text(s, 51, cy - 17, `w(t−${win - k})`, "m");
      box(s, 12, cy - 13, 78, 26, w, "on", "b");
      arrow(s, 94, cy, 150, cy, true);
      text(s, 122, cy - 6, "row of C", "m");
      cells(154, cy - 9, C[w], 18, 18, false);
      text(s, 190, cy + 22, `C(“${w}”)`, "m");
      // ② concatenate into x
      const segY = xTop + k * m * xc + (m * xc) / 2;
      arrow(s, 230, cy, 262, segY);
    });
    const concat = ctx.flatMap(w => C[w]);
    cells(266, xTop, concat, 18, xc, true);
    for (let k = 1; k < win; k++) el("line", { x1: 262, x2: 288, y1: xTop + k * m * xc - 1, y2: xTop + k * m * xc - 1, stroke: "var(--orange)", "stroke-width": 1.5 }, s);
    text(s, 275, xTop - 8, "x", "b");

    // ③ H x + d — H has one block of m columns per slot
    const W = randMat(rng(7 + win), Hn, win * m, 0.7);
    const gc = 11, gx = 330, gy = MID - (Hn * gc) / 2;
    arrow(s, 290, MID, gx - 6, MID, true);
    W.forEach((row, i) => row.forEach((v, j) => {
      const rr = el("rect", { x: gx + j * gc, y: gy + i * gc, width: gc - 1, height: gc - 1, class: "s-box" }, s);
      rr.style.fill = divColor(v);
    }));
    for (let k = 0; k < win; k++) {
      const bx = gx + k * m * gc;
      el("rect", { x: bx, y: gy - 9, width: m * gc - 1, height: 5, fill: "var(--orange)", opacity: 0.35 + 0.65 * (k + 1) / win }, s);
      if (k) el("line", { x1: bx - 0.5, x2: bx - 0.5, y1: gy - 10, y2: gy + Hn * gc, stroke: "var(--orange)", "stroke-width": 1.5 }, s);
    }
    const gw = win * m * gc;
    text(s, gx + gw / 2, gy - 16, `H: ${Hn} × ${win * m}`, "b");
    text(s, gx + gw / 2, gy + Hn * gc + 16, "one block per slot", "m");
    const pre = matvec(W, concat);
    const hid = pre.map(Math.tanh);

    // ④ tanh, element by element, gives h
    const ax = gx + gw + 8;
    arrow(s, ax, MID, ax + 34, MID, true);
    text(s, ax + 17, MID - 8, "+ d", "m");
    box(s, ax + 38, MID - 14, 52, 28, "tanh", "", "b");
    arrow(s, ax + 94, MID, ax + 122, MID, true);
    const hx = ax + 126, hy = MID - (Hn * 14) / 2;
    cells(hx, hy, hid, 18, 14, true);
    text(s, hx + 9, hy - 8, "h", "b");

    // ⑤ U h + b, ⑥ softmax
    const U = randMat(rng(11), vocab.length, Hn, 0.15);  // small, as at initialisation: close to uniform
    const p = softmax(matvec(U, hid));
    const ux = hx + 28;
    arrow(s, ux, MID, ux + 30, MID, true);
    box(s, ux + 34, MID - 14, 76, 28, "Uh + b", "", "b");
    arrow(s, ux + 114, MID, ux + 142, MID, true);
    box(s, ux + 146, MID - 14, 84, 28, "softmax", "", "b");
    arrow(s, ux + 234, MID, ux + 262, MID, true);
    const bx0 = ux + 330, bw = 1170 - bx0 - 50;
    vocab.forEach((w, i) => {
      const y = MID - (vocab.length * 26) / 2 + i * 26;
      text(s, bx0 - 8, y + 16, w, w === sent[t] ? "o" : "", "end");
      el("rect", { x: bx0, y: y + 4, width: Math.max(2, bw * p[i]), height: 16, rx: 2, class: `s-bar ${w === sent[t] ? "on" : ""}` }, s);
      text(s, bx0 + Math.max(2, bw * p[i]) + 6, y + 16, fmt(p[i]), "m", "start");
    });
    text(s, bx0 + bw / 2 - 20, MID - (vocab.length * 26) / 2 - 8, "P(next word), untrained: near uniform", "m");

    // step labels along the bottom
    [[51 + 70, "① look up a row of C"], [275, "② concatenate"], [gx + gw / 2, "③ Hx + d"], [ax + 64, "④ tanh"], [ux + 72, "⑤ Uh + b"], [ux + 188, "⑥ softmax"]]
      .forEach(([x, lab]) => text(s, x, 238, lab, "m"));

    read.innerHTML = `Window n−1 = ${win}: x holds ${win} × ${m} = <b>${win * m}</b> numbers, so H is ${Hn} × ${win * m}. ` +
      `A longer window means a wider H: a different model, trained again. ` +
      (outN > 0 ? `The grey word${outN > 1 ? "s have" : " has"} no slot, so nothing about ${outN > 1 ? "them" : "it"} reaches the output.` : "");
  }
  draw();
}

// ── RNN: a state carried forward, and how fast x₁'s influence fades ─────────
export function rnn(root) {
  const body = frame(root, "RNN: one hidden state, updated every step",
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
    "Scalar version of one cell so every number is visible. Structure after <a data-ref=\"graves2013\">Graves (2013)</a>, Fig. 2 — redrawn.");
  let f = 0.9, i = 0.3, o = 0.8, g = 0.7, c0 = 1.2;
  const s = svg(960, 322, null, "LSTM cell with its forget, input and output gates");
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
    const lw = v => 1.4 + 3.2 * Math.min(1, Math.abs(v));
    const line = (pts, on, w) => el("polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", class: `s-edge ${on ? "on" : ""}`, "stroke-width": w || 1.6 }, s);
    const into = (pts, on, w) => { const l = line(pts, on, w); l.setAttribute("marker-end", `url(#${on ? "ah-on" : "ah"}${s.dataset.uid})`); return l; };
    const dot = (x, y) => el("circle", { cx: x, cy: y, r: 3.5, fill: "var(--muted)" }, s);
    const node = (x, y, t) => { el("circle", { cx: x, cy: y, r: 13, class: "s-box on" }, s); text(s, x, y + 5, t, "b"); };
    const gate = (x, y, fn, v, w = 56) => {
      const b = box(s, x - w / 2, y - 17, w, 34, fn, fn === "σ" ? "on" : "", "b");
      b.querySelector("rect").style.fillOpacity = 0.25 + 0.75 * Math.abs(v);
    };
    const region = (x, y, w, hgt, name, color) => {
      el("rect", { x, y, width: w, height: hgt, rx: 10, fill: "none", stroke: color, "stroke-width": 1.6, "stroke-dasharray": "6 4" }, s);
      text(s, x + 8, y + 17, name, "b", "start").setAttribute("style", `fill: ${color}`);
    };
    const YC = 58, YB = 276, GY = 204;                       // cell-state line, input bus, gate row
    const XF = 290, XI = 410, XG = 510, XO = 690, XT = 790;  // forget, input, candidate, output, tanh(c)

    el("rect", { x: 92, y: 26, width: 790, height: 272, rx: 16, class: "s-box" }, s);
    region(148, 88, 186, 160, "Forget gate", "var(--blue-2)");
    region(352, 88, 250, 160, "Input gate", "var(--orange-2)");
    region(622, 74, 222, 174, "Output gate", "var(--good)");

    // cell state: the highway along the top, touched only by × and +
    text(s, 14, YC + 5, "cₜ₋₁", "b", "start");
    line([[48, YC], [XF - 13, YC]], true, lw(c0));
    line([[XF + 13, YC], [XG - 13, YC]], true, lw(f * c0));
    into([[XG + 13, YC], [920, YC]], true, lw(c));
    text(s, 928, YC + 5, "cₜ", "b", "start");
    text(s, (XF + XG) / 2, YC - 12, "cell state", "o");
    node(XF, YC, "×"); node(XG, YC, "+");

    // input bus: hₜ₋₁ from the left, xₜ from below, feeding all four gates
    text(s, 14, YB + 5, "hₜ₋₁", "b", "start");
    line([[48, YB], [XO, YB]]);
    line([[120, 318], [120, YB]]); dot(120, YB);
    text(s, 130, 318, "xₜ", "b", "start");
    for (const x of [XF, XI, XG, XO]) { line([[x, YB], [x, GY + 17]]); dot(x, YB); }

    // forget gate: fₜ multiplies the old cell state
    gate(XF, GY, "σ", f);
    into([[XF, GY - 17], [XF, YC + 14]], f > 0.05, lw(f));
    text(s, XF - 8, 158, `fₜ = ${f.toFixed(2)}`, "m", "end");

    // input gate: iₜ scales the candidate gₜ; the product is added to the cell state
    gate(XI, GY, "σ", i); gate(XG, GY, "tanh", g);
    node(XG, 140, "×");
    into([[XI, GY - 17], [XI, 140], [XG - 14, 140]], true, lw(i));
    into([[XG, GY - 17], [XG, 140 + 14]], true, lw(g));
    into([[XG, 140 - 13], [XG, YC + 14]], true, lw(i * g));
    text(s, XI + 8, 176, `iₜ = ${i.toFixed(2)}`, "m", "start");
    text(s, XG + 8, 178, `gₜ = ${g.toFixed(2)}`, "m", "start");

    // output gate: oₜ scales tanh(cₜ) to give hₜ
    gate(XO, GY, "σ", o);
    line([[XT, YC], [XT, 90]], true);
    gate(XT, 104, "tanh", Math.tanh(c), 60);
    node(XT, 156, "×");
    into([[XT, 118], [XT, 156 - 14]], true);
    into([[XO, GY - 17], [XO, 156], [XT - 14, 156]], true, lw(o));
    text(s, XO + 8, 180, `oₜ = ${o.toFixed(2)}`, "m", "start");
    into([[XT + 13, 156], [862, 156], [862, YB], [920, YB]], true, lw(hh));
    text(s, 928, YB + 5, "hₜ", "b", "start");

    text(s, 882, 318, "σ: sigmoid, 0 to 1  ·  tanh: −1 to 1  ·  ×: multiply  ·  +: add", "m", "end");
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
  draw();
}

// ── seq2seq: the bottleneck, then attention as the patch ─────────────────────
export function seq2seq(root) {
  const body = frame(root, "Seq2seq: the encoder bottleneck, and attention as the fix",
    "Without attention the decoder sees one vector. With it, each decoder step looks back at every encoder state.",
    "Alignment weights are hand-set for illustration, not from a trained model.");
  const src = ["le", "chat", "noir", "dort"], tgt = ["the", "black", "cat", "sleeps"];
  const A = [[0.82, 0.08, 0.06, 0.04], [0.05, 0.12, 0.78, 0.05], [0.06, 0.8, 0.1, 0.04], [0.04, 0.05, 0.07, 0.84]];
  const sub = k => String(k).split("").map(c => "₀₁₂₃₄₅₆₇₈₉"[+c]).join("");
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
    // encoder states h_1 … h_4, the symbols of the formula
    src.forEach((w, k) => {
      box(s, ex(k), y, 62, 36, `h${sub(k + 1)}`, "", "b");
      text(s, ex(k) + 31, y + 60, w, "b");
      arrow(s, ex(k) + 31, y + 44, ex(k) + 31, y + 38);
      if (k) arrow(s, ex(k - 1) + 62, y + 18, ex(k) - 2, y + 18);
    });
    text(s, 40, y + 84, "encoder RNN: states hⱼ", "m", "start");
    const cx = 380;
    if (!att) {                                            // no attention: one fixed c for every step
      el("circle", { cx, cy: y + 18, r: 20, class: "s-box on" }, s);
      text(s, cx, y + 23, "c", "b");
      arrow(s, ex(3) + 62, y + 18, cx - 22, y + 18, true);
      arrow(s, cx + 22, y + 18, dx(0) - 2, y + 18, true);
      text(s, cx + 14, y - 14, "everything must fit in c", "o", "end");
    } else arrow(s, ex(3) + 62, y + 18, dx(0) - 2, y + 18);
    // decoder states s_1 … s_4, each emitting a word y_i
    tgt.forEach((w, k) => {
      const on = k === j;
      box(s, dx(k), y, 62, 36, `s${sub(k + 1)}`, on ? "on" : "", on ? "b" : "");
      if (k) arrow(s, dx(k - 1) + 62, y + 18, dx(k) - 2, y + 18);
      arrow(s, dx(k) + 31, y - 2, dx(k) + 31, y - 40, on);
      text(s, dx(k) + 31, y - 48, k <= j ? `y${sub(k + 1)} = ${w}` : "…", on ? "o" : k < j ? "b" : "m");
    });
    text(s, 440, y + 84, "decoder RNN: states sᵢ", "m", "start");
    if (att) {
      // weights α_ij over the encoder states flow into the context c_i, which feeds s_i
      const i = j + 1, qx = dx(j) - 36, qy = 82;
      src.forEach((_, k) => {
        const wgt = A[j][k];
        const p = el("path", { d: `M${ex(k) + 31},${y} C${ex(k) + 31},${y - 110} ${qx - 60},${qy} ${qx - 16},${qy}`, fill: "none", class: "s-edge on" }, s);
        p.style.strokeWidth = 0.5 + 7 * wgt; p.style.opacity = 0.25 + 0.75 * wgt;
        text(s, ex(k) + 31, y - 10, `α${sub(i)}${sub(k + 1)} = ${wgt.toFixed(2)}`, "m");
      });
      el("circle", { cx: qx, cy: qy, r: 16, class: "s-box on" }, s);
      text(s, qx, qy + 5, `c${sub(i)}`, "b");
      arrow(s, qx + 10, qy + 13, dx(j) + 6, y - 2, true);
      text(s, 20, 26, `decoding y${sub(i)}: c${sub(i)} = Σⱼ α${sub(i)}ⱼ hⱼ, then s${sub(i)} = f(s${sub(i - 1)}, y${sub(i - 1)}, c${sub(i)})`, "o", "start");
    } else {
      text(s, 20, 26, "no attention: the decoder only ever sees c", "m", "start");
    }
  }
  draw();
}

// ── Board 2: a chain versus a fan ────────────────────────────────────────────
export function chainFan(root) {
  const body = frame(root, "Board 2 — RNN chain versus attention fan",
    "How far information travels from the first token to the last, and how many steps must run one after another. Press Run to compute every position both ways.",
    "Recurrence: n−1 hops and n sequential steps. Self-attention: one hop, all positions at once — at the price of n² pairs.");
  let n = 10, tick = 0, timer = null;
  const s = svg(760, 330, null, "chain versus fan");
  uid(s);
  const read = h("div", { class: "readout" });
  const bRun = h("button", { class: "primary" }, "Run: compute every position");
  const len = slider("Sequence length n", 3, 24, 1, n, v => { n = v; stop(); tick = 0; draw(); });
  body.append(h("div", { class: "controls" }, len, bRun), s, read);
  function stop() { if (timer) clearInterval(timer); timer = null; }
  bRun.addEventListener("click", () => {
    stop(); tick = 0; draw();
    timer = setInterval(() => { tick++; draw(); if (tick >= n) stop(); }, Math.max(120, 2400 / n));
  });
  function draw() {
    s.innerHTML = ""; arrowDefs(s);
    const x = k => 40 + (680 * k) / (n - 1), r = Math.max(5, Math.min(12, 180 / n));
    const running = tick > 0;
    text(s, 20, 24, "RNN / LSTM", "b", "start");
    for (let k = 0; k < n; k++) {
      if (k) arrow(s, x(k - 1) + r, 60, x(k) - r - 2, 60, !running || k < tick);
      el("circle", { cx: x(k), cy: 60, r, class: `s-box ${running ? (k < tick ? "on" : "") : k === 0 || k === n - 1 ? "on" : ""}` }, s);
    }
    text(s, 380, 100, running ? `sequential step ${Math.min(tick, n)} of ${n}${tick >= n ? ": done" : ""}` : `path from token 1 to token ${n}: ${n - 1} hops`, "o");
    text(s, 20, 150, "Self-attention (causal)", "b", "start");
    const y = 290;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const on = running || (a === 0 && b === n - 1);
      const mid = (x(a) + x(b)) / 2, hgt = Math.min(120, 12 + (x(b) - x(a)) * 0.36);
      const p = el("path", { d: `M${x(a)},${y - r} Q${mid},${y - r - hgt * 1.6} ${x(b)},${y - r}`, class: `s-edge ${on ? "on" : "faint"}` }, s);
      if (running && !(a === 0 && b === n - 1)) { p.style.strokeWidth = 1; p.style.opacity = 0.45; }
    }
    for (let k = 0; k < n; k++) el("circle", { cx: x(k), cy: y, r, class: `s-box ${running || k === 0 || k === n - 1 ? "on" : ""}` }, s);
    text(s, 380, 322, running ? "step 1 of 1: every position at once, one matrix product" : `path from token 1 to token ${n}: 1 hop`, "o");
    const pairs = (n * (n + 1)) / 2;
    read.innerHTML = `n = ${n}\n` +
      `            path length   sequential steps to train   pairs compared\n` +
      `RNN / LSTM  ${String(n - 1).padEnd(13)} ${String(n).padEnd(27)} —\n` +
      `Attention   1             1 (all positions at once)    <b>${pairs}</b>  = n(n+1)/2, grows as n²`;
  }
  draw();
}

// ── History reel: one sketch per timeline step, the list rolling beneath ────
// Mounts on an element that already holds the <ol> timeline: each <li> names its
// sketch in data-arch and cites its papers with <a data-ref>. Circles are tokens or
// vectors, lines are weights. These are sketches, not redrawn paper figures.
const TOKEN = ["#ef7c00", "#1f7a4d", "#7b4fb3", "#b3261e", "#138086", "#a15c00"];

// an element that fades in at step d when its frame comes to the front
function flow(e, d) {
  if (d !== undefined) { e.classList.add("flow"); e.style.setProperty("--d", d); }
  return e;
}
const dot = (s, x, y, r, cls, d) => flow(el("circle", { cx: x, cy: y, r, class: `r-node ${cls}` }, s), d);
const wire = (s, x1, y1, x2, y2, cls, d) => flow(el("line", { x1, y1, x2, y2, class: `r-edge ${cls}` }, s), d);
const arc = (s, x1, y1, qx, qy, x2, y2, cls, d) =>
  flow(el("path", { d: `M${x1},${y1} Q${qx},${qy} ${x2},${y2}`, class: `r-edge ${cls}` }, s), d);
const label = (s, x, y, t, cls, d) => flow(el("text", { x, y, class: `r-label ${cls}`, text: t }, s), d);

// the seq2seq and Transformer sketches share one encoder–decoder layout, so they differ only in wiring
const ED = { enc: [42, 94, 146, 198], dec: [268, 316, 364], yt: 200, yh: 140 };
function encDec(s) {
  flow(el("rect", { x: 14, y: 102, width: 210, height: 118, rx: 14, class: "r-group" }, s), 0);
  flow(el("rect", { x: 240, y: 102, width: 148, height: 118, rx: 14, class: "r-group" }, s), 0);
  label(s, 119, 238, "encoder", "m", 0);
  label(s, 314, 238, "decoder", "m", 0);
}

const ARCH = {
  // 1948: the next token is read off the last n−1 tokens; anything earlier plays no part
  ngram(s) {
    const xs = [50, 125, 200, 275, 350], y = 175;
    wire(s, 180, 212, 295, 212, "win", 0);
    arc(s, 200, 153, 275, 35, 350, 153, "on", 1);
    arc(s, 275, 153, 312, 95, 350, 153, "on", 1);
    xs.forEach((x, k) => dot(s, x, y, 20, k < 2 ? "tok faint" : k < 4 ? "tok" : "out", k < 4 ? 0 : 2));
  },
  // 1990: one hidden state, passed along the chain
  srn(s) {
    const xs = [65, 155, 245, 335];
    xs.forEach((x, t) => {
      if (t) wire(s, xs[t - 1], 130, x, 130, "on", 2 * t + 1);
      wire(s, x, 212, x, 130, "", 2 * t);
      wire(s, x, 130, x, 48, "", 2 * t + 1);
    });
    xs.forEach((x, t) => { dot(s, x, 212, 15, "tok", 2 * t); dot(s, x, 130, 22, "h", 2 * t + 1); dot(s, x, 48, 13, "out", 2 * t + 2); });
  },
  // 1997: one cell, opened up. The cell state runs straight through and is touched only
  // where the gates act: f scales it, i × g is added to it, o decides what leaves as h
  lstm(s) {
    const yc = 42, yg = 138, yb = 208, G = { f: 118, i: 182, g: 240, o: 304 }, add = 211, yi = 95, xo = 356;
    label(s, 64, 22, "cell state", "m", 0);
    wire(s, 12, yc, G.f, yc, "on thick", 0);
    wire(s, G.f, yc, add, yc, "on thick", 3);
    wire(s, add, yc, 388, yc, "on thick", 4);
    wire(s, 12, yb, G.o, yb, "", 0);
    wire(s, 58, 236, 58, yb, "", 0);
    Object.values(G).forEach(x => wire(s, x, yb, x, yg, "", 1));
    wire(s, G.f, yg, G.f, yc, "", 2);
    wire(s, G.i, yg, add, yi, "", 2);
    wire(s, G.g, yg, add, yi, "", 2);
    wire(s, add, yi, add, yc, "", 2);
    wire(s, xo, yc, xo, yg, "", 5);
    wire(s, G.o, yg, xo, yg, "", 5);
    flow(el("polyline", { points: `${xo},${yg} ${xo},${yb} 388,${yb}`, class: "r-edge on" }, s), 6);
    dot(s, 58, 236, 9, "tok", 0);
    label(s, 22, 190, "h", "m", 0);
    [["f", G.f], ["i", G.i], ["o", G.o]].forEach(([t, x]) => { dot(s, x, yg, 18, "gate", 1); label(s, x, yg, t, "o", 1); });
    dot(s, G.g, yg, 18, "h", 1); label(s, G.g, yg, "g", "w", 1);
    [[G.f, yc, "×", 2], [add, yi, "×", 2], [add, yc, "+", 3], [xo, yg, "×", 5]]
      .forEach(([x, y, t, d]) => { dot(s, x, y, 12, "op", d); label(s, x, y, t, "", d); });
  },
  // 2003: a fixed window of word vectors (one shared table: one colour) into an MLP
  nplm(s) {
    const pairs = [[45, 85], [180, 220], [315, 355]], hid = [95, 165, 235, 305], out = [50, 100, 150, 200, 250, 300, 350];
    pairs.flat().forEach(x => hid.forEach(hx => wire(s, x, 212, hx, 130, "faint", 1)));
    hid.forEach(hx => out.forEach(ox => wire(s, hx, 130, ox, 45, "faint", 3)));
    pairs.forEach(([a, b]) => wire(s, a, 212, b, 212, "pair", 0));
    pairs.flat().forEach(x => dot(s, x, 212, 15, "emb", 0));
    hid.forEach(x => dot(s, x, 130, 20, "h", 2));
    out.forEach((x, k) => dot(s, x, 45, 14, k === 4 ? "out" : "tok", 4));
  },
  // 2010: an RNN trained to predict the next word; each output is the next input
  rnnlm(s) {
    const xs = [65, 155, 245, 335];
    xs.forEach((x, t) => {
      if (t) wire(s, xs[t - 1], 130, x, 130, "on", 2 * t + 1);
      wire(s, x, 212, x, 130, "", 2 * t);
      wire(s, x, 130, x, 48, "", 2 * t + 1);
      if (t < 3) wire(s, x + 16, 58, xs[t + 1] - 12, 200, "faint dash", 2 * t + 2);
    });
    xs.forEach((x, t) => {
      const i = dot(s, x, 212, 15, "tok", 2 * t), o = dot(s, x, 48, 15, "tok", 2 * t + 2);
      i.style.fill = i.style.stroke = TOKEN[t];
      o.style.fill = o.style.stroke = TOKEN[t + 1];
      dot(s, x, 130, 22, "h", 2 * t + 1);
    });
  },
  // 2014: two RNNs, an encoder and a decoder, joined by one vector; then attention lets
  // the decoder read a weighted sum c of every encoder state
  seq2seq(s) {
    const { enc, dec, yt, yh } = ED, w = [0.08, 0.2, 0.6, 0.12], c = 316;
    encDec(s);
    enc.forEach((x, k) => { if (k) wire(s, enc[k - 1], yh, x, yh, "", k); wire(s, x, yt, x, yh, "", k); });
    wire(s, enc[3], yh, dec[0], yh, "thick", 4);
    dec.forEach((x, k) => { if (k) wire(s, dec[k - 1], yh, x, yh, "", 5 + k); wire(s, x, yt, x, yh, "", 5 + k); });
    enc.forEach((x, k) => {
      const a = arc(s, x, yh - 17, (x + c) / 2, 36, c, 52, "attn", 8);
      a.style.strokeWidth = 1.5 + 8 * w[k];
      a.style.opacity = 0.35 + w[k];
    });
    wire(s, c, 52, c, yh, "on", 9);
    enc.forEach((x, k) => { dot(s, x, yt, 9, "tok", k); dot(s, x, yh, 17, "h", k); });
    dec.forEach((x, k) => { dot(s, x, yt, 9, "out", 5 + k); dot(s, x, yh, 17, "dec", 5 + k); });
    dot(s, c, 52, 14, "ctx", 8); label(s, c, 52, "c", "w", 8);
  },
  // 2017: the same encoder and decoder with the recurrence removed. Each encoder state reads
  // every source token, each decoder state every earlier target token, and every decoder
  // state reads every encoder state: all positions at once
  transformer(s) {
    const { enc, dec, yt, yh } = ED;
    encDec(s);
    enc.forEach(x => enc.forEach(xt => wire(s, xt, yt, x, yh, "faint", 1)));
    dec.forEach((x, i) => dec.slice(0, i + 1).forEach(xt => wire(s, xt, yt, x, yh, "faint", 1)));
    dec.forEach(xd => enc.forEach(xe => {
      const a = arc(s, xe, yh - 17, (xe + xd) / 2, yh - 17 - (xd - xe) * 0.75, xd, yh - 17, "attn", 3);
      a.style.strokeWidth = 1.6;
      a.style.opacity = 0.55;
    }));
    enc.forEach(x => { dot(s, x, yt, 9, "tok", 0); dot(s, x, yh, 17, "h", 2); });
    dec.forEach(x => { dot(s, x, yt, 9, "out", 0); dot(s, x, yh, 17, "dec", 2); });
  },
  // 2018–20: the 2017 layout with the encoder removed. The decoder box, its tokens and its causal
  // wiring stay exactly where they were in 2017, so the only change is the missing encoder;
  // each position now predicts the next token. Left, in the freed space: the same design at three sizes
  gpt(s) {
    const { dec, yt, yh } = ED, yo = 52;
    flow(el("rect", { x: 14, y: 102, width: 210, height: 118, rx: 14, class: "r-group gone" }, s), 0);
    label(s, 119, 238, "no encoder", "m", 0);
    flow(el("rect", { x: 240, y: 102, width: 148, height: 118, rx: 14, class: "r-group" }, s), 0);
    label(s, 314, 238, "decoder", "m", 0);
    dec.forEach((x, i) => dec.slice(0, i + 1).forEach(xt => wire(s, xt, yt, x, yh, "faint", 1)));
    dec.forEach(x => wire(s, x, yh - 17, x, yo + 9, "", 3));
    dec.forEach((x, k) => {
      dot(s, x, yt, 9, "out", 0); dot(s, x, yh, 17, "dec", 2);
      const o = dot(s, x, yo, 9, "tok", 4); o.style.fill = o.style.stroke = TOKEN[k + 1];
    });
    label(s, 316, 24, "next token", "o", 4);
    // GPT 117M, GPT-2 1.5B, GPT-3 175B parameters; radius ∝ parameters^¼
    [[117e6, 58], [1.5e9, 96], [175e9, 156]].forEach(([p, x], k) => {
      const r = 5 * Math.pow(p / 117e6, 0.25);
      dot(s, x, 196 - r, r, "h", 6 + k);
    });
    label(s, 119, 118, "GPT → GPT-3: ×1,500", "o sm", 8);
  },
};

export function historyReel(root) {
  const list = root.querySelector("ol");
  if (!list) throw new Error("historyReel needs an <ol> timeline inside it");
  const items = [...list.children];
  root.classList.add("reel");
  const stage = h("div", { class: "reel-stage", title: "Click the middle sketch for the next step; click a side sketch to jump" });
  const frames = items.map((li, k) => {
    const draw = ARCH[li.dataset.arch];
    if (!draw) throw new Error(`no sketch named “${li.dataset.arch}”`);
    const s = svg(400, 250, null, li.textContent.trim());
    draw(s);
    const f = h("figure", { class: "reel-frame" }, s, h("figcaption", {}, li.querySelector(".yr")?.textContent || ""));
    f.addEventListener("click", () => jump(k === cur ? cur + 1 : k));
    stage.appendChild(f);
    return f;
  });
  // stepped by hand, never on a timer
  const bPrev = h("button", { onclick: () => jump(cur - 1) }, "◀ Back");
  const bNext = h("button", { class: "primary", onclick: () => jump(cur + 1) }, "Next step ▶");
  const count = h("span", { class: "reel-count" });
  const ctrl = h("div", { class: "controls reel-controls" }, bPrev, bNext, count);
  const win = h("div", { class: "reel-list" });
  list.before(stage, win);
  win.appendChild(list);
  win.after(ctrl);
  items.forEach((li, k) => li.addEventListener("click", e => { if (!e.target.closest("a")) jump(k); }));

  const slide = root.closest(".slide");
  const refs = slide && slide.querySelector(".refs.live");
  let cur = 0;

  function go(k) {
    cur = k;
    const gap = stage.clientWidth * 0.37;
    frames.forEach((f, i) => {
      const off = i - cur, a = Math.abs(off);
      f.style.transform = `translateX(calc(-50% + ${off * gap}px)) scale(${a ? 0.66 : 1})`;
      f.style.opacity = a === 0 ? 1 : a === 1 ? 0.38 : 0;
      f.classList.toggle("cur", a === 0);
    });
    const f = frames[cur];
    f.classList.remove("cur"); void f.getBoundingClientRect(); f.classList.add("cur"); // replay the build-up
    items.forEach((li, i) => li.classList.toggle("now", i === cur));
    const li = items[cur];
    list.style.transform = `translateY(${Math.round(win.clientHeight * 0.4 - li.offsetTop - li.offsetHeight / 2)}px)`;
    if (refs) refs.innerHTML = sortRefs([...li.querySelectorAll("a[data-ref]")].map(a => a.dataset.ref))
      .map(key => `<span>${apa(key, true)}</span>`).join(" ");
    count.textContent = `${cur + 1} / ${frames.length}`;
    bPrev.disabled = cur === 0;
    bNext.disabled = cur === frames.length - 1;
  }
  function instant(k) { root.classList.add("instant"); go(k); void root.offsetWidth; root.classList.remove("instant"); }
  function jump(k) { if (k >= 0 && k < frames.length) go(k); }

  // back to the first step each time the slide is shown
  if (slide) {
    let was = slide.classList.contains("active");
    new MutationObserver(() => {
      const now = slide.classList.contains("active");
      if (now && !was) instant(0);
      was = now;
    }).observe(slide, { attributes: true, attributeFilter: ["class"] });
  }
  instant(0);
}


// ── Architecture or scale? Published scores against scale, one dot per model ──────
// Every number is from a paper's table or from Epoch AI's model data (CC BY 4.0),
// retrieved 29 Sep 2026; the slide's footer and src line name each source. No single
// benchmark spans 2016 to 2024, so each era gets its own panel and its own axes.
// Logos: Simple Icons 16.33.0 (CC0 artwork; the marks remain the companies'). Simple
// Icons removed OpenAI's icon at OpenAI's request, so GPT models get a lettered badge,
// and so do LSTMs, which have no company mark.
const LOGO = {
  google: ["#4285F4", "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"],
  meta: ["#0467DF", "M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"],
  deepseek: ["#5786FE", "M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45"],
};
const LETTER = { LSTM: "#6b7280", GPT: "#1b2430" };
const SUP = s => String(s).replace(/[0-9]/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
const SCALE_PANELS = [
  { title: "2017 · Translation", sub: "WMT'14 English→German, BLEU", xl: "training compute (FLOP)",
    x: [18.3, 19.62], y: [23, 29.4], yt: [24, 26, 28],
    xt: [[18.477, "3·10" + SUP(18)], [19, "10" + SUP(19)], [19.477, "3·10" + SUP(19)]],
    pts: [
      { n: "GNMT (LSTM)", c: 2.3e19, v: 24.6, b: "LSTM", l: [-16, 4, "end"] },
      { n: "ConvS2S", c: 9.6e18, v: 25.16, l: [-9, 4, "end"] },
      { n: "MoE (LSTM)", c: 2.0e19, v: 26.03, l: [-9, 4, "end"] },
      { n: "Transformer base", c: 3.3e18, v: 27.3, b: "google", l: [16, 4, "start"] },
      { n: "Transformer big", c: 2.3e19, v: 28.4, b: "google", l: [-16, 4, "end"] },
    ],
    span: { from: 3.3e18, to: 2.3e19, v: 23.45, text: "1/7 of the compute, +2.7 BLEU" } },
  { title: "2018 · Understanding", sub: "GLUE, average of 8 tasks", xl: "parameters",
    x: [7.95, 8.62], y: [68, 84.5], yt: [70, 75, 80],
    xt: [[8, "100M"], [8.301, "200M"], [8.477, "300M"]],
    line: { v: 71.0, text: "BiLSTM + ELMo 71.0", b: "LSTM" },
    pts: [
      { n: "GPT-1", c: 1.17e8, v: 75.1, b: "GPT", l: [16, 4, "start"] },
      { n: "BERT-Base", c: 1.10e8, v: 79.6, b: "google", l: [16, 4, "start"] },
      { n: "BERT-Large", c: 3.40e8, v: 82.1, b: "google", l: [-16, 4, "end"] },
    ],
    gap: { c: 1.13e8, from: 75.1, to: 79.6, text: ["+4.5 at the same size,", "on about 4× the text"], dx: 16 } },
  { title: "2020–2024 · Knowledge", sub: "MMLU, 5-shot, % correct", xl: "training compute (FLOP)",
    x: [22.4, 25.85], y: [30, 97], yt: [40, 60, 80],
    xt: [[23, "10" + SUP(23)], [24, "10" + SUP(24)], [25, "10" + SUP(25)]],
    pts: [
      { n: "GPT-3", c: 3.14e23, v: 43.9, b: "GPT", dense: 1, l: [16, 4, "start"] },
      { n: "Gopher", c: 6.31e23, v: 60.0, dense: 1, l: [8, 12, "start"] },
      { n: "Chinchilla", c: 5.76e23, v: 67.5, dense: 1, l: [-8, -6, "end"] },
      { n: "PaLM", c: 2.5272e24, v: 69.3, dense: 1, l: [8, 12, "start"] },
      { n: "LLaMA 7B", c: 4.0e22, v: 35.1, dense: 1, l: [8, 13, "start"], lt: "LLaMA, Llama 2 (7B–70B)" },
      { n: "LLaMA 13B", c: 7.8e22, v: 46.9, dense: 1 },
      { n: "LLaMA 33B", c: 2.73e23, v: 57.8, dense: 1 },
      { n: "LLaMA 65B", c: 5.5e23, v: 63.4, dense: 1 },
      { n: "Llama 2 7B", c: 8.4e22, v: 45.3, dense: 1 },
      { n: "Llama 2 13B", c: 1.6e23, v: 54.8, dense: 1 },
      { n: "Llama 2 34B", c: 4.08e23, v: 62.6, dense: 1 },
      { n: "Llama 2 70B", c: 8.1e23, v: 68.9, dense: 1 },
      { n: "Llama 3.1 405B", c: 3.8e25, v: 84.4, b: "meta", dense: 1, l: [-4, 27, "end"] },
      { n: "GPT-4", c: 2.1e25, v: 86.4, b: "GPT", est: [8.2e24, 4.4e25], l: [-6, -13, "end"], lt: "GPT-4*" },
      { n: "DeepSeek-V2", c: 1.02e24, v: 78.4, b: "deepseek", l: [-16, 4, "end"] },
      { n: "DeepSeek-V3", c: 3.3e24, v: 87.1, b: "deepseek", l: [-16, 4, "end"], lt: "DeepSeek-V3 (MoE)" },
    ],
    fit: true,
    span: { from: 3.3e24, to: 3.8e25, v: 97, text: "1/11 of the compute" } },
];

function badge(g, cx, cy, key, r) {
  const logo = LOGO[key];
  el("circle", { cx, cy, r, fill: logo ? "#fff" : LETTER[key], stroke: logo ? logo[0] : "#fff", "stroke-width": 1.6 }, g);
  if (logo) {
    const k = (r * 1.2) / 24;
    el("path", { d: logo[1], fill: logo[0], transform: `translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})` }, g);
  } else {
    el("text", { x: cx, y: cy + 3, "text-anchor": "middle", style: `font: 700 ${key.length > 3 ? 7 : 8}px var(--font); fill: #fff`, text: key }, g);
  }
}

export function scaleArch(root) {
  const body = frame(root, "Architecture or scale?", "published scores against scale, one dot per model");
  const W = 1180, H = 322, s = svg(W, H, body, "Scores against scale for three eras of language models");
  uid(s);
  arrowDefs(s);
  const boxes = [[62, 300], [455, 225], [772, 388]], top = 54, bot = 262;
  SCALE_PANELS.forEach((P, i) => {
    const [x0, w] = boxes[i];
    const X = c => x0 + (Math.log10(c) - P.x[0]) / (P.x[1] - P.x[0]) * w;
    const Y = v => bot - (v - P.y[0]) / (P.y[1] - P.y[0]) * (bot - top);
    const g = el("g", {}, s);
    text(g, x0, 18, P.title, "b", "start").setAttribute("style", "font-size: 17px");
    text(g, x0, 36, P.sub, "m", "start");
    for (const v of P.yt) {
      el("line", { x1: x0, x2: x0 + w, y1: Y(v), y2: Y(v), class: "s-axis", "stroke-dasharray": "2 4" }, g);
      text(g, x0 - 7, Y(v) + 4, v, "m", "end");
    }
    for (const [lv, lab] of P.xt) {
      const x = x0 + (lv - P.x[0]) / (P.x[1] - P.x[0]) * w;
      el("line", { x1: x, x2: x, y1: bot, y2: bot + 5, class: "s-axis" }, g);
      text(g, x, bot + 19, lab, "m");
    }
    el("line", { x1: x0, x2: x0 + w, y1: bot, y2: bot, class: "s-axis" }, g);
    el("line", { x1: x0, x2: x0, y1: top - 6, y2: bot, class: "s-axis" }, g);
    text(g, x0 + w / 2, bot + 38, P.xl + " →", "m");

    if (P.line) {
      el("line", { x1: x0, x2: x0 + w, y1: Y(P.line.v), y2: Y(P.line.v), stroke: LETTER.LSTM, "stroke-width": 1.5, "stroke-dasharray": "6 4" }, g);
      badge(g, x0 + w - 12, Y(P.line.v), P.line.b, 11);
      text(g, x0 + w - 28, Y(P.line.v) - 7, P.line.text, "m", "end");
    }
    if (P.fit) {
      const d = P.pts.filter(p => p.dense), n = d.length;
      const mx = d.reduce((t, p) => t + Math.log10(p.c), 0) / n, my = d.reduce((t, p) => t + p.v, 0) / n;
      const b = d.reduce((t, p) => t + (Math.log10(p.c) - mx) * (p.v - my), 0) / d.reduce((t, p) => t + (Math.log10(p.c) - mx) ** 2, 0);
      const f = lx => my + b * (lx - mx), la = 22.5, lb = 25.75;
      el("line", { x1: X(10 ** la), y1: Y(f(la)), x2: X(10 ** lb), y2: Y(f(lb)), stroke: "var(--muted)", "stroke-width": 1.5, "stroke-dasharray": "6 4" }, g);
      const tx = x0 + w, ty = Y(36.5);
      text(g, tx, ty, "dashed: fit to the dense Transformers,", "m", "end");
      text(g, tx, ty + 15, `+${b.toFixed(0)} points per 10× compute`, "m", "end");
    }
    if (P.span) {
      const a = X(P.span.from), z = X(P.span.to), y = Y(P.span.v);
      el("line", { x1: z - 2, y1: y, x2: a + 2, y2: y, class: "s-edge on", "marker-end": `url(#ah-on${s.dataset.uid})` }, g);
      text(g, (a + z) / 2, y - 6, P.span.text, "o");
    }
    if (P.gap) {
      const x = X(P.gap.c);
      el("line", { x1: x - 22, y1: Y(P.gap.from) - 2, x2: x - 22, y2: Y(P.gap.to) + 4, class: "s-edge on", "marker-end": `url(#ah-on${s.dataset.uid})` }, g);
      P.gap.text.forEach((t, k) => text(g, x + P.gap.dx, (Y(P.gap.from) + Y(P.gap.to)) / 2 + k * 16 - 2, t, "o", "start"));
    }
    for (const p of P.pts) {
      const x = X(p.c), y = Y(p.v), pg = el("g", {}, g);
      el("title", { text: `${p.n}: ${p.v} at ${sci(p.c)} ${P.xl.startsWith("param") ? "parameters" : "FLOP"}` }, pg);
      if (p.est) el("line", { x1: X(p.est[0]), x2: X(p.est[1]), y1: y, y2: y, stroke: "var(--muted)", "stroke-width": 1.5 }, pg);
      if (p.b) badge(pg, x, y, p.b, 12);
      else el("circle", { cx: x, cy: y, r: 4.5, fill: "var(--muted)", opacity: 0.75 }, pg);
      if (p.l) text(pg, x + p.l[0], y + p.l[1], p.lt || p.n, p.b ? "b" : "m", p.l[2]);
    }
  });
}

// ── The common principle: the chain rule, and the Markov chain that truncates it ──
// For each position of one sentence, the chain rule conditions on every earlier token;
// a Markov chain of order k keeps only the last k. The slider moves k; at k = t−1 the
// two agree, which is why a Markov chain whose state is the whole history is exact.
export function markovWindow(root) {
  const body = frame(root, "Chain rule vs Markov chain",
    "Which earlier tokens each prediction may look at.");
  const toks = ["the", "cat", "sat", "on", "the", "mat", "."];
  const V = 50000;
  let k = 1;
  const s = svg(560, 262, null, "context used for each next-token prediction");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" },
    slider("Markov order k", 1, toks.length - 1, 1, k, v => { k = v; draw(); })), s, read);
  function draw() {
    s.innerHTML = "";
    uid(s); arrowDefs(s);
    const bw = 54, bh = 30, gx = 12, x0 = 6, y0 = 14, gy = 11;
    for (let t = 1; t < toks.length; t++) {
      const y = y0 + (t - 1) * (bh + gy);
      for (let i = 0; i < t; i++) {
        const inCtx = i >= t - k;
        box(s, x0 + i * (bw + gx), y, bw, bh, toks[i], inCtx ? "on" : "", inCtx ? "b" : "m");
      }
      const xt = x0 + t * (bw + gx);
      arrow(s, xt - gx - 2, y + bh / 2, xt - 1, y + bh / 2, true);
      box(s, xt, y, bw, bh, toks[t], "blue", "w b");
      text(s, xt + bw + 10, y + bh / 2 + 4, t - k <= 0 ? "sees all: exact" : `ignores ${t - k}`, t - k <= 0 ? "o" : "m", "start");
    }
    const exact = k >= toks.length - 1;
    read.innerHTML = (exact ? "k covers the whole history: <b>exact</b>. " : `k = ${k}: grey tokens are ignored. `) +
      `Contexts with V = 50,000 words: V<sup>${k}</sup> = <b>${sci(V ** k)}</b>`;
  }
  draw();
}

// ── Transformers beyond language: one sketch per domain ─────────────────────
// Every panel has the same grammar: input → tokens → the same Transformer box → output.
// Only the two ends change; that is the point of the slide. Sketches are redrawn, not copied.
// Example pictures and their licences: assets/img/p2l1/CREDITS.md.
const IMG = f => new URL(`../../img/p2l1/${f}`, import.meta.url).href;
// ubiquitin (PDB 1UBQ), 76 Cα atoms projected on their two main axes, scaled to 0–64
const UBQ = [[1.5,32.3],[7.0,35.8],[11.2,33.0],[17.1,35.5],[23.0,32.0],[27.3,34.7],[34.0,33.2],[38.9,33.3],[41.6,39.1],[36.0,42.9],[33.8,42.8],[27.3,40.9],[25.1,38.8],[18.5,38.8],[16.2,33.7],[10.2,32.6],[8.0,26.3],[2.5,22.3],[1.3,18.1],[1.3,12.9],[7.9,14.0],[12.4,9.5],[17.8,11.2],[21.9,9.3],[18.7,14.0],[19.5,18.9],[26.2,17.6],[26.5,18.1],[23.4,24.3],[28.1,26.3],[33.2,24.1],[30.5,27.4],[30.1,33.3],[35.6,33.4],[39.6,28.5],[40.1,24.3],[40.5,17.7],[35.3,14.0],[39.6,9.5],[42.0,14.4],[35.7,16.4],[32.9,14.5],[26.5,17.3],[23.8,17.9],[17.3,19.4],[14.6,18.9],[20.1,15.5],[19.7,10.5],[24.2,9.6],[20.5,9.3],[21.2,3.7],[21.6,4.1],[16.3,0.0],[11.6,2.9],[7.9,8.4],[7.3,14.4],[0.8,12.5],[3.2,6.9],[6.0,11.2],[0.7,15.6],[4.5,20.8],[0.0,26.0],[0.8,31.9],[5.6,36.2],[8.7,31.3],[15.6,31.8],[19.7,26.3],[26.2,26.4],[31.2,24.6],[36.9,21.9],[42.0,20.3],[45.3,14.3],[51.1,14.8],[54.4,9.2],[60.8,9.8],[64.0,12.9]];
// Neil Armstrong, Apollo 11, 20 Jul 1969: "That's one small step for man" (NASA, public domain;
// 15.6–18.4 s of the Wikimedia Commons file, 16 kHz). Waveform envelope (96 bins, max/min) and a
// log-Mel spectrogram (25 ms windows, 10 ms hop, 16 mel bands to 8 kHz, 40 dB range, 40 columns,
// digits 0–9, highest band first; the six empty bands above the radio link's cut-off dropped).
const SPEECH = {"env":[[0.53,-0.6],[0.32,-0.44],[0.84,-0.71],[1.0,-1.0],[1.0,-1.0],[1.0,-1.0],[0.76,-1.0],[0.61,-1.0],[0.87,-0.8],[0.83,-0.59],[0.5,-0.53],[0.19,-0.3],[0.25,-0.27],[0.27,-0.31],[0.24,-0.31],[0.11,-0.3],[0.11,-0.22],[0.14,-0.27],[0.17,-0.25],[0.11,-0.2],[0.13,-0.22],[0.19,-0.3],[0.55,-0.81],[0.86,-0.93],[0.91,-0.86],[0.95,-1.0],[0.76,-1.0],[0.81,-1.0],[0.73,-1.0],[0.84,-0.95],[1.0,-0.91],[0.91,-0.99],[0.97,-0.97],[0.56,-0.43],[0.13,-0.21],[0.16,-0.23],[0.27,-0.29],[0.1,-0.2],[0.26,-0.43],[0.8,-0.97],[0.84,-0.95],[0.82,-0.76],[0.69,-0.81],[0.58,-0.76],[0.6,-0.74],[0.46,-0.37],[0.19,-0.25],[0.16,-0.16],[0.11,-0.19],[0.1,-0.17],[0.13,-0.16],[0.19,-0.36],[0.49,-0.46],[0.82,-0.69],[0.94,-0.85],[0.56,-0.65],[0.38,-0.38],[0.49,-0.51],[0.71,-0.71],[0.54,-0.83],[0.53,-0.67],[0.48,-0.62],[0.48,-0.61],[0.39,-0.59],[0.52,-0.61],[0.55,-0.69],[0.5,-0.77],[0.58,-0.69],[0.64,-0.6],[0.25,-0.25],[0.17,-0.24],[0.21,-0.25],[0.17,-0.19],[0.13,-0.19],[0.1,-0.14],[0.14,-0.17],[0.11,-0.17],[0.09,-0.16],[0.14,-0.19],[0.56,-0.52],[0.55,-0.42],[0.52,-0.47],[0.22,-0.33],[0.21,-0.22],[0.17,-0.22],[0.16,-0.19],[0.14,-0.16],[0.14,-0.16],[0.14,-0.22],[0.18,-0.19],[0.13,-0.18],[0.27,-0.24],[0.35,-0.38],[0.23,-0.28],[0.33,-0.44],[0.25,-0.35]],"spec":["1010010000000000000000000121000000000000","2222121102222111231001002443100001000001","3325321313332221452001324655401002110022","4446321213433212434001534434521003111023","4465110114666411443101644344400004210123","3687211116887611456100545556601004321134","3888423225888722677312666657712115332344","4766653225777712676311676666643115532344","5666555445665645565544566666654445554555","5655444445645444444444545545544555555555"]};
export function beyondArch(root) {
  const kind = root.dataset.kind;
  root.innerHTML = "";
  const W = 410, H = 138, s = svg(W, H, root, `Transformer applied to ${kind}`);
  uid(s); arrowDefs(s);
  const R = rng(11), Y = 56;                               // Y: the flow line
  const IN = 41, TK = 140, CO = 255, OUT = 368;            // column centres
  const cap = (x, t) => text(s, x, 130, t, "m cap");
  const tok = (x, y, fill) => { const r = el("rect", { x, y, width: 13, height: 13, rx: 2, class: "s-box on" }, s); if (fill) r.style.fill = fill; return r; };
  const core = (sub, sub2) => {
    el("rect", { x: CO - 55, y: Y - 34, width: 110, height: 68, rx: 7, class: "s-box blue" }, s);
    text(s, CO, Y - (sub2 ? 8 : 2), "Transformer", "core");
    if (sub) text(s, CO, Y + (sub2 ? 10 : 16), sub, "core-sub");
    if (sub2) text(s, CO, Y + 25, sub2, "core-sub");
  };
  const flow = () => { arrow(s, 80, Y, 96, Y); arrow(s, 183, Y, 198, Y); arrow(s, 312, Y, 326, Y); };
  const shade = v => `hsl(210, 35%, ${Math.round(88 - 50 * v)}%)`;
  const pic = (f, x, y, w, hh) => {
    el("image", { href: IMG(f), x, y, width: w, height: hh, preserveAspectRatio: "xMidYMid slice" }, s);
    el("rect", { x, y, width: w, height: hh, fill: "none", class: "s-axis" }, s);
  };
  const row = (n, fill) => { for (let i = 0; i < n; i++) tok(TK - 8 * n + 16 * i + 1.5, Y - 6.5, fill && fill(i)); };

  if (kind === "vit") {                                    // image → patches → class
    pic("vit_eagle.jpg", 3, Y - 38, 76, 76);
    for (let k = 1; k < 4; k++) {                          // cut into 4×4 patches
      el("line", { x1: 3 + 19 * k, x2: 3 + 19 * k, y1: Y - 38, y2: Y + 38, class: "cut" }, s);
      el("line", { x1: 3, x2: 79, y1: Y - 38 + 19 * k, y2: Y - 38 + 19 * k, class: "cut" }, s);
    }
    [1, 2, 5, 6, 9].forEach((q, i) => {                    // five of the sixteen patches, as tokens
      const x = TK - 40 + 16 * i + 1, sv = el("svg", { x, y: Y - 7, width: 14, height: 14, viewBox: `${48 * (q % 4)} ${48 * Math.floor(q / 4)} 48 48` }, s);
      el("image", { href: IMG("vit_eagle.jpg"), x: 0, y: 0, width: 192, height: 192 }, sv);
      el("rect", { x, y: Y - 7, width: 14, height: 14, rx: 1.5, class: "s-box on", style: "fill: none" }, s);
    });
    core("encoder");
    text(s, OUT, Y + 6, "“eagle”", "out");
    cap(IN, "image"); cap(TK, "patches"); cap(OUT, "class");
  } else if (kind === "dit") {                             // noise → patches → image, one step at a time
    pic("dit_noise.jpg", 3, Y - 38, 76, 76);
    row(5);
    core("+ step t, class c");
    pic("dit_sample.jpg", OUT - 38, Y - 38, 76, 76);
    el("path", { d: `M ${OUT} ${Y + 40} L ${OUT} ${Y + 46} L ${IN} ${Y + 46} L ${IN} ${Y + 42}`, class: "s-edge", fill: "none", "stroke-dasharray": "4 3", "marker-end": `url(#ah${s.dataset.uid})` }, s);
    text(s, CO, Y + 59, "remove a little noise; repeat", "m loop");
    cap(IN, "pure noise"); cap(TK, "patches"); cap(OUT, "generated");
  } else if (kind === "vivit") {                           // frames → space-time tubes → action
    for (let f = 2; f >= 0; f--) pic(`muybridge_${f + 1}.jpg`, 3 + 7 * f, Y - 36 + 12 * f, 60, 38);
    for (let i = 0; i < 4; i++) { const x = TK - 38 + 20 * i; el("rect", { x: x + 4, y: Y - 10.5, width: 13, height: 13, rx: 2, class: "s-box" }, s); tok(x, Y - 6.5); }
    core("space, then time");
    text(s, OUT, Y + 6, "“galloping”", "out");
    cap(IN, "frames"); cap(TK, "space-time tubes"); cap(OUT, "action");
  } else if (kind === "whisper") {                         // speech → log-Mel frames → encoder → decoder → text
    const env = SPEECH.env, dx = 76 / (env.length - 1);
    const top = env.map(([hi], i) => `${3 + i * dx},${Y - 30 * hi}`), bot = env.map(([, lo], i) => `${3 + i * dx},${Y - 30 * lo}`).reverse();
    el("polygon", { points: top.concat(bot).join(" "), class: "wave" }, s);
    el("line", { x1: 3, x2: 79, y1: Y, y2: Y, class: "s-axis" }, s);
    const rows = SPEECH.spec, nr = rows.length, per = 8, cw = 13 / per, ch = 40 / nr;
    for (let t = 0; t < 5; t++) {
      const x0 = TK - 39 + 16 * t;
      for (let r = 0; r < nr; r++) for (let c = 0; c < per; c++)
        el("rect", { x: x0 + c * cw, y: Y - 20 + r * ch, width: cw + 0.2, height: ch + 0.2, fill: shade(+rows[r][t * per + c] / 9) }, s);
      el("rect", { x: x0, y: Y - 20, width: 13, height: 40, rx: 2, class: "s-box on", style: "fill: none" }, s);
    }
    core("encoder →", "decoder");
    ["that's one", "small step", "for man"].forEach((w, i) => { el("rect", { x: OUT - 36, y: Y - 34 + 24 * i, width: 72, height: 20, rx: 3, class: "s-box on" }, s); text(s, OUT, Y - 19.5 + 24 * i, w, "tok-t sm"); });
    cap(IN, "speech"); cap(TK, "log-Mel frames"); cap(OUT, "text tokens");
  } else if (kind === "patchtst") {                        // series → windows → future values
    const f = i => Math.sin(i / 3.2) * 0.7 + 0.25 * Math.sin(i / 1.3);
    const pts = Array.from({ length: 33 }, (_, i) => f(i) + 0.15 * (R() - 0.5));
    const line = (x0, dx, arr, cls, dash) => el("polyline", { points: arr.map((v, i) => `${x0 + i * dx},${Y - 22 * v}`).join(" "), fill: "none", class: cls, "stroke-width": 2, "stroke-dasharray": dash || null }, s);
    line(8, 2.1, pts, "series");
    for (let p = 0; p < 4; p++) {
      const x = TK - 40 + 20 * p;
      el("rect", { x, y: Y - 9, width: 18, height: 18, rx: 2, class: "s-box on" }, s);
      const seg = pts.slice(p * 8, p * 8 + 9);
      el("polyline", { points: seg.map((v, i) => `${x + 1 + i * 2},${Y - 7 * v}`).join(" "), fill: "none", class: "series", "stroke-width": 1.4 }, s);
    }
    core("encoder");
    line(OUT - 36, 4.6, Array.from({ length: 16 }, (_, i) => f(33 + i)), "series fut", "4 3");
    cap(IN, "time series"); cap(TK, "windows"); cap(OUT, "forecast");
  } else if (kind === "esm") {                             // amino acids → tokens → structure
    const aa = ["M", "Q", "I", "F", "V"];                  // ubiquitin starts MQIFV…
    aa.forEach((a, i) => {
      const x = 13 + 14 * i, y = Y + (i % 2 ? 11 : -11);
      if (i) el("line", { x1: x - 14, y1: Y + (i % 2 ? -11 : 11), x2: x, y2: y, class: "s-axis" }, s);
      el("circle", { cx: x, cy: y, r: 8.5, class: "s-box" }, s); text(s, x, y + 4, a, "aa");
    });
    aa.forEach((a, i) => { const x = TK - 40 + 16 * i + 1.5; tok(x, Y - 6.5); text(s, x + 6.5, Y + 4, a, "aa"); });
    core("masked language", "model");
    const k = 74 / 64, ox = OUT - 37, oy = Y - 37;
    for (let i = 1; i < UBQ.length; i++) {
      const t = i / (UBQ.length - 1);
      el("line", { x1: ox + k * UBQ[i - 1][0], y1: oy + k * UBQ[i - 1][1], x2: ox + k * UBQ[i][0], y2: oy + k * UBQ[i][1],
        stroke: `hsl(${Math.round(215 - 185 * t)}, 70%, 45%)`, "stroke-width": 2.4, "stroke-linecap": "round" }, s);
    }
    cap(IN, "amino acids"); cap(TK, "one token each"); cap(OUT, "3D structure");
  }
  flow();
}

// ── Slide 3: architecture vs scale, in two small pictures ───────────────────
// Architecture = how units connect (a chain vs every-earlier-token); scale = the same wiring, more units.
export function archVsScale(root) {
  root.innerHTML = "";
  const s = svg(1100, 236, root, "Architecture changes how the parts connect; scale adds more of the same parts");
  uid(s); arrowDefs(s);
  const node = (x, y, cls = "") => el("circle", { cx: x, cy: y, r: 9, class: `s-box ${cls}` }, s);
  const line = (x1, y1, x2, y2, cls) => el("line", { x1, y1, x2, y2, class: cls }, s);
  text(s, 270, 24, "Architecture: how the parts connect", "ttl");
  text(s, 830, 24, "Scale: the same wiring, more parameters", "ttl");
  line(550, 12, 550, 226, "s-axis");

  // architecture: the same five tokens, wired two ways
  const row = x0 => [0, 1, 2, 3, 4].map(i => x0 + 52 * i), Y = 150;
  const chain = row(30), fan = row(300);
  chain.forEach((x, i) => { if (i) arrow(s, chain[i - 1] + 10, Y, x - 11, Y); });
  fan.forEach((xj, j) => fan.slice(0, j).forEach((xi, i) =>
    el("path", { d: `M ${xi} ${Y - 9} Q ${(xi + xj) / 2} ${Y - 22 - 16 * (j - i)} ${xj} ${Y - 9}`, fill: "none", class: `s-edge ${j === 4 ? "on" : ""}` }, s)));
  chain.forEach(x => node(x, Y)); fan.forEach((x, j) => node(x, Y, j === 4 ? "on" : ""));
  text(s, 134, Y + 36, "a chain: one step at a time", "cap");
  text(s, 134, Y + 56, "(RNN)", "cap m");
  text(s, 404, Y + 36, "one hop to every earlier token", "cap");
  text(s, 404, Y + 56, "(attention)", "cap m");

  // scale: the same fully connected layers, small and large
  const net = (x0, w, layers, per, y0, h) => {
    const xs = [...Array(layers)].map((_, l) => x0 + w * l / (layers - 1));
    const ys = [...Array(per)].map((_, i) => y0 + h * (per === 1 ? 0.5 : i / (per - 1)));
    xs.forEach((x, l) => { if (l) xs[l - 1] !== undefined && ys.forEach(ya => ys.forEach(yb => line(xs[l - 1], ya, x, yb, "s-edge thin"))); });
    xs.forEach(x => ys.forEach(y => el("circle", { cx: x, cy: y, r: 6, class: "s-box" }, s)));
    return (layers - 1) * per * per;
  };
  const small = net(612, 110, 3, 3, 118, 60), large = net(800, 250, 4, 6, 62, 130);
  text(s, 667, 214, `${small} weights`, "cap");
  text(s, 925, 214, `${large} weights`, "cap");
}

// ── Slide 20, left: the NPLM's fixed window, beside the RNN ─────────────────
// The same sentence as the RNN sketch. NPLM concatenates the word vectors of the last three
// words into one input; anything earlier is dropped. Colours are illustrative, not trained.
export function wordWindow(root) {
  root.innerHTML = "";
  const s = svg(440, 300, root, "NPLM: a fixed window of word vectors, concatenated");
  uid(s); arrowDefs(s);
  const words = ["the", "cat", "that", "the", "dog", "chased"], win = 3, R = rng(2003);
  const vec = (x, y, n, cls = "") => { for (let j = 0; j < n; j++) { const r = el("rect", { x: x + j * 9, y, width: 8, height: 18, rx: 2, class: cls }, s); r.style.fill = divColor(2 * R() - 1); } };
  const cw = 70, x0 = 10;
  words.forEach((w, i) => {
    const cx = x0 + cw * i + cw / 2, on = i >= words.length - win;
    const g = el("g", { opacity: on ? 1 : 0.3 }, s);
    const b = box(s, cx - 30, 256, 60, 28, w, on ? "on" : "", on ? "b" : "");
    g.appendChild(b);
    if (on) { vec(cx - 27, 206, 6); arrow(s, cx, 254, cx, 228); }
  });
  text(s, x0 + cw * 1.5, 246, "dropped", "m");
  const xs = x0 + cw * (words.length - win) + 8, xw = cw * win - 16;
  words.slice(-win).forEach((_, k) => {                     // three vectors → one long input x
    const cx = x0 + cw * (words.length - win + k) + cw / 2;
    arrow(s, cx, 204, xs + 9 + k * 54 + 27, 170);
  });
  el("rect", { x: xs - 4, y: 144, width: 18 * 9 + 8, height: 26, rx: 5, class: "s-box" }, s);
  vec(xs, 148, 18);
  text(s, xs - 10, 162, "x", "b", "end");
  arrow(s, xs + 81, 142, xs + 81, 112);
  el("rect", { x: xs + 81 - 31, y: 86, width: 62, height: 26, rx: 5, class: "s-box" }, s);
  vec(xs + 81 - 27, 90, 6);
  text(s, xs + 81 - 38, 104, "h", "b", "end");
  arrow(s, xs + 81, 84, xs + 81, 58);
  box(s, xs + 81 - 30, 28, 60, 28, "was?", "", "m");
  text(s, 14, 40, "the last 3 word vectors,", "cap", "start");
  text(s, 14, 60, "side by side, as one input", "cap", "start");
  text(s, 14, 150, "C(the) C(dog) C(chased)", "m", "start");
}

// ── Slide 22, left: a plain RNN cell, drawn at the LSTM cell's scale ────────
// One path: the whole memory goes through W and tanh at every step. Beside it, the LSTM's
// cell state runs along the top, touched only by × f and +.
export function rnnCell(root) {
  root.innerHTML = "";
  const s = svg(330, 322, root, "A plain RNN cell: the memory passes through W and tanh at every step");
  uid(s); arrowDefs(s);
  const Y = 150, XA = 150, XT = 226;                        // memory line, the + node, the tanh block
  el("rect", { x: 44, y: 60, width: 230, height: 210, rx: 16, class: "s-box" }, s);
  text(s, 8, Y + 5, "hₜ₋₁", "b", "start");
  arrow(s, 44, Y, 78, Y, true);
  box(s, 80, Y - 16, 40, 32, "×W", "on", "b");
  arrow(s, 120, Y, XA - 13, Y, true);
  el("circle", { cx: XA, cy: Y, r: 13, class: "s-box on" }, s); text(s, XA, Y + 5, "+", "b");
  text(s, XA + 10, 316, "xₜ", "b", "start");
  arrow(s, XA, 312, XA, 248);
  box(s, XA - 20, 214, 40, 32, "×U", "", "b");
  arrow(s, XA, 212, XA, Y + 14);
  arrow(s, XA + 13, Y, XT - 24, Y, true);
  box(s, XT - 24, Y - 16, 48, 32, "tanh", "on", "b");
  arrow(s, XT + 24, Y, 320, Y, true);
  text(s, 312, Y - 14, "hₜ", "b", "end");
  text(s, 159, 88, "the whole memory is", "m");
  text(s, 159, 104, "rewritten every step", "m");
}

// ── Slide 24: handwriting, one pen move at a time ────────────────────────────
// Pen path of "hello" from the Hershey Script 1-stroke font, as strokes of points (0–400 wide).
// The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S.
// National Bureau of Standards. The format of the Font data in this distribution was originally
// created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821.
// (Data via the hersheytext package, svg_fonts/HersheyScript1.svg; see assets/img/p2l1/CREDITS.md.)
// This is an illustration of what Graves' LSTM outputs at each step, not a sample from it.
const HELLO = [[[0.0,116.4],[14.6,94.7],[36.4,58.2],[43.5,43.9],[50.9,21.9],[50.9,7.4],[43.5,0.0],[29.2,7.4],[21.8,21.9],[14.6,51.1],[7.3,94.7],[0.0,152.9],[7.3,131.1],[14.6,116.4],[29.2,94.7],[43.5,87.3],[58.3,87.3],[65.5,94.7],[65.5,109.3],[58.3,131.1],[58.3,145.7],[65.5,152.9],[72.7,152.9],[87.4,145.7],[94.6,138.4],[109.2,116.4]],[[116.3,138.4],[130.9,131.1],[138.3,123.8],[145.4,109.3],[145.4,94.7],[138.3,87.3],[130.9,87.3],[116.3,94.7],[109.0,109.3],[109.0,131.1],[116.3,145.7],[130.9,152.9],[145.4,152.9],[160.0,145.7],[167.4,138.4],[181.7,116.4],[196.4,94.7],[218.2,58.2],[225.4,43.9],[232.7,21.9],[232.7,7.4],[225.4,0.0],[211.0,7.4],[203.6,21.9],[196.4,51.1],[189.1,102.1],[189.1,145.7],[196.4,152.9],[203.6,152.9],[218.2,145.7],[225.4,138.4],[240.1,116.4],[254.6,94.7],[276.4,58.2],[283.6,43.9],[291.0,21.9],[291.0,7.4],[283.6,0.0],[269.2,7.4],[261.9,21.9],[254.6,51.1],[247.3,102.1],[247.3,145.7],[254.6,152.9],[261.9,152.9],[276.4,145.7],[283.6,138.4],[298.4,116.4]],[[341.8,87.3],[327.5,87.3],[312.8,94.7],[305.5,102.1],[298.2,116.4],[298.2,131.1],[305.5,145.7],[320.1,152.9],[334.6,152.9],[349.2,145.7],[356.6,138.4],[363.7,123.8],[363.7,109.3],[356.6,94.7],[341.8,87.3],[334.6,94.7],[334.6,109.3],[341.8,123.8],[356.6,131.1],[378.3,131.1],[392.8,123.8],[400.0,116.4]]];
export function penSteps(root) {
  root.innerHTML = "";
  const pts = [];                                          // [x, y, lift]: lift = 1 on a stroke's last point
  HELLO.forEach(st => st.forEach((p, i) => pts.push([p[0] + 20, p[1] + 30, i === st.length - 1 ? 1 : 0])));
  const N = pts.length - 1;
  let t = 0;
  const s = svg(440, 220, null, "handwriting generated one pen move at a time");
  uid(s);
  const read = h("div", { class: "readout pen-read" });
  const btn = (label, fn, cls) => h("button", { class: cls, onclick: () => { fn(); draw(); } }, label);
  root.append(h("div", { class: "controls" },
    btn("Next move", () => { t = Math.min(N, t + 1); }, "primary"),
    btn("+10", () => { t = Math.min(N, t + 10); }),
    btn("Back", () => { t = Math.max(0, t - 1); }),
    btn("Reset", () => { t = 0; })), s, read);
  const ell = (cx, cy, ang, a, b, op) => {
    for (const k of [2, 1]) el("ellipse", { cx, cy, rx: a * k, ry: b * k, transform: `rotate(${ang} ${cx} ${cy})`, class: "pen-pdf", opacity: op / k }, s);
  };
  function draw() {
    s.innerHTML = "";
    // ink so far: strokes up to point t, broken where the pen lifted
    let d = "";
    for (let i = 0; i <= t; i++) d += (i === 0 || pts[i - 1][2] ? "M" : "L") + pts[i][0] + "," + pts[i][1] + " ";
    el("path", { d, class: "pen-ink" }, s);
    const [x, y, lift] = pts[t];
    if (t < N) {
      const [nx, ny] = pts[t + 1], dx = nx - x, dy = ny - y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI, len = Math.hypot(dx, dy);
      if (lift) el("line", { x1: x, y1: y, x2: nx, y2: ny, class: "pen-jump" }, s);
      // the output at this step: a mixture of 2-D Gaussians over the next offset (illustrative)
      const [px, py] = t > 0 && !pts[t - 1][2] ? [x + (x - pts[t - 1][0]), y + (y - pts[t - 1][1])] : [x + 6, y];
      ell(px, py, ang, 7, 4, 0.18);
      ell(nx, ny, ang, 4 + len * 0.25, 3, 0.45);
      el("circle", { cx: nx, cy: ny, r: 3, class: "pen-next" }, s);
    }
    el("circle", { cx: x, cy: y, r: 5, class: "pen-tip" }, s);
    if (t < N) {
      const [nx, ny] = pts[t + 1], p = lift ? 0.93 : 0.02;
      read.innerHTML = `move ${t + 1} of ${N}: Δx = ${(nx - x >= 0 ? "+" : "") + (nx - x).toFixed(1)}, Δy = ${(y - ny >= 0 ? "+" : "") + (y - ny).toFixed(1)}\n` +
        `p(lift pen) = ${p.toFixed(2)} → ${lift ? "<b>lift</b>: jump to the next stroke" : "pen stays down"}`;
    } else read.innerHTML = `done: ${N} moves\nEach one was sampled, drawn, and fed back in as the next input.`;
  }
  draw();
}

// ── A YouTube clip that loads and plays only when pressed ───────────────────
// <div data-viz="youtube" data-id="…" data-title="…" data-vertical>. Until pressed it is a
// thumbnail with a play button, so nothing from YouTube runs; leaving the slide stops it.
export function youtube(root) {
  const id = root.dataset.id, title = root.dataset.title || "YouTube video";
  const thumb = `https://i.ytimg.com/vi/${id}/${root.dataset.vertical !== undefined ? "oar2" : "hqdefault"}.jpg`;
  root.classList.add("yt");
  function poster() {
    root.innerHTML = "";
    const b = h("button", { class: "yt-poster", "aria-label": `Play: ${title}`, style: `background-image: url(${thumb})` },
      h("span", { class: "yt-play" }, "▶"));
    b.addEventListener("click", play);
    root.append(b, h("a", { class: "yt-link", href: `https://www.youtube.com/watch?v=${id}`, target: "_blank", rel: "noopener" }, "Open on YouTube ↗"));
  }
  function play() {
    root.innerHTML = "";
    root.append(h("iframe", { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`, title,
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", referrerpolicy: "strict-origin-when-cross-origin" }));
  }
  const slide = root.closest(".slide");
  if (slide) new MutationObserver(() => { if (!slide.classList.contains("active") && root.querySelector("iframe")) poster(); })
    .observe(slide, { attributes: true, attributeFilter: ["class"] });
  poster();
}
