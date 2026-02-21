import type { GameState } from '../types/gameState';
import type { Space, ColorGroup } from '../types/space';
import { SpaceType } from '../types/space';
import type { DiceResult } from './dice';
import { getPlayerById, getSpaceByPosition } from './state';

export type SpaceResolutionType =
  | 'unownedProperty'
  | 'rentPayment'
  | 'tax'
  | 'goToJail'
  | 'drawCard'
  | 'noAction'
  | 'ownProperty';

export interface SpaceResolution {
  type: SpaceResolutionType;
  space: Space;
  rentAmount?: number;
  taxAmount?: number;
  deckName?: 'chance' | 'communityChest';
  ownerId?: string;
  propertyDetails?: {
    cost: number;
    name: string;
    spaceId: number;
  };
}

// Map from spaceId to owner info
export interface PropertyOwnership {
  ownerId: string;
  houses: number;
  mortgaged: boolean;
}

export function getPropertyOwnership(state: GameState, spaceId: number): PropertyOwnership | null {
  for (const player of state.players) {
    if (player.properties.includes(spaceId)) {
      // Find houses from the propertyStates if available, otherwise default to 0
      const propState = getPropertyState(state, spaceId);
      return {
        ownerId: player.id,
        houses: propState?.houses ?? 0,
        mortgaged: propState?.mortgaged ?? false,
      };
    }
  }
  return null;
}

// Property state tracking (houses, mortgage status)
export interface PropertyStateEntry {
  spaceId: number;
  houses: number;
  mortgaged: boolean;
}

// We store property states in a global map keyed by gameId
const _propertyStates = new Map<string, Map<number, PropertyStateEntry>>();

export function getPropertyState(state: GameState, spaceId: number): PropertyStateEntry | null {
  let gameMap = _propertyStates.get(state.gameId);
  // Rehydrate in-memory map from state (e.g. after Redis deserialization)
  if (!gameMap && state.propertyStates) {
    gameMap = new Map();
    for (const [key, val] of Object.entries(state.propertyStates)) {
      const id = Number(key);
      gameMap.set(id, { spaceId: id, houses: val.houses, mortgaged: val.mortgaged });
    }
    _propertyStates.set(state.gameId, gameMap);
  }
  if (!gameMap) return null;
  return gameMap.get(spaceId) ?? null;
}

export function setPropertyState(state: GameState, entry: PropertyStateEntry): void {
  let gameMap = _propertyStates.get(state.gameId);
  if (!gameMap) {
    gameMap = new Map();
    _propertyStates.set(state.gameId, gameMap);
  }
  gameMap.set(entry.spaceId, entry);
  // Keep state.propertyStates in sync so it serializes over the socket / Redis
  if (!state.propertyStates) state.propertyStates = {};
  state.propertyStates[entry.spaceId] = { houses: entry.houses, mortgaged: entry.mortgaged };
}

export function resetPropertyStates(gameId: string): void {
  _propertyStates.delete(gameId);
}

export function getColorGroupSpaces(state: GameState, colorGroup: ColorGroup): Space[] {
  return state.board.filter((s) => s.colorGroup === colorGroup);
}

export function ownsAllInColorGroup(
  state: GameState,
  playerId: string,
  colorGroup: ColorGroup,
): boolean {
  const groupSpaces = getColorGroupSpaces(state, colorGroup);
  const player = getPlayerById(state, playerId);
  if (!player) return false;
  return groupSpaces.every((s) => player.properties.includes(s.id));
}

export function countOwnedOfType(state: GameState, playerId: string, spaceType: SpaceType): number {
  const player = getPlayerById(state, playerId);
  if (!player) return 0;
  return player.properties.filter((spaceId) => {
    const space = state.board.find((s) => s.id === spaceId);
    return space && space.type === spaceType;
  }).length;
}

export function calculateStreetRent(space: Space, houses: number, hasMonopoly: boolean): number {
  const rentTiers = space.rentTiers;
  if (!rentTiers || rentTiers.length === 0) return 0;

  if (houses > 0) {
    // rentTiers: [base, 1house, 2house, 3house, 4house, hotel]
    return rentTiers[houses] ?? rentTiers[rentTiers.length - 1];
  }

  // Base rent, doubled if monopoly
  const baseRent = rentTiers[0];
  return hasMonopoly ? baseRent * 2 : baseRent;
}

