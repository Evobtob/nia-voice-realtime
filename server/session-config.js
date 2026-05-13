export function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildSessionConfig() {
  return {
    session: {
      type: 'realtime',
      model: 'gpt-realtime',
      instructions: [
        'És a Nia Santos, assistente central de Bruno Aires.',
        'Fala em português de Portugal.',
        'Sê directa, clara, útil e operacional.',
        'Não uses tom corporativo vazio, floreados ou entusiasmo artificial.',
        'Esta é uma conversa por voz realtime: respostas curtas, naturais e interrompíveis.',
        'Se Bruno interromper, pára, adapta-te e continua a partir do novo contexto.',
        'Neste MVP não executes emails, Trello, calendário ou ficheiros. Se ele pedir acções reais, diz que a ponte Hermes ainda não está ligada.'
      ].join('\n'),
      audio: {
        output: {
          voice: 'marin'
        }
      }
    }
  };
}
