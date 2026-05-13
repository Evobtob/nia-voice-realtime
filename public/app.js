const els = {
  start: document.querySelector('#startBtn'),
  stop: document.querySelector('#stopBtn'),
  status: document.querySelector('#status'),
  detail: document.querySelector('#detail'),
  events: document.querySelector('#events'),
  orb: document.querySelector('#orb')
};

let pc = null;
let dc = null;
let localStream = null;
let remoteAudio = null;
let activeResponse = false;

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
    setState('speaking', 'A responder…', 'Podes interromper. Eu paro e adapto-me.');
  }

  if (event.type === 'response.done' || event.type === 'response.cancelled') {
    activeResponse = false;
    setState('live', 'À escuta.', 'Fala normalmente.');
  }

  // Barge-in: quando Bruno começa a falar durante uma resposta, cancelamos a fala em curso.
  if (event.type === 'input_audio_buffer.speech_started' && activeResponse) {
    sendEvent({ type: 'response.cancel' });
    activeResponse = false;
    setState('live', 'Interrompida.', 'Estou a ouvir o novo pedido.');
  }

  if (event.type === 'error') {
    setState('error', 'Erro na sessão.', event.error?.message || 'Vê eventos técnicos.');
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

  els.stop.disabled = true;
  els.start.disabled = false;
  if (updateUi) setState('idle', 'Parada.', 'Toca para iniciar novamente.');
}

els.start.addEventListener('click', startSession);
els.stop.addEventListener('click', () => stopSession(true));

window.addEventListener('pagehide', () => stopSession(false));
