# Frontend Loja

Interface em Nuxt 4, Vue 3, TypeScript e Tailwind CSS, com catálogo, carrinho, checkout, área do cliente e painel administrativo.

## Executar

Requisito: Node.js 24.11 ou superior.

```powershell
npm ci
npm run dev
```

Acesse http://127.0.0.1:3000. Configure as variáveis de `.env.example` em um arquivo `.env` antes de iniciar:

- `NUXT_PUBLIC_API_BASE`: endereço da API, incluindo `/api/v1`.
- `NUXT_PUBLIC_DEMO_MODE=false`: usa a API; falhas de rede não ativam dados fictícios.
- `NUXT_PUBLIC_DEMO_MODE=true`: usa os dados locais de demonstração no navegador.

A API é mantida separadamente em [backend-ace](https://github.com/RenzoRav/backend-ace). Configure no backend a origem do frontend, por exemplo `http://127.0.0.1:3000`, e use hosts compatíveis para os cookies. O frontend depende dos endpoints consumidos em `app/utils/api` e `app/composables/useApiOperations.ts`; a compatibilidade deve ser validada com a versão da API utilizada.

No Windows, `INICIAR.bat` instala as dependências se necessário e abre o frontend em modo de demonstração. A conta demonstrativa da gestora usa `gestora@exemplo.test` / `Loja123456!`.

## Verificar e compilar

```powershell
npm run typecheck
npm run format:check
npm run build
npm run preview
```

## Publicação

`netlify.toml` configura a publicação estática em `.output/public`, com modo de demonstração habilitado. Para usar a API, ajuste as variáveis da publicação e disponibilize o backend separadamente. `scripts/write-release.mjs` gera os metadados da versão durante a compilação.

## Organização

- `app/`: páginas, componentes, estilos, estado e integração com a API.
- `public/`: arquivos públicos e cabeçalhos da hospedagem.
- `scripts/`: preparação da versão para publicação.

As pastas `node_modules`, `.nuxt` e `.output` são geradas pelas ferramentas e não entram no Git.
