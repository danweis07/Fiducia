import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from '../Stepper';

const steps = [
  { label: 'Account', description: 'Select account' },
  { label: 'Amount', description: 'Enter amount' },
  { label: 'Review', description: 'Confirm details' },
];

describe('Stepper', () => {
  it('renders all step labels', () => {
    render(<Stepper steps={steps} currentStep={1} />);
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
  });

  it('renders a nav element with progress aria-label', () => {
    render(<Stepper steps={steps} currentStep={2} />);
    expect(screen.getByRole('navigation', { name: 'Progress' })).toBeTruthy();
  });

  it('marks the current step with aria-current', () => {
    const { container } = render(<Stepper steps={steps} currentStep={2} />);
    const currentStepEl = container.querySelector('[aria-current="step"]');
    expect(currentStepEl).toBeTruthy();
    expect(currentStepEl?.textContent).toBe('2');
  });

  it('applies custom className', () => {
    const { container } = render(<Stepper steps={steps} currentStep={1} className="my-stepper" />);
    expect(container.querySelector('.my-stepper')).toBeTruthy();
  });
});
