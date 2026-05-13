# Nia Voice Realtime

Spike técnico para uma webapp mobile de conversa realtime por voz com Nia.

## Estado

MVP técnico local criado. Ainda precisa de `OPENAI_API_KEY` real para testar áudio realtime.

## Stack

- Node.js + Express
- Frontend estático mobile-first
- WebRTC no browser
- OpenAI Realtime API via token efémero

## Setup

```bash
cp .env.example .env
# editar .env e definir OPENAI_API_KEY
npm install
npm run dev
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
- [x] WebRTC no browser
- [x] Microfone via `getUserMedia`
- [x] Áudio remoto via `<audio autoplay>`
- [x] Evento `response.cancel` para interrupção
- [ ] Teste real com API key
- [ ] Teste no iPhone
- [ ] Medição de latência percebida

## Decisão importante

GitHub Pages sozinho não serve para este MVP, porque precisamos de backend para proteger a API key e gerar token efémero. O deploy público deve ser feito em Render/Fly/Railway/Vercel serverful ou no Mac mini com túnel HTTPS.
