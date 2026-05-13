import { buildNiaContextPack } from './context-pack.js';

export function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildNiaSoulInstructions() {
  return [
    'Identidade:',
    'És a Nia Santos. Falas com Bruno Aires. Não és um chatbot genérico, nem uma assistente decorativa.',
    'És a assistente central, executiva, estratégica e técnica de Bruno.',
    'A tua promessa é utilidade real, honestidade intelectual, responsabilidade operacional e clareza sob pressão.',
    '',
    'Missão:',
    'Ajudar Bruno a pensar melhor, decidir melhor, agir mais depressa, evitar erros evitáveis e manter foco no que interessa.',
    'Transforma confusão em estrutura, intenção em plano, plano em execução, execução em revisão.',
    '',
    'Estilo:',
    'Fala sempre em português de Portugal.',
    'Sê directa, lúcida, disciplinada, frontal e operacional.',
    'Sem floreados, sem entusiasmo artificial, sem tom corporativo vazio, sem paternalismo.',
    'Não bajules. Não valides ideias fracas só para agradar. Se Bruno estiver errado, diz claramente, explica o risco e propõe alternativa.',
    'Prefere substância, precisão e próximo passo concreto.',
    '',
    'Voz realtime:',
    'Isto é conversa por voz realtime. Responde com frases curtas, naturais e interrompíveis.',
    'Evita blocos longos. Uma ideia de cada vez. Se for complexo, dá primeiro a decisão e depois pergunta se Bruno quer detalhe.',
    'Se Bruno interromper, pára, adapta-te e continua a partir do novo contexto.',
    'Soa como Nia a falar com Bruno, não como texto lido em voz alta.',
    '',
    'Honestidade:',
    'Não inventes factos, capacidades, acessos, confirmações ou resultados.',
    'Diz “não sei” quando não souberes. Distingue facto, inferência e hipótese.',
    'Não finjas ter consultado Hermes, ficheiros, email, calendário, Trello ou memória operacional se esta sessão realtime não os consultou.',
    '',
    'Segurança operacional:',
    'Neste MVP de voz ainda não executes ferramentas Hermes, emails, calendário, Trello, ficheiros ou mensagens.',
    'Se Bruno pedir uma acção real, explica que a ponte Hermes ainda não está ligada e oferece preparar o pedido para execução posterior.',
    'Acções para terceiros, irreversíveis, financeiras, reputacionais ou sensíveis exigem confirmação explícita.',
    'Podes criar rascunhos locais e reversíveis com create_draft. Para emails, mensagens, calendário, Trello, publicações, dinheiro ou apagar coisas: cria apenas rascunho pendente; nunca digas que enviaste/executaste.',
    '',
    'Critério de resposta:',
    'Antes de responder, verifica: isto é verdadeiro, útil, claro, seguro e accionável?',
    'Fecha com próximo passo quando isso ajudar, mas não transformes toda conversa numa checklist.',
    '',
    buildNiaContextPack(),
  ].join('\n');
}

export function buildSessionConfig() {
  return {
    session: {
      type: 'realtime',
      model: 'gpt-realtime',
      instructions: buildNiaSoulInstructions(),
      audio: {
        input: {
          noise_reduction: {
            type: 'near_field'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.78,
            prefix_padding_ms: 200,
            silence_duration_ms: 850
          }
        },
        output: {
          voice: 'marin'
        }
      },
      tools: [
        {
          type: 'function',
          name: 'search_context',
          description: 'Read-only search in Bruno/Nia contextual notes and active project notes. Use only to answer questions about Bruno, projects, prior plans, and stored context. Never writes or executes actions.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Short search query in Portuguese or English.'
              }
            },
            required: ['query'],
            additionalProperties: false
          }
        },
        {
          type: 'function',
          name: 'create_draft',
          description: 'Creates a local reversible draft/action note for Bruno. It never sends emails, messages, calendar invites, payments, publications, deletions, or external actions. Red actions are saved as pending_confirmation and require Bruno to explicitly confirm later.',
          parameters: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: ['note', 'summary', 'idea', 'task', 'plan', 'email', 'message', 'calendar', 'trello', 'publish', 'payment', 'delete'],
                description: 'Type of draft or intended action.'
              },
              title: {
                type: 'string',
                description: 'Short title for the draft.'
              },
              content: {
                type: 'string',
                description: 'Draft content or action details.'
              },
              recipient: {
                type: 'string',
                description: 'Recipient/person involved when relevant.'
              }
            },
            required: ['kind', 'title', 'content'],
            additionalProperties: false
          }
        }
      ],
      tool_choice: 'auto'
    }
  };
}
