/**
 * White-Label Mobile Build Script
 *
 * Takes a tenant configuration JSON and builds a branded mobile app
 * for iOS, Android, or both platforms. Temporarily patches native
 * project files (bundle ID, app name, icons) then restores originals
 * after the build completes.
 *
 * Usage:
 *   npx tsx scripts/build-tenant-app.ts \
 *     --tenant azfcu \
 *     --config mobile/tenant-configs/azfcu.json \
 *     --platform both \
 *     --lane beta
 *
 * Prerequisites:
 *   - Flutter SDK on PATH
 *   - Ruby + Bundler (for Fastlane lanes)
 *   - Xcode (iOS builds on macOS)
 *   - Android SDK + Java 17 (Android builds)
 */

import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    tenant: { type: "string" },
    config: { type: "string" },
    platform: { type: "string", default: "both" },
    lane: { type: "string", default: "test" },
    "dry-run": { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
  },
});

if (!args.tenant || !args.config) {
  console.error("Usage: npx tsx scripts/build-tenant-app.ts --tenant <id> --config <path> [--platform ios|android|both] [--lane test|beta|release]");
  process.exit(1);
}

const VALID_PLATFORMS = ["ios", "android", "both"] as const;
const VALID_LANES = ["test", "beta", "release"] as const;

if (!VALID_PLATFORMS.includes(args.platform as (typeof VALID_PLATFORMS)[number])) {
  console.error(`Invalid platform: "${args.platform}". Allowed: ${VALID_PLATFORMS.join(", ")}`);
  process.exit(1);
}

