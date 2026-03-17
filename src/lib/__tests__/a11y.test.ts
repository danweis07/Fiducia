import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  meetsContrastAA,
  hslToRgb,
  MIN_TOUCH_TARGET_PX,
} from '../a11y';

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 4);
  });

  it('returns correct value for red', () => {
    const lum = relativeLuminance(255, 0, 0);
    expect(lum).toBeCloseTo(0.2126, 3);
  });

  it('returns correct value for green', () => {
    const lum = relativeLuminance(0, 255, 0);
    expect(lum).toBeCloseTo(0.7152, 3);
  });

  it('returns correct value for blue', () => {
    const lum = relativeLuminance(0, 0, 255);
    expect(lum).toBeCloseTo(0.0722, 3);
  });

  it('handles mid-gray', () => {
    const lum = relativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    const ratio = contrastRatio([0, 0, 0], [255, 255, 255]);
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1 for same color', () => {
    const ratio = contrastRatio([100, 100, 100], [100, 100, 100]);
    expect(ratio).toBeCloseTo(1, 4);
  });

  it('returns same ratio regardless of order', () => {
    const r1 = contrastRatio([255, 0, 0], [255, 255, 255]);
    const r2 = contrastRatio([255, 255, 255], [255, 0, 0]);
    expect(r1).toBeCloseTo(r2, 4);
  });

  it('is always >= 1', () => {
    const ratio = contrastRatio([50, 50, 50], [51, 51, 51]);
    expect(ratio).toBeGreaterThanOrEqual(1);
  });
});

describe('meetsContrastAA', () => {
  it('returns true for black on white (normal text)', () => {
    expect(meetsContrastAA([0, 0, 0], [255, 255, 255])).toBe(true);
  });

  it('returns false for light gray on white (normal text)', () => {
    expect(meetsContrastAA([200, 200, 200], [255, 255, 255])).toBe(false);
  });

  it('has lower threshold for large text', () => {
    // A ratio of ~3.5 should pass large text but fail normal text
    // dark gray on white-ish
    const fg: [number, number, number] = [130, 130, 130];
    const bg: [number, number, number] = [255, 255, 255];
    const ratio = contrastRatio(fg, bg);
    if (ratio >= 3.0 && ratio < 4.5) {
      expect(meetsContrastAA(fg, bg, true)).toBe(true);
      expect(meetsContrastAA(fg, bg, false)).toBe(false);
    }
  });
});

describe('hslToRgb', () => {
  it('converts black', () => {
    expect(hslToRgb('0 0% 0%')).toEqual([0, 0, 0]);
  });

  it('converts white', () => {
    expect(hslToRgb('0 0% 100%')).toEqual([255, 255, 255]);
  });

  it('converts pure red', () => {
    const [r, g, b] = hslToRgb('0 100% 50%');
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('converts gray (no saturation)', () => {
    const [r, g, b] = hslToRgb('0 0 50');
    expect(r).toBe(128);
    expect(g).toBe(128);
    expect(b).toBe(128);
  });

  it('returns [0,0,0] for invalid input', () => {
    expect(hslToRgb('invalid')).toEqual([0, 0, 0]);
  });

  it('handles HSL without percent signs', () => {
    const result = hslToRgb('215 70 45');
    expect(result[0]).toBeGreaterThan(0);
    expect(result[2]).toBeGreaterThan(0);
  });
});

describe('MIN_TOUCH_TARGET_PX', () => {
  it('equals 44', () => {
    expect(MIN_TOUCH_TARGET_PX).toBe(44);
  });
});
