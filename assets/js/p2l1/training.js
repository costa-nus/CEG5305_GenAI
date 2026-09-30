// Visualizations for Part 2 · Lecture 1 · Session 02 (Training).
// Registered in assets/js/main.js → load(). Every number comes from the paper named in the
// figure's footer; arithmetic done in the browser says so. Schematic panels carry no values.
import { el, h, svg, arrowDefs, uid, arrow, box, text, slider, frame } from "../lib.js";
import { linkCites } from "../bib.js";

// ── shared helpers ───────────────────────────────────────────────────────────
const KEY = "ceg5305-p2l1s2-";
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const lg = Math.log10;
const logS = (lo, hi, a, b) => v => a + ((lg(v) - lg(lo)) / (lg(hi) - lg(lo))) * (b - a);
const linS = (lo, hi, a, b) => v => a + ((v - lo) / (hi - lo)) * (b - a);
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = e => String(e).split("").map(c => (/\d/.test(c) ? SUP[+c] : c === "-" ? "⁻" : c)).join("");
function sciN(x, d = 2) {
  if (!Number.isFinite(x) || x === 0) return String(x);
  let e = Math.floor(lg(Math.abs(x))), m = x / 10 ** e;
  if (Math.abs(+m.toFixed(d)) >= 10) { e += 1; m = x / 10 ** e; }
  return `${m.toFixed(d)} × 10${sup(e)}`;
}
function human(n, d = 1) {
  const a = Math.abs(n);
  if (a >= 1e12) return `${+(n / 1e12).toFixed(d)}T`;
  if (a >= 1e9) return `${+(n / 1e9).toFixed(d)}B`;
  if (a >= 1e6) return `${+(n / 1e6).toFixed(d)}M`;
  if (a >= 1e3) return `${+(n / 1e3).toFixed(d)}K`;
  return String(+n.toFixed(d));
}
const human1 = n => (Math.abs(n) >= 1e12 ? `${(n / 1e12).toFixed(1)}T` : Math.abs(n) >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${(n / 1e6).toFixed(1)}M`);
function parseCount(s) {
  const m = String(s).trim().replace(/,/g, "").match(/^([0-9]*\.?[0-9]+(?:e[+-]?\d+)?)\s*([kKmMbBtT]?)$/);
  if (!m) return NaN;
  return +m[1] * ({ k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2].toLowerCase()] || 1);
}
const gb = bytes => (bytes >= 1e12 ? `${(bytes / 1e12).toFixed(2)} TB` : bytes >= 1e10 ? `${(bytes / 1e9).toFixed(0)} GB` : `${(bytes / 1e9).toFixed(1)} GB`);
function logTicks(s, X, Y, x0, x1, y0, y1, xs, ys, xlab, ylab, fmtX = v => `10${sup(lg(v))}`, fmtY = v => `10${sup(lg(v))}`) {
  xs.forEach(v => { el("line", { x1: X(v), y1: y0, x2: X(v), y2: y1, class: "s-axis" }, s); text(s, X(v), y0 + 16, fmtX(v), "m"); });
  ys.forEach(v => { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: "s-axis" }, s); text(s, x0 - 6, Y(v) + 4, fmtY(v), "m", "end"); });
  if (xlab) text(s, (x0 + x1) / 2, y0 + 34, xlab, "m");
  if (ylab) { const t = text(s, x0 - 44, (y0 + y1) / 2, ylab, "m"); t.setAttribute("transform", `rotate(-90 ${x0 - 44} ${(y0 + y1) / 2})`); }
}
function clip(s, x, y, w, hh) {
  const id = `clip${s.dataset.uid}-${Math.round(x)}-${Math.round(y)}`;
  const defs = el("defs", {}, s);
  el("rect", { x, y, width: w, height: hh }, el("clipPath", { id }, defs));
  return el("g", { "clip-path": `url(#${id})` }, s);
}
const path = pts => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
const tokW = t => t.length * 7.4 + 12;

// ── Opening: the vote ────────────────────────────────────────────────────────
export function computeVote(root) {
  const body = frame(root, "Ten times the compute: bigger model, or more data?",
    "Pick one before reading on. Board 5 shows what two published studies concluded, and they disagree.",
    "Your answer is kept in this browser only.");
  const opts = [["model", "Mostly a bigger model"], ["data", "Mostly more data"], ["both", "Both equally"]];
  let pick = store.get("vote", null);
  const row = h("div", { class: "controls" });
  const read = h("div", { class: "readout" });
  body.append(row, read);
  function draw() {
    row.innerHTML = "";
    opts.forEach(([k, l]) => row.appendChild(h("button", { "aria-pressed": String(pick === k), onclick: () => { pick = k; store.set("vote", k); draw(); } }, l)));
    read.textContent = pick ? `Your answer: ${opts.find(o => o[0] === pick)[1]}. Board 5 comes back to it.` : "No answer yet.";
  }
  draw();
}

// ── Six objectives, one sentence ─────────────────────────────────────────────
export function objectives(root) {
  const body = frame(root, "Six self-supervised objectives on one input",
    "Orange boxes are cut out of the input and become the target. Click a row to show or hide its target.",
    "The sentence and the span-corruption targets follow <a data-ref=\"raffel2020\">Raffel et al. (2020)</a>, Fig. 2. BERT masks 15% of tokens (<a data-ref=\"devlin2019\">Devlin et al., 2019</a>, §3.1); CLIP trains on 400M web image–text pairs (<a data-ref=\"radford2021\">Radford et al., 2021</a>, §2.2); MAE removes a large share of patches, e.g. 75% (<a data-ref=\"he2022\">He et al., 2022</a>); DINO is self-distillation with no labels (<a data-ref=\"caron2021\">Caron et al., 2021</a>). The photos are drawn tiles, not real images.");
  const W = 760;
  let hideAll = false;
  const shown = new Set();
  const bHide = h("button", { "aria-pressed": "false" }, "Hide all targets");
  const s = svg(W, 470, null, "six training objectives");
  body.append(h("div", { class: "controls" }, bHide), s);
  bHide.addEventListener("click", () => { hideAll = !hideAll; shown.clear(); bHide.setAttribute("aria-pressed", String(hideAll)); draw(); });

  const SENT = ["Thank", "you", "for", "inviting", "me", "to", "your", "party", "last", "week."];
  const rows = [
    { name: "Causal LM", model: "GPT · Board 3", kind: "text", input: [...SENT.slice(0, 9), { hid: "?" }], target: ["week."], note: "and, at every earlier position, the next token" },
    { name: "Masked LM", model: "BERT", kind: "text", input: ["Thank", "you", "for", { hid: "[MASK]" }, "me", "to", "your", "party", { hid: "[MASK]" }, "week."], target: ["inviting", "last"], note: "15% of tokens are masked" },
    { name: "Span corruption", model: "T5", kind: "text", input: ["Thank", "you", { hid: "<X>" }, "me", "to", "your", "party", { hid: "<Y>" }, "week."], target: ["<X>", "for", "inviting", "<Y>", "last", "<Z>"], note: "15% of tokens, mean span length 3" },
    { name: "Contrastive", model: "CLIP", kind: "clip" },
    { name: "Masked patches", model: "MAE", kind: "mae" },
    { name: "Self-distillation", model: "DINO", kind: "dino" },
  ];
  const PAL = [["#9cc4ff", "#7fb2ff", "#6aa56a", "#3f7f4a"], ["#7fd0e0", "#9cc4ff", "#e8d49a", "#d9bf73"], ["#2a3550", "#223052", "#ffc15e", "#3a3f55"]];
  function photo(g, x, y, cell, pal, hidden = null, only = null) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const k = r * 4 + c, px = x + c * cell, py = y + r * cell;
      if (only && !only.has(k)) { el("rect", { x: px, y: py, width: cell - 1, height: cell - 1, class: "s-box" }, g); continue; }
      if (hidden && hidden.has(k)) { el("rect", { x: px, y: py, width: cell - 1, height: cell - 1, rx: 2, class: "s-box on", "stroke-dasharray": "3 2" }, g); continue; }
      const fill = r === 0 && c === 3 && pal === PAL[0] ? "#ffc15e" : pal[r];
      el("rect", { x: px, y: py, width: cell - 1, height: cell - 1, rx: 2, fill, stroke: only ? "var(--orange)" : "none", "stroke-width": only ? 2 : 0 }, g);
    }
  }
  const MASK = new Set([0, 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 15]); // 12 of 16 = 75%
  function toks(g, x, y, list, tgt = false) {
    list.forEach(t => {
      const hid = typeof t === "object", lab = hid ? t.hid : t, w = tokW(lab);
      el("rect", { x, y, width: w, height: 24, rx: 5, class: `s-box ${hid || tgt ? "on" : ""}`, "stroke-dasharray": hid ? "4 3" : null }, g);
      text(g, x + w / 2, y + 16.5, lab, hid ? "o" : tgt ? "b" : "");
      x += w + 4;
    });
    return x;
  }
  function draw() {
    s.innerHTML = "";
    uid(s); arrowDefs(s);
    let y = 6;
    rows.forEach((r, i) => {
      const hh = r.kind === "text" ? 70 : 76;
      const g = el("g", { class: "clickable", style: "cursor:pointer" }, s);
      el("rect", { x: 0, y: y - 2, width: W, height: hh, fill: "transparent" }, g);
      if (i) el("line", { x1: 0, y1: y - 4, x2: W, y2: y - 4, class: "s-axis" }, g);
      text(g, 0, y + 20, r.name, "b", "start");
      text(g, 0, y + 38, r.model, "m", "start");
      const vis = hideAll ? shown.has(i) : !shown.has(i);
      if (r.kind === "text") {
        toks(g, 150, y + 4, r.input);
        text(g, 150, y + 50, "target →", "m", "start");
        if (vis) { const x2 = toks(g, 210, y + 36, r.target, true); text(g, x2 + 4, y + 52, r.note, "m", "start"); }
        else text(g, 210, y + 52, "(hidden — click to show)", "m", "start");
      } else if (r.kind === "clip") {
        [0, 1, 2].forEach(k => photo(g, 150 + k * 60, y + 8, 12, PAL[k]));
        ["a sunny hill", "a beach", "a city at night"].forEach((c, k) => { const w = tokW(c); el("rect", { x: 340, y: y + 2 + k * 22, width: w, height: 19, rx: 5, class: "s-box" }, g); text(g, 340 + w / 2, y + 16 + k * 22, c, ""); });
        text(g, 480, y + 40, "target →", "m", "start");
        if (vis) {
          for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) el("rect", { x: 545 + b * 22, y: y + 6 + a * 22, width: 20, height: 20, rx: 3, class: `s-box ${a === b ? "on" : ""}` }, g);
          text(g, 620, y + 32, "which caption", "m", "start"); text(g, 620, y + 48, "matches which photo", "m", "start");
        } else text(g, 545, y + 44, "(hidden)", "m", "start");
      } else if (r.kind === "mae") {
        photo(g, 150, y + 4, 16, PAL[0], MASK);
        text(g, 230, y + 30, "12 of 16 patches removed (75%)", "m", "start");
        text(g, 480, y + 40, "target →", "m", "start");
        if (vis) { photo(g, 545, y + 4, 16, PAL[0], null, MASK); text(g, 620, y + 40, "the missing pixels", "m", "start"); }
        else text(g, 545, y + 44, "(hidden)", "m", "start");
      } else {
        photo(g, 150, y + 4, 16, PAL[1]);
        el("rect", { x: 149, y: y + 3, width: 49, height: 49, fill: "none", stroke: "var(--blue-2)", "stroke-width": 2 }, g);
        el("rect", { x: 181, y: y + 19, width: 33, height: 33, fill: "none", stroke: "var(--orange)", "stroke-width": 2, "stroke-dasharray": "4 3" }, g);
        text(g, 230, y + 22, "two crops of one image:", "m", "start");
        text(g, 230, y + 38, "large (blue), small (orange)", "m", "start");
        text(g, 480, y + 40, "target →", "m", "start");
        if (vis) {
          box(g, 545, y + 6, 76, 26, "teacher", "", "");
          box(g, 545, y + 40, 76, 26, "student", "on", "b");
          arrow(s, 628, y + 53, 644, y + 26, true);
          text(g, 650, y + 26, "outputs match", "o", "start");
          text(g, 650, y + 44, "no labels", "m", "start");
        } else text(g, 545, y + 44, "(hidden)", "m", "start");
      }
      g.addEventListener("click", () => { shown.has(i) ? shown.delete(i) : shown.add(i); draw(); });
      y += hh + 6;
    });
    s.setAttribute("viewBox", `0 0 ${W} ${y}`);
  }
  draw();
}

