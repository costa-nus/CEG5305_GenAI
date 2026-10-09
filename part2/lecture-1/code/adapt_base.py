#!/usr/bin/env python3
"""
CEG5305 Part 2, Lecture 1, session 02: base code for the adaptation homework.

One small pre-trained language model (Qwen2.5-0.5B, 0.49 billion parameters) is adapted to
one task (SST-2: is a movie review positive or negative?) in four ways. The test set, the
prompt format and the way an answer is read are the same for all four, so their results
can be compared.

Run it on Colab (T4 runtime): Runtime -> Change runtime type -> T4 GPU.

    python adapt_base.py --selfcheck                     # first: checks of your setup, PASS or FAIL
    python adapt_base.py                                 # zero: instruction only, no examples
    python adapt_base.py --method icl  --n 16            # 16 labelled examples in the prompt
    python adapt_base.py --method lora --n 16 --rank 8   # train a LoRA update on the same 16
    python adapt_base.py --method full --n 16            # update all weights on the same 16
    python adapt_base.py --method icl  --n 16 --labels flipped         # or: abstract
    python adapt_base.py --method lora --n 16 --model Qwen/Qwen2.5-1.5B   # a larger model

Your homework: choose one question about adapting a model (for example: with the same n
labelled examples, is it better to put them in the prompt or to train LoRA on them?).
Write your predictions before you run anything. Change one thing at a time, keep the 3
seeds, and compare differences with the spread across seeds. Report what you found and
which predictions failed. Each run writes a JSON file (--out) with the accuracy per seed,
the trainable parameters, the seconds, the prompt tokens per query, the peak GPU memory
and, for lora and full, the training loss at every step ("curves").

Requires `pip install torch transformers datasets` (Colab has the first two); no account
needed. The first run downloads the model (about 1 GB; 3.1 GB for Qwen2.5-1.5B) and the
data (about 3 MB). Everything is computed in 32-bit floats. Memory on a T4 (15 GB), by
arithmetic: the 0.5B model takes 2 GB; full fine-tuning takes 16 bytes per parameter
(weights, gradients and the two running averages of AdamW), 7.9 GB, plus the activations,
so it should fit, and --selfcheck measures it. With the 1.5B model (6.2 GB), zero, icl and
lora should fit; full does not (25 GB) and stops with a message.
Run time per seed on a T4: TO BE MEASURED ON COLAB.
To check your setup: `python adapt_base.py` (zero, natural labels) has no randomness and
must print an accuracy of TO BE MEASURED ON COLAB.
"""
import argparse, gc, json, math, platform, random, time
from collections import Counter

import torch
import torch.nn as nn
from torch.nn import functional as F

# ── held fixed for every run; change one of them only if it is your question ──
FIXED = dict(
    model="Qwen/Qwen2.5-0.5B",   # --model Qwen/Qwen2.5-1.5B for a question about scale (zero, icl, lora)
    dataset="stanfordnlp/sst2",
    test_per_class=100,    # test set: the first 100 negative and first 100 positive reviews of the validation split
    instruction="Classify the sentiment of the movie review.",   # first line of every prompt, for every method
    max_tokens=64,         # an example review longer than this is cut, so a training prompt stays under about 80 tokens
    steps=100,             # training steps (lora, full), the same for every n
    batch=8,               # examples per training step (all n of them when n < 8); small, so that full fits a T4
    lr_lora=1e-3,          # AdamW learning rate for lora, constant; chosen without a search yet
    lr_full=1e-5,          # AdamW learning rate for full, constant; chosen without a search yet
    clip=1.0,              # gradient-norm clipping
    lora_alpha=16,         # LoRA scale is alpha / r; alpha stays fixed, so the scale changes with the rank
    eval_batch=10,         # test prompts per forward pass; small, because an icl prompt with n = 32 can reach 2,400 tokens
    seeds=[1337, 1338, 1339],
)

# ── the label words: what the model reads in the examples and what it must output ──
# Each must be one token, with its leading space. Index 0 is a negative review, 1 a positive one.
LABELS = {
    "natural":  [" negative", " positive"],
    "flipped":  [" positive", " negative"],   # the words swapped: a positive review is labelled "negative"
    "abstract": [" bar", " foo"],             # two words with no link to sentiment
}