if (!VALID_LANES.includes(args.lane as (typeof VALID_LANES)[number])) {
  console.error(`Invalid lane: "${args.lane}". Allowed: ${VALID_LANES.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tenant Config
// ---------------------------------------------------------------------------

interface TenantConfig {
  tenantId: string;
  appName: string;
  appNameShort: string;
  ios: { bundleId: string; teamId: string; appStoreId: string };
  android: { applicationId: string; packageName: string };
  branding: {
    primaryColor: string;
    accentColor: string;
    logoPath: string;
    iconPath: string;
    splashPath: string;
  };
  supabase: { url: string; anonKey: string };
  features: Record<string, boolean>;
  appStore: {
    description: string;
    keywords: string;
    category: string;
    privacyUrl: string;
    supportUrl: string;
    marketingUrl: string;
  };
}

const configPath = path.resolve(args.config);
if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const config: TenantConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const MOBILE_ROOT = path.resolve("mobile");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(step: string, msg: string) {
  console.warn(`[${step}] ${msg}`);
}

function run(cmd: string, cmdArgs: string[], cwd: string) {
  if (args.verbose) {
    log("exec", `${cmd} ${cmdArgs.join(" ")}`);
  }
  if (args["dry-run"]) {
    log("dry-run", `Would run: ${cmd} ${cmdArgs.join(" ")} in ${cwd}`);
    return;
  }
  execFileSync(cmd, cmdArgs, { stdio: "inherit", cwd });
}

/** Back up a file; returns restore function. */
function backup(filePath: string): () => void {
  if (!fs.existsSync(filePath)) {
    return () => {};
  }
  const content = fs.readFileSync(filePath);
  return () => fs.writeFileSync(filePath, content);
}

// ---------------------------------------------------------------------------
// Patchers
// ---------------------------------------------------------------------------

const restoreFns: Array<() => void> = [];

function patchInfoPlist() {
  const plistPath = path.join(MOBILE_ROOT, "ios", "Runner", "Info.plist");
  if (!fs.existsSync(plistPath)) {
    log("ios", "Info.plist not found, skipping iOS plist patch");
    return;
  }

  restoreFns.push(backup(plistPath));
  let plist = fs.readFileSync(plistPath, "utf-8");

  // Replace bundle identifier
  plist = plist.replace(
    /(<key>CFBundleIdentifier<\/key>\s*<string>)[^<]*/,
    `$1${config.ios.bundleId}`,
  );

  // Replace display name
  plist = plist.replace(
    /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*/,
    `$1${config.appName}`,
  );

  // Replace bundle name
  plist = plist.replace(
    /(<key>CFBundleName<\/key>\s*<string>)[^<]*/,
    `$1${config.appNameShort}`,
  );

  fs.writeFileSync(plistPath, plist);
  log("ios", `Patched Info.plist: bundleId=${config.ios.bundleId}, name=${config.appName}`);
}

function patchBuildGradle() {
  const gradlePath = path.join(MOBILE_ROOT, "android", "app", "build.gradle");
  if (!fs.existsSync(gradlePath)) {
    log("android", "build.gradle not found, skipping Android patch");
    return;
  }

  restoreFns.push(backup(gradlePath));
  let gradle = fs.readFileSync(gradlePath, "utf-8");

  // Replace applicationId
  gradle = gradle.replace(
    /applicationId\s+"[^"]+"/,
    `applicationId "${config.android.applicationId}"`,
  );

  // Replace app label in resValue if present
  gradle = gradle.replace(
    /resValue\s+"string",\s+"app_name",\s+"[^"]+"/,
    `resValue "string", "app_name", "${config.appName}"`,
  );

  fs.writeFileSync(gradlePath, gradle);
  log("android", `Patched build.gradle: applicationId=${config.android.applicationId}`);
}

function patchAndroidManifest() {
  const manifestPath = path.join(MOBILE_ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  restoreFns.push(backup(manifestPath));
  let manifest = fs.readFileSync(manifestPath, "utf-8");

  // Update android:label if hardcoded
  manifest = manifest.replace(
    /android:label="[^"]+"/,
    `android:label="${config.appName}"`,
  );

  fs.writeFileSync(manifestPath, manifest);
  log("android", `Patched AndroidManifest.xml: label=${config.appName}`);
}

function copyTenantIcons() {
  const iconSrc = path.resolve(config.branding.iconPath);
  if (!fs.existsSync(iconSrc)) {
    log("branding", `Icon not found at ${iconSrc}, skipping icon copy`);
    return;
  }

  // iOS app icon
  const iosIconDir = path.join(MOBILE_ROOT, "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset");
  if (fs.existsSync(iosIconDir)) {
    const iosTarget = path.join(iosIconDir, "Icon-App-1024x1024@1x.png");
    restoreFns.push(backup(iosTarget));
    fs.copyFileSync(iconSrc, iosTarget);
    log("branding", "Copied tenant icon to iOS assets");
  }

  // Android adaptive icon
  const androidIconDir = path.join(MOBILE_ROOT, "android", "app", "src", "main", "res", "mipmap-xxxhdpi");
  if (fs.existsSync(androidIconDir)) {
    const androidTarget = path.join(androidIconDir, "ic_launcher.png");
    restoreFns.push(backup(androidTarget));
    fs.copyFileSync(iconSrc, androidTarget);
    log("branding", "Copied tenant icon to Android assets");
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function buildDartDefines(): string[] {
  const defines: string[] = [];

  const supabaseUrl = config.supabase.url || process.env.SUPABASE_URL || "";
  const supabaseKey = config.supabase.anonKey || process.env.SUPABASE_ANON_KEY || "";

  if (supabaseUrl) defines.push(`--dart-define=SUPABASE_URL=${supabaseUrl}`);
  if (supabaseKey) defines.push(`--dart-define=SUPABASE_ANON_KEY=${supabaseKey}`);

  defines.push(`--dart-define=TENANT_ID=${config.tenantId}`);
  defines.push(`--dart-define=PRIMARY_COLOR=${config.branding.primaryColor}`);
  defines.push(`--dart-define=ACCENT_COLOR=${config.branding.accentColor}`);

  // Feature flags
  for (const [key, enabled] of Object.entries(config.features)) {
    defines.push(`--dart-define=FEATURE_${key.toUpperCase()}=${enabled}`);
  }

  return defines;
}

function buildAndroid() {
  log("build", "Building Android App Bundle...");
  const dartDefines = buildDartDefines();
  run("flutter", ["build", "appbundle", "--release", ...dartDefines], MOBILE_ROOT);
  log("build", "Android build complete");
}

function buildIos() {
  log("build", "Building iOS...");
  const dartDefines = buildDartDefines();
  run("flutter", ["build", "ios", "--release", "--no-codesign", ...dartDefines], MOBILE_ROOT);
  log("build", "iOS build complete");
}

function runFastlane(platform: "ios" | "android", lane: string) {
  if (lane === "test") return;
  log("deploy", `Running Fastlane ${lane} for ${platform}...`);
  const fastlaneDir = path.join(MOBILE_ROOT, platform);
  run("bundle", ["exec", "fastlane", lane], fastlaneDir);
  log("deploy", `Fastlane ${lane} complete for ${platform}`);
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

function restoreAll() {
  log("cleanup", "Restoring original project files...");
  for (const restore of restoreFns.reverse()) {
    try {
      restore();
    } catch (err) {
      console.warn("Warning: failed to restore a file:", err);
    }
  }
  log("cleanup", "All files restored");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const platform = args.platform as string;
  const lane = args.lane as string;

  console.warn("=".repeat(60));
  console.warn("  Fiducia White-Label Mobile Build");
  console.warn(`  Tenant:   ${config.appName} (${config.tenantId})`);
  console.warn(`  Platform: ${platform}`);
  console.warn(`  Lane:     ${lane}`);
  console.warn(`  iOS ID:   ${config.ios.bundleId}`);
  console.warn(`  Android:  ${config.android.applicationId}`);
  if (args["dry-run"]) console.warn("  MODE: DRY RUN");
  console.warn("=".repeat(60));
  console.warn();

  try {
    // 1. Patch native project files
    if (platform === "ios" || platform === "both") {
      patchInfoPlist();
    }
    if (platform === "android" || platform === "both") {
      patchBuildGradle();
      patchAndroidManifest();
    }

    // 2. Copy tenant branding assets
    copyTenantIcons();

    // 3. Build
    if (platform === "android" || platform === "both") {
      buildAndroid();
    }
    if (platform === "ios" || platform === "both") {
      buildIos();
    }

    // 4. Deploy via Fastlane
    if (platform === "android" || platform === "both") {
      runFastlane("android", lane);
    }
    if (platform === "ios" || platform === "both") {
      runFastlane("ios", lane);
    }

    console.warn();
    console.warn("Build completed successfully.");
  } finally {
    // Always restore original files
    restoreAll();
  }
}

main();