// ── BPE merges on Sennrich et al.'s dictionary ───────────────────────────────
const BPE_DICT = [["low", 5], ["lower", 2], ["newest", 6], ["widest", 3]];
const bpeInit = () => BPE_DICT.map(([w, f]) => ({ w, f, syms: [...w.split(""), "</w>"] }));
function bpeStats(v) {
  const m = new Map();
  for (const { syms, f } of v) for (let i = 0; i < syms.length - 1; i++) {
    const k = syms[i] + "|" + syms[i + 1];
    m.set(k, (m.get(k) || 0) + f);
  }
  return m; // insertion order = first time a pair is counted, as in the paper's Python
}
function bpeMerge(syms, a, b) {
  const o = [];
  for (let i = 0; i < syms.length; i++) {
    if (i < syms.length - 1 && syms[i] === a && syms[i + 1] === b) { o.push(a + b); i++; } else o.push(syms[i]);
  }
  return o;
}
export function bpe(root) {
  const body = frame(root, "Byte-pair encoding, one merge at a time",
    "Press Merge: the most frequent adjacent pair (orange) becomes one symbol everywhere. Then segment a word the dictionary never contained.",
    "Dictionary and algorithm from <a data-ref=\"sennrich2016\">Sennrich et al. (2016)</a>, Algorithm 1. Merges are computed in your browser; ties go to the pair counted first, as Python's <code>max</code> does in the paper's code.");
  let vocab = bpeInit(), merges = [];
  const s = svg(430, 190, null, "BPE dictionary as symbol boxes");
  const table = h("div", { class: "table-wrap", style: "margin:0" });
  const bStep = h("button", { class: "primary" }, "Merge top pair");
  const bTen = h("button", {}, "Run to 10 merges");
  const bReset = h("button", {}, "Reset");
  const read = h("div", { class: "readout" });
  const word = h("input", { type: "text", value: "lowest", "aria-label": "word to segment", style: "width:9em;font:inherit;padding:.2rem .4rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
  const seg = h("div", { class: "readout", style: "margin-top:.5rem" });
  body.append(h("div", { class: "controls" }, bStep, bTen, bReset), h("div", { class: "two" }, s, table), read,
    h("div", { class: "controls", style: "margin-top:.8rem" }, h("label", {}, "Segment a new word", word)), seg);
  const step = () => {
    const [k] = top();
    if (!k) return;
    const [a, b] = k.split("|");
    merges.push([a, b]);
    vocab = vocab.map(r => ({ ...r, syms: bpeMerge(r.syms, a, b) }));
  };
  function top() {
    let bk = null, bv = -1;
    for (const [k, v] of bpeStats(vocab)) if (v > bv) { bk = k; bv = v; }
    return [bk, bv];
  }
  bStep.addEventListener("click", () => { step(); draw(); });
  bTen.addEventListener("click", () => { while (merges.length < 10) step(); draw(); });
  bReset.addEventListener("click", () => { vocab = bpeInit(); merges = []; draw(); });
  word.addEventListener("input", draw);
  function draw() {
    const stats = bpeStats(vocab), [tk, tv] = top();
    const [ta, tb] = tk ? tk.split("|") : [];
    s.innerHTML = "";
    vocab.forEach((r, i) => {
      const y = 10 + i * 44;
      let x = 0;
      r.syms.forEach((sym, j) => {
        const on = tk && ((sym === ta && r.syms[j + 1] === tb) || (sym === tb && r.syms[j - 1] === ta));
        const w = sym.length * 8.2 + 14;
        box(s, x, y, w, 30, sym, on ? "on" : "", on ? "b" : "mono");
        x += w + 4;
      });
      text(s, x + 8, y + 20, `× ${r.f}`, "m", "start");
    });
    const sorted = [...stats].sort((p, q) => q[1] - p[1]).slice(0, 7);
    const ties = [...stats].filter(([, v]) => v === tv).length;
    table.innerHTML = `<table><tr><th>pair</th><th>count</th></tr>${sorted.map(([k, v]) =>
      `<tr${k === tk ? ' style="background:var(--tint)"' : ""}><td style="white-space:nowrap"><code>${k.split("|").map(esc).join(" ")}</code></td><td>${v}${k === tk && ties > 1 ? ` <span class="note">tie with ${ties - 1} other${ties > 2 ? "s" : ""}: first counted wins</span>` : ""}</td></tr>`).join("")}</table>`;
    read.textContent = merges.length ? `Merges so far:\n${merges.map(([a, b], i) => `${i + 1}. ${a} ${b} → ${a + b}`).join("\n")}` : "No merges yet. The vocabulary is the characters plus </w>.";
    const w = (word.value || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    let sy = [...w.split(""), "</w>"];
    merges.forEach(([a, b]) => { sy = bpeMerge(sy, a, b); });
    seg.textContent = w ? `${w}  →  ${sy.join(" + ")}   (${sy.length} symbol${sy.length > 1 ? "s" : ""} after ${merges.length} merge${merges.length === 1 ? "" : "s"})` : "Type a word.";
  }
  draw();
}
const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ── Board 4: C ≈ 6ND ─────────────────────────────────────────────────────────
export function sixND(root) {
  const body = frame(root, "Board 4 — one matrix product forward, two backward",
    "Step through the passes for y = Wx, then price a whole training run.",
    "Counting rule from <a data-ref=\"kaplan2020\">Kaplan et al. (2020)</a>, §2.1. Reported totals: GPT-3 from <a data-ref=\"brown2020\">Brown et al. (2020)</a>, Table D.1; Llama 3 from <a data-ref=\"grattafiori2024\">Grattafiori et al. (2024)</a>, §1 and §3.2; DeepSeek-V3 from <a data-ref=\"deepseekai2024\">DeepSeek-AI (2024)</a>, §1; nanoGPT's tokens from <code>config/train_gpt2.py</code> (<a data-ref=\"karpathy2022\">Karpathy, 2022</a>). 6ND is computed here.");
  const m = 4, n = 5;
  let stage = 0;
  const STAGES = ["Forward: y = Wx", "Backward: ∂L/∂x = Wᵀg", "Backward: ∂L/∂W = g xᵀ"];
  const bar = h("div", { class: "controls" });
  const s = svg(760, 250, null, "linear layer, forward and backward FLOPs");
  body.append(bar, s);
  STAGES.forEach((t, i) => bar.appendChild(h("button", { onclick: () => { stage = i; draw(); } }, t)));
  // calculator
  const MODELS = [
    { name: "GPT-2 small (nanoGPT)", N: 124439808, D: 294912000000, rep: null, note: "No total reported. The nanoGPT README says the run takes about 4 days on one node of 8 A100 40GB GPUs." },
    { name: "same, non-embedding N", N: 84934656, D: 294912000000, rep: null, note: "N ≈ 12·n_layer·d² = 12·12·768², the convention of Kaplan et al. (2020), eq. 2.1." },
    { name: "GPT-3 175B", N: 174.6e9, D: 300e9, rep: 3.14e23, note: "Brown et al. computed their total with this same rule, so agreement checks the arithmetic, not the rule." },
    { name: "Llama 3 405B", N: 405e9, D: 15.6e12, rep: 3.8e25, note: "The paper does not say how its total was computed." },
    { name: "DeepSeek-V3 (37B active of 671B)", N: 37e9, D: 14.8e12, rep: null, note: "A mixture of experts: only active parameters count. Reported cost: 2.664M H800 GPU-hours for pre-training." },
  ];
  let cur = MODELS[0];
  const show = v => (v < 1e9 ? v.toLocaleString("en-US") : human(v, 4));
  const inN = h("input", { type: "text", value: show(cur.N), "aria-label": "parameters N", style: "width:8em;font:inherit;padding:.2rem .4rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
  const inD = h("input", { type: "text", value: show(cur.D), "aria-label": "tokens D", style: "width:8em;font:inherit;padding:.2rem .4rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
  const presets = h("div", { class: "controls" }, ...MODELS.map(M => h("button", { onclick: () => { cur = M; inN.value = show(M.N); inD.value = show(M.D); calc(); } }, M.name)));
  const read = h("div", { class: "readout" });
  body.append(presets, h("div", { class: "controls" }, h("label", {}, "N (parameters)", inN), h("label", {}, "D (tokens)", inD), h("span", { class: "note" }, "suffixes K, M, B, T")), read);
  [inN, inD].forEach(i => i.addEventListener("input", () => { cur = null; calc(); }));
  function calc() {
    const N = parseCount(inN.value), D = parseCount(inD.value);
    if (!(N > 0 && D > 0)) { read.textContent = "Enter N and D, e.g. 124.4M and 294.9B."; return; }
    const C = 6 * N * D;
    let t = `C ≈ 6 · ${human(N, 2)} · ${human(D, 2)} = <b>${sciN(C)}</b> FLOPs  =  ${(C / 8.64e19).toPrecision(3)} PF-days`;
    if (cur && cur.rep) t += `\nReported: ${sciN(cur.rep)} FLOPs  (ratio ${(C / cur.rep).toFixed(3)})`;
    if (cur) t += `\n${cur.note}`;
    read.innerHTML = t;
  }
  function grid(x, y, rows, cols, cw, cls, label) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) el("rect", { x: x + c * cw, y: y + r * cw, width: cw - 3, height: cw - 3, rx: 3, class: `s-box ${cls}` }, s);
    text(s, x + (cols * cw) / 2, y - 8, label, "b");
  }
  function draw() {
    [...bar.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === stage)));
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const cw = 30;
    grid(40, 50, n, 1, cw, stage === 1 ? "on" : "", "x (n = 5)");
    grid(170, 65, m, n, cw, stage === 2 ? "on" : "", "W (m × n)");
    grid(380, 65, m, 1, cw, stage === 0 ? "on" : "", "y (m = 4)");
    if (stage > 0) grid(480, 65, m, 1, cw, "on", "g = ∂L/∂y");
    if (stage === 0) { arrow(s, 72, 125, 165, 125, true); arrow(s, 322, 125, 376, 125, true); }
    if (stage === 1) { arrow(s, 476, 125, 414, 125, true); arrow(s, 165, 150, 74, 150, true); text(s, 118, 170, "Wᵀg", "o"); }
    if (stage === 2) { arrow(s, 476, 125, 414, 125, true); arrow(s, 72, 175, 165, 175, true); text(s, 118, 195, "g xᵀ", "o"); }
    const lines = [["forward: y = Wx", "2mn"], ["∂L/∂x = Wᵀg", "2mn"], ["∂L/∂W = g xᵀ", "2mn"]];
    lines.forEach(([a, b], i) => {
      const on = i === stage, done = i <= stage;
      text(s, 548, 60 + i * 34, a, on ? "b" : "", "start").setAttribute("opacity", done ? 1 : 0.45);
      text(s, 752, 60 + i * 34, done ? b : "?", on ? "o" : "", "end").setAttribute("opacity", done ? 1 : 0.45);
    });
    el("line", { x1: 548, y1: 150, x2: 752, y2: 150, class: "s-axis" }, s);
    const tot = [2, 4, 6][stage];
    text(s, 548, 176, `so far: ${tot}mn per token`, "b", "start");
    text(s, 548, 200, stage === 2 ? "= 6 FLOPs per parameter" : "", "o", "start");
    text(s, 548, 234, "a product: mn × and mn +", "m", "start");
  }
  draw(); calc();
}

// ── Memory: bytes per parameter, and ZeRO ────────────────────────────────────
export function bytesPerParam(root) {
  const body = frame(root, "Bytes per parameter for mixed-precision AdamW, and ZeRO sharding",
    "Set the model size. Top: three published accountings against one 80 GB GPU. Bottom: split the 16-byte version across GPUs.",
    "16 bytes and the ZeRO stage formulas: <a data-ref=\"rajbhandari2020\">Rajbhandari et al. (2020)</a>, §3.1 and §5 (Table 1 gives 7.5B on 64 GPUs: 120, 31.4, 16.6 and 1.88 GB — choose 7.5B and 64 to check). 12 bytes: Stanford CS336 (2026), lecture 2. 18 bytes: CMU 11-711 (Spring 2026), lecture 20. 80 GB per H100: <a data-ref=\"grattafiori2024\">Grattafiori et al. (2024)</a>, §3.3.1. Activations are excluded. GB = 10⁹ bytes; totals computed here.");
  const CONV = [
    { src: "12 bytes (CS336)", parts: [["16-bit weights", 2], ["16-bit grads", 2], ["Adam m", 4], ["Adam v", 4]] },
    { src: "16 bytes (ZeRO)", parts: [["16-bit weights", 2], ["16-bit grads", 2], ["FP32 master", 4], ["Adam m", 4], ["Adam v", 4]] },
    { src: "18 bytes (CMU ANLP)", parts: [["BF16 weights", 2], ["FP32 weights", 4], ["FP32 grads", 4], ["Adam m", 4], ["Adam v", 4]] },
  ];
  // fixed fills, readable with white digits in light and dark themes
  const COL = { "16-bit weights": "#1f5aa6", "BF16 weights": "#1f5aa6", "16-bit grads": "#4f86c6", "FP32 grads": "#4f86c6", "FP32 master": "#5b6f8c", "FP32 weights": "#5b6f8c", "Adam m": "#ef7c00", "Adam v": "#b85f00" };
  const SIZES = [["1.5B", 1.5e9], ["7B", 7e9], ["7.5B", 7.5e9], ["70B", 70e9], ["175B", 175e9]];
  let P = 7e9, Nd = 64;
  const sizeBar = h("div", { class: "controls" }, h("span", { class: "note" }, "Parameters Ψ:"));
  const s1 = svg(760, 188, null, "bytes per parameter, three conventions");
  const ndSl = slider("GPUs N_d", 0, 6, 1, 6, v => { Nd = 2 ** v; draw(); }, v => String(2 ** v));
  const s2 = svg(760, 190, null, "ZeRO stages per GPU");
  const read = h("div", { class: "readout" });
  body.append(sizeBar, s1, h("div", { class: "controls", style: "margin-top:.6rem" }, ndSl), s2, read);
  SIZES.forEach(([l, v]) => sizeBar.appendChild(h("button", { onclick: () => { P = v; draw(); } }, l)));
  function draw() {
    [...sizeBar.querySelectorAll("button")].forEach((b, i) => b.setAttribute("aria-pressed", String(SIZES[i][1] === P)));
    s1.innerHTML = "";
    const X = linS(0, 18, 150, 520);
    CONV.forEach((c, i) => {
      const y = 8 + i * 50;
      text(s1, 140, y + 22, c.src, "b", "end");
      let acc = 0;
      c.parts.forEach(([nm, b]) => {
        const x = X(acc), w = X(acc + b) - x;
        el("rect", { x, y, width: w - 2, height: 32, rx: 3, fill: COL[nm] }, s1);
        text(s1, x + w / 2, y + 21, String(b), "w b");
        acc += b;
      });
      const tot = acc * P;
      text(s1, 540, y + 21, `${gb(tot)}`, tot > 80e9 ? "o" : "b", "start");
      text(s1, 640, y + 21, tot > 80e9 ? `≥ ${Math.ceil(tot / 80e9)} × 80 GB` : "fits one 80 GB GPU", "m", "start");
    });
    const LEG = [["16-bit weights", "#1f5aa6"], ["gradients (16- or 32-bit)", "#4f86c6"], ["FP32 copy of weights", "#5b6f8c"], ["Adam m", "#ef7c00"], ["Adam v", "#b85f00"]];
    let lx = 150;
    LEG.forEach(([nm, c]) => {
      el("rect", { x: lx, y: 166, width: 14, height: 14, rx: 2, fill: c }, s1);
      const t = text(s1, lx + 20, 178, nm, "m", "start");
      lx += 20 + (t.getComputedTextLength() || nm.length * 6.2) + 16;
    });
    s2.innerHTML = "";
    const stages = [
      ["data parallel", 16 * P],
      ["P_os  4Ψ + 12Ψ/N_d", 4 * P + (12 * P) / Nd],
      ["P_os+g  2Ψ + 14Ψ/N_d", 2 * P + (14 * P) / Nd],
      ["P_os+g+p  16Ψ/N_d", (16 * P) / Nd],
    ];
    const max = stages[0][1], XB = linS(0, max, 200, 640);
    stages.forEach(([nm, v], i) => {
      const y = 8 + i * 44;
      text(s2, 190, y + 20, nm, i ? "" : "m", "end");
      el("rect", { x: 200, y, width: Math.max(2, XB(v) - 200), height: 28, rx: 3, class: `s-bar ${i === 3 ? "on" : i ? "hi" : ""}` }, s2);
      text(s2, Math.max(XB(v), 200) + 8, y + 19, gb(v), v > 80e9 ? "o" : "b", "start");
    });
    const x80 = XB(80e9);
    if (x80 < 640) { el("line", { x1: x80, y1: 0, x2: x80, y2: 180, class: "s-edge dash" }, s2); text(s2, x80 + 4, 186, "80 GB", "m", "start"); }
    read.innerHTML = `Ψ = ${human(P)} parameters, N_d = ${Nd} GPUs: model states per GPU fall from <b>${gb(16 * P)}</b> to <b>${gb((16 * P) / Nd)}</b> with all three stages.\nOptimiser state (12 of the 16 bytes) dominates, which is why ZeRO shards it first.`;
  }
  draw();
}

// ── FP32, FP16, BF16 as bits ─────────────────────────────────────────────────
function encodeFloat(x, E, M) {
  const bias = 2 ** (E - 1) - 1, sign = x < 0 ? 1 : 0, a = Math.abs(x), eMax = 2 ** E - 1;
  const bits = (ef, mf) => ({ sign, ef, mf, value: (sign ? -1 : 1) * (ef === 0 ? mf * 2 ** (1 - bias - M) : (1 + mf / 2 ** M) * 2 ** (ef - bias)) });
  if (a === 0) return { ...bits(0, 0), status: "zero" };
  if (!Number.isFinite(a) || a >= (2 - 2 ** -(M + 1)) * 2 ** bias) return { sign, ef: eMax, mf: 0, value: sign ? -Infinity : Infinity, status: "overflow → ∞" };
  let e = Math.floor(Math.log2(a));
  if (2 ** e > a) e -= 1;
  if (e < 1 - bias) {
    const mf = Math.round(a / 2 ** (1 - bias - M));
    if (mf === 0) return { ...bits(0, 0), status: "underflow → 0" };
    if (mf >= 2 ** M) return { ...bits(1, 0), status: "normal" };
    return { ...bits(0, mf), status: "subnormal (few significant bits)" };
  }
  let mf = Math.round((a / 2 ** e - 1) * 2 ** M);
  if (mf === 2 ** M) { mf = 0; e += 1; }
  if (e + bias >= eMax) return { sign, ef: eMax, mf: 0, value: sign ? -Infinity : Infinity, status: "overflow → ∞" };
  return { ...bits(e + bias, mf), status: "normal" };
}
export function floatBits(root) {
  const body = frame(root, "FP32, FP16 and BF16, bit by bit",
    "Type a number. Each row shows the bits that store it and the value that comes back. BF16 has FP32's 8 exponent bits.",
    "Bit layouts and ranges from <a data-ref=\"kalamkar2019\">Kalamkar et al. (2019)</a>, Table 1. Encoding computed in your browser, rounding to the nearest representable value.");
  const FMT = [["FP32", 8, 23], ["FP16", 5, 10], ["BF16", 8, 7]];
  const inp = h("input", { type: "text", value: "70000", "aria-label": "number", style: "width:9em;font:inherit;padding:.2rem .4rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
  const s = svg(760, 200, null, "floating point bit strips");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("label", {}, "Value", inp),
    ...["70000", "65504", "0.1", "1e-8"].map(v => h("button", { onclick: () => { inp.value = v; draw(); } }, v))), s, read);
  inp.addEventListener("input", draw);
  function draw() {
    const x = Number(inp.value);
    s.innerHTML = "";
    const cw = 17.5, x0 = 70;
    const out = [];
    FMT.forEach(([nm, E, M], i) => {
      const y = 14 + i * 62;
      text(s, x0 - 10, y + 18, nm, "b", "end");
      const r = Number.isFinite(x) ? encodeFloat(x, E, M) : null;
      const cells = [["s", 1, r ? String(r.sign) : ""], ["e", E, r ? r.ef.toString(2).padStart(E, "0") : ""], ["m", M, r ? r.mf.toString(2).padStart(M, "0") : ""]];
      let cx = x0;
      cells.forEach(([k, len, str]) => {
        for (let j = 0; j < len; j++) {
          const fill = k === "s" ? "var(--panel-2)" : k === "e" ? "var(--tint)" : "var(--panel)";
          el("rect", { x: cx + j * cw, y, width: cw - 2, height: 26, rx: 2, fill, stroke: k === "e" ? "var(--orange)" : "var(--line)" }, s);
          if (str) text(s, cx + j * cw + (cw - 2) / 2, y + 18, str[j], "mono");
        }
        text(s, cx + (len * cw) / 2, y + 42, k === "s" ? "sign" : k === "e" ? `exponent ${len}` : `mantissa ${len}`, "m");
        cx += len * cw + 6;
      });
      if (r) out.push(`${nm.padEnd(5)} ${r.status.padEnd(34)} stored value: ${Number.isFinite(r.value) ? r.value.toPrecision(8) : r.value}`);
    });
    read.textContent = Number.isFinite(x) ? out.join("\n") + "\nFP16's largest value is 65,504; BF16 reaches 3.4 × 10³⁸ like FP32, with less precision." : "Type a number, e.g. 70000 or 1e-8.";
  }
  draw();
}

// ── The data funnel ──────────────────────────────────────────────────────────
export function dataFunnel(root) {
  const body = frame(root, "RefinedWeb: how much of Common Crawl survives",
    "Enter your prediction, then step through the stages. Bar width is the share of the original crawl still kept.",
    "Stages and rates from <a data-ref=\"penedo2023\">Penedo et al. (2023)</a>, Fig. 2 — redrawn. Rates are in documents during document preparation and in tokens afterwards. The figure's caption gives 24% and 12% where the bars read 23.34% and 11.67% kept; the figure's values are used. DINOv2 pipeline from <a data-ref=\"oquab2024\">Oquab et al. (2024)</a>, §3; the paper gives only the endpoints, so no percentages are drawn.");
  const ST = [
    ["Common Crawl", null, 100, ""],
    ["URL filtering", 2.24, 97.76, "Document preparation"],
    ["Text extraction", 1.49, 96.31, ""],
    ["Language identification", 50.66, 47.51, ""],
    ["Repetition removal", 24.28, 35.97, "Filtering"],
    ["Document-wise filtering", 16.19, 30.15, ""],
    ["Line-wise corrections", 22.59, 23.34, ""],
    ["Fuzzy deduplication", 37.88, 14.5, "Deduplication"],
    ["Exact deduplication", 18.47, 11.67, ""],
  ];
  let shown = 1, pred = store.get("funnel", "");
  const inp = h("input", { type: "number", min: 0, max: 100, value: pred, placeholder: "%", "aria-label": "predicted percent kept", style: "width:5em;font:inherit;padding:.2rem .4rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
  const bNext = h("button", { class: "primary" }, "Next stage");
  const bAll = h("button", {}, "Show all");
  const bReset = h("button", {}, "Reset");
  const s = svg(760, 360, null, "data filtering funnel");
  const read = h("div", { class: "readout" });
  const s2 = svg(760, 118, null, "DINOv2 data pipeline");
  body.append(h("div", { class: "controls" }, h("label", {}, "My prediction: % kept", inp), bNext, bAll, bReset), s, read,
    h("p", { class: "note", style: "margin:.9rem 0 .3rem" }, "Image foundation models, same shape: DINOv2's LVD-142M."), s2);
  inp.addEventListener("input", () => { pred = inp.value; store.set("funnel", pred); draw(); });
  bNext.addEventListener("click", () => { shown = Math.min(ST.length, shown + 1); draw(); });
  bAll.addEventListener("click", () => { shown = ST.length; draw(); });
  bReset.addEventListener("click", () => { shown = 1; draw(); });
  function draw() {
    s.innerHTML = "";
    const cx = 520, half = 175, rh = 36;
    const W = k => (half * 2 * k) / 100;
    ST.forEach(([nm, rem, kept, grp], i) => {
      const y = 8 + i * rh, vis = i < shown, last = i === shown - 1;
      if (grp) text(s, 0, y + 20, grp, "m", "start");
      text(s, 290, y + 20, nm, vis ? (last ? "b" : "") : "m", "end").setAttribute("opacity", vis ? 1 : 0.4);
      if (!vis) return;
      el("rect", { x: cx - W(kept) / 2, y: y + 4, width: W(kept), height: rh - 10, rx: 3, class: `s-bar ${last ? "on" : ""}` }, s);
      text(s, cx, y + 21, `${kept.toFixed(2)}%`, last ? "b" : "", "middle");
      if (rem !== null) text(s, 752, y + 21, `−${rem.toFixed(2)}%`, "m", "end");
    });
    const p = parseFloat(pred);
    if (p >= 0 && p <= 100) {
      [cx - W(p) / 2, cx + W(p) / 2].forEach(x => el("line", { x1: x, y1: 4, x2: x, y2: 8 + ST.length * rh, class: "s-edge dash" }, s));
      text(s, cx, 8 + ST.length * rh + 18, `your prediction: ${p}%`, "o");
    }
    text(s, 752, 8 + ST.length * rh + 18, "removed at this stage", "m", "end");
    const [nm, rem, kept] = ST[shown - 1];
    read.textContent = shown === 1 ? "All documents in the crawl. Press Next stage." :
      `After ${nm.toLowerCase()}: ${kept.toFixed(2)}% of the original crawl is kept; this stage removed ${rem.toFixed(2)}% of what reached it.` +
      (shown === ST.length ? "\nThe result is about five trillion English tokens (§3). Every stage removes a large share, and deduplication removes the most." : "");
    // DINOv2
    s2.innerHTML = ""; uid(s2); arrowDefs(s2);
    const steps = [["web-crawl", "image links"], ["drop unsafe URLs,", "duplicates, NSFW;", "blur faces"], ["1.2B unique", "images"], ["remove copies of", "benchmark", "test images"], ["retrieve against", "curated sets", "(ImageNet-22k …)"], ["LVD-142M", "142M images"]];
    const bw = 116, gap = 12.8;
    steps.forEach((ls, i) => {
      const x = i * (bw + gap), y = 10, on = i === steps.length - 1 || i === 2;
      el("rect", { x, y, width: bw, height: 92, rx: 7, class: `s-box ${on ? "on" : ""}` }, s2);
      ls.forEach((l, j) => text(s2, x + bw / 2, y + 46 - (ls.length - 1) * 8 + j * 16 + 4, l, on && j === 0 ? "b" : ""));
      if (i) arrow(s2, x - gap + 2, 56, x - 2, 56);
    });
  }
  draw();
}

// ── Kaplan et al.: a power law is a straight line ────────────────────────────
export function powerLaw(root) {
  const body = frame(root, "Kaplan et al. scaling law: L(N) = (N_c / N)^α_N",
    "Move α_N, switch to linear axes, or fit a line to three small models and extend it.",
    "L(N) with N_c = 8.8 × 10¹³ and α_N = 0.076 from <a data-ref=\"kaplan2020\">Kaplan et al. (2020)</a>, §1.2 (N excludes embeddings; loss in nats per token). Other α values keep N_c fixed and are for exploration only. The right panel is schematic, after the paper's Fig. 7, with no values.");
  const Nc = 8.8e13;
  let alpha = 0.076, linear = false, fit = false;
  const bLin = h("button", { "aria-pressed": "false" }, "Linear axes");
  const bFit = h("button", { "aria-pressed": "false" }, "Fit from three small models");
  const s = svg(470, 330, null, "loss against parameters");
  const s2 = svg(290, 330, null, "schematic: LSTM and Transformer curves");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("α_N", 0.03, 0.15, 0.001, alpha, v => { alpha = v; draw(); }, v => v.toFixed(3)), bLin, bFit),
    h("div", { class: "two", style: "grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)" }, s, s2), read);
  bLin.addEventListener("click", () => { linear = !linear; bLin.setAttribute("aria-pressed", String(linear)); draw(); });
  bFit.addEventListener("click", () => { fit = !fit; bFit.setAttribute("aria-pressed", String(fit)); draw(); });
  const L = N => (Nc / N) ** alpha;
  function draw() {
    s.innerHTML = ""; uid(s);
    const x0 = 62, x1 = 455, y0 = 280, y1 = 12;
    const lo = 1e3, hi = 1e11, Lmin = L(hi), Lmax = L(lo);
    const X = linear ? linS(0, hi, x0, x1) : logS(lo, hi, x0, x1);
    const yHi = linear ? Math.ceil(Lmax) : Lmax * 1.15;
    const Y = linear ? linS(0, yHi, y0, y1) : logS(Math.max(Lmin * 0.85, 0.5), yHi, y0, y1);
    const xt = linear ? [0, 2.5e10, 5e10, 7.5e10, 1e11] : [1e3, 1e5, 1e7, 1e9, 1e11];
    const yt = linear ? [0, Math.round(yHi / 2), Math.round(yHi)] : [1, 2, 3, 5, 8, 15, 30].filter(v => v >= Lmin * 0.85 && v <= yHi);
    logTicks(s, X, Y, x0, x1, y0, y1, xt, yt, "N, non-embedding parameters", "test loss L (nats)", v => (linear ? human(v) : `10${sup(lg(v))}`), v => String(v));
    const g = clip(s, x0, y1, x1 - x0, y0 - y1);
    const pts = [];
    for (let k = 0; k <= 200; k++) { const N = linear ? Math.max(lo, (hi * k) / 200) : 10 ** (3 + (8 * k) / 200); pts.push([X(N), Y(L(N))]); }
    el("path", { d: path(pts), class: "s-line", stroke: "var(--blue-2)" }, g);
    let t = `α_N = ${alpha.toFixed(3)}:  doubling N multiplies L by 2^−α = ${(2 ** -alpha).toFixed(3)}\n` +
      `halving L needs N × 2^(1/α) = ${Math.round(2 ** (1 / alpha)).toLocaleString("en-US")}   (computed here)`;
    if (fit) {
      const small = [1e5, 1e6, 1e7];
      small.forEach(N => el("circle", { cx: X(N), cy: Y(L(N)), r: 5, fill: "var(--orange)" }, g));
      const xs = small.map(lg), ys = small.map(N => lg(L(N)));
      const mx = xs.reduce((a, b) => a + b) / 3, my = ys.reduce((a, b) => a + b) / 3;
      const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      const pred = N => 10 ** (my + slope * (lg(N) - mx));
      const fp = [];
      for (let k = 0; k <= 100; k++) { const N = linear ? Math.max(1e5, (hi * k) / 100) : 10 ** (5 + (6 * k) / 100); fp.push([X(N), Y(pred(N))]); }
      el("path", { d: path(fp), class: "s-edge dash on" }, g);
      t += `\nFit through N = 10⁵, 10⁶, 10⁷: slope ${slope.toFixed(3)} on log–log axes; predicts L(10¹¹) = ${pred(1e11).toFixed(3)}.\nThe points here lie exactly on the law; real runs scatter around it.`;
    }
    read.textContent = t;
    // schematic
    s2.innerHTML = ""; uid(s2); arrowDefs(s2);
    const a0 = 30, a1 = 280, b0 = 170, b1 = 20;
    arrow(s2, a0, b0, a1, b0); arrow(s2, a0, b0, a0, b1);
    text(s2, (a0 + a1) / 2, b0 + 18, "parameters (log)", "m"); text(s2, a0 + 4, b1 + 4, "loss (log)", "m", "start");
    el("path", { d: `M${a0 + 10},${b1 + 40} L${a0 + 160},${b1 + 84}`, class: "s-line", stroke: "var(--muted)" }, s2);
    el("path", { d: `M${a0 + 10},${b1 + 48} L${a0 + 160},${b1 + 120}`, class: "s-line", stroke: "var(--orange)" }, s2);
    text(s2, a0 + 166, b1 + 88, "LSTM", "b", "start"); text(s2, a0 + 166, b1 + 124, "Transformer", "o", "start");
    const c0 = 30, c1 = 280, d0 = 310, d1 = 210;
    arrow(s2, c0, d0, c1, d0); arrow(s2, c0, d0, c0, d1);
    text(s2, (c0 + c1) / 2, d0 + 16, "token position in the context", "m"); text(s2, c0 + 4, d1 + 4, "loss", "m", "start");
    el("path", { d: `M${c0 + 8},${d1 + 20} Q${c0 + 50},${d1 + 62} ${c0 + 80},${d1 + 64} L${c1 - 10},${d1 + 66}`, class: "s-line", stroke: "var(--muted)" }, s2);
    el("path", { d: `M${c0 + 8},${d1 + 22} Q${c0 + 70},${d1 + 70} ${c1 - 10},${d1 + 88}`, class: "s-line", stroke: "var(--orange)" }, s2);
    text(s2, c1 - 12, d1 + 58, "LSTM flattens", "m", "end");
    text(s2, a1, 12, "schematic — no values", "m", "end");
  }
  draw();
}

// ── Board 5: IsoFLOP valleys from published fits ─────────────────────────────
const FITS = {
  printed: { name: "Hoffmann et al. (2022), eq. 10, as printed", E: 1.69, A: 406.4, B: 410.7, al: 0.34, be: 0.28 },
  unrounded: { name: "same fit, unrounded (Besiroglu et al., 2024, eq. 4)", E: 1.6934, A: 406.4, B: 410.7, al: 0.3392, be: 0.2849 },
  refit: { name: "Besiroglu et al. (2024), Table 1 refit", E: 1.8172, A: 482.01, B: 2085.43, al: 0.3478, be: 0.3658 },
};
export function isoFlop(root) {
  const body = frame(root, "Board 5 — at fixed compute, a model can be too big or too small",
    "Each curve holds C = 6ND fixed and trades parameters for tokens. Pick a fit and a budget.",
    "Computed from published fits, not measured runs. L(N, D) = E + A/N^α + B/D^β from <a data-ref=\"hoffmann2022\">Hoffmann et al. (2022)</a>, eq. 2 and eq. 10; unrounded values and the refit from <a data-ref=\"besiroglu2024\">Besiroglu et al. (2024)</a>, eq. 4 and Table 1. Gopher's budget, 5.76 × 10²³ FLOPs, from Hoffmann et al., Fig. 2 caption. Visual echo of their Fig. 3, redrawn. Kaplan's exponent 0.73 from <a data-ref=\"kaplan2020\">Kaplan et al. (2020)</a>, eq. 1.7.");
  const BUD = [1e19, 1e20, 1e21, 1e22, 5.76e23];
  let fitK = "printed", bi = 4;
  const sel = h("select", { "aria-label": "fit" }, ...Object.entries(FITS).map(([k, f]) => h("option", { value: k }, f.name)));
  const bb = h("div", { class: "controls" }, h("span", { class: "note" }, "Budget C:"));
  const s = svg(760, 340, null, "IsoFLOP curves");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("label", {}, "Fit", sel)), bb, s, read);
  sel.addEventListener("change", () => { fitK = sel.value; draw(); });
  BUD.forEach((c, i) => bb.appendChild(h("button", { onclick: () => { bi = i; draw(); } }, i === 4 ? "Gopher 5.76 × 10²³" : `10${sup(lg(c))}`)));
  const opt = (f, C) => {
    const a = f.be / (f.al + f.be), G = ((f.al * f.A) / (f.be * f.B)) ** (1 / (f.al + f.be));
    const N = G * (C / 6) ** a, D = C / (6 * N);
    return { a, N, D, L: f.E + f.A / N ** f.al + f.B / D ** f.be };
  };
  function draw() {
    [...bb.querySelectorAll("button")].forEach((b, i) => b.setAttribute("aria-pressed", String(i === bi)));
    const f = FITS[fitK];
    s.innerHTML = ""; uid(s);
    const x0 = 70, x1 = 745, y0 = 290, y1 = 14;
    const ops = BUD.map(C => opt(f, C));
    const yLo = Math.min(...ops.map(o => o.L)) - 0.12, yHi = Math.max(...ops.map(o => o.L)) + 0.9;
    const X = logS(1e7, 1e12, x0, x1), Y = linS(yLo, yHi, y0, y1);
    const yt = []; for (let v = Math.ceil(yLo * 2) / 2; v <= yHi; v += 0.5) yt.push(+v.toFixed(1));
    logTicks(s, X, Y, x0, x1, y0, y1, [1e7, 1e8, 1e9, 1e10, 1e11, 1e12], yt, "parameters N (log)", "loss", undefined, v => v.toFixed(1));
    const g = clip(s, x0, y1, x1 - x0, y0 - y1);
    BUD.forEach((C, i) => {
      const pts = [];
      for (let k = 0; k <= 160; k++) { const N = 10 ** (7 + (5 * k) / 160), D = C / (6 * N); pts.push([X(N), Y(f.E + f.A / N ** f.al + f.B / D ** f.be)]); }
      el("path", { d: path(pts), class: "s-line", stroke: i === bi ? "var(--orange)" : "var(--blue-2)", opacity: i === bi ? 1 : 0.45 }, g);
      el("circle", { cx: X(ops[i].N), cy: Y(ops[i].L), r: i === bi ? 6 : 4, fill: i === bi ? "var(--orange)" : "var(--blue-2)" }, g);
    });
    el("path", { d: path(ops.map(o => [X(o.N), Y(o.L)])), class: "s-edge dash" }, g);
    text(s, x1, y1 + 14, "computed from published fits, not measured runs", "m", "end");
    const o = ops[bi], vote = store.get("vote", null);
    const vt = { model: "mostly a bigger model", data: "mostly more data", both: "both equally" }[vote];
    read.innerHTML = `${f.name}\na = β/(α+β) = <b>${o.a.toFixed(3)}</b>   at C = ${sciN(BUD[bi])}:  N_opt = <b>${human1(o.N)}</b>,  D_opt = <b>${human1(o.D)}</b>,  D/N = ${(o.D / o.N).toFixed(0)}\n` +
      `10× compute with this fit: model × ${(10 ** o.a).toFixed(1)}, data × ${(10 ** (1 - o.a)).toFixed(1)}.   With Kaplan's 0.73: model × 5.4, data × 1.9.\n` +
      `Chinchilla as trained: 70B parameters, 1.4T tokens (Hoffmann et al., Table 1).` + (vt ? `\nYou voted: ${vt}.` : "");
  }
  draw();
}

// ── Kaplan vs Chinchilla: two slopes ─────────────────────────────────────────
export function twoSlopes(root) {
  const body = frame(root, "Kaplan vs Chinchilla: how fast should the model grow with compute?",
    "Drag the budget. Click a model to see its tokens per parameter.",
    "Both lines are anchored at the head-to-head of <a data-ref=\"hoffmann2022\">Hoffmann et al. (2022)</a>, App. D.4, at 10²¹ FLOPs: Kaplan's rule chose 4.68B parameters (slope 0.73), Approach 1 chose 2.86B (slope 0.50). Kaplan's own intercept is in different units. Model sizes and tokens from Hoffmann et al., Table 1; C = 6ND and the read-offs are computed here.");
  const MODELS = [["GPT-3", 175e9, 300e9], ["Gopher", 280e9, 300e9], ["MT-NLG 530B", 530e9, 270e9], ["Chinchilla", 70e9, 1.4e12]];
  let lc = lg(5.76e23), sel = 3;
  const s = svg(760, 350, null, "compute-optimal model size, two exponents");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("Budget C (log₁₀ FLOPs)", 19, 26, 0.05, lc, v => { lc = v; draw(); }, v => v.toFixed(2))), s, read);
  const kap = C => 4.68e9 * (C / 1e21) ** 0.73, chi = C => 2.86e9 * (C / 1e21) ** 0.5;
  function draw() {
    s.innerHTML = ""; uid(s);
    const x0 = 70, x1 = 745, y0 = 300, y1 = 12;
    const X = logS(1e19, 1e26, x0, x1), Y = logS(1e8, 1e13, y0, y1);
    logTicks(s, X, Y, x0, x1, y0, y1, [1e19, 1e20, 1e21, 1e22, 1e23, 1e24, 1e25, 1e26], [1e8, 1e9, 1e10, 1e11, 1e12, 1e13], "training compute C (FLOPs)", "parameters N");
    const g = clip(s, x0, y1, x1 - x0, y0 - y1);
    const line = (fn, col) => { const p = []; for (let k = 0; k <= 70; k++) { const C = 10 ** (19 + k / 10); p.push([X(C), Y(fn(C))]); } el("path", { d: path(p), class: "s-line", stroke: col }, g); };
    line(kap, "var(--muted)"); line(chi, "var(--orange)");
    text(s, X(2e21), Y(kap(2e21)) - 12, "Kaplan, slope 0.73", "b", "end");
    text(s, X(3e25), Y(chi(3e25)) + 20, "Chinchilla, slope 0.50", "o", "end");
    const C = 10 ** lc;
    el("line", { x1: X(C), y1: y1, x2: X(C), y2: y0, class: "s-edge dash on" }, g);
    [kap, chi].forEach(fn => el("circle", { cx: X(C), cy: Y(fn(C)), r: 5, fill: fn === kap ? "var(--muted)" : "var(--orange)" }, g));
    const OFF = [[-12, 18, "end"], [-12, -6, "end"], [12, -6, "start"], [12, 5, "start"]];
    MODELS.forEach(([nm, N, D], i) => {
      const cm = 6 * N * D, gp = el("g", { style: "cursor:pointer" }, s);
      el("circle", { cx: X(cm), cy: Y(N), r: i === sel ? 8 : 6, fill: "var(--blue-2)", stroke: i === sel ? "var(--orange)" : "none", "stroke-width": 3 }, gp);
      text(gp, X(cm) + OFF[i][0], Y(N) + OFF[i][1], nm, i === sel ? "b" : "", OFF[i][2]);
      gp.addEventListener("click", () => { sel = i; draw(); });
    });
    const [nm, N, D] = MODELS[sel];
    read.innerHTML = `At C = ${sciN(C)}: Kaplan's line gives <b>${human1(kap(C))}</b> parameters, Chinchilla's <b>${human1(chi(C))}</b>.\n` +
      `${nm}: ${human(N)} parameters, ${human(D)} tokens, C = 6ND = ${sciN(6 * N * D)}, <b>${(D / N).toFixed(1)}</b> tokens per parameter.\n` +
      `At Gopher's budget (5.76 × 10²³) the lines read 485B and 69B. GPT-3, Gopher and MT-NLG sit near the steeper line.`;
  }
  draw();
}

