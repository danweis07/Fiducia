import { useEffect, useCallback } from 'react';
import { useCookieConsent } from './CookieConsent';

// ---------------------------------------------------------------------------
// Environment-based configuration (fall back to placeholder IDs)
// ---------------------------------------------------------------------------

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_ID ?? '';
const GTM_ID = import.meta.env.VITE_GTM_ID ?? '';
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID ?? '';
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID ?? '';
const LINKEDIN_PARTNER_ID = import.meta.env.VITE_LINKEDIN_PARTNER_ID ?? '';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AdTrackersProps {
  ga4Id?: string;
  gtmId?: string;
  metaPixelId?: string;
  googleAdsId?: string;
  linkedInPartnerId?: string;
}

// ---------------------------------------------------------------------------
// Script helpers
// ---------------------------------------------------------------------------

/** Attribute used to identify injected tracking scripts so we can clean them up. */
const DATA_ATTR = 'data-cookie-tracker';

function injectScript(id: string, src: string): HTMLScriptElement {
  const existing = document.querySelector<HTMLScriptElement>(`script[${DATA_ATTR}="${id}"]`);
  if (existing) return existing;
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  el.setAttribute(DATA_ATTR, id);
  document.head.appendChild(el);
  return el;
}

function injectInlineScript(id: string, code: string): HTMLScriptElement {
  const existing = document.querySelector<HTMLScriptElement>(`script[${DATA_ATTR}="${id}"]`);
  if (existing) return existing;
  const el = document.createElement('script');
  el.setAttribute(DATA_ATTR, id);
  el.textContent = code;
  document.head.appendChild(el);
  return el;
}

function removeScriptsById(id: string): void {
  document.querySelectorAll(`script[${DATA_ATTR}="${id}"]`).forEach((el) => el.remove());
}

function deleteCookiesMatching(pattern: RegExp): void {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (pattern.test(name)) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
}

// ---------------------------------------------------------------------------
// Extend Window for tracking globals
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
    _linkedin_data_partner_ids: string[];
  }
}

// ---------------------------------------------------------------------------
// Public tracking helpers
// ---------------------------------------------------------------------------

/**
 * Send an event to GA4. No-op when analytics consent has not been granted or
 * when `gtag` is not yet available on the page.
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number,
): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  });
}

/**
 * Fire a Google Ads conversion event. No-op when marketing consent has not
 * been granted or when `gtag` is unavailable.
 */
export function trackConversion(conversionId: string): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', {
    send_to: conversionId,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Manages injection and removal of third-party tracking scripts based on the
 * user's cookie-consent preferences. Render this component once, near the root
 * of the application tree (inside `<CookieConsentProvider>`).
 *
 * All tracker IDs can be overridden via props; they default to the
 * corresponding `VITE_*` environment variable or a placeholder value.
 */
export function AdTrackers({
  ga4Id = GA4_MEASUREMENT_ID,
  gtmId = GTM_ID,
  metaPixelId = META_PIXEL_ID,
  googleAdsId = GOOGLE_ADS_ID,
  linkedInPartnerId = LINKEDIN_PARTNER_ID,
}: AdTrackersProps) {
  const { analytics, marketing } = useCookieConsent();

  // ---- Analytics scripts (GA4 + GTM) ----
  const injectAnalytics = useCallback(() => {
    if (!ga4Id && !gtmId) return;

    // GA4
    if (ga4Id) {
      injectScript('ga4', `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`);
      injectInlineScript(
        'ga4-init',
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`,
      );
    }

    // GTM
    if (gtmId) {
      injectInlineScript(
        'gtm',
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;j.setAttribute('${DATA_ATTR}','gtm-loader');f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
      );
    }
  }, [ga4Id, gtmId]);

  const removeAnalytics = useCallback(() => {
    removeScriptsById('ga4');
    removeScriptsById('ga4-init');
    removeScriptsById('gtm');
    removeScriptsById('gtm-loader');
    // Clean up GA / GTM cookies
    deleteCookiesMatching(/^(_ga|_gid|_gat|__utm)/);
  }, []);

  useEffect(() => {
    if (analytics) {
      injectAnalytics();
    } else {
      removeAnalytics();
    }
  }, [analytics, injectAnalytics, removeAnalytics]);

  // ---- Marketing scripts (Meta Pixel, Google Ads, LinkedIn) ----
  const injectMarketing = useCallback(() => {
    if (!metaPixelId && !googleAdsId && !linkedInPartnerId) return;

    // Meta / Facebook Pixel
    if (metaPixelId) {
      injectInlineScript(
        'meta-pixel',
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;t.setAttribute('${DATA_ATTR}','meta-pixel-loader');s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`,
      );
    }

    // Google Ads conversion tracking (shares gtag with GA4)
    if (googleAdsId) {
      if (!document.querySelector(`script[${DATA_ATTR}="ga4"]`)) {
        // If analytics scripts aren't loaded, inject gtag for ads only
        injectScript('gads', `https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`);
        injectInlineScript(
          'gads-init',
          `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAdsId}');`,
        );
      } else {
        // gtag is already present; just add the ads config
        injectInlineScript('gads-init', `gtag('config','${googleAdsId}');`);
      }
    }

    // LinkedIn Insight Tag
    if (linkedInPartnerId) {
      injectInlineScript(
        'linkedin',
        `window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push('${linkedInPartnerId}');`,
      );
      injectInlineScript(
        'linkedin-loader',
        `(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';b.setAttribute('${DATA_ATTR}','linkedin-script');s.parentNode.insertBefore(b,s);})(window.lintrk);`,
      );
    }
  }, [metaPixelId, googleAdsId, linkedInPartnerId]);

  const removeMarketing = useCallback(() => {
    removeScriptsById('meta-pixel');
    removeScriptsById('meta-pixel-loader');
    removeScriptsById('gads');
    removeScriptsById('gads-init');
    removeScriptsById('linkedin');
    removeScriptsById('linkedin-loader');
    removeScriptsById('linkedin-script');
    // Clean up marketing cookies
    deleteCookiesMatching(/^(_fbp|_fbc|fr|_gcl|_li)/);
  }, []);

  useEffect(() => {
    if (marketing) {
      injectMarketing();
    } else {
      removeMarketing();
    }
  }, [marketing, injectMarketing, removeMarketing]);

  // This component renders nothing visible.
  return null;
}

export default AdTrackers;
