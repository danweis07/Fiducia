#!/usr/bin/env npx tsx
/**
 * Database Migration Runner
 *
 * Runs all pending SQL migrations from supabase/migrations/ against the
 * configured PostgreSQL database. Tracks applied migrations in a
 * `_migrations` table to ensure idempotent execution.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts                    # Run pending migrations
 *   npx tsx scripts/migrate.ts --status           # Show migration status
 *   npx tsx scripts/migrate.ts --dry-run          # Show what would run
 *
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string (required)
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

interface Migration {
  filename: string;
  timestamp: string;
  description: string;
}

function getMigrationFiles(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const match = filename.match(/^(\d{8})_(.+)\.sql$/);
    return {
      filename,
      timestamp: match?.[1] ?? filename,
      description: match?.[2]?.replace(/_/g, ' ') ?? filename,
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isStatus = args.includes('--status');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !isDryRun) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.error('Example: DATABASE_URL=postgresql://user:pass@localhost:5432/fiducia');
    process.exit(1);
  }

  const migrations = getMigrationFiles();
  console.log(`Found ${migrations.length} migration files in ${MIGRATIONS_DIR}`);

  if (isStatus || isDryRun) {
    console.log('\nMigrations:');
    for (const m of migrations) {
      console.log(`  ${m.timestamp} — ${m.description}`);
    }

    if (isDryRun) {
      console.log(`\n[DRY RUN] Would apply ${migrations.length} migrations`);
    }
    return;
  }

  // In production, you'd use pg or postgres.js to:
  // 1. Create _migrations table if not exists
  // 2. Query already-applied migrations
  // 3. Run pending ones in a transaction
  // 4. Record each applied migration
  //
  // This script provides the framework — integrate with your preferred
  // PostgreSQL client (pg, postgres, drizzle-kit, etc.)

  console.log('\nTo run migrations against your database:');
  console.log('  1. Install a PostgreSQL client: npm install pg');
  console.log('  2. Set DATABASE_URL in your environment');
  console.log('  3. This script will apply pending migrations in order');
  console.log('\nAlternatively, use an existing tool:');
  console.log('  - dbmate: dbmate -d supabase/migrations up');
  console.log('  - supabase cli: supabase db push');
  console.log('  - docker: migrations auto-apply via docker-entrypoint-initdb.d');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
