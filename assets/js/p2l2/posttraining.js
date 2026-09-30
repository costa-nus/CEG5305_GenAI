// Visualizations for Part 2 · Lecture 2 · Session 01 (Post-training).
// Registered in assets/js/main.js → load(). Numbers quoted from papers are cited in each footer;
// arithmetic done in the browser says "computed here"; toy values and schematic panels say so.
import { el, h, svg, arrowDefs, uid, arrow, box, text, rng, slider, frame } from "../lib.js";
import { linkCites } from "../bib.js";

// ── shared helpers ───────────────────────────────────────────────────────────
const KEY = "ceg5305-p2l2s1-";
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const linS = (lo, hi, a, b) => v => a + ((v - lo) / (hi - lo)) * (b - a);
const path = pts => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
const sig = z => 1 / (1 + Math.exp(-z));
const MINUS = "−";
const num = (x, d = 2) => `${x < 0 && Math.abs(x) >= 0.5 * 10 ** -d ? MINUS : ""}${Math.abs(x).toFixed(d)}`;
const sgn = (x, d = 2) => `${x < 0 && Math.abs(x) >= 0.5 * 10 ** -d ? MINUS : "+"}${Math.abs(x).toFixed(d)}`;
const tokW = t => t.length * 7.4 + 12;
const tlen = (t, fb) => { try { return t.getComputedTextLength() || fb; } catch { return fb; } };
// a label that stays legible when a moving cursor or a line crosses it
function halo(t) { t.setAttribute("paint-order", "stroke"); t.setAttribute("stroke", "var(--card)"); t.setAttribute("stroke-width", "4"); t.setAttribute("stroke-linejoin", "round"); return t; }
function setSlider(lab, v) { lab.input.value = v; lab.input.dispatchEvent(new Event("input")); }
function press(buttons, on) { buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(!!on(i, b)))); }
// a model: trained ones carry the orange border, frozen ones the grey, an absent one is dashed
function mbox(s, x, y, w, hh, label, kind = "frozen") {
  const g = el("g", {}, s);
  el("rect", { x, y, width: w, height: hh, rx: 6, class: `s-box ${kind === "trained" ? "on" : ""}`, "stroke-dasharray": kind === "none" ? "5 4" : null }, g);
  text(g, x + w / 2, y + hh / 2 + 4.5, label, kind === "none" ? "m" : "b");
  return g;
}
// data (a prompt, a response, a number): a rounded pill
function dbox(s, x, y, w, hh, label, cls = "") {
  const g = el("g", {}, s);
  el("rect", { x, y, width: w, height: hh, rx: hh / 2, fill: "var(--card)", stroke: "var(--muted)", "stroke-width": 1.2 }, g);
  text(g, x + w / 2, y + hh / 2 + 4.5, label, cls);
  return g;
}
// legend entries measured so they never overlap: [kind, label]
function legend(s, x, y, items) {
  items.forEach(([kind, label]) => {
    if (kind === "trained" || kind === "frozen") el("rect", { x, y: y - 11, width: 22, height: 14, rx: 3, class: `s-box ${kind === "trained" ? "on" : ""}` }, s);
    else if (kind === "data") el("rect", { x, y: y - 11, width: 22, height: 14, rx: 7, fill: "var(--card)", stroke: "var(--muted)" }, s);
    else el("line", { x1: x, y1: y - 4, x2: x + 22, y2: y - 4, class: `s-edge ${kind === "train" ? "on" : ""}` }, s);
    const t = text(s, x + 28, y, label, "m", "start");
    x += 28 + tlen(t, label.length * 6.2) + 18;
  });
  return x;
}
const LEG_MODELS = [["trained", "trained model"], ["frozen", "frozen model"], ["data", "data"], ["train", "training update"], ["pass", "data flow"]];

// ── A.1 Base model vs post-trained model ─────────────────────────────────────
export function baseVsChat(root) {
  const body = frame(root, "Base model vs post-trained model: what each one is continuing",
    "Predict what the base model does with the prompt, then run the two demos below. The bar at the bottom is the controlled comparison.",
    "Schematic: no model output is shown here; the demos below produce real ones. Example prompt from <a data-ref=\"ouyang2022\">Ouyang et al. (2022)</a>, Fig. 2. &lt;user&gt;, &lt;end&gt; and &lt;assistant&gt; are generic placeholders, not a real model's template. 85 ± 3% from Ouyang et al. (2022), §1.");
  const OPTS = [["answer", "It answers the request"], ["continue", "It writes more text like the prompt"], ["unsure", "Not sure"]];
  let pick = store.get("base-pred", null);
  const btns = OPTS.map(([k, l]) => h("button", { onclick: () => { pick = k; store.set("base-pred", k); draw(); } }, l));
  const s = svg(760, 322, null, "a prompt read as the start of a web document by a base model, and as a user turn by a chat model");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("span", { class: "note" }, "Your prediction for the base model:"), ...btns), s, read);
  const PROMPT = "Explain the moon landing to a 6 year old";
  function hl(x, y, str) {
    const r = el("rect", { x: x - 6, y: y - 17, width: 10, height: 24, rx: 4, class: "s-box on" }, s);
    const t = text(s, x, y, str, "", "start");
    r.setAttribute("width", tlen(t, str.length * 6.8) + 12);
  }
  function chip(x, y, str) {
    const w = tokW(str);
    el("rect", { x, y, width: w, height: 22, rx: 5, class: "s-box" }, s);
    text(s, x + w / 2, y + 15.5, str, "mono");
    return x + w + 6;
  }
  function draw() {
    press(btns, i => OPTS[i][0] === pick);
    s.innerHTML = "";
    [[0, "Base model", "pre-trained to continue web text", "a web page"], [390, "Post-trained model", "fine-tuned on responses to requests", "a chat"]].forEach(([x, t1, t2, t3]) => {
      el("rect", { x: x + 0.5, y: 0.5, width: 369, height: 228, rx: 8, fill: "none", stroke: "var(--line)" }, s);
      text(s, x + 16, 26, t1, "b", "start");
      text(s, x + 16, 44, t2, "m", "start");
      el("rect", { x: x + 16, y: 58, width: 338, height: 156, rx: 4, fill: "var(--card)", stroke: "var(--line)" }, s);
      text(s, x + 346, 74, t3, "m", "end");
    });
    hl(30, 102, PROMPT);
    [296, 312, 250].forEach((w, i) => el("rect", { x: 24, y: 120 + i * 22, width: w, height: 14, rx: 3, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "4 3" }, s));
    text(s, 26, 204, "next tokens: whatever tends to follow such a line", "m", "start");
    chip(420, 64, "<user>");
    hl(426, 112, PROMPT);
    chip(chip(420, 124, "<end>"), 124, "<assistant>");
    [300, 250].forEach((w, i) => el("rect", { x: 420, y: 156 + i * 20, width: w, height: 14, rx: 3, fill: "none", stroke: "var(--blue-2)", "stroke-width": 1.6, "stroke-dasharray": "4 3" }, s));
    text(s, 422, 208, "next tokens: the start of an answer", "m", "start");
    // the controlled comparison
    text(s, 0, 258, "Controlled comparison: same architecture; InstructGPT 175B is GPT-3 175B fine-tuned on human data", "b", "start");
    text(s, 0, 277, "share of comparisons in which labelers preferred InstructGPT's output", "m", "start");
    const X = linS(0, 100, 0, 640);
    el("rect", { x: 0, y: 286, width: 640, height: 24, rx: 3, class: "s-box" }, s);
    el("rect", { x: 0, y: 286, width: X(85), height: 24, rx: 3, fill: "#b85f00" }, s);
    el("line", { x1: X(50), y1: 282, x2: X(50), y2: 314, stroke: "#fff", "stroke-width": 1.5, "stroke-dasharray": "4 3" }, s);
    text(s, X(50) + 8, 303, "50%: no preference", "w", "start");
    el("line", { x1: X(82), y1: 298, x2: X(88), y2: 298, stroke: "var(--text)", "stroke-width": 2 }, s);
    [82, 88].forEach(v => el("line", { x1: X(v), y1: 291, x2: X(v), y2: 305, stroke: "var(--text)", "stroke-width": 2 }, s));
    text(s, 652, 303, "85 ± 3%", "b", "start");
    const p = OPTS.find(o => o[0] === pick);
    read.textContent = p
      ? `Your prediction: ${p[1].toLowerCase()}.\nNow run both demos below with the same prompt: Transformer Explainer is a base model (GPT-2 small), WebLLM Chat a post-trained one.`
      : "No prediction yet. Pick one, then run the two demos below.";
  }
  draw();
}

