import { Player } from './player';
import { Space } from './space';
import { Card } from './card';
import { TurnState } from './turn';
import { GameSettings } from './gameSettings';
import { GameEvent } from './gameEvent';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface DeckState {
  chance: Card[];
  communityChest: Card[];
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  board: Space[];
  decks: DeckState;
  turnState: TurnState;
  settings: GameSettings;
  events: GameEvent[];
}
