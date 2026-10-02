# Release 1.1.0

## Alterações

- Mantém o HTML/React enviado como base da aplicação.
- Adiciona uma aba persistente por cliente.
- Permite múltiplos pedidos no mesmo cliente sem criar nova comanda.
- Calcula e exibe o subtotal individual antes do total geral.
- Exibe o histórico de pedidos da comanda por cliente.
- Mantém Lanches, Petiscos, Pizzas e Bebidas como atalhos do catálogo.
- Substitui a dependência da Web Bluetooth do Chrome para POS-58 no Android por Bluetooth Classic/SPP nativo.
- Salva a impressora pareada e tenta reconectar automaticamente.
- Mantém a geração ESC/POS existente.
- Reutiliza a logo embutida no HTML como ícone do APK.
- Cria download direto e estável pelo GitHub Releases.

## Observação

O build do APK acontece pelo GitHub Actions porque o projeto Android é gerado pelo Capacitor no ambiente de build.