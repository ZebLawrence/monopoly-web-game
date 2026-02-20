import type { GameState } from '../types/gameState';
import { getPlayerById } from './state';

export interface DiceResult {
  die1: number;
  die2: number;
  total: number;
  isDoubles: boolean;
}

export type RngFunction = () => number;

const defaultRng: RngFunction = () => Math.random();

function rollSingleDie(rng: RngFunction): number {
  return Math.floor(rng() * 6) + 1;
}

export function rollDice(rng: RngFunction = defaultRng): DiceResult {
  const die1 = rollSingleDie(rng);
  const die2 = rollSingleDie(rng);
  return {
    die1,
    die2,
    total: die1 + die2,
    isDoubles: die1 === die2,
  };
}

export function calculateNewPosition(currentPosition: number, diceTotal: number): number {
  return (currentPosition + diceTotal) % 40;
}

export function didPassGo(oldPosition: number, newPosition: number): boolean {
  if (oldPosition === newPosition) return false;
  return newPosition < oldPosition;
}

export interface MovementResult {
  state: GameState;
  passedGo: boolean;
  sentToJail: boolean;
}

export function applyMovement(
  state: GameState,
  playerId: string,
  diceResult: DiceResult,
): MovementResult {
  const newState = deepCloneState(state);
  const player = getPlayerById(newState, playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  // Track consecutive doubles
  if (diceResult.isDoubles) {
    const currentDoubles = getConsecutiveDoubles(newState, playerId);
    setConsecutiveDoubles(newState, playerId, currentDoubles + 1);

    // Three consecutive doubles → go to jail
    if (currentDoubles + 1 >= 3) {
      player.position = 10;
      player.jailStatus = { inJail: true, turnsInJail: 0 };
      setConsecutiveDoubles(newState, playerId, 0);
      return { state: newState, passedGo: false, sentToJail: true };
    }
  } else {
    setConsecutiveDoubles(newState, playerId, 0);
  }

  const oldPosition = player.position;
  const newPosition = calculateNewPosition(oldPosition, diceResult.total);
  player.position = newPosition;

  const passedGo = didPassGo(oldPosition, newPosition);
  if (passedGo) {
    player.cash += 200;
  }

  return { state: newState, passedGo, sentToJail: false };
}

// Store consecutive doubles in state metadata
// We use a simple approach: store on the GameState via a Map-like approach
// Since GameState doesn't have a dedicated field, we'll track it in state
// using a convention on the events or as extra state data.
// For simplicity, we'll attach it to the player-level data via a side map.

const _doublesTracker = new Map<string, Map<string, number>>();

export function getConsecutiveDoubles(state: GameState, playerId: string): number {
  const gameMap = _doublesTracker.get(state.gameId);
  if (!gameMap) return 0;
  return gameMap.get(playerId) ?? 0;
}

export function setConsecutiveDoubles(state: GameState, playerId: string, count: number): void {
  let gameMap = _doublesTracker.get(state.gameId);
  if (!gameMap) {
    gameMap = new Map();
    _doublesTracker.set(state.gameId, gameMap);
  }
  gameMap.set(playerId, count);
}

export function resetDoublesTracker(gameId: string): void {
  _doublesTracker.delete(gameId);
}

function deepCloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}
