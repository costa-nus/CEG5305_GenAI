// Classroom comparison using the same GPT-2 small export as the session 1 demo.
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const MODEL = 'Xenova/gpt2';
const tasks = [
  {id:'translation', title:'Translation · English → French', prompt:'Translate English to French:\nsea otter => loutre de mer\npeppermint => menthe poivrée\nplush giraffe => girafe peluche\ncheese =>', answer:'fromage'},
  {id:'calculation', title:'Calculation · five-digit addition', prompt:'19583 + 29534 = 49117\n98394 + 49384 = 147778\n29382 + 12347 = 41729\n93847 + 39299 =', answer:'133146'}
];
const css = document.createElement('link');
css.rel = 'stylesheet'; css.href = './icl-comparison.css?v=20261007'; document.head.append(css);
document.body.classList.add('icl-mode');
const main = document.querySelector('main');
main.innerHTML = `<div class="icl-controls"><button id="icl-load" class="primary">Load GPT-2 small</button><button id="icl-run" disabled>Run both tasks</button><button id="icl-reveal" aria-expanded="false">Reveal reference answers</button><span>124M · greedy · 12 new tokens · no weight updates</span></div><div class="icl-panels"></div><p id="icl-status" role="status">First model load: about 130 MB, cached afterwards. Edit either prompt and rerun.</p>`;
const panels = main.querySelector('.icl-panels');
for (const task of tasks) {
  const panel = document.createElement('section'); panel.className = 'icl-panel';
  panel.innerHTML = `<div class="icl-panel-head"><h2>${task.title}</h2><button id="icl-run-${task.id}" disabled>Run this task</button></div><label for="icl-prompt-${task.id}">Input · three examples + new query</label><textarea id="icl-prompt-${task.id}" spellcheck="false"></textarea><div class="icl-output-label">GPT-2 continuation · live output</div><pre id="icl-output-${task.id}" aria-live="polite">Not run yet.</pre><p class="icl-reference" hidden>Reference answer: <b>${task.answer}</b></p>`;
  panel.querySelector('textarea').value = task.prompt; panels.append(panel);
}
const status = main.querySelector('#icl-status');
const loadButton = main.querySelector('#icl-load');
const runButton = main.querySelector('#icl-run');
let gen = null, TextStreamer = null, busy = false;
const say = (text, error=false) => { status.textContent=text; status.classList.toggle('err',error); };
function buttons() {
  loadButton.disabled = busy || !!gen;
  runButton.disabled = busy || !gen;
  for (const task of tasks) main.querySelector(`#icl-run-${task.id}`).disabled = busy || !gen;
}
async function load() {
  busy=true; buttons(); say('Loading the library…');
  try {
    const T = await import(LIB); TextStreamer=T.TextStreamer;
    const files={};
    gen=await T.pipeline('text-generation', MODEL, {
      dtype:'q8', model_file_name:'decoder_model_merged', device:'wasm',
      progress_callback: p => {
        if (p.status !== 'progress' || !p.total) return;
        files[p.file]=[p.loaded,p.total];
        const [a,b]=Object.values(files).reduce(([x,y],[l,t])=>[x+l,y+t],[0,0]);
        say(`Loading GPT-2 small: ${(a/1e6).toFixed(0)} of ${(b/1e6).toFixed(0)} MB`);
      }
    });
    loadButton.textContent='GPT-2 loaded'; say('Ready. Run both tasks, then compare the actual continuations with the reference answers.');
  } catch(e) { say(`Could not load GPT-2: ${e.message}. Retry Load GPT-2 small.`,true); }
  finally { busy=false; buttons(); }
}
async function run(selected) {
  if (!gen || busy) return;
  busy=true; buttons(); const started=performance.now();
  try {
    for (const task of selected) {
      const prompt=main.querySelector(`#icl-prompt-${task.id}`).value.trimEnd();
      if (!prompt.trim()) throw new Error(`${task.title}: enter a prompt first.`);
      const output=main.querySelector(`#icl-output-${task.id}`); output.textContent='';
      say(`Generating ${task.title.toLowerCase()}…`);
      const streamer=new TextStreamer(gen.tokenizer, {skip_prompt:true,skip_special_tokens:true,callback_function:text=>{output.textContent=(output.textContent+text).trimStart();}});
      await gen(prompt,{max_new_tokens:12,do_sample:false,streamer});
      if (!output.textContent.trim()) output.textContent='[No text generated]';
    }
    say(`Finished in ${((performance.now()-started)/1000).toFixed(1)} s. These are actual model outputs; GPT-2 small may fail either task.`);
  } catch(e) { say(`Generation failed: ${e.message}. You can retry.`,true); }
  finally { busy=false; buttons(); }
}
loadButton.addEventListener('click',load);
runButton.addEventListener('click',()=>run(tasks));
for (const task of tasks) main.querySelector(`#icl-run-${task.id}`).addEventListener('click',()=>run([task]));
main.querySelector('#icl-reveal').addEventListener('click',e=>{
  const expanded=e.currentTarget.getAttribute('aria-expanded')==='true';
  e.currentTarget.setAttribute('aria-expanded',String(!expanded));
  e.currentTarget.textContent=expanded?'Reveal reference answers':'Hide reference answers';
  for(const answer of main.querySelectorAll('.icl-reference')) answer.hidden=expanded;
});