DEV = "cuda" if torch.cuda.is_available() else "cpu"
GB = 1e9


def get_data():
    """Test set: fixed and class-balanced, from the validation split. Pool: the train split."""
    from datasets import load_dataset
    ds = load_dataset(FIXED["dataset"])
    val = [(s.strip(), y) for s, y in zip(ds["validation"]["sentence"], ds["validation"]["label"])]
    k = FIXED["test_per_class"]
    test = [e for e in val if e[1] == 0][:k] + [e for e in val if e[1] == 1][:k]
    pool = [(s.strip(), y) for s, y in zip(ds["train"]["sentence"], ds["train"]["label"])]
    assert not {t for t, _ in test} & {t for t, _ in pool}, "a test review also appears in the train split"
    return test, pool


def draw(pool, n, seed):
    """n labelled examples from the train split, half per class, chosen and ordered by the seed.
    For one seed, the examples for a smaller n are a subset of those for a larger n."""
    assert n % 2 == 0, "--n must be even: half the examples are positive, half negative"
    rng = random.Random(seed)
    neg, pos = [e for e in pool if e[1] == 0], [e for e in pool if e[1] == 1]
    rng.shuffle(neg); rng.shuffle(pos)
    chosen = neg[:n // 2] + pos[:n // 2]
    rng.shuffle(chosen)
    return chosen


def cut(tok, text):
    """An example review longer than max_tokens is cut to its first max_tokens tokens. Test reviews are never cut."""
    ids = tok(text, add_special_tokens=False)["input_ids"]
    return text if len(ids) <= FIXED["max_tokens"] else tok.decode(ids[:FIXED["max_tokens"]]).strip()


def prompt(text, words, demos=()):
    """The fixed format: instruction, the labelled examples (if any), then the review to classify."""
    shots = "".join(f"Review: {t}\nSentiment:{words[y]}\n\n" for t, y in demos)
    return f"{FIXED['instruction']}\n\n{shots}Review: {text}\nSentiment:"


def load(name):
    """Tokenizer and model. The weights are stored as bfloat16, which a T4 has no fast arithmetic
    for; they are converted to 32-bit floats, used for evaluation and for training alike."""
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModelForCausalLM.from_pretrained(name).float().to(DEV)
    return tok, model


def label_ids(tok, words):
    ids = [tok(w, add_special_tokens=False)["input_ids"] for w in words]
    assert all(len(i) == 1 for i in ids) and ids[0] != ids[1], \
        f"label words must be two different single tokens for this tokenizer: {words} -> {ids}"
    return [i[0] for i in ids]


class LoRALinear(nn.Module):
    """h = W0 x + (alpha / r) * B A x, with W0 frozen (Hu et al., 2022).
    A starts random and B at zero, so before training the layer computes exactly W0 x.
    If the original layer has a bias, it stays inside `base` and stays frozen."""

    def __init__(self, base, r, alpha):
        super().__init__()
        self.base = base                                             # W0 (frozen in add_lora)
        self.A = nn.Parameter(torch.empty(r, base.in_features))      # r x d_in
        self.B = nn.Parameter(torch.zeros(base.out_features, r))     # d_out x r
        nn.init.kaiming_uniform_(self.A, a=math.sqrt(5))             # the same init as the authors' code
        self.scale = alpha / r

    def forward(self, x):
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
    """Put the original layers back. They stay frozen. Used by --selfcheck."""
    for name, m in list(model.named_modules()):
        if isinstance(m, LoRALinear):
            parent, _, attr = name.rpartition(".")
            setattr(model.get_submodule(parent), attr, m.base)


def next_token_logits(model, tok, prompts):
    """Logits over the vocabulary for the token that follows each prompt, and the prompt lengths.
    Prompts are padded on the right; with causal attention, padding cannot change what is before it.
    Only the last position goes through the output layer: logits for every position of a long
    prompt would not fit in memory."""
    ids = [tok(p)["input_ids"] for p in prompts]
    lengths = [len(i) for i in ids]
    pad = tok.eos_token_id or 0                                       # any token will do as padding
    x = torch.tensor([i + [pad] * (max(lengths) - len(i)) for i in ids], device=DEV)
    h = model.base_model(input_ids=x, use_cache=False).last_hidden_state                 # batch x width x d
    last = h[torch.arange(len(ids), device=DEV), torch.tensor(lengths, device=DEV) - 1]  # the last real token of each prompt
    return model.get_output_embeddings()(last), lengths


def train(model, tok, examples, words, lr, seed, steps):
    """Minimise the cross-entropy of the label word, over the whole vocabulary, at the position
    after "Sentiment:". The training prompt is the zero-shot prompt, as at test time."""
    ids = label_ids(tok, words)
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=lr)
    rng = random.Random(seed)                    # the seed also fixes which examples form each batch
    curve = {"step": [], "train_loss": []}
    model.train()
    for s in range(steps):
        b = rng.sample(examples, min(FIXED["batch"], len(examples)))
        logits, _ = next_token_logits(model, tok, [prompt(t, words) for t, _ in b])
        loss = F.cross_entropy(logits, torch.tensor([ids[y] for _, y in b], device=DEV))
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(params, FIXED["clip"])
        opt.step()
        curve["step"].append(s); curve["train_loss"].append(round(loss.item(), 4))
        if s % 25 == 0 or s == steps - 1:
            print(f"    step {s:4d}  train loss {loss.item():.3f}", flush=True)
    return curve


