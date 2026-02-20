'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './YourTurnBanner.module.css';

export interface YourTurnBannerProps {
  isYourTurn: boolean;
  playerName: string;
}

export function YourTurnBanner({ isYourTurn, playerName }: YourTurnBannerProps) {
  const [visible, setVisible] = useState(false);
  const prevTurn = useRef(isYourTurn);

  useEffect(() => {
    // Only show when transitioning TO your turn
    if (isYourTurn && !prevTurn.current) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
    prevTurn.current = isYourTurn;
  }, [isYourTurn]);

  if (!visible) return null;

  return (
    <div className={styles.banner} data-testid="your-turn-banner">
      <div className={styles.text}>Your Turn, {playerName}!</div>
    </div>
  );
}
