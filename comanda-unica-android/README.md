# Portuga — Comanda Única

Segundo app baseado no exemplo do Portuga — Bloco de Pedidos.

- Um cliente por vez.
- Uma única comanda contínua.
- Não cria uma comanda nova para cada item.
- Abas: Lanches, Bebidas, Petiscos e Combos.
- Busca, quantidade +/−, salvar e finalizar.
- Cliente e comanda persistidos no aparelho.
- Layout responsivo pensado primeiro para Android.
- Estrutura Capacitor/WebView com HTTPS + localhost.

Os produtos e preços da primeira versão são demonstrativos e podem ser substituídos pelo cardápio real.

Para gerar Android: npm install && npx cap add android && npx cap sync android