// ── PEFT: where each method attaches ─────────────────────────────────────────
export function peftAttach(root) {
  const body = frame(root, "Where each PEFT method attaches to a Transformer block",
    "Grey parts are frozen. Pick a method: orange shows what is trained.",
    "Block after session 01's C1–C6, redrawn. Method details from the papers named below the diagram.");
  const M = {
    Adapter: { t: "Small bottleneck MLPs inserted after the attention and MLP sub-layers, in series on the path.", f: "3.6% of parameters per task, within 0.4% of full fine-tuning on GLUE (<a data-ref=\"houlsby2019\">Houlsby et al., 2019</a>).", inf: "Extra layers run in sequence: on GPT-2 medium at batch 1, +20.7% and +30.3% latency for two adapter variants (<a data-ref=\"hu2022\">Hu et al., 2022</a>, Table 1)." },
    Prefix: { t: "Trained vectors that every layer's attention reads as if they were extra tokens at the front.", f: "0.1% of the parameters, comparable in the full-data setting (<a data-ref=\"li2021a\">Li &amp; Liang, 2021</a>).", inf: "No extra layers, but the prefix takes part of the context." },
    Prompt: { t: "Trained vectors at the input sequence only.", f: "Matches full model tuning as T5 models exceed billions of parameters (<a data-ref=\"lester2021\">Lester et al., 2021</a>).", inf: "No extra layers, but the vectors take part of the context." },
    BitFit: { t: "Only the bias terms of the existing layers are trained.", f: "Under 0.1% of the parameters (<a data-ref=\"benzaken2022\">Ben Zaken et al., 2022</a>).", inf: "No change at inference." },
    LoRA: { t: "Low-rank side paths in parallel with W_q and W_v; the update BA can be merged into the weights.", f: "GPT-3 175B: 18.9M parameters, about 10⁻⁴ of the model (<a data-ref=\"hu2022\">Hu et al., 2022</a>).", inf: "No extra latency once BA is merged into W." },
  };
  let cur = "LoRA";
  const tabs = h("div", { class: "controls" });
  const s = svg(760, 264, null, "Transformer block with PEFT attachments");
  const read = h("div", { class: "readout" });
  body.append(tabs, s, read);
  Object.keys(M).forEach(k => tabs.appendChild(h("button", { onclick: () => { cur = k; draw(); } }, k)));
  function draw() {
    [...tabs.children].forEach(b => b.setAttribute("aria-pressed", String(b.textContent === cur)));
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const y = 150, on = k => cur === k;
    // input tokens
    const toks = on("Prompt") ? 6 : 4;
    for (let i = 0; i < toks; i++) {
      const pr = on("Prompt") && i < 2;
      el("rect", { x: 10 + i * 13, y: y - 10, width: 10, height: 20, rx: 2, class: `s-box ${pr ? "on" : ""}` }, s);
    }
    text(s, 40, y + 34, on("Prompt") ? "input + prompt" : "input", on("Prompt") ? "o" : "m");
    const X = [100, 175, 330, 410, 490, 645, 720];
    arrow(s, 92, y, X[0], y);
    box(s, X[0], y - 18, 55, 36, "LN", "", "");
    arrow(s, X[0] + 55, y, X[1], y);
    // attention with four matrices
    el("rect", { x: X[1], y: y - 60, width: 135, height: 120, rx: 8, class: "s-box" }, s);
    text(s, X[1] + 67, y - 42, "attention", "b");
    ["W_q", "W_k", "W_v", "W_o"].forEach((w, i) => {
      const bx = X[1] + 10 + (i % 2) * 62, by = y - 28 + Math.floor(i / 2) * 40;
      box(s, bx, by, 52, 28, w, "", "mono");
      if (on("BitFit")) text(s, bx + 46, by + 10, "+b", "o", "end");
      if (on("LoRA") && (w === "W_q" || w === "W_v")) {
        el("rect", { x: bx + 4, y: by + 30, width: 44, height: 8, rx: 2, class: "s-box on" }, s);
      }
    });
    if (on("LoRA")) text(s, X[1] + 67, y + 76, "BA beside W_q, W_v", "o");
    if (on("Prefix")) {
      for (let i = 0; i < 3; i++) el("rect", { x: X[1] + 30 + i * 26, y: y + 68, width: 20, height: 20, rx: 3, class: "s-box on" }, s);
      arrow(s, X[1] + 67, y + 66, X[1] + 67, y + 62, true);
      text(s, X[1] + 67, y + 104, "prefix vectors, read at every layer", "o");
    }
    let xa = X[1] + 135;
    if (on("Adapter")) { arrow(s, xa, y, xa + 12, y, true); box(s, xa + 12, y - 16, 36, 32, "A", "on", "b"); xa += 48; }
    arrow(s, xa, y, X[2] + 60, y);
    el("circle", { cx: X[2] + 72, cy: y, r: 12, class: "s-box" }, s); text(s, X[2] + 72, y + 5, "+");
    el("path", { d: `M92,${y} C92,${y - 120} ${X[2] + 72},${y - 120} ${X[2] + 72},${y - 12}`, class: "s-edge faint" }, s);
    arrow(s, X[2] + 84, y, X[3] + 20, y);
    box(s, X[3] + 20, y - 18, 55, 36, "LN", "", "");
    arrow(s, X[3] + 75, y, X[4] + 20, y);
    el("rect", { x: X[4] + 20, y: y - 36, width: 100, height: 72, rx: 8, class: "s-box" }, s);
    text(s, X[4] + 70, y - 16, "MLP", "b");
    box(s, X[4] + 30, y - 4, 38, 26, "W₁", "", "mono"); box(s, X[4] + 74, y - 4, 38, 26, "W₂", "", "mono");
    if (on("BitFit")) { text(s, X[4] + 64, y - 6, "+b", "o", "end"); text(s, X[4] + 108, y - 6, "+b", "o", "end"); }
    let xm = X[4] + 120;
    if (on("Adapter")) { arrow(s, xm, y, xm + 10, y, true); box(s, xm + 10, y - 16, 34, 32, "A", "on", "b"); xm += 44; }
    arrow(s, xm, y, X[5] + 38, y);
    el("circle", { cx: X[5] + 50, cy: y, r: 12, class: "s-box" }, s); text(s, X[5] + 50, y + 5, "+");
    el("path", { d: `M${X[2] + 90},${y} C${X[2] + 90},${y + 110} ${X[5] + 50},${y + 110} ${X[5] + 50},${y + 12}`, class: "s-edge faint" }, s);
    arrow(s, X[5] + 62, y, 752, y);
    text(s, 700, y - 16, "× N layers", "m");
    if (on("BitFit")) text(s, 380, 26, "only bias vectors train (+b); LayerNorm parameters stay frozen here", "o");
    const m = M[cur];
    read.innerHTML = `<b>${cur}</b>: ${m.t}\nTrainable: ${m.f}\nInference: ${m.inf}`;
    linkCites(read);
  }
  draw();
}

