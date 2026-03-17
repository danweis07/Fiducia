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

import AboutPage from '../AboutPage';

describe('AboutPage', () => {
  it('renders without crashing', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('About Demo Credit Union')).toBeTruthy();
  });

  it('shows the Our Story section', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('Our Story')).toBeTruthy();
  });

  it('shows the Our Mission section', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('Our Mission')).toBeTruthy();
  });

  it('shows the Our Values section', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('Our Values')).toBeTruthy();
    expect(screen.getByText('Member-First')).toBeTruthy();
  });

  it('shows the By The Numbers section', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('By The Numbers')).toBeTruthy();
    expect(screen.getByText('175,000+')).toBeTruthy();
  });

  it('shows the Executive Leadership section', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('Executive Leadership')).toBeTruthy();
    expect(screen.getByText('Sarah Chen')).toBeTruthy();
  });

  it('shows the Community Impact section', () => {
    render(createElement(AboutPage), { wrapper: createWrapper() });
    expect(screen.getByText('Community Impact')).toBeTruthy();
    expect(screen.getByText('The Demo CU Foundation')).toBeTruthy();
  });
});
