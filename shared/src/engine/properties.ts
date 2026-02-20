import type { GameState } from '../types/gameState';
import type { ColorGroup } from '../types/space';
import { SpaceType } from '../types/space';
import { getPlayerById, getSpaceById } from './state';
import {
  getPropertyOwnership,
  setPropertyState,
  getPropertyState,
  ownsAllInColorGroup,
  getColorGroupSpaces,
} from './spaces';

export interface BuildingSupply {
  houses: number;
  hotels: number;
}

// Track building supply per game
const _buildingSupply = new Map<string, BuildingSupply>();

export function getBuildingSupply(state: GameState): BuildingSupply {
  return _buildingSupply.get(state.gameId) ?? { houses: 32, hotels: 12 };
}

export function setBuildingSupply(state: GameState, supply: BuildingSupply): void {
  _buildingSupply.set(state.gameId, supply);
}

export function resetBuildingSupply(gameId: string): void {
  _buildingSupply.delete(gameId);
}

export function initBuildingSupply(state: GameState): void {
  _buildingSupply.set(state.gameId, { houses: 32, hotels: 12 });
}

export function buyProperty(state: GameState, playerId: string, spaceId: number): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  const space = getSpaceById(newState, spaceId);
  if (!space) throw new Error(`Space ${spaceId} not found`);

  // Validate space is a purchasable type
  if (
    space.type !== SpaceType.Property &&
    space.type !== SpaceType.Railroad &&
    space.type !== SpaceType.Utility
  ) {
    throw new Error(`Space ${spaceId} is not purchasable`);
  }

  // Check if already owned
  const ownership = getPropertyOwnership(newState, spaceId);
  if (ownership) {
    throw new Error(`Property ${spaceId} is already owned by ${ownership.ownerId}`);
  }

  // Check player can afford
  const cost = space.cost ?? 0;
  if (player.cash < cost) {
    throw new Error(`Player ${playerId} cannot afford $${cost} (has $${player.cash})`);
  }

  // Check player is on the space
  if (player.position !== space.position) {
    throw new Error(`Player ${playerId} is not on space ${spaceId}`);
  }

  // Transfer
  player.cash -= cost;
  player.properties.push(spaceId);
  setPropertyState(newState, { spaceId, houses: 0, mortgaged: false });

  return newState;
}

// Auction state
export interface AuctionState {
  propertyId: number;
  highBid: number;
  highBidderId: string | null;
  eligiblePlayers: string[];
  passedPlayers: string[];
  currentBidderIndex: number;
}

const _auctionStates = new Map<string, AuctionState>();

export function startAuction(state: GameState, spaceId: number): AuctionState {
  const activePlayers = state.players.filter((p) => p.isActive && !p.isBankrupt).map((p) => p.id);

  const auction: AuctionState = {
    propertyId: spaceId,
    highBid: 0,
    highBidderId: null,
    eligiblePlayers: activePlayers,
    passedPlayers: [],
    currentBidderIndex: 0,
  };

  _auctionStates.set(state.gameId, auction);
  return auction;
}

export function getAuction(state: GameState): AuctionState | null {
  return _auctionStates.get(state.gameId) ?? null;
}

