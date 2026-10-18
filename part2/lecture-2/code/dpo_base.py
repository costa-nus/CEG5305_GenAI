#!/usr/bin/env python3
"""
CEG5305 Part 2, Lecture 2 session 01: base code for the DPO practice homework (no credit).

One chat model (Qwen2.5-0.5B-Instruct, the SFT model) learns a preference from pairs
(prompt, chosen, rejected) with the DPO loss of Part B. The model with no change is the frozen
reference pi_ref. The policy pi_theta is the same model plus a LoRA update on the query and value
projections (the LoRA code of Lecture 1, session 02). Only the LoRA update is trained. There is
no second copy of the model: pi_ref is the policy with its LoRA layers switched off.

Run it on Colab (T4 runtime): Runtime -> Change runtime type -> T4 GPU.

    python dpo_base.py --selfcheck                            # first: checks of your setup, PASS or FAIL
    python dpo_base.py --task format                          # zero: the instruction only, no training
    python dpo_base.py --task format --method dpo             # train LoRA with DPO, 3 seeds
    python dpo_base.py --task restaurant
    python dpo_base.py --task restaurant --method dpo
    python dpo_base.py --task restaurant --method dpo --data my_prefs.jsonl --instruction @my_instruction.txt
    python dpo_base.py --task restaurant --method dpo --beta 0.5     # one change at a time
    python dpo_base.py --task format --method dpo --sft 1            # DPO plus an SFT loss on chosen (see below)
    python dpo_base.py --task format --method dpo --steps 5 --seeds 1     # only to test that it runs

The two tasks. The pairs in EXAMPLES below are examples only: write your own.
    format      The model answers in this QA format. It is the text of a chat reply, not code;
                nothing is run:
                input = "<question>", Tool = <a tool name>, tool_result = Tool(), answer = LLM(input, tool_result), print(answer) -> <answer>
                Chosen: a reply in this format. Rejected: a normal chat reply to the same question.
    restaurant  Your own preference over restaurants (the example: quiet, vegetarian, under S$20).
                Chosen: a recommendation that fits it. Rejected: one that does not. Use new places
                in your test pairs: did the model learn the preference, or only the names?

Your homework: design an instruction and a preference dataset for one task. Keep some prompts for
the test. Write your predictions before you run anything: how often does the model answer as you
prefer with the instruction alone (zero), and after DPO? Change one thing at a time (the
instruction, the pairs, --beta, the steps), keep the 3 seeds, and compare differences with the
spread across seeds. Report which predictions failed, and why.

Your data: a JSONL file, one pair per line:
    {"prompt": "...", "chosen": "...", "rejected": "...", "want": "...", "avoid": "..."}
"want" and "avoid" are optional. The restaurant score uses them: a reply passes if it contains
"want" and contains it before "avoid". Use a word that only that place has, such as the first word
of its name: the model may write "Café" for "Cafe". The last 25% of the lines are the test pairs,
or put the test pairs in a second file (--test my_test.jsonl). The instruction is the system
message of the chat: give yours with --instruction "..." or, if it contains double quotes, put it
in a file and give --instruction @my_instruction.txt. `--selfcheck --data my_prefs.jsonl` also
checks your file.

What is measured on the test pairs, before training and after:
    pref acc    the fraction of pairs with log pi(chosen|x) > log pi(rejected|x), for the model
                alone. A long reply has a lower log-probability than a short one, so this can stay
                low when the model has learned the format. This is why DPO compares with pi_ref.
    reward acc  (after DPO only) the fraction of pairs where the implicit reward
                beta * log(pi_theta / pi_ref) of chosen is higher than that of rejected.
    score       greedy replies (at most 64 new tokens) to the test prompts, checked by score():
                a regular expression for format (it checks the format, not if the answer is
                right); "want" and "avoid" for restaurant. Edit score() for your own task. The
                replies are in the JSON file: read them.
Each run writes a JSON file (--out) with the settings, the measures before training and after
(per seed), the replies, the trainable parameters, the seconds, the peak memory and, at every
training step, the DPO loss, the mean reward margin, the reward accuracy and the negative
log-likelihood per token of the chosen replies, on the batch ("curves").

One more knob, --sft W: add W times the SFT loss on the chosen replies to the DPO loss (default 0,
pure DPO). DPO only asks that chosen gains on rejected; it can lower the probability of chosen too.
Watch "chosen NLL per token" in the log: if it rises, the model is moving away from your chosen replies.

Requires `pip install torch transformers` (Colab has both); no account needed. The first run
downloads the model (about 1 GB). Everything is computed in 32-bit floats.
Run time per seed on a T4: TO BE MEASURED ON COLAB.
"""
import argparse, gc, json, math, platform, random, re, time
from collections import Counter
from contextlib import contextmanager

