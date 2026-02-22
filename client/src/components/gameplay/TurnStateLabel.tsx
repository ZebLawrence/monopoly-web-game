'use client';

import React from 'react';
import { TurnState } from '@monopoly/shared';
import styles from './TurnStateLabel.module.css';

export interface TurnStateLabelProps {
  turnState: TurnState;
  isCurrentPlayersTurn: boolean;
  isInJail: boolean;
  waitingForName?: string;
}

const STATE_LABELS: Record<TurnState, string> = {
  [TurnState.WaitingForRoll]: 'Roll Dice',
  [TurnState.Rolling]: 'Rolling...',
  [TurnState.Resolving]: 'Resolving...',
  [TurnState.AwaitingBuyDecision]: 'Buy or Auction',
  [TurnState.Auction]: 'Auction in Progress',
  [TurnState.PlayerAction]: 'Your Action',
  [TurnState.TradeNegotiation]: 'Trade in Progress',
  [TurnState.EndTurn]: 'Turn Ending...',
};

export function TurnStateLabel({
  turnState,
  isCurrentPlayersTurn,
  isInJail,
  waitingForName,
}: TurnStateLabelProps) {
  let label = STATE_LABELS[turnState] ?? turnState;
  const isWaiting = !isCurrentPlayersTurn;

  if (isWaiting) {
    label = waitingForName ? `Waiting for ${waitingForName}…` : 'Waiting…';
  } else if (isInJail && turnState === TurnState.WaitingForRoll) {
    label = 'Jail Options';
  }

  return (
    <div
      className={`${styles.container} ${isWaiting ? styles.waiting : ''}`}
      data-testid="turn-state-label"
    >
      <span className={`${styles.dot} ${isWaiting ? styles.dotWaiting : ''}`} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
