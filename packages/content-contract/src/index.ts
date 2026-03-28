/**
 * @fiducia/content-contract — Shared Content Types
 *
 * Defines the content schema shared between web (React) and mobile (Flutter).
 * Both platforms consume the same CMS API and should render the same content.
 *
 * Usage:
 *   Web:    import type { CMSPage, Announcement } from "@fiducia/content-contract";
 *   Mobile: Generate Dart types from this package via openapi-generator or json_serializable.
 */

// =============================================================================
// CMS PAGES
// =============================================================================

export interface CMSPage {
  slug: string;
  title: string;
  description?: string;
  body: string; // Markdown or HTML
  heroImageUrl?: string;
  locale: string;
  publishedAt: string | null;
  updatedAt: string;
}

// =============================================================================
// ANNOUNCEMENTS
// =============================================================================

export type AnnouncementVariant = "info" | "warning" | "success" | "error";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  variant: AnnouncementVariant;
  dismissible: boolean;
  startAt: string;
  endAt: string | null;
  channels: ("web" | "mobile" | "email")[];
}

// =============================================================================
// PRODUCT OFFERS
// =============================================================================

export interface ProductOffer {
  id: string;
  slug: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
  imageUrl?: string;
  badge?: string;
  priority: number;
  startAt: string;
  endAt: string | null;
}

// =============================================================================
// BRANCH / LOCATION DATA
// =============================================================================

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  latitude: number;
  longitude: number;
  hours: Record<string, string>; // e.g., { "monday": "9am-5pm" }
  services: string[]; // e.g., ["atm", "drive-thru", "safe-deposit"]
  isOpen: boolean;
}

// =============================================================================
// RATES
// =============================================================================

export interface RateSheet {
  updatedAt: string;
  savings: RateEntry[];
  cds: RateEntry[];
  loans: RateEntry[];
  mortgages: RateEntry[];
}

export interface RateEntry {
  productName: string;
  minBalanceCents?: number;
  termMonths?: number;
  apyBps: number; // Basis points (e.g., 425 = 4.25%)
  aprBps?: number;
}

// =============================================================================
// SITE CONFIG (tenant identity)
// =============================================================================

export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
  phone: string;
  phoneFormatted: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  websiteUrl: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
}
