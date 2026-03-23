// =============================================================================
// ACCESSIBILITY UTILITIES — WCAG 2.1 AA Compliance Helpers
// =============================================================================

/**
 * Calculate the relative luminance of an sRGB color.
 * Input: r, g, b in 0-255 range.
 * See: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate the contrast ratio between two colors.
 * Returns a value between 1 and 21.
 * WCAG AA requires >= 4.5 for normal text, >= 3.0 for large text.
 */
export function contrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
): number {
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color pair meets WCAG AA contrast requirements.
 */
export function meetsContrastAA(
  foreground: [number, number, number],
  background: [number, number, number],
  isLargeText = false,
): boolean {
  const ratio = contrastRatio(foreground, background);
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Parse an HSL string "H S% L%" into RGB [r, g, b].
 */
export function hslToRgb(hslString: string): [number, number, number] {
  const match = hslString.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
  if (!match) return [0, 0, 0];

  const h = Number(match[1]) / 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Announce a message to screen readers via an aria-live region.
 * Creates a temporary visually-hidden element that gets cleaned up.
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  const el = document.createElement("div");
  el.setAttribute("aria-live", priority);
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", priority === "assertive" ? "alert" : "status");
  el.className = "sr-only";
  el.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  document.body.appendChild(el);

  // Delay setting text so screen readers detect the change
  requestAnimationFrame(() => {
    el.textContent = message;
  });

  setTimeout(() => {
    el.remove();
  }, 5000);
}

/**
 * Trap focus within an element (e.g., a modal or dialog).
 * Returns a cleanup function.
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusable = container.querySelectorAll<HTMLElement>(focusableSelectors);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", handleKeyDown);
  return () => container.removeEventListener("keydown", handleKeyDown);
}

/**
 * Minimum touch target size constant (WCAG 2.5.5 — AA).
 * Use in Tailwind: min-w-[44px] min-h-[44px]
 */
export const MIN_TOUCH_TARGET_PX = 44;
