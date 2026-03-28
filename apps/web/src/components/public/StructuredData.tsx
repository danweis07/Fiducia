import { useEffect } from "react";
import { tenantConfig } from "@/lib/tenant.config";

interface StructuredDataProps {
  type: string;
  data: Record<string, unknown>;
}

const DEFAULT_ORG = {
  "@type": "CreditUnion",
  name: tenantConfig.name,
  alternateName: tenantConfig.shortName,
  url: tenantConfig.websiteUrl,
  logo: tenantConfig.logoUrl ?? `${tenantConfig.websiteUrl}/logo.png`,
  foundingDate: String(tenantConfig.foundedYear),
  description: `Not-for-profit financial cooperative serving communities in ${tenantConfig.serviceArea}. ${tenantConfig.ncuaMember ? "NCUA" : "FDIC"} insured.`,
  telephone: tenantConfig.phone,
  email: tenantConfig.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: tenantConfig.streetAddress,
    addressLocality: tenantConfig.city,
    addressRegion: tenantConfig.stateAbbr,
    postalCode: tenantConfig.postalCode,
    addressCountry: tenantConfig.country,
  },
  areaServed: [{ "@type": "Country", name: "United States" }],
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    value: parseInt(tenantConfig.employeeCount.replace(/\D/g, ""), 10) || 0,
  },
  sameAs: [],
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
      ...data,
      "@type": type,
    };

    // Attach organization info for relevant types
    if (["WebPage", "Product", "FAQPage", "ContactPage", "AboutPage"].includes(type)) {
      jsonLd.publisher = { ...DEFAULT_ORG };
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
