// Slide engine: 1280×720 canvas scaled to the window, keyboard navigation,
// URL hash per slide, overview, blackout, and fit-to-slide for tall content.
import { apa, sortRefs, linkCites } from "./bib.js";

const W = 1280, H = 720;
const deck = document.querySelector(".deck");
const slides = [...deck.querySelectorAll(":scope > .slide")];
let cur = 0;

// references: every work cited on a slide goes in an APA footer at its bottom —
// each <a data-ref> inside it, plus keys listed in data-refs. data-refs="live" leaves
// an empty footer for a visualization to fill as it plays.
slides.forEach(s => {
  const live = s.dataset.refs === "live";
  const keys = live ? [] : [...s.querySelectorAll("a[data-ref]")].map(a => a.dataset.ref)
    .concat((s.dataset.refs || "").split(/\s+/).filter(Boolean));
  if (!live && !keys.length) return;
  const f = document.createElement("footer");
  f.className = live ? "refs live" : "refs";
  f.innerHTML = sortRefs(keys).map(k => `<span>${apa(k, true)}</span>`).join(" ");
  s.appendChild(f);
});
linkCites(deck, true);

// wrap each body's children so tall content can be scaled down to fit
slides.forEach((s, i) => {
  const body = s.querySelector(".slide-body");
  if (body && !body.querySelector(":scope > .fit")) {
    const fit = document.createElement("div");
    fit.className = "fit";
    while (body.firstChild) fit.appendChild(body.firstChild);
    body.appendChild(fit);
  }
  const n = document.createElement("span");
  n.className = "num";
  n.textContent = `${i + 1}`;
  s.appendChild(n);
});

function scaleDeck() {
  const k = Math.min(window.innerWidth / W, window.innerHeight / H);
  deck.style.transform = `scale(${k}) translate(-50%, -50%)`;
  deck.style.transformOrigin = "0 0";
}

// shrink a slide's content only when it does not fit; never enlarge
export function fit(s) {
  const body = s.querySelector(".slide-body"), inner = body && body.querySelector(":scope > .fit");
  if (!inner) return 1;
  const avail = body.getBoundingClientRect().height;
  const fits = z => { inner.style.zoom = z; return inner.getBoundingClientRect().height <= avail + 1; };
  if (fits(1)) { s.dataset.zoom = "1.00"; delete s.dataset.overflow; return 1; }
  // content re-wraps as it shrinks, so height is not proportional to zoom: bisect
  let lo = 0.5, hi = 1;
  if (!fits(lo)) { s.dataset.zoom = "0.50"; s.dataset.overflow = "1"; return lo; }
  for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; fits(mid) ? (lo = mid) : (hi = mid); }
  inner.style.zoom = lo;
  s.dataset.zoom = lo.toFixed(2);
  delete s.dataset.overflow;
  return lo;
}

const ro = "ResizeObserver" in window ? new ResizeObserver(entries => {
  entries.forEach(e => { const s = e.target.closest(".slide"); if (s && s.classList.contains("active")) requestAnimationFrame(() => fit(s)); });
}) : null;
slides.forEach(s => { const f = s.querySelector(".fit"); if (f && ro) ro.observe(f); });

// feedback: opens a new GitHub issue on the site's repository, pre-filled with the deck, the slide
// number and title, and the slide's URL. Repo from <body data-repo>, else the course site's repo.
const course = document.body.dataset.course || (document.body.dataset.deck || "").split(/\s+/)[0] || "course";
const repo = document.body.dataset.repo || "costa-nus/CEG5305_GenAI";
const fb = document.createElement("a");
fb.className = "feedback";
fb.target = "_blank";
fb.rel = "noopener";
fb.setAttribute("aria-label", "report an issue with this slide on GitHub");
fb.title = "Report an issue with this slide (opens GitHub)";
fb.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const setFeedback = () => {
  const n = (typeof cur === "number" ? cur : 0) + 1, t = slides[n - 1]?.dataset.title || "";
  const deck = document.body.dataset.deck || course;
  const title = `[${deck}] slide ${n}${t ? `: ${t}` : ""}`;
  const body = `**Slide:** ${location.href}\n\n**What is unclear or wrong?**\n\n`;
  fb.href = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
};
fb.addEventListener("click", setFeedback);
document.body.appendChild(fb);

