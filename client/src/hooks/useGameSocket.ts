'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameAction,
  GameState,
  RoomMetadata,
} from '@monopoly/shared';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export interface UseGameSocketReturn {
  socket: GameSocket | null;
  connected: boolean;
  roomCode: string | null;
  playerId: string | null;

  // Lobby actions
  createRoom: (
    playerName: string,
    maxPlayers?: number,
    startingCash?: number,
  ) => Promise<{ ok: boolean; roomCode?: string; error?: string }>;
  joinRoom: (
    roomCode: string,
    playerName: string,
  ) => Promise<{ ok: boolean; room?: RoomMetadata; playerId?: string; error?: string }>;
  selectToken: (
    roomCode: string,
    token: import('@monopoly/shared').TokenType,
  ) => Promise<{ ok: boolean; error?: string }>;
  startGame: (roomCode: string) => Promise<{ ok: boolean; error?: string }>;
  leaveRoom: (roomCode: string) => Promise<{ ok: boolean; error?: string }>;

  // Game actions
  emitAction: (roomCode: string, action: GameAction) => Promise<{ ok: boolean; error?: string }>;

  // Reconnection
  reconnect: (
    roomCode: string,
    playerId: string,
  ) => Promise<{ ok: boolean; room?: RoomMetadata; gameState?: GameState; error?: string }>;
}

export function useGameSocket(): UseGameSocketReturn {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setPlayerId(socket.id ?? null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const createRoom = useCallback(
    async (
      playerName: string,
      maxPlayers?: number,
      startingCash?: number,
    ): Promise<{ ok: boolean; roomCode?: string; error?: string }> => {
      const socket = socketRef.current;
      if (!socket?.connected) return { ok: false, error: 'Not connected' };

      return new Promise((resolve) => {
        socket.emit('createRoom', { playerName, maxPlayers, startingCash }, (response) => {
          if (response.ok && response.roomCode) {
            setRoomCode(response.roomCode);
          }
          resolve(response);
        });
      });
    },
    [],
  );

  const joinRoom = useCallback(
    async (
      code: string,
      playerName: string,
    ): Promise<{ ok: boolean; room?: RoomMetadata; playerId?: string; error?: string }> => {
      const socket = socketRef.current;
      if (!socket?.connected) return { ok: false, error: 'Not connected' };

      return new Promise((resolve) => {
        socket.emit('joinRoom', { roomCode: code, playerName }, (response) => {
          if (response.ok) {
            setRoomCode(code);
            if (response.playerId) setPlayerId(response.playerId);
          }
          resolve(response);
        });
      });
    },
    [],
  );

  const selectToken = useCallback(
    async (
      code: string,
      token: import('@monopoly/shared').TokenType,
    ): Promise<{ ok: boolean; error?: string }> => {
      const socket = socketRef.current;
      if (!socket?.connected) return { ok: false, error: 'Not connected' };

      return new Promise((resolve) => {
        socket.emit('selectToken', { roomCode: code, token }, resolve);
      });
    },
    [],
  );

  const startGame = useCallback(async (code: string): Promise<{ ok: boolean; error?: string }> => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Not connected' };

    return new Promise((resolve) => {
      socket.emit('startGame', { roomCode: code }, resolve);
    });
  }, []);

  const leaveRoom = useCallback(async (code: string): Promise<{ ok: boolean; error?: string }> => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Not connected' };

    return new Promise((resolve) => {
      socket.emit('leaveRoom', { roomCode: code }, (response) => {
        if (response.ok) {
          setRoomCode(null);
        }
        resolve(response);
      });
    });
  }, []);

  const emitAction = useCallback(
    async (code: string, action: GameAction): Promise<{ ok: boolean; error?: string }> => {
      const socket = socketRef.current;
      if (!socket?.connected) return { ok: false, error: 'Not connected' };

      return new Promise((resolve) => {
        socket.emit('gameAction', { roomCode: code, action }, resolve);
      });
    },
    [],
  );

  const reconnectFn = useCallback(
    async (
      code: string,
      pid: string,
    ): Promise<{ ok: boolean; room?: RoomMetadata; gameState?: GameState; error?: string }> => {
      const socket = socketRef.current;
      if (!socket?.connected) return { ok: false, error: 'Not connected' };

      return new Promise((resolve) => {
        socket.emit('reconnect', { roomCode: code, playerId: pid }, (response) => {
          if (response.ok) {
            setRoomCode(code);
            setPlayerId(pid);
          }
          resolve(response);
        });
      });
    },
    [],
  );

  return {
    socket: socketRef.current,
    connected,
    roomCode,
    playerId,
    createRoom,
    joinRoom,
    selectToken,
    startGame,
    leaveRoom,
    emitAction,
    reconnect: reconnectFn,
  };
}
