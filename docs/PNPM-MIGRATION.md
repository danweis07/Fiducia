# Migrating from npm to pnpm

## Why pnpm?

- **Faster installs**: 2-3x faster than npm for this monorepo
- **Strict dependency isolation**: Prevents phantom dependencies
- **Workspace renames**: Don't cascade through the lockfile
- **Disk efficient**: Content-addressable storage shares packages

## Migration Steps

1. Install pnpm: `npm install -g pnpm`
2. Remove npm artifacts:
   ```bash
   rm -rf node_modules apps/web/node_modules package-lock.json
   ```
3. The `pnpm-workspace.yaml` is already configured
4. Install with pnpm:
   ```bash
   pnpm install
   ```
5. Update CI/CD pipelines to use `pnpm` instead of `npm`
6. Update Docker files to use `pnpm` instead of `npm`
7. Update root scripts in package.json:
   ```json
   // Before: "dev": "npm run dev -w @fiducia/web"
   // After:  "dev": "pnpm --filter @fiducia/web dev"
   ```

## Workspace Commands

```bash
pnpm --filter @fiducia/web dev          # Run dev server
pnpm --filter @fiducia/web build        # Build web app
pnpm --filter @fiducia/web typecheck    # Type check
pnpm -r build                           # Build all packages
```

## Gotchas

- `pnpm` uses `pnpm-lock.yaml` instead of `package-lock.json`
- Peer dependencies must be explicitly installed
- Use `pnpm add` instead of `npm install` for new packages
