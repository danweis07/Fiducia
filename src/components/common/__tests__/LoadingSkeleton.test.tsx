import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AccountCardSkeleton, TransactionRowSkeleton, PageSkeleton } from '../LoadingSkeleton';

describe('AccountCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<AccountCardSkeleton />);
    expect(container.firstElementChild).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<AccountCardSkeleton className="custom-class" />);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});

describe('TransactionRowSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TransactionRowSkeleton />);
    expect(container.firstElementChild).toBeTruthy();
  });
});

describe('PageSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageSkeleton />);
    expect(container.firstElementChild).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<PageSkeleton className="page-custom" />);
    expect(container.firstElementChild?.className).toContain('page-custom');
  });
});
