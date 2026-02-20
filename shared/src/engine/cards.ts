import type { GameState } from '../types/gameState';
import type { Card, DeckType } from '../types/card';
import type { DiceResult } from './dice';
import { getPlayerById } from './state';
import {
  resolveSpace,
  applySpaceResolution,
  getPropertyOwnership,
  countOwnedOfType,
  calculateRailroadRent,
  getPropertyState,
} from './spaces';
import { SpaceType } from '../types/space';
import { didPassGo } from './dice';

export function createDeck(cardDefinitions: Card[], rng: () => number = Math.random): Card[] {
  const deck = [...cardDefinitions];
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export interface DrawCardResult {
  state: GameState;
  card: Card;
}

export function drawCard(state: GameState, deckName: DeckType): DrawCardResult {
  const newState = deepClone(state);
  const deck = deckName === 'chance' ? newState.decks.chance : newState.decks.communityChest;

  if (deck.length === 0) {
    throw new Error(`${deckName} deck is empty`);
  }

  const card = deck[0];

  // GOOJF cards are removed from deck and given to player
  if (card.effect.type === 'goojf') {
    deck.shift();
    const player = getPlayerById(newState, getActivePlayerId(newState));
    if (player) {
      player.getOutOfJailFreeCards += 1;
    }
  } else {
    // Non-GOOJF: move to bottom
    deck.shift();
    deck.push(card);
  }

  return { state: newState, card };
}

export function returnCardToDeck(state: GameState, card: Card, deckName: DeckType): GameState {
  const newState = deepClone(state);
  const deck = deckName === 'chance' ? newState.decks.chance : newState.decks.communityChest;
  deck.push(card);
  return newState;
}

export interface CardEffectResult {
  state: GameState;
  movedToPosition?: number;
  passedGo?: boolean;
  sentToJail?: boolean;
  needsBuyDecision?: boolean;
  spaceResolution?: ReturnType<typeof resolveSpace>;
}

export function applyCardEffect(
  state: GameState,
  playerId: string,
  card: Card,
  diceResult?: DiceResult,
): CardEffectResult {
  const effect = card.effect;

  switch (effect.type) {
    case 'cash':
      return applyCashEffect(state, playerId, effect.amount);
    case 'move':
      return applyMoveEffect(state, playerId, effect.position, diceResult);
    case 'moveBack':
      return applyMoveBackEffect(state, playerId, effect.spaces, diceResult);
    case 'jail':
      return applyJailEffect(state, playerId);
    case 'collectFromAll':
      return applyCollectFromAllEffect(state, playerId, effect.amount);
    case 'payEachPlayer':
      return applyPayEachPlayerEffect(state, playerId, effect.amount);
    case 'repairs':
      return applyRepairsEffect(state, playerId, effect.perHouse, effect.perHotel);
    case 'advanceNearestRailroad':
      return applyAdvanceNearestRailroad(state, playerId, diceResult);
    case 'advanceNearestUtility':
      return applyAdvanceNearestUtility(state, playerId, diceResult);
    case 'goojf':
      // Already handled in drawCard
      return { state };
    default:
      return { state };
  }
}

function applyCashEffect(state: GameState, playerId: string, amount: number): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);
  player.cash += amount;
  return { state: newState };
}

function applyMoveEffect(
  state: GameState,
  playerId: string,
  targetPosition: number,
  diceResult?: DiceResult,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const oldPosition = player.position;
  player.position = targetPosition;

  const passedGo = didPassGo(oldPosition, targetPosition);
  if (passedGo) {
    player.cash += 200;
  }

  // Resolve the target space
  const resolution = resolveSpace(newState, playerId, diceResult ?? makeDummyDice());

  // If it's an unowned property, signal buy decision needed
  if (resolution.type === 'unownedProperty') {
    return {
      state: newState,
      movedToPosition: targetPosition,
      passedGo,
      needsBuyDecision: true,
      spaceResolution: resolution,
    };
  }

  // Apply space resolution (rent, tax, etc.)
  const finalState = applySpaceResolution(newState, playerId, resolution);
  return {
    state: finalState,
    movedToPosition: targetPosition,
    passedGo,
    spaceResolution: resolution,
  };
}

function applyMoveBackEffect(
  state: GameState,
  playerId: string,
  spaces: number,
  diceResult?: DiceResult,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const newPosition = (player.position - spaces + 40) % 40;
  player.position = newPosition;

  // Resolve the target space
  const resolution = resolveSpace(newState, playerId, diceResult ?? makeDummyDice());
  if (resolution.type === 'unownedProperty') {
    return {
      state: newState,
      movedToPosition: newPosition,
      needsBuyDecision: true,
      spaceResolution: resolution,
    };
  }

  const finalState = applySpaceResolution(newState, playerId, resolution);
  return {
    state: finalState,
    movedToPosition: newPosition,
    spaceResolution: resolution,
  };
}

function applyJailEffect(state: GameState, playerId: string): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  player.position = 10;
  player.jailStatus = { inJail: true, turnsInJail: 0 };

  return { state: newState, sentToJail: true };
}

