# Integração Olist ERP + WhatsApp — Portuga

Status: planejamento técnico; nenhum endpoint de produção foi presumido.

Esta integração deve ser implementada como serviço de backend independente. Não alterar o HTML atual, o aplicativo Android nem o fluxo Bluetooth POS-58 nesta fase.

## Arquitetura

- WhatsApp: Meta WhatsApp Business Platform / Cloud API, com onboarding que confirme elegibilidade para coexistência do número atual.
- Backend: serviço HTTPS com webhooks de entrada, validação, logs sem segredos e proteção contra duplicidade.
- IA: interpreta a mensagem e propõe itens; não define preços, saldo, pagamento nem confirma pedidos por conta própria.
- Catálogo e pedidos: adaptador Olist separado do canal WhatsApp.
- Frontends: HTML e Android continuam funcionando; futuras alterações devem consumir contratos versionados do backend, não chamar a Olist diretamente.

## Fluxo seguro

1. Receber webhook e validar assinatura conforme documentação Meta.
2. Deduplicar o evento pelo ID da mensagem.
3. Consultar catálogo/preço por meio do endpoint Olist confirmado.
4. Montar carrinho e solicitar confirmação explícita ao cliente.
5. Revalidar preço/disponibilidade antes de gravar.
6. Criar pedido apenas usando endpoint e payload oficialmente documentados para a conta Olist.
7. Registrar o ID externo e a resposta do ERP; se houver timeout ambíguo, consultar antes de repetir.
8. Enviar confirmação ao cliente somente após confirmação real do ERP.
9. Encaminhar exceções para atendimento humano.

## Bloqueio antes da implementação da API

A documentação necessária ainda precisa ser fornecida e confirmada para o produto exato **ERP da Olist**. Não confundir com a API da plataforma de e-commerce Olist, que é um produto diferente.

Precisamos dos seguintes itens, sem segredos:
- URL/link ou arquivo da documentação da API usada na conta ERP;
- método de autenticação e escopos/permissões (não enviar token);
- endpoints e exemplos de leitura de produtos/preços/estoque;
- endpoint e payload para criar/importar pedido de venda, se disponível;
- regras de paginação, limites, idempotência e ambiente de homologação;
- se o módulo OMS/Token API ou integração de parceiro precisa ser ativado pela Olist.

Se a Olist não disponibilizar um endpoint de criação direta de pedido para esta conta, será necessário usar o mecanismo de integração oficialmente suportado e confirmado pelo suporte. Não automatizar cliques no ERP nem gravar diretamente no banco de dados.

## Variáveis de ambiente — nomes ilustrativos

Os nomes abaixo são apenas uma convenção interna e não indicam nomes oficiais de cabeçalhos/endpoints da Olist:

- `OLIST_API_BASE_URL`
- `OLIST_API_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `OPENAI_API_KEY`

Guardar esses valores no gerenciador de segredos do servidor. Nunca incluí-los em HTML, JavaScript entregue ao navegador, APK, GitHub ou mensagens.

## Critérios de aceite

- Testes executados somente em homologação até aprovação.
- Eventos de webhook repetidos não geram pedidos duplicados.
- Preço e estoque vêm da fonte autorizada e são revalidados antes do envio.
- Falha/timeout não gera falsa confirmação ao cliente.
- Logs não contêm tokens nem dados pessoais desnecessários.
- HTML, APK e impressão POS-58 existentes permanecem inalterados até teste de regressão.
- Ativação de produção exige aprovação explícita do proprietário da loja.

## Preparação para a visita ao cliente

Use o [checklist da visita](./CLIENT-VISIT-CHECKLIST.md) para reunir documentação, confirmar permissões e planejar testes sem expor credenciais. Ele cobre Olist, WhatsApp/Meta, cardápio, POS-58, ambiente e critérios de aceite.

## Próxima ação

Anexar a documentação da API ERP da Olist (ou fornecer seu link público) e confirmar quais endpoints estão habilitados na conta. Depois disso, implementar o adaptador real e testes de contrato em uma branch separada.
