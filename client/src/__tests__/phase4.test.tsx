import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BankruptcyModal } from '../components/bankruptcy/BankruptcyModal';
import { VictoryScreen } from '../components/endgame/VictoryScreen';
import { ChatPanel } from '../components/chat/ChatPanel';
import { ActivityFeed, formatEventMessage } from '../components/gameplay/ActivityFeed';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ConnectionError } from '../components/connection/ConnectionError';
import type { GameState, Player, ChatMessage, GameEvent } from '@monopoly/shared';
import { GameEventType, TokenType, TurnState, SpaceType } from '@monopoly/shared';

// Mock getPropertyState for bankruptcy tests
vi.mock('@monopoly/shared', async () => {
  const actual = await vi.importActual('@monopoly/shared');
  return {
    ...actual,
    getPropertyState: vi.fn().mockReturnValue({ houses: 0, mortgaged: false }),
    calculateLiquidationValue: vi.fn().mockReturnValue(0),
  };
});

function createMockGameState(overrides?: Partial<GameState>): GameState {
  const players: Player[] = [
    {
      id: 'p1',
      name: 'Alice',
      token: TokenType.TopHat,
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
      token: TokenType.RaceCar,
      cash: 800,
      position: 5,
      properties: [],
      jailStatus: { inJail: false },
      isActive: true,
      isBankrupt: false,
      getOutOfJailFreeCards: 0,
    },
  ];

  return {
    gameId: 'test-game',
    status: 'playing',
    players,
    currentPlayerIndex: 0,
    board: [
      { id: 0, name: 'Go', type: SpaceType.Corner, position: 0 },
      {
        id: 1,
        name: 'Mediterranean Avenue',
        type: SpaceType.Property,
        position: 1,
        colorGroup: 'brown',
        cost: 60,
        mortgageValue: 30,
        houseCost: 50,
      },
    ],
    decks: { chance: [], communityChest: [] },
    turnState: TurnState.WaitingForRoll,
    settings: {
      maxPlayers: 4,
      startingCash: 1500,
      turnTimeLimit: 60,
      freeParking: 'classic',
      auctionEnabled: true,
    },
    events: [],
    ...overrides,
  };
}

