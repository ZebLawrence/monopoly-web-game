import { describe, it, expect, beforeEach } from 'vitest';
import {
  declareBankruptcy,
  getWinner,
  calculateNetWorth,
  calculateLiquidationValue,
  canPlayerAfford,
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
  const state = createInitialGameState(players, { gameId: 'test-phase4' });
  initBuildingSupply(state);
  return state;
}

describe('Phase 4.1 — Bankruptcy Flow', () => {
  beforeEach(() => {
    resetPropertyStates('test-phase4');
    resetBuildingSupply('test-phase4');
  });

  describe('Debt detection', () => {
    it('P4.S1.T1: detects when player cannot afford amount', () => {
      const state = makeState();
      state.players[0].cash = 50;
      state.players[0].properties = [];

      expect(canPlayerAfford(state, 'p1', 100)).toBe(false);
      expect(canPlayerAfford(state, 'p1', 50)).toBe(true);
    });

    it('P4.S1.T1: includes liquidation value in affordability check', () => {
      const state = makeState();
      state.players[0].cash = 50;
      state.players[0].properties = [1]; // Mediterranean ($30 mortgage)
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });

      // Can afford 50 cash + 30 mortgage = 80
      expect(canPlayerAfford(state, 'p1', 80)).toBe(true);
      expect(canPlayerAfford(state, 'p1', 81)).toBe(false);
    });
  });

  describe('Liquidation assistant', () => {
    it('P4.S1.T2: lists sellable buildings with refund values', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false }); // 2 houses on Med
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      const value = calculateLiquidationValue(state, 'p1');
      // 2 houses at $50/2 = $50, mortgage for Med $30, mortgage for Baltic $30 = $110
      expect(value).toBe(110);
    });

    it('P4.S1.T3: lists mortgageable properties with values', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true }); // Already mortgaged

      const value = calculateLiquidationValue(state, 'p1');
      // Only Med can be mortgaged ($30)
      expect(value).toBe(30);
    });

    it('P4.S1.T4: running total updates as player sells/mortgages', () => {
      const state = makeState();
      state.players[0].cash = 100;
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      const totalBefore = state.players[0].cash + calculateLiquidationValue(state, 'p1');
      // Cash: 100, house sell: $25, mortgages: $30+$30 = $185
      expect(totalBefore).toBe(185);
    });
  });

  describe('Bankruptcy declaration', () => {
    it('P4.S1.T5: DeclareBankruptcy action type exists', () => {
      // Verify the action type compiles
      const action: import('../../types/gameAction').GameAction = {
        type: 'DeclareBankruptcy',
        creditorId: 'bank',
      };
      expect(action.type).toBe('DeclareBankruptcy');
    });

    it('P4.S1.T6: bankruptcy to player transfers all assets', () => {
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
      expect(bankrupt.isActive).toBe(false);
      expect(bankrupt.isBankrupt).toBe(true);
      expect(creditor.cash).toBe(1700); // 1500 + 200
      expect(creditor.properties).toContain(3);
      expect(creditor.properties).toContain(6);
      expect(creditor.getOutOfJailFreeCards).toBe(1);
    });

    it('P4.S1.T7: bankruptcy to bank makes properties unowned', () => {
      const state = makeState();
      state.players[0].cash = 100;
      state.players[0].properties = [3, 6];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const newState = declareBankruptcy(state, 'p1', 'bank');
      expect(newState.players[0].isActive).toBe(false);
      expect(newState.players[0].isBankrupt).toBe(true);

      // No player owns the properties
      for (const p of newState.players) {
        expect(p.properties).not.toContain(3);
        expect(p.properties).not.toContain(6);
      }
    });

    it('P4.S1.T8: eliminated player is marked bankrupt', () => {
      const state = makeState();
      const newState = declareBankruptcy(state, 'p1', 'bank');
      expect(newState.players[0].isBankrupt).toBe(true);
      expect(newState.players[0].isActive).toBe(false);
    });
  });

  describe('Win condition', () => {
    it('P4.S2.T1: game ends when 1 player remains', () => {
      const state = makeState();
      const s1 = declareBankruptcy(state, 'p1', 'bank');
      expect(s1.status).toBe('playing');

      const s2 = declareBankruptcy(s1, 'p3', 'bank');
      expect(s2.status).toBe('finished');
      expect(getWinner(s2)).toBe('p2');
    });
  });

  describe('Net worth calculation', () => {
    it('P4.S2.T4: calculates cash + properties + buildings', () => {
      const state = makeState();
      state.players[0].cash = 500;
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 2, mortgaged: false }); // 2 houses × $50

      // Cash: 500, Med property: $60, Baltic property: $60, 2 houses: $100
      const nw = calculateNetWorth(state, 'p1');
      expect(nw).toBe(720);
    });
  });
});
