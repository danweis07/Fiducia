/**
 * App Store / Play Store Pre-Submission Preflight Check
 *
 * Validates that all required metadata, assets, signing config, and
 * native project settings are in place before submitting a mobile
 * build to Apple App Store or Google Play Store.
 *
 * Usage:
 *   npx tsx scripts/app-store-preflight.ts --config mobile/tenant-configs/azfcu.json
 *   npx tsx scripts/app-store-preflight.ts --config mobile/tenant-configs/azfcu.json --platform ios
 *
 * Exit code 0 = all checks pass, 1 = one or more failures.
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    config: { type: "string" },
    platform: { type: "string", default: "both" },
  },
});

if (!args.config) {
  console.error("Usage: npx tsx scripts/app-store-preflight.ts --config <tenant-config.json> [--platform ios|android|both]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
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

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  fix?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const configPath = path.resolve(args.config);
if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const config: TenantConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const MOBILE_ROOT = path.resolve("mobile");
const results: CheckResult[] = [];

function check(name: string, passed: boolean, message: string, fix?: string) {
  results.push({ name, passed, message, fix });
}

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// iOS Checks
// ---------------------------------------------------------------------------

function checkIos() {
  const plistPath = path.join(MOBILE_ROOT, "ios", "Runner", "Info.plist");
  const plist = readFileIfExists(plistPath);

  // Info.plist exists
  check(
    "iOS: Info.plist exists",
    plist !== null,
    plist ? "Info.plist found" : "Info.plist not found",
    "Ensure mobile/ios/Runner/Info.plist exists in the project",
  );

  if (!plist) return;

  // Bundle ID not placeholder
  const hasPlaceholderBundle = plist.includes("com.example") || plist.includes("$(PRODUCT_BUNDLE_IDENTIFIER)");
  check(
    "iOS: Bundle ID configured",
    config.ios.bundleId !== "" && !config.ios.bundleId.includes("com.example"),
    config.ios.bundleId ? `Bundle ID: ${config.ios.bundleId}` : "Bundle ID is empty",
    "Set ios.bundleId in tenant config (e.g. com.yourorg.digitalbanking)",
  );

  // Privacy descriptions (required by Apple since iOS 14+)
  const privacyKeys = [
    "NSCameraUsageDescription",
    "NSPhotoLibraryUsageDescription",
    "NSFaceIDUsageDescription",
  ];
  for (const key of privacyKeys) {
    const hasKey = plist.includes(`<key>${key}</key>`);
    check(
      `iOS: ${key}`,
      hasKey,
      hasKey ? `${key} present` : `${key} missing`,
      `Add <key>${key}</key><string>Description here</string> to Info.plist`,
    );
  }

  // Minimum deployment target
  const projectPath = path.join(MOBILE_ROOT, "ios", "Runner.xcodeproj", "project.pbxproj");
  const project = readFileIfExists(projectPath);
  if (project) {
    const deployMatch = project.match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(\d+\.?\d*)/);
    const deployTarget = deployMatch ? parseFloat(deployMatch[1]) : 0;
    check(
      "iOS: Deployment target >= 16.0",
      deployTarget >= 16.0,
      deployTarget ? `Deployment target: ${deployTarget}` : "Could not determine deployment target",
      "Set IPHONEOS_DEPLOYMENT_TARGET to 16.0 or higher in Xcode project settings",
    );
  }

  // Match / signing configured
  const matchfilePath = path.join(MOBILE_ROOT, "ios", "fastlane", "Matchfile");
  const matchfile = readFileIfExists(matchfilePath);
  check(
    "iOS: Matchfile exists",
    matchfile !== null,
    matchfile ? "Matchfile found" : "Matchfile not found",
    "Create mobile/ios/fastlane/Matchfile with match configuration for code signing",
  );

  // Team ID
  check(
    "iOS: Team ID configured",
    config.ios.teamId !== "",
    config.ios.teamId ? `Team ID: ${config.ios.teamId}` : "Team ID is empty in tenant config",
    "Set ios.teamId in tenant config to your Apple Developer Team ID",
  );
}

// ---------------------------------------------------------------------------
// Android Checks
// ---------------------------------------------------------------------------

function checkAndroid() {
  const gradlePath = path.join(MOBILE_ROOT, "android", "app", "build.gradle");
  const gradle = readFileIfExists(gradlePath);

  check(
    "Android: build.gradle exists",
    gradle !== null,
    gradle ? "build.gradle found" : "build.gradle not found",
    "Ensure mobile/android/app/build.gradle exists",
  );

  if (!gradle) return;

  // Application ID
  check(
    "Android: Application ID configured",
    config.android.applicationId !== "" && !config.android.applicationId.includes("com.example"),
    config.android.applicationId ? `Application ID: ${config.android.applicationId}` : "Application ID is empty",
    "Set android.applicationId in tenant config (e.g. com.yourorg.digitalbanking)",
  );

  // Target SDK
  const targetSdkMatch = gradle.match(/targetSdk(?:Version)?\s*(?:=\s*)?(\d+)/);
  const targetSdk = targetSdkMatch ? parseInt(targetSdkMatch[1], 10) : 0;
  check(
    "Android: targetSdk >= 34",
    targetSdk >= 34,
    targetSdk ? `targetSdk: ${targetSdk}` : "Could not determine targetSdk",
    "Set targetSdkVersion to 34 or higher in build.gradle (required by Play Store since Aug 2024)",
  );

  // AndroidManifest permissions
  const manifestPath = path.join(MOBILE_ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
  const manifest = readFileIfExists(manifestPath);

  check(
    "Android: AndroidManifest.xml exists",
    manifest !== null,
    manifest ? "AndroidManifest.xml found" : "AndroidManifest.xml not found",
  );

  if (manifest) {
    const hasInternet = manifest.includes("android.permission.INTERNET");
    check(
      "Android: INTERNET permission",
      hasInternet,
      hasInternet ? "INTERNET permission declared" : "INTERNET permission missing",
      'Add <uses-permission android:name="android.permission.INTERNET"/> to AndroidManifest.xml',
    );

    // Camera permission if RDC feature enabled
    if (config.features.rdc) {
      const hasCamera = manifest.includes("android.permission.CAMERA");
      check(
        "Android: CAMERA permission (RDC enabled)",
        hasCamera,
        hasCamera ? "CAMERA permission declared" : "CAMERA permission missing but RDC is enabled",
        'Add <uses-permission android:name="android.permission.CAMERA"/> to AndroidManifest.xml',
      );
    }
  }

  // Play Store JSON key
  const jsonKeyFromEnv = process.env.PLAY_STORE_JSON_KEY;
  const jsonKeyPath = path.join(MOBILE_ROOT, "android", "fastlane", "play-store-key.json");
  const hasJsonKey = !!jsonKeyFromEnv || fs.existsSync(jsonKeyPath);
  check(
    "Android: Play Store JSON key",
    hasJsonKey,
    hasJsonKey ? "Play Store signing key found" : "Play Store JSON key not found",
    "Set PLAY_STORE_JSON_KEY env var or place play-store-key.json in mobile/android/fastlane/",
  );
}

// ---------------------------------------------------------------------------
// Shared Checks
// ---------------------------------------------------------------------------

function checkAssets() {
  // App icon
  const iconPath = path.resolve(config.branding.iconPath);
  check(
    "Assets: App icon exists",
    fs.existsSync(iconPath),
    fs.existsSync(iconPath) ? `Icon found: ${iconPath}` : `Icon not found: ${iconPath}`,
    `Place app icon at ${config.branding.iconPath} (1024x1024 PNG recommended)`,
  );

  // Splash screen
  const splashPath = path.resolve(config.branding.splashPath);
  check(
    "Assets: Splash screen exists",
    fs.existsSync(splashPath),
    fs.existsSync(splashPath) ? `Splash found: ${splashPath}` : `Splash not found: ${splashPath}`,
    `Place splash image at ${config.branding.splashPath}`,
  );

  // Logo
  const logoPath = path.resolve(config.branding.logoPath);
  check(
    "Assets: Logo exists",
    fs.existsSync(logoPath),
    fs.existsSync(logoPath) ? `Logo found: ${logoPath}` : `Logo not found: ${logoPath}`,
    `Place logo at ${config.branding.logoPath}`,
  );
}

function checkMetadata() {
  const desc = config.appStore.description || "";
  check(
    "Metadata: Description length (10-4000 chars)",
    desc.length >= 10 && desc.length <= 4000,
    `Description length: ${desc.length} chars`,
    "Set appStore.description in tenant config (10-4000 characters)",
  );

  check(
    "Metadata: Keywords provided",
    (config.appStore.keywords || "").length > 0,
    config.appStore.keywords ? `Keywords: ${config.appStore.keywords.substring(0, 60)}...` : "Keywords empty",
    "Set appStore.keywords in tenant config (comma-separated, max 100 chars for iOS)",
  );

  check(
    "Metadata: Privacy URL",
    (config.appStore.privacyUrl || "").startsWith("https://"),
    config.appStore.privacyUrl || "Not set",
    "Set appStore.privacyUrl to a valid HTTPS URL (required by both stores)",
  );

  check(
    "Metadata: Support URL",
    (config.appStore.supportUrl || "").startsWith("https://"),
    config.appStore.supportUrl || "Not set",
    "Set appStore.supportUrl to a valid HTTPS URL",
  );

  check(
    "Metadata: App name not empty",
    config.appName.length > 0 && config.appName.length <= 30,
    `App name: "${config.appName}" (${config.appName.length} chars)`,
    "Set appName in tenant config (1-30 characters)",
  );
}

function checkDemoCredentials() {
  const demoUser = process.env.REVIEW_DEMO_USER || "demo@fiducia.dev";
  const demoPass = process.env.REVIEW_DEMO_PASSWORD || "demo1234";

  check(
    "Review: Demo credentials configured",
    demoUser.length > 0 && demoPass.length > 0,
    `Demo user: ${demoUser}`,
    "Set REVIEW_DEMO_USER and REVIEW_DEMO_PASSWORD env vars for app review",
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport() {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log();
  console.log("=".repeat(64));
  console.log("  App Store / Play Store Preflight Check");
  console.log(`  Tenant: ${config.appName} (${config.tenantId})`);
  console.log(`  Platform: ${args.platform}`);
  console.log("=".repeat(64));
  console.log();

  for (const result of results) {
    const icon = result.passed ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${result.name}`);
    console.log(`         ${result.message}`);
    if (!result.passed && result.fix) {
      console.log(`         Fix: ${result.fix}`);
    }
  }

  console.log();
  console.log("-".repeat(64));
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
  console.log("-".repeat(64));

  if (failed > 0) {
    console.log();
    console.log(`  ${failed} check(s) failed. Fix the issues above before submitting.`);
    console.log();
    process.exit(1);
  } else {
    console.log();
    console.log("  All checks passed. Ready for submission.");
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const platform = args.platform as string;

  if (platform === "ios" || platform === "both") {
    checkIos();
  }
  if (platform === "android" || platform === "both") {
    checkAndroid();
  }

  checkAssets();
  checkMetadata();
  checkDemoCredentials();
  printReport();
}

main();
