'use client';

import React, { useCallback, useMemo, useState } from 'react';
import type { GameState, Space, GameAction } from '@monopoly/shared';
import { TurnState } from '@monopoly/shared';
import { DiceDisplay } from './DiceDisplay';
import { BuyPropertyModal } from './BuyPropertyModal';
import { SpaceNotification } from './SpaceNotification';
import { TurnStateLabel } from './TurnStateLabel';
import { YourTurnBanner } from './YourTurnBanner';
import { ActivityFeed } from './ActivityFeed';
import { CardDrawModal } from '../cards/CardDrawModal';
import { JailStatusIndicator } from '../jail/JailStatusIndicator';
import { JailOptionsPanel } from '../jail/JailOptionsPanel';
import styles from './GameplayController.module.css';

export interface GameplayControllerProps {
  gameState: GameState;
  localPlayerId: string | null;
  emitAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
}

export function GameplayController({
  gameState,
  localPlayerId,
  emitAction,
}: GameplayControllerProps) {
  const [cardDismissed, setCardDismissed] = useState(false);
  const [buyDismissed, setBuyDismissed] = useState(false);

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const isMyTurn = activePlayer?.id === localPlayerId;
  const isInJail = activePlayer?.jailStatus?.inJail ?? false;

  // Reset card/buy dismissal when context changes
  const cardKey = gameState.lastCardDrawn?.id ?? null;
  const buyKey = gameState.pendingBuyDecision?.spaceId ?? null;

  // Reset dismissals when context changes
  useMemo(() => {
    setCardDismissed(false);
  }, [cardKey]);
  useMemo(() => {
    setBuyDismissed(false);
  }, [buyKey]);

  // Find the space for buy decision
  const buySpace = useMemo((): Space | undefined => {
    if (!gameState.pendingBuyDecision) return undefined;
    return gameState.board.find((s) => s.id === gameState.pendingBuyDecision!.spaceId);
  }, [gameState.pendingBuyDecision, gameState.board]);

  // Action handlers
  const handleRollDice = useCallback(() => {
    emitAction({ type: 'RollDice' });
  }, [emitAction]);

  const handleEndTurn = useCallback(() => {
    emitAction({ type: 'EndTurn' });
  }, [emitAction]);

  const handleBuyProperty = useCallback(() => {
    if (!gameState.pendingBuyDecision) return;
    emitAction({ type: 'BuyProperty', propertyId: gameState.pendingBuyDecision.spaceId });
    setBuyDismissed(true);
  }, [emitAction, gameState.pendingBuyDecision]);

  const handleAuction = useCallback(() => {
    if (!gameState.pendingBuyDecision) return;
    emitAction({ type: 'DeclineProperty', propertyId: gameState.pendingBuyDecision.spaceId });
    setBuyDismissed(true);
  }, [emitAction, gameState.pendingBuyDecision]);

  const handlePayJailFine = useCallback(() => {
    emitAction({ type: 'PayJailFine' });
  }, [emitAction]);

  const handleUseJailCard = useCallback(() => {
    emitAction({ type: 'UseJailCard' });
  }, [emitAction]);

  const handleRollForDoubles = useCallback(() => {
    emitAction({ type: 'RollForDoubles' });
  }, [emitAction]);

  const handleCardDismiss = useCallback(() => {
    setCardDismissed(true);
  }, []);

  // Determine what to show
  const showBuyModal =
    isMyTurn &&
    !buyDismissed &&
    gameState.pendingBuyDecision &&
    gameState.turnState === TurnState.AwaitingBuyDecision;

  const showCardModal =
    !cardDismissed && gameState.lastCardDrawn && gameState.lastResolution?.type === 'drawCard';

  const showJailOptions = isMyTurn && isInJail && gameState.turnState === TurnState.WaitingForRoll;

  const showDice = gameState.lastDiceResult != null;

  return (
    <div className={styles.container} data-testid="gameplay-controller">
      {/* Your Turn Banner */}
      <YourTurnBanner isYourTurn={isMyTurn} playerName={localPlayer?.name ?? ''} />

      {/* Space landing notifications (toasts) */}
      <SpaceNotification
        resolution={gameState.lastResolution}
        localPlayerName={localPlayer?.name ?? ''}
      />

      {/* Turn State Label */}
      <div className={styles.stateRow}>
        <TurnStateLabel
          turnState={gameState.turnState}
          isCurrentPlayersTurn={isMyTurn}
          isInJail={isInJail}
        />
        {/* Active player indicator */}
        <div
          className={`${styles.activePlayerBadge} ${isMyTurn ? styles.activePlayerBadgeYou : ''}`}
          data-testid="active-player-badge"
        >
          {activePlayer?.name}
          {isMyTurn && ' (You)'}
        </div>
      </div>

      {/* Jail status */}
      {localPlayer && <JailStatusIndicator player={localPlayer} />}

      {/* Jail options */}
      {showJailOptions && localPlayer && (
        <JailOptionsPanel
          player={localPlayer}
          onPayFine={handlePayJailFine}
          onUseCard={handleUseJailCard}
          onRollForDoubles={handleRollForDoubles}
        />
      )}

      {/* Dice display */}
      {showDice && (
        <DiceDisplay
          die1={gameState.lastDiceResult!.die1}
          die2={gameState.lastDiceResult!.die2}
          isDoubles={gameState.lastDiceResult!.isDoubles}
        />
      )}

      {/* Action buttons row */}
      <div className={styles.actionRow} data-testid="gameplay-actions">
        {isMyTurn && gameState.turnState === TurnState.WaitingForRoll && !isInJail && (
          <button
            className={styles.rollButton}
            onClick={handleRollDice}
            data-testid="roll-dice-button"
          >
            Roll Dice
          </button>
        )}
        {isMyTurn && gameState.turnState === TurnState.PlayerAction && (
          <button
            className={styles.endTurnButton}
            onClick={handleEndTurn}
            data-testid="end-turn-button"
          >
            End Turn
          </button>
        )}
      </div>

      {/* Activity Feed */}
      <ActivityFeed events={gameState.events} players={gameState.players} />

      {/* Buy Property Modal */}
      {showBuyModal && localPlayer && (
        <BuyPropertyModal
          decision={gameState.pendingBuyDecision!}
          space={buySpace}
          playerCash={localPlayer.cash}
          onBuy={handleBuyProperty}
          onAuction={handleAuction}
        />
      )}

      {/* Card Draw Modal */}
      {showCardModal && (
        <CardDrawModal card={gameState.lastCardDrawn!} onDismiss={handleCardDismiss} />
      )}
    </div>
  );
}
