import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sanitizeContextText } from './context-pack.js';

const DEFAULT_VAULT_ROOT = '/Users/nia_santos/Documents/Nia Vault';
const RED_KINDS = new Set(['email', 'message', 'calendar', 'trello', 'publish', 'payment', 'delete']);
const YELLOW_KINDS = new Set(['task', 'plan', 'reminder']);
const GREEN_KINDS = new Set(['note', 'summary', 'idea']);

function slugify(value) {
  return String(value || 'rascunho')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 70) || 'rascunho';
}

export function classifyAction(action = {}) {
  const kind = String(action.kind || 'note').toLowerCase();

  if (RED_KINDS.has(kind) || action.recipient) {
    return {
      level: 'red',
      confirmationRequired: true,
      reason: 'Acção com terceiros, reputação, dados sensíveis ou efeito externo. Exige confirmação explícita de Bruno.'
    };
  }

  if (YELLOW_KINDS.has(kind)) {
    return {
      level: 'yellow',
      confirmationRequired: false,
      reason: 'Acção reversível/local. Pode ser preparada automaticamente e revista depois.'
    };
  }

  if (GREEN_KINDS.has(kind)) {
    return {
      level: 'green',
      confirmationRequired: false,
      reason: 'Nota privada/reversível. Pode ser criada sem confirmação adicional.'
    };
  }

  return {
    level: 'yellow',
    confirmationRequired: false,
    reason: 'Tipo não crítico tratado como rascunho reversível.'
  };
}

export async function createVoiceDraft(action = {}, options = {}) {
  const vaultRoot = options.vaultRoot || process.env.NIA_VAULT_PATH || DEFAULT_VAULT_ROOT;
  const now = options.now || new Date();
  const classification = classifyAction(action);
  const status = classification.confirmationRequired ? 'pending_confirmation' : 'draft_created';
  const dir = path.join(vaultRoot, 'Projectos', 'Nia Voice Realtime', 'Voice Actions');
  const title = sanitizeContextText(action.title || `${action.kind || 'nota'} por voz`);
  const recipient = sanitizeContextText(action.recipient || '—');
  const content = sanitizeContextText(action.content || '');
  const iso = now.toISOString();
  const filename = `${iso.replace(/[:.]/g, '-')}-${slugify(title)}.md`;
  const fullPath = path.join(dir, filename);

  await mkdir(dir, { recursive: true });

  const markdown = [
    `# ${title}`,
    '',
    `Criado: ${iso}`,
    `Origem: ${sanitizeContextText(action.source || 'voice')}`,
    `Tipo: ${sanitizeContextText(action.kind || 'note')}`,
    `Nível: ${classification.level}`,
    `Status: ${status}`,
    `Confirmação necessária: ${classification.confirmationRequired ? 'sim' : 'não'}`,
    `Executado: não`,
    `Destinatário: ${recipient}`,
    '',
    '## Razão de segurança',
    classification.reason,
    '',
    '## Conteúdo',
    content || '_Sem conteúdo ainda._',
    '',
    '## Próximo passo',
    classification.confirmationRequired
      ? 'Aguardar confirmação explícita de Bruno antes de executar/enviar.'
      : 'Rascunho criado. Pode ser revisto ou convertido em acção posterior.',
    ''
  ].join('\n');

  await writeFile(fullPath, markdown, 'utf8');

  return {
    ok: true,
    title,
    kind: action.kind || 'note',
    level: classification.level,
    status,
    confirmationRequired: classification.confirmationRequired,
    executed: false,
    path: path.relative(vaultRoot, fullPath),
    message: classification.confirmationRequired
      ? 'Rascunho criado. Não executei nem enviei; falta confirmação explícita de Bruno.'
      : 'Rascunho reversível criado.'
  };
}
