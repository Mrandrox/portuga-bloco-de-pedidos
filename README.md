# Portuga — Bloco de Pedidos

## 📱 Instalação rápida no Android

### ⬇️ BAIXAR O APK

**[TOQUE AQUI PARA BAIXAR O APK MAIS RECENTE](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases/latest/download/app-debug.apk)**

Depois do download:

1. Abra o arquivo `app-debug.apk`.
2. Autorize o Android a instalar aplicativos desta fonte quando solicitado.
3. Toque em **Instalar**.
4. Abra **Portuga — Bloco de Pedidos**.

> O link acima acompanha automaticamente a versão mais recente publicada no GitHub.

## 🌐 Usar pelo Chrome

A aplicação web também pode ser usada pelo navegador e pode ser adicionada à tela inicial quando o Chrome oferecer a opção de instalação.

## 🖨️ Impressão térmica

O aplicativo Android possui integração nativa para impressoras Bluetooth ESC/POS, incluindo a linha POS 58 compatível.

No Android:
- ligue e pareie a impressora Bluetooth;
- abra o aplicativo;
- use a opção de conexão da impressora;
- selecione a impressora;
- envie a comanda para impressão.

No Chrome, a impressão depende do suporte Bluetooth/Web Bluetooth do navegador e da impressora.

## 📦 Projeto

O código Android fica em `bloco-de-notas-android/`.

A versão Android usa Capacitor e mantém a interface web dentro do aplicativo, com uma ponte nativa para as funções de impressão Bluetooth.

## 🤖 APK pelo GitHub Actions

O repositório possui build automático pelo GitHub Actions.

Cada atualização em `main` recompila o APK. Para publicar uma nova versão em Releases, use uma mensagem de commit contendo:

`[release-apk]`

O APK publicado fica disponível automaticamente em:

`Releases → Latest → app-debug.apk`

## 🔗 Links

- [Repositório GitHub](https://github.com/Mrandrox/portuga-bloco-de-pedidos)
- [Releases](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases)
- [Baixar APK mais recente](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases/latest/download/app-debug.apk)
