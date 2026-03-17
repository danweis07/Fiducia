import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockActivateDemoMode = vi.fn();
vi.mock('@/lib/demo', () => ({
  activateDemoMode: (...args: unknown[]) => mockActivateDemoMode(...args),
}));

import DemoSelector from '../DemoSelector';

describe('DemoSelector', () => {
  it('renders demo options', () => {
    render(<DemoSelector />);
    expect(screen.getByText('Choose a Demo')).toBeTruthy();
    expect(screen.getByText('Digital Banking')).toBeTruthy();
    expect(screen.getByText('Admin Portal')).toBeTruthy();
  });

  it('activates demo mode on click', () => {
    render(<DemoSelector />);
    fireEvent.click(screen.getByText('Digital Banking'));
    expect(mockActivateDemoMode).toHaveBeenCalledWith('/dashboard');
  });

  it('activates admin demo on click', () => {
    render(<DemoSelector />);
    fireEvent.click(screen.getByText('Admin Portal'));
    expect(mockActivateDemoMode).toHaveBeenCalledWith('/admin');
  });

  it('handles keyboard activation', () => {
    render(<DemoSelector />);
    const card = screen.getByText('Digital Banking').closest('[role="button"]')!;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockActivateDemoMode).toHaveBeenCalledWith('/dashboard');
  });
});
