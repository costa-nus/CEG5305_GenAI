/* Inspect original source figures without changing the slide layout. */
(() => {
  const figures = [...document.querySelectorAll('.slide img')].filter(img => !img.closest('a') && !img.hasAttribute('data-no-zoom'));
  if (!figures.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'figure-viewer';
  dialog.setAttribute('aria-label', 'Enlarged figure');
  dialog.innerHTML = `<div class="figure-toolbar"><span class="figure-title"></span><button type="button" data-action="out" aria-label="Zoom out">−</button><output aria-live="polite"></output><button type="button" data-action="in" aria-label="Zoom in">+</button><button type="button" data-action="fit">Fit</button><button type="button" data-action="original">Original resolution</button><button type="button" data-action="close">Close</button></div><div class="figure-stage"><img alt=""></div>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.figure-stage');
  const expanded = stage.querySelector('img');
  const title = dialog.querySelector('.figure-title');
  const output = dialog.querySelector('output');
  let source, fitWidth = 1, zoom = 1;
  function render() {
    expanded.style.width = `${Math.round(fitWidth * zoom)}px`;
    output.textContent = `${Math.round(zoom * 100)}%`;
  }
  function fit() {
    fitWidth = Math.min(source.naturalWidth, stage.clientWidth - 48,
      (stage.clientHeight - 48) * source.naturalWidth / source.naturalHeight);
    zoom = 1;
    render();
    stage.scrollTo(0, 0);
  }
  function open(img) {
    source = img;
    expanded.src = img.currentSrc || img.src;
    expanded.alt = img.alt;
    title.textContent = img.alt || 'Source figure';
    dialog.showModal();
    fit();
  }
  figures.forEach(img => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Enlarge figure: ${img.alt || 'Source figure'}`);
    img.title = 'Click to enlarge figure';
    img.classList.add('figure-zoomable');
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        open(img);
      }
    });
  });
  dialog.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (action === 'close') dialog.close();
    if (action === 'fit') fit();
    if (action === 'in') { zoom = Math.min(16, zoom * 1.5); render(); }
    if (action === 'out') { zoom = Math.max(.5, zoom / 1.5); render(); }
    if (action === 'original') { zoom = source.naturalWidth / fitWidth; render(); }
  });
  // Keep the deck's arrow/page navigation inactive while inspecting a figure.
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  }, true);
  dialog.addEventListener('close', () => source?.focus({ preventScroll: true }));
})();
