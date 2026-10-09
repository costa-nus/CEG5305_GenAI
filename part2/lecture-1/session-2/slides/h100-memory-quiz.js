// One shared specification drives the question, comparison and classroom poll.
const SPEC = await fetch('./h100-memory-quiz.json?v=20261007-activations', {cache:'no-store'}).then(r => {
  if (!r.ok) throw Error('Cannot load the H100 memory exercise');
  return r.json();
});
const KEY = 'ceg5305-h100-classroom-room';
const API = `http://${['127.0.0.1','localhost'].includes(location.hostname) ? location.hostname : '127.0.0.1'}:8001`;
async function ensurePollServer() {
  try {
    const r = await fetch('/api/classroom/server/start', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(6000)});
    if (!r.ok) throw Error('Start the lecture with python3 tools/course_server.py to enable this button.');
    const data = await r.json();
    if (!data.running) throw Error(data.error || 'Could not start the poll server.');
    return data;
  } catch (error) {
    // A separately launched classroom_poll.py also remains supported.
    try {const data = await api('/api/config'); if (data.service==='ceg5305-classroom-poll') return {running:true,...data};} catch {}
    throw error;
  }
}
async function stopPollServer() {
  const r = await fetch('/api/classroom/server/stop', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(6000)});
  if (r.status === 404) return api('/api/server/stop', null, {});
  const data = await r.json();
  if (!r.ok || data.running) throw Error(data.error || 'Could not stop the poll server.');
  return data;
}
function totals(o) {
  const weights = SPEC.bytes_per_parameter / 4 * o.parameters_b, gradients = weights, adam = 2 * weights;
  const activations = SPEC.activation_gb_per_sequence[String(o.parameters_b)] * o.batch;
  return {weights, gradients, adam, activations, buffers: SPEC.buffer_gb,
    total: weights + gradients + adam + activations + SPEC.buffer_gb};
}
function savedRoom() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function saveRoom(room) { try { localStorage.setItem(KEY, JSON.stringify(room)); } catch {} }
async function api(path, room, body) {
  const r = await fetch(API + path, {method: body ? 'POST' : 'GET',
    headers: {...(body ? {'Content-Type':'application/json'} : {}), ...(room ? {'X-Poll-Admin':room.admin} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(5000)});
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'The classroom poll is unavailable');
  return data;
}
function resultsHTML(data) {
  return SPEC.options.map(o => `<div class="h100-vote-result"><b>${o.id}</b><span style="--votes:${data.total ? 100*data.counts[o.id]/data.total : 0}%"></span><strong>${data.counts[o.id]} <small>(${data.total ? Math.round(100*data.counts[o.id]/data.total) : 0}%)</small></strong></div>`).join('');
}
document.querySelectorAll('[data-h100-question]').forEach(n => {
  n.innerHTML = `<div class="h100-question-layout"><div class="h100-question-main"><p class="h100-select-all">Select all that fit.</p><div class="h100-options" role="group" aria-label="Four possible training configurations">${SPEC.options.map(o => `<div class="h100-option"><b>${o.id}</b><div><strong>${o.parameters_b}B parameters</strong><span>Batch: ${o.batch} ${o.batch===1?'sequence':'sequences'}</span></div></div>`).join('')}</div></div><aside class="h100-poll"><p class="h100-poll-kicker">CLASSROOM POLL</p><div class="h100-poll-launch"><button type="button" data-server>Start poll server</button><button type="button" data-start>New poll</button></div><div class="h100-join" hidden><img class="h100-qr" alt="Scan to join this classroom poll"><div class="h100-join-info"><small>Scan to vote · same network</small><a target="_blank" rel="noopener"></a><button type="button" data-copy>Copy join link</button><p class="h100-poll-status" role="status">Select all configurations that fit.</p></div></div><p class="h100-server-status" role="status">Start the server, then open a new poll.</p><div class="h100-poll-actions" hidden><button type="button" data-close>Close voting</button><button type="button" data-results>Show results</button></div><div class="h100-poll-results" hidden></div><details class="h100-poll-help"><summary>Poll setup</summary><p>Click <b>Start poll server</b> to start or reconnect. <b>New poll</b> creates an empty room and a new QR code; it also starts the server if needed. Students scan the code on the same network. <b>Close voting</b> stops the poll server and releases its port; results remain on the slide. <b>Reopen voting</b> starts the server again.</p><p>After reboot, start the local lecture site once:</p><code>python3 tools/course_server.py</code><p>Run from the course site folder. If campus Wi-Fi isolates devices, use a shared hotspot.</p></details></aside></div>`;
  const assumptions = n.closest(".slide").querySelector(".h100-assumptions");
  if (assumptions) n.querySelector(".h100-question-main").prepend(assumptions);
  const hardware = n.closest(".slide").querySelector(".h100-hardware");
  if (hardware) n.querySelector(".h100-poll").prepend(hardware);
  let room = savedRoom(), open = room?.snapshot?.open ?? true, revealed = false, busy = false;
  const find = s => n.querySelector(s), status = find('.h100-server-status'), voteStatus = find('.h100-poll-status');
  function setHint(show) {
    if (!assumptions) return;
    const hint=assumptions.querySelector('[data-h100-hint]');
    if(hint && hint.hidden===show){hint.hidden=!show;document.dispatchEvent(new Event('viz:ready'));}
  }
  setHint(!open);
  function showStopped() {
    status.textContent = 'Voting closed · poll server stopped · port 8001 released';
    voteStatus.textContent = `${room.snapshot?.total ?? 0} responses · voting closed`;
    find('[data-server]').textContent = 'Start poll server';
    find('[data-close]').textContent = 'Reopen voting';
    find('.h100-join').hidden = true;
    if (room.snapshot) find('.h100-poll-results').innerHTML = resultsHTML(room.snapshot);
    setHint(true);
  }
  function showJoin() {
    find('.h100-join').hidden = !room || !!room.stopped;
    find('.h100-poll-actions').hidden = !room;
    if (room) {
      const a = find('.h100-join a'); a.href = room.join_url; a.textContent = room.join_url.replace(/^https?:\/\//,'');
      const qr = find('.h100-qr');
      if (qr.dataset.join !== room.join_url) {
        qr.dataset.join = room.join_url;
        qr.src = API + '/api/rooms/' + room.id + '/qr.svg?v=' + encodeURIComponent(room.join_url);
      }
    }
  }
  async function refresh() {
    if (!room || busy) return;
    if (room.stopped) {showStopped(); return room.snapshot;}
    try {
      const data = await api('/api/rooms/'+room.id, room); open = data.open;
      setHint(!open);
      if (data.join_url && data.join_url !== room.join_url) {room.join_url=data.join_url;saveRoom(room);showJoin();}
      status.textContent = 'Server running · link and QR refresh automatically';
      voteStatus.textContent = `${data.total} ${data.total===1?'response':'responses'} · ${open?'voting open':'voting closed'}`;
      find('[data-server]').textContent = 'Reconnect server';
      find('[data-close]').textContent = open ? 'Close voting' : 'Reopen voting';
      find('.h100-poll-results').innerHTML = resultsHTML(data);
      room.snapshot = data; saveRoom(room);
      return data;
    } catch {
      setHint(false);
      status.textContent = 'Server offline. Click Start poll server to reconnect.';
      find('[data-server]').textContent = 'Start poll server';
      voteStatus.textContent = 'Waiting for the poll server…';
    }
  }
  async function newRoom() {
    room = await api('/api/rooms', null, {}); saveRoom(room); revealed = false; setHint(false);
    find('.h100-poll-results').hidden = true; find('[data-results]').textContent = 'Show results';
    showJoin();
  }
  async function launch(createNew) {
    busy = true; find('[data-server]').disabled = true; find('[data-start]').disabled = true;
    status.textContent = 'Connecting to the poll server…';
    try {
      await ensurePollServer();
      if (createNew || !room) await newRoom();
      else {
        try {await api('/api/rooms/'+room.id, room);} catch {await newRoom();}
      }
      room.stopped = false; saveRoom(room);
      // Retry an image that failed while the service was stopped.
      find('.h100-qr').dataset.join = '';
      showJoin();
      busy = false; await refresh();
    } catch(e) {status.textContent=e.message || 'Could not start the server. See Poll setup.';}
    finally {busy = false; find('[data-server]').disabled = false; find('[data-start]').disabled = false;document.dispatchEvent(new Event('viz:ready'));}
  }
  find('[data-server]').onclick = () => launch(false);
  find('[data-start]').onclick = () => launch(true);
  find('[data-close]').onclick = async () => {
    if (busy || !room) return;
    busy = true; find('[data-close]').disabled = true;
    try {
      if (open) {
        await api('/api/rooms/'+room.id+'/state', room, {open:false});
        room.snapshot = await api('/api/rooms/'+room.id, room);
        open = false; saveRoom(room);
        find('.h100-poll-results').innerHTML = resultsHTML(room.snapshot); setHint(true);
        await stopPollServer();
        room.stopped = true; saveRoom(room); showStopped();
      } else {
        await ensurePollServer();
        await api('/api/rooms/'+room.id+'/state', room, {open:true});
        room.stopped = false; saveRoom(room); showJoin();
        busy = false; await refresh();
      }
    }
    catch(e) {status.textContent = e.message;}
    finally {busy = false; find('[data-close]').disabled = false; document.dispatchEvent(new Event('viz:ready'));}
  };
  find('[data-results]').onclick = () => {
    revealed = !revealed; find('.h100-poll-results').hidden = !revealed;
    find('[data-results]').textContent = revealed ? 'Hide results' : 'Show results';
    document.dispatchEvent(new Event('viz:ready'));
  };
  find('[data-copy]').onclick = async () => {
    try {await navigator.clipboard.writeText(room.join_url); voteStatus.textContent = 'Join link copied.';}
    catch {voteStatus.textContent = 'Select the join link to copy it.';}
  };
  find('.h100-qr').addEventListener('load',()=>{find('.h100-qr').hidden=false;document.dispatchEvent(new Event('viz:ready'));});
  find('.h100-qr').addEventListener('error',()=>{find('.h100-qr').hidden=true;if (!room?.stopped) status.textContent='QR unavailable. Click Start poll server to reconnect.';});
  n.addEventListener('keydown', e => {if(e.target.matches('button,input,summary')) e.stopPropagation();});
  showJoin(); refresh();
  window.addEventListener('hashchange',()=>{if(n.closest('.slide').classList.contains('active')) refresh();});
  setInterval(() => {if(n.closest('.slide').classList.contains('active')) refresh();}, 2000);
});
document.querySelectorAll('[data-h100-comparison]').forEach(n => {
  n.innerHTML = `<div class="h100-comparison-legend"><span class="weights">Weights</span><span class="gradients">Gradients</span><span class="adam">Adam m + v</span><span class="activations">Activations + batch</span><span class="buffers">Buffers</span></div><div class="h100-memory-rows">${SPEC.options.map(o => {
    const t = totals(o), fit = t.total <= SPEC.capacity_gb;
    return `<div class="h100-memory-row ${fit?'fits':'over'}"><div class="h100-row-label"><b>${o.id}</b><span>${o.parameters_b}B · batch ${o.batch}</span></div><div class="h100-row-graphic"><div class="h100-memory-track" role="img" aria-label="Option ${o.id}: ${t.total} GB total, ${fit?'fits':'does not fit'} an 80 GB GPU"><div class="h100-memory-stack">${['weights','gradients','adam','activations','buffers'].map(k => `<span class="${k}" style="width:${100*t[k]/180}%" title="${k}: ${t[k]} GB"></span>`).join('')}</div><i class="h100-capacity" style="left:${100*SPEC.capacity_gb/180}%"><span>80 GB</span></i></div><p class="h100-breakdown">${t.weights} + ${t.gradients} + ${t.adam} + ${t.activations} + ${t.buffers} = <b>${t.total} GB</b></p></div><div class="h100-fit-status"><strong>${t.total} GB</strong><span>${fit?'Fits':'Does not fit'}</span></div></div>`;
  }).join('')}</div><p class="h100-comparison-takeaway"><b>A and B fit: 53 GB and 60 GB.</b> C and D exceed 80 GB because the 7B model states alone need 112 GB.</p><div class="h100-comparison-poll" hidden><b>Class votes</b><span></span></div>`;
  const poll = n.querySelector('.h100-comparison-poll');
  async function refresh() {
    const room = savedRoom(); if (!room) {poll.hidden = true; return;}
    try {const data = room.stopped && room.snapshot ? room.snapshot : await api('/api/rooms/'+room.id, room); poll.hidden = false;
      poll.querySelector('span').textContent = SPEC.options.map(o => `${o.id}: ${data.counts[o.id]}`).join('   ·   ')+`   (${data.total} responses)`;
    } catch {poll.hidden = true;}
  }
  refresh();
  window.addEventListener('hashchange',()=>{if(n.closest('.slide').classList.contains('active')) refresh();});
  setInterval(() => {if(n.closest('.slide').classList.contains('active')) refresh();}, 2000);
});
document.dispatchEvent(new Event('viz:ready'));
