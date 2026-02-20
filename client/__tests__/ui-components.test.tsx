import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Modal } from '../src/components/ui/Modal';
import { ToastProvider, useToast } from '../src/components/ui/Toast';
import { PropertyCard, RailroadCard, UtilityCard } from '../src/components/ui/PropertyCard';
import { CashDisplay } from '../src/components/ui/CashDisplay';
import { TokenSelector } from '../src/components/ui/TokenSelector';
import { TokenType } from '@monopoly/shared';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('renders primary variant by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByText('Primary');
    expect(btn).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('renders all variants', () => {
    const { rerender } = render(<Button variant="primary">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
    rerender(<Button variant="secondary">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
    rerender(<Button variant="danger">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
    rerender(<Button variant="ghost">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
  });

  it('renders all sizes', () => {
    const { rerender } = render(<Button size="sm">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
    rerender(<Button size="md">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
    rerender(<Button size="lg">Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal Content</p>
      </Modal>,
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal Content</p>
      </Modal>,
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        Content
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        Content
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Toast', () => {
  function TestToastTrigger() {
    const { showToast } = useToast();
    return <button onClick={() => showToast('Test notification', 'success')}>Show Toast</button>;
  }

  it('shows toast when triggered', () => {
    render(
      <ToastProvider>
        <TestToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('auto-dismisses toast', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test notification')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.queryByText('Test notification')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('PropertyCard', () => {
  it('renders property details', () => {
    render(
      <PropertyCard
        name="Mediterranean Avenue"
        colorGroup="brown"
        cost={60}
        rentTiers={[2, 10, 30, 90, 160, 250]}
        mortgageValue={30}
        houseCost={50}
        hotelCost={50}
      />,
    );
    expect(screen.getByText('Mediterranean Avenue')).toBeInTheDocument();
    expect(screen.getByText('$2')).toBeInTheDocument();
    expect(screen.getByText('$250')).toBeInTheDocument();
    expect(screen.getByText(/Mortgage Value: \$30/)).toBeInTheDocument();
    expect(screen.getByTestId('color-band')).toBeInTheDocument();
  });

  it('shows all 6 rent tiers', () => {
    render(
      <PropertyCard
        name="Baltic Avenue"
        colorGroup="brown"
        cost={60}
        rentTiers={[4, 20, 60, 180, 320, 450]}
        mortgageValue={30}
        houseCost={50}
      />,
    );
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('With 1 House')).toBeInTheDocument();
    expect(screen.getByText('With Hotel')).toBeInTheDocument();
  });
});

describe('RailroadCard', () => {
  it('renders railroad details', () => {
    render(<RailroadCard name="Reading Railroad" cost={200} mortgageValue={100} />);
    expect(screen.getByText('Reading Railroad')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText(/Mortgage Value: \$100/)).toBeInTheDocument();
    expect(screen.queryByText('With 1 House')).not.toBeInTheDocument();
  });
});

describe('UtilityCard', () => {
  it('renders utility details', () => {
    render(<UtilityCard name="Electric Company" cost={150} mortgageValue={75} />);
    expect(screen.getByText('Electric Company')).toBeInTheDocument();
    expect(screen.getByText(/4 times/)).toBeInTheDocument();
    expect(screen.getByText(/10 times/)).toBeInTheDocument();
    expect(screen.getByText(/Mortgage Value: \$75/)).toBeInTheDocument();
  });
});

describe('CashDisplay', () => {
  it('displays formatted dollar amount', () => {
    render(<CashDisplay amount={1500} />);
    expect(screen.getByTestId('cash-display')).toHaveTextContent('$1,500');
  });

  it('formats large amounts with commas', () => {
    render(<CashDisplay amount={10000} />);
    expect(screen.getByTestId('cash-display')).toHaveTextContent('$10,000');
  });
});

describe('TokenSelector', () => {
  it('displays all tokens', () => {
    render(<TokenSelector onSelect={() => {}} />);
    expect(screen.getByTestId('token-selector')).toBeInTheDocument();
    expect(screen.getByLabelText('Dog')).toBeInTheDocument();
    expect(screen.getByLabelText('Top Hat')).toBeInTheDocument();
    expect(screen.getByLabelText('Race Car')).toBeInTheDocument();
  });

  it('fires onSelect when token clicked', () => {
    const onSelect = vi.fn();
    render(<TokenSelector onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText('Dog'));
    expect(onSelect).toHaveBeenCalledWith(TokenType.ScottieDog);
  });

  it('highlights selected token', () => {
    render(<TokenSelector selectedToken={TokenType.TopHat} onSelect={() => {}} />);
    expect(screen.getByLabelText('Top Hat')).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables tokens chosen by other players', () => {
    const onSelect = vi.fn();
    render(
      <TokenSelector disabledTokens={[TokenType.RaceCar, TokenType.Boot]} onSelect={onSelect} />,
    );
    expect(screen.getByLabelText('Race Car')).toBeDisabled();
    expect(screen.getByLabelText('Boot')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Race Car'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