function applyCollectFromAllEffect(
  state: GameState,
  playerId: string,
  amount: number,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  let totalCollected = 0;
  for (const other of newState.players) {
    if (other.id !== playerId && other.isActive && !other.isBankrupt) {
      other.cash -= amount;
      totalCollected += amount;
    }
  }
  player.cash += totalCollected;

  return { state: newState };
}

function applyPayEachPlayerEffect(
  state: GameState,
  playerId: string,
  amount: number,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  let totalPaid = 0;
  for (const other of newState.players) {
    if (other.id !== playerId && other.isActive && !other.isBankrupt) {
      other.cash += amount;
      totalPaid += amount;
    }
  }
  player.cash -= totalPaid;

  return { state: newState };
}

function applyRepairsEffect(
  state: GameState,
  playerId: string,
  perHouse: number,
  perHotel: number,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  let totalCost = 0;
  for (const spaceId of player.properties) {
    const propState = getPropertyState(newState, spaceId);
    if (propState) {
      if (propState.houses === 5) {
        // Hotel
        totalCost += perHotel;
      } else if (propState.houses > 0) {
        totalCost += propState.houses * perHouse;
      }
    }
  }

  player.cash -= totalCost;
  return { state: newState };
}

const RAILROAD_POSITIONS = [5, 15, 25, 35];
const UTILITY_POSITIONS = [12, 28];

function findNearestPosition(currentPosition: number, positions: number[]): number {
  // Find the nearest position going forward (clockwise)
  for (const pos of positions) {
    if (pos > currentPosition) return pos;
  }
  // Wrap around
  return positions[0];
}

function applyAdvanceNearestRailroad(
  state: GameState,
  playerId: string,
  _diceResult?: DiceResult,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const oldPosition = player.position;
  const nearestRR = findNearestPosition(oldPosition, RAILROAD_POSITIONS);
  player.position = nearestRR;

  const passedGo = didPassGo(oldPosition, nearestRR);
  if (passedGo) {
    player.cash += 200;
  }

  // Check if railroad is owned
  const ownership = getPropertyOwnership(newState, nearestRR);

  if (!ownership) {
    // Unowned — player may buy
    const space = newState.board.find((s) => s.position === nearestRR)!;
    return {
      state: newState,
      movedToPosition: nearestRR,
      passedGo,
      needsBuyDecision: true,
      spaceResolution: {
        type: 'unownedProperty',
        space,
        propertyDetails: { cost: space.cost ?? 0, name: space.name, spaceId: space.id },
      },
    };
  }

  if (ownership.ownerId === playerId) {
    return { state: newState, movedToPosition: nearestRR, passedGo };
  }

  // Owned by another player — pay DOUBLE rent
  const railroadsOwned = countOwnedOfType(newState, ownership.ownerId, SpaceType.Railroad);
  const normalRent = calculateRailroadRent(railroadsOwned);
  const doubleRent = normalRent * 2;

  player.cash -= doubleRent;
  const owner = getPlayerById(newState, ownership.ownerId);
  if (owner) owner.cash += doubleRent;

  const space = newState.board.find((s) => s.position === nearestRR)!;
  return {
    state: newState,
    movedToPosition: nearestRR,
    passedGo,
    spaceResolution: {
      type: 'rentPayment',
      space,
      rentAmount: doubleRent,
      ownerId: ownership.ownerId,
    },
  };
}

function applyAdvanceNearestUtility(
  state: GameState,
  playerId: string,
  diceResult?: DiceResult,
): CardEffectResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const oldPosition = player.position;
  const nearestUtil = findNearestPosition(oldPosition, UTILITY_POSITIONS);
  player.position = nearestUtil;

  const passedGo = didPassGo(oldPosition, nearestUtil);
  if (passedGo) {
    player.cash += 200;
  }

  const ownership = getPropertyOwnership(newState, nearestUtil);

  if (!ownership) {
    const space = newState.board.find((s) => s.position === nearestUtil)!;
    return {
      state: newState,
      movedToPosition: nearestUtil,
      passedGo,
      needsBuyDecision: true,
      spaceResolution: {
        type: 'unownedProperty',
        space,
        propertyDetails: { cost: space.cost ?? 0, name: space.name, spaceId: space.id },
      },
    };
  }

  if (ownership.ownerId === playerId) {
    return { state: newState, movedToPosition: nearestUtil, passedGo };
  }

  // Owned — pay 10× dice roll
  const dice = diceResult ?? makeDummyDice();
  const rent = dice.total * 10;
  player.cash -= rent;
  const owner = getPlayerById(newState, ownership.ownerId);
  if (owner) owner.cash += rent;

  const space = newState.board.find((s) => s.position === nearestUtil)!;
  return {
    state: newState,
    movedToPosition: nearestUtil,
    passedGo,
    spaceResolution: {
      type: 'rentPayment',
      space,
      rentAmount: rent,
      ownerId: ownership.ownerId,
    },
  };
}

function getActivePlayerId(state: GameState): string {
  return state.players[state.currentPlayerIndex].id;
}

function makeDummyDice(): DiceResult {
  return { die1: 0, die2: 0, total: 0, isDoubles: false };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
