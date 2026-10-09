# Image credits (assets/img/p2l1)

Used by the "Transformers beyond language" sketches (`assets/js/p2l1/history.js` → `beyondArch`).
Retrieved 30 Sep 2026.

| File | Source | Licence | What was done |
|---|---|---|---|
| `vit_eagle.jpg` | Bald eagle, U.S. Fish and Wildlife Service, Pacific Region, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:USFWS_bald_eagle_(23770875811).jpg) | Public domain (US federal work) | Cropped square, resized to 192 px |
| `dit_sample.jpg` | Top-left image of `visuals/sample_grid_0.png` in [facebookresearch/DiT](https://github.com/facebookresearch/DiT) — a DiT-XL/2 sample (Peebles & Xie, 2023) | CC BY-NC 4.0 (the repository's `LICENSE.txt`) | Cropped, resized to 192 px |
| `dit_noise.jpg` | Generated here: Gaussian noise, seed 5305 | — | — |
| `muybridge_1.jpg` … `_3.jpg` | Eadweard Muybridge, *The Horse in Motion* (1878), frames 1–3; Library of Congress, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Horse_in_Motion_high_res.jpg) | Public domain | Cropped, resized to 174 px |

The ubiquitin trace is drawn in code from the Cα coordinates of [PDB 1UBQ](https://www.rcsb.org/structure/1UBQ)
(Vijay-Kumar, Bugg & Cook, 1987), projected onto its two main axes. PDB data are CC0.

The Whisper panel's waveform and log-Mel frames are drawn in code (`SPEECH` in `history.js`) from
Neil Armstrong's "That's one small step for man" (Apollo 11, 20 Jul 1969; NASA, public domain), 15.6–18.4 s
of [File:Neil Armstrong small step.wav](https://commons.wikimedia.org/wiki/File:Neil_Armstrong_small_step.wav)
on Wikimedia Commons, resampled to 16 kHz; 25 ms windows, 10 ms hop, 16 mel bands, 40 dB range. No audio
file is published. (A 30 Sep draft used a macOS `say` voice instead; replaced because the macOS licence
does not allow publishing System Voice output.)

The handwriting stepper (`HELLO` and `penSteps` in `history.js`) uses the pen path of "hello" from the
Hershey Script 1-stroke font (`svg_fonts/HersheyScript1.svg` of the npm package `hersheytext` 2.0.0,
retrieved 30 Sep 2026), converted to point lists. Acknowledgements required by its licence:
The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National
Bureau of Standards. The format of the Font data in this distribution was originally created by
James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821.

## Figures from their sources (session 02 slides 9 and 11), added 4 Oct 2026

Used as published; the paper figure is rendered at 300 dpi from the arXiv PDF and cropped to one panel.
Slide numbers in this file are those of the session 02 deck as rebuilt on 6 Oct 2026 (122 slides);
they were checked against the deck's `img src` attributes that day.

| File | Source | Licence | What was done |
|---|---|---|---|
| `hoffmann2022_fig4_left.png` | Hoffmann et al. (2022), *Training compute-optimal large language models*, [arXiv:2203.15556](https://arxiv.org/abs/2203.15556) v1, Figure 4, left panel ("IsoLoss contours") | arXiv non-exclusive distribution licence: no reuse licence is granted | Left panel cropped |
| `openai2024_o1_compute.png` | OpenAI (2024), *Learning to reason with LLMs*, 12 Sep 2024, [openai.com](https://openai.com/index/learning-to-reason-with-llms/), the first figure ("o1 performance smoothly improves with both train-time and test-time compute"); the light-theme file `compute.png` from the page, downloaded 4 Oct 2026 | No licence stated (OpenAI's terms; all rights reserved) | None |
| `brown2024_fig2_left.png` | Brown et al. (2024), arXiv:2407.21787, Fig. 2, left panel | CC BY 4.0 | Not used since 4 Oct 2026 (slide 11 now shows OpenAI's figure); leave out of the push |

## Figures from their sources (session 02, redesign of 5 Oct 2026)

Each is rendered at 300 dpi from the paper's arXiv PDF and cropped to the figure, with nothing
redrawn or relabelled. Licences are those shown on each arXiv listing on 5 Oct 2026.
"arXiv non-exclusive" grants arXiv the right to distribute and grants no reuse licence: whether
these stay on the public site is Junyuan Hong's decision (D29 in the Part 2 PROGRESS.md).

| File | Source | Licence | Slide | What was done |
|---|---|---|---|---|
| `kaplan2020_fig1.png` | Kaplan et al. (2020), *Scaling laws for neural language models*, [arXiv:2001.08361](https://arxiv.org/abs/2001.08361), Figure 1 | arXiv non-exclusive | 60 | Whole figure |
| `hoffmann2022_fig3.png` | Hoffmann et al. (2022), [arXiv:2203.15556](https://arxiv.org/abs/2203.15556) v1, Figure 3 ("IsoFLOP curves") | arXiv non-exclusive | 66 | Whole figure |
| `hoffmann2022_fig1.png` | Hoffmann et al. (2022), same paper, Figure 1 ("Overlaid predictions") | arXiv non-exclusive | 70 | Whole figure |
| `openai2023_fig1.png` | OpenAI (2023), *GPT-4 technical report*, [arXiv:2303.08774](https://arxiv.org/abs/2303.08774), Figure 1 | arXiv non-exclusive | 77 | Whole figure |
| `grattafiori2024_fig2_3.png` | Grattafiori et al. (2024), *The Llama 3 herd of models*, [arXiv:2407.21783](https://arxiv.org/abs/2407.21783), Figures 2 and 3 (side by side on the page) | arXiv non-exclusive | — | Both figures, captions left out. Not used since 6 Oct 2026 (Figures 2 and 4 are now separate files, below); leave out of the push |
| `wei2022_fig2.png` | Wei et al. (2022), *Emergent abilities of large language models*, [arXiv:2206.07682](https://arxiv.org/abs/2206.07682), Figure 2 | CC BY 4.0 | 83 | Whole figure. Since 6 Oct 2026 the slide draws orange vertical lines over it, one per panel at 2.2 × 10²⁰ FLOPs (the nanoGPT run), as an SVG on the slide; the PNG is unchanged. The source line says "orange lines added here", as CC BY asks when a work is changed |
| `brown2020_fig1_2.png` | Brown et al. (2020), *Language models are few-shot learners*, [arXiv:2005.14165](https://arxiv.org/abs/2005.14165), Figure 1.2 | arXiv non-exclusive | 87 | Whole figure |
| `schaeffer2023_fig3.png` | Schaeffer et al. (2023), *Are emergent abilities of large language models a mirage?*, [arXiv:2304.15004](https://arxiv.org/abs/2304.15004), Figure 3 | CC BY-NC-ND 4.0 | 85 | Whole figure, unaltered (the licence allows no derivatives) |
| `lester2021_fig1.png` | Lester et al. (2021), *The power of scale for parameter-efficient prompt tuning*, [arXiv:2104.08691](https://arxiv.org/abs/2104.08691), Figure 1 | arXiv non-exclusive | 91 | Whole figure |

`hoffmann2022_fig4_left.png` and `openai2024_o1_compute.png` (above) are on slides 9 and 11.

## Figures from their sources (session 02, rebuild of 6 Oct 2026)

Added by the rebuild of 6 Oct 2026. As above, each is rendered at 300 dpi from the paper's arXiv
PDF and cropped, with nothing redrawn or relabelled. Licences are as each builder recorded them:
read from the arXiv listing on 6 Oct 2026, except Kaplan et al. and Hoffmann et al. (carried over
from the 5 Oct 2026 rows above) and Grattafiori et al. (no date recorded; the same licence as the
5 Oct row). The same D29 decision applies to the arXiv non-exclusive ones.

| File | Source | Licence | Slide | What was done |
|---|---|---|---|---|
| `kaplan2020_fig5.png` | Kaplan et al. (2020), [arXiv:2001.08361](https://arxiv.org/abs/2001.08361) v1, Figure 5 (p. 8) | arXiv non-exclusive | 62 | Whole figure |
| `kaplan2020_fig3.png` | Kaplan et al. (2020), same paper, Figure 3 (p. 4) | arXiv non-exclusive | 63 | Whole figure |
| `hoffmann2022_figA1_lr_loss.png` | Hoffmann et al. (2022), [arXiv:2203.15556](https://arxiv.org/abs/2203.15556) v1, Figure A1 ("Grid over cosine cycle length"), top row (p. 23) | arXiv non-exclusive | 65 | Top row, first two panels; the legend (in panel 3) is retyped on the slide under the figure |
| `grattafiori2024_fig2.png` | Grattafiori et al. (2024), *The Llama 3 herd of models*, [arXiv:2407.21783](https://arxiv.org/abs/2407.21783), Figure 2 | arXiv non-exclusive | 75 | Figure 2 alone, caption left out |
| `grattafiori2024_fig4.png` | Grattafiori et al. (2024), same paper, Figure 4 | arXiv non-exclusive | 77 | Both panels, caption left out |
| `sardana2024_fig1.png` | Sardana et al. (2024), *Beyond Chinchilla-optimal: Accounting for inference in language model scaling laws*, [arXiv:2401.00448](https://arxiv.org/abs/2401.00448) v3, Figure 1 | arXiv non-exclusive | 78 | Three panels, caption and (a)–(c) labels left out |
| `wei2022_fig4_ppl.png` | Wei et al. (2022), [arXiv:2206.07682](https://arxiv.org/abs/2206.07682), Figure 4, top centre panel | CC BY 4.0 | 84 | Panel cropped |
| `wei2022_fig4_mmlu.png` | Wei et al. (2022), same figure, bottom left panel | CC BY 4.0 | 84 | Panel cropped |
| `wei2022_fig4_legend.png` | Wei et al. (2022), same figure, legend | CC BY 4.0 | 84 | Legend cropped |
| `schaeffer2023_fig2.png` | Schaeffer et al. (2023), [arXiv:2304.15004](https://arxiv.org/abs/2304.15004), Figure 2 | CC BY-NC-ND 4.0 | 86 | Whole figure, unaltered, caption left out (the licence allows no derivatives) |
| `lu2022_fig1_sst2.png` | Lu et al. (2022), *Fantastically ordered prompts and where to find them*, [arXiv:2104.08786](https://arxiv.org/abs/2104.08786), Figure 1, top panel | CC BY 4.0 | 88 | Panel cropped; shown beside the bottom panel |
| `lu2022_fig1_subj.png` | Lu et al. (2022), same figure, bottom panel | CC BY 4.0 | 88 | Panel cropped |
| `liu2022_tfew_fig3.png` | Liu et al. (2022), *Few-shot parameter-efficient fine-tuning is better and cheaper than in-context learning*, [arXiv:2205.05638](https://arxiv.org/abs/2205.05638), Figure 3 | CC BY 4.0 | 89 | Whole figure with legend, caption left out |
| `hu2022_fig1.png` | Hu et al. (2022), *LoRA: Low-rank adaptation of large language models*, [arXiv:2106.09685](https://arxiv.org/abs/2106.09685) v2, Figure 1 (p. 1) | arXiv non-exclusive | 95 | Whole figure, caption left out |
| `qi2024_fig1.png` | Qi et al. (2024), *Fine-tuning aligned language models compromises safety, even when users do not intend to!*, [arXiv:2310.03693](https://arxiv.org/abs/2310.03693) v1, Figure 1 (p. 2) | arXiv non-exclusive | 104 | Whole figure, caption left out |
| `dettmers2023_fig1.png` | Dettmers et al. (2023), *QLoRA: Efficient finetuning of quantized LLMs*, [arXiv:2305.14314](https://arxiv.org/abs/2305.14314) v1, Figure 1 (p. 3) | CC BY 4.0 | 122 (More detail) | Whole figure, caption left out |

The legend crop of Hoffmann et al.'s Figure A1 (`hoffmann2022_figA1_legend.png`) stayed in the
build folder and is not in this directory.

## Loaded from other sites, not stored here (session 02)

The comics are by Randall Munroe, [xkcd.com](https://xkcd.com/), CC BY-NC 2.5. [xkcd's licence
page](https://xkcd.com/license.html) allows linking the image directly with a link back (read
5 Oct 2026); each comic slide links back to the comic's page. Numbers, titles and image files were
checked against each comic's `info.0.json` on 5 Oct 2026 (605, 1425, 1838) or 6 Oct 2026 (303, 1737).

| What | Source | Licence or terms | Slide |
|---|---|---|---|
| xkcd 1838 *Machine Learning* | [xkcd.com/1838](https://xkcd.com/1838/); `machine_learning_2x.png` from `imgs.xkcd.com` | CC BY-NC 2.5 | 14 |
| xkcd 303 *Compiling* | [xkcd.com/303](https://xkcd.com/303/); `compiling.png` from `imgs.xkcd.com` (there is no `_2x` file) | CC BY-NC 2.5 | 33 |
| xkcd 1737 *Datacenter Scale* | [xkcd.com/1737](https://xkcd.com/1737/); `datacenter_scale_2x.png` from `imgs.xkcd.com` | CC BY-NC 2.5 | 50 |
| xkcd 605 *Extrapolating* | [xkcd.com/605](https://xkcd.com/605/); `extrapolating.png` from `imgs.xkcd.com` | CC BY-NC 2.5 | 73 |
| xkcd 1425 *Tasks* | [xkcd.com/1425](https://xkcd.com/1425/); `tasks_2x.png` from `imgs.xkcd.com` | CC BY-NC 2.5 | 82 |
| House tour video and poster (the 2026 clip) | T. Ricouard, [Architectural visualization with Astra](https://developers.openai.com/blog/architectural-visualization-with-astra), OpenAI Developers blog, 4 Sep 2026; streamed from `cdn.openai.com` | OpenAI's terms; nothing copied | 6 |
| *GPT-4 Addon for Blender is HERE!* (the 2023 clip), from 4:32 | Stray Creations, YouTube, 28 Mar 2023, [youtube.com/watch?v=xhN7P7ENu4g](https://www.youtube.com/watch?v=xhN7P7ENu4g) (title and channel from YouTube's oEmbed, upload date from the watch page, checked 6 Oct 2026). Until pressed, the slide shows YouTube's thumbnail from `i.ytimg.com` and a link to the video; pressing plays it in YouTube's privacy-enhanced player (`youtube-nocookie.com`) | No licence recorded; YouTube's terms, through YouTube's own embedded player; nothing copied | 6 |

