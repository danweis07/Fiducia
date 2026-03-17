import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/public/PublicShell', () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'public-shell' }, children),
}));

vi.mock('@/components/public/SEOHead', () => ({
  SEOHead: () => null,
}));

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, null, children);
}

import RatesPage from '../RatesPage';

describe('RatesPage', () => {
  it('renders without crashing', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Current Rates')).toBeTruthy();
  });

  it('shows savings rates section', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Savings Rates')).toBeTruthy();
    expect(screen.getByText('Regular Savings')).toBeTruthy();
    expect(screen.getByText('High-Yield Savings')).toBeTruthy();
  });

  it('shows CD rates section', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Certificate / CD Rates')).toBeTruthy();
    expect(screen.getByText('12-Month')).toBeTruthy();
  });

  it('shows loan rates section', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Loan Rates')).toBeTruthy();
    expect(screen.getByText('Personal Loan')).toBeTruthy();
  });

  it('shows mortgage rates section', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Mortgage Rates')).toBeTruthy();
    expect(screen.getByText('30-Year Fixed')).toBeTruthy();
  });

  it('shows credit card rates section', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Credit Card Rates')).toBeTruthy();
    expect(screen.getByText('Rewards Card')).toBeTruthy();
  });

  it('shows the final CTA', () => {
    render(createElement(RatesPage), { wrapper: createWrapper() });
    expect(screen.getByText('Ready to Get Started?')).toBeTruthy();
  });
});
