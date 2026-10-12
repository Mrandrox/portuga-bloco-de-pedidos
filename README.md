# Portuga — Bloco de Pedidos

Sistema de pedidos e comandas para atendimento. A branch `main` permanece separada da preparação das integrações.

## Android existente

**[BAIXAR O APK MAIS RECENTE](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases/latest/download/Portuga-Bloco-de-Pedidos.apk)**

A versão Android existente foi projetada para manter a aplicação web atual e inclui fluxo de comanda contínua e impressão POS-58, sujeito a testes no dispositivo real.

## Preparação da plataforma de pedidos e integrações

- [Plano Android, cliente e Google Play](docs/ANDROID-PLAY-ROADMAP.md)
- [Backend de integração — instalação e configuração na máquina do cliente](integrations/olist-whatsapp/backend/README.md)
- [Plano técnico Olist + WhatsApp](integrations/olist-whatsapp/README.md)

**Importante:** o backend é um scaffold de integração com proteções fail-closed. O catálogo exige os caminhos oficiais da API Olist; criação de pedidos e processamento automático de mensagens permanecem desativados até implementar e testar o mapeamento específico da conta. Não insira segredos no repositório.
