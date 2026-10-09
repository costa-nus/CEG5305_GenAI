// Illustrative capacity model: two work boxes, two sample positions per box.
export function batchSchedule(sequences, batch, capacity = 4) {
  if (batch > capacity) return {fits:false, steps:null, stepTime:null, time:null};
  const steps = Math.ceil(sequences / batch);
  return {fits:true, steps, stepTime:1, time:steps};
}
for (const n of document.querySelectorAll('[data-a-scale-data]')) {
  n.innerHTML = `<div class="a-batch-toolbar">
    <label>Dataset <select aria-label="Demo dataset size"><option value="24">24 samples</option><option value="48">48 samples</option></select></label>
    <label>Compare Batch Size = <select aria-label="Demo larger batch"><option value="2">2</option><option value="4" selected>4</option><option value="8">8</option></select></label>
    <button type="button" data-race>Run both</button><button type="button" data-reset>Reset</button>
  </div><div class="a-batch-racers"></div>
  <div class="a-batch-timelines" role="img" aria-label="Training time comparison"></div>
  <div class="a-batch-verdict" aria-live="polite"></div>
  <p class="a-batch-note">Same model + same tokens ≈ same model FLOPs. More samples per update require more batch and activation memory.</p>`;
  const find = s => n.querySelector(s);
  let samples, batch, schedules, clock=0, frame=0, running=false, start=0;
  function stop() {cancelAnimationFrame(frame);running=false;find('[data-race]').textContent='Run both';}
  function box(index, extra=false) {return `<div class="a-batch-workbox ${extra?'overflow-box':''}"><b>${extra?'Extra':'Work'} box ${index+1}</b><div>${[0,1].map(j=>`<span data-slot="${index*2+j}"></span>`).join('')}</div></div>`;}
  function draw() {
    stop();clock=0;
    samples=Number(find('[aria-label="Demo dataset size"]').value);
    batch=Number(find('[aria-label="Demo larger batch"]').value);
    schedules=[batchSchedule(samples,1),batchSchedule(samples,batch)];
    find('[data-race]').textContent=schedules[1].fits?'Run both':'Run Batch Size = 1';
    find('.a-batch-racers').innerHTML=[1,batch].map((b,k)=>`<div class="a-batch-racer ${k?'large':'small'} ${schedules[k].fits?'':'blocked'}" data-lane="${k}">
      <div class="a-batch-heading"><strong>Batch Size = ${b}</strong><span>${schedules[k].fits?`${schedules[k].steps} updates`:'Does not fit'}</span></div>
      <div class="a-batch-dataset" aria-label="${samples} equal-length samples">${Array.from({length:samples},(_,i)=>`<i data-sequence="${i}">${i+1}</i>`).join('')}</div>
      <div class="a-batch-transfer"><span class="a-batch-progress"></span><b>↓ ${b} ${b===1?'sample':'samples'}/update</b></div>
      <div class="a-batch-gpu"><div class="a-batch-gpu-label"><b>Same GPU</b><small>fixed W / g / m / v</small></div><div class="a-batch-slots">${box(0)}${box(1)}</div><p><b>Capacity: 4 samples</b> · 2 per work box</p></div>
      <div class="a-batch-overflow">${schedules[k].fits?`<span>Fits: ${b} / 4 sample positions used.</span>`:`<b>Needs 4 boxes; only 2 fit on this GPU.</b><div class="a-batch-extra-boxes">${box(2,true)}${box(3,true)}</div>`}</div>
      <div class="a-batch-foot"><span>Batch + activations <b>${b}×</b></span><span class="a-batch-complete"></span></div>
    </div>`).join('');
    find('.a-batch-timelines').innerHTML=[1,batch].map((b,k)=>`<div class="a-batch-time-row"><b>Batch Size = ${b}</b><div class="a-batch-time-axis">${schedules[k].fits?`<span class="a-batch-duration ${k?'large':''}" style="width:${100*schedules[k].time/schedules[0].time}%"><i></i></span>`:'<span class="a-batch-no-run">Out of memory — cannot run</span>'}</div><strong>${schedules[k].fits?schedules[k].time+' units':'—'}</strong></div>`).join('');
    find('.a-batch-verdict').textContent=schedules[1].fits?`${batch}× faster in this illustration: fill idle GPU capacity.`:'Batch Size = 8 exceeds available memory. A larger batch helps only while it fits.';
    find('.a-batch-timelines').setAttribute('aria-label',`Batch Size = 1: ${schedules[0].time} time units. Batch Size = ${batch}: ${schedules[1].fits?schedules[1].time+' time units':'does not fit; no training time'}.`);
    paint();document.dispatchEvent(new Event('viz:ready'));
  }
  function paint() {
    n.querySelectorAll('[data-lane]').forEach((lane,k)=>{
      const b=k?batch:1, schedule=schedules[k];
      const finished=schedule.fits?Math.min(schedule.steps,Math.floor(clock+1e-7)):0;
      const done=Math.min(samples,finished*b), complete=done===samples;
      lane.querySelectorAll('[data-sequence]').forEach(cell=>{const i=Number(cell.dataset.sequence);cell.classList.toggle('done',i<done);cell.classList.toggle('in-batch',!complete&&i>=done&&i<done+b);});
      lane.querySelectorAll('[data-slot]').forEach(slot=>{
        const i=Number(slot.dataset.slot), valid=!complete&&i<b;
        slot.classList.toggle('busy',valid);slot.textContent=valid?`S${done+i+1}`:(complete?'done':'idle');
      });
      lane.querySelector('.a-batch-progress').textContent=`${done} / ${samples} samples processed`;
      lane.querySelector('.a-batch-complete').textContent=!schedule.fits?'✕ Out of memory':complete?'✓ Finished':`Update ${finished+1} / ${schedule.steps}`;
      lane.classList.toggle('finished',complete);
      const progress=n.querySelectorAll('.a-batch-time-row')[k].querySelector('.a-batch-duration i');
      if(progress)progress.style.width=`${100*Math.min(clock,schedule.time)/schedule.time}%`;
    });
  }
  find('[data-race]').onclick=()=>{
    if(running){stop();find('[data-race]').textContent='Resume';return;}
    if(clock>=schedules[0].time){clock=0;paint();}
    running=true;start=performance.now()-clock*400;find('[data-race]').textContent='Pause';
    function tick(now){
      if(!n.closest('.slide').classList.contains('active')||document.hidden){stop();return;}
      clock=Math.min(schedules[0].time,(now-start)/400);paint();
      if(clock>=schedules[0].time){stop();find('[data-race]').textContent='Replay';}else frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  };
  find('[data-reset]').onclick=()=>{draw();};
  n.querySelectorAll('select').forEach(s=>s.addEventListener('change',draw));
  n.addEventListener('keydown',e=>{if(e.target.matches('select,button'))e.stopPropagation();});
  window.addEventListener('hashchange',()=>{if(!n.closest('.slide').classList.contains('active'))stop();});
  draw();
}
// Compare the per-GPU illustration with a cited global-batch training recipe.
for(const n of document.querySelectorAll('[data-a-batch-days]')) {
  n.innerHTML=`<div class="a-days-comparison"><div class="a-days-toy"><h3>Illustration · one GPU</h3><div class="a-widget-controls"><label>Tokens D <select aria-label="Training dataset tokens"><option value="1000000000">1 billion</option><option value="100000000000">100 billion</option><option value="1000000000000" selected>1 trillion</option></select></label><label>Seconds/update <input aria-label="Seconds per optimizer update" type="number" min="0.01" max="60" step="0.1" value="1"></label></div><p class="a-days-context">T = 2,048 tokens/sample · capacity = 4 samples</p><p class="a-days-equation"></p><table class="a-table a-batch-days-table"><thead><tr><th>Batch Size<br>per GPU</th><th>Updates</th><th>Days</th></tr></thead><tbody></tbody></table><p class="a-batch-days-takeaway"></p><p class="a-days-assumption">Assume equal seconds/update for fitting batches. Real timings and convergence depend on the training setup.</p></div><aside class="a-deepseek-recipe"><p class="a-recipe-label">PAPER RECIPE · DEEPSEEK-V3</p><h3>Global Batch Size = <strong>15,360</strong></h3><p class="a-recipe-unit">sequences per optimizer update across the cluster</p><p class="a-recipe-ramp">Ramp <b>3,072 → 15,360</b> over the first 469B tokens; then keep 15,360.</p><dl class="a-recipe-facts"><div><dt>Training data</dt><dd>14.8 trillion tokens</dd></div><div><dt>Sequence length</dt><dd>4,096 tokens</dd></div><div><dt>Tokens / global update</dt><dd>≈62.9 million</dd></div><div><dt>Training cluster</dt><dd>2,048 H800 GPUs</dd></div></dl><p class="a-recipe-distributed"><b>Global batch spans the cluster.</b> Pipeline + expert parallelism + ZeRO-1; FP8 mixed precision.</p><div class="a-recipe-days"><strong>≈54.2 days</strong><span>Pretraining: 2,664,000 H800 GPU-hours<br>÷ 2,048 GPUs ÷ 24 h/day</span></div><p class="a-recipe-note">Days are derived from reported GPU-hours. Context extension and post-training are additional.</p></aside></div>`;
  function update(){
    const d=Number(n.querySelector('select').value),t=2048,seconds=Number(n.querySelector('input').value);
    if(!Number.isFinite(seconds)||seconds<=0)return;
    const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:1});
    n.querySelector('.a-days-equation').textContent=`Days = ⌈D / (B × T)⌉ × ${fmt(seconds)} s / 86,400`;
    n.querySelector('tbody').innerHTML=[1,2,4,8].map(b=>`<tr class="${b===8?'a-days-oom':''}"><td><b>Batch Size = ${b}</b></td><td>${b===8?'—':fmt(Math.ceil(d/(b*t)))}</td><td><b>${b===8?'Does not fit':fmt(Math.ceil(d/(b*t))*seconds/86400)}</b></td></tr>`).join('');
    n.querySelector('.a-batch-days-takeaway').textContent=`Batch Size = 1 → 4: ${fmt(Math.ceil(d/t)*seconds/86400)} → ${fmt(Math.ceil(d/(4*t))*seconds/86400)} days.`;
    document.dispatchEvent(new Event('viz:ready'));
  }
  n.querySelectorAll('select,input').forEach(x=>{x.addEventListener('input',update);x.addEventListener('keydown',e=>e.stopPropagation());});update();
}
