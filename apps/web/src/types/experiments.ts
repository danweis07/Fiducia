/**
 * A/B Experiment Framework Types
 *
 * Types for the experimentation system that supports A/B testing
 * of CMS content variants with sticky user assignments and event tracking.
 */

// =============================================================================
// STATUS
// =============================================================================

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export type ExperimentEventType = "impression" | "click" | "dismiss" | "conversion";

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Experiment {
  id: string;
  firmId: string;
  name: string;
  description: string | null;
  status: ExperimentStatus;
  metric: string;
  trafficPercent: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated on getExperiment — not present on list responses */
  variants?: ExperimentVariant[];
}

export interface ExperimentVariant {
  id: string;
  experimentId: string;
  name: string;
  contentId: string | null;
  weight: number;
  isControl: boolean;
  createdAt: string;
}

export interface ExperimentAssignment {
  id: string;
  experimentId: string;
  userId: string;
  variantId: string;
  assignedAt: string;
}

export interface ExperimentEvent {
  id: string;
  experimentId: string;
  variantId: string;
  userId: string;
  eventType: ExperimentEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// =============================================================================
// RESULTS / ANALYTICS
// =============================================================================

export interface VariantStats {
  variantId: string;
  variantName: string;
  isControl: boolean;
  impressions: number;
  clicks: number;
  dismissals: number;
  conversions: number;
  clickRate: number;
  conversionRate: number;
}

export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  status: ExperimentStatus;
  variants: VariantStats[];
  totalImpressions: number;
  totalConversions: number;
}

// =============================================================================
// INPUTS
// =============================================================================

export interface ExperimentVariantInput {
  name: string;
  contentId?: string | null;
  weight: number;
  isControl: boolean;
}

export interface ExperimentCreateInput {
  name: string;
  description?: string | null;
  metric?: string;
  trafficPercent?: number;
  variants: ExperimentVariantInput[];
}
