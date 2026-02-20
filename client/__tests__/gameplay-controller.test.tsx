import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnState } from '@monopoly/shared';
import type { GameState } from '@monopoly/shared';
import { GameplayController } from '../src/components/gameplay/GameplayController';
import { ToastProvider } from '../src/components/ui/Toast';
import { mockGameState, mockPlayers } from '../src/mocks/gameData';

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...mockGameState,
    ...overrides,
  };
}

describe('GameplayController', () => {
  const emitAction = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    emitAction.mockClear();
  });

  it('renders the controller', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState()}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.getByTestId('gameplay-controller')).toBeInTheDocument();
  });

  it('shows active player badge', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState()}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.getByTestId('active-player-badge')).toHaveTextContent('Alice (You)');
  });

  it('shows turn state label', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState()}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.getByTestId('turn-state-label')).toBeInTheDocument();
  });

  it('shows Roll Dice button when WaitingForRoll and is your turn', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState({ turnState: TurnState.WaitingForRoll })}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.getByTestId('roll-dice-button')).toBeInTheDocument();
  });

  it('clicking Roll Dice emits RollDice action', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState({ turnState: TurnState.WaitingForRoll })}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    fireEvent.click(screen.getByTestId('roll-dice-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'RollDice' });
  });

  it('hides Roll Dice button when not your turn', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState({ turnState: TurnState.WaitingForRoll })}
        localPlayerId="player-2"
        emitAction={emitAction}
      />,
    );
    expect(screen.queryByTestId('roll-dice-button')).not.toBeInTheDocument();
  });

  it('hides Roll Dice button after rolling (PlayerAction state)', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState({ turnState: TurnState.PlayerAction })}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.queryByTestId('roll-dice-button')).not.toBeInTheDocument();
  });

  it('shows End Turn button in PlayerAction state', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState({ turnState: TurnState.PlayerAction })}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.getByTestId('end-turn-button')).toBeInTheDocument();
  });

  it('clicking End Turn emits EndTurn action', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState({ turnState: TurnState.PlayerAction })}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    fireEvent.click(screen.getByTestId('end-turn-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'EndTurn' });
  });

  it('shows dice display when lastDiceResult is set', () => {
    const state = makeState({
      lastDiceResult: { die1: 3, die2: 4, total: 7, isDoubles: false },
      turnState: TurnState.PlayerAction,
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    expect(screen.getByTestId('dice-display')).toBeInTheDocument();
  });

  it('does not show dice display when no dice result', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState()}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.queryByTestId('dice-display')).not.toBeInTheDocument();
  });

  it('shows buy property modal when awaiting buy decision', () => {
    const state = makeState({
      turnState: TurnState.AwaitingBuyDecision,
      pendingBuyDecision: {
        spaceId: 1,
        spaceName: 'Mediterranean Avenue',
        cost: 60,
      },
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    expect(screen.getByTestId('buy-property-modal')).toBeInTheDocument();
  });

  it('clicking Buy in modal emits BuyProperty action', () => {
    const state = makeState({
      turnState: TurnState.AwaitingBuyDecision,
      pendingBuyDecision: {
        spaceId: 1,
        spaceName: 'Mediterranean Avenue',
        cost: 60,
      },
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    fireEvent.click(screen.getByTestId('buy-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'BuyProperty', propertyId: 1 });
  });

  it('clicking Auction in modal emits DeclineProperty action', () => {
    const state = makeState({
      turnState: TurnState.AwaitingBuyDecision,
      pendingBuyDecision: {
        spaceId: 1,
        spaceName: 'Mediterranean Avenue',
        cost: 60,
      },
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    fireEvent.click(screen.getByTestId('auction-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'DeclineProperty', propertyId: 1 });
  });

  it('does not show buy modal when not your turn', () => {
    const state = makeState({
      turnState: TurnState.AwaitingBuyDecision,
      pendingBuyDecision: {
        spaceId: 1,
        spaceName: 'Mediterranean Avenue',
        cost: 60,
      },
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-2" emitAction={emitAction} />,
    );
    expect(screen.queryByTestId('buy-property-modal')).not.toBeInTheDocument();
  });

  it('shows jail status for jailed player', () => {
    const jailedPlayers = [...mockPlayers];
    jailedPlayers[0] = {
      ...jailedPlayers[0],
      jailStatus: { inJail: true, turnsInJail: 1 },
      position: 10,
    };
    const state = makeState({
      players: jailedPlayers,
      turnState: TurnState.WaitingForRoll,
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    expect(screen.getByTestId('jail-status')).toBeInTheDocument();
  });

  it('shows jail options when jailed player turn and WaitingForRoll', () => {
    const jailedPlayers = [...mockPlayers];
    jailedPlayers[0] = {
      ...jailedPlayers[0],
      jailStatus: { inJail: true, turnsInJail: 0 },
      position: 10,
    };
    const state = makeState({
      players: jailedPlayers,
      turnState: TurnState.WaitingForRoll,
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    expect(screen.getByTestId('jail-options')).toBeInTheDocument();
  });

  it('clicking Pay Fine emits PayJailFine action', () => {
    const jailedPlayers = [...mockPlayers];
    jailedPlayers[0] = {
      ...jailedPlayers[0],
      jailStatus: { inJail: true, turnsInJail: 0 },
      position: 10,
    };
    const state = makeState({
      players: jailedPlayers,
      turnState: TurnState.WaitingForRoll,
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    fireEvent.click(screen.getByTestId('pay-fine-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'PayJailFine' });
  });

  it('clicking Use Card emits UseJailCard action', () => {
    const jailedPlayers = [...mockPlayers];
    jailedPlayers[0] = {
      ...jailedPlayers[0],
      jailStatus: { inJail: true, turnsInJail: 0 },
      position: 10,
    };
    const state = makeState({
      players: jailedPlayers,
      turnState: TurnState.WaitingForRoll,
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    fireEvent.click(screen.getByTestId('use-card-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'UseJailCard' });
  });

  it('clicking Roll for Doubles emits RollForDoubles action', () => {
    const jailedPlayers = [...mockPlayers];
    jailedPlayers[0] = {
      ...jailedPlayers[0],
      jailStatus: { inJail: true, turnsInJail: 0 },
      position: 10,
    };
    const state = makeState({
      players: jailedPlayers,
      turnState: TurnState.WaitingForRoll,
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    fireEvent.click(screen.getByTestId('roll-doubles-button'));
    expect(emitAction).toHaveBeenCalledWith({ type: 'RollForDoubles' });
  });

  it('shows activity feed', () => {
    renderWithProviders(
      <GameplayController
        gameState={makeState()}
        localPlayerId="player-1"
        emitAction={emitAction}
      />,
    );
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('shows card draw modal when card drawn', () => {
    const state = makeState({
      turnState: TurnState.PlayerAction,
      lastCardDrawn: {
        id: 'chance-1',
        deck: 'chance',
        text: 'Bank pays you $200',
        effect: { type: 'cash', amount: 200 },
      },
      lastResolution: {
        type: 'drawCard',
        spaceName: 'Chance',
        deckName: 'chance',
      },
    });
    renderWithProviders(
      <GameplayController gameState={state} localPlayerId="player-1" emitAction={emitAction} />,
    );
    expect(screen.getByTestId('card-draw-modal')).toBeInTheDocument();
  });
});
