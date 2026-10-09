// Part A teaching diagrams. Scoped native controls; no changes to the shared deck engine.
const $=(s,n=document)=>n.querySelector(s);
const vals=['.2','−.1','.4','.0','.1','.3','−.2','.5','.1','.4','.0','−.3'];
function matrix(name,state,sub,iteration=0){return `<figure class="a-mat ${state}"><figcaption>${name}</figcaption><div class="a-cells">${vals.map((v,i)=>`<span>${name==='Adam v'?['.04','.01','.16','.00','.01','.09','.04','.25','.01','.16','.00','.09'][i]:iteration&&(i%3===0)?'.'+(i+1):v}</span>`).join('')}</div><small>${sub}</small></figure>`}
function batchTensors(fresh) {
 const sequences = fresh ? [[31,8,60,14,6],[72,5,19,33,2]] : [[17,42,83,26,9],[55,11,29,3,18]];
 const tokens = (row, offset, name, i) => `<div class="a-batch-token-row ${name}" role="img" aria-label="Sequence ${i+1}, ${name==='x'?'input':'next-token targets'}: ${row.slice(offset,offset+4).join(', ')}">${row.slice(offset,offset+4).map(v=>`<span>${v}</span>`).join('')}</div>`;
 return `<div class="a-batch-shape">Each tensor: <b>[B, T] = [2, 4]</b> · <b>T = 4</b> token columns</div><div class="a-batch-sequence-grid"><div class="a-batch-b-axis"><b>B = 2</b><span>rows ↓</span></div><div class="a-batch-sequence-labels"><span></span><b class="x">x · input</b><b class="y">y · next-token labels</b></div>${sequences.map((row,i)=>`<div class="a-batch-sequence ${i===0?'highlight':''}"><b class="a-sequence-name">Sequence ${i+1}</b>${tokens(row,0,'x',i)}${tokens(row,1,'y',i)}</div>`).join('')}</div><div class="a-batch-shift-note"><b>One framed row = one sequence.</b> Its <b>y</b> labels are shifted one token ahead of <b>x</b>.</div>`;
}

// An illustrative activation slice and scalar loss, with their storage lifetime.
function activationAndLoss(stage) {
 if (stage<2) return '<div class="a-activation-panel empty"><b>Activations / loss</b><br>not retained</div>';
 const state=stage===2?'write':stage===3?'read':'released';
 const values=['0.2','0.7','−0.1','0.4','0.6','0.1','0.3','−0.2'];
 return `<div class="a-activation-panel ${state}"><b>Activations h · matrix slice</b><div class="a-activation-cells" aria-label="${stage>=4?'Activation memory released':'Illustrative intermediate activation matrix with two rows and four columns'}">${values.map(v=>`<span>${stage<4?v:''}</span>`).join('')}</div><small>${stage===2?'saved for backward':stage===3?'read → consumed / released':'activation memory released'}</small><div class="a-loss-scalar"><span>Loss${stage===5?' · previous batch':''}</span><strong>0.768</strong></div><small>Illustrative values</small></div>`;
}

