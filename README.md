# CEG5305 course site

Static site for **CEG5305 Introduction to Generative AI with Foundation Models**
(NUS, AY2026/27 Semester 1), served by GitHub Pages at
<https://costa-nus.github.io/CEG5305_GenAI/>.

Plain HTML, CSS and ES-module JavaScript. No build step and no dependencies
beyond KaTeX from a CDN, and Transformers.js, which the GPT-2 demo page loads from a
CDN only when its button is pressed.

```
index.html                    course home
part2/lecture-1/index.html    Part 2 · Lecture 1 — Architecture of LLMs
assets/css/site.css           shared styles, light and dark
assets/js/lib.js              SVG, matrix and seeded-random helpers
assets/js/demos.js            click-to-load embeds of external demo sites
assets/js/main.js             mounts every [data-viz] element on a page
assets/js/p2l1/history.js     n-gram, MLP, RNN, LSTM, seq2seq, chain vs fan, Markov window, scale vs architecture chart, Transformers beyond language
assets/js/p2l1/transformer.js architecture, nanoGPT map, attention, C1–C6, ConvNeXt, perplexity
part2/lecture-1/demos/gpt2/   GPT-2 small running in the browser (Transformers.js)
part2/lecture-1/demos/lstm/   a character LSTM trained on Alice, forward pass in plain JS
part2/lecture-1/code/         ablation_base.py, the homework's base code (the class ablation)
```

## Run locally

ES modules do not load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000/>.

## Slides

Each lecture can have an HTML slide deck beside its page, built from the same
visualizations: `part2/lecture-1/slides/index.html`.

| Key | Action |
|---|---|
| → ← · PageDown PageUp (clickers) · Space | next / previous slide |
| Home · End | first / last slide |
| F | full screen |
| O | overview of all slides |
| B or . | black screen |

- The canvas is 1280×720 and scales to the window. Slide *n* is at `#/n`.
- **Jump links:** `<a data-goto="Part B">` links to the slide whose `data-title` is
  "Part B". `slides.js` resolves it at load, so the link survives inserted slides.
- Content that is too tall is scaled down to fit (`slides.js` → `fit()`), never
  clipped. Size diagrams so this rarely triggers.
- **Text floor:** prose on slides is at least 27 canvas px, which is 20 pt on a
  13.33-inch slide — the same floor as the PowerPoint decks. Text *inside*
  diagrams is smaller.
- **References:** a slide that mentions prior work ends with its references in
  APA style. `slides.js` builds the footer from every `<a data-ref="key">` on the
  slide plus any keys in `<section data-refs="…">`; entries come from
  `assets/js/bib.js`. The lecture page lists all its citations under References.
- Print to PDF from the browser: one slide per page.
- Embedded demos load only when clicked. Load the heavy ones before class.

## Adding a visualization

Write a function `(root) => void` in a module under `assets/js/`, export it, and
put `<div data-viz="functionName"></div>` in the page. `main.js` finds and mounts
it; a failure shows an inline message instead of breaking the page.

## Content rules

- **Every diagram is drawn in HTML/SVG.** No figures copied from papers or other
  courses' slides. Where a diagram follows a paper's figure, the paper is cited
  under it.
- **Cite from `assets/js/bib.js`.** One entry per work, with its URL and
  metadata checked against the paper's landing page, Crossref or arXiv. Add the
  entry there, then cite with `<a data-ref="key">`; never write a reference by hand.
- **Use the names the field uses** — NPLM, RNN, LSTM, seq2seq, Transformer — in
  titles, not descriptions such as "recurrence".
- **No invented results.** Visualizations compute with small random weights and
  say so. Numbers quoted from papers are cited. Ablation results appear only once
  they have been run.
- **Canvas is authoritative** for slides, homework, deadlines, assessment and the
  reading list. This site does not publish weightings or dates.
- **External demos load only on click.** Several download hundreds of megabytes.

Embedded demos belong to their authors and are loaded from their own sites.
