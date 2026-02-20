import { describe, it, expect } from 'vitest';
import { sendToJail, payJailFine, useJailCard, rollInJail } from '../../engine/jail';
import { createInitialGameState, type PlayerSetup } from '../../engine/state';
import type { GameState } from '../../types/gameState';
import type { DiceResult } from '../../engine/dice';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

function makeState(): GameState {
  return createInitialGameState(players, { gameId: 'test-jail' });
}

describe('Step 1A.8 — Jail Logic', () => {
  describe('sendToJail', () => {
    it('P1A.S8.T1: sets position to 10, jailStatus inJail, resets doubles', () => {
      const state = makeState();
      state.players[0].position = 30;
      const newState = sendToJail(state, 'p1');
      expect(newState.players[0].position).toBe(10);
      expect(newState.players[0].jailStatus).toEqual({ inJail: true, turnsInJail: 0 });
    });

    it('P1A.S8.T2: does NOT award $200 even if "passing" Go', () => {
      const state = makeState();
      state.players[0].position = 35;
      const newState = sendToJail(state, 'p1');
      expect(newState.players[0].cash).toBe(1500);
    });
  });

  describe('payJailFine', () => {
    it('P1A.S8.T3: deducts $50, sets free', () => {
      const state = makeState();
      state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
      const newState = payJailFine(state, 'p1');
      expect(newState.players[0].cash).toBe(1450);
      expect(newState.players[0].jailStatus).toEqual({ inJail: false });
    });

    it('P1A.S8.T4: rejects if player has less than $50', () => {
      const state = makeState();
      state.players[0].cash = 30;
      state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
      expect(() => payJailFine(state, 'p1')).toThrow('cannot afford');
    });
  });

  describe('useJailCard', () => {
    it('P1A.S8.T5: removes GOOJF card, frees from jail', () => {
      const state = makeState();
      state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
      state.players[0].getOutOfJailFreeCards = 1;
      const newState = useJailCard(state, 'p1');
      expect(newState.players[0].getOutOfJailFreeCards).toBe(0);
      expect(newState.players[0].jailStatus).toEqual({ inJail: false });
    });

    it('P1A.S8.T6: rejects without GOOJF card', () => {
      const state = makeState();
      state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
      state.players[0].getOutOfJailFreeCards = 0;
      expect(() => useJailCard(state, 'p1')).toThrow('does not have');
    });
  });

  describe('rollInJail', () => {
    it('P1A.S8.T7: doubles → exits jail and moves', () => {
      const state = makeState();
      state.players[0].position = 10;
      state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
      const dice: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
      const result = rollInJail(state, 'p1', dice);
      expect(result.freedFromJail).toBe(true);
      expect(result.state.players[0].jailStatus).toEqual({ inJail: false });
      expect(result.state.players[0].position).toBe(16);
    });

    it('P1A.S8.T8: non-doubles → stays in jail, turnsInJail increments', () => {
      const state = makeState();
      state.players[0].position = 10;
      state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
      const dice: DiceResult = { die1: 2, die2: 5, total: 7, isDoubles: false };
      const result = rollInJail(state, 'p1', dice);
      expect(result.freedFromJail).toBe(false);
      expect(result.state.players[0].position).toBe(10);
      expect(result.state.players[0].jailStatus).toEqual({ inJail: true, turnsInJail: 1 });
    });

    it('P1A.S8.T9: 3rd failed roll → forced to pay $50 and move', () => {
      const state = makeState();
      state.players[0].position = 10;
      state.players[0].jailStatus = { inJail: true, turnsInJail: 2 };
      const dice: DiceResult = { die1: 2, die2: 5, total: 7, isDoubles: false };
      const result = rollInJail(state, 'p1', dice);
      expect(result.freedFromJail).toBe(true);
      expect(result.forcedExit).toBe(true);
      expect(result.state.players[0].cash).toBe(1450);
      expect(result.state.players[0].position).toBe(17);
      expect(result.state.players[0].jailStatus).toEqual({ inJail: false });
    });
  });
});
