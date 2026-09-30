#!/usr/bin/env python3
"""
CEG5305 Part 2, Lecture 1: base code for the ablation homework.

A small character-level Transformer shaped like nanoGPT (pre-LayerNorm blocks of causal
self-attention and an MLP, learned position embeddings), trained on TinyShakespeare.
It is the code behind the ablation table in class: the same model, the same settings,
the same seeds.

    python ablation_base.py                          # baseline, 3 seeds
    python ablation_base.py --variant no_norm        # one of the class variants
    python ablation_base.py --variant all            # the whole class table

Your homework: make ONE change, as a new entry in VARIANTS. It is either a new switch
that you use in the model code (like the four class variants), or one value from FIXED
that you want to study (for example {"n_layer": 12}). Keep everything else as it is, and
compare against the baseline. Report the mean and the range over the three seeds.
The output file also holds each run's training loss every 10 steps ("curves"), for your plot.

Requires Python 3.9+ and PyTorch; no GPU needed (under 0.5 GB of RAM). One run takes about
35 s on a Colab T4 GPU and about 70 s on a recent laptop CPU; the baseline, seed 1337, gives
a validation loss of 1.765 on both. Run your baseline and your variant on the same machine:
most variants give the same numbers on a CPU and a GPU, but an unstable one can differ
(removing the residual connections gave 2.27-2.37 on a laptop CPU and 2.39-3.34 on a T4).
"""
import argparse, json, platform, time, urllib.request, os

import torch
import torch.nn as nn
from torch.nn import functional as F

# ── held fixed for every run; a variant may override one of them on purpose ──
FIXED = dict(
    data_url="https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt",
    train_frac=0.9,      # first 90% of the characters for training, last 10% for validation
    block=64,            # context length, in characters
    d=128,               # width of every token vector
    n_head=4,            # attention heads per layer
    n_layer=4,           # Transformer blocks
    steps=3000,          # training steps
    batch=32,            # sequences per step
    lr=3e-4,             # AdamW learning rate, constant
    clip=1.0,            # gradient-norm clipping
    eval_batches=20,     # validation loss = mean over 20 random batches of 32
    seeds=[1337, 1338, 1339],
)

# ── the switches; the class variants, plus room for yours ────────────────────
VARIANTS = {
    "baseline":   {},
    "no_norm":    {"no_norm": True},       # remove LayerNorm inside the blocks
    "no_residual": {"no_residual": True},  # remove both residual connections
    "no_pos":     {"no_pos": True},        # remove position embeddings
    "one_head":   {"one_head": True},      # one head of width 128 instead of four of 32
    # "my_switch": {"my_switch": True},    # ← a new switch: add it here, use it in the model
    # "deeper":    {"n_layer": 12},        # ← or one fixed value, changed on purpose
}

DEV = "cuda" if torch.cuda.is_available() else "cpu"
LOG_EVERY = 10   # record the training loss every 10 steps; logging uses no random numbers, so results do not change


def get_data():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tinyshakespeare.txt")
    if not os.path.exists(path):
        print("downloading TinyShakespeare …")
        urllib.request.urlretrieve(FIXED["data_url"], path)
    text = open(path, encoding="utf-8").read()
    chars = sorted(set(text))
    stoi = {c: i for i, c in enumerate(chars)}
    data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
    n = int(FIXED["train_frac"] * len(data))
    return data[:n], data[n:], len(chars)


def batch(data, block, bs):
    ix = torch.randint(len(data) - block - 1, (bs,))
    x = torch.stack([data[i:i + block] for i in ix])
    y = torch.stack([data[i + 1:i + block + 1] for i in ix])
    return x.to(DEV), y.to(DEV)


class Block(nn.Module):
    def __init__(self, d, nh, block, cfg):
        super().__init__()
        self.cfg = cfg
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = nn.MultiheadAttention(d, nh, batch_first=True)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))
        # causal mask: True above the diagonal means "may not attend"
        self.register_buffer("mask", torch.triu(torch.ones(block, block), 1).bool())

    def forward(self, x):
        T = x.size(1)
        h = x if self.cfg["no_norm"] else self.ln1(x)
        a, _ = self.attn(h, h, h, attn_mask=self.mask[:T, :T], need_weights=False)
        x = a if self.cfg["no_residual"] else x + a
        h = x if self.cfg["no_norm"] else self.ln2(x)
        m = self.mlp(h)
        return m if self.cfg["no_residual"] else x + m


