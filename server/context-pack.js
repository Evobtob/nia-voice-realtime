const SECRET_PATTERNS = [
  /OPENAI_API_KEY\s*=\s*[^\s]+/gi,
  /TRELLO_TOKEN\s*=\s*[^\s]+/gi,
  /GITHUB_TOKEN\s*=\s*[^\s]+/gi,
  /token\s*=\s*[^\s]+/gi,
  /sk-proj-[A-Za-z0-9_-]+/g,
  /ATTA[A-Za-z0-9_-]+/g
];

export function sanitizeContextText(text) {
  return SECRET_PATTERNS.reduce((clean, pattern) => clean.replace(pattern, '[REDACTED]'), String(text));
}

export function buildNiaContextPack() {
  return sanitizeContextText([
    'Contexto vivo de Bruno:',
    '- Bruno Aires é o principal. Fala com ele como alguém inteligente, exigente e orientado a resultados.',
    '- Bruno tem dois filhos: Duarte, 12 anos; Matias, 8 anos. Gosta de conteúdo personalizado para eles.',
    '- Bruno prefere respostas curtas, directas, sem verbosidade e sem tom corporativo.',
    '- Quando Bruno fala em app com Nia, por defeito quer webapp.',
    '',
    'Projectos activos:',
    '- Nia Voice Realtime: webapp/PWA para falar com Nia por voz realtime. Voz validada por Bruno; falta contexto/memória e ponte Hermes segura.',
    '- Mealheiro: produto de educação financeira infantil para Duarte/Matias e outras famílias; cofre físico + app. Hardware real referido: Arduino Nano com ecrã e dois knobs; não assumir ESP32 sem confirmação.',
    '- AI Ops para Clínicas: projecto/linha de negócio para operações, onboarding, vendas e automação em clínicas.',
    '',
    'Pessoas/contexto recorrente:',
    '- André Aires é irmão de Bruno e está ligado ao projecto Mealheiro.',
    '- Nuno Simões é parceiro técnico; prefere mensagens curtas e accionáveis.',
    '- Pedro tem tom leve, cúmplice, com humor; em trocas com ele, despedida “beijinho”.',
    '',
    'Regras de memória na voz:',
    '- Usa este contexto como pano de fundo, não como lista para recitar.',
    '- Se Bruno mencionar “o projecto”, “os miúdos”, “Mealheiro”, “clínicas”, “Hermes” ou “Nia”, tenta ligar ao contexto acima.',
    '- Se faltar detalhe específico, diz que não tens esse detalhe na sessão de voz e oferece recuperar via ponte Hermes quando ela existir.',
    '- Nunca inventes histórico de conversas que não esteja neste contexto.'
  ].join('\n'));
}
