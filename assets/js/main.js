import { demos } from "./demos.js";
import { apa, sortRefs, linkCites } from "./bib.js";

const registry = {};
async function load() {
  const [hist, tf, train, post] = await Promise.all([import("./p2l1/history.js"), import("./p2l1/transformer.js"), import("./p2l1/training.js"), import("./p2l2/posttraining.js")]);
  Object.assign(registry, hist, tf, train, post);
}

function toc() {
  const links = [...document.querySelectorAll(".toc a[href^='#']")];
  if (!links.length) return;
  const targets = links.map(a => [a, document.getElementById(a.getAttribute("href").slice(1))]).filter(([, t]) => t);
  let queued = false;
  const update = () => {
    queued = false;
    const line = window.innerHeight * 0.25;
    let current = targets[0];
    for (const pair of targets) if (pair[1].getBoundingClientRect().top <= line) current = pair;
    links.forEach(a => a.classList.toggle("active", a === current[0]));
  };
  window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// lecture page: link every citation, and list the cited works under References
function cites() {
  linkCites(document);
  const list = document.querySelector("[data-refs-list]");
  if (!list) return;
  const keys = [...document.querySelectorAll("main a[data-ref]")].map(a => a.dataset.ref);
  list.innerHTML = sortRefs(keys).map(k => `<li>${apa(k)}</li>`).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  demos();
  toc();
  const page = !document.querySelector(".deck");
  if (page) cites();
  const nodes = document.querySelectorAll("[data-viz]");
  if (!nodes.length) return;
  await load();
  nodes.forEach(n => {
    const fn = registry[n.dataset.viz];
    try {
      if (!fn) throw new Error(`no visualization named “${n.dataset.viz}”`);
      fn(n);
    } catch (err) {
      n.classList.add("callout", "warn");
      n.textContent = `This visualization failed to load: ${err.message}`;
      console.error(err);
    }
  });
  if (page) cites(); // visualization footers cite too
  document.dispatchEvent(new Event("viz:ready"));
});
