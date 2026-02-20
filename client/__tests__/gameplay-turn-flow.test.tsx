import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TurnState, GameEventType, TokenType } from '@monopoly/shared';
import type { GameEvent, Player } from '@monopoly/shared';
import { TurnStateLabel } from '../src/components/gameplay/TurnStateLabel';
import { YourTurnBanner } from '../src/components/gameplay/YourTurnBanner';
import { ActivityFeed } from '../src/components/gameplay/ActivityFeed';

describe('TurnStateLabel', () => {
  it('shows "Roll Dice" in WaitingForRoll state', () => {
    render(
      <TurnStateLabel
        turnState={TurnState.WaitingForRoll}
        isCurrentPlayersTurn={true}
        isInJail={false}
      />,
    );
    expect(screen.getByTestId('turn-state-label')).toHaveTextContent('Roll Dice');
  });

  it('shows "Buy or Auction" in AwaitingBuyDecision state', () => {
    render(
      <TurnStateLabel
        turnState={TurnState.AwaitingBuyDecision}
        isCurrentPlayersTurn={true}
        isInJail={false}
      />,
    );
    expect(screen.getByTestId('turn-state-label')).toHaveTextContent('Buy or Auction');
  });

  it('shows "Your Action" in PlayerAction state', () => {
    render(
      <TurnStateLabel
        turnState={TurnState.PlayerAction}
        isCurrentPlayersTurn={true}
        isInJail={false}
      />,
    );
    expect(screen.getByTestId('turn-state-label')).toHaveTextContent('Your Action');
  });

  it('shows "Waiting..." when not current player', () => {
    render(
      <TurnStateLabel
        turnState={TurnState.WaitingForRoll}
        isCurrentPlayersTurn={false}
        isInJail={false}
      />,
    );
    expect(screen.getByTestId('turn-state-label')).toHaveTextContent('Waiting...');
  });

  it('shows "Jail Options" when in jail and WaitingForRoll', () => {
    render(
      <TurnStateLabel
        turnState={TurnState.WaitingForRoll}
        isCurrentPlayersTurn={true}
        isInJail={true}
      />,
    );
    expect(screen.getByTestId('turn-state-label')).toHaveTextContent('Jail Options');
  });

  it('shows "Rolling..." during Rolling state', () => {
    render(
      <TurnStateLabel turnState={TurnState.Rolling} isCurrentPlayersTurn={true} isInJail={false} />,
    );
    expect(screen.getByTestId('turn-state-label')).toHaveTextContent('Rolling...');
  });
});

describe('YourTurnBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show initially when it is your turn', () => {
    render(<YourTurnBanner isYourTurn={true} playerName="Alice" />);
    // The banner doesn't show on initial render (only on transition)
    expect(screen.queryByTestId('your-turn-banner')).not.toBeInTheDocument();
  });

  it('shows banner when transitioning TO your turn', () => {
    const { rerender } = render(<YourTurnBanner isYourTurn={false} playerName="Alice" />);
    rerender(<YourTurnBanner isYourTurn={true} playerName="Alice" />);
    expect(screen.getByTestId('your-turn-banner')).toBeInTheDocument();
    expect(screen.getByText('Your Turn, Alice!')).toBeInTheDocument();
  });

  it('banner disappears after timeout', () => {
    const { rerender } = render(<YourTurnBanner isYourTurn={false} playerName="Alice" />);
    rerender(<YourTurnBanner isYourTurn={true} playerName="Alice" />);
    expect(screen.getByTestId('your-turn-banner')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId('your-turn-banner')).not.toBeInTheDocument();
  });
});

