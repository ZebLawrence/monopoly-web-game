'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { TokenType } from '@monopoly/shared';
import { GameStateProvider, useGameState } from '@/src/hooks/useGameState';
import { JoinGameForm, WaitingRoom, NameEntryModal } from '@/src/components/lobby/Lobby';
import { ConnectionError } from '@/src/components/connection/ConnectionError';
import { ReconnectionOverlay } from '@/src/components/connection/ReconnectionOverlay';
import { TokenSelector } from '@/src/components/ui/TokenSelector';

function LobbyContent({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { connected, playerId, room, gameState, lastError, socket, dispatch } = useGameState();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [wasConnected, setWasConnected] = useState(false);

  // Track whether we were ever connected (to distinguish initial load from disconnect)
  useEffect(() => {
    if (connected) setWasConnected(true);
  }, [connected]);

  // P1.S2.T6: Navigate all clients to game page on gameStarted
  useEffect(() => {
    if (gameState?.gameId) {
      router.push(`/game/${gameState.gameId}`);
    }
  }, [gameState, router]);

  // P1.S2.T2: roomCode === 'join' → render JoinGameForm
  if (roomCode === 'join') {
    return <JoinGameForm onSubmit={(code) => router.push(`/lobby/${code}`)} />;
  }

  // Initial connection not yet established
  if (!connected && !wasConnected) {
    return (
      <main style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
        <p>Connecting to server...</p>
      </main>
    );
  }

  // P1.S2.T3: Player not in room (no room data) → NameEntryModal
  if (!room) {
    const handleNameSubmit = async (name: string, token: TokenType) => {
      setJoinError(null);
      const result = await socket.joinRoom(roomCode, name);
      if (result.ok) {
        dispatch({ type: 'SET_ROOM', room: result.room ?? null, roomCode });
        const tokenResult = await socket.selectToken(roomCode, token);
        if (!tokenResult.ok) {
          setJoinError(tokenResult.error || 'Failed to select token');
        }
      } else {
        setJoinError(result.error || 'Failed to join room');
      }
    };

    return (
      <>
        <NameEntryModal isOpen={true} onSubmit={handleNameSubmit} />
        {/* P1.S2.T8: ConnectionError when join returns { ok: false } */}
        {joinError && <ConnectionError onRetry={() => setJoinError(null)} />}
        {/* P1.S2.T7: ReconnectionOverlay on socket disconnect */}
        <ReconnectionOverlay isDisconnected={!connected} />
      </>
    );
  }

  // P1.S2.T4: Player in room → WaitingRoom
  const isHost = playerId === room.hostId;
  const players = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    token: p.token,
    isReady: p.isReady,
    isHost: p.isHost,
  }));

  // P1.S2.T5: TokenSelector — derive current token and disabled tokens
  const currentPlayer = room.players.find((p) => p.id === playerId);
  const disabledTokens = room.players
    .filter((p) => p.token && p.id !== playerId)
    .map((p) => p.token!);

  const handleTokenSelect = async (token: TokenType) => {
    const result = await socket.selectToken(roomCode, token);
    if (!result.ok) {
      dispatch({ type: 'ACTION_ERROR', message: result.error || 'Failed to select token' });
    }
  };

  // P1.S2.T6: Wire host's Start Game button
  const handleStartGame = async () => {
    const result = await socket.startGame(roomCode);
    if (!result.ok) {
      dispatch({ type: 'ACTION_ERROR', message: result.error || 'Failed to start game' });
    }
  };

  return (
    <>
      <WaitingRoom
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        onStartGame={handleStartGame}
      />
      <div style={{ padding: 'var(--space-4)', maxWidth: '600px', margin: '0 auto' }}>
        <h3>Select Your Token</h3>
        <TokenSelector
          selectedToken={currentPlayer?.token}
          disabledTokens={disabledTokens}
          onSelect={handleTokenSelect}
        />
      </div>
      {/* P1.S2.T8: ConnectionError on action failure */}
      {lastError && <ConnectionError onRetry={() => dispatch({ type: 'CLEAR_ERROR' })} />}
      {/* P1.S2.T7: ReconnectionOverlay on socket disconnect */}
      <ReconnectionOverlay isDisconnected={!connected} />
    </>
  );
}

export default function LobbyPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);

  return (
    <GameStateProvider>
      <LobbyContent roomCode={roomCode} />
    </GameStateProvider>
  );
}