import torch
import torch.nn as nn
from torch.nn import functional as F

# ── held fixed for every run; change one of them only if it is your question ──
FIXED = dict(
    model="Qwen/Qwen2.5-0.5B-Instruct",   # the SFT model: pi_ref, and the start of the policy pi_theta
    test_part=0.25,        # without --test: the last 25% of the pairs are the test pairs
    steps=60,              # DPO training steps (--steps to change it for a quick test)
    batch=4,               # pairs per training step (all of them when there are fewer)
    lr=1e-4,               # AdamW learning rate, constant. 5e-4 over-fitted the 9 example pairs (replies broke down); no full search
    clip=1.0,              # gradient-norm clipping
    lora_alpha=16,         # LoRA scale is alpha / r; alpha stays fixed, so the scale changes with the rank
    max_new_tokens=64,     # length limit of a greedy reply in the evaluation
    eval_batch=16,         # replies per forward pass when log-probabilities are computed
    seeds=[1337, 1338, 1339],
)


# ── EXAMPLES: write your own. They are here so that the code runs at once. ──
def _trace(question, tool, answer):
    return f'input = "{question}", Tool = {tool}, tool_result = Tool(), answer = LLM(input, tool_result), print(answer) -> {answer}'


_QA = [  # question, tool, answer, a normal chat reply
    ("What is the capital of France?", "search", "Paris", "The capital of France is Paris."),
    ("What is 17 times 23?", "calculator", "391", "17 times 23 is 391."),
    ("What day of the week was 1 January 2000?", "calendar", "Saturday", "1 January 2000 was a Saturday."),
    ("Who wrote Pride and Prejudice?", "search", "Jane Austen", "Pride and Prejudice was written by Jane Austen."),
    ("What is the square root of 144?", "calculator", "12", "The square root of 144 is 12."),
    ("How many days does February 2028 have?", "calendar", "29", "February 2028 has 29 days, because 2028 is a leap year."),
    ("At what temperature does water boil at sea level, in Celsius?", "search", "100", "Water boils at 100 degrees Celsius at sea level."),
    ("What is 15% of 80?", "calculator", "12", "15% of 80 is 12."),
    ("Which planet is the largest in the Solar System?", "search", "Jupiter", "Jupiter is the largest planet in the Solar System."),
    # the last 3 are the test pairs
    ("What is 250 divided by 4?", "calculator", "62.5", "250 divided by 4 is 62.5."),
    ("What is the chemical symbol for gold?", "search", "Au", "The chemical symbol for gold is Au."),
    ("What is the date one week after 25 December 2026?", "calendar", "1 January 2027", "One week after 25 December 2026 is 1 January 2027."),
]

# The example preference: quiet, vegetarian, under S$20 a person. All restaurant names are invented.
# The test pairs (the last 3) use places that are not in the training pairs.
_PLACES = [  # place A, place B, which one fits the preference
    ("Fern & Pebble (quiet, vegetarian menu, about S$14 a person)", "Blazebell Grill (loud music, steak and ribs, about S$38 a person)", "A"),
    ("Rumbledrum Diner (loud, burgers, about S$18 a person)", "Mossleaf Kitchen (quiet, vegetarian menu, about S$16 a person)", "B"),
    ("Saffron Hush (quiet, vegetarian menu, about S$27 a person)", "Willowstep Cafe (quiet, vegetarian menu, about S$15 a person)", "B"),
    ("Tinbell Noodle Bar (quiet, vegetarian menu, about S$12 a person)", "Clatterbox Food Hall (noisy, vegetarian stalls, about S$9 a person)", "A"),
    ("Quillwood Garden (quiet, vegetarian menu, about S$19 a person)", "Harbor Ox Steakhouse (quiet, steak and seafood, about S$45 a person)", "A"),
    ("Drumfire Karaoke Kitchen (karaoke rooms, mixed menu, about S$22 a person)", "Pebblemint Bowl (quiet, vegetarian menu, about S$13 a person)", "B"),
    ("Lanternmoss Tea House (quiet, vegetarian menu, about S$17 a person)", "Brassbeat Bistro (live band, chicken and fish, about S$19 a person)", "A"),
    ("Velvetfern (quiet, vegetarian tasting menu, about S$60 a person)", "Hollowreed Cafe (quiet, vegetarian menu, about S$18 a person)", "B"),
    ("Sizzlecrank Wok (loud, seafood, about S$16 a person)", "Stillwater Greens (quiet, vegetarian menu, about S$15 a person)", "B"),
    # the last 3 are the test pairs: new places
    ("Cloudberry Nook (quiet, vegetarian menu, about S$16 a person)", "Thunderpan Grill (loud, grilled meat, about S$32 a person)", "A"),
    ("Bellowbox Bar (loud, bar snacks and wings, about S$20 a person)", "Hushgrove Kitchen (quiet, vegetarian menu, about S$14 a person)", "B"),
    ("Ivyslate Bistro (quiet, vegetarian menu, about S$35 a person)", "Dewpetal Cafe (quiet, vegetarian menu, about S$17 a person)", "B"),
]


