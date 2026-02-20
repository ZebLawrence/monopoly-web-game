import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CardDrawModal } from '../src/components/cards/CardDrawModal';
import type { Card } from '@monopoly/shared';

describe('CardDrawModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const cashCard: Card = {
    id: 'chance-1',
    deck: 'chance',
    text: 'Bank pays you dividend of $50',
    effect: { type: 'cash', amount: 50 },
  };

  const jailCard: Card = {
    id: 'cc-1',
    deck: 'communityChest',
    text: 'Go directly to Jail. Do not pass Go. Do not collect $200.',
    effect: { type: 'jail' },
  };

  const goojfCard: Card = {
    id: 'chance-goojf',
    deck: 'chance',
    text: 'Get Out of Jail Free',
    effect: { type: 'goojf' },
  };

  const repairsCard: Card = {
    id: 'chance-repairs',
    deck: 'chance',
    text: 'Make general repairs on all your property: pay $25/house, $100/hotel',
    effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
  };

  const ccRepairsCard: Card = {
    id: 'cc-repairs',
    deck: 'communityChest',
    text: 'You are assessed for street repairs: pay $40/house, $115/hotel',
    effect: { type: 'repairs', perHouse: 40, perHotel: 115 },
  };

  const collectCard: Card = {
    id: 'cc-collect',
    deck: 'communityChest',
    text: 'It is your birthday. Collect $10 from every player.',
    effect: { type: 'collectFromAll', amount: 10 },
  };

  const payEachCard: Card = {
    id: 'cc-pay',
    deck: 'communityChest',
    text: 'Pay each player $50.',
    effect: { type: 'payEachPlayer', amount: 50 },
  };

  const railroadCard: Card = {
    id: 'chance-rr',
    deck: 'chance',
    text: 'Advance to nearest Railroad. If owned, pay double rent.',
    effect: { type: 'advanceNearestRailroad' },
  };

  const utilityCard: Card = {
    id: 'chance-util',
    deck: 'chance',
    text: 'Advance to nearest Utility. If owned, pay 10x dice.',
    effect: { type: 'advanceNearestUtility' },
  };

  it('renders card draw modal', () => {
    render(<CardDrawModal card={cashCard} onDismiss={() => {}} />);
    expect(screen.getByTestId('card-draw-modal')).toBeInTheDocument();
  });

  it('shows card text', () => {
    render(<CardDrawModal card={cashCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-text')).toHaveTextContent('Bank pays you dividend of $50');
  });

  it('shows Chance label for chance card', () => {
    render(<CardDrawModal card={cashCard} onDismiss={() => {}} />);
    // "Chance" appears in both modal title and card badge
    const elements = screen.getAllByText('Chance');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Community Chest label for CC card', () => {
    render(<CardDrawModal card={jailCard} onDismiss={() => {}} />);
    // "Community Chest" appears in both modal title and card badge
    const elements = screen.getAllByText('Community Chest');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows OK button after reveal animation', () => {
    render(<CardDrawModal card={cashCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-ok-button')).toBeInTheDocument();
  });

  it('calls onDismiss when OK clicked', () => {
    const onDismiss = vi.fn();
    render(<CardDrawModal card={cashCard} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByTestId('card-ok-button'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows cash effect description for positive amount', () => {
    render(<CardDrawModal card={cashCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Receive $50');
  });

  it('shows jail effect description', () => {
    render(<CardDrawModal card={jailCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Go directly to Jail');
  });

  it('shows GOOJF effect description', () => {
    render(<CardDrawModal card={goojfCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Keep this card until needed');
  });

  it('shows Chance repairs effect with correct rates', () => {
    render(<CardDrawModal card={repairsCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Pay $25/house, $100/hotel');
  });

  it('shows Community Chest repairs effect with different rates', () => {
    render(<CardDrawModal card={ccRepairsCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Pay $40/house, $115/hotel');
  });

  it('shows collect from all description', () => {
    render(<CardDrawModal card={collectCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Collect $10 from each player');
  });

  it('shows pay each player description', () => {
    render(<CardDrawModal card={payEachCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent('Pay $50 to each player');
  });

  it('shows advance nearest railroad description', () => {
    render(<CardDrawModal card={railroadCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent(
      'Advance to nearest Railroad (double rent if owned)',
    );
  });

  it('shows advance nearest utility description', () => {
    render(<CardDrawModal card={utilityCard} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('card-effect')).toHaveTextContent(
      'Advance to nearest Utility (10x dice if owned)',
    );
  });
});
