$ErrorActionPreference = "Stop"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js 24 LTS não foi encontrado. Instale Node.js 24 e abra um novo terminal."
}
$major = [int]((& node --version).Trim().TrimStart("v").Split(".")[0])
if ($major -lt 24 -or $major -ge 25) {
  Write-Error "Este projeto foi preparado para Node.js 24 LTS. Versão encontrada: $(node --version)"
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Arquivo .env criado a partir do modelo. Edite-o com os dados oficiais da API; não envie o arquivo ao GitHub." -ForegroundColor Yellow
} else {
  Write-Host "Arquivo .env já existe; ele foi preservado."
}

Write-Host "Executando testes locais..."
npm test
if ($LASTEXITCODE -ne 0) { throw "Os testes falharam." }

Write-Host ""
Write-Host "Preparação concluída. Revise .env e a documentação README.md." -ForegroundColor Green
Write-Host "Para iniciar localmente: npm start"
Write-Host "O servidor local padrão escuta em 127.0.0.1:8080."
