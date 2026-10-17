import http from 'node:http';
import { config, publicConfig } from './config.js';
import { OlistAdapter } from './olist-adapter.js';
import { verifyWebhookChallenge, verifyWebhookSignature } from './whatsapp-webhook.js';
import { extractIncomingTextMessages, generateAiReply, sendWhatsAppText } from './whatsapp-ai.js';

// Temporary in-process deduplication only. Production must replace this with a durable queue/store.
const processedMessageIds = new Set();
const MAX_REMEMBERED_MESSAGES = 5000;

async function processWhatsAppPayload(payload) {
  if (!config.whatsapp.enabled || !config.whatsapp.aiEnabled || !config.whatsapp.openAiApiKey) return;
  const messages = extractIncomingTextMessages(payload);
  for (const message of messages) {
    if (processedMessageIds.has(message.id)) continue;
    processedMessageIds.add(message.id);
    if (processedMessageIds.size > MAX_REMEMBERED_MESSAGES) {
      const oldest = processedMessageIds.values().next().value;
      if (oldest) processedMessageIds.delete(oldest);
    }
    try {
      const reply = message.body
        ? await generateAiReply(message.body)
        : 'Olá! No momento, consigo entender mensagens de texto. Vou precisar que você escreva sua dúvida aqui, por favor.';
      await sendWhatsAppText(message.from, reply);
    } catch (error) {
      // Do not log phone numbers, message text, tokens, or upstream response bodies.
      console.error('WhatsApp AI message processing failed:', error?.message ?? 'UNKNOWN_ERROR');
    }
  }
}

const olist = new OlistAdapter();
const maxBytes = config.maxRequestBytes;

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!config.allowedOrigins.includes(origin)) return false;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('vary', 'Origin');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization, X-Request-Id');
  return true;
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('Corpo da requisição excede o limite permitido.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (!applyCors(req, res)) return send(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'cache-control': 'no-store' });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { status: 'ok', service: 'portuga-integrations-backend', timestamp: new Date().toISOString() });
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    return send(res, 200, publicConfig());
  }

  if (req.method === 'GET' && url.pathname === '/api/catalog') {
    try {
      const catalog = await olist.getCatalog();
      return send(res, 200, { source: 'olist', catalog });
    } catch (error) {
      return send(res, error.statusCode ?? 502, { error: error.code ?? 'CATALOG_UNAVAILABLE', message: error.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    return send(res, 503, {
      error: 'ORDER_CREATION_NOT_READY',
      message: 'O registro de pedidos será habilitado após validar a API Olist, autenticação do cliente e fluxo de homologação.'
    });
  }

  if (url.pathname === '/webhooks/whatsapp' && req.method === 'GET') {
    const challenge = verifyWebhookChallenge(url);
    if (challenge === null) return send(res, 403, { error: 'WEBHOOK_VERIFICATION_FAILED' });
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(challenge);
  }

  if (url.pathname === '/webhooks/whatsapp' && req.method === 'POST') {
    try {
      const rawBody = await readRawBody(req);
      if (!config.whatsapp.enabled || !verifyWebhookSignature(rawBody, req.headers['x-hub-signature-256'])) {
        return send(res, 401, { error: 'INVALID_WEBHOOK_SIGNATURE' });
      }
      let payload;
      try { payload = JSON.parse(rawBody.toString('utf8')); } catch {
        return send(res, 400, { error: 'INVALID_JSON' });
      }
      // Acknowledge Meta promptly; message handling is gated by WHATSAPP_ENABLED,
      // WHATSAPP_AI_ENABLED and the server-side API credentials.
      send(res, 200, {
        received: true,
        processing: Boolean(config.whatsapp.enabled && config.whatsapp.aiEnabled && config.whatsapp.openAiApiKey)
      });
      if (config.whatsapp.enabled && config.whatsapp.aiEnabled && config.whatsapp.openAiApiKey) {
        queueMicrotask(() => void processWhatsAppPayload(payload));
      }
      return;
    } catch (error) {
      return send(res, error.statusCode ?? 400, { error: 'WEBHOOK_READ_FAILED', message: error.message });
    }
  }

  return send(res, 404, { error: 'NOT_FOUND' });
});

server.listen(config.port, config.host, () => {
  console.log(`Portuga integrations backend listening on ${config.host}:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
