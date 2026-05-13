const els = {
  start: document.querySelector('#startBtn'),
  stop: document.querySelector('#stopBtn'),
  status: document.querySelector('#status'),
  detail: document.querySelector('#detail'),
  events: document.querySelector('#events'),
  orb: document.querySelector('#orb'),
  diagAuth: document.querySelector('#diagAuth'),
  diagMic: document.querySelector('#diagMic'),
  diagConn: document.querySelector('#diagConn')
};

let pc = null;
let dc = null;
let localStream = null;
let remoteAudio = null;
let activeResponse = false;
let handledToolCalls = new Set();
let lastAssistantSpeechAt = 0;
const BARGE_IN_GRACE_MS = 900;

function currentAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('access');
  if (fromUrl) {
    localStorage.setItem('niaVoiceAccessToken', fromUrl);
    params.delete('access');
    const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', clean);
    return fromUrl;
  }
  return localStorage.getItem('niaVoiceAccessToken') || '';
}

function setState(state, status, detail = '') {
  els.orb.dataset.state = state;
  els.status.textContent = status;
  els.detail.textContent = detail;
  if (els.diagConn) els.diagConn.textContent = `Ligação: ${status.toLowerCase()}`;
}

async function loadDiagnostics() {
  try {
    const response = await fetch('/config', { cache: 'no-store' });
    const config = await response.json();
    const authLabel = config.authMode === 'codex_oauth' ? 'OAuth Codex' : config.authMode;
    els.diagAuth.textContent = `Auth: ${authLabel}${config.accessRequired ? ' + protegido' : ''}`;
    log('config', config);
  } catch (error) {
    els.diagAuth.textContent = 'Auth: erro';
    log('config:error', { message: error.message });
  }
}

function log(event, payload = {}) {
  const line = `${new Date().toLocaleTimeString()} ${event} ${JSON.stringify(payload)}`;
  els.events.textContent = [line, ...els.events.textContent.split('\n')].slice(0, 40).join('\n');
}

function sendEvent(message) {
  if (!dc || dc.readyState !== 'open') return;
  dc.send(JSON.stringify({ event_id: crypto.randomUUID(), ...message }));
  log('client', message.type);
}

async function executeToolCall(call) {
  if (!call?.call_id || handledToolCalls.has(call.call_id)) return;
  handledToolCalls.add(call.call_id);

  let args = {};
  try {
    args = JSON.parse(call.arguments || '{}');
  } catch {
    sendToolOutput(call.call_id, { error: 'invalid_arguments', message: 'Argumentos inválidos.' });
    return;
  }

  if (call.name === 'search_context') {
    await executeContextSearch(call, args);
    return;
  }

  if (call.name === 'create_draft') {
    await executeDraftCreate(call, args);
    return;
  }

  sendToolOutput(call.call_id, { error: 'unsupported_tool', message: 'Ferramenta não suportada neste MVP.' });
}

async function executeContextSearch(call, args) {
  try {
    setState('thinking', 'A consultar contexto…', 'Só leitura: notas e projectos.');
    const accessToken = currentAccessToken();
    const response = await fetch('/context/search', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'X-App-Access-Token': accessToken } : {})
      },
      body: JSON.stringify({ query: args.query || '' })
    });
    const payload = await response.json();
    sendToolOutput(call.call_id, payload);
  } catch (error) {
    sendToolOutput(call.call_id, { error: 'context_search_failed', message: error.message });
  }
}

async function executeDraftCreate(call, args) {
  try {
    setState('thinking', 'A criar rascunho…', 'Nada será enviado sem confirmação.');
    const accessToken = currentAccessToken();
    const response = await fetch('/drafts', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'X-App-Access-Token': accessToken } : {})
      },
      body: JSON.stringify({
        kind: args.kind || 'note',
        title: args.title || 'Rascunho por voz',
        content: args.content || '',
        recipient: args.recipient || ''
      })
    });
    const payload = await response.json();
    sendToolOutput(call.call_id, payload);
  } catch (error) {
    sendToolOutput(call.call_id, { error: 'draft_create_failed', message: error.message });
  }
}

function sendToolOutput(callId, output) {
  sendEvent({
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify(output)
    }
  });
  sendEvent({ type: 'response.create' });
}

