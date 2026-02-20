import type { GameState } from '../types/gameState';
import type { DiceResult } from './dice';
import { getPlayerById } from './state';
import { calculateNewPosition, didPassGo, setConsecutiveDoubles } from './dice';

export function sendToJail(state: GameState, playerId: string): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  player.position = 10;
  player.jailStatus = { inJail: true, turnsInJail: 0 };
  setConsecutiveDoubles(newState, playerId, 0);

  return newState;
}

export function payJailFine(state: GameState, playerId: string): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  if (!player.jailStatus.inJail) {
    throw new Error('Player is not in jail');
  }

  if (player.cash < 50) {
    throw new Error('Player cannot afford $50 jail fine');
  }

  player.cash -= 50;
  player.jailStatus = { inJail: false };

  return newState;
}

export function useJailCard(state: GameState, playerId: string): GameState {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  if (!player.jailStatus.inJail) {
    throw new Error('Player is not in jail');
  }

  if (player.getOutOfJailFreeCards <= 0) {
    throw new Error('Player does not have a Get Out of Jail Free card');
  }

  player.getOutOfJailFreeCards -= 1;
  player.jailStatus = { inJail: false };

  return newState;
}

export interface JailRollResult {
  state: GameState;
  freedFromJail: boolean;
  forcedExit: boolean;
  diceResult: DiceResult;
}

export function rollInJail(
  state: GameState,
  playerId: string,
  diceResult: DiceResult,
): JailRollResult {
  const newState = deepClone(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  if (!player.jailStatus.inJail) {
    throw new Error('Player is not in jail');
  }

  const turnsInJail = player.jailStatus.turnsInJail;

  // Rolled doubles → free
  if (diceResult.isDoubles) {
    player.jailStatus = { inJail: false };
    const newPosition = calculateNewPosition(player.position, diceResult.total);
    player.position = newPosition;
    if (didPassGo(10, newPosition)) {
      player.cash += 200;
    }
    return { state: newState, freedFromJail: true, forcedExit: false, diceResult };
  }

  // Third failed attempt → forced to pay $50 and move
  if (turnsInJail >= 2) {
    player.cash -= 50;
    player.jailStatus = { inJail: false };
    const newPosition = calculateNewPosition(player.position, diceResult.total);
    player.position = newPosition;
    if (didPassGo(10, newPosition)) {
      player.cash += 200;
    }
    return { state: newState, freedFromJail: true, forcedExit: true, diceResult };
  }

  // Still in jail, increment turns
  player.jailStatus = { inJail: true, turnsInJail: turnsInJail + 1 };
  return { state: newState, freedFromJail: false, forcedExit: false, diceResult };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