const bar = document.querySelector(".chrome i");
function show(i, push = true) {
  scaleDeck();
  cur = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, k) => s.classList.toggle("active", k === cur));
  fit(slides[cur]);
  if (bar) bar.style.width = `${(100 * (cur + 1)) / slides.length}%`;
  const hash = `#/${cur + 1}`;
  if (push && location.hash !== hash) history.replaceState(null, "", hash);
  setFeedback();
  document.title = `${cur + 1}/${slides.length} · ${slides[cur].dataset.title || ""} — ${document.body.dataset.deck || ""}`;
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
}
const fromHash = () => { const m = location.hash.match(/#\/(\d+)/); return m ? +m[1] - 1 : 0; };

// overview: slides grouped by part (a .section-open slide starts one) and, inside a part, by the
// segments its opener links to (.seg a[data-goto]). A deck with no part openers gets one flat list.
const ov = document.querySelector(".overview");
function outline() {
  const text = el => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const segAt = new Map();                                 // slide index → segment label
  slides.forEach(s => {
    if (!s.classList.contains("section-open")) return;
    s.querySelectorAll(".seg a[data-goto]").forEach(a => {
      const k = slides.findIndex(x => x.dataset.title === a.dataset.goto);
      if (k >= 0) segAt.set(k, `${text(a.closest(".seg").querySelector("b"))} · ${text(a)}`);
    });
  });
  const parts = [];
  let part = { title: slides.some(s => s.classList.contains("section-open")) ? "Opening" : "", segs: [{ title: "", items: [] }] };
  slides.forEach((s, k) => {
    if (s.classList.contains("section-open")) {
      if (part.segs.some(g => g.items.length)) parts.push(part);
      part = { title: [text(s.querySelector(".eb")), text(s.querySelector("h1"))].filter(Boolean).join(" · "), segs: [{ title: "", items: [] }] };
    }
    if (segAt.has(k) || s.classList.contains("break-slide")) part.segs.push({ title: segAt.get(k) || "Break", items: [] });
    part.segs[part.segs.length - 1].items.push(k);
  });
  parts.push(part);
  parts.forEach(p => { p.segs = p.segs.filter(g => g.items.length); });
  return parts;
}
function toggleOverview(on = !ov.classList.contains("on")) {
  ov.classList.toggle("on", on);
  if (!on) return;
  ov.innerHTML = "";
  for (const p of outline()) {
    const sec = document.createElement("section");
    sec.className = "ov-part" + (p.segs.some(g => g.items.includes(cur)) ? " here" : "");
    if (p.title) { const h = document.createElement("h3"); h.textContent = p.title; sec.appendChild(h); }
    for (const g of p.segs) {
      if (g.title) { const h = document.createElement("h4"); h.textContent = g.title; if (g.items.includes(cur)) h.className = "here"; sec.appendChild(h); }
      const ol = document.createElement("ol");
      g.items.forEach(k => {
        const li = document.createElement("li"), b = document.createElement("button");
        b.innerHTML = `<b>${k + 1}</b>${slides[k].dataset.title || ""}`;
        if (k === cur) b.className = "cur";
        b.addEventListener("click", () => { toggleOverview(false); show(k); });
        li.appendChild(b); ol.appendChild(li);
      });
      sec.appendChild(ol);
    }
    ov.appendChild(sec);
  }
  ov.querySelector(".cur")?.scrollIntoView({ block: "center" });
}

const typing = el => el && (el.matches("input, select, textarea, [contenteditable]") || el.tagName === "IFRAME");
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = document.activeElement;
  if (e.key === "Escape") { toggleOverview(false); document.querySelector(".blackout").classList.remove("on"); return; }
  // clickers send PageUp/PageDown: those always navigate
  if (e.key === "PageDown") { e.preventDefault(); show(cur + 1); return; }
  if (e.key === "PageUp") { e.preventDefault(); show(cur - 1); return; }
  if (typing(t)) return;
  const onButton = t && t.tagName === "BUTTON";
  switch (e.key) {
    case "ArrowRight": case "ArrowDown": e.preventDefault(); show(cur + 1); break;
    case "ArrowLeft": case "ArrowUp": e.preventDefault(); show(cur - 1); break;
    case " ": if (!onButton) { e.preventDefault(); show(cur + (e.shiftKey ? -1 : 1)); } break;
    case "Home": e.preventDefault(); show(0); break;
    case "End": e.preventDefault(); show(slides.length - 1); break;
    case "f": case "F": document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); break;
    case "o": case "O": toggleOverview(); break;
    case "b": case "B": case ".": document.querySelector(".blackout").classList.toggle("on"); break;
    case "?": case "h": case "H": help(true); break;
  }
});
document.querySelector(".navbtn.prev")?.addEventListener("click", () => show(cur - 1));
document.querySelector(".navbtn.next")?.addEventListener("click", () => show(cur + 1));
const helpEl = document.querySelector(".help");
function help(force) { helpEl.classList.add("show"); clearTimeout(help.t); help.t = setTimeout(() => helpEl.classList.remove("show"), force ? 5000 : 3500); }

window.addEventListener("resize", scaleDeck);
if ("ResizeObserver" in window) new ResizeObserver(scaleDeck).observe(document.documentElement);
window.addEventListener("hashchange", () => show(fromHash(), false));
window.addEventListener("beforeprint", () => slides.forEach(s => { s.classList.add("active"); fit(s); }));
window.addEventListener("afterprint", () => show(cur));
document.addEventListener("viz:ready", () => fit(slides[cur]));

// a[data-goto="<slide data-title>"] jumps to that slide; resolved here so links survive inserted slides
document.querySelectorAll("a[data-goto]").forEach(a => {
  const k = slides.findIndex(s => s.dataset.title === a.dataset.goto);
  if (k >= 0) a.href = `#/${k + 1}`; else console.warn("data-goto: no slide titled", a.dataset.goto);
});

scaleDeck();
show(fromHash(), false);
help();
window.__slides = { show, fit, slides };
