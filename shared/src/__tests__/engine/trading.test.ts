import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTradeOffer,
  acceptTrade,
  rejectTrade,
  counterTrade,
  storeTrade,
  getTrade,
  resetTrades,
} from '../../engine/trading';
import { setPropertyState, resetPropertyStates } from '../../engine/spaces';
import { createInitialGameState, type PlayerSetup } from '../../engine/state';
import type { GameState } from '../../types/gameState';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

function makeState(): GameState {
  return createInitialGameState(players, { gameId: 'test-trading' });
}

describe('Step 1A.7 — Trading Logic', () => {
  beforeEach(() => {
    resetPropertyStates('test-trading');
    resetTrades();
  });

  describe('createTradeOffer', () => {
    it('P1A.S7.T1: creates a trade offer in pending status', () => {
      const state = makeState();
      state.players[0].properties = [3]; // Alice owns Baltic
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[1].properties = [6]; // Bob owns Oriental
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const { trade } = createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [3],
        offeredCash: 100,
        offeredCards: 0,
        requestedProperties: [6],
        requestedCash: 0,
        requestedCards: 0,
      });

      expect(trade.status).toBe('pending');
      expect(trade.proposerId).toBe('p1');
      expect(trade.recipientId).toBe('p2');
      expect(trade.offeredProperties).toEqual([3]);
      expect(trade.offeredCash).toBe(100);
    });

    it("P1A.S7.T2: rejects if proposer doesn't own offered property", () => {
      const state = makeState();
      expect(() =>
        createTradeOffer(state, 'p1', 'p2', {
          offeredProperties: [3],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        }),
      ).toThrow('does not own');
    });

    it('P1A.S7.T2: rejects if offered cash exceeds balance', () => {
      const state = makeState();
      expect(() =>
        createTradeOffer(state, 'p1', 'p2', {
          offeredProperties: [],
          offeredCash: 2000,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        }),
      ).toThrow('cannot afford');
    });

    it("P1A.S7.T3: rejects if recipient doesn't own requested property", () => {
      const state = makeState();
      expect(() =>
        createTradeOffer(state, 'p1', 'p2', {
          offeredProperties: [],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [6],
          requestedCash: 0,
          requestedCards: 0,
        }),
      ).toThrow('does not own');
    });

    it('P1A.S7.T4: rejects trade with buildings in color group', () => {
      const state = makeState();
      state.players[0].properties = [1, 3]; // Brown monopoly
      setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      expect(() =>
        createTradeOffer(state, 'p1', 'p2', {
          offeredProperties: [3],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        }),
      ).toThrow('buildings exist');
    });
  });

  describe('acceptTrade', () => {
    it('P1A.S7.T5: executes atomic asset swap', () => {
      const state = makeState();
      state.players[0].properties = [3];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[1].properties = [6];
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const { trade } = createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [3],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [6],
        requestedCash: 0,
        requestedCards: 0,
      });
      storeTrade(trade);

      const newState = acceptTrade(state, trade.id);
      expect(newState.players[0].properties).toContain(6);
      expect(newState.players[0].properties).not.toContain(3);
      expect(newState.players[1].properties).toContain(3);
      expect(newState.players[1].properties).not.toContain(6);
    });

    it('P1A.S7.T6: complex trade with properties, cash, and GOOJF', () => {
      const state = makeState();
      state.players[0].properties = [3, 1];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      state.players[0].getOutOfJailFreeCards = 1;

      state.players[1].properties = [6];
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const { trade } = createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [3, 1],
        offeredCash: 200,
        offeredCards: 1,
        requestedProperties: [6],
        requestedCash: 0,
        requestedCards: 0,
      });
      storeTrade(trade);

      const newState = acceptTrade(state, trade.id);

      // Alice: lost 3, 1, $200, 1 GOOJF. Gained 6
      expect(newState.players[0].properties).toEqual([6]);
      expect(newState.players[0].cash).toBe(1300);
      expect(newState.players[0].getOutOfJailFreeCards).toBe(0);

      // Bob: gained 3, 1, $200, 1 GOOJF. Lost 6
      expect(newState.players[1].properties).toContain(3);
      expect(newState.players[1].properties).toContain(1);
      expect(newState.players[1].properties).not.toContain(6);
      expect(newState.players[1].cash).toBe(1700);
      expect(newState.players[1].getOutOfJailFreeCards).toBe(1);
    });
  });

  describe('rejectTrade', () => {
    it('P1A.S7.T7: marks trade as rejected, no state change', () => {
      const state = makeState();
      state.players[0].properties = [3];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      const { trade } = createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [3],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      });
      storeTrade(trade);

      const newState = rejectTrade(state, trade.id);
      expect(newState.players[0].properties).toContain(3);
      expect(newState.players[0].cash).toBe(1500);

      const rejectedTrade = getTrade(trade.id);
      expect(rejectedTrade?.status).toBe('rejected');
    });
  });

  describe('counterTrade', () => {
    it('P1A.S7.T8: creates counter-offer with swapped roles', () => {
      const state = makeState();
      state.players[0].properties = [3];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[1].properties = [6];
      setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

      const { trade } = createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [3],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [6],
        requestedCash: 0,
        requestedCards: 0,
      });
      storeTrade(trade);

      const { trade: counter } = counterTrade(state, trade.id, {
        offeredProperties: [6],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [3],
        requestedCash: 50,
        requestedCards: 0,
      });

      expect(counter.proposerId).toBe('p2'); // Swapped
      expect(counter.recipientId).toBe('p1');
      expect(counter.offeredProperties).toEqual([6]);
      expect(counter.requestedCash).toBe(50);
      expect(counter.status).toBe('pending');

      // Original marked as countered
      const original = getTrade(trade.id);
      expect(original?.status).toBe('countered');
    });
  });
});
