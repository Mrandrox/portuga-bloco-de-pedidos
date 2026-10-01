# Bloco de Notas — Android

Projeto Android do Bloco de Notas, mantendo a aplicação web original em `www/index.html`.

## Download do APK

O GitHub Actions gera automaticamente o APK de debug a cada alteração na branch `main`. O APK aparece na execução do workflow como artefato **bloco-de-notas-android**.

Para uma versão permanente, crie uma tag como `v1.0.0`; o workflow publica o APK automaticamente em **Releases**.

## Impressão Bluetooth

A camada nativa inclui Bluetooth Classic/SPP com ESC/POS, priorizando impressoras POS 58 e outros modelos térmicos compatíveis.

1. Pareie a impressora no Bluetooth do Android.
2. Abra o app.
3. Selecione a impressora térmica.
4. Conecte e faça um teste de impressão.

Modelos com protocolo proprietário podem exigir integração específica do fabricante.

## Desenvolvimento

Requisitos: Node.js 22+, Android Studio compatível com Capacitor 8 e Android SDK API 24+.

```bash
npm install
npm run android:prepare
npm run android:build
```

O APK debug será gerado em:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Conteúdo original

Uma cópia do HTML original está em `original/bloco-de-notas-original.html`.
