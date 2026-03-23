import { useEffect } from "react";

interface StructuredDataProps {
  type: string;
  data: Record<string, unknown>;
}

const DEFAULT_ORG = {
  "@type": "CreditUnion",
  name: "Demo Credit Union",
  alternateName: "Demo CU",
  url: "https://www.example-cu.org",
  logo: "https://www.example-cu.org/logo.png",
  foundingDate: "1952",
  description: "Not-for-profit financial cooperative serving communities nationwide. NCUA insured.",
  telephone: "+1-800-555-0199",
  email: "support@example-cu.org",
  address: {
    "@type": "PostalAddress",
    streetAddress: "100 Credit Union Way",
    addressLocality: "Anytown",
    addressRegion: "US",
    postalCode: "10001",
    addressCountry: "US",
  },
  areaServed: [{ "@type": "Country", name: "United States" }],
  numberOfEmployees: { "@type": "QuantitativeValue", value: 850 },
  sameAs: [
    "https://facebook.com/examplecu",
    "https://twitter.com/examplecu",
    "https://linkedin.com/company/example-cu",
    "https://instagram.com/examplecu",
  ],
};

/**
 * Renders JSON-LD structured data into the document head.
 * Automatically includes default organization context.
 */
export function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-structured", type);

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": type,
      ...data,
    };

    // Attach organization info for relevant types
    if (["WebPage", "Product", "FAQPage", "ContactPage", "AboutPage"].includes(type)) {
      jsonLd.publisher = { "@type": "CreditUnion", ...DEFAULT_ORG };
    }

    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [type, data]);

  return null;
}

/** Pre-built organization schema for use in pages */
export function OrganizationSchema() {
  return <StructuredData type="CreditUnion" data={DEFAULT_ORG} />;
}

/** Breadcrumb schema helper */
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  return (
    <StructuredData
      type="BreadcrumbList"
      data={{
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}
