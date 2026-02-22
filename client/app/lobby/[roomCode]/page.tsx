'use client';

import { use, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TokenType, RoomMetadata } from '@monopoly/shared';
import { GameStateProvider, useGameState } from '@/src/hooks/useGameState';
import { JoinGameForm, WaitingRoom, NameEntryModal } from '@/src/components/lobby/Lobby';
import { ConnectionError } from '@/src/components/connection/ConnectionError';
import { ReconnectionOverlay } from '@/src/components/connection/ReconnectionOverlay';
import { TokenSelector } from '@/src/components/ui/TokenSelector';

function LobbyContent({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get('name');
  const { connected, playerId, room, gameState, lastError, socket, dispatch } = useGameState();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [wasConnected, setWasConnected] = useState(false);
  const [autoAction, setAutoAction] = useState<'idle' | 'pending' | 'done'>('idle');

  // Track whether we were ever connected (to distinguish initial load from disconnect)
  useEffect(() => {
    if (connected) setWasConnected(true);
  }, [connected]);

  // P1.S2.T6: Navigate all clients to game page on gameStarted
  useEffect(() => {
    if (gameState?.gameId) {
      const code = room?.roomCode || roomCode;
      const pid = playerId || '';
      router.push(`/game/${gameState.gameId}?room=${code}&pid=${pid}`);
    }
  }, [gameState, router, room, roomCode, playerId]);

  // Auto-create room when roomCode === 'create' and name param exists
  useEffect(() => {
    if (connected && roomCode === 'create' && nameParam && autoAction === 'idle' && playerId) {
      setAutoAction('pending');
      socket.createRoom(nameParam).then((result) => {
        if (result.ok && result.roomCode) {
          const realRoomCode = result.roomCode;
          // Update URL without full page navigation
          window.history.replaceState(null, '', `/lobby/${realRoomCode}`);
          // Construct room metadata (we just created it, so we know the shape)
          const newRoom: RoomMetadata = {
            roomCode: realRoomCode,
            hostId: playerId,
            players: [
              {
                id: playerId,
                name: nameParam,
                isHost: true,
                isReady: false,
                isConnected: true,
              },
            ],
            maxPlayers: 4,
            startingCash: 1500,
            status: 'waiting',
            createdAt: Date.now(),
          };
          dispatch({ type: 'SET_ROOM', room: newRoom, roomCode: realRoomCode });
          setAutoAction('done');
        } else {
          setJoinError(result.error || 'Failed to create room');
          setAutoAction('done');
        }
      });
    }
  }, [connected, roomCode, nameParam, autoAction, playerId, socket, dispatch]);

  // Auto-join room when name param exists and we have a real room code
  useEffect(() => {
    if (
      connected &&
      nameParam &&
      !room &&
      autoAction === 'idle' &&
      roomCode !== 'join' &&
      roomCode !== 'create'
    ) {
      setAutoAction('pending');
      socket.joinRoom(roomCode, nameParam).then((result) => {
        if (result.ok) {
          dispatch({ type: 'SET_ROOM', room: result.room ?? null, roomCode });
          setAutoAction('done');
        } else {
          setJoinError(result.error || 'Failed to join room');
          setAutoAction('done');
        }
      });
    }
  }, [connected, nameParam, room, autoAction, roomCode, socket, dispatch]);

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

  // Auto-action in progress — show loading
  if (autoAction === 'pending') {
    return (
      <main style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
        <p>{roomCode === 'create' ? 'Creating room...' : 'Joining room...'}</p>
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
    const currentRoomCode = room.roomCode ?? roomCode;
    const result = await socket.selectToken(currentRoomCode, token);
    if (!result.ok) {
      dispatch({ type: 'ACTION_ERROR', message: result.error || 'Failed to select token' });
    }
  };

  // P1.S2.T6: Wire host's Start Game button
  const handleStartGame = async () => {
    const currentRoomCode = room.roomCode ?? roomCode;
    const result = await socket.startGame(currentRoomCode);
    if (!result.ok) {
      dispatch({ type: 'ACTION_ERROR', message: result.error || 'Failed to start game' });
    }
  };

  return (
    <>
      <WaitingRoom
        roomCode={room.roomCode ?? roomCode}
        players={players}
        isHost={isHost}
        onStartGame={handleStartGame}
        tokenSelector={
          <>
            <h3>Select Your Token</h3>
            <TokenSelector
              selectedToken={currentPlayer?.token}
              disabledTokens={disabledTokens}
              onSelect={handleTokenSelect}
            />
          </>
        }
      />
      {/* P1.S2.T8: ConnectionError on action failure */}
      {lastError && <ConnectionError onRetry={() => dispatch({ type: 'CLEAR_ERROR' })} />}
      {/* P1.S2.T7: ReconnectionOverlay on socket disconnect */}
      <ReconnectionOverlay isDisconnected={!connected} />
    </>
  );
}

function LobbyInner({ roomCode }: { roomCode: string }) {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <p>Loading...</p>
        </main>
      }
    >
      <LobbyContent roomCode={roomCode} />
    </Suspense>
  );
}

export default function LobbyPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);

  return (
    <GameStateProvider>
      <LobbyInner roomCode={roomCode} />
    </GameStateProvider>
  );
}
