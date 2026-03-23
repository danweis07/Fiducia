/**
 * Property Service — risk level utilities
 */

export type RiskLevel = "critical" | "high" | "medium" | "low";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getRiskLevelDisplay(level: RiskLevel) {
  const map: Record<
    RiskLevel,
    { label: string; bgClass: string; lightBgClass: string; textClass: string }
  > = {
    critical: {
      label: "Critical",
      bgClass: "bg-red-600",
      lightBgClass: "bg-red-100",
      textClass: "text-red-700",
    },
    high: {
      label: "High",
      bgClass: "bg-amber-500",
      lightBgClass: "bg-amber-100",
      textClass: "text-amber-700",
    },
    medium: {
      label: "Medium",
      bgClass: "bg-blue-500",
      lightBgClass: "bg-blue-100",
      textClass: "text-blue-700",
    },
    low: {
      label: "Low",
      bgClass: "bg-emerald-500",
      lightBgClass: "bg-emerald-100",
      textClass: "text-emerald-700",
    },
  };
  return map[level];
}
