import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSessionConfig, requireEnv } from './session-config.js';

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

app.get('/config', (_req, res) => {
  const config = buildSessionConfig();
  res.json({
    model: config.session.model,
    voice: config.session.audio.output.voice,
    mode: 'webrtc'
  });
});

app.get('/token', async (_req, res) => {
  let apiKey;
  try {
    apiKey = requireEnv('OPENAI_API_KEY');
  } catch (error) {
    res.status(500).json({
      error: 'missing_openai_api_key',
      message: 'Define OPENAI_API_KEY no ficheiro .env antes de iniciar uma sessão realtime.'
    });
    return;
  }

  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
