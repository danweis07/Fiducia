import { Outlet } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { CookieConsentProvider, CookieConsent } from "./CookieConsent";
import { CookieSettingsButton } from "./CookieSettingsButton";
import { AdTrackers } from "./AdTrackers";
import { AIMetaTags } from "./AIMetaTags";
import {
  ConsentProviderBridge,
  getDefaultConsentConfig,
  type ConsentProviderConfig,
} from "./ConsentProviderBridge";

interface PublicShellProps {
  tenantName?: string;
  logoUrl?: string;
  primaryColor?: string;
  children?: React.ReactNode;
  /** Override the consent provider configuration (defaults to env-var based config). */
  consentConfig?: ConsentProviderConfig;
}

export function PublicShell({
  tenantName,
  logoUrl,
  primaryColor,
  children,
  consentConfig,
}: PublicShellProps) {
  const config = consentConfig ?? getDefaultConsentConfig();
  const useBuiltIn = config.provider === "built-in";

  return (
    <CookieConsentProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <AIMetaTags />
        {/* Bridge third-party consent signals into CookieConsentContext */}
        {!useBuiltIn && <ConsentProviderBridge config={config} />}
        <AdTrackers />
        <PublicHeader tenantName={tenantName} logoUrl={logoUrl} primaryColor={primaryColor} />
        <main className="flex-1">{children ?? <Outlet />}</main>
        <PublicFooter tenantName={tenantName} />
        {/* Only show built-in consent UI when no third-party provider is active */}
        {useBuiltIn && <CookieConsent />}
        {useBuiltIn && <CookieSettingsButton />}
      </div>
    </CookieConsentProvider>
  );
}