def _restaurant_pair(a, b, good):
    name = lambda s: s.split(" (")[0]
    why = lambda s: s.split(" (")[1].rstrip(")")
    yes, no = (a, b) if good == "A" else (b, a)
    return {"prompt": f"Which place do you recommend for dinner tonight?\nA: {a}\nB: {b}",
            "chosen": f"I recommend {name(yes)}: {why(yes)}.",
            "rejected": f"I recommend {name(no)}: {why(no)}.",
            "want": name(yes).split()[0], "avoid": name(no).split()[0]}     # the first word of each name


EXAMPLES = {
    "format": dict(
        instruction='Answer on one line in exactly this format: input = "<question>", Tool = <a tool name>, '
                    'tool_result = Tool(), answer = LLM(input, tool_result), print(answer) -> <answer>',
        pairs=[{"prompt": q, "chosen": _trace(q, t, ans), "rejected": chat} for q, t, ans, chat in _QA]),
    "restaurant": dict(
        instruction="You are a restaurant guide. Recommend one of the places in one sentence.",   # the preference is NOT stated
        pairs=[_restaurant_pair(a, b, good) for a, b, good in _PLACES]),
}

# the format of task 1, on one line and with nothing else in the reply
FORMAT = re.compile(r'input\s*=\s*"[^"\n]+",\s*Tool\s*=\s*\w+,\s*tool_result\s*=\s*Tool\(\),\s*'
                    r'answer\s*=\s*LLM\(input,\s*tool_result\),\s*print\(answer\)\s*->\s*\S[^\n]*')


def score(text, task, pair):
    """1 if a reply is as you prefer, 0 if not, None if this pair cannot be scored. Edit it for your task."""
    if task == "format":
        return int(FORMAT.fullmatch(text.strip()) is not None)
    want, avoid = pair.get("want"), pair.get("avoid")       # restaurant: the reply names "want", before "avoid"
    if not want:
        return None
    t = text.lower()
    i, j = t.find(want.lower()), (t.find(avoid.lower()) if avoid else -1)
    return int(i >= 0 and (j < 0 or i < j))


DEV = "cuda" if torch.cuda.is_available() else "cpu"
GB = 1e9


def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def get_data(a):
    """The training pairs, the test pairs and the instruction."""
    ex = EXAMPLES[a.task]
    pairs = read_jsonl(a.data) if a.data else ex["pairs"]
    instruction = a.instruction if a.instruction is not None else ex["instruction"]
    if instruction.startswith("@"):                              # --instruction @my_instruction.txt
        with open(instruction[1:], encoding="utf-8") as f:
            instruction = f.read().strip()
    if a.data and a.instruction is None:
        print(f"no --instruction: the example instruction of --task {a.task} is used: {instruction!r}")
    if a.test:
        return pairs, read_jsonl(a.test), instruction
    k = max(1, round(len(pairs) * FIXED["test_part"]))
    return pairs[:-k], pairs[-k:], instruction


def bad_pairs(pairs):
    """Problems in the data: a missing or empty field, or chosen equal to rejected."""
    out = []
    for i, p in enumerate(pairs):
        miss = [k for k in ("prompt", "chosen", "rejected") if not isinstance(p.get(k), str) or not p[k].strip()]
        if miss:
            out.append(f"pair {i}: no {', '.join(miss)}")
        elif p["chosen"].strip() == p["rejected"].strip():
            out.append(f"pair {i}: chosen and rejected are the same")
    return out


def load(name):
    """Tokenizer and model, in 32-bit floats (a T4 has no fast bfloat16 arithmetic)."""
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModelForCausalLM.from_pretrained(name).float().to(DEV)
    return tok, model


def messages(instruction, prompt):
    return ([{"role": "system", "content": instruction}] if instruction else []) + [{"role": "user", "content": prompt}]


def chat_prompt(tok, instruction, prompt):
    """The prompt x: the instruction (system message) and the question, in the model's chat template,
    up to the start of the assistant's reply."""
    return tok.apply_chat_template(messages(instruction, prompt), tokenize=False, add_generation_prompt=True)


