import { GameAction } from './gameAction';
import { GameState } from './gameState';
import { GameEvent } from './gameEvent';
import { TokenType } from './token';

// --- Lobby / Room types ---

export interface RoomPlayer {
  id: string;
  name: string;
  token?: TokenType;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
}

export interface RoomMetadata {
  roomCode: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  startingCash: number;
  status: 'waiting' | 'playing' | 'finished';
  gameId?: string;
  createdAt: number;
}

// --- Client → Server events ---

export interface ClientToServerEvents {
  // Lobby
  createRoom: (
    settings: { playerName: string; maxPlayers?: number; startingCash?: number },
    callback: (response: { ok: boolean; roomCode?: string; error?: string }) => void,
  ) => void;
  joinRoom: (
    data: { roomCode: string; playerName: string },
    callback: (response: {
      ok: boolean;
      room?: RoomMetadata;
      playerId?: string;
      error?: string;
    }) => void,
  ) => void;
  selectToken: (
    data: { roomCode: string; token: TokenType },
    callback: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  startGame: (
    data: { roomCode: string },
    callback: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  leaveRoom: (
    data: { roomCode: string },
    callback: (response: { ok: boolean; error?: string }) => void,
  ) => void;

  // In-game
  gameAction: (
    data: { roomCode: string; action: GameAction },
    callback: (response: { ok: boolean; error?: string }) => void,
  ) => void;

  // Reconnection
  reconnect: (
    data: { roomCode: string; playerId: string },
    callback: (response: {
      ok: boolean;
      room?: RoomMetadata;
      gameState?: GameState;
      error?: string;
    }) => void,
  ) => void;
}

// --- Server → Client events ---

export interface ServerToClientEvents {
  // Room updates
  roomUpdated: (room: RoomMetadata) => void;
  playerJoined: (player: RoomPlayer) => void;
  playerLeft: (data: { playerId: string; newHostId?: string }) => void;
  playerUpdated: (player: RoomPlayer) => void;

  // Game lifecycle
  gameStarted: (state: GameState) => void;
  stateUpdate: (state: GameState) => void;
  gameEvent: (event: GameEvent) => void;
  actionError: (data: { message: string }) => void;

  // Reconnection
  playerDisconnected: (data: { playerId: string }) => void;
  playerReconnected: (data: { playerId: string }) => void;

  // Turn timer
  turnTimerUpdate: (data: { secondsRemaining: number; phase: string }) => void;

  // Errors
  error: (message: string) => void;
}

// --- Inter-server types (internal) ---

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  playerName: string;
  roomCode?: string;
}