// ── Board 6: LoRA ────────────────────────────────────────────────────────────
export function loraMatrix(root) {
  const body = frame(root, "Board 6 — LoRA: a thin trainable side path on a frozen matrix",
    "Change d and r, step training (B starts at zero), then merge BA into W₀.",
    "h = W₀x + (α/r)BAx with A random and B = 0 at the start, after <a data-ref=\"hu2022\">Hu et al. (2022)</a>, eq. 3 and Fig. 1 — redrawn. GPT-3 175B: 96 layers, d_model = 12,288 (<a data-ref=\"brown2020\">Brown et al., 2020</a>, Table 2.1). Counts computed here; the paper's budget is “18M (roughly 35MB if stored in FP16)”, §7.1. A and B are drawn to scale but kept between 5 and 40 px thick. Training is animated, not computed.");
  const DS = [64, 128, 256, 512, 768, 1024, 2048, 4096, 8192, 12288], RS = [1, 2, 4, 8, 16, 32, 64];
  let di = 9, ri = 2, layers = 96, t = 0, merged = false;
  const sD = slider("d = k", 0, DS.length - 1, 1, di, v => { di = v; draw(); }, v => DS[v].toLocaleString("en-US"));
  const sR = slider("rank r", 0, RS.length - 1, 1, ri, v => { ri = v; draw(); }, v => String(RS[v]));
  const sL = slider("layers", 1, 96, 1, layers, v => { layers = v; draw(); });
  const bStep = h("button", { class: "primary" }, "Training step");
  const bMerge = h("button", {}, "Merge BA into W₀");
  const bReset = h("button", {}, "Reset");
  const s = svg(760, 330, null, "LoRA matrices");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sD, sR, sL), h("div", { class: "controls" }, bStep, bMerge, bReset), s, read);
  bStep.addEventListener("click", () => { if (!merged) { t = Math.min(1, t + 0.25); draw(); } });
  bMerge.addEventListener("click", () => { merged = true; draw(); });
  bReset.addEventListener("click", () => { t = 0; merged = false; draw(); });
  function draw() {
    const d = DS[di], k = d, r = RS[ri];
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const side = 160, thin = Math.min(40, Math.max(5, (side * r) / d));
    const xIn = 330, yIn = 322, plusY = 44;
    text(s, xIn, yIn + 4, "x", "b");
    if (!merged) { el("circle", { cx: xIn, cy: plusY, r: 13, class: "s-box" }, s); text(s, xIn, plusY + 5, "+"); }
    else el("line", { x1: xIn - 14, y1: plusY, x2: xIn, y2: plusY - 14, class: "s-edge" }, s);
    arrow(s, xIn, plusY - 14, xIn, 6); text(s, xIn + 10, 18, "h", "b", "start");
    // frozen W0, fed from below, output to the + node
    const wx = 70, wy = 100, wc = wx + side / 2;
    el("rect", { x: wx, y: wy, width: side, height: side, rx: 4, class: `s-box ${merged ? "on" : ""}` }, s);
    text(s, wc, wy + side / 2 - 4, merged ? "W = W₀ + (α/r)BA" : "W₀", "b");
    text(s, wc, wy + side / 2 + 16, merged ? "one matrix, same cost" : "frozen", "m");
    text(s, wc, wy + side - 12, `d × k = ${d.toLocaleString("en-US")} × ${k.toLocaleString("en-US")}`, "m");
    el("path", { d: `M${xIn - 12},${yIn - 4} L${wc},${yIn - 4} L${wc},${wy + side + 14}`, class: "s-edge" }, s);
    arrow(s, wc, wy + side + 14, wc, wy + side + 2);
    el("line", { x1: wc, y1: wy - 2, x2: wc, y2: plusY, class: "s-edge" }, s);
    arrow(s, wc, plusY, xIn - 14, plusY);
    if (!merged) {
      const cx = 525, ay = 300 - thin, by = 84;
      el("path", { d: `M${xIn + 12},${yIn - 4} L${cx},${yIn - 4} L${cx},${302}`, class: "s-edge on" }, s);
      el("rect", { x: cx - side / 2, y: ay, width: side, height: thin, rx: 2, class: "s-box on" }, s);
      text(s, cx + side / 2 + 8, ay + thin / 2 + 4, "A: r × k, random", "o", "start");
      el("rect", { x: cx - thin / 2, y: by, width: thin, height: side, rx: 2, fill: "var(--orange)", "fill-opacity": 0.08 + 0.8 * t, stroke: "var(--orange)", "stroke-width": 2 }, s);
      text(s, cx + thin / 2 + 10, by + side / 2 - 6, "B: d × r", "o", "start");
      text(s, cx + thin / 2 + 10, by + side / 2 + 12, t === 0 ? "starts at 0" : t < 1 ? "training…" : "trained", "m", "start");
      arrow(s, cx, ay - 2, cx, by + side + 2, true);
      el("line", { x1: cx, y1: by - 2, x2: cx, y2: plusY, class: "s-edge on" }, s);
      arrow(s, cx, plusY, xIn + 14, plusY, true);
      text(s, cx + 8, plusY + 22, "× α/r", "o", "start");
    }
    const full = d * k, lora = r * (d + k), tot = layers * 2 * lora;
    read.innerHTML = `One matrix: full update d·k = ${full.toLocaleString("en-US")}; LoRA r(d+k) = <b>${lora.toLocaleString("en-US")}</b>; ratio ${Math.round(full / lora).toLocaleString("en-US")}×\n` +
      `W_q and W_v in ${layers} layers: ${layers} × 2 × ${lora.toLocaleString("en-US")} = <b>${tot.toLocaleString("en-US")}</b> trainable, ${(tot * 2 / 1e6).toFixed(1)} MB in FP16\n` +
      (merged ? "Merged: the side path is gone; serving costs exactly what W₀ did." :
        t === 0 ? "At step 0, BA = 0: the model is exactly the pre-trained one. ∂L/∂A = s·Bᵀg·xᵀ = 0, but ∂L/∂B = s·g·(Ax)ᵀ ≠ 0, so B moves first." : "B has moved away from zero; A keeps receiving gradient through B.");
  }
  draw();
}

