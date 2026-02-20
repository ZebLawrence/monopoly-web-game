'use client';

import React, { useState, useCallback } from 'react';
import { TokenType } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { TokenSelector } from '../ui/TokenSelector';
import styles from './Lobby.module.css';

// Token display icons
const TOKEN_ICONS: Record<string, string> = {
  [TokenType.ScottieDog]: '\u{1F415}',
  [TokenType.TopHat]: '\u{1F3A9}',
  [TokenType.RaceCar]: '\u{1F3CE}\uFE0F',
  [TokenType.Boot]: '\u{1F462}',
  [TokenType.Thimble]: '\u{1F9F5}',
  [TokenType.Iron]: '\u2668\uFE0F',
  [TokenType.Wheelbarrow]: '\u{1F6D2}',
  [TokenType.Battleship]: '\u{1F6A2}',
};

// --- CreateGameForm ---
export interface CreateGameFormProps {
  onSubmit: (settings: { playerCount: number; startingCash: number }) => void;
}

export function CreateGameForm({ onSubmit }: CreateGameFormProps) {
  const [playerCount, setPlayerCount] = useState(4);
  const [startingCash, setStartingCash] = useState(1500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ playerCount, startingCash });
  };

  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.lobbyCard}>
        <h2 className={styles.lobbyTitle}>Create Game</h2>
        <form onSubmit={handleSubmit} data-testid="create-game-form">
          <div className={styles.formGroup}>
            <div className={styles.selectWrapper}>
              <label htmlFor="playerCount" className={styles.selectLabel}>
                Max Players
              </label>
              <select
                id="playerCount"
                className={styles.select}
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Players
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Starting Cash"
              type="number"
              value={startingCash}
              onChange={(e) => setStartingCash(Number(e.target.value))}
            />
          </div>
          <Button type="submit" size="lg" className={styles.submitButton}>
            Create Game
          </Button>
        </form>
      </div>
    </div>
  );
}

// --- JoinGameForm ---
export interface JoinGameFormProps {
  onSubmit: (roomCode: string) => void;
}

export function JoinGameForm({ onSubmit }: JoinGameFormProps) {
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      onSubmit(roomCode.trim().toUpperCase());
    }
  };

  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.lobbyCard}>
        <h2 className={styles.lobbyTitle}>Join Game</h2>
        <form onSubmit={handleSubmit} data-testid="join-game-form">
          <div className={styles.formGroup}>
            <Input
              label="Room Code"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className={styles.submitButton}>
            Join Game
          </Button>
        </form>
      </div>
    </div>
  );
}

// --- PlayerListItem ---
export interface LobbyPlayer {
  id: string;
  name: string;
  token?: TokenType;
  isReady: boolean;
  isHost: boolean;
}

export function PlayerListItem({ player }: { player: LobbyPlayer }) {
  return (
    <div className={styles.playerItem} data-testid={`player-${player.id}`}>
      <span className={styles.playerToken}>
        {player.token ? TOKEN_ICONS[player.token] || '\u26AB' : '\u2753'}
      </span>
      <div className={styles.playerDetails}>
        <div className={styles.playerItemName}>{player.name}</div>
        {player.isHost && <div className={styles.hostBadge}>HOST</div>}
      </div>
      <span className={styles.readyStatus} aria-label={player.isReady ? 'Ready' : 'Not ready'}>
        {player.isReady ? '\u2705' : '\u23F3'}
      </span>
    </div>
  );
}

// --- WaitingRoom ---
export interface WaitingRoomProps {
  roomCode: string;
  players: LobbyPlayer[];
  isHost: boolean;
  onStartGame?: () => void;
}

export function WaitingRoom({ roomCode, players, isHost, onStartGame }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}/lobby/${roomCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [roomCode]);

  const canStart = players.length >= 2;

  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.waitingRoom} data-testid="waiting-room">
        <div className={styles.roomCodeSection}>
          <div className={styles.roomCodeLabel}>Room Code</div>
          <div className={styles.roomCode} data-testid="room-code">
            {roomCode}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={styles.copyButton}
            onClick={handleCopyLink}
            data-testid="copy-link-button"
          >
            {copied ? 'Copied!' : 'Copy Room Link'}
          </Button>
        </div>

        <div className={styles.playerList}>
          <div className={styles.playerListTitle}>Players ({players.length})</div>
          {players.map((player) => (
            <PlayerListItem key={player.id} player={player} />
          ))}
        </div>

        <div className={styles.startSection}>
          {isHost && (
            <Button
              size="lg"
              className={styles.submitButton}
              disabled={!canStart}
              onClick={onStartGame}
              data-testid="start-game-button"
            >
              Start Game
            </Button>
          )}
          {!isHost && <p className={styles.waitingText}>Waiting for host to start the game...</p>}
          {isHost && !canStart && (
            <p className={styles.waitingText}>Need at least 2 players to start</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- NameEntryModal ---
export interface NameEntryModalProps {
  isOpen: boolean;
  onSubmit: (name: string, token: TokenType) => void;
  disabledTokens?: TokenType[];
}

export function NameEntryModal({ isOpen, onSubmit, disabledTokens = [] }: NameEntryModalProps) {
  const [name, setName] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenType | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedToken) {
      onSubmit(name.trim(), selectedToken);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Join Game">
      <form onSubmit={handleSubmit} className={styles.nameModalForm} data-testid="name-entry-form">
        <Input
          label="Your Name"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <div className={styles.selectLabel}>Choose Your Token</div>
          <TokenSelector
            selectedToken={selectedToken}
            disabledTokens={disabledTokens}
            onSelect={setSelectedToken}
          />
        </div>
        <Button type="submit" size="lg" disabled={!name.trim() || !selectedToken}>
          Join
        </Button>
      </form>
    </Modal>
  );
}
