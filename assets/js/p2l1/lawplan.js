// Visualizations for Part 2 · Lecture 1 · Session 02, Part B rework (6 Oct 2026).
// Registered in assets/js/main.js → load(). Helpers: ../lib.js (el, h, svg, text, slider, frame …).
// Part B · 3, "What the small runs cost": what Llama 3's scaling-law runs cost against the run they
// planned, and against trying sizes at full scale. Every number comes from the paper named in the
// footer (Grattafiori et al., 2024; nanoGPT for Part A's run); arithmetic done here says so.
// The SVG's viewBox is its size on the slide (the deck CSS sets its height), so text is drawn 1:1.
import { el, h, svg, text, slider, frame } from "../lib.js";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = e => String(e).split("").map(c => (/\d/.test(c) ? SUP[+c] : c === "-" ? "⁻" : c)).join("");
function sci(x, d = 1) {
  let e = Math.floor(Math.log10(x)), m = x / 10 ** e;
  if (+m.toFixed(d) >= 10) { e += 1; m = x / 10 ** e; }
  return `${m.toFixed(d)} × 10${sup(e)}`;
}

// Llama 3 405B (Grattafiori et al., 2024): 3.8 × 10²⁵ FLOPs (§3.2, §3.2.1); 16,384 H100s at
// 400 TFLOP/s each (Table 4), the same rate as the deck's slide "Llama 3 405B: FLOPs to days".
const FLAG = 3.8e25;
const RATE = 16384 * 400e12;
// Scaling-law runs (§3.2.1): budgets 6 × 10¹⁸ … 10²² FLOPs (Fig. 2 legend); the number of runs at
// each budget is the number of dots on its curve in Fig. 2, counted here (overlapping dots may hide
// a few). Each run at a budget uses that budget's FLOPs.
const SWEEP = [[6e18, 16], [1e19, 17], [3e19, 16], [6e19, 16], [1e20, 18], [3e20, 14], [6e20, 11], [1e21, 12], [3e21, 6], [1e22, 6]];
const UPPER = 18;        // the most dots counted on any curve: an upper bound if every budget had that many
// Part A's run: nanoGPT, GPT-2 small, 6 × 124.4M × 294.9B (Karpathy, 2022; the deck's slide 31)
const NANO = 2.2e20;

const days = f => f / RATE / 86400;
function dur(f) {
  const s = f / RATE;
  if (s < 3600) return `${Math.round(s / 60)} minutes`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
  return `${Math.round(s / 86400)} days`;
}

