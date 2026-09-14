// Shared helpers for the lecture visualizations. No dependencies.
export const NS = "http://www.w3.org/2000/svg";

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === "text") e.textContent = v;
    else e.setAttribute(k, v);
  }
  if (parent) parent.appendChild(e);
  return e;
}

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    e.appendChild(typeof kid === "string" || typeof kid === "number" ? document.createTextNode(String(kid)) : kid);
  }
  return e;
}

export function svg(w, hgt, parent, label) {
  const s = el("svg", { viewBox: `0 0 ${w} ${hgt}`, role: "img", "aria-label": label || "" });
  if (parent) parent.appendChild(s);
  return s;
}

// arrowhead marker, one per svg
export function arrowDefs(s) {
  const defs = el("defs", {}, s);
  for (const [id, cls] of [["ah", "s-arrow"], ["ah-on", "s-arrow on"]]) {
    const m = el("marker", { id: id + s.dataset.uid, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", class: cls }, m);
  }
}
let UID = 0;
export function uid(s) { s.dataset.uid = String(++UID); return s.dataset.uid; }
export function arrow(s, x1, y1, x2, y2, on = false, extra = "") {
  return el("line", { x1, y1, x2, y2, class: `s-edge ${on ? "on" : ""} ${extra}`, "marker-end": `url(#${on ? "ah-on" : "ah"}${s.dataset.uid})` }, s);
}
export function box(s, x, y, w, hh, label, cls = "", tcls = "", rx = 6) {
  const g = el("g", {}, s);
  el("rect", { x, y, width: w, height: hh, rx, class: `s-box ${cls}` }, g);
  if (label !== undefined && label !== null) {
    el("text", { x: x + w / 2, y: y + hh / 2 + 4.5, "text-anchor": "middle", class: `s-text ${tcls}`, text: label }, g);
  }
  return g;
}
export function text(s, x, y, t, cls = "", anchor = "middle") {
  return el("text", { x, y, "text-anchor": anchor, class: `s-text ${cls}`, text: t }, s);
}

// seeded PRNG (mulberry32) and a gaussian from it — every "random" weight is reproducible
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r) {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const randMat = (r, rows, cols, scale = 1) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => gauss(r) * scale));

export const matmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
export const transpose = A => A[0].map((_, j) => A.map(r => r[j]));
export const mapMat = (A, f) => A.map((r, i) => r.map((v, j) => f(v, i, j)));
export const matvec = (A, x) => A.map(r => r.reduce((s, a, k) => s + a * x[k], 0));
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
export function softmax(v) {
  const m = Math.max(...v.filter(Number.isFinite));
  const e = v.map(x => (Number.isFinite(x) ? Math.exp(x - m) : 0));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
}

// diverging colour for a value in [-1, 1] and sequential for [0, 1]
const dark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
export function divColor(v) {
  const t = Math.max(-1, Math.min(1, v));
  if (dark()) return t >= 0 ? `rgba(255,165,61,${0.12 + 0.75 * t})` : `rgba(127,178,255,${0.12 + 0.75 * -t})`;
  return t >= 0 ? `rgba(239,124,0,${0.1 + 0.8 * t})` : `rgba(0,61,124,${0.1 + 0.75 * -t})`;
}
export function seqColor(v) {
  const t = Math.max(0, Math.min(1, v));
  return dark() ? `rgba(255,165,61,${0.06 + 0.9 * t})` : `rgba(239,124,0,${0.05 + 0.9 * t})`;
}

export const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : x > 0 ? "∞" : "−∞");
export function sci(x) {
  if (x < 1e6) return Math.round(x).toLocaleString("en-US");
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  const sup = String(e).split("").map(c => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("");
  return `${m.toFixed(2)} × 10${sup}`;
}
export function bytes(x) {
  const u = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let i = 0;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return i === u.length - 1 && x >= 1000 ? `${sci(x)} YB` : `${x.toFixed(x < 10 ? 1 : 0)} ${u[i]}`;
}

// wire a <input type=range> to an <output>, return a getter
export function slider(label, min, max, step, value, onInput, format = v => v) {
  const out = h("output", {}, format(value));
  const inp = h("input", { type: "range", min, max, step, value, "aria-label": label });
  inp.addEventListener("input", () => { out.textContent = format(+inp.value); onInput(+inp.value); });
  const lab = h("label", {}, label, inp, out);
  lab.input = inp;
  return lab;
}

// a matrix rendered as a small heat-mapped table
export function matTable(M, { cap, rowLabels, colLabels, color = divColor, digits = 2, scale, masked, highlightRow } = {}) {
  const s = scale ?? Math.max(1e-9, ...M.flat().filter(Number.isFinite).map(Math.abs));
  const t = h("table");
  if (colLabels) t.appendChild(h("tr", {}, h("th"), ...colLabels.map(c => h("th", {}, c))));
  M.forEach((row, i) => {
    const tr = h("tr", { class: highlightRow === i ? "hl" : "" });
    if (rowLabels) tr.appendChild(h("th", {}, rowLabels[i]));
    row.forEach((v, j) => {
      const isMasked = masked && masked(i, j);
      const td = h("td", { class: isMasked ? "masked" : "" }, isMasked ? "−∞" : fmt(v, digits));
      if (!isMasked) td.style.background = color(v / s);
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  return h("div", { class: "mat" }, cap ? h("div", { class: "cap" }, cap) : null, t);
}

export function frame(root, title, sub, foot) {
  root.classList.add("viz");
  root.innerHTML = "";
  root.appendChild(h("div", { class: "viz-head" }, h("span", { class: "t" }, title), sub ? h("span", { class: "s" }, sub) : null));
  const body = h("div", { class: "viz-body" });
  root.appendChild(body);
  if (foot) root.appendChild(h("div", { class: "viz-foot", html: foot }));
  return body;
}
