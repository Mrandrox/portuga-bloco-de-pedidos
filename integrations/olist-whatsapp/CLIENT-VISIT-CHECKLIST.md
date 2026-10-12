# Checklist da visita ao cliente — Portuga das Américas

Objetivo: reunir as informações necessárias para concluir a integração real da Olist, WhatsApp e aplicativo sem interromper o sistema atual.

> **Segurança:** não colocar senhas, tokens, chaves de API, códigos de autenticação ou dados pessoais de clientes neste documento, em mensagens ou no GitHub. Na visita, confirmar apenas onde o responsável autorizado poderá inserir os credenciais diretamente no ambiente seguro. Se o cliente compartilhar um segredo por engano, não o versionar; solicitar a rotação/revogação quando apropriado.

## 1. Olist — documentação e permissões

- [ ] Nome exato do produto/módulo Olist utilizado pelo cliente e plano/conta.
- [ ] URL oficial da documentação da API e versão.
- [ ] Arquivo OpenAPI/Swagger, Postman collection ou exemplos oficiais, se disponíveis.
- [ ] Métodos de autenticação exigidos (somente o método; **não** copiar o token/segredo).
- [ ] Endereço base de produção e de homologação/testes, se houver.
- [ ] Endpoints e exemplos sanitizados para:
  - [ ] consultar produtos e variações;
  - [ ] consultar preço, disponibilidade e estoque;
  - [ ] criar pedido/venda;
  - [ ] consultar situação do pedido;
  - [ ] cancelar/estornar pedido, se suportado;
  - [ ] consultar formas de pagamento e taxas, se aplicável.
- [ ] Limites de requisição, paginação, timeout, política de repetição e códigos de erro.
- [ ] Campos obrigatórios para criar pedido e regras de cálculo de frete, desconto, taxa e total.
- [ ] Como evitar pedidos duplicados (idempotência ou referência externa).
- [ ] Ambiente de teste e usuário autorizado para validar pedidos fictícios.
- [ ] Confirmação de que a integração escolhida é permitida para a conta do cliente.

**Importante:** a criação de pedidos ficará bloqueada até mapear e testar o contrato real da API. Não presumir nomes de endpoints ou formato de payload.

## 2. WhatsApp Business / Meta

- [ ] Confirmar quem administra o Meta Business Portfolio e a conta WhatsApp Business (WABA).
- [ ] Confirmar se o número atual está ligado ao WhatsApp Business App, à Cloud API ou a outro provedor.
- [ ] Confirmar se é necessário manter o uso do mesmo número no aplicativo e na API; verificar elegibilidade e requisitos oficiais de coexistência antes de alterar qualquer configuração.
- [ ] Identificar o responsável autorizado a concluir verificações, permissões e configuração.
- [ ] Obter os links da documentação oficial e os identificadores não secretos necessários à configuração (por exemplo, WABA ID e Phone Number ID, quando aplicável).
- [ ] Definir a URL pública HTTPS que receberá o webhook e o procedimento para validar o desafio.
- [ ] Definir mensagens de atendimento, horário, idioma, encaminhamento para atendente humano e consentimentos aplicáveis.
- [ ] Validar modelos de mensagem e regras de janela de atendimento conforme as políticas vigentes.
- [ ] Planejar teste com um número autorizado antes de ativar o atendimento em produção.

**Nunca pedir ao cliente para enviar Access Token, App Secret, senha ou código de verificação no chat/GitHub.** Esses valores devem ser inseridos diretamente no ambiente de implantação autorizado.

## 3. Operação do restaurante e cardápio

- [ ] Nome comercial e dados públicos corretos da loja.
- [ ] Cardápio oficial com nomes, descrições, preços, adicionais e categorias.
- [ ] Horários, áreas de entrega, taxa mínima/frete e pedido mínimo.
- [ ] Regras para indisponibilidade de item e substituição.
- [ ] Formas de pagamento aceitas e momento de cobrança.
- [ ] Fluxo de confirmação, preparo, retirada/entrega, cancelamento e reembolso.
- [ ] Quais dados precisam aparecer na comanda e no recibo.
- [ ] Definir quem recebe alertas de pedido novo e quem pode alterar status.
- [ ] Validar tratamento de dados pessoais e acesso restrito aos pedidos.

## 4. Impressora e aparelhos

- [ ] Marca/modelo exato da impressora POS-58 e método de conexão (Bluetooth clássico/BLE/USB).
- [ ] Foto da etiqueta/modelo e manual ou comandos de impressão, se disponíveis.
- [ ] Modelo e versão Android do celular/tablet de teste.
- [ ] Confirmar pareamento, permissões Bluetooth e impressão de teste.
- [ ] Testar acentos, quebra de linha, quantidade, subtotal, total e largura do papel.
- [ ] Testar perda de conexão, reconexão e reimpressão sem duplicar pedido.
- [ ] Confirmar se o cliente precisa imprimir pelo Chrome ou aceita integração nativa compatível com o dispositivo.

## 5. Ambiente, domínio e publicação

- [ ] Onde o backend será hospedado e quem administra o ambiente.
- [ ] Domínio/subdomínio HTTPS e acesso ao DNS, com o responsável autorizado.
- [ ] Definir ambientes de homologação e produção.
- [ ] Definir política de backup, logs sem segredos, monitoramento e recuperação.
- [ ] Definir quem será responsável por atualizar credenciais e revogá-las.
- [ ] Se houver publicação na Google Play: confirmar titular da conta Play Console, identidade da empresa, nome do app, ícone, política de privacidade e dados exigidos para a ficha da loja.
- [ ] Manter o projeto atual intacto; mudanças ficam na branch `feat/olist-whatsapp-integration` até validação e aprovação.

## 6. Testes de aceite antes de ativar

- [ ] Catálogo, preços e disponibilidade correspondem à Olist.
- [ ] Pedido de teste contém cliente, itens, quantidades, adicionais, frete/descontos e total corretos.
- [ ] Repetir uma requisição não cria pedido duplicado.
- [ ] Erros e indisponibilidade são exibidos de forma clara e não confirmam pedido falsamente.
- [ ] Webhook rejeita chamadas sem assinatura válida.
- [ ] Atendente transfere a conversa para uma pessoa quando necessário.
- [ ] Impressão POS-58 validada no aparelho real.
- [ ] Teste de ponta a ponta aprovado pelo cliente antes de habilitar pedidos reais.

## 7. O que trazer para continuar o desenvolvimento

1. Links/arquivos oficiais de documentação da Olist e Meta.
2. Exemplos de requisição/resposta **com dados e segredos removidos**.
3. Respostas às decisões operacionais deste checklist.
4. Modelo da impressora e detalhes do aparelho Android.
5. Nome/contato profissional do responsável técnico, se houver.

## Estado técnico atual

- Backend inicial e configuração local preparados.
- Testes automatizados iniciais executados na branch de desenvolvimento.
- A integração real de criação de pedidos Olist ainda depende do contrato específico da conta e de testes.
- O webhook WhatsApp está preparado para validação, mas o processamento completo de mensagens ainda precisa ser implementado.
- Este documento é uma lista de preparação; não representa certificação nem ativação em produção.
