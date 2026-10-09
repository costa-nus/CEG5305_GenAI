// Reveal the causal prefix and its next-token target, left to right.
for (const root of document.querySelectorAll('[data-a-next-token-shift]')) {
  const owner=root.closest('.slide');
  if (!owner) continue; // Overview copies are not live slide instances.
  const tokens = [17,42,83,26,9,71];
  const total = tokens.length-1;
  root.innerHTML = `<div class="a-next-controls"><button type="button" data-next-play>Play left → right</button><button type="button" data-next-step>Next position</button><button type="button" data-next-reset>Reset</button><span data-next-counter></span></div>
  <svg class="a-next-diagram" viewBox="0 0 1152 260" role="img" aria-label="Input tokens 17, 42, 83, 26, 9 align with next-token targets 42, 83, 26, 9, 71. Each target is one token ahead in the original sequence.">
   <defs><marker id="next-token-target-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#ae762b"/></marker></defs>
   <text class="a-next-label" x="0" y="47">Sequence</text>
   <text class="a-next-label" x="0" y="120">Input x</text>
   <text class="a-next-label" x="0" y="218">Target y</text>
   <g class="a-next-source">${tokens.map((v,i)=>`<g data-source-token="${i}" transform="translate(${170+i*155},15)"><rect width="116" height="48" rx="3"/><text x="58" y="33" text-anchor="middle">${v}</text></g>`).join('')}</g>
   <g class="a-next-input">${tokens.slice(0,-1).map((v,i)=>`<g data-input-token="${i}" transform="translate(${170+i*155},88)"><rect width="116" height="48" rx="3"/><text x="58" y="33" text-anchor="middle">${v}</text></g>`).join('')}</g>
   <g class="a-next-target">${tokens.slice(1).map((v,i)=>`<g data-target-token="${i}" transform="translate(${170+i*155},188)"><rect width="116" height="48" rx="3"/><text x="58" y="33" text-anchor="middle">${v}</text></g>`).join('')}</g>
   ${tokens.slice(1).map((v,i)=>`<path data-target-arrow="${i}" d="M${228+i*155} 144 V179" marker-end="url(#next-token-target-arrow)"/>`).join('')}
   <rect class="a-next-position-frame" x="164" y="82" width="128" height="160" rx="4"/>
  </svg>
  <div class="a-next-readout a-next-training-flow" aria-live="polite">
    <div class="a-next-prefix-box"><span>Input x · given the prefix</span><strong data-next-prefix></strong></div>
    <b class="a-next-forward a-next-input-arrow" aria-hidden="true">→</b>
    <div class="a-next-model">LLM<small>nanoGPT</small></div>
    <b class="a-next-forward a-next-logits-arrow" aria-hidden="true">→</b>
    <div class="a-next-logits"><strong>Logits</strong><span>Scores over V tokens · [B,T,V]</span></div>
    <b class="a-next-forward a-next-loss-arrow" aria-hidden="true">→</b>
    <div class="a-next-loss"><strong>Loss</strong><span>Cross entropy</span></div>
    <div class="a-next-answer"><span>Target y · correct next token</span><strong data-next-answer></strong></div>
    <b class="a-next-forward a-next-target-arrow" aria-hidden="true">→</b>
  </div>
  <p class="a-next-rule">The LLM reads x; compare its logits with target y to compute the loss.</p>`;
  let position = 0, timer = null;
  const play = root.querySelector('[data-next-play]');
  const next = root.querySelector('[data-next-step]');
  function render() {
    root.querySelectorAll('[data-source-token]').forEach(el=>{
      const i=Number(el.dataset.sourceToken);
      el.classList.toggle('prefix',i<=position);
      el.classList.toggle('target',i===position+1);
    });
    root.querySelectorAll('[data-input-token]').forEach(el=>el.classList.toggle('prefix',Number(el.dataset.inputToken)<=position));
    root.querySelectorAll('[data-target-token]').forEach(el=>el.classList.toggle('target',Number(el.dataset.targetToken)===position));
    root.querySelectorAll('[data-target-arrow]').forEach(el=>el.classList.toggle('active',Number(el.dataset.targetArrow)===position));
    root.querySelector('.a-next-position-frame').setAttribute('x',String(164+155*position));
    root.querySelector('[data-next-prefix]').textContent=tokens.slice(0,position+1).join(', ');
    root.querySelector('[data-next-answer]').textContent=tokens[position+1];
    root.querySelector('[data-next-counter]').textContent=`Position ${position+1} of ${total}`;
    next.disabled=position===total-1;
  }
  function stop() {
    if(timer!==null)clearInterval(timer);
    timer=null;play.textContent='Play left → right';play.setAttribute('aria-pressed','false');
  }
  play.addEventListener('click',()=>{
    if(timer!==null){stop();return;}
    if(position===total-1)position=0;
    render();play.textContent='Pause';play.setAttribute('aria-pressed','true');
    timer=setInterval(()=>{position++;render();if(position===total-1)stop();},1700);
  });
  next.addEventListener('click',()=>{stop();if(position<total-1)position++;render();});
  root.querySelector('[data-next-reset]').addEventListener('click',()=>{stop();position=0;render();});
  root.querySelectorAll('button').forEach(el=>{
    el.addEventListener('click',e=>e.stopPropagation());
    el.addEventListener('keydown',e=>e.stopPropagation());
  });
  new MutationObserver(()=>{if(!owner.classList.contains('active'))stop();}).observe(owner,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  render();
}
