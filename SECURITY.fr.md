# Politique de Sécurité

## Signaler une Vulnérabilité

**N'ouvrez PAS d'issue publique sur GitHub pour les vulnérabilités de sécurité.**

Il s'agit d'une plateforme de services financiers. Nous prenons la sécurité au sérieux et vous demandons de signaler les vulnérabilités de manière responsable.

### Comment Signaler

1. **Méthode privilégiée :** Utilisez les [GitHub Security Advisories](https://github.com/danweis07/Fiducia/security/advisories/new) pour signaler de manière privée.
2. **Alternative :** Envoyez vos préoccupations de sécurité par e-mail aux mainteneurs du dépôt listés dans [CODEOWNERS](CODEOWNERS).

### Ce qu'il Faut Inclure

- Description de la vulnérabilité
- Étapes pour reproduire le problème
- Composants affectés (frontend, edge functions, base de données, adaptateurs, etc.)
- Impact potentiel
- Correctif suggéré (si vous en avez un)

### Délai de Réponse

- **Accusé de réception :** sous 48 heures
- **Évaluation initiale :** sous 5 jours ouvrables
- **Correctif ou atténuation :** dépend de la gravité, mais nous visons :
  - Critique/Élevé : correctif sous 7 jours
  - Moyen : correctif sous 30 jours
  - Faible : prochaine version planifiée

## Versions Prises en Charge

| Version              | Prise en charge |
| -------------------- | --------------- |
| Dernière `main`      | Oui             |
| Versions antérieures | Au mieux        |

## Pratiques de Sécurité

### Ce qui Est en Place

- **Authentification :** Supabase Auth avec JWT, RLS (Row Level Security) sur toutes les tables
- **Autorisation :** Contrôle d'accès basé sur les rôles, isolation des locataires via les politiques RLS
- **Validation des entrées :** Schémas Zod pour les saisies de formulaires, validation côté serveur dans les edge functions
- **En-têtes de sécurité :** X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy (configurés dans nginx, Vercel et le middleware edge)
- **Analyse des dépendances :** Dependabot activé pour npm et GitHub Actions
- **Analyse statique :** Workflow CodeQL disponible pour l'analyse du code
- **Détection de secrets :** Workflow GitHub de détection de secrets disponible
- **Analyse de conteneurs :** Workflow Trivy/Grype disponible pour les images Docker
- **DAST :** Workflow OWASP ZAP disponible pour les tests dynamiques
- **Journalisation d'audit :** Toutes les opérations sensibles sont enregistrées dans la table `audit_logs`
- **Limitation de débit :** Limites de débit configurables par locataire
- **Hooks de pre-commit :** Husky + lint-staged pour détecter les problèmes avant le push

### Pour les Déployeurs

Lors du déploiement en production, assurez-vous que :

- [ ] `VITE_DEMO_MODE` est défini à `false`
- [ ] Toutes les politiques RLS de Supabase sont vérifiées pour votre configuration de locataire
- [ ] La clé anon Supabase est la clé _publique_ (pas la clé de rôle service) dans le code frontend
- [ ] La clé de rôle service n'est utilisée que dans les edge functions, jamais exposée au client
- [ ] Les en-têtes de sécurité sont actifs (vérifiez avec [securityheaders.com](https://securityheaders.com))
- [ ] Activez les workflows d'analyse de sécurité dans `.github/workflows-available/` :
  - `codeql-analysis.yml` — analyse statique
  - `dependency-audit.yml` — vulnérabilités des dépendances
  - `container-scan.yml` — CVEs des images Docker
  - `secret-scanning.yml` — identifiants divulgués
  - `dast-zap.yml` — analyse de vulnérabilités à l'exécution
- [ ] Changez tous les identifiants et secrets par défaut
- [ ] Configurez le DSN Sentry pour le monitoring des erreurs
- [ ] Révisez et renforcez le CSP pour votre domaine spécifique

### Fichiers Sensibles

Les éléments suivants sont exclus du contrôle de version via `.gitignore` :

- `.env`, `.env.local`, `.env.*.local` — variables d'environnement et secrets
- `coverage/` — rapports de couverture de tests
- `node_modules/` — dépendances

Ne commitez jamais de clés API, mots de passe ou tokens dans le dépôt.

## SBOM (Software Bill of Materials)

Un workflow de génération de SBOM est disponible dans `.github/workflows-available/sbom.yml`. Activez-le pour produire des SBOMs CycloneDX ou SPDX pour la conformité et l'audit de la chaîne d'approvisionnement.
