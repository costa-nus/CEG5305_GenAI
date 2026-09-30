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
