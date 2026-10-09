# Changelog — Part 2, Lecture 1, Session 02 slides

The version shown on slide 1 is `YYYY.MM.DDvN`. The newest version is at the top. A version
marked *not yet published* is still being edited and becomes final when it is pushed; its
number is the date of that push.

## 2026.10.09v1

First published version, for the class of 7 Oct 2026: 173 slides. Earlier drafts (91 slides on
5 Oct, 122 slides on 6 Oct) were not published.

**Structure**

- Opening (slides 1–6) · Why do LLMs work so well? A recap of session 01, a timeline of scaling
  from the Transformer to agents (with two videos: GPT-4 in Blender in 2023, from 4:32, and an
  agent-built house in 2026), MMLU scores against training compute, and the outline.
- Part A (7–50) · How do we train a bigger model on more data? From text to the next-token loss
  (tokenizer, targets shifted by one, cross entropy, average loss, gradients). One nanoGPT
  training loop inside GPU memory, step by step, and the four persistent states (16 bytes per
  parameter) and 6ND FLOPs. Why one GPU stops scaling: a class question on which models fit an
  80 GB H100, batch size and training days, gradient accumulation, and the memory and time limits
  of a 70B model on 1T tokens. How to distribute the work and reduce its memory: tensor, pipeline
  and data parallelism, communication, mixed precision, and their combined effect (98 years on one
  GPU against 17.5 days on 2,048). Answer and summary.
- Part B (52–113) · The scaling law: how to scale effectively? Follows Stanford CS336, Lecture 9
  (Hashimoto, 2026): the history of scaling laws, data scaling laws and their theory, scaling laws
  for model engineering (architecture, optimizer, depth and width, batch size, learning rate),
  joint model-data scaling and Chinchilla's three methods. Summary.
- Part C (115–169) · Emergent capabilities and efficient adaptation. Follows Stanford CS224N,
  Lecture 9 (Yang, 2026): zero-shot and few-shot abilities in GPT, GPT-2 and GPT-3, prompting and
  its limits with a GPT-2 demo, chain-of-thought and zero-shot chain-of-thought, prompt sensitivity
  and prompt injection; then parameter-efficient fine-tuning: LoRA, prefix tuning, prompt tuning
  and a unifying view. Summary.
- Close (170–173) · Practice homework (adapt one model in four ways; optional, no course credit),
  the session summary, and a preview of Lecture 2.

**Lecture notes**

- The lecture page (`../index.html`) follows this deck section by section, in plain English, with
  every term defined where it first appears, worked calculations, and exercises with answers.

**Credits**

- References are in APA at the foot of each slide. Figures from papers are credited on their
  slides; sources and licences of the paper figures are in `assets/img/p2l1/CREDITS.md`.
- Parts B and C use figures from the slides of Stanford CS336, Lecture 9, and Stanford CS224N,
  Lecture 9, credited on the divider slide of each part.
- H100 photo: Geekerwan, CC BY 3.0. Cluster photo: Patrick Kennedy, ServeTheHome (2025). Comics:
  xkcd, CC BY-NC 2.5.