const stages=[
 ['Load','CPU → GPU: model parameters. No gradients or Adam moments yet.'],
 ['Batch','CPU → GPU: input and target tokens. Model remains on the GPU.'],
 ['Forward','GPU writes activations and the loss. Weights are read, not updated.'],
 ['Backward','GPU writes gradients. Backward releases saved activations as it consumes them.'],
 ['Update','GPU writes weights and Adam moments. Gradients are consumed by AdamW.'],
 ['Loop','Clear gradient references, retain W/m/v, draw a fresh batch.']
];
document.querySelectorAll('[data-a-memory]').forEach(n=>{
 let stage=Number(n.dataset.aMemory),iteration=stage>=4?1:0,batchCounter=stage===5?1:0;
 function render(){
  const w=stage===0||stage===4?'write':(stage===2||stage===3?'read':'');
  const g=stage<3||stage===5?'empty':stage===3?'write':'read';
  const opt=iteration===0?'empty':stage===4?'write':'';
  const transfer=stage===0?'parameters':stage===1||stage===5?'batch tokens':'no host transfer';
  n.innerHTML=`<div class="a-step-controls">${stages.map(([x],i)=>`<button type="button" data-stage="${i}" aria-pressed="${stage===i}">${i} ${x}</button>`).join('')}</div><div class="a-memory-layout"><div class="a-host"><b>Drive</b><p>tokenized text<br>checkpoint files</p><b>CPU RAM</b><p>sample / collate<br>pinned tensors</p><small>Dataset stays here</small></div><div class="a-transfer"><strong>${stage===0||stage===1||stage===5?'→':'·'}</strong>${transfer}</div><div class="a-gpu-memory"><h4>GPU memory <small> · one logical device</small></h4><div class="a-state-grid">${matrix('Model W',w,'FP32 weights',iteration)}${matrix('Gradient g',g,g==='empty'?'not allocated / cleared':'∂L/∂W')}${matrix('Adam m',opt,opt==='empty'?'lazy allocation':'first moment',iteration)}${matrix('Adam v',opt,opt==='empty'?'lazy allocation':'second moment',iteration)}</div><div class="a-transient"><div class="a-batch-panel ${stage===1||stage===5?'write':stage===0?'empty':''}">${stage===0?'<b>Input x / target y [B,T]</b><br>not loaded':batchTensors(batchCounter)}</div>${activationAndLoss(stage)}</div></div></div><div class="a-stage-description" aria-live="polite">${stages[stage][1]}</div>`;
  n.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const next=Number(b.dataset.stage);if(next===0){iteration=0;batchCounter=0;}if(next===4)iteration++;if(next===5||(next===1&&stage>=4))batchCounter++;stage=next;render()}));
 }
 render();
});
function controls(n){n.querySelectorAll('select,input').forEach(x=>x.addEventListener('keydown',e=>e.stopPropagation()))}
const num=v=>v.toLocaleString('en-US',{maximumFractionDigits:2});
document.querySelectorAll('[data-a-scale-model]').forEach(n=>{
 n.innerHTML='<div class="a-widget-controls"><label>Parameters <select aria-label="Model parameters"><option value="0.124">124M</option><option value="1">1B</option><option value="7">7B</option><option value="13">13B</option><option value="70" selected>70B</option></select></label><label>Activations + buffers <select aria-label="Activation allowance"><option value="4">4 GB</option><option value="8" selected>8 GB</option><option value="16">16 GB</option></select></label></div><div class="a-widget-equation"></div><div class="a-budget" aria-label="80 GB GPU memory budget"></div><div class="a-widget-result" aria-live="polite"></div><p class="a-caption">Capacity: 80 GB. Bar fills at device capacity; an overfull state is shown in red.</p>';
 function update(){const p=Number($('select',n).value),a=Number($('select[aria-label="Activation allowance"]',n).value),m=16*p;$('.a-widget-equation',n).textContent=`Weights ${num(4*p)} GB + gradients ${num(4*p)} GB + Adam ${num(8*p)} GB = ${num(m)} GB`;
 $('.a-budget',n).innerHTML=`<span style="flex:0 0 ${Math.min(100,100*m/80)}%;${m>80?'background:var(--bad)':''}">${m>9?num(m)+' GB states':''}</span><span style="flex:0 0 ${100*a/80}%">${a} GB</span>`;const out=$('.a-widget-result',n);out.classList.toggle('bad',m+a>80);out.textContent=m+a>80?`Does not fit: ${num(m+a)} GB requested / 80 GB available`:`Fits this budget: ${num(m+a)} GB / 80 GB`;}
 n.querySelectorAll('select').forEach(x=>x.addEventListener('change',update));controls(n);update();
});
import './batch-scaling-demo.js?v=20261007-deepseek4';
document.querySelectorAll('[data-a-zero]').forEach(n=>{
 n.innerHTML='<div class="a-widget-controls"><label>Sharding <select aria-label="ZeRO stage"><option value="0">Replicated</option><option value="1">ZeRO-1</option><option value="2">ZeRO-2</option><option value="3" selected>ZeRO-3</option></select></label><span>70B model · 4 GPUs</span></div><div class="a-zero-gpus"></div><div class="a-widget-result" aria-live="polite"></div>';
 function update(){const s=Number($('select',n).value),w=s===3?70:280,g=s>=2?70:280,o=s>=1?140:560;$('.a-zero-gpus',n).innerHTML=[0,1,2,3].map(i=>`<div><b>GPU ${i}</b><span>W: ${w} GB</span><span>g: ${g} GB</span><span>m + v: ${o} GB</span><strong>${w+g+o} GB</strong></div>`).join('');$('.a-widget-result',n).textContent=`Still too large for 80 GB: increase the sharding group and allow for activations.`;}
 $('select',n).addEventListener('change',update);controls(n);update();
});
document.querySelectorAll('[data-a-time]').forEach(n=>{
 n.innerHTML='<div class="a-widget-controls"><label>A100 GPUs <select aria-label="A100 GPU count"><option value="16">16</option><option value="64">64</option><option value="256">256</option><option value="1024">1,024</option><option value="2048" selected>2,048</option></select></label><label>Relative scaling efficiency <select aria-label="Scaling efficiency"><option value="1">100%</option><option value="0.75" selected>75%</option><option value="0.5">50%</option></select></label></div><div class="a-widget-result-row"><div><strong class="a-days"></strong><p>days for 70B / 1T tokens</p></div><div><strong class="a-per-memory"></strong><p>GB persistent state / GPU</p></div></div><p class="a-widget-equation">Time = 860,160 GPU-hours / (devices × relative efficiency)</p><p class="a-widget-result"></p>';
 function update(){const p=Number($('select[aria-label="A100 GPU count"]',n).value),e=Number($('select[aria-label="Scaling efficiency"]',n).value),m=1120/p;$('.a-days',n).textContent=num(860160/p/e/24);$('.a-per-memory',n).textContent=num(m);$('.a-widget-result',n).textContent=`${num(m)} GB leaves ${num(80-m)} GB for activations, gathers and buffers under ideal state sharding.`;}
 n.querySelectorAll('select').forEach(x=>x.addEventListener('change',update));controls(n);update();
});

import './pipeline-distribution.js?v=20261007-pipeline-time3';

import './next-token-shift.js?v=20261007-live-instance';

import './data-parallel-distribution.js?v=20261007-data-parallel2';
