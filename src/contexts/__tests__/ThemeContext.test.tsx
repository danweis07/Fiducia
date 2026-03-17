import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

vi.mock('@/lib/theme', () => ({
  DEFAULT_THEME: {
    layout: 'classic',
    font: 'inter',
    mode: 'system',
    primaryColor: '215 50% 25%',
    secondaryColor: '40 10% 94%',
    accentColor: '38 75% 50%',
    borderRadius: 'md',
    highContrast: false,
    reducedMotion: false,
  },
  FONT_FAMILIES: {
    inter: "'Inter', system-ui, sans-serif",
    roboto: "'Roboto', system-ui, sans-serif",
    'open-sans': "'Open Sans', system-ui, sans-serif",
    'dm-sans': "'DM Sans', system-ui, sans-serif",
    nunito: "'Nunito', system-ui, sans-serif",
  },
  BORDER_RADIUS_VALUES: {
    none: '0rem',
    sm: '0.375rem',
    md: '0.75rem',
    lg: '1rem',
    full: '9999px',
  },
  loadTheme: vi.fn(() => ({
    layout: 'classic',
    font: 'inter',
    mode: 'system',
    primaryColor: '215 50% 25%',
    secondaryColor: '40 10% 94%',
    accentColor: '38 75% 50%',
    borderRadius: 'md',
    highContrast: false,
    reducedMotion: false,
  })),
  saveTheme: vi.fn(),
}));

vi.mock('@/lib/theme/font-loader', () => ({
  loadFont: vi.fn(),
}));

describe('ThemeContext', () => {
  it('exports ThemeProvider and useTheme', async () => {
    const mod = await import('../ThemeContext');
    expect(mod.ThemeProvider).toBeDefined();
    expect(mod.useTheme).toBeDefined();
  });

  it('renders children within ThemeProvider', async () => {
    const { ThemeProvider } = await import('../ThemeContext');
    render(
      createElement(ThemeProvider, null,
        createElement('div', { 'data-testid': 'child' }, 'Hello Theme')
      )
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Hello Theme')).toBeTruthy();
  });

  it('useTheme throws when used outside ThemeProvider', async () => {
    const { useTheme } = await import('../ThemeContext');
    function BadConsumer() {
      useTheme();
      return createElement('div', null, 'should not render');
    }
    expect(() => render(createElement(BadConsumer))).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
  });
});
