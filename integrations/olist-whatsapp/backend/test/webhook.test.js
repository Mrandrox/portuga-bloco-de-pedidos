import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '../src/whatsapp-webhook.js';

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
