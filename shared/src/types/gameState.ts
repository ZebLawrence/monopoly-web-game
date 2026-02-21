import { Player } from './player';
import { Space } from './space';
import { Card } from './card';
import { TurnState } from './turn';
import { GameSettings } from './gameSettings';
import { GameEvent } from './gameEvent';
import { TradeOffer } from './trade';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface DeckState {
  chance: Card[];
  communityChest: Card[];
}

export interface DiceResultState {
  die1: number;
  die2: number;
  total: number;
  isDoubles: boolean;
}

export interface PendingBuyDecision {
  spaceId: number;
  spaceName: string;
  cost: number;
}

export interface LastResolution {
  type: string;
  spaceName: string;
  amount?: number;
  ownerId?: string;
  ownerName?: string;
  deckName?: 'chance' | 'communityChest';
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
  lastDiceResult?: DiceResultState | null;
  lastCardDrawn?: Card | null;
  pendingBuyDecision?: PendingBuyDecision | null;
  lastResolution?: LastResolution | null;
  doublesCount?: number;
  lastPassedGo?: boolean;
  pendingTrades?: TradeOffer[];
  propertyStates?: Record<number, { houses: number; mortgaged: boolean }>;
}
