import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/public/PublicShell', () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/public/SEOHead', () => ({
  SEOHead: () => null,
}));

import MortgagePage from '../MortgagePage';

describe('MortgagePage', () => {
  it('renders without crashing', () => {
    const { container } = render(<MortgagePage />);
    expect(container).toBeTruthy();
  });
});
