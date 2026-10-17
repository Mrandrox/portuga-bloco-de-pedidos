import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '../src/whatsapp-webhook.js';
import { extractIncomingTextMessages } from '../src/whatsapp-ai.js';

test('signature validation rejects missing signature', () => {
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), ''), false);
});

test('signature validation rejects malformed signature', () => {
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), 'sha256=not-a-hash'), false);
});

// End-to-end valid-signature tests run when META_APP_SECRET is provided in the test environment.
test('valid HMAC signature is accepted when app secret is configured', { skip: !process.env.META_APP_SECRET }, () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const digest = createHmac('sha256', process.env.META_APP_SECRET).update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, `sha256=${digest}`), true);
});

test('extracts text messages and ignores status-only webhook changes', () => {
  const messages = extractIncomingTextMessages({
    entry: [{ changes: [
      { value: { statuses: [{ id: 'status-1' }] } },
      { value: {
        contacts: [{ wa_id: '5511999999999', profile: { name: 'Cliente' } }],
        messages: [{
          id: 'wamid.123',
          from: '5511999999999',
          type: 'text',
          text: { body: 'Olá, gostaria de saber sobre o cardápio' }
        }]
      } }
    ] }]
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, 'wamid.123');
  assert.equal(messages[0].name, 'Cliente');
  assert.equal(messages[0].body, 'Olá, gostaria de saber sobre o cardápio');
});

test('ignores messages without IDs or sender and safely represents non-text messages', () => {
  const messages = extractIncomingTextMessages({
    entry: [{ changes: [{ value: { messages: [
      { from: '5511', type: 'text', text: { body: 'sem id' } },
      { id: 'no-sender', type: 'text', text: { body: 'sem remetente' } },
      { id: 'audio-1', from: '5511999', type: 'audio' }
    ] } }] }]
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'audio');
  assert.equal(messages[0].body, '');
});
