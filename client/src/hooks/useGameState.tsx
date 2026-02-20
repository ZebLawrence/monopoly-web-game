'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { GameState, GameEvent, RoomMetadata, RoomPlayer, GameAction } from '@monopoly/shared';
import { useGameSocket, type UseGameSocketReturn } from './useGameSocket';

// --- State shape ---

export interface GameContextState {
  // Connection
  connected: boolean;
  playerId: string | null;
  roomCode: string | null;

  // Lobby
  room: RoomMetadata | null;

  // Game
  gameState: GameState | null;
  events: GameEvent[];

  // Turn timer
  turnTimer: { secondsRemaining: number; phase: string } | null;

  // Errors
  lastError: string | null;
}

const initialState: GameContextState = {
  connected: false,
  playerId: null,
  roomCode: null,
  room: null,
  gameState: null,
  events: [],
  turnTimer: null,
  lastError: null,
};

// --- Actions ---

type GameContextAction =
  | { type: 'SET_CONNECTED'; connected: boolean; playerId: string | null }
  | { type: 'SET_ROOM'; room: RoomMetadata | null; roomCode: string | null }
  | { type: 'ROOM_UPDATED'; room: RoomMetadata }
  | { type: 'PLAYER_JOINED'; player: RoomPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string; newHostId?: string }
  | { type: 'PLAYER_UPDATED'; player: RoomPlayer }
  | { type: 'GAME_STARTED'; state: GameState }
  | { type: 'STATE_UPDATE'; state: GameState }
  | { type: 'GAME_EVENT'; event: GameEvent }
  | { type: 'TURN_TIMER_UPDATE'; data: { secondsRemaining: number; phase: string } }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string }
  | { type: 'PLAYER_RECONNECTED'; playerId: string }
  | { type: 'ACTION_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

function gameReducer(state: GameContextState, action: GameContextAction): GameContextState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected, playerId: action.playerId };

    case 'SET_ROOM':
      return { ...state, room: action.room, roomCode: action.roomCode };

    case 'ROOM_UPDATED':
      return { ...state, room: action.room };

    case 'PLAYER_JOINED': {
      if (!state.room) return state;
      const exists = state.room.players.some((p) => p.id === action.player.id);
      if (exists) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: [...state.room.players, action.player],
        },
      };
    }

    case 'PLAYER_LEFT': {
      if (!state.room) return state;
      const updatedPlayers = state.room.players.filter((p) => p.id !== action.playerId);
      const newHostId = action.newHostId ?? state.room.hostId;
      return {
        ...state,
        room: {
          ...state.room,
          players: updatedPlayers.map((p) => ({
            ...p,
            isHost: p.id === newHostId,
          })),
          hostId: newHostId,
        },
      };
    }

    case 'PLAYER_UPDATED': {
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.map((p) => (p.id === action.player.id ? action.player : p)),
        },
      };
    }

    case 'GAME_STARTED':
      return { ...state, gameState: action.state };

    case 'STATE_UPDATE':
      return { ...state, gameState: action.state };

    case 'GAME_EVENT':
      return { ...state, events: [...state.events, action.event] };

    case 'TURN_TIMER_UPDATE':
      return { ...state, turnTimer: action.data };

    case 'PLAYER_DISCONNECTED': {
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.map((p) =>
            p.id === action.playerId ? { ...p, isConnected: false } : p,
          ),
        },
      };
    }

    case 'PLAYER_RECONNECTED': {
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.map((p) =>
            p.id === action.playerId ? { ...p, isConnected: true } : p,
          ),
        },
      };
    }

    case 'ACTION_ERROR':
      return { ...state, lastError: action.message };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// --- Context ---

interface GameContextValue extends GameContextState {
  socket: UseGameSocketReturn;
  dispatch: React.Dispatch<GameContextAction>;
  emitAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
}

const GameContext = createContext<GameContextValue | null>(null);

// --- Provider ---

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const socketHook = useGameSocket();

  // Track connection state
  useEffect(() => {
    dispatch({
      type: 'SET_CONNECTED',
      connected: socketHook.connected,
      playerId: socketHook.playerId,
    });
  }, [socketHook.connected, socketHook.playerId]);

  // Subscribe to socket events
  useEffect(() => {
    const socket = socketHook.socket;
    if (!socket) return;

    const handlers = {
      roomUpdated: (room: RoomMetadata) => dispatch({ type: 'ROOM_UPDATED', room }),
      playerJoined: (player: RoomPlayer) => dispatch({ type: 'PLAYER_JOINED', player }),
      playerLeft: (data: { playerId: string; newHostId?: string }) =>
        dispatch({ type: 'PLAYER_LEFT', ...data }),
      playerUpdated: (player: RoomPlayer) => dispatch({ type: 'PLAYER_UPDATED', player }),
      gameStarted: (gameState: GameState) => dispatch({ type: 'GAME_STARTED', state: gameState }),
      stateUpdate: (gameState: GameState) => dispatch({ type: 'STATE_UPDATE', state: gameState }),
      gameEvent: (event: GameEvent) => dispatch({ type: 'GAME_EVENT', event }),
      turnTimerUpdate: (data: { secondsRemaining: number; phase: string }) =>
        dispatch({ type: 'TURN_TIMER_UPDATE', data }),
      playerDisconnected: (data: { playerId: string }) =>
        dispatch({ type: 'PLAYER_DISCONNECTED', playerId: data.playerId }),
      playerReconnected: (data: { playerId: string }) =>
        dispatch({ type: 'PLAYER_RECONNECTED', playerId: data.playerId }),
      actionError: (data: { message: string }) =>
        dispatch({ type: 'ACTION_ERROR', message: data.message }),
      error: (message: string) => dispatch({ type: 'ACTION_ERROR', message }),
    };

    // Register all handlers
    for (const [event, handler] of Object.entries(handlers)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on(event as any, handler as any);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.off(event as any, handler as any);
      }
    };
  }, [socketHook.socket]);

  const emitAction = useCallback(
    async (action: GameAction): Promise<{ ok: boolean; error?: string }> => {
      if (!state.roomCode) return { ok: false, error: 'Not in a room' };
      return socketHook.emitAction(state.roomCode, action);
    },
    [socketHook, state.roomCode],
  );

  const value: GameContextValue = {
    ...state,
    socket: socketHook,
    dispatch,
    emitAction,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// --- Hook ---

export function useGameState(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