@torch.no_grad()
def evaluate(model, tok, test, words, demos=()):
    """Accuracy on the test set. The answer is whichever of the two label words has the higher
    logit as the next token. Also returns how often the answer was 'positive review'."""
    ids = label_ids(tok, words)
    model.eval()
    prompts = [prompt(t, words, demos) for t, _ in test]
    preds, lengths = [], []
    for i in range(0, len(prompts), FIXED["eval_batch"]):
        logits, n_tok = next_token_logits(model, tok, prompts[i:i + FIXED["eval_batch"]])
        preds += (logits[:, ids[1]] > logits[:, ids[0]]).long().tolist()
        lengths += n_tok
    acc = sum(p == y for p, (_, y) in zip(preds, test)) / len(test)
    return acc, sum(preds) / len(preds), sum(lengths) / len(lengths)


def run(a, seed, test, pool, steps=None):
    words = LABELS[a.labels]
    if DEV == "cuda":                            # free what the previous run left, then measure this run's peak
        gc.collect(); torch.cuda.empty_cache(); torch.cuda.reset_peak_memory_stats()
    tok, model = load(a.model)                   # a fresh copy of the pre-trained weights for every run
    total = sum(p.numel() for p in model.parameters())
    if a.method == "full" and DEV == "cuda":     # 32-bit AdamW: weights, gradients and two averages per parameter
        need, have = 16 * total / GB + 2, torch.cuda.get_device_properties(0).total_memory / GB
        if need > have:
            raise SystemExit(f"full: updating {total:,} parameters needs about {need:.0f} GB and this GPU has {have:.0f} GB. "
                             "Use lora with this model, or full with a smaller model.")
    torch.manual_seed(seed)                      # fixes the random start of the LoRA matrices A
    examples = [(cut(tok, t), y) for t, y in draw(pool, a.n, seed)] if a.method != "zero" else []
    t0, curve, trainable = time.time(), None, 0
    if a.method in ("lora", "full"):
        if a.method == "lora":
            add_lora(model, a.rank, FIXED["lora_alpha"])
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        curve = train(model, tok, examples, words, FIXED["lr_" + a.method], seed, steps or FIXED["steps"])
    demos = examples if a.method == "icl" else ()        # lora and full are tested with the zero-shot prompt
    acc, said_pos, n_tok = evaluate(model, tok, test, words, demos)
    secs = time.time() - t0
    gpu = round(torch.cuda.max_memory_allocated() / GB, 2) if DEV == "cuda" else None
    print(f"  seed {seed}  accuracy {100 * acc:5.1f}%  (answered 'positive review' {100 * said_pos:.0f}% of the time)  "
          f"trainable {trainable:,} = {100 * trainable / total:.3f}% of {total:,}  "
          f"{n_tok:.0f} prompt tokens per query  {secs:.0f} s" + (f"  peak GPU memory {gpu} GB" if gpu else ""), flush=True)
    return {"seed": seed, "accuracy": round(100 * acc, 1), "answered_positive": round(100 * said_pos, 1),
            "trainable": trainable, "parameters": total, "prompt_tokens": round(n_tok, 1), "seconds": round(secs, 1),
            "gpu_gb": gpu}, curve


