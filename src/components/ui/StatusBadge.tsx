import { cn } from "@/lib/utils";
import { getRiskLevel, getRiskLevelDisplay, type RiskLevel } from "@/services/propertyService";

interface StatusBadgeProps {
  /** Either a numeric score (0-100) or a risk level string */
  value: number | RiskLevel;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the label text */
  showLabel?: boolean;
  /** Whether to use solid or light background */
  variant?: "solid" | "light";
  /** Additional class names */
  className?: string;
}

/**
 * StatusBadge - A reusable badge component for displaying risk levels
 * 
 * Uses semantic design tokens from the design system:
 * - Critical (80-100): Red
 * - High (60-79): Amber  
 * - Medium (40-59): Blue
 * - Low (0-39): Emerald
 * 
 * @example
 * // With numeric score
 * <StatusBadge value={85} />
 * 
 * // With risk level
 * <StatusBadge value="critical" showLabel />
 * 
 * // Light variant
 * <StatusBadge value={65} variant="light" />
 */
export function StatusBadge({ 
  value, 
  size = "md", 
  showLabel = false,
  variant = "solid",
  className 
}: StatusBadgeProps) {
  // Determine risk level
  const level: RiskLevel = typeof value === "number" ? getRiskLevel(value) : value;
  const display = getRiskLevelDisplay(level);
  const score = typeof value === "number" ? value : null;

  // Size classes
  const sizeClasses = {
    sm: "h-6 min-w-6 px-1.5 text-xs",
    md: "h-8 min-w-8 px-2 text-sm",
    lg: "h-10 min-w-10 px-3 text-base",
  };

  // Circle size for score-only display
  const circleSizes = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  // If showing just the score (no label), render as circle
  if (score !== null && !showLabel) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold shadow-sm",
          variant === "solid" ? display.bgClass : display.lightBgClass,
          variant === "solid" ? "text-white" : display.textClass,
          circleSizes[size],
          className
        )}
      >
        {score}
      </div>
    );
  }

  // Render as pill badge
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold",
        variant === "solid" ? display.bgClass : display.lightBgClass,
        variant === "solid" ? "text-white" : display.textClass,
        sizeClasses[size],
        className
      )}
    >
      {score !== null && <span>{score}</span>}
      {showLabel && <span>{display.label}</span>}
    </div>
  );
}

/**
 * RiskIndicator - A simple colored dot indicator
 */
interface RiskIndicatorProps {
  score: number;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export function RiskIndicator({ score, size = "md", pulse = false, className }: RiskIndicatorProps) {
  const level = getRiskLevel(score);
  const display = getRiskLevelDisplay(level);

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <div
      className={cn(
        "rounded-full",
        display.bgClass,
        sizeClasses[size],
        pulse && level === "critical" && "animate-pulse",
        className
      )}
    />
  );
}

export default StatusBadge;