// ── What fits on one GPU ─────────────────────────────────────────────────────
export function gpuFit(root) {
  const body = frame(root, "Full fine-tuning, LoRA and QLoRA: what fits on one GPU",
    "Pick a model and a rank. Bars are model-state memory on a log scale; vertical lines mark 24, 48 and 80 GB.",
    "Computed here, weights and optimiser states only (no activations, no quantisation constants): full fine-tuning at 12, 16 and 18 bytes per parameter; LoRA = 2Ψ + 16ψ; QLoRA = 0.5Ψ + 16ψ, with ψ = r(d+k) for W_q and W_v in every layer. Shapes: LLaMA from <a data-ref=\"touvron2023a\">Touvron et al. (2023)</a>, Table 2; GPT-3 from <a data-ref=\"brown2020\">Brown et al. (2020)</a>, Table 2.1. Marked points: <a data-ref=\"hu2022\">Hu et al. (2022)</a>, §4.2 (GPT-3 with LoRA: 350 GB); <a data-ref=\"dettmers2023\">Dettmers et al. (2023)</a> (65B on one 48 GB GPU).");
  const MODELS = [
    { n: "LLaMA 7B", P: 6.7e9, d: 4096, L: 32 },
    { n: "LLaMA 65B", P: 65.2e9, d: 8192, L: 80, mark: ["QLoRA", 48e9, "Dettmers et al.: fits one 48 GB GPU"] },
    { n: "GPT-3 175B", P: 175e9, d: 12288, L: 96, mark: ["LoRA", 350e9, "Hu et al.: 350 GB"] },
  ];
  let mi = 0, r = 8;
  const mb = h("div", { class: "controls" });
  const s = svg(760, 270, null, "memory bars");
  const read = h("div", { class: "readout" });
  body.append(mb, h("div", { class: "controls" }, slider("rank r", 1, 64, 1, r, v => { r = v; draw(); })), s, read);
  MODELS.forEach((m, i) => mb.appendChild(h("button", { onclick: () => { mi = i; draw(); } }, m.n)));
  function draw() {
    [...mb.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === mi)));
    const m = MODELS[mi], psi = m.L * 2 * r * 2 * m.d;
    const bars = [["Full FT, 18 B/param", 18 * m.P], ["Full FT, 16 B/param", 16 * m.P], ["Full FT, 12 B/param", 12 * m.P], ["LoRA  2Ψ + 16ψ", 2 * m.P + 16 * psi], ["QLoRA  0.5Ψ + 16ψ", 0.5 * m.P + 16 * psi]];
    s.innerHTML = ""; uid(s);
    const x0 = 190, x1 = 740, X = logS(1e9, 1e13, x0, x1);
    [1e9, 1e10, 1e11, 1e12, 1e13].forEach(v => { el("line", { x1: X(v), y1: 0, x2: X(v), y2: 232, class: "s-axis" }, s); text(s, X(v), 250, v >= 1e12 ? `${v / 1e12} TB` : `${v / 1e9} GB`, "m"); });
    [24e9, 48e9, 80e9].forEach(v => { el("line", { x1: X(v), y1: 0, x2: X(v), y2: 232, class: "s-edge dash" }, s); text(s, X(v) + 3, 266, `${v / 1e9}`, "m", "start"); });
    bars.forEach(([nm, v], i) => {
      const y = 8 + i * 44;
      text(s, x0 - 8, y + 20, nm, i > 2 ? "b" : "", "end");
      el("rect", { x: x0, y, width: Math.max(2, X(v) - x0), height: 28, rx: 3, class: `s-bar ${i === 4 ? "on" : i === 3 ? "hi" : ""}` }, s);
      text(s, Math.min(X(v) + 6, 680), y + 19, gb(v), v <= 80e9 ? "o" : "", "start");
      if (m.mark && nm.startsWith(m.mark[0])) {
        el("path", { d: `M${X(m.mark[1])},${y - 2} l-6,-8 h12 z`, fill: "var(--deep)" }, s);
      }
    });
    read.innerHTML = `${m.n}: Ψ = ${human(m.P)}, d = ${m.d.toLocaleString("en-US")}, ${m.L} layers.  LoRA r = ${r}: ψ = ${psi.toLocaleString("en-US")} trainable (${(100 * psi / m.P).toFixed(3)}%).\n` +
      (m.mark ? `▼ marks the paper figure: ${m.mark[2]}.` : "No paper figure for this model on this chart.");
  }
  draw();
}