def encode(tok, instruction, prompt, reply):
    """Token ids of the prompt x, and of the reply y: the assistant text and the end-of-turn token,
    as the chat template writes them. The model must learn to stop, so the end token is part of y."""
    x = chat_prompt(tok, instruction, prompt)
    full = tok.apply_chat_template(messages(instruction, prompt) + [{"role": "assistant", "content": reply}], tokenize=False)
    y = full[len(x):].rstrip("\n") if full.startswith(x) else reply + tok.eos_token
    return tok(x, add_special_tokens=False)["input_ids"], tok(y, add_special_tokens=False)["input_ids"]


class LoRALinear(nn.Module):
    """h = W0 x + (alpha / r) * B A x, with W0 frozen (Hu et al., 2022).
    A starts random and B at zero, so before training the layer computes exactly W0 x.
    If the original layer has a bias, it stays inside `base` and stays frozen.
    When `on` is False the layer computes W0 x only: this is how pi_ref is computed."""

    def __init__(self, base, r, alpha):
        super().__init__()
        self.base = base                                             # W0 (frozen in add_lora)
        self.A = nn.Parameter(torch.empty(r, base.in_features))      # r x d_in
        self.B = nn.Parameter(torch.zeros(base.out_features, r))     # d_out x r
        nn.init.kaiming_uniform_(self.A, a=math.sqrt(5))             # the same init as the authors' code
        self.scale = alpha / r
        self.on = True

    def forward(self, x):
        if not self.on:
            return self.base(x)
        return self.base(x) + self.scale * (x @ self.A.T @ self.B.T)


def add_lora(model, r, alpha):
    """Freeze every weight, then add a LoRA update to the query and value projections of every
    attention layer, found by their names (q_proj, v_proj). Trainable parameters: r * (d_in + d_out)
    per adapted matrix."""
    for p in model.parameters():
        p.requires_grad = False
    found = [(name, m) for name, m in model.named_modules()
             if name.split(".")[-1] in ("q_proj", "v_proj") and isinstance(m, nn.Linear)]
    if not found:
        raise SystemExit("LoRA: this model has no linear layers named q_proj and v_proj, so there is nothing to adapt. "
                         "Use a model that names its attention projections this way (Qwen2.5, SmolLM2, Llama).")
    for name, m in found:
        parent, _, attr = name.rpartition(".")
        setattr(model.get_submodule(parent), attr, LoRALinear(m, r, alpha).to(m.weight.device))


def remove_lora(model):
    """Put the original layers back. They stay frozen and unchanged: the next seed starts from pi_ref."""
    for name, m in list(model.named_modules()):
        if isinstance(m, LoRALinear):
            parent, _, attr = name.rpartition(".")
            setattr(model.get_submodule(parent), attr, m.base)


@contextmanager
def lora_off(model):
    """Inside this block every LoRA layer computes W0 x only, so the model is pi_ref."""
    mods = [m for m in model.modules() if isinstance(m, LoRALinear)]
    for m in mods:
        m.on = False
    try:
        yield
    finally:
        for m in mods:
            m.on = True


def seq_logp(model, seqs):
    """log pi(y|x) for each (prompt ids, reply ids): the sum of the log-probabilities of the reply
    tokens only. The prompt tokens are masked out, as in the loss mask of SFT. Sequences are padded
    on the right; with causal attention, padding cannot change what is before it. Only the positions
    that predict a reply token go through the output layer, to save memory."""
    ids = [x + y for x, y in seqs]
    longest = max(len(i) for i in ids)
    inp = torch.tensor([i + [0] * (longest - len(i)) for i in ids], device=DEV)      # any token will do as padding
    rows, cols, targets = [], [], []
    for b, (x, y) in enumerate(seqs):
        rows += [b] * len(y)
        cols += range(len(x) - 1, len(x) + len(y) - 1)             # position t predicts token t + 1
        targets += y
    h = model.base_model(input_ids=inp, use_cache=False).last_hidden_state                # batch x length x d
    logits = model.get_output_embeddings()(h[rows, cols]).float()                           # reply tokens x vocabulary
    lp = torch.log_softmax(logits, -1).gather(1, torch.tensor(targets, device=DEV)[:, None])[:, 0]
    return torch.zeros(len(seqs), device=DEV).index_add(0, torch.tensor(rows, device=DEV), lp)


@torch.no_grad()
def logp_all(model, seqs):
    return torch.cat([seq_logp(model, seqs[i:i + FIXED["eval_batch"]]) for i in range(0, len(seqs), FIXED["eval_batch"])])