export function lawPlan(root) {
  const body = frame(root, "What did the small runs of Llama 3 cost?",
    "The compute of the small runs, of one large run, and of several large runs. Then the same values in days on 16,384 GPUs.",
    "Budgets, model sizes, 3.8 × 10²⁵ FLOPs and 400 TFLOP/s on 16,384 H100 GPUs: <a data-ref=\"grattafiori2024\">Grattafiori et al. (2024)</a>, §3.2.1, Fig. 2, Table 4. Runs at each budget: we counted the dots in Fig. 2. nanoGPT: <a data-ref=\"karpathy2022\">Karpathy (2022)</a>. We calculated the sums, fractions and days.");
  let sizes = 3, upper = false;
  const bUp = h("button", { "aria-pressed": "false" }, "Upper limit: 18 runs at each budget");
  bUp.addEventListener("click", () => { upper = !upper; draw(); });
  const sl = slider("Sizes to try as large runs", 2, 5, 1, sizes, v => { sizes = v; draw(); }, v => String(v));
  const s = svg(1150, 362, null, "compute of the small runs, of one large run and of several large runs; days on 16,384 GPUs");
  body.append(h("div", { class: "controls" }, sl, bUp), s);

  function draw() {
    bUp.setAttribute("aria-pressed", String(upper));
    s.innerHTML = "";
    const sweep = upper ? UPPER * SWEEP.reduce((a, [c]) => a + c, 0) : SWEEP.reduce((a, [c, n]) => a + c * n, 0);
    const runs = upper ? UPPER * SWEEP.length : SWEEP.reduce((a, [, n]) => a + n, 0);
    const share = (100 * sweep) / FLAG;

    // ── top: compute of each piece, log scale ──
    const lx = 318, x0 = 332, x1 = 840, lo = 19, hi = 27;
    const X = f => x0 + ((Math.log10(f) - lo) / (hi - lo)) * (x1 - x0);
    text(s, x0, 16, "Compute in FLOPs, log scale", "m", "start");
    text(s, 1150, 16, "time on the 16,384 GPUs of Llama 3", "m", "end");
    const rows = [
      ["Part A’s nanoGPT run", NANO, "nano", "4 days on 8 A100 GPUs"],
      ["Llama 3’s largest small run", 1e22, "small", dur(1e22)],
      [`All ${upper ? runs : "~" + Math.round(runs / 10) * 10} small runs`, sweep, "sweep", dur(sweep)],
      ["One large run (Llama 3 405B)", FLAG, "flag", dur(FLAG)],
      [`${sizes} large runs, one per size`, sizes * FLAG, "try", dur(sizes * FLAG)],
    ];
    const top = 30, rh = 34, bh = 24, axisY = top + rows.length * rh + 2;
    for (let e = lo; e <= hi; e++) {
      el("line", { x1: X(10 ** e), y1: top - 4, x2: X(10 ** e), y2: axisY, class: "s-axis" }, s);
      text(s, X(10 ** e), axisY + 20, `10${sup(e)}`, "m");
    }
    rows.forEach(([lab, f, k, t], i) => {
      const y = top + i * rh;
      text(s, lx, y + bh / 2 + 7, lab, k === "sweep" ? "b o" : k === "nano" ? "m2" : "", "end");
      el("rect", { x: x0, y, width: X(f) - x0, height: bh, rx: 3, class: `lp-bar ${k}` }, s);
      text(s, X(f) + 10, y + bh / 2 + 7, sci(f), k === "sweep" ? "b o" : "b", "start");
      text(s, 1150, y + bh / 2 + 7, t, k === "sweep" ? "b o" : k === "nano" ? "m2" : "", "end");
    });
    // share of the sweep, written next to its value
    const ys = top + 2 * rh + bh / 2 + 7;
    text(s, X(sweep) + 112, ys, `= ${share.toFixed(share < 1 ? 2 : 1)}% of one large run`, "b o", "start");

    // ── bottom: days on the cluster, linear ──
    const b0 = axisY + 58, dMax = 380, Xd = d => x0 + (d / dMax) * (1110 - x0);
    text(s, x0, b0 - 10, "Days on 16,384 H100 GPUs at 400 TFLOP/s each, linear scale", "m", "start");
    const tF = days(FLAG), tS = days(sweep);
    const yA = b0 + 2, yB = b0 + 2 + rh;
    text(s, lx, yA + bh / 2 + 7, "Small runs, then one large run", "b", "end");
    el("rect", { x: x0, y: yA, width: Math.max(2, Xd(tS) - x0), height: bh, class: "lp-bar sweep" }, s);
    el("rect", { x: Xd(tS) + 1, y: yA, width: Xd(tS + tF) - Xd(tS) - 1, height: bh, rx: 3, class: "lp-bar flag" }, s);
    text(s, Xd(tS + tF) + 10, yA + bh / 2 + 7, `${(tS + tF).toFixed(1)} days`, "b", "start");
    text(s, lx, yB + bh / 2 + 7, `${sizes} large runs, one per size`, "b", "end");
    for (let k = 0; k < sizes; k++) {
      el("rect", { x: Xd(k * tF) + (k ? 2 : 0), y: yB, width: Xd(tF) - x0 - (k ? 2 : 0), height: bh, rx: 3, class: "lp-bar try" }, s);
    }
    text(s, Xd(sizes * tF) + 10, yB + bh / 2 + 7, `${Math.round(sizes * tF)} days`, "b", "start");
    // the difference, as a bracket under the two bars
    const yC = yB + bh + 12, xa = Xd(tS + tF), xb = Xd(sizes * tF);
    el("path", { d: `M${xa},${yC - 6} L${xa},${yC} L${xb},${yC} L${xb},${yC - 6}`, class: "lp-brace" }, s);
    text(s, (xa + xb) / 2, yC + 24, `${Math.round(sizes * tF - tS - tF)} days less`, "b o");
  }
  draw();
}
