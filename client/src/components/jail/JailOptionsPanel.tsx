'use client';

import React from 'react';
import type { Player } from '@monopoly/shared';
import { Button } from '../ui/Button';
import styles from './JailOptionsPanel.module.css';

export interface JailOptionsPanelProps {
  player: Player;
  onPayFine: () => void;
  onUseCard: () => void;
  onRollForDoubles: () => void;
}

export function JailOptionsPanel({
  player,
  onPayFine,
  onUseCard,
  onRollForDoubles,
}: JailOptionsPanelProps) {
  if (!player.jailStatus.inJail) return null;

  const canAffordFine = player.cash >= 50;
  const hasCard = player.getOutOfJailFreeCards > 0;

  return (
    <div className={styles.container} data-testid="jail-options">
      <div className={styles.title}>Jail Options</div>
      <div className={styles.options}>
        <Button
          variant="primary"
          size="sm"
          onClick={onPayFine}
          disabled={!canAffordFine}
          data-testid="pay-fine-button"
        >
          Pay $50 Fine
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onUseCard}
          disabled={!hasCard}
          data-testid="use-card-button"
        >
          Use GOOJF Card {hasCard && `(${player.getOutOfJailFreeCards})`}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRollForDoubles}
          data-testid="roll-doubles-button"
        >
          Roll for Doubles
        </Button>
      </div>
    </div>
  );
}
