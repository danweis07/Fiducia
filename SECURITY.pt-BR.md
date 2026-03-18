# Política de Segurança

## Reportando uma Vulnerabilidade

**NÃO abra uma issue pública no GitHub para vulnerabilidades de segurança.**

Esta é uma plataforma de serviços financeiros. Levamos a segurança a sério e pedimos que você reporte vulnerabilidades de forma responsável.

### Como Reportar

1. **Preferencial:** Use os [GitHub Security Advisories](https://github.com/danweis07/Fiducia/security/advisories/new) para reportar de forma privada.
2. **Alternativa:** Envie preocupações de segurança por e-mail para os mantenedores do repositório listados em [CODEOWNERS](CODEOWNERS).

### O Que Incluir

- Descrição da vulnerabilidade
- Passos para reproduzir
- Componentes afetados (frontend, edge functions, banco de dados, adaptadores, etc.)
- Impacto potencial
- Correção sugerida (se você tiver uma)

### Prazo de Resposta

- **Confirmação de recebimento:** em até 48 horas
- **Avaliação inicial:** em até 5 dias úteis
- **Correção ou mitigação:** depende da severidade, mas nosso objetivo é:
  - Crítico/Alto: correção em até 7 dias
  - Médio: correção em até 30 dias
  - Baixo: próxima release programada

## Versões Suportadas

| Versão              | Suportada      |
| ------------------- | -------------- |
| Última `main`       | Sim            |
| Releases anteriores | Melhor esforço |

## Práticas de Segurança

### O Que Está Implementado

- **Autenticação:** Supabase Auth com JWT, RLS (Row Level Security) em todas as tabelas
- **Autorização:** Controle de acesso baseado em funções, isolamento de tenant via políticas RLS
- **Validação de entrada:** Schemas Zod para inputs de formulários, validação no lado do servidor nas edge functions
- **Headers de segurança:** X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy (configurados no nginx, Vercel e edge middleware)
- **Varredura de dependências:** Dependabot habilitado para npm e GitHub Actions
- **Análise estática:** Workflow do CodeQL disponível para varredura de código
- **Varredura de secrets:** Workflow de varredura de secrets do GitHub disponível
- **Varredura de containers:** Workflow Trivy/Grype disponível para imagens Docker
- **DAST:** Workflow do OWASP ZAP disponível para testes dinâmicos
- **Log de auditoria:** Todas as operações sensíveis registradas na tabela `audit_logs`
- **Limitação de taxa:** Limites de taxa configuráveis por tenant
- **Hooks de pre-commit:** Husky + lint-staged para detectar problemas antes do push

### Para Implantadores

Ao implantar em produção, certifique-se de que:

- [ ] `VITE_DEMO_MODE` está definido como `false`
- [ ] Todas as políticas RLS do Supabase estão verificadas para sua configuração de tenant
- [ ] A chave anon do Supabase é a chave _pública_ (não a chave de service role) no código do frontend
- [ ] A chave de service role é usada apenas nas edge functions, nunca exposta ao cliente
- [ ] Os headers de segurança estão ativos (verifique com [securityheaders.com](https://securityheaders.com))
- [ ] Habilite os workflows de varredura de segurança em `.github/workflows-available/`:
  - `codeql-analysis.yml` — análise estática
  - `dependency-audit.yml` — vulnerabilidades de dependências
  - `container-scan.yml` — CVEs em imagens Docker
  - `secret-scanning.yml` — credenciais vazadas
  - `dast-zap.yml` — varredura de vulnerabilidades em tempo de execução
- [ ] Rotacione todas as credenciais e secrets padrão
- [ ] Configure o DSN do Sentry para monitoramento de erros
- [ ] Revise e reforce o CSP para o seu domínio específico

### Arquivos Sensíveis

Os seguintes arquivos são excluídos do controle de versão via `.gitignore`:

- `.env`, `.env.local`, `.env.*.local` — variáveis de ambiente e secrets
- `coverage/` — relatórios de cobertura de testes
- `node_modules/` — dependências

Nunca faça commit de chaves de API, senhas ou tokens no repositório.

## SBOM (Software Bill of Materials)

Um workflow de geração de SBOM está disponível em `.github/workflows-available/sbom.yml`. Habilite-o para produzir SBOMs CycloneDX ou SPDX para conformidade e auditoria da cadeia de suprimentos.
