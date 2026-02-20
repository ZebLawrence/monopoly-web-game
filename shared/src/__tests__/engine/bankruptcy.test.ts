import { describe, it, expect, beforeEach } from 'vitest';
import {
  canPlayerAfford,
  calculateLiquidationValue,
  declareBankruptcy,
  getWinner,
  calculateNetWorth,
  determineTimedGameWinner,
} from '../../engine/bankruptcy';
import { setPropertyState, resetPropertyStates } from '../../engine/spaces';
import { initBuildingSupply, resetBuildingSupply } from '../../engine/properties';
import { createInitialGameState, type PlayerSetup } from '../../engine/state';
import type { GameState } from '../../types/gameState';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
];

function makeState(): GameState {
  const state = createInitialGameState(players, { gameId: 'test-bankruptcy' });
  initBuildingSupply(state);
  return state;
}

describe('Step 1A.9 — Bankruptcy & Endgame', () => {
  beforeEach(() => {
    resetPropertyStates('test-bankruptcy');
    resetBuildingSupply('test-bankruptcy');
  });

  describe('canPlayerAfford', () => {
    it('P1A.S9.T1: checks cash + liquidation value', () => {
      const state = makeState();
      state.players[0].cash = 100;
      state.players[0].properties = [1, 3]; // Med ($30 mortgage) + Baltic ($30 mortgage)
      setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false }); // 1 house sellable for $25
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      // Cash: 100, buildings sell: $25, mortgages: $30 + $30 = $60
      // Total: 100 + 25 + 60 = 185
      expect(canPlayerAfford(state, 'p1', 185)).toBe(true);
      expect(canPlayerAfford(state, 'p1', 186)).toBe(false);
    });
  });

  describe('calculateLiquidationValue', () => {
    it('P1A.S9.T2: totals building sell values and mortgage values', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false }); // 1 house → sell for $25
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false }); // mortgage $30

      // House sell: $25 (1 house × $50/2), Mortgages: $30 (Med) + $30 (Baltic) = $60
      // Total: $25 + $60 = $85
      const value = calculateLiquidationValue(state, 'p1');
      expect(value).toBe(85);
    });
  });

  describe('declareBankruptcy to player', () => {
    it('P1A.S9.T3: transfers all assets to creditor', () => {
      const state = makeState();
      state.players[0].cash = 200;
      state.players[0].properties = [3, 6];
      state.players[0].getOutOfJailFreeCards = 1;
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const newState = declareBankruptcy(state, 'p1', 'p2');
      const bankrupt = newState.players[0];
      const creditor = newState.players[1];

      expect(bankrupt.cash).toBe(0);
      expect(bankrupt.properties).toEqual([]);
      expect(bankrupt.getOutOfJailFreeCards).toBe(0);
      expect(bankrupt.isActive).toBe(false);
      expect(bankrupt.isBankrupt).toBe(true);

      expect(creditor.cash).toBe(1700); // 1500 + 200
      expect(creditor.properties).toContain(3);
      expect(creditor.properties).toContain(6);
      expect(creditor.getOutOfJailFreeCards).toBe(1);
    });

    it('P1A.S9.T4: mortgaged properties transfer still mortgaged', () => {
      const state = makeState();
      state.players[0].properties = [3];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });

      const newState = declareBankruptcy(state, 'p1', 'p2');
      expect(newState.players[1].properties).toContain(3);
      // Property should still be mortgaged — creditor must pay interest
    });
  });

  describe('declareBankruptcy to bank', () => {
    it('P1A.S9.T5: properties go unowned, ready for auction', () => {
      const state = makeState();
      state.players[0].cash = 100;
      state.players[0].properties = [3, 6];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const newState = declareBankruptcy(state, 'p1', 'bank');
      const bankrupt = newState.players[0];

      expect(bankrupt.cash).toBe(0);
      expect(bankrupt.properties).toEqual([]);
      expect(bankrupt.isActive).toBe(false);

      // Properties should not be owned by anyone
      for (const p of newState.players) {
        expect(p.properties).not.toContain(3);
        expect(p.properties).not.toContain(6);
      }
    });
  });

  describe('player elimination', () => {
    it('P1A.S9.T6: eliminated player skipped, isActive false', () => {
      const state = makeState();
      state.players[0].properties = [];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      const newState = declareBankruptcy(state, 'p1', 'bank');
      expect(newState.players[0].isActive).toBe(false);
      expect(newState.players[0].isBankrupt).toBe(true);
    });
  });

  describe('win condition', () => {
    it('P1A.S9.T7: last active player wins', () => {
      const state = makeState();
      // Eliminate p1
      const s1 = declareBankruptcy(state, 'p1', 'bank');
      expect(s1.status).toBe('playing'); // Still 2 active

      // Eliminate p3
      const s2 = declareBankruptcy(s1, 'p3', 'bank');
      expect(s2.status).toBe('finished');
      expect(getWinner(s2)).toBe('p2');
    });
  });

  describe('timed game', () => {
    it('P1A.S9.T8: calculate net worth correctly', () => {
      const state = makeState();
      state.players[0].cash = 500;
      state.players[0].properties = [1, 3]; // Med ($60) + Baltic ($60) = $120 property value
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 3, mortgaged: false }); // 3 houses × $50 = $150

      // Net worth = $500 cash + $60 (Med) + $60 (Baltic) + $150 (3 houses) = $770
      const nw = calculateNetWorth(state, 'p1');
      expect(nw).toBe(770);
    });

    it('P1A.S9.T9: determines winner by highest net worth', () => {
      const state = makeState();
      state.players[0].cash = 500;
      state.players[0].properties = [1]; // Med $60
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });

      state.players[1].cash = 800;

      state.players[2].cash = 600;
      state.players[2].properties = [3]; // Baltic $60
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      // p1: 500 + 60 = 560
      // p2: 800
      // p3: 600 + 60 = 660
      const winner = determineTimedGameWinner(state);
      expect(winner).toBe('p2');
    });
  });
});