describe('Phase 4.1 — Bankruptcy Modal', () => {
  it('renders debt detection UI with amount and cash', () => {
    const gameState = createMockGameState();
    const emitAction = vi.fn().mockResolvedValue({ ok: true });

    render(
      <BankruptcyModal
        gameState={gameState}
        player={gameState.players[0]}
        debtAmount={200}
        creditorId="p2"
        emitAction={emitAction}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('bankruptcy-modal')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument(); // Debt amount
    expect(screen.getByText('$1,500')).toBeInTheDocument(); // Cash
  });

  it('shows "Continue Playing" when can cover debt', () => {
    const gameState = createMockGameState();
    const emitAction = vi.fn().mockResolvedValue({ ok: true });

    render(
      <BankruptcyModal
        gameState={gameState}
        player={gameState.players[0]}
        debtAmount={100}
        creditorId="bank"
        emitAction={emitAction}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('close-bankruptcy')).toHaveTextContent('Continue Playing');
  });

  it('shows "Declare Bankruptcy" when cannot cover debt', () => {
    const gameState = createMockGameState();
    gameState.players[0].cash = 0;
    const emitAction = vi.fn().mockResolvedValue({ ok: true });

    render(
      <BankruptcyModal
        gameState={gameState}
        player={gameState.players[0]}
        debtAmount={200}
        creditorId="bank"
        emitAction={emitAction}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('declare-bankruptcy-button')).toBeInTheDocument();
  });

  it('shows confirmation dialog on bankruptcy click', () => {
    const gameState = createMockGameState();
    gameState.players[0].cash = 0;
    const emitAction = vi.fn().mockResolvedValue({ ok: true });

    render(
      <BankruptcyModal
        gameState={gameState}
        player={gameState.players[0]}
        debtAmount={200}
        creditorId="bank"
        emitAction={emitAction}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('declare-bankruptcy-button'));
    expect(screen.getByText('Declare Bankruptcy?')).toBeInTheDocument();
    expect(screen.getByText(/This is irreversible/)).toBeInTheDocument();
  });

  it('emits DeclareBankruptcy action on confirm', () => {
    const gameState = createMockGameState();
    gameState.players[0].cash = 0;
    const emitAction = vi.fn().mockResolvedValue({ ok: true });
    const onClose = vi.fn();

    render(
      <BankruptcyModal
        gameState={gameState}
        player={gameState.players[0]}
        debtAmount={200}
        creditorId="bank"
        emitAction={emitAction}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId('declare-bankruptcy-button'));
    fireEvent.click(screen.getByTestId('confirm-bankruptcy'));

    expect(emitAction).toHaveBeenCalledWith({
      type: 'DeclareBankruptcy',
      creditorId: 'bank',
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Phase 4.2 — Victory Screen', () => {
  it('renders winner name, token, and banner', () => {
    const gameState = createMockGameState({ status: 'finished' });
    gameState.players[1].isBankrupt = true;
    gameState.players[1].isActive = false;

    render(
      <VictoryScreen gameState={gameState} winnerId="p1" onPlayAgain={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByTestId('victory-screen')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Winner!')).toBeInTheDocument();
  });

  it('renders standings table', () => {
    const gameState = createMockGameState({ status: 'finished' });
    gameState.players[1].isBankrupt = true;

    render(
      <VictoryScreen gameState={gameState} winnerId="p1" onPlayAgain={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByTestId('standings-table')).toBeInTheDocument();
  });

  it('renders net worth breakdown', () => {
    const gameState = createMockGameState({ status: 'finished' });

    render(
      <VictoryScreen gameState={gameState} winnerId="p1" onPlayAgain={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByTestId('net-worth-breakdown')).toBeInTheDocument();
  });

  it('renders game statistics', () => {
    const gameState = createMockGameState({ status: 'finished' });

    render(
      <VictoryScreen gameState={gameState} winnerId="p1" onPlayAgain={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByTestId('game-stats')).toBeInTheDocument();
  });

  it('Play Again button calls callback', () => {
    const gameState = createMockGameState({ status: 'finished' });
    const onPlayAgain = vi.fn();

    render(
      <VictoryScreen
        gameState={gameState}
        winnerId="p1"
        onPlayAgain={onPlayAgain}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('play-again-button'));
    expect(onPlayAgain).toHaveBeenCalled();
  });

  it('Leave button calls callback', () => {
    const gameState = createMockGameState({ status: 'finished' });
    const onLeave = vi.fn();

    render(
      <VictoryScreen gameState={gameState} winnerId="p1" onPlayAgain={vi.fn()} onLeave={onLeave} />,
    );

    fireEvent.click(screen.getByTestId('leave-button'));
    expect(onLeave).toHaveBeenCalled();
  });
});

describe('Phase 4.4 — Activity Feed', () => {
  it('renders event messages with icons', () => {
    const events: GameEvent[] = [
      {
        id: 'evt-1',
        gameId: 'test',
        type: GameEventType.DiceRolled,
        payload: { playerId: 'p1', die1: 3, die2: 4, total: 7, isDoubles: false },
        timestamp: Date.now(),
      },
    ];
    const players: Player[] = [
      {
        id: 'p1',
        name: 'Alice',
        token: TokenType.TopHat,
        cash: 1500,
        position: 0,
        properties: [],
        jailStatus: { inJail: false },
        isActive: true,
        isBankrupt: false,
        getOutOfJailFreeCards: 0,
      },
    ];

    render(<ActivityFeed events={events} players={players} />);

    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    expect(screen.getByTestId('activity-feed-event')).toBeInTheDocument();
    expect(screen.getByText(/Alice rolled 7/)).toBeInTheDocument();
  });

  it('formatEventMessage converts PropertyPurchased correctly', () => {
    const event: GameEvent = {
      id: 'evt-1',
      gameId: 'test',
      type: GameEventType.PropertyPurchased,
      payload: { playerId: 'p1', price: 60 },
      timestamp: Date.now(),
    };
    const players: Player[] = [
      {
        id: 'p1',
        name: 'Alice',
        token: TokenType.TopHat,
        cash: 1500,
        position: 0,
        properties: [],
        jailStatus: { inJail: false },
        isActive: true,
        isBankrupt: false,
        getOutOfJailFreeCards: 0,
      },
    ];

    const result = formatEventMessage(event, players);
    expect(result).toBe('Alice bought a property for $60');
  });

  it('has ARIA live region for screen readers', () => {
    render(<ActivityFeed events={[]} players={[]} />);
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
  });
});

describe('Phase 4.5 — Chat Panel', () => {
  it('renders chat panel with input and send button', () => {
    render(<ChatPanel messages={[]} localPlayerId="p1" onSendMessage={vi.fn()} />);

    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('chat-send')).toBeInTheDocument();
  });

  it('displays chat messages with colored names and timestamps', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'Hello!',
        timestamp: Date.now(),
        isSpectator: false,
      },
    ];

    render(<ChatPanel messages={messages} localPlayerId="p1" onSendMessage={vi.fn()} />);

    expect(screen.getByTestId('chat-message')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('shows spectator badge for spectator messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'From spectator',
        timestamp: Date.now(),
        isSpectator: true,
      },
    ];

    render(<ChatPanel messages={messages} localPlayerId="p2" onSendMessage={vi.fn()} />);

    expect(screen.getByText('Spectator')).toBeInTheDocument();
  });

  it('calls onSendMessage when send button clicked', () => {
    const onSendMessage = vi.fn();

    render(<ChatPanel messages={[]} localPlayerId="p1" onSendMessage={onSendMessage} />);

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByTestId('chat-send'));

    expect(onSendMessage).toHaveBeenCalledWith('test message');
  });

  it('calls onSendMessage on Enter key', () => {
    const onSendMessage = vi.fn();

    render(<ChatPanel messages={[]} localPlayerId="p1" onSendMessage={onSendMessage} />);

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSendMessage).toHaveBeenCalledWith('test');
  });

  it('disables send when input is empty', () => {
    render(<ChatPanel messages={[]} localPlayerId="p1" onSendMessage={vi.fn()} />);

    expect(screen.getByTestId('chat-send')).toBeDisabled();
  });
});

describe('Phase 4.6 — Error Boundary', () => {
  it('renders children normally', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows fallback UI when child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

describe('Phase 4.6 — Loading Skeleton', () => {
  it('renders skeleton placeholder', () => {
    render(<LoadingSkeleton />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });
});

describe('Phase 4.6 — Connection Error', () => {
  it('renders connection error with retry', () => {
    const onRetry = vi.fn();
    render(<ConnectionError onRetry={onRetry} />);

    expect(screen.getByTestId('connection-error')).toBeInTheDocument();
    expect(screen.getByText('Unable to Connect')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<ConnectionError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-connection'));
    expect(onRetry).toHaveBeenCalled();
  });
});