// ── A.2 InstructGPT's three steps ────────────────────────────────────────────
export function instructPipeline(root) {
  const body = frame(root, "InstructGPT: three steps, three kinds of data",
    "Click a step. The label on each column's first arrow is the data that step consumes. Orange arrows train a model; grey arrows only pass data.",
    "Structure after <a data-ref=\"ouyang2022\">Ouyang et al. (2022)</a>, Fig. 2 — redrawn. Prompt counts from §3.3; K and the reward model's size and initialisation from §3.5; compute from §5.1. Percentages computed here.");
  const STEPS = [
    { t: "Step 1 · SFT", d: "demonstrations", d2: ["prompt + a response", "written by a labeler"], n: "≈ 13k prompts",
      r: "Step 1 · SFT. Labelers write the desired response to a prompt. About 13k training prompts, from the API and written by labelers (§3.3).\nGPT-3 is fine-tuned on these demonstrations with the language-modelling loss on the response tokens: Board 1." },
    { t: "Step 2 · reward model", d: "rankings", d2: ["K = 4 to 9 sampled responses", "ordered by a labeler"], n: "≈ 33k prompts",
      r: "Step 2 · reward model. The SFT model samples K = 4 to 9 responses per prompt and a labeler ranks them: K(K−1)/2 comparisons per prompt. About 33k training prompts (§3.3, §3.5).\nA 6B reward model, initialised from the SFT model with the unembedding layer removed, learns to score them: Board 2." },
    { t: "Step 3 · RL", d: "prompts only", d2: ["no human label;", "the reward model scores"], n: "≈ 31k prompts, API only",
      r: "Step 3 · RL. Prompts only, about 31k, all from the API (§3.3). No human labels: the policy writes a response and the frozen reward model scores it.\nPPO updates the policy, initialised from the SFT model, with a per-token KL penalty to the SFT model: Board 3 and PPO below." },
  ];
  let sel = 0;
  const tabs = STEPS.map((st, i) => h("button", { onclick: () => { sel = i; draw(); } }, st.t));
  const s = svg(760, 300, null, "InstructGPT pipeline: SFT, reward model, RL");
  const s2 = svg(760, 118, null, "training compute on a log scale");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, ...tabs), s, read, h("div", { style: "margin-top:.8rem" }, s2));
  function draw() {
    press(tabs, i => i === sel);
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const W = 236;
    STEPS.forEach((st, i) => {
      const x = i * 262, on = i === sel, g = el("g", { style: "cursor:pointer" }, s);
      el("rect", { x: x + 1, y: 34, width: W - 2, height: 236, rx: 8, fill: "var(--card)", stroke: on ? "var(--orange)" : "var(--line)", "stroke-width": on ? 2.5 : 1 }, g);
      text(g, x + W / 2, 22, st.t, on ? "o" : "b");
      el("rect", { x: x + 12, y: 46, width: W - 24, height: 70, rx: 6, class: "s-box" }, g);
      text(g, x + W / 2, 68, st.d, "b");
      st.d2.forEach((l, j) => text(g, x + W / 2, 88 + j * 16, l, "m"));
      g.addEventListener("click", () => { sel = i; draw(); });
    });
    // step 1
    arrow(s, 118, 118, 118, 148, true); text(s, 128, 138, STEPS[0].n, "m", "start");
    mbox(s, 38, 150, 160, 34, "SFT model", "trained");
    text(s, 118, 206, "starts from GPT-3", "m");
    // step 2
    arrow(s, 380, 118, 380, 148, true); text(s, 390, 138, STEPS[1].n, "m", "start");
    mbox(s, 300, 150, 160, 34, "reward model (6B)", "trained");
    text(s, 380, 206, "starts from the SFT model,", "m");
    text(s, 380, 222, "unembedding layer removed", "m");
    // step 3: the loop
    const x3 = 524;
    arrow(s, x3 + 52, 118, x3 + 52, 148); text(s, x3 + 62, 138, STEPS[2].n, "m", "start");
    mbox(s, x3 + 10, 150, 84, 34, "policy", "trained");
    mbox(s, x3 + 130, 150, 96, 34, "reward model", "frozen");
    arrow(s, x3 + 94, 167, x3 + 128, 167); text(s, x3 + 111, 160, "y", "m");
    box(s, x3 + 10, 212, 120, 30, "PPO update", "", "");
    el("path", { d: `M${x3 + 178},184 L${x3 + 178},227 L${x3 + 150},227`, class: "s-edge on" }, s);
    arrow(s, x3 + 152, 227, x3 + 132, 227, true);
    text(s, x3 + 186, 212, "r", "o", "start");
    arrow(s, x3 + 52, 212, x3 + 52, 186, true);
    text(s, x3 + 10, 260, "KL penalty to the SFT model", "m", "start");
    text(s, 380, 292, "The SFT model from step 1 initialises both the reward model (step 2) and the policy (step 3).", "m");
    read.textContent = STEPS[sel].r;
    // compute
    s2.innerHTML = "";
    text(s2, 0, 16, "Training compute, petaflop/s-days (log scale)", "b", "start");
    const X = v => 210 + (Math.log10(v) / 4) * 480;
    [1, 10, 100, 1000, 10000].forEach(v => { el("line", { x1: X(v), y1: 26, x2: X(v), y2: 100, class: "s-axis" }, s2); text(s2, X(v), 114, v.toLocaleString("en-US"), "m"); });
    [["GPT-3 pre-training", 3640, ""], ["175B PPO-ptx (RLHF)", 60, "on"], ["175B SFT", 4.9, "on"]].forEach(([nm, v, cls], i) => {
      const y = 30 + i * 24;
      text(s2, 200, y + 14, nm, "", "end");
      el("rect", { x: 210, y, width: X(v) - 210, height: 18, rx: 3, class: `s-bar ${cls}` }, s2);
      text(s2, X(v) + 6, y + 14, v.toLocaleString("en-US"), "b", "start");
    });
    read.textContent += `\n\nCompute (§5.1): 175B SFT 4.9 and 175B PPO-ptx 60 petaflop/s-days, against 3,640 for GPT-3's pre-training — ${(100 * 4.9 / 3640).toFixed(2)}% and ${(100 * 60 / 3640).toFixed(2)}% of it (computed here).`;
  }
  draw();
}

// ── A.3 Board 1: loss masking ────────────────────────────────────────────────
export function sftMask(root) {
  const body = frame(root, "Board 1 — loss masking on one example",
    "Grey tokens carry no loss (m = 0). Toggle what is trained and watch the sum and the loss.",
    "Toy example written for this page. &lt;user&gt;, &lt;assistant&gt; and &lt;end&gt; stand for a model's role-header and end-of-turn tokens. Per-token losses −log p are random numbers, not a model's; the sum and the loss are computed here. Dividing by the number of kept tokens is one convention; implementations differ.");
  const ROWS = [
    { toks: ["<user>", "Explain", "the", "moon", "landing", "to", "a", "6", "year", "old", "<end>"], resp: false },
    { toks: ["<assistant>", "A", "rocket", "carried", "people", "to", "the", "Moon", "and", "back", ".", "<end>"], resp: true },
  ];
  const r = rng(305); // one generator for every loss on the strip
  const LOSS = ROWS.map(R => R.toks.map(() => 0.15 + 3.2 * r()));
  let onPrompt = false, maskEnd = false;
  const bP = h("button", { "aria-pressed": "false" }, "Train on prompt tokens too");
  const bE = h("button", { "aria-pressed": "false" }, "Mask the final <end> too");
  const s = svg(760, 172, null, "token strip with per-token losses, prompt tokens masked");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bP, bE), s, read);
  bP.addEventListener("click", () => { onPrompt = !onPrompt; draw(); });
  bE.addEventListener("click", () => { maskEnd = !maskEnd; draw(); });
  const kept = (ri, j) => {
    const R = ROWS[ri];
    if (onPrompt) return !(R.resp && j === R.toks.length - 1 && maskEnd);
    if (!R.resp || j === 0) return false;
    return !(j === R.toks.length - 1 && maskEnd);
  };
  function draw() {
    bP.setAttribute("aria-pressed", String(onPrompt)); bE.setAttribute("aria-pressed", String(maskEnd));
    s.innerHTML = "";
    let sum = 0, n = 0, total = 0;
    ROWS.forEach((R, ri) => {
      const y = 28 + ri * 86;
      text(s, 0, y - 10, R.resp ? "response y — trained (m = 1); its role header is given, not generated" : "prompt x — no loss (m = 0) unless you train on it", "m", "start");
      let x = 0;
      R.toks.forEach((t, j) => {
        const w = Math.max(30, tokW(t)), k = kept(ri, j), last = R.resp && j === R.toks.length - 1;
        const g = el("g", { opacity: k ? 1 : 0.55 }, s);
        el("rect", { x, y, width: w, height: 28, rx: 5, class: `s-box ${k ? "on" : ""}` }, g);
        text(g, x + w / 2, y + 19, t, t.startsWith("<") ? "mono" : "");
        text(g, x + w / 2, y + 46, k ? LOSS[ri][j].toFixed(2) : "0", k ? "" : "m");
        if (last) text(s, x + w + 8, y + 19, "← stop token", maskEnd ? "m" : "o", "start");
        if (k) { sum += LOSS[ri][j]; n++; }
        total++;
        x += w + 5;
      });
      if (!ri) text(s, 760, y + 46, "← −log p under each token", "m", "end");
    });
    let msg = `kept tokens: ${n} of ${total}\nsum of −log p over kept tokens = ${sum.toFixed(2)}\nloss = ${sum.toFixed(2)} / ${n} = ${(sum / n).toFixed(3)}`;
    if (onPrompt) msg += "\nPrompt tokens are trained too: the model also learns to write the user's turn.";
    if (maskEnd) msg += "\nThe final <end> carries no loss: nothing trains the model to stop.";
    read.textContent = msg;
  }
  draw();
}

// ── A.5 FLAN: held-out task clusters ─────────────────────────────────────────
const FLAN = [["Natural language inference", 7], ["Commonsense", 4], ["Sentiment", 4], ["Paraphrase", 4], ["Closed-book QA", 3], ["Struct to text", 4],
  ["Translation", 8], ["Reading comp.", 5], ["Read. comp. w/ commonsense", 2], ["Coreference", 3], ["Misc.", 7], ["Summarization", 11]];
const FLAN_ALSO = { 0: [3], 3: [0], 8: [7, 1], 7: [8], 1: [8] };
export function flanClusters(root) {
  const body = frame(root, "FLAN: tune on some task clusters, test on a cluster never seen",
    "Click a cluster to hold it out. Below: what more clusters and more parameters did to held-out performance.",
    "Clusters and dataset counts from <a data-ref=\"wei2022a\">Wei et al. (2022)</a>, Fig. 3; the similar-cluster rule from §2.2, footnote 1. Left chart: the average over the three held-out clusters (NLI, closed-book QA, commonsense) as printed on Fig. 6, with clusters added in the paper's order. Right chart: shape only, after Fig. 7; the paper gives those values only as a plot.");
  let held = 0;
  const s = svg(760, 176, null, "twelve FLAN task clusters");
  const read = h("div", { class: "readout" });
  const c = svg(760, 262, null, "held-out performance against clusters and against model size");
  body.append(s, read, h("div", { style: "margin-top:.8rem" }, c));
  function draw() {
    s.innerHTML = "";
    const also = new Set(FLAN_ALSO[held] || []);
    let tuned = 0, sets = 0;
    FLAN.forEach(([nm, k], i) => {
      const x = (i % 4) * 192, y = 4 + Math.floor(i / 4) * 58, W = 184;
      const isHeld = i === held, isOut = also.has(i);
      if (!isHeld && !isOut) { tuned++; sets += k; }
      const g = el("g", { style: "cursor:pointer", opacity: isOut ? 0.6 : 1 }, s);
      el("rect", { x, y, width: W, height: 50, rx: 7, class: `s-box ${isHeld ? "on" : ""}`, "stroke-dasharray": isOut ? "5 4" : null }, g);
      const t = text(g, x + W / 2, y + 21, nm, isHeld ? "b" : "");
      if (tlen(t, nm.length * 7) > W - 12) t.style.fontSize = "11.5px";
      text(g, x + W / 2, y + 39, isHeld ? `${k} datasets · held out: test` : isOut ? "left out: too similar" : `${k} datasets · tune`, isHeld ? "o" : "m");
      g.addEventListener("click", () => { held = i; draw(); });
    });
    const outNames = [...also].map(i => FLAN[i][0]);
    read.textContent = `Held out: ${FLAN[held][0]} (${FLAN[held][1]} datasets). A separate model is instruction-tuned on the other ${tuned} clusters, ${sets} datasets` +
      (outNames.length ? `; ${outNames.join(" and ")} ${outNames.length > 1 ? "are" : "is"} also left out as too similar.` : ".") +
      "\nIt is then tested zero-shot on a task type it never saw during tuning. Each held-out cluster needs its own tuned model.";
  }
  // charts, drawn once
  const x0 = 70, x1 = 330, yb = 206, yt = 50;
  text(c, 0, 16, "Clusters used for tuning → held-out average (%)", "b", "start");
  text(c, 0, 33, "values printed on Fig. 6", "m", "start");
  const X = linS(1, 7, x0, x1), Y = linS(45, 70, yb, yt);
  [50, 60, 70].forEach(v => { el("line", { x1: x0 - 10, y1: Y(v), x2: x1 + 10, y2: Y(v), class: "s-axis" }, c); text(c, x0 - 16, Y(v) + 4, String(v), "m", "end"); });
  const AVG = [49.9, 55.0, 59.3, 59.2, 60.8, 61.9, 63.5];
  el("path", { d: path(AVG.map((v, i) => [X(i + 1), Y(v)])), class: "s-line", stroke: "var(--orange)" }, c);
  AVG.forEach((v, i) => { el("circle", { cx: X(i + 1), cy: Y(v), r: 4, fill: "var(--orange)" }, c); text(c, X(i + 1), Y(v) - 10, v.toFixed(1), "m"); text(c, X(i + 1), yb + 18, String(i + 1), "m"); });
  text(c, (x0 + x1) / 2, yb + 38, "number of tuning clusters", "m");
  text(c, 440, 16, "Model size → held-out accuracy", "b", "start");
  text(c, 440, 33, "shape only, after Fig. 7 — no values", "m", "start");
  const SZ = [[0.422, "0.4B"], [2, "2B"], [8, "8B"], [68, "68B"], [137, "137B"]];
  const tS = v => Math.log(v / 0.422) / Math.log(137 / 0.422);
  const XS = v => 460 + tS(v) * 270, YS = linS(0, 1, yb, yt);
  const unt = t => 0.35 + 0.25 * t, tun = t => 0.28 + 0.45 * t ** 1.6;
  el("line", { x1: 450, y1: yb, x2: 750, y2: yb, class: "s-axis" }, c);
  [[unt, "var(--muted)"], [tun, "var(--orange)"]].forEach(([fn, col]) => {
    const pts = []; for (let k = 0; k <= 60; k++) pts.push([460 + (k / 60) * 270, YS(fn(k / 60))]);
    el("path", { d: path(pts), class: "s-line", stroke: col }, c);
    SZ.forEach(([v]) => el("circle", { cx: XS(v), cy: YS(fn(tS(v))), r: 4, fill: col }, c));
  });
  SZ.forEach(([v, l], i) => text(c, XS(v) + (i === 3 ? 6 : i === 4 ? -4 : 0), yb + 18, l, "m", i === 3 ? "end" : i === 4 ? "start" : "middle"));
  text(c, 600, yb + 38, "parameters (log)", "m");
  text(c, 734, YS(tun(1)) - 12, "instruction-tuned", "o", "end");
  text(c, 734, YS(unt(1)) + 24, "untuned", "b", "end");
  text(c, 641, 172, "lines cross between 8B and 68B", "m");
  draw();
}

