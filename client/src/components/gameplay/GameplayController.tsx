'use client';

import React, { useCallback, useMemo, useState } from 'react';
import type { GameState, Space, GameAction } from '@monopoly/shared';
import { TurnState, GameEventType } from '@monopoly/shared';
import { DiceDisplay } from './DiceDisplay';
import { BuyPropertyModal } from './BuyPropertyModal';
import { SpaceNotification } from './SpaceNotification';
import { TurnStateLabel } from './TurnStateLabel';
import { YourTurnBanner } from './YourTurnBanner';
import { formatEventMessage, EVENT_ICONS, formatTime } from './ActivityFeed';
import { CardDrawModal } from '../cards/CardDrawModal';
import { JailStatusIndicator } from '../jail/JailStatusIndicator';
import { JailOptionsPanel } from '../jail/JailOptionsPanel';
import { BankruptcyModal } from '../bankruptcy/BankruptcyModal';
import styles from './GameplayController.module.css';

export interface GameplayControllerProps {
  gameState: GameState;
  localPlayerId: string | null;
  emitAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
  showAssetManagement?: boolean;
  onOpenBuild?: () => void;
  onOpenMortgage?: () => void;
  onOpenTrade?: () => void;
}

export function GameplayController({
  gameState,
  localPlayerId,
  emitAction,
  showAssetManagement,
  onOpenBuild,
  onOpenMortgage,
  onOpenTrade,
}: GameplayControllerProps) {
  const [cardDismissed, setCardDismissed] = useState(false);
  const [buyDismissed, setBuyDismissed] = useState(false);
  const [showBankruptcy, setShowBankruptcy] = useState(false);
  const [bankruptcyDismissed, setBankruptcyDismissed] = useState(false);

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const isMyTurn = activePlayer?.id === localPlayerId;
  const isInJail = activePlayer?.jailStatus?.inJail ?? false;
  const isSpectator = localPlayer?.isBankrupt ?? false;
  const isGameFinished = gameState.status === 'finished';

  // Auto-trigger bankruptcy modal when player cash goes negative
  const playerCash = localPlayer?.cash ?? 0;
  useMemo(() => {
    if (playerCash < 0 && !isSpectator) {
      setShowBankruptcy(true);
      setBankruptcyDismissed(false);
    } else if (playerCash >= 0) {
      setShowBankruptcy(false);
      setBankruptcyDismissed(false);
    }
  }, [playerCash, isSpectator]);

  // Compute debt info from lastResolution
  const debtInfo = useMemo(() => {
    const resolution = gameState.lastResolution;
    if (!resolution || !localPlayer || localPlayer.cash >= 0) {
      return { debtAmount: 0, creditorId: 'bank' as string | 'bank' };
    }
    // The engine already deducted the amount, making cash negative.
    // debtAmount = 0 means "you need to get cash to $0"
    // The modal math: remainingDebt = 0 - negativeCash = |cash|
    if (resolution.type === 'rentPayment' && resolution.ownerId) {
      return { debtAmount: 0, creditorId: resolution.ownerId };
    }
    return { debtAmount: 0, creditorId: 'bank' as const };
  }, [gameState.lastResolution, localPlayer]);

  // Reset card/buy dismissal when context changes
  const cardKey = gameState.lastCardDrawn?.id ?? null;
  const buyKey = gameState.pendingBuyDecision?.spaceId ?? null;

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

  // Unique key per dice roll — forces DiceDisplay to remount every roll so animation always plays
  const diceRollKey = useMemo(
    () => gameState.events.filter((e) => e.type === GameEventType.DiceRolled).length,
    [gameState.events],
  );

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
    !isSpectator &&
    gameState.pendingBuyDecision &&
    gameState.turnState === TurnState.AwaitingBuyDecision;

  const showCardModal =
    !cardDismissed && gameState.lastCardDrawn && gameState.lastResolution?.type === 'drawCard';

  const showJailOptions =
    isMyTurn && isInJail && !isSpectator && gameState.turnState === TurnState.WaitingForRoll;

  const showDice = gameState.lastDiceResult != null;
  const showActions = !isSpectator && !isGameFinished;

  // Latest relevant event for the waiting-for-player activity hint
  const latestActivityEvent = useMemo(() => {
    if (isMyTurn || isSpectator) return null;
    const filtered = gameState.events.filter(
      (e) => e.type !== GameEventType.TurnStarted && e.type !== GameEventType.GameStarted,
    );
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }, [isMyTurn, isSpectator, gameState.events]);

  const latestActivityText = latestActivityEvent
    ? formatEventMessage(latestActivityEvent, gameState.players)
    : null;

  // Spectator mode
  if (isSpectator) {
    return (
      <div className={styles.container} data-testid="gameplay-controller">
        {/* Spectator Banner */}
        <div
          className={styles.spectatorBanner}
          data-testid="spectator-banner"
          role="status"
          aria-live="polite"
        >
          You are spectating
        </div>

        {/* Turn State Label */}
        <div className={styles.stateRow}>
          <TurnStateLabel
            turnState={gameState.turnState}
            isCurrentPlayersTurn={false}
            isInJail={isInJail}
          />
          <div className={styles.activePlayerBadge} data-testid="active-player-badge">
            {activePlayer?.name}
          </div>
        </div>

        {/* Dice display */}
        {showDice && (
          <DiceDisplay
            key={diceRollKey}
            die1={gameState.lastDiceResult!.die1}
            die2={gameState.lastDiceResult!.die2}
            isDoubles={gameState.lastDiceResult!.isDoubles}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="gameplay-controller">
      {/* Your Turn Banner */}
      <YourTurnBanner isYourTurn={isMyTurn} playerName={localPlayer?.name ?? ''} />

      {/* Space landing notifications (toasts) */}
      <SpaceNotification
        resolution={gameState.lastResolution}
        localPlayerName={localPlayer?.name ?? ''}
        passedGo={gameState.lastPassedGo}
      />

      {/* Turn State Label */}
      <div className={styles.stateRow}>
        <TurnStateLabel
          turnState={gameState.turnState}
          isCurrentPlayersTurn={isMyTurn}
          isInJail={isInJail}
          waitingForName={!isMyTurn ? activePlayer?.name : undefined}
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

      {/* Latest activity while waiting for another player */}
      {latestActivityEvent && latestActivityText && (
        <div className={styles.waitingActivity} data-testid="waiting-activity">
          <span className={styles.waitingActivityIcon} aria-hidden="true">
            {EVENT_ICONS[latestActivityEvent.type] ?? '⚪'}
          </span>
          <span className={styles.waitingActivityMessage}>{latestActivityText}</span>
          <span className={styles.waitingActivityTime}>
            {formatTime(latestActivityEvent.timestamp)}
          </span>
        </div>
      )}

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
          key={diceRollKey}
          die1={gameState.lastDiceResult!.die1}
          die2={gameState.lastDiceResult!.die2}
          isDoubles={gameState.lastDiceResult!.isDoubles}
        />
      )}

      {/* Action buttons row */}
      {showActions && (
        <div className={styles.actionRow} data-testid="gameplay-actions">
          {isMyTurn && gameState.turnState === TurnState.WaitingForRoll && !isInJail && (
            <button
              className={styles.rollButton}
              onClick={handleRollDice}
              data-testid="roll-dice-button"
              aria-label="Roll dice"
            >
              Roll Dice
            </button>
          )}
          {isMyTurn && gameState.turnState === TurnState.PlayerAction && (
            <button
              className={styles.endTurnButton}
              onClick={handleEndTurn}
              data-testid="end-turn-button"
              aria-label="End turn"
            >
              End Turn
            </button>
          )}
        </div>
      )}

      {/* Asset management buttons (Build / Mortgage / Trade) inline near the dice */}
      {showAssetManagement && (
        <div className={styles.assetRow} data-testid="asset-actions">
          {onOpenBuild && (
            <button
              className={styles.assetButton}
              onClick={onOpenBuild}
              data-testid="open-building-manager"
            >
              Build
            </button>
          )}
          {onOpenMortgage && (
            <button
              className={styles.assetButton}
              onClick={onOpenMortgage}
              data-testid="open-mortgage-manager"
            >
              Mortgage
            </button>
          )}
          {onOpenTrade && (
            <button
              className={styles.assetButton}
              onClick={onOpenTrade}
              data-testid="open-trade-builder"
            >
              Trade
            </button>
          )}
        </div>
      )}

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

      {/* Bankruptcy Modal */}
      {showBankruptcy && !bankruptcyDismissed && localPlayer && localPlayer.cash < 0 && (
        <BankruptcyModal
          gameState={gameState}
          player={localPlayer}
          debtAmount={debtInfo.debtAmount}
          creditorId={debtInfo.creditorId}
          emitAction={emitAction}
          onClose={() => {
            if (localPlayer.cash >= 0) {
              setShowBankruptcy(false);
            }
            setBankruptcyDismissed(true);
          }}
        />
      )}

      {/* ARIA live region for game announcements */}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="game-announcements"
      >
        {gameState.lastDiceResult &&
          `${activePlayer?.name} rolled ${gameState.lastDiceResult.total}`}
      </div>
    </div>
  );
}