def check(name, good, detail):
    print(f"{'PASS' if good else 'FAIL'}  {name}: {detail}", flush=True)
    return bool(good)


def check_model(a, small):
    """The checks that look inside the model: label words, precision, the output shortcut, LoRA."""
    tok, model = load(a.model)
    done = []
    try:
        done.append(check("label words are single tokens", True, str({k: label_ids(tok, w) for k, w in LABELS.items()})))
    except AssertionError as e:
        check("label words are single tokens", False, str(e))
        raise SystemExit("selfcheck stopped: choose other label words in LABELS for this model")
    dtype = next(model.parameters()).dtype
    done.append(check("32-bit floats, on a GPU", dtype == torch.float32 and DEV == "cuda", f"{dtype} on {DEV}"))
    prompts = [prompt(t, LABELS["natural"]) for t, _ in small[8:12]]          # two negative and two positive reviews
    with torch.no_grad():
        base, _ = next_token_logits(model, tok, prompts)
        whole = model(input_ids=torch.tensor([tok(prompts[0])["input_ids"]], device=DEV)).logits[0, -1]
    diff = (base[0] - whole).abs().max().item()
    done.append(check("last-position logits equal the model's own logits", diff < 1e-2, f"largest difference {diff:.1e}"))
    total = sum(p.numel() for p in model.parameters())
    for r in (1, 8, 64):
        torch.manual_seed(FIXED["seeds"][0])
        add_lora(model, r, FIXED["lora_alpha"])
        shapes = Counter((m.base.in_features, m.base.out_features) for m in model.modules() if isinstance(m, LoRALinear))
        want = sum(c * r * (i + o) for (i, o), c in shapes.items())
        got = sum(p.numel() for p in model.parameters() if p.requires_grad)
        sums = " + ".join(f"{c} x {r} x ({i} + {o})" for (i, o), c in shapes.items())
        done.append(check(f"trainable parameters, rank {r}", got == want,
                          f"counted {got:,}; r x (d_in + d_out) per matrix: {sums} = {want:,}; {100 * got / total:.3f}% of {total:,}"))
        if r == 8:
            with torch.no_grad():
                same, _ = next_token_logits(model, tok, prompts)
            diff = (same - base).abs().max().item()
            done.append(check("LoRA with B = 0 gives the logits of the base model", diff < 1e-3, f"largest difference {diff:.1e}"))
        remove_lora(model)
    return done


def selfcheck(a, test, pool):
    """Checks for the first run on a new setup. Each prints PASS or FAIL. Nothing here is a result."""
    small = test[:10] + test[-10:]               # 10 negative and 10 positive reviews: enough for a check
    seed = FIXED["seeds"][0]
    have = torch.cuda.get_device_properties(0).total_memory / GB if DEV == "cuda" else 0
    gpu = f"{torch.cuda.get_device_name(0)}, {have:.1f} GB" if DEV == "cuda" else "no GPU"
    print(f"selfcheck of {a.model} ({gpu})", flush=True)
    done = check_model(a, small)
    icl = argparse.Namespace(method="icl", n=4, rank=8, labels="natural", model=a.model)
    one, two = run(icl, seed, small, pool)[0], run(icl, seed, small, pool)[0]
    done.append(check("the same seed gives the same result twice (icl, n = 4)",
                      (one["accuracy"], one["answered_positive"]) == (two["accuracy"], two["answered_positive"]),
                      f"accuracy {one['accuracy']} and {two['accuracy']} on {len(small)} reviews"))
    for method in ("zero", "lora", "full"):      # 3 training steps: enough to reach the peak memory of a run
        try:
            r, curve = run(argparse.Namespace(method=method, n=16, rank=8, labels="natural", model=a.model), seed, small, pool, steps=3)
            loss = f"; training loss {curve['train_loss']}" if curve else ""
            done.append(check(f"peak GPU memory, {method}", DEV == "cuda", f"{r['gpu_gb']} GB of {have:.1f} GB{loss}"))
        except (RuntimeError, SystemExit) as e:  # out of memory, or the model is too large for full
            done.append(check(f"peak GPU memory, {method}", False, str(e)[:300]))
    print(f"\nselfcheck: {sum(done)} of {len(done)} checks passed")
    raise SystemExit(0 if all(done) else 1)


