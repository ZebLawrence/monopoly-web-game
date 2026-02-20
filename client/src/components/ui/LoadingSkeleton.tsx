'use client';

import React from 'react';
import styles from './LoadingSkeleton.module.css';

export function LoadingSkeleton() {
  return (
    <div className={styles.container} data-testid="loading-skeleton" aria-label="Loading game...">
      <div className={styles.boardSkeleton} />
      <div className={styles.dashboardSkeleton}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonPlayerCard}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonActionBar}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonProperties}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonFeed}`} />
      </div>
    </div>
  );
}
