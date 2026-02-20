'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './DiceDisplay.module.css';

export interface DiceDisplayProps {
  die1: number | null;
  die2: number | null;
  isDoubles: boolean;
  onAnimationComplete?: () => void;
}

const DOT_PATTERNS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DOT_PATTERNS[value] ?? [];
  return (
    <div
      className={`${styles.die} ${rolling ? styles.dieRolling : ''}`}
      data-testid={`die-face-${value}`}
    >
      <div className={styles.dieGrid}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const hasDot = dots.some(([r, c]) => r === row && c === col);
            return (
              <div
                key={`${row}-${col}`}
                className={`${styles.dotSlot} ${hasDot ? styles.dotFilled : ''}`}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export function DiceDisplay({ die1, die2, isDoubles, onAnimationComplete }: DiceDisplayProps) {
  const [rolling, setRolling] = useState(false);
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1]);
  const prevDie1 = useRef<number | null>(null);
  const prevDie2 = useRef<number | null>(null);

  useEffect(() => {
    if (die1 === null || die2 === null) return;
    if (die1 === prevDie1.current && die2 === prevDie2.current) return;

    prevDie1.current = die1;
    prevDie2.current = die2;

    // Start rolling animation
    setRolling(true);
    const interval = setInterval(() => {
      setDisplayValues([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
    }, 80);

    // Stop after animation duration
    const timer = setTimeout(() => {
      clearInterval(interval);
      setDisplayValues([die1, die2]);
      setRolling(false);
      onAnimationComplete?.();
    }, 600);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [die1, die2, onAnimationComplete]);

  if (die1 === null || die2 === null) return null;

  return (
    <div className={styles.container} data-testid="dice-display">
      <div className={styles.diceRow}>
        <DieFace value={displayValues[0]} rolling={rolling} />
        <DieFace value={displayValues[1]} rolling={rolling} />
      </div>
      {!rolling && (
        <div className={styles.total}>
          <span data-testid="dice-total">{die1 + die2}</span>
          {isDoubles && (
            <span className={styles.doublesBadge} data-testid="doubles-badge">
              Doubles!
            </span>
          )}
        </div>
      )}
    </div>
  );
}