// ── B.2 Board 2: the reward model ────────────────────────────────────────────
export function rewardModelBT(root) {
  const body = frame(root, "Board 2 — a reward model scores both responses; only the difference reaches the loss",
    "Move r_w and r_l. Then add the same constant c to both: nothing below the diagram changes.",
    "Architecture after <a data-ref=\"ouyang2022\">Ouyang et al. (2022)</a>, §3.5; loss from <a data-ref=\"bradley1952\">Bradley &amp; Terry (1952)</a> as written in <a data-ref=\"rafailov2023\">Rafailov et al. (2023)</a>, eq. 2 — redrawn. Scores are set by you; σ, the loss and the weight are computed here.");
  let rw = 2.1, rl = 1.4, c = 0;
  const sW = slider("r_w", -3, 3, 0.1, rw, v => { rw = v; draw(); }, v => v.toFixed(1));
  const sL = slider("r_l", -3, 3, 0.1, rl, v => { rl = v; draw(); }, v => v.toFixed(1));
  const sC = slider("add c to both", -100, 100, 10, c, v => { c = v; draw(); }, v => String(v));
  const bCheck = h("button", { onclick: () => { setSlider(sW, 2.1); setSlider(sL, 1.4); } }, "Check-in: 2.1 and 1.4");
  const bLog3 = h("button", { onclick: () => { setSlider(sW, 1.1); setSlider(sL, 0); } }, "Δ ≈ log 3");
  const s = svg(760, 292, null, "two weight-shared Transformers scoring chosen and rejected responses");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sW, sL, sC), h("div", { class: "controls" }, bCheck, bLog3), s, read);
  function draw() {
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const d = rw - rl;
    [[90, "x + y_w (chosen)", `r_w = ${num(rw + c, 1)}`], [300, "x + y_l (rejected)", `r_l = ${num(rl + c, 1)}`]].forEach(([cx, inp, rv]) => {
      box(s, cx - 75, 246, 150, 28, inp, "", "");
      arrow(s, cx, 246, cx, 218);
      el("rect", { x: cx - 60, y: 128, width: 120, height: 88, rx: 7, class: "s-box" }, s);
      text(s, cx, 147, "Transformer", "b");
      [158, 176, 194].forEach(y => el("rect", { x: cx - 48, y, width: 96, height: 12, rx: 3, fill: "var(--card)", stroke: "var(--line)" }, s));
      arrow(s, cx, 128, cx, 112);
      box(s, cx - 55, 86, 110, 24, "scalar head", "", "m");
      arrow(s, cx, 86, cx, 68);
      box(s, cx - 55, 40, 110, 26, rv, "on", "b");
    });
    el("line", { x1: 150, y1: 172, x2: 240, y2: 172, class: "s-edge dash" }, s);
    text(s, 195, 165, "same weights φ", "m");
    el("circle", { cx: 195, cy: 53, r: 13, class: "s-box" }, s);
    text(s, 195, 58, MINUS, "b");
    arrow(s, 145, 53, 180, 53); arrow(s, 245, 53, 210, 53);
    el("path", { d: "M195,40 L195,16 L424,16", class: "s-edge on" }, s);
    arrow(s, 420, 16, 438, 16, true);
    text(s, 320, 32, `Δ = r_w − r_l = ${num(d, 2)}`, "o");
    box(s, 440, 2, 170, 28, "σ(Δ) = P(y_w ≻ y_l)", "", "");
    arrow(s, 525, 30, 525, 50);
    box(s, 440, 52, 170, 28, "loss = −log σ(Δ)", "", "");
    // σ(Δ) and σ(−Δ)
    const X = linS(-5, 5, 480, 750), Y = linS(0, 1, 264, 134);
    el("line", { x1: 480, y1: 98, x2: 502, y2: 98, stroke: "var(--blue-2)", "stroke-width": 2.4 }, s);
    text(s, 508, 102, "σ(Δ) = P(chosen wins)", "m", "start");
    el("line", { x1: 480, y1: 116, x2: 502, y2: 116, stroke: "var(--orange)", "stroke-width": 2.4 }, s);
    text(s, 508, 120, "σ(−Δ) = gradient weight", "m", "start");
    [0, 0.5, 1].forEach(v => { el("line", { x1: 480, y1: Y(v), x2: 750, y2: Y(v), class: "s-axis" }, s); text(s, 472, Y(v) + 4, String(v), "m", "end"); });
    [-4, 0, 4].forEach(v => text(s, X(v), 280, String(v).replace("-", MINUS), "m"));
    text(s, 561, 280, "Δ", "m");
    [[z => sig(z), "var(--blue-2)"], [z => sig(-z), "var(--orange)"]].forEach(([fn, col]) => {
      const pts = []; for (let k = 0; k <= 100; k++) { const z = -5 + k / 10; pts.push([X(z), Y(fn(z))]); }
      el("path", { d: path(pts), class: "s-line", stroke: col }, s);
    });
    const dz = Math.max(-5, Math.min(5, d));
    el("line", { x1: X(dz), y1: 128, x2: X(dz), y2: 266, class: "s-edge dash on" }, s);
    el("circle", { cx: X(dz), cy: Y(sig(d)), r: 5, fill: "var(--blue-2)" }, s);
    el("circle", { cx: X(dz), cy: Y(sig(-d)), r: 5, fill: "var(--orange)" }, s);
    read.innerHTML = `r_w = ${num(rw + c, 1)}, r_l = ${num(rl + c, 1)}${c ? `   (both include c = ${num(c, 0)})` : ""}\n` +
      `Δ = r_w − r_l = <b>${num(d, 2)}</b>\nP(y_w ≻ y_l) = σ(Δ) = <b>${sig(d).toFixed(3)}</b>     loss = −log σ(Δ) = ${(-Math.log(sig(d))).toFixed(3)}     gradient weight σ(−Δ) = ${sig(-d).toFixed(3)}   (computed here)` +
      (c ? "\nAdding c to both scores left Δ, the probability, the loss and the weight unchanged: only differences are learned." : "");
  }
  draw();
}

// ── B.3 One generation is one episode ────────────────────────────────────────
export function rlEpisode(root) {
  const body = frame(root, "RL on text: one generation is one episode",
    "Step through the response. In the RL view the reward arrives once, at the end. Switch to the SFT view to compare.",
    "Schematic, written for this page. The response is a toy example; no model or reward model is run. The bandit framing follows <a data-ref=\"ouyang2022\">Ouyang et al. (2022)</a>, §3.5.");
  const TOK = ["A", "rocket", "took", "people", "to", "the", "Moon", "<end>"];
  let t = 0, sft = false, timer = null;
  const bStep = h("button", { class: "primary" }, "Next token");
  const bPlay = h("button", {}, "Play");
  const bReset = h("button", {}, "Reset");
  const bRL = h("button", {}, "RL view");
  const bSFT = h("button", {}, "SFT view");
  const s = svg(760, 200, null, "a response generated token by token with one reward at the end");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bStep, bPlay, bReset, h("span", { class: "note" }, "·"), bRL, bSFT), s, read);
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  bStep.addEventListener("click", () => { stop(); t = Math.min(TOK.length, t + 1); draw(); });
  bPlay.addEventListener("click", () => { stop(); if (t >= TOK.length) t = 0; timer = setInterval(() => { t++; draw(); if (t >= TOK.length) stop(); }, 650); draw(); });
  bReset.addEventListener("click", () => { stop(); t = 0; draw(); });
  bRL.addEventListener("click", () => { sft = false; draw(); });
  bSFT.addEventListener("click", () => { sft = true; draw(); });
  function draw() {
    press([bRL, bSFT], i => (i === 1) === sft);
    s.innerHTML = ""; uid(s); arrowDefs(s);
    mbox(s, 162, 6, 367, 34, "policy π_θ = the language model", "trained");
    dbox(s, 0, 94, 150, 36, "prompt x");
    let x = 162, right = 150;
    TOK.forEach((tok, j) => {
      const w = tokW(tok), shown = j < t, cur = j === t - 1;
      el("rect", { x, y: 97, width: w, height: 30, rx: 5, class: `s-box ${cur ? "on" : ""}`, opacity: shown ? 1 : 0.25, "stroke-dasharray": shown ? null : "4 3" }, s);
      if (shown) text(s, x + w / 2, 117, tok, tok.startsWith("<") ? "mono" : "");
      if (cur && !sft) { arrow(s, x + w / 2, 42, x + w / 2, 95, true); text(s, x + w / 2 + 8, 72, "action = next token", "o", "start"); }
      if (sft && shown) { el("rect", { x, y: 168, width: w, height: 22, rx: 4, fill: "none", stroke: "var(--blue-2)", "stroke-width": 1.5 }, s); text(s, x + w / 2, 183, tok, "mono"); }
      if (shown) right = x + w;
      x += w + 6;
    });
    if (t > 0 && !sft) {
      el("path", { d: `M0,140 L0,146 L${right},146 L${right},140`, class: "s-edge" }, s);
      text(s, 4, 162, "state = prompt + tokens so far", "m", "start");
    }
    if (sft) text(s, 156, 184, "targets:", "m", "end");
    const done = t >= TOK.length;
    if (sft) {
      el("rect", { x: 590, y: 88, width: 170, height: 48, rx: 7, fill: "none", stroke: "var(--line)", "stroke-dasharray": "5 4" }, s);
      text(s, 675, 108, "no reward:", "m"); text(s, 675, 125, "a target at every token", "m");
    } else if (done) {
      arrow(s, right + 4, 112, 588, 112, true);
      el("rect", { x: 590, y: 88, width: 170, height: 48, rx: 7, class: "s-box on" }, s);
      text(s, 675, 108, "r(x, y)", "b"); text(s, 675, 125, "reward model score", "m");
    } else {
      el("rect", { x: 590, y: 88, width: 170, height: 48, rx: 7, fill: "none", stroke: "var(--line)", "stroke-dasharray": "5 4" }, s);
      text(s, 675, 117, "no reward yet", "m");
    }
    if (sft) read.textContent = "SFT view: every position has a target token from the demonstration and its own loss −log p(yⱼ | x, y<ⱼ).\nNothing is sampled and there is no reward.";
    else if (!t) read.textContent = "The prompt is the start state. Press Next token.";
    else if (!done) read.textContent = `step ${t}: state = prompt${t > 1 ? ` + “${TOK.slice(0, t - 1).join(" ")}”` : ""}; action = “${TOK[t - 1]}”; reward so far: none`;
    else read.textContent = `Episode over after ${TOK.length} actions. The reward model gives one number, r(x, y), for the whole response.\nNo single token was labelled right or wrong, and r is not differentiable through the sampled tokens.`;
  }
  draw();
}

