# Contribuer à Fiducia

Merci de votre intérêt pour contribuer. Ce document couvre les conventions et le processus pour faire fusionner vos modifications.

## Pour Commencer

```bash
git clone https://github.com/danweis07/Fiducia-.git && cd Fiducia-
./scripts/setup.sh --demo
npm run dev
```

Consultez le [README](README.md) pour toutes les options de configuration (mode démo, stack complète Docker, Supabase CLI).

## Flux de Travail de Développement

1. **Forkez le dépôt** et créez une branche à partir de `main`
2. **Nommez votre branche** en suivant la convention : `feature/description-courte`, `fix/description-courte`, ou `chore/description-courte`
3. **Effectuez vos modifications** — gardez les PRs concentrées sur un seul sujet
4. **Validez avant de pousser :**
   ```bash
   npm run validate    # typecheck + lint + test + build
   ```
5. **Ouvrez une pull request** contre `main`

## Directives pour les Pull Requests

- Gardez les PRs petites et ciblées. Une fonctionnalité ou un correctif par PR.
- Rédigez un titre et une description clairs. Expliquez _ce qui_ a changé et _pourquoi_.
- Incluez des captures d'écran pour les modifications d'interface.
- Ajoutez ou mettez à jour les tests pour les nouvelles fonctionnalités.
- Assurez-vous que la CI passe (lint, typecheck, tests unitaires, build).
- Les PRs nécessitent au moins une revue approbative avant la fusion.

## Messages de Commit

Utilisez des messages de commit clairs, à l'impératif :

```
Add wire transfer dual-approval workflow
Fix ACH cutoff timezone handling for Pacific time
Update Symitar adapter to support SymXchange v2 endpoints
Remove deprecated card activation flow
```

Préfixez avec le domaine si utile : `[adapters]`, `[i18n]`, `[admin]`, `[mobile]`, etc.

## Style de Code

- **TypeScript** — le mode strict est activé. Pas de `any` sauf si inévitable.
- **React** — composants fonctionnels avec hooks. Pas de composants de classe.
- **Styles** — classes utilitaires Tailwind CSS. Utilisez les tokens de design existants dans `tailwind.config.ts`.
- **Primitives UI** — utilisez les composants de `src/components/ui/` (basés sur Radix, pattern shadcn/ui).
- **Imports** — utilisez l'alias de chemin `@/` (ex. `import { Button } from "@/components/ui/button"`).
- **Formatage** — ESLint applique le style. Lancez `npm run lint:fix` pour corriger automatiquement.
- **Tests** — Vitest pour les tests unitaires, Playwright pour les tests E2E. Placez les tests unitaires dans les répertoires `__tests__/` ou colocalisez-les en tant que `*.test.ts(x)`.

## Ajouter un Nouvel Adaptateur d'Intégration

Les adaptateurs suivent un patron cohérent. Chaque adaptateur doit :

1. Définir une interface TypeScript dans `src/types/`
2. Implémenter une version mock/démo dans `src/lib/demo-data/`
3. Implémenter l'adaptateur réel (le cas échéant)
4. S'enregistrer dans le registre des adaptateurs afin d'être sélectionnable via une variable d'environnement
5. Se replier gracieusement sur le mock lorsqu'aucun identifiant n'est configuré

Utilisez le modèle d'issue « New Adapter » pour en proposer un avant de commencer le travail.

## Ajouter des Traductions (i18n)

Les traductions se trouvent dans `src/lib/i18n/locales/<lang-code>.json`. Pour ajouter ou mettre à jour :

1. Modifiez le fichier JSON de la locale concernée
2. Lancez `npm run i18n:check` pour vérifier que toutes les clés sont présentes dans toutes les langues
3. Lancez `npm run i18n:types` pour régénérer les types TypeScript

L'anglais (`en.json`) est la source de vérité. Toutes les autres locales doivent correspondre à sa structure de clés.

## Migrations de Base de Données

Les migrations se trouvent dans `supabase/migrations/`. Pour en ajouter une :

1. Créez un nouveau fichier SQL avec la convention de nommage : `YYYYMMDD_description.sql`
2. Écrivez du SQL idempotent (utilisez `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.)
3. Incluez à la fois la migration et les données d'amorçage nécessaires
4. Testez localement avec `docker compose up` (les migrations s'appliquent automatiquement)

## Signaler des Bugs

Utilisez le modèle d'issue [Bug Report](https://github.com/danweis07/Fiducia-/issues/new?template=bug_report.yml).

## Demander des Fonctionnalités

Utilisez le modèle d'issue [Feature Request](https://github.com/danweis07/Fiducia-/issues/new?template=feature_request.yml).

## Vulnérabilités de Sécurité

**N'ouvrez PAS d'issue publique.** Consultez [SECURITY.md](SECURITY.md) pour les instructions de divulgation responsable.

## Licence

En contribuant, vous acceptez que vos contributions soient licenciées sous la [Licence MIT](LICENSE).
