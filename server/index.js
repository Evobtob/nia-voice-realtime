import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSessionConfig } from './session-config.js';
import { resolveRealtimeBearerToken } from './codex-oauth.js';
import { requireAppAccessToken } from './access-control.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(root, 'public'), {
  extensions: ['html'],
  etag: false,
  maxAge: 0
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'nia-voice-realtime' });
});

app.get('/config', async (_req, res) => {
  const config = buildSessionConfig();
  let authMode = 'unknown';
  try {
    const auth = await resolveRealtimeBearerToken();
    authMode = auth.authMode;
  } catch {
    authMode = 'missing';
  }
  res.json({
    model: config.session.model,
    voice: config.session.audio.output.voice,
    mode: 'webrtc',
    authMode,
    accessRequired: Boolean(process.env.APP_ACCESS_TOKEN),
    appVersion: process.env.npm_package_version || '0.1.0'
  });
});

app.get('/token', requireAppAccessToken(), async (_req, res) => {
  let auth;
  try {
    auth = await resolveRealtimeBearerToken();
  } catch (error) {
    res.status(500).json({
      error: 'missing_realtime_auth',
      message: error.message || 'Sem credenciais para criar sessão realtime.'
    });
    return;
  }

  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildSessionConfig())
  });

  const body = await upstream.text();
  res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(body);
});

app.use((_req, res) => {
  res.sendFile(path.join(root, 'public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Nia Voice Realtime: http://localhost:${port}`);
});