// ── B.4 Board 3: REINFORCE with and without a baseline ───────────────────────
export function pgBaseline(root) {
  const body = frame(root, "Board 3 — REINFORCE on a toy policy, with and without a baseline",
    "Three responses with rewards 5, 6 and 7 under a uniform policy. Draw batches, then move the baseline b.",
    "Toy policy and rewards from the Step 4 example in Board 3. Gradients are with respect to the policy's three logits: (r − b)(one-hot − π) per sample, averaged over the batch. The 300 batches use the same samples for both rows; all numbers computed here.");
  const R = [5, 6, 7], LAB = ["A", "B", "C"], PI = [1 / 3, 1 / 3, 1 / 3];
  let K = 4, b = 6, draws = 0;
  const sK = slider("batch size K", 1, 8, 1, K, v => { K = v; draw(); });
  const sB = slider("baseline b", 0, 8, 0.5, b, v => { b = v; draw(); }, v => v.toFixed(1));
  const bDraw = h("button", { class: "primary", onclick: () => { draws++; draw(); } }, "Draw a batch");
  const s = svg(760, 262, null, "samples pushed up or down, and the spread of gradient estimates");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sK, sB, bDraw, h("button", { onclick: () => setSlider(sB, 0) }, "b = 0"), h("button", { onclick: () => setSlider(sB, 6) }, "b = 6 (mean reward)")), s, read);
  const sample = r => Math.min(2, Math.floor(r() * 3));
  const est = (idx, base) => [0, 1, 2].map(i => idx.reduce((acc, k) => acc + (R[k] - base) * ((k === i ? 1 : 0) - PI[i]), 0) / idx.length);
  const exact = [0, 1, 2].map(i => PI[i] * (R[i] - R.reduce((a, v, j) => a + PI[j] * v, 0)));
  function draw() {
    s.innerHTML = "";
    const r = rng(4242 + draws * 7919);
    const batch = Array.from({ length: K }, () => sample(r));
    const g = est(batch, b);
    text(s, 0, 16, `This batch of K = ${K}`, "b", "start");
    text(s, 300, 16, "push on log π", "m");
    el("line", { x1: 300, y1: 26, x2: 300, y2: 30 + K * 26, class: "s-axis" }, s);
    batch.forEach((k, j) => {
      const y = 30 + j * 26, adv = R[k] - b;
      text(s, 0, y + 15, `sample ${j + 1}: ${LAB[k]}`, "", "start");
      text(s, 118, y + 15, `r = ${R[k]}`, "m", "start");
      text(s, 172, y + 15, `r − b = ${sgn(adv, 1)}`, adv > 0 ? "o" : "m", "start");
      const w = adv * 12;
      if (Math.abs(adv) > 1e-9) el("rect", { x: Math.min(300, 300 + w), y: y + 4, width: Math.abs(w), height: 14, rx: 2, fill: adv > 0 ? "var(--orange)" : "var(--blue-2)" }, s);
      else text(s, 306, y + 15, "no push", "m", "start");
    });
    // 300 batches, common random numbers
    const rr = rng(7 + K * 101);
    const idxs = Array.from({ length: 300 }, () => Array.from({ length: K }, () => sample(rr)));
    const X = linS(-2.5, 5, 400, 750);
    text(s, 400, 16, "300 batches: estimates of ∂J/∂z_C", "b", "start");
    const rows = [[0, 64, "no baseline (b = 0)"], [b, 150, `baseline b = ${b.toFixed(1)}`]];
    const stats = rows.map(([base, y, lab]) => {
      text(s, 400, y - 26, lab, "m", "start");
      const jr = rng(99);
      const vals = idxs.map(ix => est(ix, base)[2]);
      vals.forEach(v => el("circle", { cx: X(Math.max(-2.5, Math.min(5, v))), cy: y + (jr() - 0.5) * 30, r: 2.4, fill: base === 0 ? "var(--muted)" : "var(--orange)", opacity: 0.55 }, s));
      const m = vals.reduce((a, v) => a + v, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length);
      return [m, sd];
    });
    el("line", { x1: X(exact[2]), y1: 32, x2: X(exact[2]), y2: 186, class: "s-edge dash on" }, s);
    text(s, X(exact[2]) + 6, 200, `exact: ${sgn(exact[2], 3)}`, "o", "start");
    el("line", { x1: 400, y1: 214, x2: 750, y2: 214, class: "s-axis" }, s);
    [-2, 0, 2, 4].forEach(v => { el("line", { x1: X(v), y1: 210, x2: X(v), y2: 218, class: "s-axis" }, s); text(s, X(v), 232, String(v).replace("-", MINUS), "m"); });
    read.innerHTML = `this batch: ĝ = (${g.map(v => sgn(v, 3)).join(", ")})   exact gradient: (${exact.map(v => sgn(v, 3)).join(", ")})\n` +
      `300 batches of K = ${K}, estimate for response C (computed here):\n` +
      `  b = 0:   mean ${sgn(stats[0][0], 3)}, standard deviation <b>${stats[0][1].toFixed(3)}</b>\n` +
      `  b = ${b.toFixed(1)}: mean ${sgn(stats[1][0], 3)}, standard deviation <b>${stats[1][1].toFixed(3)}</b>\n` +
      "Both means approach the exact value: a baseline that does not depend on y leaves the gradient unbiased. The spread is what changes.";
  }
  draw();
}

// ── B.4 Board 3: the KL leash ────────────────────────────────────────────────
export function klLeash(root) {
  const body = frame(root, "Board 3 — the KL leash on four responses",
    "Move β. The orange bars are the policy that maximises expected reward minus β·KL; grey is the reference.",
    "Toy values from the script: π_ref = 0.25 each; rewards 1.0, 0.5, 0, −1.0. The maximiser π* = π_ref·e^(r/β)/Z is proved in Board 4 (<a data-ref=\"rafailov2023\">Rafailov et al., 2023</a>, eq. 4). All values computed here.");
  const REW = [1, 0.5, 0, -1], REF = [0.25, 0.25, 0.25, 0.25];
  let lb = 0;
  const sBeta = slider("β", -1.3, 1.3, 0.01, lb, v => { lb = v; draw(); }, v => (10 ** v).toPrecision(2));
  const pres = [10, 1, 0.5, 0.1].map(v => h("button", { onclick: () => setSlider(sBeta, Math.log10(v)) }, `β = ${v}`));
  const s = svg(760, 272, null, "reference and optimal policy bars for four responses");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sBeta, ...pres), s, read);
  function draw() {
    const beta = 10 ** lb;
    const w = REF.map((p, i) => p * Math.exp(REW[i] / beta)), Z = w.reduce((a, v) => a + v, 0), pi = w.map(v => v / Z);
    press(pres, i => Math.abs(Math.log10([10, 1, 0.5, 0.1][i]) - lb) < 0.006);
    s.innerHTML = "";
    const Y = linS(0, 1, 206, 28);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { el("line", { x1: 40, y1: Y(v), x2: 760, y2: Y(v), class: "s-axis" }, s); text(s, 32, Y(v) + 4, String(v), "m", "end"); });
    REW.forEach((rw, i) => {
      const gx = 60 + i * 176;
      el("rect", { x: gx + 20, y: Y(REF[i]), width: 52, height: Y(0) - Y(REF[i]), rx: 2, fill: "var(--panel-2)", stroke: "var(--muted)", "stroke-dasharray": "4 3" }, s);
      el("rect", { x: gx + 82, y: Y(pi[i]), width: 52, height: Math.max(0.5, Y(0) - Y(pi[i])), rx: 2, class: "s-bar on" }, s);
      text(s, gx + 46, Y(REF[i]) - 6, "0.25", "m");
      text(s, gx + 108, Y(pi[i]) - 6, pi[i].toFixed(3), "b");
      text(s, gx + 77, 226, `response ${i + 1}`, "b");
      text(s, gx + 77, 244, `reward ${num(rw, 1)}`, "m");
    });
    el("rect", { x: 60, y: 253, width: 22, height: 14, rx: 2, fill: "var(--panel-2)", stroke: "var(--muted)", "stroke-dasharray": "4 3" }, s);
    const lt = text(s, 88, 264, "π_ref, the reference", "m", "start");
    const lx = 88 + tlen(lt, 120) + 24;
    el("rect", { x: lx, y: 253, width: 22, height: 14, rx: 2, class: "s-bar on" }, s);
    text(s, lx + 28, 264, "π* = π_ref·e^(r/β) / Z", "m", "start");
    const Er = pi.reduce((a, p, i) => a + p * REW[i], 0);
    const KL = pi.reduce((a, p, i) => a + (p > 0 ? p * Math.log(p / REF[i]) : 0), 0);
    read.innerHTML = `β = ${beta.toPrecision(3)}   π* = (${pi.map(p => p.toFixed(3)).join(", ")})\n` +
      `E[r] = ${Er.toFixed(3)}   KL(π* ‖ π_ref) = ${KL.toFixed(3)}   J_β = E[r] − β·KL = <b>${(Er - beta * KL).toFixed(3)}</b> = β·log Z = ${(beta * Math.log(Z)).toFixed(3)}   (computed here)\n` +
      (beta > 3 ? "Large β: the policy stays close to the reference." : beta < 0.2 ? "Small β: nearly all mass on the highest reward, far from the reference." : "In between: more mass on higher rewards, but every response keeps some.");
  }
  draw();
}

// ── B.5 / C.2 shared: PPO and GRPO rows ──────────────────────────────────────
function rlRow(s, y0, mode) {
  const yM = y0 + 47, grpo = mode === "grpo";
  text(s, 0, y0 - 10, grpo ? "GRPO" : "PPO", "b", "start");
  dbox(s, 0, yM - 16, 40, 32, "q");
  arrow(s, 40, yM, 57, yM);
  mbox(s, 58, yM - 16, 84, 32, "policy", "trained");
  arrow(s, 142, yM, 161, yM);
  dbox(s, 162, yM - 16, 70, 32, grpo ? "o₁ … o_G" : "o");
  mbox(s, 268, y0, 112, 26, "reference", "frozen");
  mbox(s, 268, y0 + 34, 112, 26, "reward model", "frozen");
  mbox(s, 268, y0 + 68, 112, 26, grpo ? "no value model" : "value model", grpo ? "none" : "trained");
  arrow(s, 232, yM, 266, y0 + 13); arrow(s, 232, yM, 266, y0 + 47);
  if (!grpo) {
    arrow(s, 232, yM, 266, y0 + 81);
    arrow(s, 380, y0 + 13, 426, yM - 10); arrow(s, 380, y0 + 47, 426, yM); arrow(s, 380, y0 + 81, 426, yM + 10);
    text(s, 392, y0 + 12, "KL", "m", "start"); text(s, 392, y0 + 42, "r", "m", "start"); text(s, 392, y0 + 93, "v", "m", "start");
    box(s, 428, yM - 22, 120, 44, null, "", "");
    text(s, 488, yM - 2, "GAE", "b"); text(s, 488, yM + 14, "baseline from v", "m");
  } else {
    el("path", { d: `M380,${y0 + 13} L718,${y0 + 13} L718,${y0 + 19}`, class: "s-edge" }, s);
    arrow(s, 718, y0 + 15, 718, yM - 23);
    text(s, 560, y0 + 7, "KL, subtracted in the loss", "m");
    arrow(s, 380, y0 + 47, 426, yM);
    text(s, 404, yM + 20, "r₁…r_G", "m");
    box(s, 428, yM - 22, 120, 44, null, "", "");
    text(s, 488, yM - 2, "group", "b"); text(s, 488, yM + 14, "mean and std", "m");
  }
  arrow(s, 548, yM, 571, yM);
  dbox(s, 572, yM - 16, 80, 32, grpo ? "A₁ … A_G" : "A");
  arrow(s, 652, yM, 675, yM);
  box(s, 676, yM - 22, 84, 44, "update", "", "b");
  el("path", { d: `M718,${yM + 22} L718,${y0 + 110} L100,${y0 + 110} L100,${yM + 30}`, class: "s-edge on" }, s);
  arrow(s, 100, yM + 32, 100, yM + 18, true);
  if (!grpo) arrow(s, 324, y0 + 110, 324, y0 + 96, true);
}

