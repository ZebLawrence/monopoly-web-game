import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DiceDisplay } from '../src/components/gameplay/DiceDisplay';

describe('DiceDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when dice values are null', () => {
    const { container } = render(<DiceDisplay die1={null} die2={null} isDoubles={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders dice display with values', () => {
    render(<DiceDisplay die1={3} die2={4} isDoubles={false} />);
    expect(screen.getByTestId('dice-display')).toBeInTheDocument();
  });

  it('shows total after animation completes', () => {
    render(<DiceDisplay die1={3} die2={4} isDoubles={false} />);
    // Advance past animation (600ms)
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('dice-total')).toHaveTextContent('7');
  });

  it('shows doubles badge when doubles rolled', () => {
    render(<DiceDisplay die1={5} die2={5} isDoubles={true} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('doubles-badge')).toHaveTextContent('Doubles!');
  });

  it('does not show doubles badge when not doubles', () => {
    render(<DiceDisplay die1={3} die2={4} isDoubles={false} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByTestId('doubles-badge')).not.toBeInTheDocument();
  });

  it('calls onAnimationComplete after animation', () => {
    const onComplete = vi.fn();
    render(<DiceDisplay die1={2} die2={3} isDoubles={false} onAnimationComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('renders die faces', () => {
    render(<DiceDisplay die1={6} die2={1} isDoubles={false} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('die-face-6')).toBeInTheDocument();
    expect(screen.getByTestId('die-face-1')).toBeInTheDocument();
  });
});