// ── Emergence: smooth inside, sharp outside ──────────────────────────────────
export function emergence(root) {
  const body = frame(root, "A smooth quantity through an all-or-nothing metric",
    "Set the answer length L. Left: per-token accuracy p against exact match p^L. Right: the same, against model size.",
    "The argument of <a data-ref=\"schaeffer2023\">Schaeffer et al. (2023)</a>, §2, drawn for this page. The right panel is schematic: p is made a smooth function of log model size; there is no model and no data.");
  let L = 10;
  const s1 = svg(370, 280, null, "p and p to the L");
  const s2 = svg(370, 280, null, "schematic against model size");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, slider("answer length L (tokens)", 1, 20, 1, L, v => { L = v; draw(); })), h("div", { class: "two", style: "grid-template-columns:1fr 1fr" }, s1, s2), read);
  function panel(s, xlab, xf, pOf, ticks) {
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const x0 = 50, x1 = 355, y0 = 235, y1 = 12;
    const X = linS(0, 1, x0, x1), Y = linS(0, 1, y0, y1);
    [0, 0.5, 1].forEach(v => { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: "s-axis" }, s); text(s, x0 - 6, Y(v) + 4, String(v), "m", "end"); });
    ticks.forEach(([u, lab]) => text(s, X(u), y0 + 16, lab, "m"));
    text(s, (x0 + x1) / 2, y0 + 36, xlab, "m");
    const a = [], b = [];
    for (let k = 0; k <= 100; k++) { const u = k / 100, p = pOf(u); a.push([X(u), Y(p)]); b.push([X(u), Y(p ** L)]); }
    el("path", { d: path(a), class: "s-line", stroke: "var(--blue-2)" }, s);
    el("path", { d: path(b), class: "s-line", stroke: "var(--orange)" }, s);
    text(s, x0 + 8, Y(0.9), "per token: p", "b", "start");
    text(s, x0 + 8, Y(0.2), `exact match: p^${L}`, "o", "start");
  }
  function draw() {
    panel(s1, "per-token accuracy p", null, u => 0.5 + 0.5 * u, [[0, "0.5"], [0.5, "0.75"], [1, "1"]]);
    panel(s2, "model size (log) — schematic", null, u => 0.55 + 0.44 * u, [[0, "small"], [1, "large"]]);
    read.textContent = [0.8, 0.9, 0.95, 0.99].map(p => `p = ${p.toFixed(2)}  →  p^${L} = ${(p ** L).toFixed(3)}`).join("\n") +
      "\nPer-token accuracy rises steadily; exact match stays near zero and then climbs. On a log axis of model size that looks like a jump.";
  }
  draw();
}

