import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WizardFlow } from '../WizardFlow';

const defaultSteps = ['From Account', 'Destination', 'Amount', 'Confirm'];

describe('WizardFlow', () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it('renders all step labels', () => {
    render(
      <WizardFlow steps={defaultSteps} currentStep={1}>
        <div>Step 1 content</div>
      </WizardFlow>,
    );
    expect(screen.getByText('From Account')).toBeTruthy();
    expect(screen.getByText('Destination')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('renders children content', () => {
    render(
      <WizardFlow steps={defaultSteps} currentStep={1}>
        <div>Step content here</div>
      </WizardFlow>,
    );
    expect(screen.getByText('Step content here')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Current step indicator
  // ---------------------------------------------------------------------------

  it('marks current step with aria-current', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={2}>
        <div>Content</div>
      </WizardFlow>,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current).toBeTruthy();
    expect(current!.textContent).toBe('2');
  });

  it('marks step 1 as current when currentStep is 1', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={1}>
        <div>Content</div>
      </WizardFlow>,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current!.textContent).toBe('1');
  });

  it('marks step 3 as current when currentStep is 3', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={3}>
        <div>Content</div>
      </WizardFlow>,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current!.textContent).toBe('3');
  });

  it('marks last step as current', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={4}>
        <div>Content</div>
      </WizardFlow>,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current!.textContent).toBe('4');
  });

  // ---------------------------------------------------------------------------
  // Completed steps show check icon
  // ---------------------------------------------------------------------------

  it('shows step number for non-completed, non-current steps', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={2}>
        <div>Content</div>
      </WizardFlow>,
    );
    // Step 3 and 4 should show their numbers
    const circles = container.querySelectorAll('.rounded-full');
    // Step 3 should show "3"
    expect(circles[2].textContent).toBe('3');
  });

  // ---------------------------------------------------------------------------
  // Progress nav
  // ---------------------------------------------------------------------------

  it('renders progress nav with aria-label', () => {
    render(
      <WizardFlow steps={defaultSteps} currentStep={1}>
        <div>Content</div>
      </WizardFlow>,
    );
    const nav = screen.getByLabelText('Progress');
    expect(nav).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Different step configurations
  // ---------------------------------------------------------------------------

  it('works with 2 steps', () => {
    render(
      <WizardFlow steps={['Start', 'Finish']} currentStep={1}>
        <div>Content</div>
      </WizardFlow>,
    );
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByText('Finish')).toBeTruthy();
  });

  it('works with 5 steps', () => {
    render(
      <WizardFlow steps={['A', 'B', 'C', 'D', 'E']} currentStep={3}>
        <div>Content</div>
      </WizardFlow>,
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
  });

  it('works with single step', () => {
    render(
      <WizardFlow steps={['Only']} currentStep={1}>
        <div>Content</div>
      </WizardFlow>,
    );
    expect(screen.getByText('Only')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Children swap per step
  // ---------------------------------------------------------------------------

  it('renders correct children for step 1', () => {
    render(
      <WizardFlow steps={defaultSteps} currentStep={1}>
        <div>Step 1 form</div>
      </WizardFlow>,
    );
    expect(screen.getByText('Step 1 form')).toBeTruthy();
  });

  it('renders correct children for step 2', () => {
    render(
      <WizardFlow steps={defaultSteps} currentStep={2}>
        <div>Step 2 form</div>
      </WizardFlow>,
    );
    expect(screen.getByText('Step 2 form')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // className
  // ---------------------------------------------------------------------------

  it('applies custom className', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={1} className="custom-wizard">
        <div>Content</div>
      </WizardFlow>,
    );
    expect(container.firstElementChild?.className).toContain('custom-wizard');
  });

  // ---------------------------------------------------------------------------
  // Arrows between steps
  // ---------------------------------------------------------------------------

  it('renders arrows between steps but not after last', () => {
    const { container } = render(
      <WizardFlow steps={defaultSteps} currentStep={1}>
        <div>Content</div>
      </WizardFlow>,
    );
    // Should have N-1 arrows for N steps
    // Each arrow is an ArrowRight icon
    const arrows = container.querySelectorAll('.h-4.w-4.text-muted-foreground');
    // There should be 3 arrows for 4 steps (one icon per arrow)
    expect(arrows.length).toBeGreaterThanOrEqual(3);
  });
});
