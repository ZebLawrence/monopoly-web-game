import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveSpace,
  applySpaceResolution,
  calculateRailroadRent,
  calculateUtilityRent,
  setPropertyState,
  resetPropertyStates,
} from '../../engine/spaces';
import { createInitialGameState, getSpaceByPosition, type PlayerSetup } from '../../engine/state';
import type { DiceResult } from '../../engine/dice';
import type { GameState } from '../../types/gameState';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

function makeState(): GameState {
  return createInitialGameState(players, { gameId: 'test-spaces' });
}

const defaultDice: DiceResult = { die1: 3, die2: 5, total: 8, isDoubles: false };

describe('Step 1A.4 — Space Resolution Engine', () => {
  beforeEach(() => {
    resetPropertyStates('test-spaces');
  });

  describe('resolveSpace dispatcher', () => {
    it('P1A.S4.T1: routes property space correctly', () => {
      const state = makeState();
      state.players[0].position = 1; // Mediterranean
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('unownedProperty');
    });

    it('P1A.S4.T1: routes tax space correctly', () => {
      const state = makeState();
      state.players[0].position = 4; // Income Tax
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('tax');
    });
  });

  describe('unowned property', () => {
    it('P1A.S4.T2: returns AwaitingBuyDecision with property details', () => {
      const state = makeState();
      state.players[0].position = 3; // Baltic Avenue
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('unownedProperty');
      expect(res.propertyDetails).toEqual({
        cost: 60,
        name: 'Baltic Avenue',
        spaceId: 3,
      });
    });
  });

  describe('owned property — street rent', () => {
    it('P1A.S4.T3: base rent with no monopoly', () => {
      const state = makeState();
      state.players[1].properties = [3]; // Bob owns Baltic
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[0].position = 3;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('rentPayment');
      expect(res.rentAmount).toBe(4); // Baltic base rent
    });

    it('P1A.S4.T4: monopoly doubles base rent', () => {
      const state = makeState();
      state.players[1].properties = [1, 3]; // Bob owns Mediterranean + Baltic (brown monopoly)
      setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[0].position = 3;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('rentPayment');
      expect(res.rentAmount).toBe(8); // Baltic $4 * 2 = $8
    });

    it('P1A.S4.T5: house/hotel rent tiers for Baltic', () => {
      const state = makeState();
      state.players[1].properties = [1, 3];
      // Baltic rentTiers: [4, 20, 60, 180, 320, 450]
      const expectedRents = [20, 60, 180, 320, 450];
      for (let houses = 1; houses <= 5; houses++) {
        setPropertyState(state, { spaceId: 3, houses, mortgaged: false });
        setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
        state.players[0].position = 3;
        const res = resolveSpace(state, 'p1', defaultDice);
        expect(res.rentAmount).toBe(expectedRents[houses - 1]);
      }
    });
  });

  describe('mortgaged property', () => {
    it('P1A.S4.T6: no rent charged on mortgaged property', () => {
      const state = makeState();
      state.players[1].properties = [3];
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
      state.players[0].position = 3;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('noAction');
    });
  });

  describe('railroad rent', () => {
    it('P1A.S4.T7: railroad rent scales with count', () => {
      expect(calculateRailroadRent(1)).toBe(25);
      expect(calculateRailroadRent(2)).toBe(50);
      expect(calculateRailroadRent(3)).toBe(100);
      expect(calculateRailroadRent(4)).toBe(200);
    });

    it('P1A.S4.T7: railroad rent in full resolution', () => {
      const state = makeState();
      state.players[1].properties = [5, 15]; // Reading + Pennsylvania RR
      setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
      state.players[0].position = 5;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('rentPayment');
      expect(res.rentAmount).toBe(50); // 2 railroads
    });
  });

  describe('utility rent', () => {
    it('P1A.S4.T8: 1 utility → dice × 4', () => {
      expect(calculateUtilityRent(8, 1)).toBe(32);
    });

    it('P1A.S4.T8: 2 utilities → dice × 10', () => {
      expect(calculateUtilityRent(8, 2)).toBe(80);
    });

    it('P1A.S4.T8: utility rent in full resolution', () => {
      const state = makeState();
      state.players[1].properties = [12]; // Electric Company
      setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
      state.players[0].position = 12;
      const dice: DiceResult = { die1: 4, die2: 4, total: 8, isDoubles: true };
      const res = resolveSpace(state, 'p1', dice);
      expect(res.type).toBe('rentPayment');
      expect(res.rentAmount).toBe(32); // 1 utility, dice 8, 8 * 4 = 32
    });
  });

  describe('tax resolution', () => {
    it('P1A.S4.T9: Income Tax deducts $200', () => {
      const state = makeState();
      state.players[0].position = 4;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('tax');
      expect(res.taxAmount).toBe(200);
      const newState = applySpaceResolution(state, 'p1', res);
      expect(newState.players[0].cash).toBe(1300);
    });

    it('P1A.S4.T10: Luxury Tax deducts $100', () => {
      const state = makeState();
      state.players[0].position = 38;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('tax');
      expect(res.taxAmount).toBe(100);
      const newState = applySpaceResolution(state, 'p1', res);
      expect(newState.players[0].cash).toBe(1400);
    });
  });

  describe('Go To Jail', () => {
    it('P1A.S4.T11: sends to jail, no $200', () => {
      const state = makeState();
      state.players[0].position = 30;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('goToJail');
      const newState = applySpaceResolution(state, 'p1', res);
      expect(newState.players[0].position).toBe(10);
      expect(newState.players[0].jailStatus).toEqual({ inJail: true, turnsInJail: 0 });
      expect(newState.players[0].cash).toBe(1500); // no $200
    });
  });

  describe('card spaces', () => {
    it('P1A.S4.T12: Chance triggers card draw', () => {
      const state = makeState();
      state.players[0].position = 7;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('drawCard');
      expect(res.deckName).toBe('chance');
    });

    it('P1A.S4.T13: Community Chest triggers card draw', () => {
      const state = makeState();
      state.players[0].position = 2;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('drawCard');
      expect(res.deckName).toBe('communityChest');
    });
  });

  describe('corner spaces', () => {
    it('P1A.S4.T14: Free Parking is no-op', () => {
      const state = makeState();
      state.players[0].position = 20;
      const prevCash = state.players[0].cash;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('noAction');
      const newState = applySpaceResolution(state, 'p1', res);
      expect(newState.players[0].cash).toBe(prevCash);
    });

    it('P1A.S4.T15: Just Visiting is no-op', () => {
      const state = makeState();
      state.players[0].position = 10;
      state.players[0].jailStatus = { inJail: false };
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('noAction');
    });

    it('P1A.S4.T16: Landing on Go awards $200 (via movement)', () => {
      const state = makeState();
      state.players[0].position = 0;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('noAction');
      // $200 is handled by applyMovement, not space resolution
    });
  });

  describe('own property', () => {
    it('P1A.S4.T17: landing on own property charges no rent', () => {
      const state = makeState();
      state.players[0].properties = [3]; // Alice owns Baltic
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[0].position = 3;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('ownProperty');
      const newState = applySpaceResolution(state, 'p1', res);
      expect(newState.players[0].cash).toBe(1500);
    });
  });

  describe('rent tier validation', () => {
    it('P1A.S4.T18: validates rent tiers for one property per color group', () => {
      const state = makeState();

      // Mediterranean (Brown) - pos 1: base $2
      const med = getSpaceByPosition(state, 1)!;
      expect(med.rentTiers![0]).toBe(2);
      // Oriental (LightBlue) - pos 6: base $6
      const ori = getSpaceByPosition(state, 6)!;
      expect(ori.rentTiers![0]).toBe(6);
      // St. Charles (Pink) - pos 11: base $10
      const stc = getSpaceByPosition(state, 11)!;
      expect(stc.rentTiers![0]).toBe(10);
      // St. James (Orange) - pos 16: base $14
      const stj = getSpaceByPosition(state, 16)!;
      expect(stj.rentTiers![0]).toBe(14);
      // Kentucky (Red) - pos 21: base $18
      const ken = getSpaceByPosition(state, 21)!;
      expect(ken.rentTiers![0]).toBe(18);
      // Atlantic (Yellow) - pos 26: base $22
      const atl = getSpaceByPosition(state, 26)!;
      expect(atl.rentTiers![0]).toBe(22);
      // Pacific (Green) - pos 31: base $26
      const pac = getSpaceByPosition(state, 31)!;
      expect(pac.rentTiers![0]).toBe(26);
      // Park Place (DarkBlue) - pos 37: base $35
      const pp = getSpaceByPosition(state, 37)!;
      expect(pp.rentTiers![0]).toBe(35);
    });

    it('P1A.S4.T19: validates Boardwalk rent tiers', () => {
      const state = makeState();
      const bw = getSpaceByPosition(state, 39)!;
      // base $50, 1 house $200, 2 houses $600, 3 houses $1400, 4 houses $1700, hotel $2000
      expect(bw.rentTiers).toEqual([50, 200, 600, 1400, 1700, 2000]);
    });

    it('P1A.S4.T20: validates railroad and utility mortgage values', () => {
      const state = makeState();
      // Reading Railroad - pos 5: mortgage $100
      const reading = getSpaceByPosition(state, 5)!;
      expect(reading.mortgageValue).toBe(100);
      // Electric Company - pos 12: mortgage $75
      const electric = getSpaceByPosition(state, 12)!;
      expect(electric.mortgageValue).toBe(75);
    });
  });

  describe('rent application', () => {
    it('transfers rent from landing player to owner', () => {
      const state = makeState();
      state.players[1].properties = [3]; // Bob owns Baltic
      setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
      state.players[0].position = 3;
      const res = resolveSpace(state, 'p1', defaultDice);
      const newState = applySpaceResolution(state, 'p1', res);
      expect(newState.players[0].cash).toBe(1500 - 4); // Alice pays $4
      expect(newState.players[1].cash).toBe(1500 + 4); // Bob receives $4
    });
  });
});
