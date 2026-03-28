/**
 * Tenant Configuration — Centralized Fallback Defaults
 *
 * All institution-specific content lives here. In production, these values
 * are overridden by the database via the config.theme gateway action.
 * For white-labeling, change this ONE file instead of editing 30+ pages.
 *
 * To deploy for a new institution:
 *   1. Update the defaults below
 *   2. Or set values in the admin BrandingEditor (they persist to DB)
 */

export interface TenantConfig {
  // Identity
  name: string;
  shortName: string;
  legalName: string;
  tagline: string;
  foundedYear: number;
  charterNumber?: string;
  routingNumber: string;
  nmlsId?: string;

  // Contact
  phone: string;
  phoneFormatted: string;
  fraudPhone: string;
  fraudPhoneFormatted: string;
  email: string;
  supportEmail: string;

  // Address
  streetAddress: string;
  city: string;
  state: string;
  stateAbbr: string;
  postalCode: string;
  country: string;

  // Online presence
  websiteUrl: string;
  appStoreUrl?: string;
  playStoreUrl?: string;

  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;

  // Business info
  memberCount: string;
  branchCount: number;
  totalAssets: string;
  employeeCount: string;
  serviceArea: string;
  eligibility: string;

  // Hours
  phoneHours: string;
  branchHours: string;

  // Legal
  fdicMember: boolean;
  ncuaMember: boolean;
  equalHousingLender: boolean;
}

/**
 * Default tenant configuration.
 * Override these values per-institution or via the admin BrandingEditor.
 */
export const tenantConfig: TenantConfig = {
  // Identity
  name: "Demo Credit Union",
  shortName: "Demo CU",
  legalName: "Demo Credit Union, Inc.",
  tagline: "Banking made simple",
  foundedYear: 1954,
  routingNumber: "021000021",

  // Contact
  phone: "+18005550199",
  phoneFormatted: "(800) 555-0199",
  fraudPhone: "+18005553728",
  fraudPhoneFormatted: "(800) 555-3728",
  email: "support@example-cu.org",
  supportEmail: "support@example-cu.org",

  // Address
  streetAddress: "100 Credit Union Way",
  city: "Anytown",
  state: "Pennsylvania",
  stateAbbr: "PA",
  postalCode: "10001",
  country: "US",

  // Online presence
  websiteUrl: "https://example-cu.org",

  // Branding
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#1e40af",
  accentColor: "#3b82f6",

  // Business info
  memberCount: "175,000+",
  branchCount: 23,
  totalAssets: "$3.2B",
  employeeCount: "850+",
  serviceArea: "Pennsylvania, New Jersey, and Delaware",
  eligibility: "Anyone who lives, works, worships, or attends school in the Delaware Valley region",

  // Hours
  phoneHours: "Mon–Fri 7am–7pm EST, Sat 9am–2pm EST",
  branchHours: "Mon–Fri 9am–5pm, Sat 9am–12pm",

  // Legal
  fdicMember: false,
  ncuaMember: true,
  equalHousingLender: true,
};