def peak_ram_gb():
    try:
        import resource, sys
        r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss       # bytes on macOS, kilobytes on Linux
        return round(r / (1024 ** 3 if sys.platform == "darwin" else 1024 ** 2), 2)
    except ImportError:                                              # not available on Windows
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--method", default="zero", choices=["zero", "icl", "lora", "full"])
    ap.add_argument("--n", type=int, default=16, help="labelled examples: in the prompt (icl) or to train on (lora, full)")
    ap.add_argument("--rank", type=int, default=8, help="LoRA rank r (lora only)")
    ap.add_argument("--labels", default="natural", choices=list(LABELS))
    ap.add_argument("--model", default=FIXED["model"])
    ap.add_argument("--out", default="results.json")
    ap.add_argument("--selfcheck", action="store_true", help="check the setup (PASS or FAIL per check) and stop")
    a = ap.parse_args()

    if DEV != "cuda":
        print("no GPU found: on Colab choose Runtime -> Change runtime type -> T4 GPU. On a CPU this is slow.")
    test, pool = get_data()
    if a.selfcheck:
        selfcheck(a, test, pool)
    pos = sum(y for _, y in test)
    print(f"device: {DEV}; fixed settings: {FIXED}")
    print(f"test set: {len(test)} reviews from the validation split, {pos} positive and {len(test) - pos} negative; "
          f"examples are drawn from the {len(pool):,} phrases of the train split")
    print(f"reference: chance is 50.0%; always giving the same answer is {100 * max(pos, len(test) - pos) / len(test):.1f}%")
    seeds = FIXED["seeds"]
    if a.method == "zero":
        seeds = seeds[:1]
        print("zero has no randomness (no examples, no training): one run")
    print(f"{a.method}, labels {a.labels}, model {a.model}"
          + (f", n {a.n}" if a.method != "zero" else "") + (f", rank {a.rank}" if a.method == "lora" else ""), flush=True)

    runs = [run(a, seed, test, pool) for seed in seeds]
    accs = [r["accuracy"] for r, _ in runs]
    print(f"\naccuracy: mean {sum(accs) / len(accs):.1f}%  min–max {min(accs):.1f}–{max(accs):.1f}%  over {len(accs)} seed(s)")

    import datasets, transformers
    about = {"date": time.strftime("%d %b %Y %H:%M"), "device": torch.cuda.get_device_name(0) if DEV == "cuda" else DEV,
             "machine": platform.platform(), "torch": torch.__version__, "transformers": transformers.__version__,
             "datasets": datasets.__version__, "peak_ram_gb": peak_ram_gb()}
    settings = {"method": a.method, "labels": a.labels, "label_words": LABELS[a.labels], "model": a.model,
                "n": a.n if a.method != "zero" else 0, "rank": a.rank if a.method == "lora" else None}
    results = {"seeds": seeds, "accuracy": accs, "mean": round(sum(accs) / len(accs), 1), "min": min(accs), "max": max(accs),
               "runs": [r for r, _ in runs]}
    # curves: the training loss at every step, per seed, for plotting (lora and full only)
    curves = {str(r["seed"]): c for r, c in runs if c}
    json.dump({"run": about, "fixed": FIXED, "settings": settings, "results": results, "curves": curves}, open(a.out, "w"), indent=1)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
