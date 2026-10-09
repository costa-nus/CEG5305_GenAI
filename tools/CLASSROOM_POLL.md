# H100 memory question

The question is on slide 34; its comparison is on slide 35. Inserting the question shifts subsequent slide numbers as the deck is edited. Navigation links use stable slide titles.

From the `CEG5305_GenAI` site folder, start the local lecture site once:

```sh
python3 tools/course_server.py
```

Open the deck at `http://127.0.0.1:8000/part2/lecture-1/session-2/slides/#/34`. Click **Start poll server**. The button starts the polling service on port 8001, or reconnects if it is already running. It restores the current room, or creates one if needed. Click **New poll** to create a fresh empty room and its QR code; this button also starts the service if needed. Students scan the QR or use the displayed link on the same network. Students select all fitting configurations and click **Submit answer**. **Close voting** locks answers and reveals the 16 bytes/parameter hint; reopening hides it again. **Show results** displays the distribution, and slide 35 includes the class tally alongside the memory comparison. Starting a new poll does not erase old rooms.

The join URL and QR now refresh automatically while slide 34 is open, including when the detected network IP changes. The room and votes are preserved. Students who already joined through an old IP should rescan the updated QR. Campus Wi-Fi may isolate clients; a shared hotspot or a reachable deployment is needed in that case.

The course server must be running for the button to work: a webpage cannot launch a server when its own web server is offline. After reboot, rerun the one command above. A plain `python3 -m http.server` cannot handle the start button. The start endpoint accepts only local lecture-page requests and launches only this fixed polling service; it cannot execute arbitrary shell commands.

For a separately managed polling service or a fixed advertised address, the original standalone command remains available:

```sh
python3 tools/classroom_poll.py --public-url http://YOUR-LAN-IP:8001
```

A student name is required before voting and is saved with the answer; no account or external service is required. One random browser cookie identifies each vote; changing an answer updates that vote. This is a classroom participation poll, not an authenticated exam. Only aggregate counts are shown; each student can retrieve their own submitted name. Results persist in `.classroom-polls/votes.sqlite3` outside the served site. Room creation is restricted to the instructor computer, and closing/reopening requires its private control token. The polling service serves only the student voting page and poll API, not other workspace files.

QR codes are generated locally as SVGs using [Project Nayuki's QR Code generator](https://github.com/nayuki/QR-Code-generator), pinned to v1.8.0 under its MIT license in `tools/vendor/qrcodegen.py`. They encode the current student join URL and include a four-module quiet zone. No QR service or internet connection is used during polling.

The options and all calculations use `part2/lecture-1/session-2/slides/h100-memory-quiz.json`:

| Option | Parameters | Sequences per GPU per pass | Persistent state | Activations + batch | Other buffers | Total |
|---|---:|---:|---:|---:|---:|---:|
| A | 3B | 1 | 48 GB | 1 GB | 4 GB | **53 GB — fits** |
| B | 3B | 8 | 48 GB | 8 GB | 4 GB | **60 GB — fits** |
| C | 7B | 1 | 112 GB | 4 GB | 4 GB | **120 GB — exceeds 80 GB** |
| D | 7B | 8 | 112 GB | 32 GB | 4 GB | **148 GB — exceeds 80 GB** |

This is a fully specified teaching budget. The stipulated activation allowances (1 GB/sequence for 3B, 4 GB/sequence for 7B) are not model-specific measurements. Real activation memory depends on architecture, sequence length, kernels and recomputation. The persistent 16 bytes/parameter follows the deck's FP32 weights, FP32 gradients and two FP32 Adam moments; no sharding, quantization or activation checkpointing is assumed. Batch means the resident microbatch, not an effective batch accumulated over multiple passes. All values use decimal GB.

Hardware source: [NVIDIA H100 SXM specifications](https://www.nvidia.com/en-us/data-center/h100/), 80 GB HBM3. State accounting: [Rajbhandari et al. (2020), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054).
