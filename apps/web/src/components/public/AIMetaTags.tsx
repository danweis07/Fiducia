import { useEffect } from "react";
import { tenantConfig } from "@/lib/tenant.config";

/**
 * AI/LLM-friendly meta tags for maximum discoverability by AI assistants,
 * search engine AI features, and LLM crawlers.
 *
 * - Generous robots directives for snippet/image/video previews
 * - Links to llms.txt for AI-readable site summary
 * - Structured hints for AI understanding
 */
export function AIMetaTags() {
  useEffect(() => {
    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    // Generous robots directives for AI indexing
    setMeta(
      "robots",
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    );

    // Google AI-specific
    setMeta(
      "googlebot",
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    );

    // AI/LLM content hints
    setMeta("ai:site-type", "credit-union-website");
    setMeta("ai:organization", tenantConfig.name);
    setMeta("ai:content-language", "en-US");
    setMeta("ai:llms-txt", "/llms.txt");

    // Link to llms.txt
    let llmsLink = document.querySelector('link[rel="ai-content"]') as HTMLLinkElement | null;
    if (!llmsLink) {
      llmsLink = document.createElement("link");
      llmsLink.rel = "ai-content";
      llmsLink.setAttribute("href", "/llms.txt");
      llmsLink.setAttribute("type", "text/plain");
      document.head.appendChild(llmsLink);
    }

    // Link to llms-full.txt
    let llmsFullLink = document.querySelector(
      'link[rel="ai-content-full"]',
    ) as HTMLLinkElement | null;
    if (!llmsFullLink) {
      llmsFullLink = document.createElement("link");
      llmsFullLink.rel = "ai-content-full";
      llmsFullLink.setAttribute("href", "/llms-full.txt");
      llmsFullLink.setAttribute("type", "text/plain");
      document.head.appendChild(llmsFullLink);
    }
  }, []);

  return null;
}