export function calculateRailroadRent(railroadsOwned: number): number {
  if (railroadsOwned <= 0) return 0;
  return 25 * Math.pow(2, railroadsOwned - 1);
}

export function calculateUtilityRent(diceTotal: number, utilitiesOwned: number): number {
  if (utilitiesOwned <= 0) return 0;
  const multiplier = utilitiesOwned >= 2 ? 10 : 4;
  return diceTotal * multiplier;
}

export function resolveSpace(
  state: GameState,
  playerId: string,
  diceResult: DiceResult,
): SpaceResolution {
  const player = getPlayerById(state, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const space = getSpaceByPosition(state, player.position);
  if (!space) throw new Error(`No space at position ${player.position}`);

  switch (space.type) {
    case SpaceType.Property:
    case SpaceType.Railroad:
    case SpaceType.Utility:
      return resolvePropertySpace(state, playerId, space, diceResult);

    case SpaceType.Tax:
      return resolveTax(state, playerId, space);

    case SpaceType.Chance:
      return { type: 'drawCard', space, deckName: 'chance' };

    case SpaceType.CommunityChest:
      return { type: 'drawCard', space, deckName: 'communityChest' };

    case SpaceType.Corner:
      return resolveCorner(state, playerId, space);

    default:
      return { type: 'noAction', space };
  }
}

function resolvePropertySpace(
  state: GameState,
  playerId: string,
  space: Space,
  diceResult: DiceResult,
): SpaceResolution {
  const ownership = getPropertyOwnership(state, space.id);

  // Unowned
  if (!ownership) {
    return {
      type: 'unownedProperty',
      space,
      propertyDetails: {
        cost: space.cost ?? 0,
        name: space.name,
        spaceId: space.id,
      },
    };
  }

  // Own property
  if (ownership.ownerId === playerId) {
    return { type: 'ownProperty', space };
  }

  // Mortgaged — no rent
  if (ownership.mortgaged) {
    return { type: 'noAction', space, ownerId: ownership.ownerId };
  }

  // Calculate rent based on property type
  let rentAmount = 0;

  if (space.type === SpaceType.Property) {
    const hasMonopoly = space.colorGroup
      ? ownsAllInColorGroup(state, ownership.ownerId, space.colorGroup)
      : false;
    rentAmount = calculateStreetRent(space, ownership.houses, hasMonopoly);
  } else if (space.type === SpaceType.Railroad) {
    const railroadsOwned = countOwnedOfType(state, ownership.ownerId, SpaceType.Railroad);
    rentAmount = calculateRailroadRent(railroadsOwned);
  } else if (space.type === SpaceType.Utility) {
    const utilitiesOwned = countOwnedOfType(state, ownership.ownerId, SpaceType.Utility);
    rentAmount = calculateUtilityRent(diceResult.total, utilitiesOwned);
  }

  return {
    type: 'rentPayment',
    space,
    rentAmount,
    ownerId: ownership.ownerId,
  };
}

function resolveTax(state: GameState, playerId: string, space: Space): SpaceResolution {
  const player = getPlayerById(state, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const taxAmount = space.taxAmount ?? 0;
  return { type: 'tax', space, taxAmount };
}

function resolveCorner(state: GameState, playerId: string, space: Space): SpaceResolution {
  // Go To Jail (position 30)
  if (space.position === 30) {
    return { type: 'goToJail', space };
  }

  // Go (position 0) — landing on Go awards $200 (already handled by movement, but resolve as noAction)
  // Free Parking (position 20) — no-op
  // Just Visiting (position 10) — no-op
  return { type: 'noAction', space };
}

export function applySpaceResolution(
  state: GameState,
  playerId: string,
  resolution: SpaceResolution,
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  switch (resolution.type) {
    case 'tax': {
      const amount = resolution.taxAmount ?? 0;
      player.cash -= amount;
      break;
    }
    case 'rentPayment': {
      const amount = resolution.rentAmount ?? 0;
      player.cash -= amount;
      if (resolution.ownerId) {
        const owner = getPlayerById(newState, resolution.ownerId);
        if (owner) {
          owner.cash += amount;
        }
      }
      break;
    }
    case 'goToJail': {
      player.position = 10;
      player.jailStatus = { inJail: true, turnsInJail: 0 };
      break;
    }
    default:
      break;
  }

  return newState;
}
