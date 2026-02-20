'use client';

import { use } from 'react';

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);

  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <h1>Game</h1>
      <p>
        Game ID: <strong>{gameId}</strong>
      </p>
    </main>
  );
}