@torch.no_grad()
def ref_logps(model, enc):
    """log pi_ref(y_w|x) and log pi_ref(y_l|x) of every pair: the model with LoRA switched off.
    pi_ref never changes, so this is computed once, before training."""
    model.eval()
    with lora_off(model):
        return torch.stack([logp_all(model, [w for w, _ in enc]), logp_all(model, [l for _, l in enc])], 1)


def dpo_loss(pi_w, pi_l, ref_w, ref_l, beta):
    """The DPO loss of Part B, for a batch of pairs (y_w chosen, y_l rejected):
    -log sigmoid(beta * [(log pi_theta(y_w|x) - log pi_ref(y_w|x)) - (log pi_theta(y_l|x) - log pi_ref(y_l|x))]).
    beta * log(pi_theta(y|x) / pi_ref(y|x)) is the implicit reward of reply y. Returns the loss and the
    reward margin of each pair (implicit reward of y_w minus that of y_l)."""
    margin = beta * (pi_w - ref_w) - beta * (pi_l - ref_l)
    return -F.logsigmoid(margin).mean(), margin


def won(margin):
    """The fraction of pairs where chosen beats rejected. A tie (|margin| < 1e-4, for example every pair
    before training, where pi_theta = pi_ref) counts as half."""
    tie = margin.abs() < 1e-4
    return ((margin > 0) & ~tie).float().mean().item() + 0.5 * tie.float().mean().item()


def train(model, enc, ref, beta, lr, seed, steps, sft=0.0):
    """Minimise the DPO loss over the LoRA parameters. pi_ref is fixed (ref, computed before).
    With sft > 0, add sft * (the negative log-likelihood per token of the chosen replies): the SFT
    loss on y_w. Pure DPO can lower log pi(y_w|x) too, as long as log pi(y_l|x) falls faster."""
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=lr)
    rng = random.Random(seed)                    # the seed also fixes which pairs form each batch
    curve = {"step": [], "loss": [], "margin": [], "reward_acc": [], "chosen_nll": []}
    model.train()
    for s in range(steps):
        idx = rng.sample(range(len(enc)), min(FIXED["batch"], len(enc)))
        logp = seq_logp(model, [enc[i][0] for i in idx] + [enc[i][1] for i in idx])     # all chosen, then all rejected
        loss, margin = dpo_loss(logp[:len(idx)], logp[len(idx):], ref[idx, 0], ref[idx, 1], beta)
        nll = (-logp[:len(idx)] / torch.tensor([len(enc[i][0][1]) for i in idx], device=DEV)).mean()   # per token of y_w
        opt.zero_grad(set_to_none=True)
        (loss + sft * nll if sft else loss).backward()
        torch.nn.utils.clip_grad_norm_(params, FIXED["clip"])
        opt.step()
        curve["step"].append(s); curve["loss"].append(round(loss.item(), 4))
        curve["margin"].append(round(margin.mean().item(), 4)); curve["reward_acc"].append(round(won(margin), 3))
        curve["chosen_nll"].append(round(nll.item(), 4))
        if s % 10 == 0 or s == steps - 1:
            print(f"    step {s:4d}  DPO loss {loss.item():.3f}  reward margin {margin.mean().item():+.3f}  "
                  f"reward acc {won(margin):.2f}  chosen NLL per token {nll.item():.3f}", flush=True)
    return curve


@torch.no_grad()
def reply(model, tok, instruction, prompt):
    """The greedy reply to one prompt (no sampling), at most max_new_tokens tokens."""
    model.eval()
    x = tok(chat_prompt(tok, instruction, prompt), return_tensors="pt", add_special_tokens=False).to(DEV)
    out = model.generate(**x, max_new_tokens=FIXED["max_new_tokens"], do_sample=False, pad_token_id=tok.eos_token_id)
    return tok.decode(out[0, x["input_ids"].shape[1]:], skip_special_tokens=True).strip()


def evaluate(model, tok, test, enc, instruction, task, ref=None, beta=None):
    """On the test pairs: pref acc and the mean of log pi(y_w|x) - log pi(y_l|x) (the model alone);
    with ref, also the reward acc; then a greedy reply to every test prompt, checked by score()."""
    model.eval()
    w, l = logp_all(model, [e[0] for e in enc]), logp_all(model, [e[1] for e in enc])
    out = {"pref_acc": round(won(w - l), 3), "logp_margin": round((w - l).mean().item(), 3)}
    if ref is not None:
        _, margin = dpo_loss(w, l, ref[:, 0], ref[:, 1], beta)
        out["reward_acc"] = round(won(margin), 3)
        out["reward_margin"] = round(margin.mean().item(), 3)
    items = []
    for p, a, b in zip(test, w.tolist(), l.tolist()):
        text = reply(model, tok, instruction, p["prompt"])
        items.append({"prompt": p["prompt"], "reply": text, "score": score(text, task, p),
                      "logp_chosen": round(a, 3), "logp_rejected": round(b, 3)})
    scored = [i["score"] for i in items if i["score"] is not None]
    out["score_pass"] = round(sum(scored) / len(scored), 3) if scored else None
    out["replies"] = items
    return out


