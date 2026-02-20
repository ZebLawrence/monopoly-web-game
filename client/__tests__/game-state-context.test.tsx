import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameStateProvider, useGameState } from '../src/hooks/useGameState';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const onHandlers = new Map<string, (...args: unknown[]) => void>();
  const mockSocket = {
    id: 'test-socket-id',
    connected: true,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      onHandlers.set(event, handler);
      if (event === 'connect') handler();
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  };
  return {
    io: vi.fn(() => mockSocket),
    __mockSocket: mockSocket,
    __onHandlers: onHandlers,
  };
});

function TestConsumer() {
  const { connected, playerId, gameState, room, turnTimer, lastError } = useGameState();
  return (
    <div>
      <span data-testid="connected">{String(connected)}</span>
      <span data-testid="playerId">{playerId ?? 'null'}</span>
      <span data-testid="hasGameState">{String(!!gameState)}</span>
      <span data-testid="hasRoom">{String(!!room)}</span>
      <span data-testid="hasTurnTimer">{String(!!turnTimer)}</span>
      <span data-testid="lastError">{lastError ?? 'none'}</span>
    </div>
  );
}

describe('GameStateProvider + useGameState', () => {
  it('should render without crashing', () => {
    render(
      <GameStateProvider>
        <TestConsumer />
      </GameStateProvider>,
    );
    expect(screen.getByTestId('connected')).toBeInTheDocument();
  });

  it('should provide initial state', () => {
    render(
      <GameStateProvider>
        <TestConsumer />
      </GameStateProvider>,
    );
    expect(screen.getByTestId('hasGameState').textContent).toBe('false');
    expect(screen.getByTestId('hasRoom').textContent).toBe('false');
    expect(screen.getByTestId('hasTurnTimer').textContent).toBe('false');
    expect(screen.getByTestId('lastError').textContent).toBe('none');
  });

  it('should throw when used outside provider', () => {
    // Suppress error output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useGameState must be used within a GameStateProvider',
    );
    spy.mockRestore();
  });
});
