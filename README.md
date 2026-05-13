# Nia Voice Realtime

Spike técnico para uma webapp mobile de conversa realtime por voz com Nia.

## Estado

MVP técnico local criado. Usa OAuth do Codex por defeito, lendo tokens de `~/.codex/auth.json`. `OPENAI_API_KEY` continua suportado como override opcional.

## Stack

- Node.js + Express
- Frontend estático mobile-first
- WebRTC no browser
- OpenAI Realtime API via token efémero

## Setup

```bash
# garantir que o Codex OAuth existe
codex login --device-auth

npm install
npm run dev
```

Opcionalmente, podes usar API key em vez de OAuth:

```bash
cp .env.example .env
# editar .env e definir OPENAI_API_KEY
```

Abrir:

```text
http://localhost:3000
```

Para testar no iPhone na mesma rede:

```bash
ipconfig getifaddr en0
```

Depois abrir:

```text
http://IP-DO-MAC:3000
```

Nota: Safari pode exigir HTTPS para microfone em alguns cenários fora de localhost. Se bloquear, usar túnel HTTPS temporário.

## Scripts

```bash
npm test
npm run dev
```

## Critérios do Spike 001

- [x] Webapp mobile-first
- [x] Backend não expõe API key
- [x] Token efémero via `/token`
- [x] OAuth Codex via `~/.codex/auth.json` sem API key obrigatória
- [x] WebRTC no browser
- [x] Microfone via `getUserMedia`
- [x] Áudio remoto via `<audio autoplay>`
- [x] Evento `response.cancel` para interrupção
- [ ] Teste real com API key
- [ ] Teste no iPhone
- [ ] Medição de latência percebida

## Decisão importante

GitHub Pages sozinho não serve para este MVP, porque precisamos de backend para proteger credenciais OAuth/API key e gerar token efémero. O deploy público deve ser feito em Render/Fly/Railway/Vercel serverful ou no Mac mini com túnel HTTPS.