// ── B.5 PPO: the four models and the clipped objective ───────────────────────
export function ppoClip(root) {
  const body = frame(root, "PPO: four models in memory, and a clipped objective",
    "Top: what PPO keeps in memory. Bottom: move ε and ρ. Beyond 1 ± ε in the direction the advantage favours, the objective goes flat.",
    "Top: structure after <a data-ref=\"shao2024\">Shao et al. (2024)</a>, Fig. 4 — redrawn; value model initialised from the reward model in <a data-ref=\"ouyang2022\">Ouyang et al. (2022)</a>, §3.5. Bottom: L^CLIP from <a data-ref=\"schulman2017\">Schulman et al. (2017)</a>, eq. 7, plotted for one token as in their Fig. 1 — redrawn; values computed here with Â = ±1.");
  let eps = 0.2, rho = 1.35;
  const s1 = svg(760, 172, null, "PPO with policy, reference, reward model and value model");
  const sE = slider("ε", 0.05, 0.5, 0.01, eps, v => { eps = v; draw(); }, v => v.toFixed(2));
  const sR = slider("ρ", 0, 2, 0.01, rho, v => { rho = v; draw(); }, v => v.toFixed(2));
  const s2 = svg(760, 272, null, "clipped surrogate objective for positive and negative advantage");
  const read = h("div", { class: "readout" });
  body.append(s1, h("div", { class: "controls", style: "margin-top:.6rem" }, sE, sR), s2, read);
  uid(s1); arrowDefs(s1);
  rlRow(s1, 26, "ppo");
  legend(s1, 0, 164, LEG_MODELS);
  const clipped = (r, A) => Math.min(r * A, Math.max(1 - eps, Math.min(1 + eps, r)) * A);
  function panel(x0, x1, A) {
    const yb = 204, yt = 40;
    const X = linS(0, 2, x0, x1), Y = A > 0 ? linS(-0.1, 2.1, yb, yt) : linS(-2.1, 0.1, yb, yt);
    text(s2, x0, 16, A > 0 ? "Â > 0: better than the baseline" : "Â < 0: worse than the baseline", "b", "start");
    el("rect", { x: X(1 - eps), y: yt, width: X(1 + eps) - X(1 - eps), height: yb - yt, fill: "var(--tint)" }, s2);
    text(s2, X(1), 33, "1 ± ε", "o");
    [0, 1, 2].forEach(v => { el("line", { x1: x0, y1: Y(v * A), x2: x1, y2: Y(v * A), class: "s-axis" }, s2); text(s2, x0 - 6, Y(v * A) + 4, num(v * A, 0), "m", "end"); });
    [0, 1, 2].forEach(v => text(s2, X(v), yb + 16, String(v), "m"));
    text(s2, (x0 + x1) / 2, yb + 36, "ρ = π_θ / π_old", "m");
    el("path", { d: path([[X(0), Y(0)], [X(2), Y(2 * A)]]), class: "s-edge dash" }, s2);
    const pts = []; for (let k = 0; k <= 200; k++) { const r = k / 100; pts.push([X(r), Y(clipped(r, A))]); }
    el("path", { d: path(pts), class: "s-line", stroke: "var(--orange)" }, s2);
    el("circle", { cx: X(1), cy: Y(A), r: 5, fill: "none", stroke: "var(--text)", "stroke-width": 1.6 }, s2);
    el("line", { x1: X(rho), y1: yt, x2: X(rho), y2: yb, class: "s-edge dash on" }, s2);
    el("circle", { cx: X(rho), cy: Y(clipped(rho, A)), r: 5, fill: "var(--orange)" }, s2);
  }
  function draw() {
    s2.innerHTML = "";
    panel(50, 350, 1); panel(440, 740, -1);
    el("line", { x1: 50, y1: 262, x2: 72, y2: 262, class: "s-edge dash" }, s2);
    const lt = text(s2, 78, 266, "ρÂ, unclipped", "m", "start");
    const lx = 78 + tlen(lt, 80) + 24;
    el("line", { x1: lx, y1: 262, x2: lx + 22, y2: 262, stroke: "var(--orange)", "stroke-width": 2.4 }, s2);
    const lt2 = text(s2, lx + 28, 266, "L^CLIP = min(ρÂ, clip(ρ, 1−ε, 1+ε)·Â)", "m", "start");
    const lx2 = lx + 28 + tlen(lt2, 230) + 24;
    el("rect", { x: lx2, y: 255, width: 22, height: 14, fill: "var(--tint)" }, s2);
    text(s2, lx2 + 28, 266, "1 ± ε", "m", "start");
    const line = A => {
      const c = Math.max(1 - eps, Math.min(1 + eps, rho)) * A, u = rho * A, L = Math.min(u, c);
      const flat = c < u;
      return `Â = ${A > 0 ? "+1" : "−1"}:  ρÂ = ${num(u)}, clip(ρ, 1−ε, 1+ε)·Â = ${num(c)}  →  L = ${num(L)}  ${flat ? "(flat: no gradient moves ρ further)" : "(slope Â: the gradient still acts)"}`;
    };
    read.textContent = `ε = ${eps.toFixed(2)}, ρ = ${rho.toFixed(2)}   (circle: the start, ρ = 1)\n${line(1)}\n${line(-1)}`;
  }
  draw();
}

// ── B.6 Over-optimisation ────────────────────────────────────────────────────
export function overOptimisation(root) {
  const body = frame(root, "Optimising a proxy too hard: reward model score vs true preference",
    "Vote first. Then move how far the policy is optimised, and where the KL leash stops it.",
    "Shape only, no values: curves drawn for this page after <a data-ref=\"stiennon2020\">Stiennon et al. (2020)</a>, Fig. 5, and <a data-ref=\"gao2023\">Gao et al. (2023)</a>, Fig. 1. Your vote is kept in this browser only.");
  const OPTS = [["rise", "Keeps rising"], ["level", "Levels off"], ["fall", "Rises, then falls"]];
  let vote = store.get("overopt-vote", null), shown = !!vote, u = 0.55, leash = 1;
  const vb = OPTS.map(([k, l]) => h("button", { onclick: () => { vote = k; shown = true; store.set("overopt-vote", k); draw(); } }, l));
  const bShow = h("button", { onclick: () => { shown = true; draw(); } }, "Show the true preference");
  const sU = slider("optimisation", 0, 1, 0.01, u, v => { u = v; draw(); }, v => v.toFixed(2));
  const sL = slider("KL leash (1 = off)", 0.1, 1, 0.01, leash, v => { leash = v; draw(); }, v => v.toFixed(2));
  const s = svg(760, 290, null, "proxy reward rising while true preference peaks and falls");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, h("span", { class: "note" }, "Keep raising the reward model's score. What people think of the answers:"), ...vb, bShow),
    h("div", { class: "controls" }, sU, sL), s, read);
  const D = 8, proxy = d => 2.6 * d ** 0.6, gold = d => 2.6 * d ** 0.6 * (1 - d / 6);
  function draw() {
    press(vb, i => OPTS[i][0] === vote);
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const x0 = 50, x1 = 740, yb = 250, yt = 20;
    const X = linS(0, D, x0, x1), Y = linS(-3.4, 9.4, yb, yt);
    arrow(s, x0, yb, x1 + 12, yb); arrow(s, x0, yb, x0, yt - 6);
    text(s, (x0 + x1) / 2, yb + 20, "distance from the initial policy, √KL — no values", "m");
    const yl = text(s, x0 - 14, (yb + yt) / 2, "score — no values", "m");
    yl.setAttribute("transform", `rotate(-90 ${x0 - 14} ${(yb + yt) / 2})`);
    el("line", { x1: x0, y1: Y(0), x2: x1, y2: Y(0), class: "s-edge faint dash" }, s);
    halo(text(s, x1, Y(0) - 6, "starting level", "m", "end"));
    const pts = fn => { const p = []; for (let k = 0; k <= 160; k++) { const d = (D * k) / 160; p.push([X(d), Y(fn(d))]); } return p; };
    el("path", { d: path(pts(proxy)), class: "s-line", stroke: "var(--orange)" }, s);
    halo(text(s, X(3.3), Y(proxy(3.3)) - 14, "reward model score (the proxy)", "o", "end"));
    const dl = leash * D, d = Math.min(u * D, dl);
    if (leash < 1) {
      el("line", { x1: X(dl), y1: yt, x2: X(dl), y2: yb, class: "s-edge dash" }, s);
      const lt = halo(text(s, X(dl) + 6, yt + 14, "the KL leash stops here", "b", "start"));
      if (X(dl) + 6 + tlen(lt, 150) > x1) { lt.setAttribute("x", X(dl) - 6); lt.setAttribute("text-anchor", "end"); }
    }
    if (shown) {
      el("path", { d: path(pts(gold)), class: "s-line", stroke: "var(--blue-2)" }, s);
      const gt = halo(text(s, X(0.25), Y(0) + 24, "true preference (humans, or a gold reward model)", "b", "start"));
      gt.style.fill = "var(--blue-2)";
      el("circle", { cx: X(d), cy: Y(gold(d)), r: 6, fill: "var(--blue-2)" }, s);
    }
    el("circle", { cx: X(d), cy: Y(proxy(d)), r: 6, fill: "var(--orange)" }, s);
    const vt = OPTS.find(o => o[0] === vote);
    const peak = 2.25;
    read.textContent = (vt ? `Your vote: ${vt[1].toLowerCase()}.\n` : "") +
      (!shown ? "The reward model's score rises the whole way. Vote, or press Show." :
        d < peak * 0.85 ? "Light optimisation: both curves rise. The reward model and people agree." :
        d < 6 * 0.9 ? "Past the peak: the proxy still rises, true preference has started to fall. The gap between them keeps opening." :
        "Far out: true preference is below where it started, while the proxy score is higher than ever.") +
      (leash < 1 && u * D > dl ? "\nThe leash holds the policy at the dashed line. It limits how far along the curve the policy goes; it does not change the curve." : "");
  }
  draw();
}