def show(name, ev):
    s = "-" if ev.get("score_pass") is None else f"{100 * ev['score_pass']:.0f}%"
    r = f"{100 * ev['reward_acc']:.0f}%" if "reward_acc" in ev else "-"
    print(f"  {name:<26} pref acc {100 * ev['pref_acc']:4.0f}%  log-prob margin {ev['logp_margin']:+8.2f}  "
          f"reward acc {r:>4}  score pass {s:>4}", flush=True)
    for i in ev["replies"]:
        mark = {1: "PASS", 0: "FAIL", None: "    "}[i["score"]]
        print(f"      {mark}  {i['reply'][:110]!r}", flush=True)


def run(a, seed, model, tok, test, enc_train, enc_test, ref_train, ref_test, instruction, steps):
    if DEV == "cuda":                            # free what the previous seed left, then measure this seed's peak
        gc.collect(); torch.cuda.empty_cache(); torch.cuda.reset_peak_memory_stats()
    torch.manual_seed(seed)                      # fixes the random start of the LoRA matrices A
    add_lora(model, a.rank, FIXED["lora_alpha"])
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    t0 = time.time()
    curve = train(model, enc_train, ref_train, a.beta, FIXED["lr"], seed, steps, a.sft)
    after = evaluate(model, tok, test, enc_test, instruction, a.task, ref_test, a.beta)
    secs = time.time() - t0
    remove_lora(model)
    gpu = round(torch.cuda.max_memory_allocated() / GB, 2) if DEV == "cuda" else None
    print(f"  seed {seed}  trainable {trainable:,} = {100 * trainable / total:.3f}% of {total:,}  {secs:.0f} s"
          f"  ({secs / steps:.1f} s per step with the evaluation)" + (f"  peak GPU memory {gpu} GB" if gpu else ""), flush=True)
    show(f"dpo, seed {seed}", after)
    return {"seed": seed, "after": after, "trainable": trainable, "parameters": total,
            "seconds": round(secs, 1), "gpu_gb": gpu}, curve


def check(name, good, detail):
    print(f"{'PASS' if good else 'FAIL'}  {name}: {detail}", flush=True)
    return bool(good)


