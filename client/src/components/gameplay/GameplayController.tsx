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
import { BankruptcyModal } from '../bankruptcy/BankruptcyModal';
import styles from './GameplayController.module.css';

export interface GameplayControllerProps {
  gameState: GameState;
  localPlayerId: string | null;
  emitAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
  soundMuted?: boolean;
  onToggleSound?: () => void;
}

export function GameplayController({
  gameState,
  localPlayerId,
  emitAction,
  soundMuted,
  onToggleSound,
}: GameplayControllerProps) {
  const [cardDismissed, setCardDismissed] = useState(false);
  const [buyDismissed, setBuyDismissed] = useState(false);
  const [showBankruptcy, setShowBankruptcy] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'mine'>('all');

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const isMyTurn = activePlayer?.id === localPlayerId;
  const isInJail = activePlayer?.jailStatus?.inJail ?? false;
  const isSpectator = localPlayer?.isBankrupt ?? false;
  const isGameFinished = gameState.status === 'finished';

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

  // Filter events for feed
  const filteredEvents = useMemo(() => {
    if (feedFilter === 'all') return gameState.events;
    return gameState.events.filter((e) => {
      const playerId = (e.payload.playerId as string) ?? '';
      const payerId = (e.payload.payerId as string) ?? '';
      const receiverId = (e.payload.receiverId as string) ?? '';
      return (
        playerId === localPlayerId || payerId === localPlayerId || receiverId === localPlayerId
      );
    });
  }, [gameState.events, feedFilter, localPlayerId]);

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
            die1={gameState.lastDiceResult!.die1}
            die2={gameState.lastDiceResult!.die2}
            isDoubles={gameState.lastDiceResult!.isDoubles}
          />
        )}

        {/* Activity Feed with controls */}
        <div className={styles.feedControls}>
          <div className={styles.feedFilterRow}>
            <button
              className={`${styles.filterButton} ${feedFilter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setFeedFilter('all')}
              data-testid="filter-all"
            >
              All Events
            </button>
            <button
              className={`${styles.filterButton} ${feedFilter === 'mine' ? styles.filterActive : ''}`}
              onClick={() => setFeedFilter('mine')}
              data-testid="filter-mine"
            >
              My Events
            </button>
          </div>
          {onToggleSound && (
            <button
              className={styles.soundToggle}
              onClick={onToggleSound}
              aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
              data-testid="sound-toggle"
            >
              {soundMuted ? '\u{1F507}' : '\u{1F50A}'}
            </button>
          )}
        </div>
        <ActivityFeed events={filteredEvents} players={gameState.players} />
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

      {/* Activity Feed with filter controls */}
      <div className={styles.feedControls}>
        <div className={styles.feedFilterRow}>
          <button
            className={`${styles.filterButton} ${feedFilter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFeedFilter('all')}
            data-testid="filter-all"
          >
            All Events
          </button>
          <button
            className={`${styles.filterButton} ${feedFilter === 'mine' ? styles.filterActive : ''}`}
            onClick={() => setFeedFilter('mine')}
            data-testid="filter-mine"
          >
            My Events
          </button>
        </div>
        {onToggleSound && (
          <button
            className={styles.soundToggle}
            onClick={onToggleSound}
            aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
            data-testid="sound-toggle"
          >
            {soundMuted ? '\u{1F507}' : '\u{1F50A}'}
          </button>
        )}
      </div>
      <ActivityFeed events={filteredEvents} players={gameState.players} />

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
      {showBankruptcy && localPlayer && (
        <BankruptcyModal
          gameState={gameState}
          player={localPlayer}
          debtAmount={0}
          creditorId="bank"
          emitAction={emitAction}
          onClose={() => setShowBankruptcy(false)}
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
