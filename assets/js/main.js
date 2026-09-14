import { demos } from "./demos.js";

const registry = {};
async function load() {
  const [hist, tf] = await Promise.all([import("./p2l1/history.js"), import("./p2l1/transformer.js")]);
  Object.assign(registry, hist, tf);
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

document.addEventListener("DOMContentLoaded", async () => {
  demos();
  toc();
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
});