// ── C.1 Board 4: what DPO does to probabilities ──────────────────────────────
export function dpoProbs(root) {
  const body = frame(root, "Board 4 — DPO on toy log-probabilities",
    "Press Train step. Mass moves towards y_w and away from y_l, measured against the frozen reference; the pair's weight shrinks as the pair becomes correctly ordered.",
    "Toy policy: one softmax over five whole responses, starting at π_ref. Each step applies the DPO gradient of <a data-ref=\"rafailov2023\">Rafailov et al. (2023)</a>, §4, to the logits with learning rate 1; for this toy it changes only the logits of y_w and y_l, and the other responses lose mass through the softmax. β = 0.5 is a toy setting chosen so that a few steps show the effect. All values computed here.");
  const ZREF = [0.6, 0.3, 0.0, -0.3, -0.6], W = 1, L = 0;
  const soft = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, v) => a + v, 0); return e.map(v => v / s); };
  const PREF = soft(ZREF);
  let z = [...ZREF], beta = 0.5, steps = 0, hist = [];
  const sB = slider("β", 0.05, 1, 0.01, beta, v => { beta = v; draw(); }, v => v.toFixed(2));
  const state = () => {
    const p = soft(z), lw = Math.log(p[W] / PREF[W]), ll = Math.log(p[L] / PREF[L]);
    const dl = beta * (lw - ll);
    return { p, lw, ll, dl, loss: -Math.log(sig(dl)), wt: sig(-dl) };
  };
  const step = () => { const { wt } = state(); z[W] += beta * wt; z[L] -= beta * wt; steps++; hist.push(state().wt); };
  const bStep = h("button", { class: "primary", onclick: () => { step(); draw(); } }, "Train step");
  const b10 = h("button", { onclick: () => { for (let i = 0; i < 10; i++) step(); draw(); } }, "10 steps");
  const bReset = h("button", { onclick: () => { z = [...ZREF]; steps = 0; hist = []; draw(); } }, "Reset");
  const s = svg(760, 272, null, "reference and policy probabilities over five responses");
  const s2 = svg(760, 110, null, "pair weight over training steps");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sB, bStep, b10, bReset), s, s2, read);
  function draw() {
    const st = state();
    if (!hist.length) hist = [st.wt];
    s.innerHTML = "";
    const Y = linS(0, 1, 206, 30);
    [0, 0.5, 1].forEach(v => { el("line", { x1: 40, y1: Y(v), x2: 760, y2: Y(v), class: "s-axis" }, s); text(s, 32, Y(v) + 4, String(v), "m", "end"); });
    st.p.forEach((p, i) => {
      const gx = 56 + i * 142;
      el("rect", { x: gx + 10, y: Y(PREF[i]), width: 48, height: Y(0) - Y(PREF[i]), rx: 2, fill: "var(--panel-2)", stroke: "var(--muted)", "stroke-dasharray": "4 3" }, s);
      el("rect", { x: gx + 64, y: Y(p), width: 48, height: Y(0) - Y(p), rx: 2, class: `s-bar ${i === W || i === L ? "on" : ""}` }, s);
      text(s, gx + 34, Y(PREF[i]) - 6, PREF[i].toFixed(3), "m");
      text(s, gx + 88, Y(p) - 6, p.toFixed(3), "b");
      text(s, gx + 61, 226, i === W ? "y_w (chosen)" : i === L ? "y_l (rejected)" : `response ${i + 1}`, i === W ? "o" : "b");
      if (i === W || i === L) text(s, gx + 61, 244, `log π_θ/π_ref = ${sgn(i === W ? st.lw : st.ll)}`, "m");
    });
    el("rect", { x: 56, y: 253, width: 22, height: 14, rx: 2, fill: "var(--panel-2)", stroke: "var(--muted)", "stroke-dasharray": "4 3" }, s);
    const lt = text(s, 84, 264, "π_ref, frozen", "m", "start");
    const lx = 84 + tlen(lt, 80) + 24;
    el("rect", { x: lx, y: 253, width: 22, height: 14, rx: 2, class: "s-bar on" }, s);
    text(s, lx + 28, 264, "π_θ, trained (y_w and y_l in orange)", "m", "start");
    s2.innerHTML = "";
    const n = Math.max(20, hist.length - 1), X = linS(0, n, 60, 740), YW = linS(0, 0.6, 90, 14);
    [0, 0.5].forEach(v => { el("line", { x1: 60, y1: YW(v), x2: 740, y2: YW(v), class: "s-axis" }, s2); text(s2, 52, YW(v) + 4, String(v), "m", "end"); });
    el("path", { d: path(hist.map((w, i) => [X(i), YW(w)])), class: "s-line", stroke: "var(--orange)" }, s2);
    text(s2, 60, 106, "0", "m"); text(s2, 740, 106, `${n} steps`, "m", "end");
    text(s2, 400, 106, "pair weight σ(−Δ) over training steps", "m");
    read.innerHTML = `step ${steps}, β = ${beta.toFixed(2)}\n` +
      `implicit rewards r̂ = β·log π_θ/π_ref:  y_w ${sgn(beta * st.lw, 3)}   y_l ${sgn(beta * st.ll, 3)}\n` +
      `Δ = ${num(st.dl, 3)}   loss = −log σ(Δ) = ${st.loss.toFixed(3)}   pair weight σ(−Δ) = <b>${st.wt.toFixed(3)}</b>   (toy, computed here)`;
  }
  draw();
}

// ── C.2 RLVR: a verifier where the reward model was ──────────────────────────
export function rlvrLoop(root) {
  const body = frame(root, "RLVR: the same loop, with a program where the reward model was",
    "Switch the scorer. With the verifier, type an answer to the toy question and see its reward.",
    "Loop after step 3 of <a data-ref=\"ouyang2022\">Ouyang et al. (2022)</a>, Fig. 2, and <a data-ref=\"lambert2025\">Lambert et al. (2025)</a>, Fig. 18 — redrawn. v = α if correct, else 0, with α = 10 (Lambert et al., 2025, §6). The question and the four sampled answers are toy examples written for this page; the check runs in your browser.");
  let ver = true;
  const bRM = h("button", {}, "Reward model (RLHF)");
  const bV = h("button", {}, "Verifier (RLVR)");
  const inp = h("input", { type: "text", value: "408", "aria-label": "your answer", style: "width:6em;font:inherit;padding:.2rem .4rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--text)" });
  const s = svg(760, 176, null, "policy, response, scorer and reward in a loop");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bRM, bV, h("label", {}, "Toy question: 17 × 24 = ?  Your answer", inp)), s, read);
  bRM.addEventListener("click", () => { ver = false; draw(); });
  bV.addEventListener("click", () => { ver = true; draw(); });
  inp.addEventListener("input", draw);
  const SAMPLES = ["408", "418", "408", "398"], TRUE = 17 * 24, ALPHA = 10;
  const v = a => (Number(String(a).trim().replace(/,/g, "")) === TRUE ? ALPHA : 0);
  function draw() {
    press([bRM, bV], i => (i === 1) === ver);
    s.innerHTML = ""; uid(s); arrowDefs(s);
    dbox(s, 0, 60, 100, 36, "prompt x");
    arrow(s, 100, 78, 127, 78);
    mbox(s, 128, 60, 100, 36, "policy π_θ", "trained");
    arrow(s, 228, 78, 255, 78);
    dbox(s, 256, 60, 100, 36, "response y");
    arrow(s, 356, 78, 393, 78);
    if (ver) {
      el("rect", { x: 396, y: 52, width: 190, height: 52, rx: 6, fill: "var(--card)", stroke: "var(--orange)", "stroke-width": 2, "stroke-dasharray": "6 3" }, s);
      text(s, 491, 73, "verifier", "b"); text(s, 491, 92, "is the final answer correct?", "m");
      text(s, 491, 40, "a program, not a model", "o");
    } else {
      mbox(s, 396, 52, 190, 52, "reward model r_φ", "frozen");
      text(s, 491, 40, "a model learned from comparisons", "m");
    }
    arrow(s, 586, 78, 613, 78);
    dbox(s, 614, 60, 146, 36, ver ? "v = 10 or 0" : "r_φ(x, y)", "b");
    el("path", { d: "M687,96 L687,132 L178,132 L178,112", class: "s-edge on" }, s);
    arrow(s, 178, 114, 178, 98, true);
    text(s, 432, 152, "policy-gradient update; both versions keep the KL term to π_ref", "m");
    if (ver) {
      read.textContent = `Toy question 17 × 24; the verifier computes ${TRUE}.\n` +
        SAMPLES.map((a, i) => `sample ${i + 1}: ${a}  →  v = ${v(a)}`).join("\n") +
        `\nyour answer: ${inp.value.trim() || "(empty)"}  →  v = ${v(inp.value)}\nNo human and no learned model in the loop. The check works only because this answer can be checked.`;
    } else {
      read.textContent = "The reward model returns a learned score r_φ(x, y) for each sample. It was trained on human comparisons, so it can be wrong on responses unlike its training data, and a policy can learn to exploit that (Part B).";
    }
  }
  draw();
}

// ── C.2 PPO vs GRPO, with group-relative advantages ──────────────────────────
export function ppoGrpo(root) {
  const body = frame(root, "PPO vs GRPO: the value model is replaced by a group of samples",
    "Compare the two rows. Then click the reward chips to set each sampled output's reward, and read the advantages.",
    "Structure after <a data-ref=\"shao2024\">Shao et al. (2024)</a>, Fig. 4 — redrawn so the rows line up. Advantage Âᵢ = (rᵢ − mean) / std from §4.1.2; the paper does not say which standard deviation, so both are offered. Rewards are set by you; advantages computed here.");
  let G = 4, R = [1, 0, 0, 1], sample = false;
  const s = svg(760, 332, body, "PPO and GRPO pipelines aligned");
  uid(s); arrowDefs(s);
  rlRow(s, 26, "ppo");
  rlRow(s, 186, "grpo");
  legend(s, 0, 326, LEG_MODELS);
  const chips = h("div", { class: "chips" });
  const sG = slider("group size G", 2, 8, 1, G, v => { G = v; while (R.length < G) R.push(0); R.length = G; draw(); });
  const bPop = h("button", {}, "population std");
  const bSam = h("button", {}, "sample std");
  bPop.addEventListener("click", () => { sample = false; draw(); });
  bSam.addEventListener("click", () => { sample = true; draw(); });
  const presets = [["check-in: 1, 0, 0, 1", [1, 0, 0, 1]], ["all correct", [1, 1, 1, 1]]].map(([l, v]) => h("button", { onclick: () => { setSlider(sG, 4); R = [...v]; draw(); } }, l));
  const s2 = svg(760, 232, null, "advantages for each output in the group");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls", style: "margin-top:.6rem" }, sG, bPop, bSam, ...presets), h("div", { class: "controls" }, h("span", { class: "note" }, "rewards (click to toggle):"), chips), s2, read);
  function draw() {
    press([bPop, bSam], i => (i === 1) === sample);
    chips.innerHTML = "";
    R.forEach((r, i) => chips.appendChild(h("button", { class: `chip ${r ? "ctx" : ""}`, "aria-label": `output ${i + 1} reward ${r}`, onclick: () => { R[i] = 1 - R[i]; draw(); } }, `o${i + 1}: ${r}`)));
    const m = R.reduce((a, v) => a + v, 0) / G;
    const ss = R.reduce((a, v) => a + (v - m) ** 2, 0);
    const sd = Math.sqrt(ss / (sample ? G - 1 : G));
    const EPS = 1e-4, A = R.map(v => (v - m) / (sd + EPS));
    s2.innerHTML = "";
    const cw = 760 / G, y0 = 116, sc = 32;
    el("line", { x1: 0, y1: y0, x2: 760, y2: y0, class: "s-axis" }, s2);
    A.forEach((a, i) => {
      const cx = cw * i + cw / 2, hh = Math.abs(a) * sc;
      text(s2, cx, 16, `A = ${sgn(a, 2)}`, a > 0.005 ? "o" : "b");
      if (hh > 0.5) el("rect", { x: cx - 18, y: a > 0 ? y0 - hh : y0, width: 36, height: hh, rx: 2, fill: a > 0 ? "var(--orange)" : "var(--blue-2)" }, s2);
      text(s2, cx, 226, `o${i + 1}: r = ${R[i]}`, "m");
    });
    const same = ss === 0;
    read.innerHTML = `rewards (${R.join(", ")}): mean ${m.toFixed(3)}, ${sample ? "sample" : "population"} std ${sd.toFixed(3)}\n` +
      `advantages Âᵢ = (rᵢ − mean) / std = (${A.map(a => sgn(a, 3)).join(", ")})   (computed here)\n` +
      (same ? "All rewards are equal: every rᵢ − mean is 0 and the std is 0. With a small constant in the denominator the advantages are 0.\nThis question gives no reward signal; only the KL term acts."
        : "Above-average outputs are pushed up and below-average ones down. The group mean is a baseline estimated from other samples of the same prompt: no value model is trained.");
  }
  draw();
}

