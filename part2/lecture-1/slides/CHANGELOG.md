# Changelog — Part 2, Lecture 1, Session 01 slides

The version shown on slide 1 is `YYYY.MM.DDvN`. The newest version is at the top. A version
marked *not yet published* is still being edited and becomes final when it is pushed.

## 2026.10.01v1 — published 1 Oct 2026

71 slides. Training is now explained before the parts that depend on it.

- New slide 22, *Training: gradient descent and backpropagation*, after the NPLM. It gives the
  loss, the update rule and the chain rule, with two interactive panels: gradient descent on one
  weight (try a learning rate that is too large), and the size of the gradient that reaches each
  of 12 layers (vanishing and exploding gradients).
- Part B: the objective (*What is it actually trained to do?*) and *The loss: predict every next
  token* now come right after *nanoGPT in one diagram*, before C1, instead of after C6.
- C3 (MLP): the key line now says why GELU is used. A new *Slopes* button shows that ReLU's slope
  is 0 for every negative input, while GELU's is small but not 0, so gradients still pass. The
  side panel adds where GELU comes from (Hendrycks & Gimpel, 2016; GPT-1; BERT).
- C4 (residuals) and C5 (LayerNorm): the key lines now say what each does for training, and link
  back to slide 22.
- The lecture page has the same changes: a new section *How neural models learn*, and the
  objective moved before C1.

## 2026.09.30v1 — published 30 Sep 2026

First published version of the deck: 70 slides, for the class of 30 Sep 2026.

**Structure**

- Opening: a recap of Part 1, a look ahead at Part 2, the outline, today's question
  (architecture or scale?), and the record of published scores against compute.
- Part A · History of language models: three models side by side (n-gram, LSTM, GPT-2); from
  counting to the Transformer; Transformers beyond language.
- Part B · What makes Transformers great: the ConvNeXt experiment; the six components of
  nanoGPT, one slide each; the next-token loss; a one-table summary of the six parts.
- Part C · Break a GPT: an ablation of a small GPT, the results, how to read an ablation, and
  the practice homework.

**Interactive pieces**

- Jump links from the outline and part openers to each part and segment, and an overview
  (press O) grouped by part and segment.
- Step-by-step controls on the timeline, the handwriting demo, the seq2seq decoder, the
  n-gram table (with a log-scale switch) and the residual plot.
- A feedback button on every slide that opens a pre-filled GitHub issue for that slide.

**Data and credits**

- Ablation results and training curves are from our own runs of `../code/ablation_base.py`
  (27 Sep 2026 on a Colab T4 GPU; 29 Sep 2026 on a laptop CPU).
- Example images and their licences are listed in `../../../assets/img/p2l1/CREDITS.md`.
