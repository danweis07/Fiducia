# Sicherheitsrichtlinie

## Eine Schwachstelle melden

**Eröffnen Sie KEIN öffentliches GitHub-Issue für Sicherheitslücken.**

Dies ist eine Finanzdienstleistungsplattform. Wir nehmen Sicherheit ernst und bitten Sie, Schwachstellen verantwortungsvoll zu melden.

### So melden Sie

1. **Bevorzugt:** Verwenden Sie [GitHub Security Advisories](https://github.com/danweis07/Fiducia/security/advisories/new), um privat zu melden.
2. **Alternative:** Senden Sie Sicherheitsbedenken per E-Mail an die in [CODEOWNERS](CODEOWNERS) aufgeführten Repository-Maintainer.

### Was Sie angeben sollten

- Beschreibung der Schwachstelle
- Schritte zur Reproduktion
- Betroffene Komponenten (Frontend, Edge Functions, Datenbank, Adapter usw.)
- Mögliche Auswirkungen
- Vorgeschlagene Behebung (falls vorhanden)

### Reaktionszeiten

- **Bestätigung:** innerhalb von 48 Stunden
- **Erste Bewertung:** innerhalb von 5 Werktagen
- **Behebung oder Schadensbegrenzung:** abhängig vom Schweregrad, angestrebt wird:
  - Kritisch/Hoch: Patch innerhalb von 7 Tagen
  - Mittel: Patch innerhalb von 30 Tagen
  - Niedrig: nächstes geplantes Release

## Unterstützte Versionen

| Version          | Unterstützt         |
| ---------------- | ------------------- |
| Aktueller `main` | Ja                  |
| Ältere Releases  | Nach bestem Bemühen |

## Sicherheitspraktiken

### Vorhandene Maßnahmen

- **Authentifizierung:** Supabase Auth mit JWT, RLS (Row Level Security) auf allen Tabellen
- **Autorisierung:** Rollenbasierte Zugriffskontrolle, Mandantenisolierung über RLS-Richtlinien
- **Eingabevalidierung:** Zod-Schemas für Formulareingaben, serverseitige Validierung in Edge Functions
- **Sicherheitsheader:** X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy (konfiguriert in nginx, Vercel und Edge Middleware)
- **Abhängigkeitsüberprüfung:** Dependabot aktiviert für npm und GitHub Actions
- **Statische Analyse:** CodeQL-Workflow verfügbar für Code-Scanning
- **Secret-Scanning:** GitHub Secret-Scanning-Workflow verfügbar
- **Container-Scanning:** Trivy/Grype-Workflow verfügbar für Docker-Images
- **DAST:** OWASP ZAP-Workflow verfügbar für dynamisches Testen
- **Audit-Protokollierung:** Alle sensiblen Operationen werden in der `audit_logs`-Tabelle protokolliert
- **Rate Limiting:** Konfigurierbares Rate Limiting pro Mandant
- **Pre-Commit-Hooks:** Husky + lint-staged, um Probleme vor dem Push zu erkennen

### Für Deployer

Stellen Sie beim Deployment in die Produktion sicher, dass:

- [ ] `VITE_DEMO_MODE` auf `false` gesetzt ist
- [ ] Alle Supabase-RLS-Richtlinien für Ihre Mandantenkonfiguration überprüft sind
- [ ] Der Supabase Anon Key der _öffentliche_ Schlüssel ist (nicht der Service Role Key) im Frontend-Code
- [ ] Der Service Role Key nur in Edge Functions verwendet wird und niemals dem Client offengelegt wird
- [ ] Sicherheitsheader aktiv sind (prüfen Sie mit [securityheaders.com](https://securityheaders.com))
- [ ] Die Security-Scanning-Workflows in `.github/workflows-available/` aktiviert sind:
  - `codeql-analysis.yml` — Statische Analyse
  - `dependency-audit.yml` — Abhängigkeitsschwachstellen
  - `container-scan.yml` — Docker-Image-CVEs
  - `secret-scanning.yml` — Durchgesickerte Zugangsdaten
  - `dast-zap.yml` — Laufzeit-Schwachstellenscanning
- [ ] Alle Standard-Zugangsdaten und Secrets rotiert sind
- [ ] Sentry DSN für Fehlerüberwachung konfiguriert ist
- [ ] CSP für Ihre spezifische Domain überprüft und verschärft ist

### Sensible Dateien

Die folgenden Dateien sind über `.gitignore` von der Versionskontrolle ausgeschlossen:

- `.env`, `.env.local`, `.env.*.local` — Umgebungsvariablen und Secrets
- `coverage/` — Testabdeckungsberichte
- `node_modules/` — Abhängigkeiten

Committen Sie niemals API-Schlüssel, Passwörter oder Tokens in das Repository.

## SBOM (Software Bill of Materials)

Ein SBOM-Generierungs-Workflow ist unter `.github/workflows-available/sbom.yml` verfügbar. Aktivieren Sie ihn, um CycloneDX- oder SPDX-SBOMs für Compliance und Lieferketten-Auditing zu erstellen.
