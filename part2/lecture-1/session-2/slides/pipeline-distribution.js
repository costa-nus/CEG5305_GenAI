// Six-layer teaching model: contiguous layer groups become pipeline stages.
for (const n of document.querySelectorAll('[data-a-pipeline-split]')) {
  const owner = n.closest('.slide');
  if (!owner) continue; // Overview copies are not live slide instances.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const starts = [38, 136, 234];
  const intactStarts = [75, 133, 191];
  const destinations = [342, 622, 902];
  const descriptions = [
    'One Transformer: all six layers form one model.',
    'Split at layer boundaries: three consecutive groups, two layers per group.',
    'Moving each group into a different GPU’s memory…',
    'GPU 0 → GPU 1 → GPU 2: activations travel forward; gradients travel backward.'
  ];
  n.innerHTML = `<div class="a-split-controls"><button type="button" class="a-split-play">Play split &amp; distribute</button><div class="a-split-steps" aria-label="Animation steps"><button type="button" data-split-step="0">1 · Transformer</button><button type="button" data-split-step="1">2 · Split layers</button><button type="button" data-split-step="2">3 · Move to GPUs</button></div><button type="button" class="a-split-reset">Reset</button></div>
  <div class="a-compute-controls"><button type="button" class="a-compute-run" disabled>Run computation</button><button type="button" class="a-compute-pause" disabled>Pause</button><button type="button" class="a-compute-next" disabled>Next time step</button><span>One microbatch · forward pass · illustrative time units</span></div>
  <svg class="a-split-diagram" viewBox="0 0 1152 394" role="img" aria-label="A six-layer Transformer is divided into three groups. GPU 0 owns layers 1 and 2; GPU 1 owns layers 3 and 4; GPU 2 owns layers 5 and 6.">
    <defs><marker id="pipeline-forward-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="var(--orange)"/></marker><marker id="pipeline-backward-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="var(--blue-2)"/></marker></defs>
    <g class="a-split-original"><text x="112" y="86" text-anchor="middle">Transformer</text><rect x="8" y="97" width="208" height="189" rx="4"/></g>
    <g class="a-split-vacated"><text x="110" y="150" text-anchor="middle">Same model.</text><text x="110" y="181" text-anchor="middle">Six layers.</text><text x="110" y="212" text-anchor="middle">Three GPUs.</text></g>
    <g class="a-compute-clock"><text x="110" y="145" text-anchor="middle">One microbatch</text><text class="a-compute-time" x="110" y="189" text-anchor="middle">t = 0.0</text><text x="110" y="222" text-anchor="middle">time units</text></g>
    ${[0,1,2].map(i=>`<g class="a-split-device stage-${i}" data-gpu="${i}"><text class="a-compute-gpu-status" x="${442+i*280}" y="43" text-anchor="middle"></text><rect x="${310+i*280}" y="64" width="264" height="267" rx="4"/><text class="a-split-gpu-title" x="${442+i*280}" y="97" text-anchor="middle">GPU ${i}</text><text class="a-split-memory-label" x="${442+i*280}" y="120" text-anchor="middle">GPU memory · stage ${i+1}</text><g class="a-split-owned"><text x="${442+i*280}" y="270" text-anchor="middle">Layers ${i*2+1}–${i*2+2}</text><text class="a-split-state-label" x="${442+i*280}" y="303" text-anchor="middle">W${'₀₁₂'[i]} · g${'₀₁₂'[i]} · Adam m${'₀₁₂'[i]}, v${'₀₁₂'[i]}</text></g><text class="a-split-empty" x="${442+i*280}" y="211" text-anchor="middle">Waiting for layers</text></g>`).join('')}
    ${[0,1,2].map(i=>`<g class="a-split-layer-group stage-${i}" style="transform:translate(12px,${intactStarts[i]}px)"><rect class="a-split-part-frame" width="200" height="90" rx="3"/><text class="a-split-part-title" x="100" y="23" text-anchor="middle">Part ${i+1}</text>${[0,1].map(j=>`<rect class="a-split-layer" x="8" y="${30+j*29}" width="184" height="25" rx="2"/><text class="a-split-layer-label" x="100" y="${49+j*29}" text-anchor="middle">Transformer layer ${i*2+j+1}</text>`).join('')}</g>`).join('')}
    <g class="a-split-flow"><path class="a-split-forward" d="M442 354 H706 M722 354 H986" marker-end="url(#pipeline-forward-arrow)"/><text x="720" y="350" text-anchor="middle">activations →</text><path class="a-split-backward" d="M1002 383 H738 M722 383 H458" marker-end="url(#pipeline-backward-arrow)"/><text x="720" y="380" text-anchor="middle">← gradients</text></g>
    <g class="a-compute-transfer"><path d="M442 58 H1002"/><rect width="84" height="28" rx="3"/><text class="a-compute-packet-label" y="20" text-anchor="middle">output</text></g>
    <g class="a-compute-timeline">${['GPU 0','Send 0 → 1','GPU 1','Send 1 → 2','GPU 2'].map((label,i)=>`<g data-time-slot="${i}" transform="translate(${310+i*164},343)"><rect width="158" height="48" rx="2"/><rect class="a-compute-progress" width="0" height="48" rx="2"/><text x="79" y="20" text-anchor="middle">${['0–1','1–1.5','1.5–2.5','2.5–3','3–4'][i]}</text><text x="79" y="40" text-anchor="middle">${label}</text></g>`).join('')}</g>
  </svg><p class="a-split-status" aria-live="polite"></p>`;
  let step = 0;
  let timers = [];
  const play = n.querySelector('.a-split-play');
  const status = n.querySelector('.a-split-status');
  const groups = [...n.querySelectorAll('.a-split-layer-group')];
  const runCompute = n.querySelector('.a-compute-run');
  const pauseCompute = n.querySelector('.a-compute-pause');
  const nextCompute = n.querySelector('.a-compute-next');
  const clock = n.querySelector('.a-compute-time');
  const gpuStates = [...n.querySelectorAll('.a-split-device')];
  const slots = [...n.querySelectorAll('[data-time-slot]')];
  const packet = n.querySelector('.a-compute-transfer');
  const boundaries = [0,1,1.5,2.5,3,4];
  const phaseNotes = [
    'GPU 0 computes layers 1–2. GPU 1 waits for GPU 0’s output; GPU 2 waits for GPU 1.',
    'GPU 0 has finished. Its output is in transit: GPU 1 still waits until the activations arrive.',
    'GPU 1 has received the activations and computes layers 3–4. GPU 0 is idle; GPU 2 waits.',
    'GPU 1 has finished. Its output is in transit: GPU 2 waits until the activations arrive.',
    'GPU 2 has received the activations and computes layers 5–6. GPUs 0 and 1 are idle.',
    'Forward pass complete. For one microbatch, the three stages run in sequence, with transfer time in between.'
  ];
  const stateNames = [
    ['COMPUTING','WAIT: GPU 0 output','WAIT: GPU 1 output'],
    ['SENDING OUTPUT','RECEIVING…','WAIT: GPU 1 output'],
    ['IDLE: finished','COMPUTING','WAIT: GPU 1 output'],
    ['IDLE: finished','SENDING OUTPUT','RECEIVING…'],
    ['IDLE: finished','IDLE: finished','COMPUTING'],
    ['IDLE: finished','IDLE: finished','FORWARD DONE']
  ];
  let computeTime = null, computeRunning = false, frame = null, lastFrame = 0, lastPhase = -1;
  function pauseRun() {
    computeRunning = false;
    if (frame!==null) cancelAnimationFrame(frame);
    frame = null;
    pauseCompute.textContent = 'Resume';
  }
  function clearCompute() {
    pauseRun();computeTime=null;lastPhase=-1;
    n.dataset.computing='false';packet.style.opacity='0';
    gpuStates.forEach(g=>g.removeAttribute('data-compute-state'));
    groups.forEach(g=>g.removeAttribute('data-compute-state'));
    runCompute.textContent='Run computation';
    pauseCompute.textContent='Pause';pauseCompute.disabled=true;nextCompute.disabled=true;
  }
  function renderCompute() {
    let phase=boundaries.findIndex((end,i)=>i>0&&computeTime<end)-1;
    if (phase<0) phase=5;
    n.dataset.computing='true';
    clock.textContent=`t = ${computeTime.toFixed(1)}`;
    slots.forEach((slot,i)=>{
      const fraction=Math.max(0,Math.min(1,(computeTime-boundaries[i])/(boundaries[i+1]-boundaries[i])));
      slot.dataset.timeState=phase===i?'active':computeTime>=boundaries[i+1]?'done':'waiting';
      slot.querySelector('.a-compute-progress').setAttribute('width',String(158*fraction));
    });
    const transfer=phase===1||phase===3;
    packet.style.opacity=transfer?'1':'0';
    if (transfer) {
      const from=phase===1?442:722;
      const fraction=(computeTime-boundaries[phase])/(boundaries[phase+1]-boundaries[phase]);
      const x=from+280*fraction;
      packet.querySelector('rect').setAttribute('x',String(x-42));
      packet.querySelector('rect').setAttribute('y','44');
      packet.querySelector('text').setAttribute('x',String(x));
      packet.querySelector('text').setAttribute('y','64');
    }
    if (lastPhase!==phase) {
      lastPhase=phase;status.textContent=phaseNotes[phase];
      gpuStates.forEach((g,i)=>{
        g.querySelector('.a-compute-gpu-status').textContent=stateNames[phase][i];
        const state=phase===i*2?'active':phase<i*2?'waiting':'done';
        g.dataset.computeState=state;groups[i].dataset.computeState=state;
      });
    }
    pauseCompute.disabled=phase===5;nextCompute.disabled=phase===5;
    if (phase===5) {pauseRun();runCompute.textContent='Replay computation';}
  }
  function tick(now) {
    if (!computeRunning) return;
    computeTime=Math.min(4,computeTime+(now-lastFrame)/2000);
    lastFrame=now;renderCompute();
    if (computeRunning) frame=requestAnimationFrame(tick);
  }
  function resumeRun() {
    computeRunning=true;pauseCompute.textContent='Pause';
    lastFrame=performance.now();frame=requestAnimationFrame(tick);
  }
  runCompute.addEventListener('click',()=>{
    pauseRun();computeTime=0;lastPhase=-1;renderCompute();resumeRun();
    pauseCompute.disabled=false;nextCompute.disabled=false;
  });
  pauseCompute.addEventListener('click',()=>{if (computeRunning) pauseRun();else resumeRun();});
  nextCompute.addEventListener('click',()=>{
    pauseRun();
    computeTime=computeTime===null?0:boundaries.find(t=>t>computeTime+0.000001)??4;
    renderCompute();
  });
  function cancel() {
    timers.forEach(clearTimeout);
    timers = [];
    n.classList.remove('a-split-instant');
    play.disabled = false;
    pauseRun();
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function show(s) {
    clearCompute();
    runCompute.disabled=true;
    step = s;
    n.dataset.splitStep = String(s);
    n.dataset.splitSettled = 'false';
    n.querySelectorAll('[data-split-step]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.splitStep) === s)));
    groups.forEach((g,i) => {g.style.transform = `translate(${s===2?destinations[i]:12}px,${s===2?149:s===1?starts[i]:intactStarts[i]}px)`;});
    status.textContent = descriptions[s];
    if (s===2) {
      const settle = () => {n.dataset.splitSettled='true';status.textContent=descriptions[3];play.disabled=false;play.textContent='Replay split & distribute';runCompute.disabled=false;nextCompute.disabled=false;};
      if (reducedMotion.matches) settle(); else later(settle, 1450);
    } else play.textContent = 'Play split & distribute';
  }
  play.addEventListener('click', () => {
    cancel();
    // Restore the initial state without reverse travel before replaying.
    n.classList.add('a-split-instant');show(0);
    later(() => {n.classList.remove('a-split-instant');show(1);}, 180);
    later(() => show(2), reducedMotion.matches ? 360 : 1400);
    play.disabled = true;
  });
  n.querySelectorAll('[data-split-step]').forEach(b => b.addEventListener('click', () => {cancel();show(Number(b.dataset.splitStep));}));
  n.querySelector('.a-split-reset').addEventListener('click', () => {cancel();show(0);});
  n.querySelectorAll('button').forEach(b => b.addEventListener('keydown', e => e.stopPropagation()));
  function stopOffscreen() {cancel();if (step===2) {n.dataset.splitSettled='true';if (computeTime===null) {status.textContent=descriptions[3];nextCompute.disabled=false;}play.textContent='Replay split & distribute';runCompute.disabled=false;}}
  new MutationObserver(() => {if (!owner.classList.contains('active')) stopOffscreen();}).observe(owner, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => {if (document.hidden) stopOffscreen();});
  show(0);
}
document.dispatchEvent(new Event('viz:ready'));
