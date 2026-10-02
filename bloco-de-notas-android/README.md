# Portuga — Bloco de Pedidos Android

Esta pasta transforma o HTML atual do **Bloco de Pedidos** em um APK Android instalável, sem trocar a interface por outro aplicativo.

## Download direto do APK

**[BAIXAR O APK — Portuga-Bloco-de-Pedidos.apk](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases/latest/download/Portuga-Bloco-de-Pedidos.apk)**

O GitHub Actions publica automaticamente o APK da branch `main` em uma Release. O link acima permanece igual nas próximas atualizações.

## Instalação

1. Abra o link no Android.
2. Baixe `Portuga-Bloco-de-Pedidos.apk`.
3. Abra o arquivo.
4. Caso o Android solicite, permita que o navegador/gerenciador de arquivos instale aplicativos desta fonte.
5. Toque em **Instalar**.

## Comanda contínua por cliente

A aplicação mantém uma aba persistente para cada cliente:

- `+ Cliente` cria a aba uma única vez.
- O mesmo cliente pode receber vários pedidos sem criar outra comanda.
- Cada aba mostra quantidade de pedidos e **subtotal individual**.
- `Ver pedidos desta comanda` mostra todos os pedidos daquele cliente e a soma individual.
- `Novo pedido para [cliente]` reabre o formulário já preenchido.
- O faturamento geral continua sendo calculado pela própria lista de pedidos existente no projeto.

## Cardápio

O fluxo original continua usando o catálogo já existente, com atalhos visuais para:

**Lanches • Petiscos • Pizzas • Bebidas**

## Impressora POS-58

No Android, a impressão usa uma ponte nativa **Bluetooth Classic / SPP**, em vez de depender do `navigator.bluetooth` do Chrome para a POS-58.

Fluxo:

1. Ligue e pareie a POS-58 no Bluetooth do Android.
2. Abra o app.
3. Entre em **Imprimir pedido**.
4. Use **Conexão Bluetooth** para escolher a impressora pareada.
5. A impressora selecionada fica salva no aparelho.
6. Se a conexão cair, o app tenta reconectar automaticamente antes de enviar a impressão.
7. O recibo continua sendo gerado em **ESC/POS**, usando a mesma montagem do projeto atual.

Impressoras térmicas com protocolo proprietário podem exigir ajustes específicos.

## Compatibilidade

O projeto usa Capacitor 8 e mantém o mínimo em Android 7.0 (API 24). A compatibilidade real também depende do WebView/Chrome e do hardware Bluetooth do aparelho.

## Build local

Requisitos:

- Node.js 22+
- Android Studio
- Android SDK API 24+
- JDK 17+

```bash
npm install
npm run android:prepare
npm run android:build
```

APK:

`android/app/build/outputs/apk/debug/app-debug.apk`