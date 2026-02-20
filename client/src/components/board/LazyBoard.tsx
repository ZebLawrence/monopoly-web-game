'use client';

import React, { Suspense, lazy } from 'react';
import type { PixiBoardProps } from './PixiBoard';

const PixiBoardLazy = lazy(() => import('./PixiBoard').then((mod) => ({ default: mod.PixiBoard })));

function BoardFallback() {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1',
        maxWidth: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#c8e6c0',
        borderRadius: 8,
      }}
      data-testid="board-loading"
    >
      <span style={{ color: '#1a5e3a', fontWeight: 600 }}>Loading board...</span>
    </div>
  );
}

export function LazyBoard(props: PixiBoardProps) {
  return (
    <Suspense fallback={<BoardFallback />}>
      <PixiBoardLazy {...props} />
    </Suspense>
  );
}
