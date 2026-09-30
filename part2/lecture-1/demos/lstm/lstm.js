// A character-level LSTM, forward pass only, in plain JavaScript. The weights come from
// train_lstm.py (course materials): model.json lists the arrays, model.bin holds them as
// float16. Gate order is PyTorch's: input i, forget f, candidate g, output o.

export async function loadLSTM(base) {
  const [meta, buf] = await Promise.all([
    fetch(base + "model.json").then(r => r.json()),
    fetch(base + "model.bin").then(r => r.arrayBuffer()),
  ]);
  return fromBuffer(meta, buf);
}

export function fromBuffer(meta, buf) {
  const u16 = new Uint16Array(buf), W = {};
  let off = 0;
  for (const [name, shape] of meta.arrays) {
    const n = shape.reduce((p, q) => p * q, 1);
    W[name] = half(u16.subarray(off, off + n));
    off += n;
  }
  if (off !== u16.length) throw new Error(`model.bin has ${u16.length} values, model.json lists ${off}`);
  return new CharLSTM(meta, W);
}

function half(u) {
  const out = new Float32Array(u.length);
  for (let i = 0; i < u.length; i++) {
    const x = u[i], s = x & 0x8000 ? -1 : 1, e = (x >> 10) & 31, m = x & 1023;
    out[i] = e === 0 ? s * m * 2 ** -24 : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * 2 ** (e - 15);
  }
  return out;
}

const sigmoid = x => 1 / (1 + Math.exp(-x));

export class CharLSTM {
  constructor(meta, W) {
    this.meta = meta; this.W = W;
    this.vocab = [...meta.vocab];
    this.V = this.vocab.length; this.H = meta.hidden; this.L = meta.layers;
    this.index = new Map(this.vocab.map((c, i) => [c, i]));
    this.gates = new Float32Array(4 * this.H);
    this.logits = new Float32Array(this.V);
    this.reset();
  }

  get parameters() { return Object.values(this.W).reduce((n, a) => n + a.length, 0); }

  reset() {
    this.h = Array.from({ length: this.L }, () => new Float32Array(this.H));
    this.c = Array.from({ length: this.L }, () => new Float32Array(this.H));
  }

  // read one character (its vocabulary index); returns the logits for the next one
  step(ci) {
    const { W, H, V, L, gates: g } = this;
    let x = null;
    for (let l = 0; l < L; l++) {
      const Wih = W[`W_ih${l}`], Whh = W[`W_hh${l}`], b = W[`b${l}`], h = this.h[l], c = this.c[l];
      for (let r = 0; r < 4 * H; r++) {
        // layer 0 reads a one-hot character, so W_ih times it is one column of W_ih
        let s = b[r] + (l === 0 ? Wih[r * V + ci] : dot(Wih, r * H, x, H));
        g[r] = s + dot(Whh, r * H, h, H);
      }
      for (let j = 0; j < H; j++) {
        const i = sigmoid(g[j]), f = sigmoid(g[H + j]), gg = Math.tanh(g[2 * H + j]), o = sigmoid(g[3 * H + j]);
        c[j] = f * c[j] + i * gg;
        h[j] = o * Math.tanh(c[j]);
      }
      x = h;
    }
    const Wo = W.W_out, bo = W.b_out;
    for (let v = 0; v < V; v++) this.logits[v] = bo[v] + dot(Wo, v * H, x, H);
    return this.logits;
  }

  // feed a prompt; characters outside the vocabulary are skipped and returned
  read(text) {
    const skipped = [];
    for (const ch of text) this.index.has(ch) ? this.step(this.index.get(ch)) : skipped.push(ch);
    return skipped;
  }
}

function dot(M, row, x, n) {
  let s = 0;
  for (let k = 0; k < n; k++) s += M[row + k] * x[k];
  return s;
}

// probabilities at a temperature (0 means always the most likely character)
export function probs(logits, temp) {
  const p = new Float32Array(logits.length);
  if (temp <= 0) { let a = 0; for (let i = 1; i < logits.length; i++) if (logits[i] > logits[a]) a = i; p[a] = 1; return p; }
  let mx = -Infinity;
  for (const z of logits) mx = Math.max(mx, z);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) sum += (p[i] = Math.exp((logits[i] - mx) / temp));
  for (let i = 0; i < p.length; i++) p[i] /= sum;
  return p;
}

export function sample(p, rand = Math.random) {
  let u = rand(), i = 0;
  for (; i < p.length - 1; i++) if ((u -= p[i]) <= 0) break;
  return i;
}
