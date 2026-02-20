'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();

  // Create game form state
  const [createName, setCreateName] = useState('');

  // Join game form state
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinName, setJoinName] = useState('');

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) return;
    router.push(`/lobby/create?name=${encodeURIComponent(name)}`);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinRoomCode.trim().toUpperCase();
    const name = joinName.trim();
    if (!code || !name) return;
    router.push(`/lobby/${code}?name=${encodeURIComponent(name)}`);
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Monopoly</h1>
      <p className={styles.subtitle}>The classic property trading game</p>

      <div className={styles.formGroup}>
        <form data-testid="create-game-form" onSubmit={handleCreateGame}>
          <input
            type="text"
            className={styles.nameInput}
            placeholder="Enter your name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            maxLength={20}
          />
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={`${styles.button} ${styles.createButton}`}
              disabled={!createName.trim()}
            >
              Create Game
            </button>
          </div>
        </form>
      </div>

      <div className={styles.formGroup}>
        <form data-testid="join-game-form" onSubmit={handleJoinGame}>
          <input
            type="text"
            className={styles.nameInput}
            placeholder="Room code"
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value)}
            maxLength={6}
          />
          <input
            type="text"
            className={styles.nameInput}
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            maxLength={20}
          />
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={`${styles.button} ${styles.joinButton}`}
              disabled={!joinRoomCode.trim() || !joinName.trim()}
            >
              Join Game
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
