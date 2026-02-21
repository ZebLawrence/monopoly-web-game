import type { GameState, GameStatus, DeckState } from '../types/gameState';
import type { GameSettings } from '../types/gameSettings';
import { DEFAULT_GAME_SETTINGS } from '../types/gameSettings';
import type { Player, JailStatus } from '../types/player';
import type { Space } from '../types/space';
import type { Property } from '../types/property';
import type { Card } from '../types/card';
import { TurnState } from '../types/turn';
import { STARTING_CASH } from '../types/money';
import { TokenType } from '../types/token';
import boardData from '../data/board.json';
import chanceCards from '../data/chance-cards.json';
import communityChestCards from '../data/community-chest-cards.json';

const TOKENS = Object.values(TokenType);

export interface PlayerSetup {
  id: string;
  name: string;
  token?: TokenType;
}

export interface InitialGameStateOptions {
  gameId?: string;
  settings?: Partial<GameSettings>;
}

export function createInitialGameState(
  players: PlayerSetup[],
  options: InitialGameStateOptions = {},
): GameState {
  if (players.length < 2 || players.length > 6) {
    throw new Error(`Invalid number of players: ${players.length}. Must be 2-6.`);
  }

  const settings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...options.settings };
  const startingCash = settings.startingCash ?? STARTING_CASH;

  const gamePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    token: p.token ?? TOKENS[i % TOKENS.length],
    cash: startingCash,
    position: 0,
    properties: [],
    jailStatus: { inJail: false } as JailStatus,
    isActive: true,
    isBankrupt: false,
    getOutOfJailFreeCards: 0,
  }));

  const board: Space[] = boardData as Space[];
  const decks: DeckState = {
    chance: [...(chanceCards as Card[])],
    communityChest: [...(communityChestCards as Card[])],
  };

  return {
    gameId: options.gameId ?? generateGameId(),
    status: 'playing' as GameStatus,
    players: gamePlayers,
    currentPlayerIndex: 0,
    board,
    decks,
    turnState: TurnState.WaitingForRoll,
    settings,
    events: [],
    pendingTrades: [],
    propertyStates: {},
  };
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getPlayerById(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

export function getSpaceByPosition(state: GameState, position: number): Space | undefined {
  return state.board.find((s) => s.position === position);
}

export function getSpaceById(state: GameState, spaceId: number): Space | undefined {
  return state.board.find((s) => s.id === spaceId);
}

export function getPropertiesOwnedBy(state: GameState, playerId: string): Property[] {
  const player = getPlayerById(state, playerId);
  if (!player) return [];
  return player.properties.map((spaceId) => {
    const space = getSpaceById(state, spaceId);
    if (!space) throw new Error(`Space ${spaceId} not found`);
    return spaceToProperty(space, playerId);
  });
}

export function spaceToProperty(
  space: Space,
  ownerId: string | null = null,
  houses = 0,
  mortgaged = false,
): Property {
  let propertyType: 'street' | 'railroad' | 'utility' = 'street';
  if (space.type === 'railroad') propertyType = 'railroad';
  else if (space.type === 'utility') propertyType = 'utility';
  return {
    spaceId: space.id,
    name: space.name,
    type: propertyType,
    colorGroup: space.colorGroup,
    cost: space.cost ?? 0,
    rentTiers: space.rentTiers ?? [],
    mortgaged,
    ownerId,
    houses,
  };
}

export function isGameOver(state: GameState): boolean {
  const activePlayers = state.players.filter((p) => p.isActive && !p.isBankrupt);
  return activePlayers.length <= 1;
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(json: string): GameState {
  return JSON.parse(json) as GameState;
}

function generateGameId(): string {
  return 'game-' + Math.random().toString(36).substring(2, 11);
}
