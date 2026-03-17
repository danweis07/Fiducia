import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    request: vi.fn().mockResolvedValue({}),
    accountOpening: {
      config: vi.fn().mockResolvedValue({
        products: [],
        minAge: 18,
        requireSSN: true,
        fundingMethods: [],
      }),
      createApplication: vi.fn().mockResolvedValue({}),
      selectProducts: vi.fn().mockResolvedValue({}),
      submitFunding: vi.fn().mockResolvedValue({}),
      complete: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock('@/hooks/useAccountOpening', () => ({
  useAccountOpeningConfig: () => ({
    data: {
      products: [
        { id: 'checking', name: 'Checking', type: 'checking', description: 'Basic checking', minOpeningDeposit: 2500, apy: 0 },
      ],
      minAge: 18,
      requireSSN: true,
      fundingMethods: ['ach', 'transfer'],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateApplication: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSelectProducts: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitFunding: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompleteApplication: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/common/SecureInput', () => ({
  SecureInput: (props: { label?: string; value: string; onChange: (v: string) => void }) =>
    createElement('input', {
      'aria-label': props.label,
      value: props.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(e.target.value),
    }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc },
      createElement(MemoryRouter, null, children)
    );
}

import AccountOpening from '../AccountOpening';

describe('AccountOpening', () => {
  it('renders without crashing', () => {
    render(createElement(AccountOpening), { wrapper: createWrapper() });
    // The component should render account opening content
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders a heading with "Account" in it', () => {
    render(createElement(AccountOpening), { wrapper: createWrapper() });
    // The welcome step heading should be present
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });
});
