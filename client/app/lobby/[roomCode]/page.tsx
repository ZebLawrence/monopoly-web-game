'use client';

import { use } from 'react';

export default function LobbyPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);

  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <h1>Game Lobby</h1>
      <p>
        Room Code: <strong>{roomCode}</strong>
      </p>
      <p>Waiting for players to join...</p>
    </main>
  );
}
