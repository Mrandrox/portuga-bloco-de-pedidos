# Portuga — Comanda Única

Aplicativo Android de atendimento com **uma comanda contínua por cliente**.

## Download fácil

**[BAIXAR APK MAIS RECENTE](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases/latest/download/app-debug.apk)**

O link acima sempre aponta para a versão pública mais recente do aplicativo.

### Instalação no Android

1. Abra o link de download no celular.
2. Baixe o arquivo **APK**.
3. Abra o APK após o download.
4. Se o Android pedir autorização, permita a instalação de aplicativos desta fonte.
5. Toque em **Instalar**.
6. Abra **Portuga — Comanda Única**.

> A instalação por APK pode exigir a autorização de instalação para o navegador ou gerenciador de arquivos do aparelho. Isso é uma proteção do próprio Android.

## Como funciona

- Um cliente por vez.
- Uma única comanda contínua.
- Não cria uma comanda nova para cada item.
- Abas separadas: **Lanches**, **Bebidas**, **Petiscos** e **Combos**.
- Busca de produtos.
- Botões grandes de **+** e **−** para uso no balcão.
- Resumo da comanda sempre acessível.
- Total atualizado automaticamente.
- Salvar comanda.
- Finalizar comanda.
- Nova comanda somente quando o atendimento anterior for encerrado.
- Dados da comanda e do cliente ficam persistidos no aparelho.
- Interface responsiva para telas pequenas e grandes.

## Cardápio inicial

Os produtos e preços da primeira versão são demonstrativos e ficam preparados para substituição pelo cardápio real.

## Projeto

- App ID: `com.blocodenotas.comandaunica`
- Tecnologia: Capacitor + Android/WebView.
- Código-fonte: [GitHub](https://github.com/Mrandrox/portuga-bloco-de-pedidos/tree/main/comanda-unica-android)
- Download: [último APK](https://github.com/Mrandrox/portuga-bloco-de-pedidos/releases/latest/download/app-debug.apk)

## Desenvolvimento

Para gerar o APK localmente:

```bash
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

O GitHub Actions também gera automaticamente o APK e publica a versão mais recente na área de Releases.
