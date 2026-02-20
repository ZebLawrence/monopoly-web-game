'use client';

import React, { useEffect, useState } from 'react';
import styles from './ReconnectionOverlay.module.css';

export interface ReconnectionOverlayProps {
  isDisconnected: boolean;
  attemptCount?: number;
}

export function ReconnectionOverlay({
  isDisconnected,
  attemptCount = 0,
}: ReconnectionOverlayProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isDisconnected) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isDisconnected]);

  if (!isDisconnected) return null;

  return (
    <div className={styles.overlay} data-testid="reconnection-overlay">
      <div className={styles.content}>
        <div className={styles.spinner} />
        <h2 className={styles.title}>Reconnecting{dots}</h2>
        <p className={styles.message}>
          Connection lost. Attempting to reconnect to the game server.
        </p>
        {attemptCount > 0 && <p className={styles.attempts}>Attempt {attemptCount}</p>}
      </div>
    </div>
  );
}
