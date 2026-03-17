import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) => <a href={to} {...props}>{children}</a>,
}));

import MoveMoney from '../MoveMoney';

describe('MoveMoney', () => {
  it('renders heading and options', () => {
    render(<MoveMoney />);
    expect(screen.getByText('Move Money')).toBeTruthy();
    expect(screen.getByText('Transfer')).toBeTruthy();
    expect(screen.getByText('Pay Bills')).toBeTruthy();
    expect(screen.getByText('Deposit Check')).toBeTruthy();
  });

  it('links to correct routes', () => {
    render(<MoveMoney />);
    const links = document.querySelectorAll('a');
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/transfer');
    expect(hrefs).toContain('/bills');
    expect(hrefs).toContain('/deposit');
  });
});
