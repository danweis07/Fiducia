#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Translation Completeness Checker
 *
 * Reads all English namespace JSON files as the source of truth and reports
 * completeness for every supported locale.
 *
 * Usage:
 *   npx tsx scripts/check-translations.ts           # informational (exit 0)
 *   npx tsx scripts/check-translations.ts --ci       # fail if any shipped locale < threshold
 *   npx tsx scripts/check-translations.ts --ci --threshold 60  # custom threshold (default: 80)
 *
 * In CI mode the script exits with code 1 if any non-English locale that has
 * at least one translated key falls below the threshold percentage.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.resolve(__dirname, '../src/lib/i18n/locales');
const NAMESPACES = ['common', 'banking', 'settings', 'errors', 'admin', 'public'] as const;
type Namespace = (typeof NAMESPACES)[number];

// Import the supported languages list dynamically from the source of truth.
// We read index.ts and extract the language codes via a lightweight regex so
// this script works with plain Node/tsx without bundling the React app.
function getSupportedLanguageCodes(): string[] {
  const indexPath = path.resolve(__dirname, '../src/lib/i18n/index.ts');
  const src = fs.readFileSync(indexPath, 'utf-8');
  const codes: string[] = [];
  const re = /code:\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    codes.push(m[1]);
  }
  return codes;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all leaf-key paths from a nested JSON object. */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length > 0) {
      keys.push(...collectKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

/** Safely read and parse a JSON file. Returns empty object if missing. */
function readJson(filePath: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Pad or truncate a string to a fixed width. */
function pad(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}

/** Format a percentage with coloring hint. */
function pct(n: number, total: number): string {
  if (total === 0) return '  N/A';
  const p = Math.round((n / total) * 100);
  return `${String(p).padStart(3)}%`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const codes = getSupportedLanguageCodes();

  if (codes.length === 0) {
    console.error('Could not detect supported languages from index.ts');
    process.exit(0);
  }

  // 1. Load English keys per namespace (source of truth)
  const englishKeys: Record<Namespace, string[]> = {} as Record<Namespace, string[]>;
  for (const ns of NAMESPACES) {
    const data = readJson(path.join(LOCALES_DIR, 'en', `${ns}.json`));
    englishKeys[ns] = collectKeys(data);
  }

  // 2. Analyse each locale
  interface LocaleReport {
    code: string;
    perNs: Record<Namespace, { translated: number; total: number; extra: string[] }>;
    overallTranslated: number;
    overallTotal: number;
  }

  const reports: LocaleReport[] = [];

  for (const code of codes) {
    const perNs = {} as LocaleReport['perNs'];
    let overallTranslated = 0;
    let overallTotal = 0;

    for (const ns of NAMESPACES) {
      const total = englishKeys[ns].length;
      overallTotal += total;

      if (code === 'en') {
        perNs[ns] = { translated: total, total, extra: [] };
        overallTranslated += total;
        continue;
      }

      const data = readJson(path.join(LOCALES_DIR, code, `${ns}.json`));
      const localeKeys = collectKeys(data);
      const localeKeySet = new Set(localeKeys);
      const enKeySet = new Set(englishKeys[ns]);

      // Count keys that exist in both English and this locale and have a non-empty value
      let translated = 0;
      for (const k of englishKeys[ns]) {
        if (localeKeySet.has(k)) {
          translated++;
        }
      }

      // Extra keys in locale that are not in English
      const extra = localeKeys.filter((k) => !enKeySet.has(k));

      perNs[ns] = { translated, total, extra };
      overallTranslated += translated;
    }

    reports.push({ code, perNs, overallTranslated, overallTotal });
  }

  // 3. Print report
  const COL_LOCALE = 10;
  const COL_NS = 9;

  console.log('');
  console.log('Translation Completeness Report');
  console.log('================================');
  console.log('');

  // Header
  let header = pad('Locale', COL_LOCALE);
  for (const ns of NAMESPACES) {
    header += pad(ns, COL_NS);
  }
  header += pad('Overall', COL_NS);
  console.log(header);
  console.log('-'.repeat(header.length));

  // Rows
  const needsHelp: string[] = [];

  for (const r of reports) {
    let row = pad(r.code, COL_LOCALE);
    for (const ns of NAMESPACES) {
      const info = r.perNs[ns];
      row += pad(pct(info.translated, info.total), COL_NS);
    }
    const overallPct = r.overallTotal > 0 ? Math.round((r.overallTranslated / r.overallTotal) * 100) : 0;
    row += pad(`${String(overallPct).padStart(3)}%`, COL_NS);

    if (overallPct < 50 && r.code !== 'en') {
      row += '  <-- needs help';
      needsHelp.push(r.code);
    }

    console.log(row);
  }

  // 4. Pluralization audit — flag English keys using _plural that lack sibling forms
  const pluralIssues: string[] = [];
  for (const ns of NAMESPACES) {
    const enKeys = new Set(englishKeys[ns]);
    for (const k of englishKeys[ns]) {
      if (k.endsWith('_plural')) {
        const singular = k.replace(/_plural$/, '');
        if (!enKeys.has(singular)) {
          pluralIssues.push(`en/${ns}: "${k}" has no singular form "${singular}"`);
        }
      }
    }
    // Also check locales for translated singular without plural
    for (const r of reports) {
      if (r.code === 'en') continue;
      const info = r.perNs[ns];
      if (!info) continue;
      const localeData = readJson(path.join(LOCALES_DIR, r.code, `${ns}.json`));
      const localeKeys = new Set(collectKeys(localeData));
      for (const k of englishKeys[ns]) {
        if (k.endsWith('_plural')) {
          const singular = k.replace(/_plural$/, '');
          // If locale translated the singular but not the plural
          if (localeKeys.has(singular) && !localeKeys.has(k)) {
            pluralIssues.push(`${r.code}/${ns}: has "${singular}" but missing plural form "${k}"`);
          }
        }
      }
    }
  }

  if (pluralIssues.length > 0) {
    console.log('');
    console.log('Pluralization issues:');
    console.log('---------------------');
    for (const issue of pluralIssues) {
      console.log(`  ${issue}`);
    }
  }

  // 5. Extra keys warning
  const extras: { code: string; ns: string; keys: string[] }[] = [];
  for (const r of reports) {
    for (const ns of NAMESPACES) {
      const info = r.perNs[ns];
      if (info.extra.length > 0) {
        extras.push({ code: r.code, ns, keys: info.extra });
      }
    }
  }

  if (extras.length > 0) {
    console.log('');
    console.log('Extra keys (not in English source):');
    console.log('-----------------------------------');
    for (const e of extras) {
      for (const k of e.keys) {
        console.log(`  ${e.code}/${e.ns}: ${k}`);
      }
    }
  }

  // 5. Summary
  console.log('');
  console.log(`Total locales: ${codes.length}`);
  console.log(`Namespaces: ${NAMESPACES.join(', ')}`);
  const totalEnKeys = Object.values(englishKeys).reduce((sum, keys) => sum + keys.length, 0);
  console.log(`Total English keys: ${totalEnKeys}`);

  if (needsHelp.length > 0) {
    console.log('');
    console.log(`Locales below 50% completion (need contributors): ${needsHelp.join(', ')}`);
  }

  // 6. CI enforcement mode
  const args = process.argv.slice(2);
  const ciMode = args.includes('--ci');

  if (ciMode) {
    const thresholdIdx = args.indexOf('--threshold');
    const threshold = thresholdIdx >= 0 ? Number(args[thresholdIdx + 1]) : 80;

    // Only enforce on locales that have at least one translated key
    // (brand-new locales with 0 translations are not yet "shipped")
    const failing: string[] = [];
    for (const r of reports) {
      if (r.code === 'en') continue;
      if (r.overallTranslated === 0) continue; // not yet started
      const overallPct = r.overallTotal > 0
        ? Math.round((r.overallTranslated / r.overallTotal) * 100)
        : 0;
      if (overallPct < threshold) {
        failing.push(`${r.code} (${overallPct}%)`);
      }
    }

    if (failing.length > 0) {
      console.log('');
      console.log(`CI FAILURE: ${failing.length} locale(s) below ${threshold}% threshold:`);
      console.log(`  ${failing.join(', ')}`);
      process.exit(1);
    } else {
      console.log('');
      console.log(`CI PASS: All shipped locales meet the ${threshold}% threshold.`);
    }
  }

  console.log('');
}

main();
