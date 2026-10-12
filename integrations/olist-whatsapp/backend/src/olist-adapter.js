import { config } from './config.js';

function safeConfiguredUrl(base, path) {
  const root = new URL(base);
  if (config.nodeEnv === 'production' && root.protocol !== 'https:') {
    throw new Error('A API Olist deve usar HTTPS em produção.');
  }
  const target = new URL(path, root);
  if (target.origin !== root.origin) throw new Error('O caminho da API não pode trocar o host configurado.');
  return target;
}

export class OlistAdapter {
  isCatalogConfigured() {
    return Boolean(config.olist.baseUrl && config.olist.token && config.olist.productsPath);
  }

  async getCatalog() {
    if (!this.isCatalogConfigured()) {
      const error = new Error('Integração de catálogo Olist ainda não configurada.');
      error.statusCode = 503;
      error.code = 'OLIST_NOT_CONFIGURED';
      throw error;
    }

    const url = safeConfiguredUrl(config.olist.baseUrl, config.olist.productsPath);
    const headers = { Accept: 'application/json' };
    const authValue = config.olist.authScheme
      ? `${config.olist.authScheme} ${config.olist.token}`
      : config.olist.token;
    headers[config.olist.authHeader] = authValue;

    const response = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      const error = new Error(`A API Olist respondeu HTTP ${response.status}.`);
      error.statusCode = 502;
      error.code = 'OLIST_UPSTREAM_ERROR';
      throw error;
    }
    return response.json();
  }

  async createOrder() {
    // Não adivinhar formato de pedido: cada produto/versão Olist pode exigir payload diferente.
    // Implementar após validar documentação, mapeamento e ambiente de homologação.
    const error = new Error('Criação de pedidos está bloqueada até validar o endpoint e o payload oficiais da conta Olist.');
    error.statusCode = 503;
    error.code = 'OLIST_ORDER_ADAPTER_PENDING';
    throw error;
  }
}
