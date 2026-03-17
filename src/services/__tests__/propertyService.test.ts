import { describe, it, expect } from 'vitest';
import { getRiskLevel, getRiskLevelDisplay } from '../propertyService';
import type { RiskLevel } from '../propertyService';

describe('getRiskLevel', () => {
  it('returns critical for scores >= 80', () => {
    expect(getRiskLevel(80)).toBe('critical');
    expect(getRiskLevel(100)).toBe('critical');
  });

  it('returns high for scores >= 60', () => {
    expect(getRiskLevel(60)).toBe('high');
    expect(getRiskLevel(79)).toBe('high');
  });

  it('returns medium for scores >= 40', () => {
    expect(getRiskLevel(40)).toBe('medium');
    expect(getRiskLevel(59)).toBe('medium');
  });

  it('returns low for scores < 40', () => {
    expect(getRiskLevel(0)).toBe('low');
    expect(getRiskLevel(39)).toBe('low');
  });
});

describe('getRiskLevelDisplay', () => {
  const levels: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

  it('returns display object for each level', () => {
    for (const level of levels) {
      const display = getRiskLevelDisplay(level);
      expect(display.label).toBeTruthy();
      expect(display.bgClass).toBeTruthy();
      expect(display.lightBgClass).toBeTruthy();
      expect(display.textClass).toBeTruthy();
    }
  });

  it('returns correct labels', () => {
    expect(getRiskLevelDisplay('critical').label).toBe('Critical');
    expect(getRiskLevelDisplay('high').label).toBe('High');
    expect(getRiskLevelDisplay('medium').label).toBe('Medium');
    expect(getRiskLevelDisplay('low').label).toBe('Low');
  });
});
