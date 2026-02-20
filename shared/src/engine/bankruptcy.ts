import type { GameState } from '../types/gameState';
import { getPlayerById, getSpaceById } from './state';
import { getPropertyState, setPropertyState } from './spaces';
import { getBuildingSupply, setBuildingSupply } from './properties';

export function canPlayerAfford(state: GameState, playerId: string, amount: number): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;

  const totalAvailable = player.cash + calculateLiquidationValue(state, playerId);
  return totalAvailable >= amount;
}

export function calculateLiquidationValue(state: GameState, playerId: string): number {
  const player = getPlayerById(state, playerId);
  if (!player) return 0;

  let value = 0;

  for (const spaceId of player.properties) {
    const space = getSpaceById(state, spaceId);
    if (!space) continue;

    const propState = getPropertyState(state, spaceId);

    // Value from selling buildings (half of cost)
    if (propState && propState.houses > 0) {
      const houseCost = space.houseCost ?? 0;
      const halfCost = Math.floor(houseCost / 2);
      if (propState.houses === 5) {
        // Hotel = 5 buildings worth
        value += halfCost * 5;
      } else {
        value += halfCost * propState.houses;
      }
    }

    // Value from mortgaging (if not already mortgaged)
    if (!propState?.mortgaged) {
      value += space.mortgageValue ?? 0;
    }
  }

  return value;
}

export function declareBankruptcy(
  state: GameState,
  playerId: string,
  creditorId: string | 'bank',
): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  if (creditorId === 'bank') {
    return declareBankruptcyToBank(newState, player);
  }

  return declareBankruptcyToPlayer(newState, player, creditorId);
}

function declareBankruptcyToPlayer(
  state: GameState,
  bankruptPlayer: ReturnType<typeof getPlayerById>,
  creditorId: string,
): GameState {
  if (!bankruptPlayer) throw new Error('Bankrupt player not found');

  const creditor = getPlayerById(state, creditorId);
  if (!creditor) throw new Error(`Creditor ${creditorId} not found`);

  // Transfer all cash
  creditor.cash += bankruptPlayer.cash;
  bankruptPlayer.cash = 0;

  // Transfer all properties (including mortgaged ones)
  for (const spaceId of bankruptPlayer.properties) {
    creditor.properties.push(spaceId);

    // Sell any buildings back to bank
    const propState = getPropertyState(state, spaceId);
    if (propState && propState.houses > 0) {
      const _space = getSpaceById(state, spaceId);
      const supply = getBuildingSupply(state);
      if (propState.houses === 5) {
        supply.hotels += 1;
      } else {
        supply.houses += propState.houses;
      }
      setBuildingSupply(state, supply);
      setPropertyState(state, { spaceId, houses: 0, mortgaged: propState.mortgaged });
    }
    // Mortgaged properties stay mortgaged (creditor must decide to pay interest)
  }
  bankruptPlayer.properties = [];

  // Transfer GOOJF cards
  creditor.getOutOfJailFreeCards += bankruptPlayer.getOutOfJailFreeCards;
  bankruptPlayer.getOutOfJailFreeCards = 0;

  // Mark player as bankrupt
  bankruptPlayer.isActive = false;
  bankruptPlayer.isBankrupt = true;

  // Check win condition
  checkWinCondition(state);

  return state;
}

function declareBankruptcyToBank(
  state: GameState,
  bankruptPlayer: ReturnType<typeof getPlayerById>,
): GameState {
  if (!bankruptPlayer) throw new Error('Bankrupt player not found');

  // All properties go unowned (queued for auction)
  // Remove buildings first
  for (const spaceId of bankruptPlayer.properties) {
    const propState = getPropertyState(state, spaceId);
    if (propState && propState.houses > 0) {
      const supply = getBuildingSupply(state);
      if (propState.houses === 5) {
        supply.hotels += 1;
      } else {
        supply.houses += propState.houses;
      }
      setBuildingSupply(state, supply);
    }
    setPropertyState(state, { spaceId, houses: 0, mortgaged: false });

    // Remove from all players' property lists
    for (const p of state.players) {
      p.properties = p.properties.filter((id) => id !== spaceId);
    }
  }

  bankruptPlayer.properties = [];
  bankruptPlayer.cash = 0;
  bankruptPlayer.getOutOfJailFreeCards = 0;
  bankruptPlayer.isActive = false;
  bankruptPlayer.isBankrupt = true;

  checkWinCondition(state);

  return state;
}

function checkWinCondition(state: GameState): void {
  const activePlayers = state.players.filter((p) => p.isActive && !p.isBankrupt);
  if (activePlayers.length <= 1) {
    state.status = 'finished';
  }
}

export function getWinner(state: GameState): string | null {
  if (state.status !== 'finished') return null;
  const activePlayers = state.players.filter((p) => p.isActive && !p.isBankrupt);
  return activePlayers.length === 1 ? activePlayers[0].id : null;
}

export function calculateNetWorth(state: GameState, playerId: string): number {
  const player = getPlayerById(state, playerId);
  if (!player) return 0;

  let netWorth = player.cash;

  for (const spaceId of player.properties) {
    const space = getSpaceById(state, spaceId);
    if (!space) continue;

    const propState = getPropertyState(state, spaceId);

    // Unmortgaged property value
    if (!propState?.mortgaged) {
      netWorth += space.cost ?? 0;
    }

    // Building values
    if (propState && propState.houses > 0) {
      const houseCost = space.houseCost ?? 0;
      if (propState.houses === 5) {
        // Hotel = 4 houses + 1 hotel cost
        netWorth += houseCost * 5;
      } else {
        netWorth += houseCost * propState.houses;
      }
    }
  }

  return netWorth;
}

export function determineTimedGameWinner(state: GameState): string | null {
  let highestNetWorth = -1;
  let winnerId: string | null = null;

  for (const player of state.players) {
    if (!player.isActive || player.isBankrupt) continue;
    const nw = calculateNetWorth(state, player.id);
    if (nw > highestNetWorth) {
      highestNetWorth = nw;
      winnerId = player.id;
    }
  }

  return winnerId;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
