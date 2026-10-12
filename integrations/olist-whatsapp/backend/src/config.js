import { readFileSync, existsSync } from 'node:fs';

function loadLocalEnv() {
  if (!existsSync('.env')) return;
  const raw = readFileSync('.env', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadLocalEnv();

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();
const bool = (key, fallback = false) => {
  const value = env(key, String(fallback)).toLowerCase();
  return value === 'true' || value === '1';
};

export const config = Object.freeze({
  nodeEnv: env('NODE_ENV', 'development'),
  host: env('HOST', '127.0.0.1'),
  port: Number(env('PORT', '8080')),
  publicAppOrigin: env('PUBLIC_APP_ORIGIN'),
  maxRequestBytes: Math.max(1024, Number(env('MAX_REQUEST_BYTES', '1048576'))),
  olist: Object.freeze({
    baseUrl: env('OLIST_API_BASE_URL'),
    token: env('OLIST_API_TOKEN'),
    authHeader: env('OLIST_AUTH_HEADER', 'Authorization'),
    authScheme: env('OLIST_AUTH_SCHEME', 'Bearer'),
    productsPath: env('OLIST_PRODUCTS_PATH'),
    orderCreatePath: env('OLIST_ORDER_CREATE_PATH'),
    orderCreateEnabled: bool('OLIST_ORDER_CREATE_ENABLED', false)
  }),
  whatsapp: Object.freeze({
    enabled: bool('WHATSAPP_ENABLED', false),
    verifyToken: env('WHATSAPP_VERIFY_TOKEN'),
    appSecret: env('META_APP_SECRET'),
    accessToken: env('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: env('WHATSAPP_PHONE_NUMBER_ID'),
    graphApiVersion: env('WHATSAPP_GRAPH_API_VERSION')
  })
});

export function publicConfig() {
  return {
    integrations: {
      olistCatalogConfigured: Boolean(config.olist.baseUrl && config.olist.token && config.olist.productsPath),
      olistOrderCreationConfigured: Boolean(config.olist.baseUrl && config.olist.token && config.olist.orderCreatePath && config.olist.orderCreateEnabled),
      whatsappWebhookConfigured: Boolean(config.whatsapp.enabled && config.whatsapp.verifyToken && config.whatsapp.appSecret),
      whatsappOutboundConfigured: Boolean(config.whatsapp.enabled && config.whatsapp.accessToken && config.whatsapp.phoneNumberId && config.whatsapp.graphApiVersion)
    }
  };
}
