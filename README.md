# CEG5305 course site

Static site for **CEG5305 Introduction to Generative AI with Foundation Models**
(NUS, AY2026/27 Semester 1), served by GitHub Pages at
<https://costa-nus.github.io/CEG5305_GenAI/>.

Plain HTML, CSS and ES-module JavaScript. No build step and no dependencies
beyond KaTeX from a CDN.

```
index.html                    course home
part2/lecture-1/index.html    Part 2 · Lecture 1 — Architecture of LLMs
assets/css/site.css           shared styles, light and dark
assets/js/lib.js              SVG, matrix and seeded-random helpers
assets/js/demos.js            click-to-load embeds of external demo sites
assets/js/main.js             mounts every [data-viz] element on a page
assets/js/p2l1/history.js     n-gram, MLP, RNN, LSTM, seq2seq, chain vs fan
assets/js/p2l1/transformer.js architecture, attention, C1–C6, ConvNeXt, perplexity
```

## Run locally

ES modules do not load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000/>.

## Adding a visualization

Write a function `(root) => void` in a module under `assets/js/`, export it, and
put `<div data-viz="functionName"></div>` in the page. `main.js` finds and mounts
it; a failure shows an inline message instead of breaking the page.

## Content rules

- **Every diagram is drawn in HTML/SVG.** No figures copied from papers or other
  courses' slides. Where a diagram follows a paper's figure, the paper is cited
  under it.
- **No invented results.** Visualizations compute with small random weights and
  say so. Numbers quoted from papers are cited. Ablation results appear only once
  they have been run.
- **Canvas is authoritative** for slides, homework, deadlines, assessment and the
  reading list. This site does not publish weightings or dates.
- **External demos load only on click.** Several download hundreds of megabytes.

Embedded demos belong to their authors and are loaded from their own sites.
