import { describe, it, expect, beforeEach } from 'vitest';
import {
  buyProperty,
  startAuction,
  placeBid,
  passBid,
  isAuctionComplete,
  resolveAuction,
  hasMonopoly,
  buildHouse,
  canBuildHouse,
  sellBuilding,
  mortgageProperty,
  unmortgageProperty,
  getBuildingSupply,
  setBuildingSupply,
  resetBuildingSupply,
  initBuildingSupply,
} from '../../engine/properties';
import { setPropertyState, resetPropertyStates, getPropertyState } from '../../engine/spaces';
import { createInitialGameState, type PlayerSetup } from '../../engine/state';
import type { GameState } from '../../types/gameState';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
];

function makeState(): GameState {
  const state = createInitialGameState(players, { gameId: 'test-props' });
  initBuildingSupply(state);
  return state;
}

describe('Step 1A.6 — Property Management Logic', () => {
  beforeEach(() => {
    resetPropertyStates('test-props');
    resetBuildingSupply('test-props');
  });

  describe('buyProperty', () => {
    it('P1A.S6.T1: transfers ownership and deducts cost', () => {
      const state = makeState();
      state.players[0].position = 3; // Baltic ($60)
      const newState = buyProperty(state, 'p1', 3);
      expect(newState.players[0].cash).toBe(1440);
      expect(newState.players[0].properties).toContain(3);
    });

    it('P1A.S6.T2: rejects if already owned', () => {
      const state = makeState();
      state.players[0].position = 3;
      state.players[1].properties = [3];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      expect(() => buyProperty(state, 'p1', 3)).toThrow('already owned');
    });

    it('P1A.S6.T2: rejects if insufficient funds', () => {
      const state = makeState();
      state.players[0].position = 39; // Boardwalk ($400)
      state.players[0].cash = 100;
      expect(() => buyProperty(state, 'p1', 39)).toThrow('cannot afford');
    });
  });

  describe('auction', () => {
    it('P1A.S6.T3: starts auction with all active players eligible', () => {
      const state = makeState();
      const auction = startAuction(state, 3);
      expect(auction.propertyId).toBe(3);
      expect(auction.eligiblePlayers).toHaveLength(3);
      expect(auction.highBid).toBe(0);
    });

    it('P1A.S6.T4: accepts valid bid', () => {
      const state = makeState();
      startAuction(state, 3);
      const auction = placeBid(state, 'p1', 50);
      expect(auction.highBid).toBe(50);
      expect(auction.highBidderId).toBe('p1');
    });

    it('P1A.S6.T4: rejects bid lower than current', () => {
      const state = makeState();
      startAuction(state, 3);
      placeBid(state, 'p1', 50);
      expect(() => placeBid(state, 'p2', 20)).toThrow();
    });

    it('P1A.S6.T5: rejects bid exceeding player cash', () => {
      const state = makeState();
      state.players[0].cash = 100;
      startAuction(state, 3);
      expect(() => placeBid(state, 'p1', 150)).toThrow();
    });

    it('P1A.S6.T6: pass marks player as passed', () => {
      const state = makeState();
      startAuction(state, 3);
      passBid(state, 'p2');
      const auction = passBid(state, 'p3');
      expect(auction.passedPlayers).toContain('p2');
      expect(auction.passedPlayers).toContain('p3');
    });

    it('P1A.S6.T7: last remaining bidder wins', () => {
      const state = makeState();
      startAuction(state, 3);
      placeBid(state, 'p1', 30);
      passBid(state, 'p2');
      passBid(state, 'p3');
      expect(isAuctionComplete(state)).toBe(true);
    });

    it('P1A.S6.T8: auction resolution transfers property', () => {
      const state = makeState();
      startAuction(state, 3);
      placeBid(state, 'p2', 40);
      passBid(state, 'p1');
      passBid(state, 'p3');
      const newState = resolveAuction(state);
      expect(newState.players[1].properties).toContain(3);
      expect(newState.players[1].cash).toBe(1460);
    });

    it('P1A.S6.T9: all pass → property remains unowned', () => {
      const state = makeState();
      startAuction(state, 3);
      passBid(state, 'p1');
      passBid(state, 'p2');
      passBid(state, 'p3');
      const newState = resolveAuction(state);
      for (const p of newState.players) {
        expect(p.properties).not.toContain(3);
      }
    });
  });

  describe('monopoly detection', () => {
    it('P1A.S6.T10: hasMonopoly returns true when all owned', () => {
      const state = makeState();
      state.players[0].properties = [1, 3]; // Mediterranean + Baltic (brown)
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      expect(hasMonopoly(state, 'p1', 'brown')).toBe(true);
    });

    it('P1A.S6.T10: hasMonopoly returns false when partial', () => {
      const state = makeState();
      state.players[0].properties = [1]; // Only Mediterranean
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      expect(hasMonopoly(state, 'p1', 'brown')).toBe(false);
    });
  });

  describe('buildHouse', () => {
    it('P1A.S6.T11: builds house on monopoly property', () => {
      const state = makeState();
      state.players[0].properties = [1, 3]; // Brown monopoly
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      const newState = buildHouse(state, 'p1', 3);
      const prop = getPropertyState(newState, 3);
      expect(prop?.houses).toBe(1);
      expect(newState.players[0].cash).toBe(1450); // $50 house cost
    });

    it('P1A.S6.T12: rejects without monopoly', () => {
      const state = makeState();
      state.players[0].properties = [3]; // Only Baltic
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      expect(() => buildHouse(state, 'p1', 3)).toThrow('Must own all');
    });

    it('P1A.S6.T13: enforces even-build rule', () => {
      const state = makeState();
      state.players[0].properties = [1, 3]; // Brown monopoly
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 1, mortgaged: false });
      // Can't build on Baltic (1) when Med has 0
      expect(canBuildHouse(state, 'p1', 3)).toContain('fewer');
    });

    it('P1A.S6.T14/T15: 4 houses → hotel upgrade', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 4, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 4, mortgaged: false });
      const supply = getBuildingSupply(state);
      const beforeHouses = supply.houses;
      const beforeHotels = supply.hotels;
      const newState = buildHouse(state, 'p1', 3);
      const prop = getPropertyState(newState, 3);
      expect(prop?.houses).toBe(5); // Hotel
      const newSupply = getBuildingSupply(newState);
      expect(newSupply.houses).toBe(beforeHouses + 4); // 4 returned
      expect(newSupply.hotels).toBe(beforeHotels - 1);
    });

    it('P1A.S6.T16: initial building supply is 32 houses, 12 hotels', () => {
      const state = makeState();
      const supply = getBuildingSupply(state);
      expect(supply.houses).toBe(32);
      expect(supply.hotels).toBe(12);
    });

    it('P1A.S6.T16: building reduces supply', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

      let s = buildHouse(state, 'p1', 1);
      s = buildHouse(s, 'p1', 3);
      s = buildHouse(s, 'p1', 1);
      const supply = getBuildingSupply(s);
      expect(supply.houses).toBe(29);
    });

    it('P1A.S6.T17: rejects when no houses in supply', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      setBuildingSupply(state, { houses: 0, hotels: 12 });
      expect(canBuildHouse(state, 'p1', 1)).toContain('No houses');
    });
  });

  describe('sellBuilding', () => {
    it('P1A.S6.T18: sells house and refunds half price', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 1, mortgaged: false });
      const newState = sellBuilding(state, 'p1', 3);
      const prop = getPropertyState(newState, 3);
      expect(prop?.houses).toBe(0);
      expect(newState.players[0].cash).toBe(1525); // +$25 (half of $50)
    });

    it('P1A.S6.T19: even-sell rule', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 1, mortgaged: false });
      // Can sell from 1 (has 2, other has 1) → result: both have 1
      const s = sellBuilding(state, 'p1', 1);
      expect(getPropertyState(s, 1)?.houses).toBe(1);

      // Both at 1, can sell from either
      const s2 = sellBuilding(s, 'p1', 1);
      expect(getPropertyState(s2, 1)?.houses).toBe(0);
    });

    it('P1A.S6.T20: hotel downgrade returns to 4 houses', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });
      const supply = getBuildingSupply(state);
      const beforeHouses = supply.houses;
      const beforeHotels = supply.hotels;

      const newState = sellBuilding(state, 'p1', 3);
      expect(getPropertyState(newState, 3)?.houses).toBe(4);
      const newSupply = getBuildingSupply(newState);
      expect(newSupply.houses).toBe(beforeHouses - 4);
      expect(newSupply.hotels).toBe(beforeHotels + 1);
    });

    it('P1A.S6.T21: hotel downgrade blocked if not enough houses', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });
      setBuildingSupply(state, { houses: 2, hotels: 10 });
      expect(() => sellBuilding(state, 'p1', 3)).toThrow('not enough houses');
    });
  });

  describe('mortgage', () => {
    it('P1A.S6.T22: mortgages property, gives half value', () => {
      const state = makeState();
      state.players[0].properties = [3]; // Baltic (mortgage $30)
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      const newState = mortgageProperty(state, 'p1', 3);
      expect(newState.players[0].cash).toBe(1530);
      expect(getPropertyState(newState, 3)?.mortgaged).toBe(true);
    });

    it('P1A.S6.T23: rejects mortgage if buildings in color group', () => {
      const state = makeState();
      state.players[0].properties = [1, 3];
      setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      expect(() => mortgageProperty(state, 'p1', 3)).toThrow('buildings exist');
    });

    it('P1A.S6.T24: unmortgages with 10% interest', () => {
      const state = makeState();
      state.players[0].properties = [3]; // Baltic (mortgage $30)
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
      const newState = unmortgageProperty(state, 'p1', 3);
      expect(newState.players[0].cash).toBe(1467); // 1500 - 33 ($30 + $3 interest)
      expect(getPropertyState(newState, 3)?.mortgaged).toBe(false);
    });

    it('P1A.S6.T25: rejects unmortgage if insufficient funds', () => {
      const state = makeState();
      state.players[0].properties = [3];
      state.players[0].cash = 20;
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
      expect(() => unmortgageProperty(state, 'p1', 3)).toThrow('Cannot afford');
    });
  });

  describe('mortgage/unmortgage for railroad and utility', () => {
    it('P1A.S4.T20: mortgage Reading Railroad → receive $100', () => {
      const state = makeState();
      state.players[0].properties = [5]; // Reading Railroad
      setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
      const newState = mortgageProperty(state, 'p1', 5);
      expect(newState.players[0].cash).toBe(1600); // 1500 + 100
    });

    it('P1A.S4.T20: mortgage Electric Company → receive $75', () => {
      const state = makeState();
      state.players[0].properties = [12]; // Electric Company
      setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
      const newState = mortgageProperty(state, 'p1', 12);
      expect(newState.players[0].cash).toBe(1575); // 1500 + 75
    });
  });
});
