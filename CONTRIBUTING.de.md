# Mitwirken bei Fiducia

Vielen Dank für Ihr Interesse an einer Mitarbeit. Dieses Dokument beschreibt die Konventionen und den Prozess, um Ihre Änderungen zusammenzuführen.

## Erste Schritte

```bash
git clone https://github.com/danweis07/Fiducia-.git && cd Fiducia-
./scripts/setup.sh --demo
npm run dev
```

Siehe die [README](README.de.md) für alle Setup-Optionen (Demo-Modus, Docker Full Stack, Supabase CLI).

## Entwicklungsablauf

1. **Repository forken** und einen Branch von `main` erstellen
2. **Branch benennen** nach der Konvention: `feature/kurze-beschreibung`, `fix/kurze-beschreibung` oder `chore/kurze-beschreibung`
3. **Änderungen vornehmen** — PRs auf ein einzelnes Anliegen fokussieren
4. **Vor dem Push validieren:**
   ```bash
   npm run validate    # typecheck + lint + test + build
   ```
5. **Pull Request öffnen** gegen `main`

## Pull-Request-Richtlinien

- PRs klein und fokussiert halten. Ein Feature oder Fix pro PR.
- Einen klaren Titel und eine klare Beschreibung verfassen. Erklären Sie, _was_ geändert wurde und _warum_.
- Screenshots bei UI-Änderungen beifügen.
- Tests für neue Funktionalität hinzufügen oder aktualisieren.
- Sicherstellen, dass CI besteht (Lint, Typecheck, Unit-Tests, Build).
- PRs benötigen mindestens ein genehmigendes Review vor dem Merge.

## Commit-Nachrichten

Verwenden Sie klare Commit-Nachrichten im Imperativ:

```
Add wire transfer dual-approval workflow
Fix ACH cutoff timezone handling for Pacific time
Update Symitar adapter to support SymXchange v2 endpoints
Remove deprecated card activation flow
```

Optional mit Bereichspräfix: `[adapters]`, `[i18n]`, `[admin]`, `[mobile]` usw.

## Code-Stil

- **TypeScript** — Strict Mode ist aktiviert. Kein `any`, außer es ist unvermeidbar.
- **React** — Funktionale Komponenten mit Hooks. Keine Klassenkomponenten.
- **Styling** — Tailwind CSS Utility-Klassen. Verwenden Sie die vorhandenen Design-Tokens in `tailwind.config.ts`.
- **UI-Primitives** — Verwenden Sie Komponenten aus `src/components/ui/` (Radix-basiert, shadcn/ui-Pattern).
- **Imports** — Verwenden Sie den `@/`-Pfadalias (z. B. `import { Button } from "@/components/ui/button"`).
- **Formatierung** — ESLint erzwingt den Stil. Führen Sie `npm run lint:fix` zum automatischen Korrigieren aus.
- **Tests** — Vitest für Unit-Tests, Playwright für E2E. Unit-Tests in `__tests__/`-Verzeichnissen platzieren oder als `*.test.ts(x)` nebeneinander ablegen.

## Einen neuen Integrationsadapter hinzufügen

Adapter folgen einem einheitlichen Pattern. Jeder Adapter muss:

1. Ein TypeScript-Interface in `src/types/` definieren
2. Eine Mock-/Demo-Version in `src/lib/demo-data/` implementieren
3. Den echten Adapter implementieren (falls zutreffend)
4. Sich in der Adapter-Registry registrieren, damit er über Umgebungsvariablen ausgewählt werden kann
5. Elegant auf den Mock zurückfallen, wenn keine Zugangsdaten konfiguriert sind

Verwenden Sie das Issue-Template „New Adapter", um einen vorzuschlagen, bevor Sie mit der Arbeit beginnen.

## Übersetzungen hinzufügen (i18n)

Übersetzungen befinden sich in `src/lib/i18n/locales/<lang-code>.json`. Zum Hinzufügen oder Aktualisieren:

1. Die entsprechende Locale-JSON-Datei bearbeiten
2. `npm run i18n:check` ausführen, um zu überprüfen, ob alle Schlüssel in allen Sprachen vorhanden sind
3. `npm run i18n:types` ausführen, um TypeScript-Typen neu zu generieren

Englisch (`en.json`) ist die maßgebliche Quelle. Alle anderen Locales sollten dessen Schlüsselstruktur entsprechen.

## Datenbankmigrationen

Migrationen befinden sich in `supabase/migrations/`. So fügen Sie eine hinzu:

1. Eine neue SQL-Datei mit der Namenskonvention erstellen: `YYYYMMDD_description.sql`
2. Idempotentes SQL schreiben (verwenden Sie `IF NOT EXISTS`, `CREATE OR REPLACE` usw.)
3. Sowohl die Migration als auch notwendige Seed-Daten einschließen
4. Lokal testen mit `docker compose up` (Migrationen werden automatisch angewendet)

## Fehler melden

Verwenden Sie das Issue-Template [Bug Report](https://github.com/danweis07/Fiducia-/issues/new?template=bug_report.yml).

## Features anfragen

Verwenden Sie das Issue-Template [Feature Request](https://github.com/danweis07/Fiducia-/issues/new?template=feature_request.yml).

## Sicherheitslücken

**Eröffnen Sie KEIN öffentliches Issue.** Siehe [SECURITY.de.md](SECURITY.de.md) für Anweisungen zur verantwortungsvollen Offenlegung.

## Lizenz

Mit Ihrem Beitrag erklären Sie sich damit einverstanden, dass Ihre Beiträge unter der [MIT-Lizenz](LICENSE) lizenziert werden.
