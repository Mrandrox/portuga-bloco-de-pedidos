import { config } from './config.js';

const SYSTEM_INSTRUCTIONS = `Você é o atendente virtual do Portuga das Américas, uma loja de alimentos, lanches e bebidas no Brasil. Responda em português brasileiro, de forma simpática, curta e clara.
Regras obrigatórias:
- Não invente produtos, preços, estoque, promoções, prazo de entrega, taxa de entrega ou formas de pagamento.
- Este sistema ainda não tem catálogo Olist validado nem criação de pedidos habilitada. Portanto, não confirme disponibilidade, preço, pagamento ou pedido.
- Se a pessoa quiser comprar, pedir preço/disponibilidade, alterar/cancelar pedido, informar pagamento/entrega ou falar com uma pessoa, oriente a procurar um atendente humano pelo canal oficial da loja; não afirme que houve encaminhamento, pois essa função ainda não existe.
- Não peça senha, código de autenticação ou dados completos de cartão.
- Não afirme que enviou um pedido ou notificou um funcionário.
- Para dúvidas gerais, ajude sem inventar informações específicas da loja.`;

export function extractIncomingTextMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const contacts = value?.contacts ?? [];
      for (const message of value?.messages ?? []) {
        if (!message?.id || !message?.from) continue;
        const contact = contacts.find(item => item?.wa_id === message.from);
        const body = message?.type === 'text' ? String(message?.text?.body ?? '').trim() : '';
        messages.push({
          id: String(message.id),
          from: String(message.from),
          name: typeof contact?.profile?.name === 'string' ? contact.profile.name.slice(0, 100) : '',
          type: String(message.type ?? 'unknown'),
          body: body.slice(0, 4000)
        });
      }
    }
  }
  return messages;
}

export async function generateAiReply(message) {
  if (!config.whatsapp.openAiApiKey) throw new Error('AI_NOT_CONFIGURED');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.whatsapp.openAiApiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: config.whatsapp.openAiModel,
      instructions: SYSTEM_INSTRUCTIONS,
      input: message,
      max_output_tokens: 220,
      store: false
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`OPENAI_HTTP_${response.status}`);
  const data = await response.json();
  const answer = (data.output ?? [])
    .flatMap(item => item?.content ?? [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text)
    .join('\n')
    .trim();
  if (!answer) throw new Error('OPENAI_EMPTY_REPLY');
  return answer.slice(0, 3500);
}

export async function sendWhatsAppText(to, body) {
  const { accessToken, phoneNumberId, graphApiVersion } = config.whatsapp;
  if (!accessToken || !phoneNumberId || !graphApiVersion) throw new Error('WHATSAPP_OUTBOUND_NOT_CONFIGURED');
  if (!/^v\\d+\\.\\d+$/.test(graphApiVersion)) throw new Error('WHATSAPP_GRAPH_API_VERSION_INVALID');
  const url = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: String(body).slice(0, 4000) }
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    // Never include upstream response body: it can contain customer or account data.
    throw new Error(`WHATSAPP_SEND_HTTP_${response.status}`);
  }
  return response.json();
}
