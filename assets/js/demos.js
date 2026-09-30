// Click-to-load embeds of other people's demo sites. Nothing loads until asked:
// several of these download hundreds of megabytes of weights on first open.
import { h } from "./lib.js";

export function demos(scope = document) {
  scope.querySelectorAll(".demo[data-src]").forEach(d => {
    const src = d.dataset.src, title = d.dataset.title, by = d.dataset.by || "", cost = d.dataset.cost || "";
    const minH = +d.dataset.minh || 0;
    const note = d.innerHTML.trim();
    d.innerHTML = "";
    const open = h("a", { class: "btn", href: src, target: "_blank", rel: "noopener" }, "Open in new tab ↗");
    const full = h("button", { hidden: true }, "Full screen");
    const unload = h("button", { hidden: true }, "Unload");
    const stage = h("div", { class: "demo-stage" });
    const load = h("button", { class: "primary" }, "Load the demo here");
    const gate = h("div", { class: "gate" }, load, h("p", {}, cost ? `First load: ${cost}.` : "Runs in your browser."), h("p", {}, "Or open it in its own tab."));
    stage.appendChild(gate);
    d.append(
      h("div", { class: "demo-head" }, h("span", { class: "t" }, title), h("span", { class: "by" }, by), h("span", { class: "act" }, full, unload, open)),
      stage,
      note ? h("div", { class: "demo-foot", html: note }) : null);
    load.addEventListener("click", () => {
      gate.hidden = true;
      const f = h("iframe", { src, title, allow: "fullscreen; clipboard-write" });
      stage.appendChild(f);
      if (minH) f._ro = fitFrame(stage, f, minH);
      full.hidden = unload.hidden = false;
    });
    unload.addEventListener("click", () => {
      const f = stage.querySelector("iframe");
      f?._ro?.disconnect();
      f?.remove();
      gate.hidden = false; full.hidden = unload.hidden = true;
    });
    full.addEventListener("click", () => stage.requestFullscreen?.());
  });
}

// Some sites size their panels to the window and collapse them in a short frame: the n-gram
// demo hides its generated text below about 470 px. data-minh="520" gives the frame a
// viewport at least that tall and scales it down to fit the stage.
function fitFrame(stage, f, minH) {
  const apply = () => {
    const w = stage.clientWidth, ht = stage.clientHeight;
    if (!ht || ht >= minH) { f.style.width = f.style.height = f.style.transform = ""; return; }
    const k = ht / minH;
    Object.assign(f.style, { width: `${w / k}px`, height: `${minH}px`, transform: `scale(${k})`, transformOrigin: "0 0" });
  };
  const ro = new ResizeObserver(apply);
  ro.observe(stage);
  f.addEventListener("load", apply);
  apply();
  return ro;
}
