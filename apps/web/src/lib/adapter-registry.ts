/**
 * Adapter Registry — Controls which core banking adapters are included in the build.
 *
 * Set the ADAPTERS env var to control which adapters are bundled:
 *   ADAPTERS=symitar,mock npm run build    → Only includes Symitar and mock adapters
 *   ADAPTERS=all npm run build             → Includes all adapters (default)
 *
 * Adapters not in the list are tree-shaken from the production bundle.
 */

declare const __ENABLED_ADAPTERS__: string[];

const enabledAdapters: string[] =
  typeof __ENABLED_ADAPTERS__ !== "undefined" ? __ENABLED_ADAPTERS__ : ["all"];

export function isAdapterEnabled(adapter: string): boolean {
  return enabledAdapters.includes("all") || enabledAdapters.includes(adapter);
}

export function getEnabledAdapters(): string[] {
  return enabledAdapters;
}
