'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/src/hooks/useGameSocket';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { createRoom } = useGameSocket();
  const [playerName, setPlayerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateGame = async () => {
    setError(null);
    setCreating(true);
    try {
      const result = await createRoom(playerName);
      if (result.ok && result.roomCode) {
        router.push(`/lobby/${result.roomCode}`);
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = () => {
    router.push('/lobby/join');
  };

  const nameEmpty = playerName.trim() === '';

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Monopoly</h1>
      <p className={styles.subtitle}>The classic property trading game</p>
      <div className={styles.formGroup}>
        <input
          type="text"
          className={styles.nameInput}
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.button} ${styles.createButton}`}
          onClick={handleCreateGame}
          disabled={nameEmpty || creating}
        >
          {creating ? 'Creating…' : 'Create Game'}
        </button>
        <button
          className={`${styles.button} ${styles.joinButton}`}
          onClick={handleJoinGame}
          disabled={nameEmpty}
        >
          Join Game
        </button>
      </div>
    </main>
  );
}
