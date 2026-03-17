# Troubleshooting

Common issues and solutions for local development.

## Setup Issues

### `setup.sh` fails with "permission denied"

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh --demo
```

### Wrong Node.js version

The project requires Node.js 20+. An `.nvmrc` file is included:

```bash
nvm use          # switches to Node 20
node --version   # should print v20.x.x
```

If you don't have nvm, install Node 20 from [nodejs.org](https://nodejs.org).

### `npm install` fails

1. Delete `node_modules` and lock file, then retry:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. If you see permission errors on Linux/macOS:
   ```bash
   sudo chown -R $(whoami) ~/.npm
   npm install
   ```

## Dev Server Issues

### Port 8080 already in use

The Vite dev server runs on port 8080. If something else is using it:

```bash
# Find what's using the port
lsof -i :8080

# Kill it, or start Vite on a different port
npx vite --port 3000
```

### Changes not appearing (HMR not working)

1. Check the terminal for errors — TypeScript or ESLint errors can block HMR
2. Try a hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on macOS)
3. Restart the dev server: `Ctrl+C` then `npm run dev`
4. Clear the Vite cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

## Docker Issues

### `docker compose up` fails

1. **Docker not running:** Make sure Docker Desktop (or Docker daemon) is running
2. **Port conflicts:** Docker needs ports 8080, 54321, 54323, and 9090. Check for conflicts:
   ```bash
   lsof -i :8080 -i :54321 -i :54323 -i :9090
   ```
3. **Stale containers:** Remove old containers and try again:
   ```bash
   docker compose down -v
   docker compose up
   ```

### Supabase Studio not loading (port 54323)

Supabase Studio may take 30-60 seconds to start after `docker compose up`. Wait and refresh.

## Demo Mode Issues

### Demo mode shows blank page or errors

1. Verify `.env.local` has `VITE_DEMO_MODE=true`
2. If you ran `setup.sh --demo`, this should already be set. Check:
   ```bash
   grep DEMO_MODE .env.local
   ```
3. Restart the dev server after changing env vars

### Demo login doesn't work

Demo credentials are `demo@fiducia.dev` / `demo1234`. These only work when:

- `VITE_DEMO_MODE=true` is set, OR
- You're running with Docker Compose (which seeds the demo user into Supabase)

## Build Issues

### TypeScript errors during build

```bash
npm run typecheck    # see all TS errors
```

Common causes:

- Missing `@/` import — use `@/components/...` not `../../../components/...`
- Using `any` — strict mode is enabled, use proper types
- Forgot to run `npm run i18n:types` after adding translation keys

### ESLint warnings exceeding limit

CI allows a maximum of 40 ESLint warnings. Fix them:

```bash
npm run lint:fix     # auto-fix what it can
npm run lint         # see remaining issues
```

### `npm run validate` fails

`validate` runs lint + typecheck + test + build sequentially. Check which step failed in the output and fix that specific issue.

## Supabase / Database Issues

### "Invalid API key" or "JWT expired"

- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` are correct
- For Docker: these are auto-configured in `docker-compose.yml` — don't set them in `.env.local`
- For Supabase Cloud: get fresh keys from Supabase Dashboard → Settings → API

### Migrations not applying

With Docker Compose, migrations apply automatically on startup. If they didn't:

```bash
docker compose down -v    # reset all data
docker compose up         # fresh start with all migrations
```

For Supabase CLI:

```bash
supabase db push
```

## Integration Issues

### Adapter falling back to mock unexpectedly

Adapters auto-detect credentials via environment variables. If the real adapter isn't activating:

1. Check that the relevant env vars are set in `.env.local` (not `.env.example`)
2. Env var names are listed in `.env.example` — look for the integration section
3. Restart the dev server after adding env vars
4. See [docs/SANDBOX-INTEGRATIONS.md](SANDBOX-INTEGRATIONS.md) for sandbox credential setup

## Still stuck?

- Search [existing issues](https://github.com/danweis07/Fiducia-/issues) on GitHub
- Open a [bug report](https://github.com/danweis07/Fiducia-/issues/new?template=bug_report.yml)
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design context
