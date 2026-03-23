import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
}

const BRAND = "Demo Credit Union";

export function SEOHead({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  canonicalUrl,
  twitterCard = "summary_large_image",
  noIndex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // Set document title
    document.title = title ? `${title} | ${BRAND}` : `${BRAND} - Banking That Puts You First`;

    // Helper to set/create meta tags
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

    // Basic meta
    if (description) setMeta("description", description);

    // Robots
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta(
        "robots",
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      );
    }

    // Open Graph
    setMeta("og:title", ogTitle ?? title, true);
    setMeta("og:site_name", BRAND, true);
    if (ogDescription || description)
      setMeta("og:description", ogDescription ?? description ?? "", true);
    if (ogImage) setMeta("og:image", ogImage, true);
    if (ogType) setMeta("og:type", ogType, true);
    if (canonicalUrl) setMeta("og:url", canonicalUrl, true);

    // Twitter Card
    setMeta("twitter:card", twitterCard);
    setMeta("twitter:title", ogTitle ?? title);
    if (ogDescription || description)
      setMeta("twitter:description", ogDescription ?? description ?? "");
    if (ogImage) setMeta("twitter:image", ogImage);
    setMeta("twitter:site", "@examplecu");

    // Canonical URL
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    }

    // Language alternate
    let langLink = document.querySelector('link[hreflang="en-US"]') as HTMLLinkElement | null;
    if (!langLink) {
      langLink = document.createElement("link");
      langLink.rel = "alternate";
      langLink.hreflang = "en-US";
      langLink.href = window.location.href;
      document.head.appendChild(langLink);
    }
  }, [
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    canonicalUrl,
    twitterCard,
    noIndex,
  ]);

  return null;
}