// ── C.2 DeepSeek-R1-Zero during RL ───────────────────────────────────────────
export function r1ZeroCurves(root) {
  const body = frame(root, "DeepSeek-R1-Zero during RL: accuracy and response length rise together",
    "Move along training. Switch versions to see the endpoint that arXiv v1 reported.",
    "Endpoints from <a data-ref=\"guo2025\">Guo et al. (2025)</a>: Nature paper, Fig. 1, and arXiv v2 (15.6% → 77.9%, 86.7% with cons@16); arXiv v1, Table 2 (15.6% → 71.0%, 86.7% with cons@64). Between the endpoints both curves are shape only, drawn for this page after the Nature paper's Fig. 1; the length panel has no values.");
  const VER = { nature: { end: 77.9, lab: "cons@16" }, v1: { end: 71.0, lab: "cons@64" } };
  let ver = "nature", t = 1;
  const bN = h("button", {}, "Nature / arXiv v2");
  const b1 = h("button", {}, "arXiv v1");
  bN.addEventListener("click", () => { ver = "nature"; draw(); });
  b1.addEventListener("click", () => { ver = "v1"; draw(); });
  const sT = slider("RL training", 0, 1, 0.01, t, v => { t = v; draw(); }, v => `${Math.round(v * 100)}%`);
  const s = svg(760, 246, null, "accuracy and response length over RL steps");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bN, b1, sT), s, read);
  const g = u => (1 - Math.exp(-2.2 * u)) / (1 - Math.exp(-2.2)) + 0.14 * Math.sin(23 * u) * u * (1 - u);
  const len = u => 0.08 + 0.84 * u ** 1.3 + 0.1 * Math.sin(17 * u) * u * (1 - u);
  function draw() {
    press([bN, b1], i => (i === 1) === (ver === "v1"));
    const V = VER[ver], acc = u => 15.6 + (V.end - 15.6) * g(u);
    s.innerHTML = "";
    const yb = 196, yt = 36;
    // accuracy
    const X = linS(0, 1, 60, 330), Y = linS(0, 100, yb, yt);
    const ta = text(s, 20, 18, "AIME 2024 pass@1 (%)", "b", "start");
    text(s, 20 + tlen(ta, 140) + 8, 18, "shape only between endpoints", "m", "start");
    [0, 25, 50, 75, 100].forEach(v => { el("line", { x1: 60, y1: Y(v), x2: 330, y2: Y(v), class: "s-axis" }, s); text(s, 52, Y(v) + 4, String(v), "m", "end"); });
    const pa = []; for (let k = 0; k <= 120; k++) pa.push([X(k / 120), Y(acc(k / 120))]);
    el("path", { d: path(pa), class: "s-line", stroke: "var(--orange)" }, s);
    el("circle", { cx: X(0), cy: Y(15.6), r: 5, fill: "var(--orange)" }, s);
    text(s, X(0) + 10, Y(15.6) + 18, "15.6%", "b", "start");
    el("circle", { cx: X(1), cy: Y(V.end), r: 5, fill: "var(--orange)" }, s);
    text(s, X(1) + 9, Y(V.end) + 5, `${V.end.toFixed(1)}%`, "b", "start");
    el("circle", { cx: X(1), cy: Y(86.7), r: 5, fill: "none", stroke: "var(--orange)", "stroke-width": 2 }, s);
    halo(text(s, X(1) + 9, Y(86.7) - 3, `86.7% (${V.lab})`, "m", "start"));
    text(s, 195, yb + 22, "RL step", "m");
    // length
    const X2 = linS(0, 1, 480, 740), Y2 = linS(0, 1, yb, yt);
    text(s, 480, 14, "average response length", "b", "start");
    text(s, 480, 30, "shape only, no values", "m", "start");
    [0, 0.5, 1].forEach(v => el("line", { x1: 480, y1: Y2(v), x2: 740, y2: Y2(v), class: "s-axis" }, s));
    const pl = []; for (let k = 0; k <= 120; k++) pl.push([X2(k / 120), Y2(len(k / 120))]);
    el("path", { d: path(pl), class: "s-line", stroke: "var(--blue-2)" }, s);
    text(s, 610, yb + 22, "RL step", "m");
    // cursor
    [[X, Y, acc, "var(--orange)"], [X2, Y2, len, "var(--blue-2)"]].forEach(([XX, YY, fn, col]) => {
      el("line", { x1: XX(t), y1: yt, x2: XX(t), y2: yb, class: "s-edge dash" }, s);
      el("circle", { cx: XX(t), cy: YY(fn(t)), r: 6, fill: col }, s);
    });
    read.textContent = `${ver === "v1" ? "arXiv v1 (22 Jan 2025)" : "Nature (17 Sep 2025) and arXiv v2 (4 Jan 2026)"}: AIME 2024 pass@1 15.6% at the start, ${V.end.toFixed(1)}% at the end; 86.7% with majority voting (${V.lab}).\n` +
      "Longer responses and higher accuracy arrive together, from a base model with no SFT on reasoning demonstrations. The reward checked only the final answer and the format.";
  }
  draw();
}

// ── C.2 Sharper, not wider? pass@k on toy problems ───────────────────────────
export function passAtK(root) {
  const body = frame(root, "pass@k: a model can get better at k = 1 and worse at large k",
    "Move k. Each cell is one toy problem's chance that a single sample is correct.",
    "Toy per-problem success rates chosen for this page to show the mechanism; they are not data from <a data-ref=\"yue2025\">Yue et al. (2025)</a>. pass@k = 1 − (1 − p)^k per problem (at least one of k independent samples correct), averaged over the ten problems, computed here.");
  const PB = [0.6, 0.45, 0.3, 0.2, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01];
  const PR = [0.97, 0.93, 0.85, 0.7, 0.45, 0.2, 0, 0, 0, 0];
  let lk = 0;
  const sK = slider("k", 0, 10, 1, lk, v => { lk = v; draw(); }, v => String(2 ** v));
  const s = svg(760, 250, null, "per-problem success rates and pass@k curves");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sK), s, read);
  const pass = (P, k) => P.reduce((a, p) => a + 1 - (1 - p) ** k, 0) / P.length;
  function draw() {
    const k = 2 ** lk;
    s.innerHTML = "";
    text(s, 0, 16, "Ten toy problems: p = chance one sample is correct", "b", "start");
    [[PB, "base", 40], [PR, "after RLVR", 104]].forEach(([P, lab, y]) => {
      text(s, 0, y + 22, lab, "b", "start");
      P.forEach((p, i) => {
        const x = 84 + i * 30, pk = 1 - (1 - p) ** k;
        el("rect", { x, y, width: 28, height: 34, rx: 3, fill: p ? `rgba(239,124,0,${0.1 + 0.6 * p})` : "var(--panel)", stroke: "var(--line)" }, s);
        text(s, x + 14, y + 22, p ? p.toFixed(2).slice(1) : "0", "");
        el("rect", { x, y: y + 38, width: 28 * pk, height: 5, fill: "var(--blue-2)" }, s);
      });
    });
    text(s, 84, 172, `blue strips: pass@${k} for each problem`, "m", "start");
    // curves
    const x0 = 440, x1 = 740, yb = 206, yt = 36;
    const X = linS(0, 10, x0, x1), Y = linS(0, 1, yb, yt);
    text(s, x0, 16, "average pass@k (computed here)", "b", "start");
    [0, 0.5, 1].forEach(v => { el("line", { x1: x0, y1: Y(v), x2: x1, y2: Y(v), class: "s-axis" }, s); text(s, x0 - 8, Y(v) + 4, String(v), "m", "end"); });
    [0, 2, 4, 6, 8, 10].forEach(v => text(s, X(v), yb + 16, String(2 ** v), "m"));
    text(s, (x0 + x1) / 2, yb + 36, "k (log scale)", "m");
    [[PB, "var(--blue-2)"], [PR, "var(--orange)"]].forEach(([P, col]) => {
      const pts = []; for (let j = 0; j <= 100; j++) { const e = j / 10; pts.push([X(e), Y(pass(P, 2 ** e))]); }
      el("path", { d: path(pts), class: "s-line", stroke: col }, s);
      el("circle", { cx: X(lk), cy: Y(pass(P, k)), r: 5, fill: col }, s);
    });
    halo(text(s, x1, Y(1) + 16, "base", "b", "end"));
    halo(text(s, x1, Y(0.6) + 22, "after RLVR", "o", "end"));
    el("line", { x1: X(lk), y1: yt, x2: X(lk), y2: yb, class: "s-edge dash" }, s);
    const b = pass(PB, k), r = pass(PR, k);
    read.textContent = `k = ${k}: base pass@k = ${b.toFixed(3)}, after RLVR ${r.toFixed(3)}   (toy, computed here)\n` +
      (r > b ? "The sharpened model is ahead: it puts more probability on answers it can already find." : "The base model is ahead: with enough samples it finds answers on problems where the sharpened model's probability went to zero.");
  }
  draw();
}