// ── Close: architecture picks the curve, scale moves along it ────────────────
export function answerPicture(root) {
  const body = frame(root, "Architecture or scale? One picture for the answer",
    "Schematic, no values. Move along the curve with the slider; click a label to jump to the section that measured it.",
    "Summary of this session. Curves after <a data-ref=\"kaplan2020\">Kaplan et al. (2020)</a>, Fig. 7; refinement sizes after <a data-ref=\"narang2021\">Narang et al. (2021)</a>; LoRA's fraction from <a data-ref=\"hu2022\">Hu et al. (2022)</a>.");
  let u = 0.4;
  const s = svg(760, 340, null, "schematic summary");
  body.append(h("div", { class: "controls" }, slider("scale", 0, 1, 0.01, u, v => { u = v; draw(); }, v => v.toFixed(2))), s);
  function draw() {
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const x0 = 50, x1 = 740, y0 = 320, y1 = 16;
    arrow(s, x0, y0, x1, y0); arrow(s, x0, y0, x0, y1);
    text(s, (x0 + x1) / 2, y0 + 16, "compute (log)", "m"); text(s, x0 + 6, y1 + 10, "loss (log)", "m", "start");
    const X = v => 80 + v * 480;
    const tr = v => [X(v), 80 + v * 180], ls = v => [X(v), 60 + v * 100], rf = v => [X(v), 94 + v * 180];
    el("path", { d: path([ls(0), ls(1)]), class: "s-line", stroke: "var(--muted)" }, s);
    el("path", { d: path([tr(0), tr(1)]), class: "s-line", stroke: "var(--blue-2)" }, s);
    el("path", { d: path([rf(0), rf(1)]), class: "s-edge dash on" }, s);
    const [dx, dy] = tr(u);
    el("circle", { cx: dx, cy: dy, r: 8, fill: "var(--orange)" }, s);
    el("path", { d: `M${dx},${dy} Q${dx + 10},${48} ${540},${46}`, class: "s-edge on" }, s);
    const labels = [
      [572, 158, "LSTM", "#kaplan", "b", "start"],
      [572, 176, "architecture: which curve", "#kaplan", "m", "start"],
      [572, 256, "Transformer", "#kaplan", "b", "start"],
      [572, 280, "refinement or better data:", "#beyond", "o", "start"],
      [572, 297, "a small shift", "#beyond", "m", "start"],
      [548, 50, "LoRA: 10⁻⁴ of the parameters", "#board6", "o", "start"],
      [dx - 8, dy + 38, "scale: along the curve", "#board5", "b", "end"],
    ];
    labels.forEach(([x, y, t, href, cls, anchor]) => {
      const g = el("g", { style: "cursor:pointer" }, s);
      const tt = text(g, x, y, t, cls, anchor);
      tt.setAttribute("text-decoration", "underline");
      g.addEventListener("click", () => { location.hash = href; });
    });
  }
  draw();
}