def selfcheck(a, model, tok, train_pairs, test, enc_train, enc_test, instruction):
    """Checks for the first run on a new setup, and for a new data file. Each prints PASS or FAIL.
    Nothing here is a result."""
    seed, done = FIXED["seeds"][0], []
    have = torch.cuda.get_device_properties(0).total_memory / GB if DEV == "cuda" else 0
    print(f"selfcheck of {a.model} ({torch.cuda.get_device_name(0) + f', {have:.1f} GB' if DEV == 'cuda' else 'no GPU'}), "
          f"task {a.task}, data {a.data or 'EXAMPLES'}", flush=True)
    ln2 = math.log(2)

    # the data
    done.append(check("every pair has prompt, chosen and rejected, and chosen differs from rejected", True,
                      f"{len(train_pairs)} training pairs, {len(test)} test pairs"))
    same = {p["prompt"] for p in test} & {p["prompt"] for p in train_pairs}
    done.append(check("no test prompt is also a training prompt", not same, f"{len(same)} shared"))
    longest = max(len(e[0][1]) for e in enc_train + enc_test)
    done.append(check("every chosen reply fits in max_new_tokens", longest <= FIXED["max_new_tokens"],
                      f"longest chosen reply {longest} tokens (with the end token); limit {FIXED['max_new_tokens']}"))
    scored = [score(p["chosen"], a.task, p) for p in train_pairs + test]
    ok = [v for v in scored if v is not None]
    done.append(check("score() passes every chosen reply that it can score", all(ok),
                      f"{sum(ok)} of {len(ok)} pass; {len(scored) - len(ok)} pairs have no \"want\" and are not scored"))
    dtype = next(model.parameters()).dtype
    done.append(check("32-bit floats, on a GPU", dtype == torch.float32 and DEV == "cuda", f"{dtype} on {DEV}"))

    # the loss mask: only reply tokens count; padding changes nothing
    (x, y), (_, y_l) = enc_train[0]
    with torch.no_grad():
        fast = seq_logp(model, [(x, y_l), (x, y)])[0].item()                      # in a batch with a longer sequence
        logits = model(input_ids=torch.tensor([x + y_l], device=DEV)).logits[0].float()
        lp = torch.log_softmax(logits[:-1], -1).gather(1, torch.tensor((x + y_l)[1:], device=DEV)[:, None])[:, 0]
        slow = lp[len(x) - 1:].sum().item()                                       # the reply tokens only
    done.append(check("only the reply tokens are counted", abs(fast - slow) < 1e-2,
                      f"{len(y_l)} reply tokens of {len(x) + len(y_l)} {tok.decode(y_l)!r}; log pi(y|x) {fast:.3f} here, "
                      f"{slow:.3f} from the full logits; difference {abs(fast - slow):.1e}"))

    # LoRA with B = 0: pi_theta = pi_ref, so the DPO loss is ln 2
    torch.manual_seed(seed)
    add_lora(model, a.rank, FIXED["lora_alpha"])
    shapes = Counter((m.base.in_features, m.base.out_features) for m in model.modules() if isinstance(m, LoRALinear))
    want = sum(c * a.rank * (i + o) for (i, o), c in shapes.items())
    got = sum(p.numel() for p in model.parameters() if p.requires_grad)
    done.append(check(f"trainable parameters, rank {a.rank}", got == want,
                      f"counted {got:,}; r x (d_in + d_out) per matrix: "
                      + " + ".join(f"{c} x {a.rank} x ({i} + {o})" for (i, o), c in shapes.items()) + f" = {want:,}"))
    ref = ref_logps(model, enc_train)
    pol = torch.stack([logp_all(model, [w for w, _ in enc_train]), logp_all(model, [l for _, l in enc_train])], 1)
    loss0, _ = dpo_loss(pol[:, 0], pol[:, 1], ref[:, 0], ref[:, 1], a.beta)
    diff = (pol - ref).abs().max().item()
    done.append(check("before training, log pi_theta = log pi_ref and the DPO loss is ln 2",
                      diff < 1e-3 and abs(loss0.item() - ln2) < 1e-4,
                      f"largest difference {diff:.1e}; loss {loss0.item():.4f}, ln 2 = {ln2:.4f}"))

    # 3 steps of DPO
    t0 = time.time()
    curve = train(model, enc_train, ref, a.beta, FIXED["lr"], seed, steps=3)
    secs = (time.time() - t0) / 3
    pol = torch.stack([logp_all(model, [w for w, _ in enc_train]), logp_all(model, [l for _, l in enc_train])], 1)
    loss3, _ = dpo_loss(pol[:, 0], pol[:, 1], ref[:, 0], ref[:, 1], a.beta)
    done.append(check("3 DPO steps lower the DPO loss on the training pairs", loss3.item() < ln2,
                      f"batch loss per step {curve['loss']}; on all {len(enc_train)} training pairs {ln2:.4f} -> {loss3.item():.4f}; "
                      f"{secs:.1f} s per step"))
    text = reply(model, tok, instruction, test[0]["prompt"])
    done.append(check("a greedy reply after 3 steps", bool(text), repr(text[:120])))
    gpu = round(torch.cuda.max_memory_allocated() / GB, 2) if DEV == "cuda" else None
    done.append(check("peak GPU memory", DEV == "cuda", f"{gpu} GB of {have:.1f} GB" if gpu else f"no GPU; peak RAM {peak_ram_gb()} GB"))
    remove_lora(model)
    print(f"\nselfcheck: {sum(done)} of {len(done)} checks passed")
    raise SystemExit(0 if all(done) else 1)


def peak_ram_gb():
    try:
        import resource, sys
        r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss       # bytes on macOS, kilobytes on Linux
        return round(r / (1024 ** 3 if sys.platform == "darwin" else 1024 ** 2), 2)
    except ImportError:                                              # not available on Windows
        return None


def mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 3) if xs else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--task", default="format", choices=list(EXAMPLES), help="which EXAMPLES and which score() check")
    ap.add_argument("--method", default="zero", choices=["zero", "dpo"], help="zero: instruction only; dpo: train LoRA with DPO")
    ap.add_argument("--data", help="your pairs, JSONL: prompt, chosen, rejected (and want, avoid)")
    ap.add_argument("--test", help="your test pairs, JSONL; without it, the last 25%% of --data are the test pairs")
    ap.add_argument("--instruction", help="the system message, or @file to read it from a file; without it, the example instruction of --task")
    ap.add_argument("--beta", type=float, default=0.1, help="DPO beta")
    ap.add_argument("--sft", type=float, default=0.0, help="weight of an SFT loss on the chosen replies, added to the DPO loss; 0 = pure DPO")
    ap.add_argument("--rank", type=int, default=8, help="LoRA rank r")
    ap.add_argument("--model", default=FIXED["model"])
    ap.add_argument("--steps", type=int, default=FIXED["steps"], help="training steps; fewer only for a quick test")
    ap.add_argument("--seeds", type=int, default=len(FIXED["seeds"]), help="how many of the 3 seeds; fewer only for a quick test")
    ap.add_argument("--out", default="results.json")
    ap.add_argument("--selfcheck", action="store_true", help="check the setup and the data (PASS or FAIL per check) and stop")
    a = ap.parse_args()

    if DEV != "cuda":
        print("no GPU found: on Colab choose Runtime -> Change runtime type -> T4 GPU. On a CPU this is slow.")
    train_pairs, test, instruction = get_data(a)
    problems = bad_pairs(train_pairs + test)
    if problems or not train_pairs or not test:
        raise SystemExit("data: " + ("; ".join(problems[:5]) or "there must be at least one training pair and one test pair"))
    tok, model = load(a.model)
    enc_train = [(encode(tok, instruction, p["prompt"], p["chosen"]), encode(tok, instruction, p["prompt"], p["rejected"])) for p in train_pairs]
    enc_test = [(encode(tok, instruction, p["prompt"], p["chosen"]), encode(tok, instruction, p["prompt"], p["rejected"])) for p in test]
    if a.selfcheck:
        selfcheck(a, model, tok, train_pairs, test, enc_train, enc_test, instruction)

    print(f"device: {DEV}; fixed settings: {FIXED}")
    print(f"task {a.task}, method {a.method}, model {a.model}, data {a.data or 'EXAMPLES'}: "
          f"{len(train_pairs)} training pairs, {len(test)} test pairs")
    print(f"instruction: {instruction!r}")
    print(f"before training (the instruction only; this is the result of zero):", flush=True)
    t0 = time.time()
    before = evaluate(model, tok, test, enc_test, instruction, a.task)
    show("zero (instruction only)", before)
    print(f"  {time.time() - t0:.0f} s", flush=True)

    seeds, runs = FIXED["seeds"][:a.seeds], []
    if a.method == "zero":
        seeds = []
        print("zero has no randomness (no training): one run")
    else:
        print(f"dpo: beta {a.beta}, sft {a.sft}, rank {a.rank}, {a.steps} steps of {FIXED['batch']} pairs, lr {FIXED['lr']}, "
              f"seeds {seeds}", flush=True)
        ref_train, ref_test = ref_logps(model, enc_train), ref_logps(model, enc_test)
        runs = [run(a, seed, model, tok, test, enc_train, enc_test, ref_train, ref_test, instruction, a.steps) for seed in seeds]

    print(f"\nsummary on {len(test)} test pairs")
    show("zero (instruction only)", {**before, "replies": []})
    for r, _ in runs:
        show(f"dpo, seed {r['seed']}", {**r["after"], "replies": []})
    if runs:
        for k in ("pref_acc", "reward_acc", "score_pass"):
            v = [r["after"][k] for r, _ in runs if r["after"].get(k) is not None]
            if v:
                print(f"  dpo {k:<11} mean {100 * mean(v):.0f}%  min–max {100 * min(v):.0f}–{100 * max(v):.0f}%  over {len(v)} seed(s)")

    import transformers
    about = {"date": time.strftime("%d %b %Y %H:%M"), "device": torch.cuda.get_device_name(0) if DEV == "cuda" else DEV,
             "machine": platform.platform(), "torch": torch.__version__, "transformers": transformers.__version__,
             "peak_ram_gb": peak_ram_gb()}
    settings = {"task": a.task, "method": a.method, "model": a.model, "data": a.data, "test": a.test,
                "instruction": instruction, "train_pairs": len(train_pairs), "test_pairs": len(test),
                "beta": a.beta if a.method == "dpo" else None, "sft": a.sft if a.method == "dpo" else None, "rank": a.rank if a.method == "dpo" else None,
                "steps": a.steps if a.method == "dpo" else 0, "seeds": seeds}
    results = {"before": before, "runs": [r for r, _ in runs]}
    if runs:
        results["mean_after"] = {k: mean([r["after"].get(k) for r, _ in runs]) for k in ("pref_acc", "reward_acc", "score_pass", "logp_margin")}
    # curves: the DPO loss, the mean reward margin and the reward accuracy of the batch at every step, per seed
    curves = {str(r["seed"]): c for r, c in runs}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"run": about, "fixed": FIXED, "settings": settings, "results": results, "curves": curves}, f, indent=1)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
