'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './CashDisplay.module.css';

export interface CashDisplayProps {
  amount: number;
  className?: string;
}

export function CashDisplay({ amount, className }: CashDisplayProps) {
  const prevAmountRef = useRef(amount);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (prevAmountRef.current !== amount) {
      const diff = amount - prevAmountRef.current;
      setAnimClass(diff > 0 ? styles.positive : styles.negative);
      prevAmountRef.current = amount;

      const timer = setTimeout(() => setAnimClass(''), 600);
      return () => clearTimeout(timer);
    }
  }, [amount]);

  const formatted = `$${amount.toLocaleString()}`;

  return (
    <span
      className={`${styles.container} ${animClass} ${className || ''}`}
      data-testid="cash-display"
    >
      {formatted}
    </span>
  );
}