describe('ActivityFeed', () => {
  const players: Player[] = [
    {
      id: 'p1',
      name: 'Alice',
      token: TokenType.ScottieDog,
      cash: 1500,
      position: 0,
      properties: [],
      jailStatus: { inJail: false },
      isActive: true,
      isBankrupt: false,
      getOutOfJailFreeCards: 0,
    },
    {
      id: 'p2',
      name: 'Bob',
      token: TokenType.TopHat,
      cash: 1200,
      position: 5,
      properties: [],
      jailStatus: { inJail: false },
      isActive: true,
      isBankrupt: false,
      getOutOfJailFreeCards: 0,
    },
  ];

  const events: GameEvent[] = [
    {
      id: 'evt-1',
      gameId: 'game-1',
      type: GameEventType.DiceRolled,
      payload: { playerId: 'p1', die1: 3, die2: 4, total: 7, isDoubles: false },
      timestamp: Date.now() - 5000,
    },
    {
      id: 'evt-2',
      gameId: 'game-1',
      type: GameEventType.PropertyPurchased,
      payload: { playerId: 'p1', propertyId: 1, price: 60 },
      timestamp: Date.now() - 3000,
    },
    {
      id: 'evt-3',
      gameId: 'game-1',
      type: GameEventType.RentPaid,
      payload: { payerId: 'p2', receiverId: 'p1', amount: 50, propertyId: 5 },
      timestamp: Date.now() - 1000,
    },
  ];

  it('renders the activity feed', () => {
    render(<ActivityFeed events={events} players={players} />);
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('shows events in order', () => {
    render(<ActivityFeed events={events} players={players} />);
    const eventElements = screen.getAllByTestId('activity-feed-event');
    expect(eventElements).toHaveLength(3);
  });

  it('shows dice roll event with details', () => {
    render(<ActivityFeed events={events} players={players} />);
    expect(screen.getByText(/Alice rolled 7 \(3\+4\)/)).toBeInTheDocument();
  });

  it('shows property purchase event', () => {
    render(<ActivityFeed events={events} players={players} />);
    expect(screen.getByText(/Alice bought a property for \$60/)).toBeInTheDocument();
  });

  it('shows rent payment event', () => {
    render(<ActivityFeed events={events} players={players} />);
    expect(screen.getByText(/Bob paid \$50 rent to Alice/)).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<ActivityFeed events={[]} players={players} />);
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('shows doubles indicator in dice event', () => {
    const doublesEvent: GameEvent = {
      id: 'evt-d',
      gameId: 'game-1',
      type: GameEventType.DiceRolled,
      payload: { playerId: 'p1', die1: 3, die2: 3, total: 6, isDoubles: true },
      timestamp: Date.now(),
    };
    render(<ActivityFeed events={[doublesEvent]} players={players} />);
    expect(screen.getByText(/Alice rolled 6 \(3\+3\) - Doubles!/)).toBeInTheDocument();
  });

  it('handles game started event', () => {
    const startEvent: GameEvent = {
      id: 'evt-s',
      gameId: 'game-1',
      type: GameEventType.GameStarted,
      payload: {},
      timestamp: Date.now(),
    };
    render(<ActivityFeed events={[startEvent]} players={players} />);
    expect(screen.getByText('Game started!')).toBeInTheDocument();
  });

  it('handles player jailed event', () => {
    const jailEvent: GameEvent = {
      id: 'evt-j',
      gameId: 'game-1',
      type: GameEventType.PlayerJailed,
      payload: { playerId: 'p1' },
      timestamp: Date.now(),
    };
    render(<ActivityFeed events={[jailEvent]} players={players} />);
    expect(screen.getByText(/Alice went to Jail!/)).toBeInTheDocument();
  });

  it('handles pass Go event', () => {
    const goEvent: GameEvent = {
      id: 'evt-g',
      gameId: 'game-1',
      type: GameEventType.PassedGo,
      payload: { playerId: 'p1' },
      timestamp: Date.now(),
    };
    render(<ActivityFeed events={[goEvent]} players={players} />);
    expect(screen.getByText(/Alice passed Go and collected \$200/)).toBeInTheDocument();
  });
});
