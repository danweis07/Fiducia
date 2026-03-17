import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AmountInput } from '../AmountInput';

describe('AmountInput', () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it('renders input with placeholder', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('0.00')).toBeTruthy();
  });

  it('renders custom placeholder', () => {
    render(<AmountInput value="" onChange={vi.fn()} placeholder="Enter amount" />);
    expect(screen.getByPlaceholderText('Enter amount')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(<AmountInput value="" onChange={vi.fn()} label="Transfer Amount" />);
    expect(screen.getByText('Transfer Amount')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<AmountInput value="" onChange={vi.fn()} />);
    expect(container.querySelector('label')).toBeNull();
  });

  it('renders dollar sign icon', () => {
    const { container } = render(<AmountInput value="" onChange={vi.fn()} />);
    // DollarSign icon should be present (aria-hidden)
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Value and onChange
  // ---------------------------------------------------------------------------

  it('displays current value', () => {
    render(<AmountInput value="100.00" onChange={vi.fn()} />);
    const input = screen.getByDisplayValue('100.00');
    expect(input).toBeTruthy();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '50.00' } });
    expect(onChange).toHaveBeenCalledWith('50.00');
  });

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  it('shows formatted preview when value is entered', () => {
    render(<AmountInput value="1250.99" onChange={vi.fn()} />);
    expect(screen.getByText('$1,250.99')).toBeTruthy();
  });

  it('does not show preview when value is empty', () => {
    const { container } = render(<AmountInput value="" onChange={vi.fn()} />);
    // No formatted preview should appear
    expect(container.textContent).not.toContain('$0.00');
  });

  it('does not show preview when showPreview is false', () => {
    render(<AmountInput value="100.00" onChange={vi.fn()} showPreview={false} />);
    // The $100.00 preview should not appear as text (just the input value)
    const previews = screen.queryAllByText('$100.00');
    expect(previews).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Error states
  // ---------------------------------------------------------------------------

  it('shows error message when provided', () => {
    render(<AmountInput value="0" onChange={vi.fn()} error="Amount is required" />);
    expect(screen.getByText('Amount is required')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('shows max exceeded error after blur', () => {
    render(<AmountInput value="200.00" onChange={vi.fn()} maxCents={10000} />);
    const input = screen.getByDisplayValue('200.00');
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('does not show max error before blur', () => {
    const { container } = render(<AmountInput value="200.00" onChange={vi.fn()} maxCents={10000} />);
    // Before blur, no error role
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('sets aria-invalid when in error state', () => {
    render(<AmountInput value="" onChange={vi.fn()} error="Required" />);
    const input = screen.getByPlaceholderText('0.00');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  // ---------------------------------------------------------------------------
  // Hint text
  // ---------------------------------------------------------------------------

  it('shows hint when provided and no error', () => {
    render(<AmountInput value="" onChange={vi.fn()} hint="Enter amount in USD" />);
    expect(screen.getByText('Enter amount in USD')).toBeTruthy();
  });

  it('hides hint when error is present', () => {
    render(<AmountInput value="" onChange={vi.fn()} hint="Hint text" error="Error text" />);
    expect(screen.queryByText('Hint text')).toBeNull();
    expect(screen.getByText('Error text')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it('disables input when disabled prop is true', () => {
    render(<AmountInput value="" onChange={vi.fn()} disabled />);
    const input = screen.getByPlaceholderText('0.00');
    expect(input).toHaveProperty('disabled', true);
  });

  // ---------------------------------------------------------------------------
  // Custom id
  // ---------------------------------------------------------------------------

  it('uses custom id', () => {
    render(<AmountInput id="custom-id" value="" onChange={vi.fn()} />);
    const input = document.getElementById('custom-id');
    expect(input).toBeTruthy();
  });

  it('uses default id when not provided', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    const input = document.getElementById('amount-input');
    expect(input).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Input mode
  // ---------------------------------------------------------------------------

  it('has decimal input mode for mobile keyboards', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('0.00');
    expect(input.getAttribute('inputMode')).toBe('decimal');
  });

  // ---------------------------------------------------------------------------
  // aria-describedby
  // ---------------------------------------------------------------------------

  it('sets aria-describedby for error', () => {
    render(<AmountInput id="amt" value="" onChange={vi.fn()} error="Error" />);
    const input = document.getElementById('amt');
    expect(input?.getAttribute('aria-describedby')).toBe('amt-error');
  });

  it('sets aria-describedby for hint when no error', () => {
    render(<AmountInput id="amt" value="" onChange={vi.fn()} hint="Hint" />);
    const input = document.getElementById('amt');
    expect(input?.getAttribute('aria-describedby')).toBe('amt-hint');
  });

  // ---------------------------------------------------------------------------
  // className
  // ---------------------------------------------------------------------------

  it('applies custom className to wrapper', () => {
    const { container } = render(<AmountInput value="" onChange={vi.fn()} className="custom-wrapper" />);
    expect(container.firstElementChild?.className).toContain('custom-wrapper');
  });
});
