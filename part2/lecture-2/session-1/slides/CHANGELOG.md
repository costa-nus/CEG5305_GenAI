# Changelog — Part 2, Lecture 2, Session 01 slides

The version shown on slide 1 is `YYYY.MM.DDvN`. The newest version is at the top. A version
marked *not yet published* is still being edited and becomes final when it is pushed; its
number is the date of that push.

## 2026.10.14v2

- Slide 70: R(s1) and R(s2) are boxes the lecturer fills in with the class averages of poll 1; slides 76 and
  77 show the same values. The values are kept in the browser.
- Slide 79: the hypothesis "Pairwise comparison is more reliable (higher agreement) than rating."
- New slide 80, Chatbot Arena: its evaluation view and its win rates between models, from Chiang et al. (2024).
  Later slide numbers move up by one.
- New slides 137–139, the end of Part C: a homework for practice, with no credit. Design an instruction and a
  preference dataset, and train a chat model with DPO to answer in a given format or to follow your taste in
  restaurants (code: `part2/lecture-2/code/dpo_base.py`). Later slide numbers move up by 3.
- Part D now says that the homework slides show what the homework will be like and are not final; in Part B, one of
  R1–R3 may be replaced by a practice homework, marked at the same standard.
- Slides 69 and 79 (the two class polls): a pink checklist of the lecturer's steps, so that each result is shown at
  the right time.
- Part D, the homework (Assignment 3, for credit), is in the deck: slides 143–151. It shows the three phases (about
  10 days each for Parts A and B), how the homework is marked, example questions for Part A (the official questions
  come on Canvas), what to submit for each step of Part B with two rules for the report, and R1–R3 (R2 with an example
  of the practice table).
- Slide 16: "obeys" is now "follows" in the text.
- Slide 16: the title now reads "(2) Post-training makes LLMs follow instructions/rules".
- Slide 8: the labels now read "Base model (GPT)" and "Chat (instruct) model (ChatGPT)", in the chart and in the key.
- New slide 2, "About these slides": how these slides were made (with the help of AI tools, checked by
  Junyuan Hong), the reference slides they draw on, and the key papers. Every later slide number moves up by one.
- Slide 5 (where post-training fits) is now titled "GPT → ChatGPT by post-training".
- New slide 21, AI safety: a graphic about OpenAI's July 2026 sandbox incident, with a source line that corrects it
  (the quote it gives Sam Altman is in no report) and states what OpenAI said happened. Later slide numbers move up by one.

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
