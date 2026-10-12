import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!config.whatsapp.appSecret || !signatureHeader?.startsWith('sha256=')) return false;
  const suppliedHex = signatureHeader.slice('sha256='.length);
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;
  const expected = createHmac('sha256', config.whatsapp.appSecret).update(rawBody).digest();
  const supplied = Buffer.from(suppliedHex, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function verifyWebhookChallenge(url) {
  const params = url.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  if (!config.whatsapp.enabled || !config.whatsapp.verifyToken) return null;
  if (mode !== 'subscribe' || token !== config.whatsapp.verifyToken || !challenge) return null;
  return challenge;
}
