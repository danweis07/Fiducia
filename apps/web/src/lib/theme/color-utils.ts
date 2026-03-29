/**
 * Color Conversion Utilities
 *
 * Converts between hex (#RRGGBB) and HSL string ("H S% L%") formats.
 * HSL strings match the CSS custom property format used in index.css.
 */

/** Parse a hex color (#RGB or #RRGGBB) into [r, g, b] in 0-255 range */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Convert RGB (0-255) to HSL components: h (0-360), s (0-100), l (0-100) */
function rgbToHslComponents(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Convert HSL components to RGB (0-255) */
function hslComponentsToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;

  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

/**
 * Convert a hex color to an HSL string.
 * @param hex e.g. "#1e40af"
 * @returns HSL string e.g. "221 72% 40%"
 */
export function hexToHsl(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHslComponents(r, g, b);
  return `${h} ${s}% ${l}%`;
}

/**
 * Convert an HSL string to a hex color.
 * @param hsl e.g. "221 72% 40%"
 * @returns hex e.g. "#1e40af"
 */
export function hslToHex(hsl: string): string {
  const [h, s, l] = parseHslString(hsl);
  const [r, g, b] = hslComponentsToRgb(h, s, l);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Parse an HSL string into [h, s, l] components.
 * Accepts "H S% L%" format (e.g. "215 50% 25%").
 */
export function parseHslString(hsl: string): [number, number, number] {
  const parts = hsl.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
  if (!parts) return [0, 0, 0];
  return [Number(parts[1]), Number(parts[2]), Number(parts[3])];
}

/**
 * Format HSL components into the CSS variable string format.
 * @returns "H S% L%"
 */
export function hslToString(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/**
 * Clamp lightness to 0-100 range.
 */
export function clampL(l: number): number {
  return Math.max(0, Math.min(100, l));
}

/**
 * Adjust lightness of an HSL string.
 */
export function adjustLightness(hsl: string, delta: number): string {
  const [h, s, l] = parseHslString(hsl);
  return hslToString(h, s, clampL(l + delta));
}

/**
 * Adjust saturation of an HSL string.
 */
export function adjustSaturation(hsl: string, delta: number): string {
  const [h, s, l] = parseHslString(hsl);
  return hslToString(h, Math.max(0, Math.min(100, s + delta)), l);
}

/**
 * Shift hue by a number of degrees.
 */
export function shiftHue(hsl: string, degrees: number): string {
  const [h, s, l] = parseHslString(hsl);
  return hslToString((h + degrees + 360) % 360, s, l);
}
