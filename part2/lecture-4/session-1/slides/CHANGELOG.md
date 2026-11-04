# Changelog — Part 2 · Lecture 4 · Session 01 slides

Newest first. The version is shown on slide 1 and is set in the commit that publishes it.

## 2026.11.04v2

- Corrected five numbers and labels against the sources:
  - OpenVLA is trained on 970k robot episodes (was "~1M").
  - Removed "30–50 Hz" from the Fast, continuous control slides; neither Diffusion Policy nor VLASH states it.
  - Removed the 1.7B backbone and 1.5T-token line from the DeepStack ablation slide; it belongs to the vision-encoder ablation (Table 11).
  - DeepStack equations: the meaning line now uses the same symbols as the equations (M_k, S_V).
  - LLaVA In-the-Wild slide cites Table 5 only; the numbers shown come from that table.

## 2026.11.04v1

- First version of the deck: extending LLMs to large multi-modal models, in three parts, 111 slides.
- Part A, how LLMs learned to see, in three segments: multi-modality models before LLMs; vision-language models (embedding
  space alignment, Flamingo, BLIP and BLIP-2); the state of the art (Qwen-VL to Qwen3-VL). Added diagrams: the goal of
  embedding space alignment, one small diagram for each way to connect an encoder to an LLM, and the two problems that BLIP solves.
- Part B, make VLM chat: recap of Part A, LLaVA step by step (the instruction data, the architecture, two training stages,
  how it is tested), then the same steps in code with nanoVLM.
- Part C, advanced topics and today's state of the art: the Qwen3-VL recipe, one model for all modalities, computer-use
  agents, robot actions and world models, and safety.
- Close of Part 2: Topic 7 against the syllabus, Part 2 in one view, what is still open.
- Each part opener names the reference slides it follows. Slide 2 lists the reference slides and the key papers. Segment
  outline pages separate the segments of each part. There are no in-class questions and no homework.
