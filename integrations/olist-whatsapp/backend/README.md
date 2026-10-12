# Backend de integração — Portuga das Américas

**Status: estrutura inicial com configuração isolada; ainda não é integração de produção.** O catálogo só funciona quando a API real é configurada. Criação de pedidos e processamento automático de mensagens permanecem bloqueados por segurança até a adaptação e os testes.

## Requisitos

- Node.js 24 LTS (ou Docker Engine com Compose).
- Servidor/maquina do cliente com acesso à internet e HTTPS/reverse proxy para webhooks em produção.
- Documentação oficial da API da conta Olist.
- Conta Meta Business/WhatsApp Cloud API e confirmação de elegibilidade para coexistência antes de alterar o número atual.

## Instalação local para configuração

1. Copie esta pasta para a máquina/servidor do cliente.
2. Copie `.env.example` para `.env`.
3. Preencha apenas as variáveis para as quais já existam valores/documentação oficial.
4. Rode `npm test`.
5. Rode `npm start`.
6. Abra `http://127.0.0.1:8080/health`; deve retornar `{"status":"ok",...}`.
7. Abra `http://127.0.0.1:8080/api/config`; mostra apenas indicadores booleanos, nunca tokens.

### Docker

Na pasta do backend:

```sh
cp .env.example .env
# Edite .env localmente; nunca envie esse arquivo ao GitHub.
docker compose up --build -d
docker compose logs -f
```

A porta fica vinculada a `127.0.0.1`. Para webhooks de produção, configure um reverse proxy com HTTPS e regras de firewall. Não exponha diretamente uma API sem autenticação à internet.

## Ponto de configuração das APIs

Edite `.env` na máquina do cliente:

- `OLIST_API_BASE_URL`: URL oficial do ambiente de homologação/produção.
- `OLIST_API_TOKEN`: token secreto emitido para a integração.
- `OLIST_AUTH_HEADER` / `OLIST_AUTH_SCHEME`: conforme a documentação (ex.: Authorization/Bearer, somente se confirmado).
- `OLIST_PRODUCTS_PATH`: caminho relativo exato da operação de catálogo.
- `OLIST_ORDER_CREATE_PATH`: reservar para a operação de pedido confirmada na documentação; o endpoint sozinho não habilita o pedido.
- `OLIST_ORDER_CREATE_ENABLED`: permanece `false` até a implementação do payload, autenticação, idempotência e testes.

Para WhatsApp, preencha `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION` e habilite `WHATSAPP_ENABLED=true` apenas após concluir o onboarding oficial. Nunca migre/remova o número atual antes de confirmar a coexistência.

## Endpoints atuais

- `GET /health`: estado do processo.
- `GET /api/config`: mostra quais integrações estão configuradas (sem segredos).
- `GET /api/catalog`: consulta o caminho de catálogo configurado; falha fechado quando não configurado.
- `GET /webhooks/whatsapp`: verificação do webhook Meta.
- `POST /webhooks/whatsapp`: verifica assinatura HMAC SHA-256; por enquanto não processa mensagens.
- `POST /api/orders`: intencionalmente responde 503 até a integração de pedidos ser implementada e testada.

## O que ainda precisa de adaptação real

A API Olist pode variar conforme produto, conta e modalidade de integração. O adaptador de criação de pedido precisa mapear explicitamente campos, IDs de produtos/variações, preços, estoque, cliente, entrega, impostos/descontos, estados e resposta do pedido. Não enviar payload arbitrário diretamente à API e não confirmar um pedido até haver confirmação inequívoca do sistema de destino.

O processamento WhatsApp precisa de armazenamento persistente e idempotente de IDs de mensagens, controle de reenvios, política de retenção, transferência para atendente humano e envio de respostas usando a versão documentada da Graph API. Esta estrutura não envia mensagens automaticamente.

## Segurança antes de produção

- Guardar `.env` fora do Git, backups não públicos e com permissões restritas.
- Usar HTTPS em produção; não expor a porta diretamente.
- Adicionar autenticação/autorização para app cliente e painel administrativo.
- Usar banco de dados persistente, migrações, backups e deduplicação distribuída antes de ativar pedidos.
- Definir política de privacidade, retenção e exclusão de dados.
- Rotacionar qualquer segredo que tenha sido exposto.
- Testar em homologação, depois em piloto com pedidos de teste, antes de habilitar vendas reais.

## Google Play

O backend não gera sozinho o app cliente. Para nova submissão à Google Play a partir de 31 de agosto de 2026, a exigência publicada é target Android 16 / API 36 ou superior. Confirmar novamente no Play Console antes do envio. Consulte https://support.google.com/googleplay/android-developer/answer/11926878?hl=pt-BR.
