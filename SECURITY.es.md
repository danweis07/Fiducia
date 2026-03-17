# Política de Seguridad

## Reportar una Vulnerabilidad

**NO abras un issue público en GitHub para vulnerabilidades de seguridad.**

Esta es una plataforma de servicios financieros. Nos tomamos la seguridad en serio y te pedimos que reportes las vulnerabilidades de manera responsable.

### Cómo Reportar

1. **Preferido:** Usa [GitHub Security Advisories](https://github.com/danweis07/Fiducia-/security/advisories/new) para reportar de forma privada.
2. **Alternativa:** Envía las preocupaciones de seguridad por correo electrónico a los mantenedores del repositorio listados en [CODEOWNERS](CODEOWNERS).

### Qué Incluir

- Descripción de la vulnerabilidad
- Pasos para reproducir
- Componentes afectados (frontend, edge functions, base de datos, adaptadores, etc.)
- Impacto potencial
- Corrección sugerida (si tienes una)

### Plazo de Respuesta

- **Confirmación de recepción:** dentro de 48 horas
- **Evaluación inicial:** dentro de 5 días hábiles
- **Corrección o mitigación:** depende de la severidad, pero nuestro objetivo es:
  - Crítica/Alta: parche dentro de 7 días
  - Media: parche dentro de 30 días
  - Baja: próxima versión programada

## Versiones Soportadas

| Versión              | Soportada      |
| -------------------- | -------------- |
| Último `main`        | Sí             |
| Versiones anteriores | Mejor esfuerzo |

## Prácticas de Seguridad

### Lo que Está Implementado

- **Autenticación:** Supabase Auth con JWT, RLS (Row Level Security) en todas las tablas
- **Autorización:** Control de acceso basado en roles, aislamiento de tenants mediante políticas RLS
- **Validación de entrada:** Esquemas Zod para entradas de formularios, validación del lado del servidor en edge functions
- **Encabezados de seguridad:** X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy (configurados en nginx, Vercel y edge middleware)
- **Escaneo de dependencias:** Dependabot habilitado para npm y GitHub Actions
- **Análisis estático:** Flujo de trabajo CodeQL disponible para escaneo de código
- **Escaneo de secretos:** Flujo de trabajo de escaneo de secretos de GitHub disponible
- **Escaneo de contenedores:** Flujo de trabajo Trivy/Grype disponible para imágenes Docker
- **DAST:** Flujo de trabajo OWASP ZAP disponible para pruebas dinámicas
- **Registro de auditoría:** Todas las operaciones sensibles se registran en la tabla `audit_logs`
- **Limitación de tasa:** Límites de tasa configurables por tenant
- **Hooks pre-commit:** Husky + lint-staged para detectar problemas antes del push

### Para Quienes Despliegan

Al desplegar en producción, asegúrate de que:

- [ ] `VITE_DEMO_MODE` esté establecido en `false`
- [ ] Todas las políticas RLS de Supabase estén verificadas para tu configuración de tenant
- [ ] La clave anon de Supabase sea la clave _pública_ (no la clave de rol de servicio) en el código del frontend
- [ ] La clave de rol de servicio solo se use en edge functions, nunca expuesta al cliente
- [ ] Los encabezados de seguridad estén activos (verifica con [securityheaders.com](https://securityheaders.com))
- [ ] Habilita los flujos de trabajo de escaneo de seguridad en `.github/workflows-available/`:
  - `codeql-analysis.yml` — análisis estático
  - `dependency-audit.yml` — vulnerabilidades de dependencias
  - `container-scan.yml` — CVEs de imágenes Docker
  - `secret-scanning.yml` — credenciales filtradas
  - `dast-zap.yml` — escaneo de vulnerabilidades en tiempo de ejecución
- [ ] Rota todas las credenciales y secretos predeterminados
- [ ] Configura el DSN de Sentry para monitoreo de errores
- [ ] Revisa y ajusta el CSP para tu dominio específico

### Archivos Sensibles

Los siguientes están excluidos del control de versiones mediante `.gitignore`:

- `.env`, `.env.local`, `.env.*.local` — variables de entorno y secretos
- `coverage/` — reportes de cobertura de pruebas
- `node_modules/` — dependencias

Nunca hagas commit de claves de API, contraseñas o tokens al repositorio.

## SBOM (Lista de Materiales de Software)

Un flujo de trabajo para generación de SBOM está disponible en `.github/workflows-available/sbom.yml`. Habilítalo para producir SBOMs en formato CycloneDX o SPDX para cumplimiento y auditoría de la cadena de suministro.
