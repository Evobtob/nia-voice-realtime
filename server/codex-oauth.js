import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const DEFAULT_REFRESH_SKEW_SECONDS = 120;

export function parseJwtPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function tokenExpiresWithin(token, skewSeconds = DEFAULT_REFRESH_SKEW_SECONDS, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp || 0);
  if (!exp) return true;
  return exp <= nowSeconds + skewSeconds;
}

function codexAuthPath(env = process.env) {
  if (env.CODEX_AUTH_PATH) return path.resolve(env.CODEX_AUTH_PATH);
  const codexHome = env.CODEX_HOME ? path.resolve(env.CODEX_HOME) : path.join(os.homedir(), '.codex');
  return path.join(codexHome, 'auth.json');
}

async function refreshCodexTokens(tokens, fetchImpl = fetch) {
  const refreshToken = String(tokens.refresh_token || '').trim();
  if (!refreshToken) throw new Error('Codex OAuth sem refresh_token. Corre `codex login --device-auth`.');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CODEX_OAUTH_CLIENT_ID
  });

  const response = await fetchImpl(CODEX_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // handled below
  }

  if (!response.ok) {
    const message = payload?.error_description || payload?.error?.message || payload?.error || `status ${response.status}`;
    throw new Error(`Falha ao renovar Codex OAuth: ${message}`);
  }

  if (!payload.access_token) throw new Error('Renovação Codex OAuth sem access_token.');

  return {
    ...tokens,
    access_token: String(payload.access_token).trim(),
    refresh_token: String(payload.refresh_token || refreshToken).trim()
  };
}

export async function loadCodexTokens(env = process.env, fetchImpl = fetch) {
  const authPath = codexAuthPath(env);
  let auth;
  try {
    auth = JSON.parse(await readFile(authPath, 'utf8'));
  } catch {
    throw new Error(`Codex OAuth não encontrado em ${authPath}. Corre \`codex login --device-auth\`.`);
  }

  let tokens = auth.tokens;
  if (!tokens?.access_token) throw new Error(`Codex OAuth sem access_token em ${authPath}.`);

  if (tokenExpiresWithin(tokens.access_token)) {
    tokens = await refreshCodexTokens(tokens, fetchImpl);
    auth.tokens = { ...auth.tokens, ...tokens };
    auth.last_refresh = new Date().toISOString();
    await writeFile(authPath, JSON.stringify(auth, null, 2));
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    source: authPath
  };
}

export async function resolveRealtimeBearerToken(env = process.env, fetchImpl = fetch) {
  if (env.OPENAI_API_KEY) {
    return { token: env.OPENAI_API_KEY, authMode: 'api_key' };
  }

  const codex = await loadCodexTokens(env, fetchImpl);
  return { token: codex.accessToken, authMode: 'codex_oauth', source: codex.source };
}
