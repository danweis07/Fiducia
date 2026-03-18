# Contribuindo com o Fiducia

Obrigado pelo seu interesse em contribuir. Este documento cobre as convenções e o processo para ter suas alterações integradas.

## Primeiros Passos

```bash
git clone https://github.com/danweis07/Fiducia.git && cd Fiducia
./scripts/setup.sh --demo
npm run dev
```

Consulte o [README](README.md) para opções completas de configuração (modo demo, Docker full stack, Supabase CLI).

## Fluxo de Desenvolvimento

1. **Faça um fork do repositório** e crie uma branch a partir da `main`
2. **Nomeie sua branch** seguindo a convenção: `feature/descricao-curta`, `fix/descricao-curta` ou `chore/descricao-curta`
3. **Faça suas alterações** — mantenha os PRs focados em uma única preocupação
4. **Valide antes de fazer push:**
   ```bash
   npm run validate    # typecheck + lint + test + build
   ```
5. **Abra um pull request** contra a `main`

## Diretrizes para Pull Requests

- Mantenha os PRs pequenos e focados. Uma funcionalidade ou correção por PR.
- Escreva um título e uma descrição claros. Explique _o que_ mudou e _por quê_.
- Inclua capturas de tela para alterações de interface.
- Adicione ou atualize testes para novas funcionalidades.
- Certifique-se de que o CI passe (lint, typecheck, testes unitários, build).
- PRs requerem pelo menos uma revisão com aprovação antes do merge.

## Mensagens de Commit

Use mensagens de commit claras, no modo imperativo:

```
Add wire transfer dual-approval workflow
Fix ACH cutoff timezone handling for Pacific time
Update Symitar adapter to support SymXchange v2 endpoints
Remove deprecated card activation flow
```

Prefixe com a área, se útil: `[adapters]`, `[i18n]`, `[admin]`, `[mobile]`, etc.

## Estilo de Código

- **TypeScript** — modo estrito habilitado. Sem `any`, a menos que inevitável.
- **React** — componentes funcionais com hooks. Sem componentes de classe.
- **Estilização** — classes utilitárias do Tailwind CSS. Use os design tokens existentes em `tailwind.config.ts`.
- **Primitivas de UI** — use componentes de `src/components/ui/` (baseados em Radix, padrão shadcn/ui).
- **Imports** — use o alias de caminho `@/` (ex.: `import { Button } from "@/components/ui/button"`).
- **Formatação** — o ESLint impõe o estilo. Execute `npm run lint:fix` para corrigir automaticamente.
- **Testes** — Vitest para testes unitários, Playwright para E2E. Coloque testes unitários em diretórios `__tests__/` ou junto ao arquivo como `*.test.ts(x)`.

## Adicionando um Novo Adaptador de Integração

Os adaptadores seguem um padrão consistente. Todo adaptador deve:

1. Definir uma interface TypeScript em `src/types/`
2. Implementar uma versão mock/demo em `src/lib/demo-data/`
3. Implementar o adaptador real (se aplicável)
4. Registrar no registro de adaptadores para que possa ser selecionado via variável de ambiente
5. Fazer fallback graciosamente para o mock quando nenhuma credencial estiver configurada

Use o template de issue "New Adapter" para propor um antes de começar o trabalho.

## Adicionando Traduções (i18n)

As traduções ficam em `src/lib/i18n/locales/<lang-code>.json`. Para adicionar ou atualizar:

1. Edite o arquivo JSON do locale relevante
2. Execute `npm run i18n:check` para verificar se todas as chaves estão presentes em todos os idiomas
3. Execute `npm run i18n:types` para regenerar os tipos TypeScript

O inglês (`en.json`) é a fonte de verdade. Todos os outros locales devem corresponder à sua estrutura de chaves.

## Migrações de Banco de Dados

As migrações estão em `supabase/migrations/`. Para adicionar uma:

1. Crie um novo arquivo SQL com a convenção de nomenclatura: `YYYYMMDD_description.sql`
2. Escreva SQL idempotente (use `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.)
3. Inclua tanto a migração quanto quaisquer dados de seed necessários
4. Teste localmente com `docker compose up` (as migrações são aplicadas automaticamente)

## Reportando Bugs

Use o template de issue [Bug Report](https://github.com/danweis07/Fiducia/issues/new?template=bug_report.yml).

## Solicitando Funcionalidades

Use o template de issue [Feature Request](https://github.com/danweis07/Fiducia/issues/new?template=feature_request.yml).

## Vulnerabilidades de Segurança

**NÃO abra uma issue pública.** Consulte [SECURITY.md](SECURITY.md) para instruções de divulgação responsável.

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a [Licença MIT](LICENSE).
