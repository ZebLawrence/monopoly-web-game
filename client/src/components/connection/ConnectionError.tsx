'use client';

import React, { useState, useCallback } from 'react';
import styles from './ConnectionError.module.css';

export interface ConnectionErrorProps {
  onRetry: () => void;
}

export function ConnectionError({ onRetry }: ConnectionErrorProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    onRetry();
    setTimeout(() => setRetrying(false), 3000);
  }, [onRetry]);

  return (
    <div className={styles.overlay} data-testid="connection-error" role="alert">
      <div className={styles.card}>
        <div className={styles.icon}>&#x1F50C;</div>
        <h2 className={styles.title}>Unable to Connect</h2>
        <p className={styles.message}>
          We&apos;re having trouble connecting to the game server. Please check your internet
          connection and try again.
        </p>
        <button
          className={styles.retryButton}
          onClick={handleRetry}
          disabled={retrying}
          data-testid="retry-connection"
        >
          {retrying && <span className={styles.spinner} />}
          {retrying ? 'Retrying...' : 'Retry Connection'}
        </button>
      </div>
    </div>
  );
}
