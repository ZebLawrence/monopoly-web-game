import { describe, it, expect, beforeEach } from 'vitest';
import {
  rollDice,
  calculateNewPosition,
  didPassGo,
  applyMovement,
  getConsecutiveDoubles,
  resetDoublesTracker,
  type DiceResult,
} from '../../engine/dice';
import { createInitialGameState, type PlayerSetup } from '../../engine/state';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

describe('Step 1A.3 — Dice & Movement', () => {
  beforeEach(() => {
    resetDoublesTracker('test-game');
  });

  describe('rollDice', () => {
    it('P1A.S3.T1: all die values 1-6, total correct, isDoubles correct', () => {
      const results: DiceResult[] = [];
      for (let i = 0; i < 1000; i++) {
        results.push(rollDice());
      }
      for (const r of results) {
        expect(r.die1).toBeGreaterThanOrEqual(1);
        expect(r.die1).toBeLessThanOrEqual(6);
        expect(r.die2).toBeGreaterThanOrEqual(1);
        expect(r.die2).toBeLessThanOrEqual(6);
        expect(r.total).toBe(r.die1 + r.die2);
        expect(r.isDoubles).toBe(r.die1 === r.die2);
      }
    });

    it('P1A.S3.T2: injectable RNG produces deterministic results', () => {
      let counter = 0;
      const seededRng = () => {
        const values = [0.0, 0.5, 0.16, 0.83, 0.99, 0.33];
        return values[counter++ % values.length];
      };
      const r1 = rollDice(seededRng);
      expect(r1.die1).toBe(1); // floor(0.0 * 6) + 1 = 1
      expect(r1.die2).toBe(4); // floor(0.5 * 6) + 1 = 4
      expect(r1.total).toBe(5);
      expect(r1.isDoubles).toBe(false);
    });
  });

  describe('calculateNewPosition', () => {
    it('P1A.S3.T3: wraps around 40 spaces', () => {
      expect(calculateNewPosition(38, 4)).toBe(2);
      expect(calculateNewPosition(0, 7)).toBe(7);
      expect(calculateNewPosition(35, 5)).toBe(0);
    });
  });

  describe('didPassGo', () => {
    it('P1A.S3.T4: detects passing Go correctly', () => {
      expect(didPassGo(38, 2)).toBe(true);
      expect(didPassGo(5, 10)).toBe(false);
      expect(didPassGo(0, 0)).toBe(false); // landing on Go from Go
    });
  });

  describe('applyMovement', () => {
    it('P1A.S3.T5: moves player and awards $200 for passing Go', () => {
      const state = createInitialGameState(players, { gameId: 'test-game' });
      state.players[0].position = 35;
      const dice: DiceResult = { die1: 4, die2: 3, total: 7, isDoubles: false };
      const result = applyMovement(state, 'p1', dice);
      const player = result.state.players[0];
      expect(player.position).toBe(2);
      expect(player.cash).toBe(1700); // 1500 + 200
      expect(result.passedGo).toBe(true);
    });

    it('does not award $200 when not passing Go', () => {
      const state = createInitialGameState(players, { gameId: 'test-game' });
      state.players[0].position = 5;
      const dice: DiceResult = { die1: 3, die2: 4, total: 7, isDoubles: false };
      const result = applyMovement(state, 'p1', dice);
      expect(result.state.players[0].position).toBe(12);
      expect(result.state.players[0].cash).toBe(1500);
      expect(result.passedGo).toBe(false);
    });
  });

  describe('consecutive doubles', () => {
    it('P1A.S3.T6: tracks doubles, resets on non-doubles', () => {
      const state = createInitialGameState(players, { gameId: 'test-game' });

      const doubles1: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
      const r1 = applyMovement(state, 'p1', doubles1);
      expect(getConsecutiveDoubles(r1.state, 'p1')).toBe(1);

      const doubles2: DiceResult = { die1: 4, die2: 4, total: 8, isDoubles: true };
      const r2 = applyMovement(r1.state, 'p1', doubles2);
      expect(getConsecutiveDoubles(r2.state, 'p1')).toBe(2);

      const nonDoubles: DiceResult = { die1: 2, die2: 5, total: 7, isDoubles: false };
      const r3 = applyMovement(r2.state, 'p1', nonDoubles);
      expect(getConsecutiveDoubles(r3.state, 'p1')).toBe(0);
    });

    it('P1A.S3.T7: three consecutive doubles sends to jail', () => {
      const state = createInitialGameState(players, { gameId: 'test-game' });

      const doubles1: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
      const r1 = applyMovement(state, 'p1', doubles1);

      const doubles2: DiceResult = { die1: 4, die2: 4, total: 8, isDoubles: true };
      const r2 = applyMovement(r1.state, 'p1', doubles2);

      const doubles3: DiceResult = { die1: 5, die2: 5, total: 10, isDoubles: true };
      const r3 = applyMovement(r2.state, 'p1', doubles3);

      const player = r3.state.players[0];
      expect(player.position).toBe(10);
      expect(player.jailStatus).toEqual({ inJail: true, turnsInJail: 0 });
      expect(r3.sentToJail).toBe(true);
    });
  });
});
