// Data parallelism: complete replicas, distinct examples, synchronized updates.
for (const n of document.querySelectorAll('[data-a-data-parallel]')) {
  const owner = n.closest('.slide');
  if (!owner) continue; // Overview copies are not live slide instances.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const xs = [318,598,878];
  const tokens = [[17,42,83,26,9,71,12,5],[55,11,29,3,18,74,7,21],[31,8,61,2,35,4,68,10]];
  const gradients = [[.03,-.06],[.06,-.03],[.09,-.09]];
  const average = gradients[0].map((_,j)=>gradients.reduce((sum,g)=>sum+g[j],0)/3);
  const initial = [.2,-.1], updated = initial.map((w,j)=>w-.1*average[j]);
  n.innerHTML = `<div class="a-split-controls"><button type="button" class="a-split-play">Play replicate &amp; distribute</button><div class="a-split-steps" aria-label="Distribution steps"><button type="button" data-dp-step="0">1 · One model</button><button type="button" data-dp-step="1">2 · Copy model</button><button type="button" data-dp-step="2">3 · Split batch</button></div><button type="button" class="a-dp-reset">Reset</button></div>
  <div class="a-compute-controls"><button type="button" class="a-dp-run" disabled>Run training step</button><button type="button" class="a-dp-pause" disabled>Pause</button><button type="button" class="a-dp-next" disabled>Next time step</button><span class="a-dp-clock">Illustrative time units</span></div>
  <svg class="a-dp-diagram" viewBox="0 0 1152 430" preserveAspectRatio="none" role="img" aria-label="A complete six-layer model is copied to three GPUs. Two different sequences go to each GPU. All GPUs compute in parallel, average gradients, and update to identical weights.">
  <defs><marker id="data-parallel-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8" fill="var(--orange)"/></marker></defs>
  <g class="a-dp-source"><text x="122" y="73" text-anchor="middle" class="a-dp-bold">One full Transformer</text><rect x="12" y="85" width="220" height="158"/>${[0,1,2,3,4,5].map(i=>`<rect class="a-dp-layer" x="24" y="${94+i*23}" width="196" height="19"/><text x="122" y="${109+i*23}" text-anchor="middle" class="a-dp-small">Layer ${i+1}</text>`).join('')}</g>
  <text x="122" y="274" text-anchor="middle" class="a-dp-batch-source">Global batch: B = 6</text>
  <g class="a-dp-left-note"><text x="122" y="113" text-anchor="middle">Same full model</text><text x="122" y="144" text-anchor="middle">on every GPU</text><text x="122" y="198" text-anchor="middle">Different samples</text><text x="122" y="229" text-anchor="middle">on each GPU</text></g>
  ${xs.map((x,i)=>`<g class="a-dp-device" data-gpu="${i}"><text class="a-dp-device-status" x="${x+110}" y="39" text-anchor="middle">Waiting</text><rect x="${x-10}" y="54" width="240" height="300"/><text x="${x+110}" y="83" text-anchor="middle" class="a-dp-bold">GPU ${i}</text><text x="${x+110}" y="105" text-anchor="middle" class="a-dp-small">Full model + optimizer state</text><text class="a-dp-gradient" x="${x+110}" y="335" text-anchor="middle">g${i}: not computed</text></g>`).join('')}
  ${xs.map((x,i)=>`<g class="a-dp-replica" data-replica="${i}" style="transform:translate(12px,85px)"><rect width="220" height="130"/>${[0,1,2,3,4,5].map(j=>`<rect class="a-dp-layer" x="8" y="${7+j*16}" width="204" height="14"/><text x="110" y="${18+j*16}" text-anchor="middle" class="a-dp-layer-text">Layer ${j+1}</text>`).join('')}<text class="a-dp-weight" x="110" y="120" text-anchor="middle">W: [0.20, −0.10]</text></g>`).join('')}
  ${tokens.map((batch,i)=>`<g class="a-dp-batch" data-batch="${i}" style="transform:translate(12px,${286+i*44}px)"><text class="a-dp-batch-label" x="110" y="-5" text-anchor="middle">Batch ${i} · B = 2, T = 4</text>${batch.map((v,j)=>`<rect x="${(j%4)*55}" y="${Math.floor(j/4)*18}" width="53" height="17"/><text x="${27+(j%4)*55}" y="${13+Math.floor(j/4)*18}" text-anchor="middle" class="a-dp-small">${v}</text>`).join('')}</g>`).join('')}
  <g class="a-dp-network">${xs.map(x=>`<path d="M${x+110} 354 V380 H708" marker-end="url(#data-parallel-arrow)" marker-start="url(#data-parallel-arrow)"/>`).join('')}<rect x="463" y="382" width="490" height="41"/><text class="a-dp-average" x="708" y="409" text-anchor="middle">All-reduce: ḡ = (g₀ + g₁ + g₂) / 3</text>${xs.map((x,i)=>`<circle class="a-dp-packet" data-packet="${i}" r="8"/>`).join('')}</g>
  </svg>
  <div class="a-dp-timeline" aria-label="Training phases">${['Forward × 3 GPUs','Backward × 3 GPUs','Average gradients','Same update × 3 GPUs'].map((v,i)=>`<div data-dp-phase="${i}"><span class="a-dp-progress"></span><b>${i}–${i+1}</b><span>${v}</span></div>`).join('')}</div><p class="a-split-status a-dp-status" aria-live="polite"></p>`;
  // The slide fitter expands layout width as it zooms: keep SVG labels undistorted.
  const diagram=n.querySelector('.a-dp-diagram');
  new ResizeObserver(entries=>{
    const {width,height}=entries[0].contentRect;
    if(width>0&&height>0)diagram.style.setProperty('--dp-text-scale',String((height/430)/(width/1152)));
  }).observe(diagram);
  const play=n.querySelector('.a-split-play'), run=n.querySelector('.a-dp-run'), pause=n.querySelector('.a-dp-pause'), next=n.querySelector('.a-dp-next'), status=n.querySelector('.a-dp-status');
  const replicas=[...n.querySelectorAll('.a-dp-replica')], batches=[...n.querySelectorAll('.a-dp-batch')], devices=[...n.querySelectorAll('.a-dp-device')], slots=[...n.querySelectorAll('[data-dp-phase]')];
  const labels=['FORWARD','BACKWARD','SYNCHRONIZING','UPDATING','SAME UPDATED W'];
  const notes=[
    'All three GPUs compute forward on different sequences at the same time. Every GPU holds all six layers.',
    'All three GPUs compute backward in parallel. Different examples produce different local gradients.',
    'All-reduce averages the three gradients. Every GPU receives the same average before updating weights.',
    'Every GPU applies W′ = W − 0.1ḡ: [0.194, −0.094]. The three replicas stay identical.',
    'One global update is complete: 6 sequences processed across 3 GPUs, with identical updated models.'
  ];
  let step=0, timers=[], frame=null, running=false, time=null, last=0;
  const fmt=v=>v<0?'−'+Math.abs(v).toFixed(2):v.toFixed(2);
  function stop(){running=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;pause.textContent='Resume';}
  function cancel(){timers.forEach(clearTimeout);timers=[];stop();play.disabled=false;}
  function later(fn,ms){timers.push(setTimeout(fn,ms));}
  function render(){
    const phase=time===null?-1:Math.min(4,Math.floor(time));
    n.dataset.dpPhase=String(phase);
    n.querySelector('.a-dp-clock').textContent=time===null?'Illustrative time units':`t = ${time.toFixed(1)} · illustrative time units`;
    devices.forEach((g,i)=>{
      g.querySelector('.a-dp-device-status').textContent=phase<0?(step===2?'Ready: local B = 2':'Waiting'):labels[phase];
      const vec=phase>=3?average:gradients[i];
      g.querySelector('.a-dp-gradient').textContent=phase<1?`g${i}: not computed`:`${phase>=3?'ḡ':'g'+i}: [${vec.map(fmt).join(', ')}]`;
      replicas[i].querySelector('.a-dp-weight').textContent=phase>=3?`W′: [${updated.map(v=>v<0?'−'+Math.abs(v).toFixed(3):v.toFixed(3)).join(', ')}]`:'W: [0.20, −0.10]';
    });
    slots.forEach((slot,i)=>{
      slot.dataset.phaseState=phase===i?'active':phase>i?'done':'waiting';
      slot.querySelector('.a-dp-progress').style.width=`${time===null?0:Math.max(0,Math.min(1,time-i))*100}%`;
    });
    const synchronizing=phase===2;
    n.querySelector('.a-dp-average').textContent=phase>=3?'Same ḡ on every GPU: [0.06, −0.06]':'All-reduce: ḡ = (g₀ + g₁ + g₂) / 3';
    n.querySelectorAll('.a-dp-packet').forEach((p,i)=>{
      const fraction=synchronizing?time-2:0;
      // Both directions are conceptual all-reduce traffic, not a centralized topology.
      const a=fraction<.5?fraction*2:(1-fraction)*2;
      p.setAttribute('cx',String(xs[i]+110+(708-xs[i]-110)*a));
      p.setAttribute('cy',String(354+26*Math.min(1,a*4)));p.style.opacity=synchronizing&&!reduced.matches?'1':'0';
    });
    if(phase>=0)status.textContent=notes[phase];
    pause.disabled=phase<0||phase===4;next.disabled=step!==2||phase===4;
    if(phase===4){stop();run.textContent='Replay training step';}
  }
  function show(s){
    stop();time=null;step=s;n.dataset.dpStep=String(s);n.dataset.dpSettled=String(s===2&&reduced.matches);
    run.disabled=s!==2;run.textContent='Run training step';pause.textContent='Pause';
    n.querySelectorAll('[data-dp-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.dpStep)===s)));
    replicas.forEach((g,i)=>g.style.transform=`translate(${s===0?12:xs[i]}px,${s===0?85:117}px)`);
    batches.forEach((g,i)=>g.style.transform=`translate(${s===2?xs[i]:12}px,${s===2?279:286+i*44}px)`);
    status.textContent=['Start with one complete six-layer model and a global batch of six sequences.','Copy all six layers and the same initial weights to every GPU. The model is replicated, not partitioned.','Split the global batch into three local batches. Each GPU receives two different sequences.'][s];
    render();
    if(s===2&&!reduced.matches){run.disabled=true;next.disabled=true;later(()=>{n.dataset.dpSettled='true';run.disabled=false;next.disabled=false;play.disabled=false;},1000);}
  }
  play.addEventListener('click',()=>{
    cancel();n.classList.add('a-dp-instant');show(0);
    later(()=>{n.classList.remove('a-dp-instant');show(1);},150);
    later(()=>show(2),reduced.matches?300:1400);play.disabled=true;
    if(reduced.matches)later(()=>{play.disabled=false;},350);
  });
  n.querySelectorAll('[data-dp-step]').forEach(b=>b.addEventListener('click',()=>{cancel();show(Number(b.dataset.dpStep));}));
  n.querySelector('.a-dp-reset').addEventListener('click',()=>{cancel();show(0);});
  function tick(now){if(!running)return;time=Math.min(4,time+(now-last)/2100);last=now;render();if(running)frame=requestAnimationFrame(tick);}
  function resume(){running=true;pause.textContent='Pause';last=performance.now();frame=requestAnimationFrame(tick);}
  run.addEventListener('click',()=>{stop();time=0;render();if(!reduced.matches)resume();});
  pause.addEventListener('click',()=>{if(running)stop();else resume();});
  next.addEventListener('click',()=>{stop();time=time===null?0:Math.min(4,Math.floor(time)+1);render();});
  n.querySelectorAll('button').forEach(b=>b.addEventListener('keydown',e=>e.stopPropagation()));
  function offscreen(){if(!owner.classList.contains('active')||document.hidden){cancel();if(step===2){n.dataset.dpSettled='true';run.disabled=false;next.disabled=time!==4;}}}
  new MutationObserver(offscreen).observe(owner,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',offscreen);
  show(0);
}
document.dispatchEvent(new Event('viz:ready'));