// ── C.3 Diffusion-DPO on one pair ────────────────────────────────────────────
export function diffusionDpo(root) {
  const body = frame(root, "Diffusion-DPO: denoising error plays the role of the log-ratio",
    "Set how well the trained model θ denoises each image, relative to the frozen reference. The loss falls when θ improves more on the preferred image.",
    "Structure of <a data-ref=\"wallace2024\">Wallace et al. (2024)</a>, eq. 14 and Fig. 2 — redrawn; the images are drawn placeholders, not generations. Errors are toy values; the reference errors are fixed at 1.00 and s stands for βTω(λ_t). Loss computed here.");
  let ew = 0.8, el_ = 1.1, sc = 1;
  const REFW = 1, REFL = 1;
  const sW = slider("θ's error, preferred", 0, 2, 0.05, ew, v => { ew = v; draw(); }, v => v.toFixed(2));
  const sL = slider("θ's error, rejected", 0, 2, 0.05, el_, v => { el_ = v; draw(); }, v => v.toFixed(2));
  const sS = slider("s = βTω", 0.5, 5, 0.1, sc, v => { sc = v; draw(); }, v => v.toFixed(1));
  const s = svg(760, 234, null, "preferred and rejected images with denoising errors of the trained and reference models");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, sW, sL, sS), s, read);
  const PAL = [["#9cc4ff", "#7fb2ff", "#6aa56a", "#3f7f4a"], ["#2a3550", "#223052", "#ffc15e", "#3a3f55"]];
  function tile(x, y, pal, noisy, seed) {
    const r = rng(seed);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      el("rect", { x: x + j * 16, y: y + i * 16, width: 15, height: 15, fill: pal[i] }, s);
      if (noisy) el("rect", { x: x + j * 16, y: y + i * 16, width: 15, height: 15, fill: r() > 0.5 ? "#ffffff" : "#000000", opacity: 0.15 + 0.45 * r() }, s);
    }
  }
  function draw() {
    s.innerHTML = ""; uid(s); arrowDefs(s);
    const X = v => 330 + v * 130;
    [[34, "preferred image x₀ʷ", ew, REFW, PAL[0], 11], [146, "rejected image x₀ˡ", el_, REFL, PAL[1], 12]].forEach(([y, lab, eth, eref, pal, seed]) => {
      text(s, 0, y - 12, lab, "b", "start");
      tile(0, y, pal, false, seed);
      arrow(s, 68, y + 32, 98, y + 32);
      text(s, 83, y + 24, "+ ε", "m");
      tile(102, y, pal, true, seed);
      text(s, 134, y + 78, "x_t", "m");
      text(s, 186, y + 22, "error of θ", "", "start");
      text(s, 186, y + 52, "error of the reference", "m", "start");
      el("rect", { x: 330, y: y + 8, width: Math.max(1, X(eth) - 330), height: 20, rx: 2, class: "s-bar on" }, s);
      el("rect", { x: 330, y: y + 38, width: X(eref) - 330, height: 20, rx: 2, class: "s-bar" }, s);
      text(s, X(eth) + 6, y + 23, eth.toFixed(2), "b", "start");
      text(s, X(eref) + 6, y + 53, eref.toFixed(2), "m", "start");
      text(s, 760, y + 38, `θ − ref: ${sgn(eth - eref)}`, eth - eref < 0 ? "o" : "b", "end");
    });
    const dw = ew - REFW, dl = el_ - REFL, inside = -sc * (dw - dl), loss = Math.log(1 + Math.exp(-inside));
    read.innerHTML = `preferred: θ − ref = ${sgn(dw)}     rejected: θ − ref = ${sgn(dl)}\n` +
      `inside σ: −s·(${sgn(dw)} − (${sgn(dl)})) = ${sgn(inside, 3)}     loss = −log σ(·) = <b>${loss.toFixed(3)}</b>   (toy, computed here)\n` +
      "Each squared error is the DDPM training loss from Part 1. “θ denoises this image better than the reference” stands in for DPO's log π_θ/π_ref.";
  }
  draw();
}

// ── C.4 Shallow safety ───────────────────────────────────────────────────────
export function shallowSafety(root) {
  const body = frame(root, "Shallow safety: a refusal prefix makes an unaligned model look safe",
    "Harmfulness rate of the base Llama-2-7B when its answer is forced to start with a refusal prefix. Click a row.",
    "Values and error bars from <a data-ref=\"qi2025\">Qi et al. (2025)</a>, Table 1, HEx-PHI benchmark: base Llama-2-7B with the prefix prefilled during decoding, and the aligned Llama-2-7B-Chat at 0 for every column. Redrawn as bars.");
  const DATA = [["no prefix", 68.6, 0.8], ["“I cannot”", 16.4, 1.4], ["“I cannot fulfill”", 5.4, 1.3], ["“I apologize”", 14.4, 0.6], ["“I apologize, but I cannot”", 2.1, 0.2], ["“I am unable”", 8.1, 0.4]];
  let sel = 1, aligned = true;
  const bA = h("button", { "aria-pressed": "true" }, "Show the aligned model");
  bA.addEventListener("click", () => { aligned = !aligned; draw(); });
  const s = svg(760, 338, null, "harmfulness rate with refusal prefixes");
  const read = h("div", { class: "readout" });
  body.append(h("div", { class: "controls" }, bA), s, read);
  function draw() {
    bA.setAttribute("aria-pressed", String(aligned));
    s.innerHTML = "";
    const X = linS(0, 100, 260, 700);
    let lx = 0;
    el("rect", { x: lx, y: 6, width: 22, height: 14, rx: 3, class: "s-bar" }, s);
    const t1 = text(s, lx + 28, 18, "base Llama-2-7B, prefix prefilled", "m", "start");
    lx += 28 + tlen(t1, 200) + 18;
    el("rect", { x: lx, y: 6, width: 22, height: 14, rx: 3, fill: "var(--orange)" }, s);
    text(s, lx + 28, 18, "aligned Llama-2-7B-Chat", "m", "start");
    [0, 25, 50, 75, 100].forEach(v => { el("line", { x1: X(v), y1: 34, x2: X(v), y2: 302, class: "s-axis" }, s); text(s, X(v), 318, String(v), "m"); });
    text(s, X(50), 334, "harmfulness rate on HEx-PHI (%)", "m");
    DATA.forEach(([nm, v, e], i) => {
      const y = 40 + i * 44, on = i === sel;
      const g = el("g", { style: "cursor:pointer" }, s);
      el("rect", { x: 0, y: y - 4, width: 760, height: 42, fill: "transparent" }, g);
      text(g, 250, y + 14, nm, on ? "b" : "", "end");
      el("rect", { x: 260, y, width: X(v) - 260, height: 18, rx: 2, class: "s-bar", style: on ? "opacity:1" : null }, g);
      el("line", { x1: X(v - e), y1: y + 9, x2: X(v + e), y2: y + 9, stroke: "var(--text)", "stroke-width": 1.6 }, g);
      [v - e, v + e].forEach(w => el("line", { x1: X(w), y1: y + 4, x2: X(w), y2: y + 14, stroke: "var(--text)", "stroke-width": 1.6 }, g));
      text(g, X(v + e) + 8, y + 14, `${v.toFixed(1)} ± ${e.toFixed(1)}`, on ? "b" : "m", "start");
      if (aligned) { el("rect", { x: 260, y: y + 22, width: 3, height: 10, fill: "var(--orange)" }, g); text(g, 270, y + 32, "0", "o", "start"); }
      g.addEventListener("click", () => { sel = i; draw(); });
    });
    const [nm, v, e] = DATA[sel];
    read.textContent = sel === 0
      ? "No prefix: the base model's answers to HEx-PHI's harmful instructions are harmful 68.6 ± 0.8% of the time. The aligned chat model: 0%."
      : `Base Llama-2-7B, answer forced to start with ${nm}: ${v.toFixed(1)} ± ${e.toFixed(1)}% harmful, down from 68.6% with no prefix. The aligned model: 0%.\nA few forced tokens do much of what safety training does. Llama-2-7B-Chat itself starts with “I cannot” or “I apologize” on 96.1% of these instructions (Qi et al., 2025, §2.2).`;
  }
  draw();
}

// ── C.5 What post-training can and cannot fix ────────────────────────────────
export function postTrainingGrid(root) {
  const body = frame(root, "What each training signal fixes, and what it does not",
    "Click a cell for the claim and its source; click a column heading to highlight that signal.",
    "Each filled cell restates a claim made earlier on this page, with its source. A dash means this session makes no claim. Orange: what the signal is for. Grey: a limit shown in this session.");
  const COLS = ["SFT (demonstrations)", "RLHF / DPO (comparisons)", "RLVR (checks)"];
  const P = "purpose", L = "limit", N = "none";
  const GRID = [
    ["Format", [[P, "its main effect", "SFT on a chat template with the loss on response tokens teaches the turn structure and when to stop (Board 1).", "#board1"], [N], [P, "format reward in R1-Zero", "DeepSeek-R1-Zero's rule-based reward includes a format reward: the reasoning must sit inside think tags (<a data-ref=\"guo2025\">Guo et al., 2025</a>).", "#rlvr"]]],
    ["Preference", [[L, "imitates one answer per prompt", "SFT raises the probability of the demonstrated response. It has no term for a response better than the demonstration, and no notion of how much better.", "#sft-limits"], [P, "its purpose; gamed by length and sycophancy", "Comparisons are what the reward model and DPO learn from. Optimised hard, the proxy rewards length (<a data-ref=\"singhal2024\">Singhal et al., 2024</a>) and agreeing with the user (<a data-ref=\"sharma2024\">Sharma et al., 2024</a>).", "#overopt"], [N]]],
    ["Safety", [[L, "part of safety training; shallow", "Safety training mixes SFT and preference optimisation, and its effect sits mostly in the first few output tokens (<a data-ref=\"qi2025\">Qi et al., 2025</a>). Fine-tuning on ten examples removed it from GPT-3.5 Turbo (<a data-ref=\"qi2024\">Qi et al., 2024</a>).", "#limits"], [L, "part of safety training; shallow", "The same finding applies: preference optimisation is part of safety training, and the result is shallow (<a data-ref=\"qi2025\">Qi et al., 2025</a>).", "#limits"], [N]]],
    ["Verifiable correctness", [[N], [N], [P, "its purpose; better pass@1, not shown to widen pass@k", "A verifier replaces the reward model. pass@1 rises (<a data-ref=\"guo2025\">Guo et al., 2025</a>), but at large k base models solve more problems (<a data-ref=\"yue2025\">Yue et al., 2025</a>).", "#rlvr"]]],
    ["Missing knowledge", [[L, "new facts raise hallucination", "Fine-tuning on facts the model did not already know makes it more likely to hallucinate once those examples are learned (<a data-ref=\"gekhman2024\">Gekhman et al., 2024</a>).", "#sft-limits"], [N], [L, "bounded by the base model", "The reasoning abilities of RLVR-trained models come from, and are bounded by, the base model in the settings measured (<a data-ref=\"yue2025\">Yue et al., 2025</a>).", "#rlvr"]]],
  ];
  let col = -1, cell = [0, 0];
  const tw = h("div", { class: "table-wrap", style: "margin:0" });
  const read = h("div", { class: "readout", style: "white-space:normal;font-family:var(--font)" });
  body.append(tw, read);
  function draw() {
    const t = h("table");
    const hr = h("tr", {}, h("th", {}, "Gap"));
    COLS.forEach((c, j) => hr.appendChild(h("th", {}, h("button", { "aria-pressed": String(col === j), style: "font-size:.8rem;padding:.2rem .5rem", onclick: () => { col = col === j ? -1 : j; draw(); } }, c))));
    t.appendChild(hr);
    GRID.forEach(([gap, cells], i) => {
      const tr = h("tr", {}, h("td", {}, h("b", {}, gap)));
      cells.forEach(([kind, short], j) => {
        const on = cell[0] === i && cell[1] === j;
        const shadows = [kind === P ? "inset 4px 0 0 var(--orange)" : kind === L ? "inset 4px 0 0 var(--muted)" : "", col === j ? "inset 0 0 0 2px var(--orange)" : ""].filter(Boolean);
        const style = [kind === P ? "background:var(--tint)" : kind === L ? "background:var(--panel)" : "color:var(--muted);text-align:center",
          shadows.length ? `box-shadow:${shadows.join(",")}` : "", on ? "font-weight:700" : "", kind === N ? "" : "cursor:pointer"].filter(Boolean).join(";");
        const td = h("td", { style }, kind === N ? "—" : short);
        if (kind !== N) td.addEventListener("click", () => { cell = [i, j]; draw(); });
        tr.appendChild(td);
      });
      t.appendChild(tr);
    });
    tw.innerHTML = ""; tw.appendChild(t);
    const [kind, short, long, href] = GRID[cell[0]][1][cell[1]];
    read.innerHTML = kind === N ? "This session makes no claim here." : `<b>${GRID[cell[0]][0]} · ${COLS[cell[1]]}</b>: ${long} <a href="${href}">Go to the section</a>.`;
    linkCites(read);
  }
  draw();
}
