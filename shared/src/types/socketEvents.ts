import { GameAction } from './gameAction';
import { GameState } from './gameState';
import { GameEvent } from './gameEvent';

export interface ClientToServerEvents {
  joinGame: (gameId: string, playerName: string) => void;
  leaveGame: (gameId: string) => void;
  gameAction: (gameId: string, action: GameAction) => void;
  createGame: (settings: { playerName: string }) => void;
  startGame: (gameId: string) => void;
}

export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  gameEvent: (event: GameEvent) => void;
  error: (message: string) => void;
  playerJoined: (player: { id: string; name: string }) => void;
  playerLeft: (playerId: string) => void;
  gameCreated: (gameId: string) => void;
}
