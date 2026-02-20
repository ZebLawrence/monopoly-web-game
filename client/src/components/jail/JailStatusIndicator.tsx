'use client';

import React from 'react';
import type { Player } from '@monopoly/shared';
import styles from './JailStatusIndicator.module.css';

export interface JailStatusIndicatorProps {
  player: Player;
}

export function JailStatusIndicator({ player }: JailStatusIndicatorProps) {
  if (!player.jailStatus.inJail) return null;

  const turnsInJail = player.jailStatus.turnsInJail;
  const turnsRemaining = 3 - turnsInJail;

  return (
    <div className={styles.container} data-testid="jail-status">
      <span className={styles.icon}>&#x1F6D1;</span>
      <span className={styles.text}>In Jail (Turn {turnsInJail + 1}/3)</span>
      {turnsRemaining <= 1 && <span className={styles.warning}>Must exit next turn!</span>}
    </div>
  );
}
