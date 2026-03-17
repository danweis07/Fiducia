import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  LAYOUT_LABELS,
  FONT_LABELS,
  FONT_FAMILIES,
  BORDER_RADIUS_VALUES,
  PRESET_LABELS,
  loadTheme,
  saveTheme,
} from '../theme/index';

describe('DEFAULT_THEME', () => {
  it('has correct default values', () => {
    expect(DEFAULT_THEME.layout).toBe('classic');
    expect(DEFAULT_THEME.font).toBe('inter');
    expect(DEFAULT_THEME.mode).toBe('system');
    expect(DEFAULT_THEME.borderRadius).toBe('md');
    expect(DEFAULT_THEME.highContrast).toBe(false);
    expect(DEFAULT_THEME.reducedMotion).toBe(false);
  });

  it('has HSL color values', () => {
    expect(DEFAULT_THEME.primaryColor).toMatch(/\d+ \d+% \d+%/);
    expect(DEFAULT_THEME.secondaryColor).toMatch(/\d+ \d+% \d+%/);
    expect(DEFAULT_THEME.accentColor).toMatch(/\d+ \d+% \d+%/);
  });
});

describe('THEME_PRESETS', () => {
  it('has 5 presets', () => {
    expect(Object.keys(THEME_PRESETS)).toHaveLength(5);
  });

  it('each preset has a layout', () => {
    for (const preset of Object.values(THEME_PRESETS)) {
      expect(preset.layout).toBeDefined();
    }
  });

  it('each preset has a font', () => {
    for (const preset of Object.values(THEME_PRESETS)) {
      expect(preset.font).toBeDefined();
    }
  });

  it('each preset has colors', () => {
    for (const preset of Object.values(THEME_PRESETS)) {
      expect(preset.primaryColor).toBeDefined();
      expect(preset.secondaryColor).toBeDefined();
      expect(preset.accentColor).toBeDefined();
    }
  });
});

describe('LAYOUT_LABELS', () => {
  it('has labels for all layouts', () => {
    expect(LAYOUT_LABELS.classic).toBe('Classic');
    expect(LAYOUT_LABELS.modern).toBe('Modern');
    expect(LAYOUT_LABELS.compact).toBe('Compact');
    expect(LAYOUT_LABELS.sidebar).toBe('Sidebar');
    expect(LAYOUT_LABELS.dashboard).toBe('Dashboard');
  });
});

describe('FONT_LABELS', () => {
  it('has labels for all fonts', () => {
    expect(Object.keys(FONT_LABELS)).toHaveLength(5);
    expect(FONT_LABELS.inter).toBe('Inter');
  });
});

describe('FONT_FAMILIES', () => {
  it('has CSS font families for all fonts', () => {
    expect(Object.keys(FONT_FAMILIES)).toHaveLength(5);
    expect(FONT_FAMILIES.inter).toContain('Inter');
    expect(FONT_FAMILIES.inter).toContain('sans-serif');
  });
});

describe('BORDER_RADIUS_VALUES', () => {
  it('has values for all border radius options', () => {
    expect(BORDER_RADIUS_VALUES.none).toBe('0rem');
    expect(BORDER_RADIUS_VALUES.sm).toBe('0.375rem');
    expect(BORDER_RADIUS_VALUES.md).toBe('0.75rem');
    expect(BORDER_RADIUS_VALUES.lg).toBe('1rem');
    expect(BORDER_RADIUS_VALUES.full).toBe('9999px');
  });
});

describe('PRESET_LABELS', () => {
  it('has labels for all presets', () => {
    expect(Object.keys(PRESET_LABELS)).toHaveLength(5);
  });
});

describe('loadTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default theme when nothing stored', () => {
    const theme = loadTheme();
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it('returns stored theme merged with defaults', () => {
    localStorage.setItem(
      'vantage-theme',
      JSON.stringify({ layout: 'modern', font: 'roboto' })
    );
    const theme = loadTheme();
    expect(theme.layout).toBe('modern');
    expect(theme.font).toBe('roboto');
    expect(theme.mode).toBe('system'); // from defaults
  });

  it('returns default on corrupt storage', () => {
    localStorage.setItem('vantage-theme', 'invalid json{{{');
    const theme = loadTheme();
    expect(theme).toEqual(DEFAULT_THEME);
  });
});

describe('saveTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists theme to localStorage', () => {
    const theme = { ...DEFAULT_THEME, layout: 'compact' as const };
    saveTheme(theme);
    const stored = JSON.parse(localStorage.getItem('vantage-theme') || '{}');
    expect(stored.layout).toBe('compact');
  });
});