function handleServerEvent(raw) {
  let event;
  try {
    event = JSON.parse(raw.data);
  } catch {
    log('server:unparseable');
    return;
  }

  log('server', event.type);

  if (event.type === 'response.created') {
    activeResponse = true;
    lastAssistantSpeechAt = performance.now();
    setState('speaking', 'A responder…', 'Podes interromper. Eu paro e adapto-me.');
  }

  if (event.type === 'response.done' || event.type === 'response.cancelled') {
    activeResponse = false;
    setState('live', 'À escuta.', 'Fala normalmente.');
  }

  // Barge-in: só interrompe se Bruno falar de forma detectada depois de uma pequena margem.
  // Isto evita que respiração/ruído corte frases no início da resposta.
  if (event.type === 'input_audio_buffer.speech_started' && activeResponse) {
    const responseAgeMs = performance.now() - lastAssistantSpeechAt;
    if (responseAgeMs < BARGE_IN_GRACE_MS) {
      log('barge-in:ignored', { responseAgeMs });
      return;
    }
    sendEvent({ type: 'response.cancel' });
    activeResponse = false;
    setState('live', 'Interrompida.', 'Estou a ouvir o novo pedido.');
  }

  if (event.type === 'error') {
    setState('error', 'Erro na sessão.', event.error?.message || 'Vê eventos técnicos.');
  }

  if (event.type === 'response.function_call_arguments.done') {
    executeToolCall({ call_id: event.call_id, name: event.name, arguments: event.arguments });
  }

  const item = event.item || event.response?.output?.find?.((entry) => entry.type === 'function_call');
  if (item?.type === 'function_call') {
    executeToolCall({ call_id: item.call_id, name: item.name, arguments: item.arguments });
  }
}

async function startSession() {
  els.start.disabled = true;
  setState('connecting', 'A ligar…', 'A pedir token efémero e microfone.');

  try {
    const accessToken = currentAccessToken();
    const tokenResponse = await fetch('/token', {
      cache: 'no-store',
      headers: accessToken ? { 'X-App-Access-Token': accessToken } : {}
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.message || tokenData.error || 'Falha ao obter token.');
    }

    const ephemeralKey = tokenData.value;
    if (!ephemeralKey) throw new Error('Token efémero inválido.');

    pc = new RTCPeerConnection();
    remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;

    pc.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      log('pc', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState('live', 'À escuta.', 'Fala comigo. Respondo em voz realtime.');
      }
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        setState('idle', 'Sessão terminada.', 'Toca para iniciar novamente.');
      }
    };

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    els.diagMic.textContent = 'Mic: autorizado';
    localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream));

    dc = pc.createDataChannel('oai-events');
    dc.addEventListener('message', handleServerEvent);
    dc.addEventListener('open', () => {
      log('datachannel', 'open');
      setState('live', 'À escuta.', 'Fala naturalmente.');
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls?model=gpt-realtime', {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        'Content-Type': 'application/sdp'
      }
    });

    const answerSdp = await sdpResponse.text();
    if (!sdpResponse.ok) throw new Error(answerSdp);

    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    els.stop.disabled = false;
  } catch (error) {
    log('error', { message: error.message });
    if (String(error.message || '').toLowerCase().includes('device') || String(error.name || '').includes('NotAllowed')) {
      els.diagMic.textContent = 'Mic: erro/permissão';
    }
    setState('error', 'Não consegui ligar.', error.message);
    await stopSession(false);
  } finally {
    els.start.disabled = false;
  }
}

async function stopSession(updateUi = true) {
  if (dc) dc.close();
  if (pc) pc.close();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  if (remoteAudio) remoteAudio.srcObject = null;

  pc = null;
  dc = null;
  localStream = null;
  remoteAudio = null;
  activeResponse = false;
  handledToolCalls = new Set();
  lastAssistantSpeechAt = 0;

  els.stop.disabled = true;
  els.start.disabled = false;
  if (updateUi) setState('idle', 'Parada.', 'Toca para iniciar novamente.');
}

els.start.addEventListener('click', startSession);
els.stop.addEventListener('click', () => stopSession(true));

loadDiagnostics();

window.addEventListener('pagehide', () => stopSession(false));
