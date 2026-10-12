# Portuga das Américas — Plano Android e pedidos digitais

**Status:** plano aprovado; implementação e publicação ainda não concluídas.  
**Regra de segurança:** trabalhar na branch `feat/olist-whatsapp-integration`; não alterar `main` nem substituir a aplicação atual sem revisão e testes.

## Objetivo

Preparar uma plataforma com:
- app Android para clientes fazerem pedidos;
- painel/operação interna preservando o fluxo existente de comandas;
- integração com WhatsApp oficial, mantendo o número atual se a Meta confirmar elegibilidade para coexistência;
- integração automática com o Olist ERP/PDV após validar a API e as permissões da conta;
- impressão POS-58 Bluetooth;
- preparação para distribuição pela Google Play.

## Arquitetura proposta

1. **App Android / interface do cliente:** cardápio, categorias, carrinho, identificação, endereço e estado do pedido. Reutilizar a aplicação web atual quando tecnicamente compatível, sem presumir que ela já cobre o fluxo de cliente final.
2. **Backend seguro:** autenticação, persistência de pedidos, validação de preços/estoque, regras de negócio e integração com serviços externos. Segredos ficam somente no servidor.
3. **Adaptador Olist:** implementar apenas operações confirmadas na documentação da edição/conta do usuário. Não adivinhar URLs, payloads, scopes nem métodos de autenticação.
4. **Adaptador WhatsApp:** webhooks HTTPS validados, deduplicação por ID de mensagem, tratamento de erros e transferência para atendente humano.
5. **Impressão POS-58:** manter a funcionalidade existente e executar testes no dispositivo real. A impressão Bluetooth pode exigir integração Android nativa; suporte do navegador sozinho não deve ser presumido em todos os aparelhos.
6. **Operação interna:** preservar comandas contínuas por cliente, subtotais, categorias e funções existentes até os testes de regressão passarem.

## Fluxo seguro do pedido

1. Cliente monta o pedido e informa os dados necessários.
2. Backend consulta ou valida preços e disponibilidade usando fontes oficiais confirmadas.
3. Cliente revisa e confirma o resumo final.
4. Backend registra o pedido no Olist somente por endpoint oficialmente documentado e autorizado.
5. Se houver timeout ou resposta ambígua, consultar o estado antes de repetir a criação; nunca gerar duplicidade por repetição cega.
6. Confirmar ao cliente somente após confirmação confiável do registro. Em falhas, avisar que o pedido está pendente e encaminhar para revisão humana.
7. Enviar o pedido para impressão conforme o fluxo operacional aprovado.

## Fases e critérios de aceite

### Fase 0 — Auditoria e preservação
- Inventariar arquivos, fluxos, marca/logo, funções de comanda e impressão.
- Confirmar o estado da branch de trabalho e manter `main` intacta.
- Criar lista de testes de regressão do sistema atual.

**Aceite:** funções atuais documentadas e nenhum segredo ou dado de cliente commitado.

### Fase 1 — App de pedidos para clientes
- Definir a experiência de compra para cliente final separada da tela interna, caso os fluxos sejam diferentes.
- Implementar cardápio, carrinho, endereço, revisão e estados do pedido.
- Validar acessibilidade, telas pequenas e comportamento com conexão instável.

**Aceite:** pedido de teste percorre o fluxo sem integração de produção e sem cobrar/registrar uma venda real.

### Fase 2 — Backend e Olist
- Receber a documentação/API específica da conta e identificar endpoints, autenticação, limites, paginação e ambiente de homologação.
- Implementar leitura de catálogo/preços/estoque e criação/consulta de pedidos somente se a API disponibilizar essas operações.
- Testar idempotência, revalidação, timeout, erros e conciliação.

**Aceite:** pedidos de homologação confirmados no sistema correto, sem duplicidade e com logs sem tokens/dados sensíveis.

### Fase 3 — WhatsApp
- Confirmar elegibilidade do número atual para coexistência e concluir onboarding oficial antes de qualquer migração.
- Configurar webhooks, deduplicação, respostas, confirmação do pedido e transferência humana.
- Usar o mesmo backend e as mesmas regras de preço/estoque do app.

**Aceite:** conversas e pedidos de teste funcionam sem mensagens duplicadas nem confirmações falsas.

### Fase 4 — POS-58 e regressão
- Testar pareamento, impressão, desconexão, reconexão e reimpressão controlada em aparelhos reais.
- Repetir testes de comandas, subtotais, categorias e operação existente.

**Aceite:** funções existentes continuam operando; falhas são recuperáveis e não criam pedidos duplicados.

### Fase 5 — Google Play
- Gerar build de release assinado e seguro; proteger chave de assinatura e credenciais.
- Preparar ícone, capturas de tela, descrição, classificação etária, política de privacidade, declaração de segurança de dados e acesso de revisão.
- Conferir requisitos atuais de versão-alvo/API, testes e verificação de conta aplicáveis no Play Console.
- Enviar para revisão e aguardar decisão do Google.

**Aceite:** release validado, materiais completos e submissão feita pela conta do proprietário. Aprovação não pode ser garantida antecipadamente.

## Dependências do proprietário

- Link ou arquivo da documentação da API da conta Olist (sem token ou senha).
- Confirmação do nome exato do produto/edição Olist e acesso ao ambiente de homologação, se disponível.
- Acesso à conta Meta Business/WhatsApp para verificar coexistência; não remover o número atual nem iniciar migração antes da confirmação.
- Conta Google Play Console e dados legais/de privacidade exigidos pela loja.
- APK/projeto atual e dispositivo Android + impressora POS-58 para testes, caso não estejam acessíveis no repositório.

## Segurança e privacidade

- Nunca commitar tokens, senhas, chaves privadas, dados de pagamento ou dados pessoais de clientes.
- Não guardar credenciais de API no HTML, JavaScript entregue ao cliente ou APK.
- Minimizar dados coletados, restringir acessos, definir retenção e publicar política de privacidade verdadeira.
- IA pode interpretar mensagens e sugerir itens, mas preço, estoque, total e confirmação final vêm do backend e dos sistemas oficiais.
- Não processar pagamentos com cartão diretamente; usar provedor adequado se pagamento online for incluído numa fase futura.

## Estado real

Este arquivo registra o plano. Não significa que o app de cliente, backend, integração de produção, APK de release ou publicação na Play Store já estejam implementados. O próximo bloqueio técnico é obter e validar a documentação específica da API Olist e auditar os arquivos atuais antes de escrever o adaptador.