export function placeBid(state: GameState, playerId: string, amount: number): AuctionState {
  const auction = getAuction(state);
  if (!auction) throw new Error('No active auction');

  const player = getPlayerById(state, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  if (auction.passedPlayers.includes(playerId)) {
    throw new Error(`Player ${playerId} has already passed`);
  }

  if (amount <= auction.highBid) {
    throw new Error(`Bid $${amount} must be greater than current high bid $${auction.highBid}`);
  }

  if (amount > player.cash) {
    throw new Error(`Player ${playerId} cannot afford $${amount} (has $${player.cash})`);
  }

  auction.highBid = amount;
  auction.highBidderId = playerId;

  return auction;
}

export function passBid(state: GameState, playerId: string): AuctionState {
  const auction = getAuction(state);
  if (!auction) throw new Error('No active auction');

  if (!auction.passedPlayers.includes(playerId)) {
    auction.passedPlayers.push(playerId);
  }

  return auction;
}

export function isAuctionComplete(state: GameState): boolean {
  const auction = getAuction(state);
  if (!auction) return true;

  const remaining = auction.eligiblePlayers.filter((id) => !auction.passedPlayers.includes(id));

  // All passed or only one remaining (who is the high bidder)
  if (remaining.length === 0) return true;
  if (remaining.length === 1 && remaining[0] === auction.highBidderId) return true;

  return false;
}

export function resolveAuction(state: GameState): GameState {
  const auction = getAuction(state);
  if (!auction) throw new Error('No active auction');

  const newState = deepClone(state);

  if (auction.highBidderId && auction.highBid > 0) {
    const winner = getPlayerById(newState, auction.highBidderId);
    if (winner) {
      winner.cash -= auction.highBid;
      winner.properties.push(auction.propertyId);
      setPropertyState(newState, { spaceId: auction.propertyId, houses: 0, mortgaged: false });
    }
  }
  // If no bids, property remains unowned

  _auctionStates.delete(state.gameId);
  return newState;
}

export function hasMonopoly(state: GameState, playerId: string, colorGroup: ColorGroup): boolean {
  return ownsAllInColorGroup(state, playerId, colorGroup);
}

export function canBuildHouse(state: GameState, playerId: string, spaceId: number): string | null {
  const player = getPlayerById(state, playerId);
  if (!player) return 'Player not found';

  const space = getSpaceById(state, spaceId);
  if (!space) return 'Space not found';
  if (space.type !== SpaceType.Property) return 'Can only build on street properties';
  if (!space.colorGroup) return 'Space has no color group';

  // Must own monopoly
  if (!ownsAllInColorGroup(state, playerId, space.colorGroup)) {
    return 'Must own all properties in color group';
  }

  const propState = getPropertyState(state, spaceId);
  const houses = propState?.houses ?? 0;

  if (houses >= 5) return 'Property already has a hotel';

  // Check even-build rule
  const groupSpaces = getColorGroupSpaces(state, space.colorGroup);
  for (const gs of groupSpaces) {
    if (gs.id === spaceId) continue;
    const gsState = getPropertyState(state, gs.id);
    const gsHouses = gsState?.houses ?? 0;
    if (houses > gsHouses) {
      return `Must build evenly — ${gs.name} has fewer buildings`;
    }
  }

  // Check cost
  const houseCost = space.houseCost ?? 0;
  if (player.cash < houseCost) return 'Cannot afford house';

  // Check supply
  const supply = getBuildingSupply(state);
  if (houses === 4) {
    // Building a hotel
    if (supply.hotels <= 0) return 'No hotels available';
  } else {
    if (supply.houses <= 0) return 'No houses available';
  }

  return null; // Can build
}

export function buildHouse(state: GameState, playerId: string, spaceId: number): GameState {
  const error = canBuildHouse(state, playerId, spaceId);
  if (error) throw new Error(error);

  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error('Player not found');

  const space = getSpaceById(newState, spaceId);
  if (!space) throw new Error('Space not found');

  const propState = getPropertyState(newState, spaceId);
  const currentHouses = propState?.houses ?? 0;
  const houseCost = space.houseCost ?? 0;

  player.cash -= houseCost;

  const supply = getBuildingSupply(newState);

  if (currentHouses === 4) {
    // Upgrade to hotel
    setPropertyState(newState, { spaceId, houses: 5, mortgaged: false });
    supply.houses += 4; // Return 4 houses
    supply.hotels -= 1;
  } else {
    setPropertyState(newState, {
      spaceId,
      houses: currentHouses + 1,
      mortgaged: propState?.mortgaged ?? false,
    });
    supply.houses -= 1;
  }

  setBuildingSupply(newState, supply);
  return newState;
}

export function canSellBuilding(
  state: GameState,
  playerId: string,
  spaceId: number,
): string | null {
  const player = getPlayerById(state, playerId);
  if (!player) return 'Player not found';

  const space = getSpaceById(state, spaceId);
  if (!space) return 'Space not found';

  const propState = getPropertyState(state, spaceId);
  const houses = propState?.houses ?? 0;

  if (houses <= 0) return 'No buildings to sell';

  // Check even-sell rule
  if (space.colorGroup) {
    const groupSpaces = getColorGroupSpaces(state, space.colorGroup);
    for (const gs of groupSpaces) {
      if (gs.id === spaceId) continue;
      const gsState = getPropertyState(state, gs.id);
      const gsHouses = gsState?.houses ?? 0;
      if (houses - 1 < gsHouses - 1) {
        // After selling, this property would have fewer buildings
        // Actually: check if (houses - 1) < gsHouses
        // Wait, even-sell means you can't sell if it creates uneven distribution
      }
      // The rule is: after selling, this property's count must be >= min(others) - but actually
      // the even-sell rule says you can't have a difference greater than 1
      // So: houses-1 must be >= gsHouses - 1 for all peers
      // Simplified: if any peer has more houses than this property AFTER selling, it's blocked
      // Wait no: the rule is you can sell if it doesn't violate evenness
      // Evenness: max - min <= 1 across the group
      if (houses - 1 < gsHouses - 1) {
        // Actually let me think about this more carefully.
        // Even build/sell rule: within a color group, the difference in houses between
        // the most-built and least-built property can never exceed 1.
        // So after selling from this property (houses - 1), we need:
        // max(all houses in group after) - min(all houses in group after) <= 1
      }
    }
    // Let me just do the actual check
    const allHousesAfter: number[] = [];
    for (const gs of groupSpaces) {
      if (gs.id === spaceId) {
        allHousesAfter.push(houses - 1);
      } else {
        const gsState = getPropertyState(state, gs.id);
        allHousesAfter.push(gsState?.houses ?? 0);
      }
    }
    const maxH = Math.max(...allHousesAfter);
    const minH = Math.min(...allHousesAfter);
    if (maxH - minH > 1) {
      return 'Cannot sell — would violate even-sell rule';
    }
  }

  // If selling a hotel, need 4 houses in supply
  if (houses === 5) {
    const supply = getBuildingSupply(state);
    if (supply.houses < 4) {
      return 'Cannot downgrade hotel — not enough houses in supply';
    }
  }

  return null;
}

export function sellBuilding(state: GameState, playerId: string, spaceId: number): GameState {
  const error = canSellBuilding(state, playerId, spaceId);
  if (error) throw new Error(error);

  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error('Player not found');

  const space = getSpaceById(newState, spaceId);
  if (!space) throw new Error('Space not found');

  const propState = getPropertyState(newState, spaceId);
  const currentHouses = propState?.houses ?? 0;
  const houseCost = space.houseCost ?? 0;
  const refund = Math.floor(houseCost / 2);

  player.cash += refund;

  const supply = getBuildingSupply(newState);

  if (currentHouses === 5) {
    // Downgrade hotel to 4 houses
    setPropertyState(newState, { spaceId, houses: 4, mortgaged: false });
    supply.hotels += 1;
    supply.houses -= 4;
  } else {
    setPropertyState(newState, {
      spaceId,
      houses: currentHouses - 1,
      mortgaged: propState?.mortgaged ?? false,
    });
    supply.houses += 1;
  }

  setBuildingSupply(newState, supply);
  return newState;
}

export function mortgageProperty(state: GameState, playerId: string, spaceId: number): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error('Player not found');

  const space = getSpaceById(newState, spaceId);
  if (!space) throw new Error('Space not found');

  if (!player.properties.includes(spaceId)) {
    throw new Error('Player does not own this property');
  }

  const propState = getPropertyState(newState, spaceId);
  if (propState?.mortgaged) {
    throw new Error('Property is already mortgaged');
  }

  // Check for buildings in color group
  if (space.colorGroup) {
    const groupSpaces = getColorGroupSpaces(newState, space.colorGroup);
    for (const gs of groupSpaces) {
      const gsState = getPropertyState(newState, gs.id);
      if (gsState && gsState.houses > 0) {
        throw new Error('Cannot mortgage — buildings exist in color group');
      }
    }
  }

  const mortgageValue = space.mortgageValue ?? 0;
  player.cash += mortgageValue;
  setPropertyState(newState, { spaceId, houses: 0, mortgaged: true });

  return newState;
}

export function unmortgageProperty(state: GameState, playerId: string, spaceId: number): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error('Player not found');

  const space = getSpaceById(newState, spaceId);
  if (!space) throw new Error('Space not found');

  if (!player.properties.includes(spaceId)) {
    throw new Error('Player does not own this property');
  }

  const propState = getPropertyState(newState, spaceId);
  if (!propState?.mortgaged) {
    throw new Error('Property is not mortgaged');
  }

  const mortgageValue = space.mortgageValue ?? 0;
  const interest = Math.ceil(mortgageValue * 0.1);
  const totalCost = mortgageValue + interest;

  if (player.cash < totalCost) {
    throw new Error(`Cannot afford unmortgage cost $${totalCost} (has $${player.cash})`);
  }

  player.cash -= totalCost;
  setPropertyState(newState, { spaceId, houses: 0, mortgaged: false });

  return newState;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
