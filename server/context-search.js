import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { sanitizeContextText } from './context-pack.js';

const DEFAULT_VAULT_ROOT = '/Users/nia_santos/Documents/Nia Vault';
const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'e', 'em', 'para', 'por', 'com', 'um', 'uma']);

export function normalizeQuery(query) {
  return String(query || '')
    .toLowerCase()
    .normalize('NFKC')
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((term) => term.length >= 3 && !STOPWORDS.has(term))
    .slice(0, 8) || [];
}

async function listMarkdownFiles(root, limit = 300) {
  const files = [];

  async function walk(dir) {
    if (files.length >= limit) return;
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full);
        if (files.length >= limit) return;
      }
    }
  }

  await walk(root);
  return files;
}

function scoreText(text, terms) {
  const lower = text.toLowerCase();
  return terms.reduce((score, term) => {
    const matches = lower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return score + (matches ? matches.length : 0);
  }, 0);
}

function buildExcerpt(text, terms, maxLength = 360) {
  const clean = sanitizeContextText(text.replace(/\s+/g, ' ').trim());
  const lower = clean.toLowerCase();
  const firstHit = terms.map((term) => lower.indexOf(term)).filter((idx) => idx >= 0).sort((a, b) => a - b)[0] || 0;
  const start = Math.max(0, firstHit - 90);
  const excerpt = clean.slice(start, start + maxLength);
  return `${start > 0 ? '…' : ''}${excerpt}${start + maxLength < clean.length ? '…' : ''}`;
}

export async function searchVaultNotes(query, options = {}) {
  const vaultRoot = options.vaultRoot || process.env.NIA_VAULT_PATH || DEFAULT_VAULT_ROOT;
  const limit = Math.min(Number(options.limit || 5), 8);
  const terms = normalizeQuery(query);

  if (terms.length === 0) {
    return {
      query: String(query || ''),
      results: [],
      message: 'Faz uma pergunta mais específica para eu procurar no contexto.'
    };
  }

  try {
    const rootStat = await stat(vaultRoot);
    if (!rootStat.isDirectory()) throw new Error('not directory');
  } catch {
    return { query: String(query || ''), results: [], message: 'Vault de contexto indisponível.' };
  }

  const files = await listMarkdownFiles(vaultRoot);
  const scored = [];

  for (const file of files) {
    let text = '';
    try {
      text = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const score = scoreText(`${path.basename(file)}\n${text}`, terms);
    if (score <= 0) continue;
    scored.push({
      score,
      title: path.basename(file, '.md'),
      path: path.relative(vaultRoot, file),
      excerpt: buildExcerpt(text, terms)
    });
  }

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return {
    query: String(query || ''),
    results: scored.slice(0, limit).map(({ score: _score, ...item }) => item),
    message: scored.length ? 'Contexto encontrado.' : 'Não encontrei contexto relevante no vault.'
  };
}