def settings(variant):
    """FIXED, with any value the variant overrides on purpose."""
    return {**FIXED, **{k: v for k, v in variant.items() if k in FIXED}}


class Transformer(nn.Module):
    def __init__(self, V, **switches):
        super().__init__()
        f = settings(switches)
        self.cfg = {"no_norm": False, "no_residual": False, "no_pos": False, "one_head": False,
                    **{k: v for k, v in switches.items() if k not in FIXED}}
        nh = 1 if self.cfg["one_head"] else f["n_head"]
        self.tok = nn.Embedding(V, f["d"])
        self.pos = nn.Embedding(f["block"], f["d"])
        self.blocks = nn.ModuleList([Block(f["d"], nh, f["block"], self.cfg) for _ in range(f["n_layer"])])
        self.lnf = nn.LayerNorm(f["d"])
        self.head = nn.Linear(f["d"], V)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        x = self.tok(idx)
        if not self.cfg["no_pos"]:
            x = x + self.pos(torch.arange(T, device=idx.device))
        for b in self.blocks:
            x = b(x)
        logits = self.head(self.lnf(x))
        loss = None if targets is None else F.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))
        return logits, loss


@torch.no_grad()
def evaluate(model, val):
    model.eval()
    losses = [model(*batch(val, FIXED["block"], FIXED["batch"]))[1].item() for _ in range(FIXED["eval_batches"])]
    model.train()
    return sum(losses) / len(losses)


def run(name, switches, seed, tr, val, V):
    f = settings(switches)
    torch.manual_seed(seed)                   # the same seed gives the same start and the same batches
    model = Transformer(V, **switches).to(DEV).train()
    opt = torch.optim.AdamW(model.parameters(), lr=f["lr"])
    t0, curve = time.time(), {"step": [], "train_loss": []}
    for s in range(f["steps"]):
        _, loss = model(*batch(tr, f["block"], f["batch"]))
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), f["clip"])
        opt.step()
        if s % LOG_EVERY == 0 or s == f["steps"] - 1:
            curve["step"].append(s); curve["train_loss"].append(round(loss.item(), 4))
        if s % 500 == 0:
            print(f"  {name:12s} seed {seed}  step {s:5d}  train loss {loss.item():.3f}", flush=True)
    vl = evaluate(model, val)
    params = sum(p.numel() for p in model.parameters())
    secs = time.time() - t0
    print(f"  {name:12s} seed {seed}  val loss {vl:.3f}  ({params:,} parameters, {secs:.0f} s)", flush=True)
    return vl, params, curve, secs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--variant", default="baseline", help=f"one of {', '.join(VARIANTS)}, or all")
    ap.add_argument("--out", default="results.json")
    a = ap.parse_args()
    names = list(VARIANTS) if a.variant == "all" else [a.variant]
    if not set(names) <= set(VARIANTS):
        raise SystemExit(f"unknown variant {a.variant!r}: add it to VARIANTS first. Known: {', '.join(VARIANTS)}")
    tr, val, V = get_data()
    print(f"device: {DEV}; fixed settings: {FIXED}", flush=True)
    results, curves = {}, {}
    for name in names:
        runs = [run(name, VARIANTS[name], seed, tr, val, V) for seed in FIXED["seeds"]]
        losses = [r[0] for r in runs]
        results[name] = {"seeds": FIXED["seeds"], "val_loss": [round(v, 3) for v in losses],
                         "mean": round(sum(losses) / len(losses), 3),
                         "min": round(min(losses), 3), "max": round(max(losses), 3), "parameters": runs[0][1],
                         "seconds": [round(r[3]) for r in runs]}
        curves[name] = {str(seed): r[2] for seed, r in zip(FIXED["seeds"], runs)}
    print(f"\n{'variant':12s} {'mean':>7s} {'min–max':>15s} {'parameters':>11s}")
    for k, r in results.items():
        print(f"{k:12s} {r['mean']:7.3f} {r['min']:7.3f}–{r['max']:.3f} {r['parameters']:11,}")
    about = {"date": time.strftime("%d %b %Y %H:%M"), "device": DEV if DEV == "cpu" else torch.cuda.get_device_name(0),
             "machine": platform.platform(), "torch": torch.__version__, "variants": names, "log_every": LOG_EVERY}
    # curves: training loss every LOG_EVERY steps, per variant and seed, for plotting
    json.dump({"run": about, "fixed": FIXED, "results": results, "curves": curves}, open(a.out, "w"), indent=1)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
