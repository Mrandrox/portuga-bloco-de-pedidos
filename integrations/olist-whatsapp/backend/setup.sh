#!/usr/bin/env sh
set -eu

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24 LTS não foi encontrado. Instale Node.js 24 e tente novamente." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 24 ] || [ "$NODE_MAJOR" -ge 25 ]; then
  echo "Este projeto foi preparado para Node.js 24 LTS; encontrado: $(node --version)" >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Criado .env a partir do modelo. Edite-o com os dados oficiais; nunca envie esse arquivo ao GitHub."
else
  echo "O .env existente foi preservado."
fi

npm test
echo "Preparação concluída. Revise .env e README.md; inicie com: npm start"
