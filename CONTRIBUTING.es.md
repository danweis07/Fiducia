# Contribuir a Fiducia

Gracias por tu interés en contribuir. Este documento cubre las convenciones y el proceso para que tus cambios sean integrados.

## Primeros Pasos

```bash
git clone https://github.com/danweis07/Fiducia.git && cd Fiducia
./scripts/setup.sh --demo
npm run dev
```

Consulta el [README](README.md) para todas las opciones de configuración (modo demo, pila completa con Docker, Supabase CLI).

## Flujo de Trabajo de Desarrollo

1. **Haz un fork del repositorio** y crea una rama desde `main`
2. **Nombra tu rama** usando la convención: `feature/descripcion-corta`, `fix/descripcion-corta`, o `chore/descripcion-corta`
3. **Realiza tus cambios** — mantén los PRs enfocados en una sola preocupación
4. **Valida antes de hacer push:**
   ```bash
   npm run validate    # typecheck + lint + test + build
   ```
5. **Abre un pull request** contra `main`

## Directrices para Pull Requests

- Mantén los PRs pequeños y enfocados. Una característica o corrección por PR.
- Escribe un título y descripción claros. Explica _qué_ cambió y _por qué_.
- Incluye capturas de pantalla para cambios en la UI.
- Agrega o actualiza pruebas para nueva funcionalidad.
- Asegúrate de que el CI pase (lint, typecheck, pruebas unitarias, compilación).
- Los PRs requieren al menos una revisión aprobatoria antes de fusionar.

## Mensajes de Commit

Usa mensajes de commit claros en modo imperativo:

```
Add wire transfer dual-approval workflow
Fix ACH cutoff timezone handling for Pacific time
Update Symitar adapter to support SymXchange v2 endpoints
Remove deprecated card activation flow
```

Usa un prefijo con el área si es útil: `[adapters]`, `[i18n]`, `[admin]`, `[mobile]`, etc.

## Estilo de Código

- **TypeScript** — el modo estricto está habilitado. No usar `any` a menos que sea inevitable.
- **React** — componentes funcionales con hooks. No usar componentes de clase.
- **Estilos** — clases utilitarias de Tailwind CSS. Usa los tokens de diseño existentes en `tailwind.config.ts`.
- **Primitivas de UI** — usa componentes de `src/components/ui/` (basados en Radix, patrón shadcn/ui).
- **Importaciones** — usa el alias de ruta `@/` (ej., `import { Button } from "@/components/ui/button"`).
- **Formato** — ESLint aplica el estilo. Ejecuta `npm run lint:fix` para corrección automática.
- **Pruebas** — Vitest para pruebas unitarias, Playwright para E2E. Coloca las pruebas unitarias en directorios `__tests__/` o junto al archivo como `*.test.ts(x)`.

## Agregar un Nuevo Adaptador de Integración

Los adaptadores siguen un patrón consistente. Cada adaptador debe:

1. Definir una interfaz TypeScript en `src/types/`
2. Implementar una versión mock/demo en `src/lib/demo-data/`
3. Implementar el adaptador real (si aplica)
4. Registrarse en el registro de adaptadores para que pueda seleccionarse mediante variable de entorno
5. Recurrir graciosamente al mock cuando no hay credenciales configuradas

Usa la plantilla de issue "New Adapter" para proponer uno antes de comenzar a trabajar.

## Agregar Traducciones (i18n)

Las traducciones se encuentran en `src/lib/i18n/locales/<lang-code>.json`. Para agregar o actualizar:

1. Edita el archivo JSON del locale correspondiente
2. Ejecuta `npm run i18n:check` para verificar que todas las claves estén presentes en todos los idiomas
3. Ejecuta `npm run i18n:types` para regenerar los tipos de TypeScript

Inglés (`en.json`) es la fuente de verdad. Todos los demás locales deben coincidir con su estructura de claves.

## Migraciones de Base de Datos

Las migraciones están en `supabase/migrations/`. Para agregar una:

1. Crea un nuevo archivo SQL con la convención de nombres: `YYYYMMDD_description.sql`
2. Escribe SQL idempotente (usa `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.)
3. Incluye tanto la migración como los datos semilla necesarios
4. Prueba localmente con `docker compose up` (las migraciones se aplican automáticamente)

## Reportar Errores

Usa la plantilla de issue [Bug Report](https://github.com/danweis07/Fiducia/issues/new?template=bug_report.yml).

## Solicitar Funcionalidades

Usa la plantilla de issue [Feature Request](https://github.com/danweis07/Fiducia/issues/new?template=feature_request.yml).

## Vulnerabilidades de Seguridad

**NO abras un issue público.** Consulta [SECURITY.md](SECURITY.md) para instrucciones de divulgación responsable.

## Licencia

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo la [Licencia MIT](LICENSE).
