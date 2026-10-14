# Changelog — Part 2, Lecture 2, Session 01 slides

The version shown on slide 1 is `YYYY.MM.DDvN`. The newest version is at the top. A version
marked *not yet published* is still being edited and becomes final when it is pushed; its
number is the date of that push.

## 2026.10.14v1

First version of the deck, for the class of 14 Oct 2026.

- Opening: a recap of Lecture 1 session 02. Today's question, "What turns GPT into ChatGPT?", shows a
  next-token model beside a ChatGPT chat, with a switch to the code behind each. Then where post-training
  fits in the life of an LLM (with GPT-4's dates and three scaling stages), and the outline of both sessions.
- Part A · Why we need post-training. (1) What post-training brings: a base model continues text, a chat
  model answers (with a live demo of GPT-2 before and after instruction tuning); post-training makes models
  easy to use, makes them obey rules, makes them think to solve hard problems, and makes them act in the
  digital world. (2) History, from the Transformer (2017) to agents (2025), and post-training from its early
  days (InstructGPT, 2022) to more rounds with less human data. (3) Why it matters: three views, from
  "1.3B beats 175B" to test-time scaling and agents.
- Part B · How to do post-training: a map of how the methods connect, then instruction tuning and its loss
  mask; learning from human preferences, with two class polls (rate three summaries; ratings against
  comparisons); policy gradients and PPO; the reward model (Bradley–Terry); RLHF and its three kinds of data;
  InstructGPT and ChatGPT; the limits of RL and reward models (the KL penalty derived from the objective,
  reward hacking, over-optimisation); DPO and GRPO, with worked check-ins; and where the labels come from.
- Part C · What post-training enables: four abilities (think, then answer; call a program; act in a loop;
  refuse harm), one real example of each, then how each is trained, with its objective and data
  (DeepSeek-R1, Toolformer, TMax, Constitutional AI), and one training step for each, shown step by step from
  the data to the reward and the loss.
- Each part shows its outline again before each of its segments, with the coming segment highlighted.
- Two breaks; the close, which answers today's question; and the next session, with the title of its
  invited talk, "Scaling synthetic data and environments" (Zeyu Qin).
