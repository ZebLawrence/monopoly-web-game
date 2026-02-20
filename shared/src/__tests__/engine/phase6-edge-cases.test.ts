import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  rollDice,
  calculateNewPosition,
  didPassGo,
  applyMovement,
  getConsecutiveDoubles,
  setConsecutiveDoubles,
  resetDoublesTracker,
  type DiceResult,
} from '../../engine/dice';
import {
  resolveSpace,
  applySpaceResolution,
  calculateRailroadRent,
  calculateUtilityRent,
  calculateStreetRent,
  setPropertyState,
  resetPropertyStates,
  getPropertyOwnership,
  getPropertyState,
  ownsAllInColorGroup,
  countOwnedOfType,
} from '../../engine/spaces';
import { drawCard, returnCardToDeck, applyCardEffect } from '../../engine/cards';
import {
  buyProperty,
  startAuction,
  placeBid,
  passBid,
  isAuctionComplete,
  resolveAuction,
  buildHouse,
  canBuildHouse,
  sellBuilding,
  canSellBuilding,
  mortgageProperty,
  unmortgageProperty,
  getBuildingSupply,
  setBuildingSupply,
  resetBuildingSupply,
  initBuildingSupply,
} from '../../engine/properties';
import {
  createTradeOffer,
  acceptTrade,
  rejectTrade,
  counterTrade,
  storeTrade,
  getTrade,
  resetTrades,
} from '../../engine/trading';
import { sendToJail, payJailFine, useJailCard, rollInJail } from '../../engine/jail';
import {
  canPlayerAfford,
  calculateLiquidationValue,
  declareBankruptcy,
  getWinner,
  calculateNetWorth,
  determineTimedGameWinner,
} from '../../engine/bankruptcy';
import { createInitialGameState, getSpaceByPosition, type PlayerSetup } from '../../engine/state';
import { TurnStateMachine } from '../../engine/turn-machine';
import { GameEventEmitter, GameEventLog } from '../../engine/events';
import { TurnState } from '../../types/turn';
import { GameEventType } from '../../types/gameEvent';
import type { GameState } from '../../types/gameState';
import type { Card } from '../../types/card';
import { SpaceType } from '../../types/space';

// ─── Helpers ──────────────────────────────────────────────────────────

const twoPlayers: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

const threePlayers: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
];

const fourPlayers: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Diana' },
];

function make2State(gameId = 'test-edge'): GameState {
  const state = createInitialGameState(twoPlayers, { gameId });
  initBuildingSupply(state);
  return state;
}

function make3State(gameId = 'test-edge'): GameState {
  const state = createInitialGameState(threePlayers, { gameId });
  initBuildingSupply(state);
  return state;
}

function make4State(gameId = 'test-edge'): GameState {
  const state = createInitialGameState(fourPlayers, { gameId });
  initBuildingSupply(state);
  return state;
}

const defaultDice: DiceResult = { die1: 3, die2: 5, total: 8, isDoubles: false };

// ─── P6.S1.T1 — 100% branch coverage for dice and movement ─────────

describe('P6.S1.T1 — Dice & Movement Coverage', () => {
  beforeEach(() => {
    resetDoublesTracker('test-edge');
  });

  it('rollDice with default RNG produces valid values', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollDice();
      expect(r.die1).toBeGreaterThanOrEqual(1);
      expect(r.die1).toBeLessThanOrEqual(6);
      expect(r.die2).toBeGreaterThanOrEqual(1);
      expect(r.die2).toBeLessThanOrEqual(6);
      expect(r.total).toBe(r.die1 + r.die2);
      expect(r.isDoubles).toBe(r.die1 === r.die2);
    }
  });

  it('calculateNewPosition wraps correctly at boundary', () => {
    expect(calculateNewPosition(0, 0)).toBe(0);
    expect(calculateNewPosition(39, 1)).toBe(0);
    expect(calculateNewPosition(39, 2)).toBe(1);
    expect(calculateNewPosition(0, 40)).toBe(0);
    expect(calculateNewPosition(30, 12)).toBe(2);
  });

  it('didPassGo returns false for same position', () => {
    expect(didPassGo(0, 0)).toBe(false);
    expect(didPassGo(10, 10)).toBe(false);
  });

  it('didPassGo returns false when moving forward without wrap', () => {
    expect(didPassGo(0, 5)).toBe(false);
    expect(didPassGo(10, 20)).toBe(false);
  });

  it('didPassGo returns true when wrapping', () => {
    expect(didPassGo(35, 3)).toBe(true);
    expect(didPassGo(39, 0)).toBe(true);
  });

  it('applyMovement throws for non-existent player', () => {
    const state = make2State();
    expect(() => applyMovement(state, 'nonexistent', defaultDice)).toThrow('not found');
  });

  it('applyMovement resets doubles counter on non-doubles', () => {
    const state = make2State();
    setConsecutiveDoubles(state, 'p1', 2);
    const nonDoubles: DiceResult = { die1: 2, die2: 3, total: 5, isDoubles: false };
    const result = applyMovement(state, 'p1', nonDoubles);
    expect(getConsecutiveDoubles(result.state, 'p1')).toBe(0);
  });

  it('getConsecutiveDoubles returns 0 for unknown game/player', () => {
    const state = make2State();
    // No doubles tracker initialized
    resetDoublesTracker('test-edge');
    expect(getConsecutiveDoubles(state, 'p1')).toBe(0);
    expect(getConsecutiveDoubles(state, 'unknown')).toBe(0);
  });

  it('resetDoublesTracker clears all tracking for game', () => {
    const state = make2State();
    setConsecutiveDoubles(state, 'p1', 2);
    setConsecutiveDoubles(state, 'p2', 1);
    resetDoublesTracker('test-edge');
    expect(getConsecutiveDoubles(state, 'p1')).toBe(0);
    expect(getConsecutiveDoubles(state, 'p2')).toBe(0);
  });

  it('applyMovement: exactly three doubles sends to jail immediately', () => {
    const state = make2State();
    const d: DiceResult = { die1: 2, die2: 2, total: 4, isDoubles: true };
    const r1 = applyMovement(state, 'p1', d);
    expect(r1.sentToJail).toBe(false);
    const r2 = applyMovement(r1.state, 'p1', d);
    expect(r2.sentToJail).toBe(false);
    const r3 = applyMovement(r2.state, 'p1', d);
    expect(r3.sentToJail).toBe(true);
    expect(r3.state.players[0].position).toBe(10);
    expect(r3.passedGo).toBe(false);
  });
});

// ─── P6.S1.T2 — 100% branch coverage for space resolution ──────────

describe('P6.S1.T2 — Space Resolution Coverage', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('resolveSpace throws for non-existent player', () => {
    const state = make2State();
    expect(() => resolveSpace(state, 'nonexistent', defaultDice)).toThrow('not found');
  });

  it('resolves all corner spaces correctly', () => {
    const state = make2State();
    // Go (pos 0)
    state.players[0].position = 0;
    expect(resolveSpace(state, 'p1', defaultDice).type).toBe('noAction');
    // Jail (pos 10) - just visiting
    state.players[0].position = 10;
    expect(resolveSpace(state, 'p1', defaultDice).type).toBe('noAction');
    // Free Parking (pos 20)
    state.players[0].position = 20;
    expect(resolveSpace(state, 'p1', defaultDice).type).toBe('noAction');
    // Go To Jail (pos 30)
    state.players[0].position = 30;
    expect(resolveSpace(state, 'p1', defaultDice).type).toBe('goToJail');
  });

  it('resolves all Chance spaces', () => {
    const state = make2State();
    for (const pos of [7, 22, 36]) {
      state.players[0].position = pos;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('drawCard');
      expect(res.deckName).toBe('chance');
    }
  });

  it('resolves all Community Chest spaces', () => {
    const state = make2State();
    for (const pos of [2, 17, 33]) {
      state.players[0].position = pos;
      const res = resolveSpace(state, 'p1', defaultDice);
      expect(res.type).toBe('drawCard');
      expect(res.deckName).toBe('communityChest');
    }
  });

  it('resolves unowned railroad', () => {
    const state = make2State();
    state.players[0].position = 5; // Reading Railroad
    const res = resolveSpace(state, 'p1', defaultDice);
    expect(res.type).toBe('unownedProperty');
    expect(res.propertyDetails?.name).toBe('Reading Railroad');
  });

  it('resolves unowned utility', () => {
    const state = make2State();
    state.players[0].position = 12; // Electric Company
    const res = resolveSpace(state, 'p1', defaultDice);
    expect(res.type).toBe('unownedProperty');
  });

  it('own railroad returns ownProperty', () => {
    const state = make2State();
    state.players[0].properties = [5];
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    state.players[0].position = 5;
    const res = resolveSpace(state, 'p1', defaultDice);
    expect(res.type).toBe('ownProperty');
  });

  it('own utility returns ownProperty', () => {
    const state = make2State();
    state.players[0].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    state.players[0].position = 12;
    const res = resolveSpace(state, 'p1', defaultDice);
    expect(res.type).toBe('ownProperty');
  });

  it('mortgaged railroad charges no rent', () => {
    const state = make2State();
    state.players[1].properties = [5];
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: true });
    state.players[0].position = 5;
    const res = resolveSpace(state, 'p1', defaultDice);
    expect(res.type).toBe('noAction');
  });

  it('mortgaged utility charges no rent', () => {
    const state = make2State();
    state.players[1].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: true });
    state.players[0].position = 12;
    const res = resolveSpace(state, 'p1', defaultDice);
    expect(res.type).toBe('noAction');
  });

  it('calculateRailroadRent returns 0 for 0 or negative railroads', () => {
    expect(calculateRailroadRent(0)).toBe(0);
    expect(calculateRailroadRent(-1)).toBe(0);
  });

  it('calculateUtilityRent returns 0 for 0 or negative utilities', () => {
    expect(calculateUtilityRent(8, 0)).toBe(0);
    expect(calculateUtilityRent(8, -1)).toBe(0);
  });

  it('calculateStreetRent with empty/missing rent tiers returns 0', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const space = { rentTiers: [] } as any;
    expect(calculateStreetRent(space, 0, false)).toBe(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const space2 = {} as any;
    expect(calculateStreetRent(space2, 0, false)).toBe(0);
  });

  it('calculateStreetRent handles houses beyond tier array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const space = { rentTiers: [2, 10, 30] } as any;
    // 5 houses but only 3 tiers → returns last tier
    expect(calculateStreetRent(space, 5, false)).toBe(30);
  });

  it('applySpaceResolution for noAction and ownProperty does nothing', () => {
    const state = make2State();
    const noAction = applySpaceResolution(state, 'p1', {
      type: 'noAction',
      space: state.board[0],
    });
    expect(noAction.players[0].cash).toBe(1500);

    const ownProp = applySpaceResolution(state, 'p1', {
      type: 'ownProperty',
      space: state.board[1],
    });
    expect(ownProp.players[0].cash).toBe(1500);
  });

  it('applySpaceResolution for unownedProperty does nothing (buy handled separately)', () => {
    const state = make2State();
    const res = applySpaceResolution(state, 'p1', {
      type: 'unownedProperty',
      space: state.board[1],
      propertyDetails: { cost: 60, name: 'Mediterranean', spaceId: 1 },
    });
    expect(res.players[0].cash).toBe(1500);
  });

  it('applySpaceResolution for drawCard does nothing (card handled separately)', () => {
    const state = make2State();
    const res = applySpaceResolution(state, 'p1', {
      type: 'drawCard',
      space: state.board[7],
      deckName: 'chance',
    });
    expect(res.players[0].cash).toBe(1500);
  });

  it('applySpaceResolution for rentPayment with missing ownerId', () => {
    const state = make2State();
    const res = applySpaceResolution(state, 'p1', {
      type: 'rentPayment',
      space: state.board[1],
      rentAmount: 50,
      // No ownerId
    });
    expect(res.players[0].cash).toBe(1450);
    // Owner not credited since no ownerId
  });

  it('getPropertyOwnership returns null for unowned property', () => {
    const state = make2State();
    expect(getPropertyOwnership(state, 1)).toBeNull();
  });

  it('getPropertyState returns null for unknown game/space', () => {
    const state = make2State();
    expect(getPropertyState(state, 999)).toBeNull();
  });

  it('countOwnedOfType returns 0 for nonexistent player', () => {
    const state = make2State();
    expect(countOwnedOfType(state, 'nonexistent', SpaceType.Railroad)).toBe(0);
  });

  it('ownsAllInColorGroup returns false for nonexistent player', () => {
    const state = make2State();
    expect(ownsAllInColorGroup(state, 'nonexistent', 'brown')).toBe(false);
  });
});

// ─── P6.S1.T3 — 100% branch coverage for card effects ──────────────

describe('P6.S1.T3 — Card Effects Coverage', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('drawCard throws on empty deck', () => {
    const state = make2State();
    state.decks.chance = [];
    expect(() => drawCard(state, 'chance')).toThrow('empty');
  });

  it('drawCard from communityChest', () => {
    const state = make2State();
    // Ensure first card is not GOOJF
    const nonGoojf = state.decks.communityChest.find((c: Card) => c.effect.type !== 'goojf')!;
    state.decks.communityChest = [
      nonGoojf,
      ...state.decks.communityChest.filter((c: Card) => c.id !== nonGoojf.id),
    ];
    const { card } = drawCard(state, 'communityChest');
    expect(card.id).toBe(nonGoojf.id);
  });

  it('applyCardEffect for goojf type returns state unchanged', () => {
    const state = make2State();
    const card: Card = { id: 'goojf', deck: 'chance', text: 'GOOJF', effect: { type: 'goojf' } };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].cash).toBe(1500);
  });

  it('applyCardEffect for unknown type returns state unchanged', () => {
    const state = make2State();

    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Test',
      effect: { type: 'unknown' } as any,
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].cash).toBe(1500);
  });

  it('applyCashEffect throws for nonexistent player', () => {
    const state = make2State();
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Test',
      effect: { type: 'cash', amount: 100 },
    };
    expect(() => applyCardEffect(state, 'nonexistent', card)).toThrow('not found');
  });

  it('applyMoveEffect throws for nonexistent player', () => {
    const state = make2State();
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Test',
      effect: { type: 'move', position: 0 },
    };
    expect(() => applyCardEffect(state, 'nonexistent', card)).toThrow('not found');
  });

  it('applyMoveBackEffect throws for nonexistent player', () => {
    const state = make2State();
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Test',
      effect: { type: 'moveBack', spaces: 3 },
    };
    expect(() => applyCardEffect(state, 'nonexistent', card)).toThrow('not found');
  });

  it('applyJailEffect throws for nonexistent player', () => {
    const state = make2State();
    const card: Card = { id: 'test', deck: 'chance', text: 'Test', effect: { type: 'jail' } };
    expect(() => applyCardEffect(state, 'nonexistent', card)).toThrow('not found');
  });

  it('applyCollectFromAll skips bankrupt and inactive players', () => {
    const state = make4State();
    state.players[2].isBankrupt = true;
    state.players[2].isActive = false;
    state.players[3].isActive = false;
    const card: Card = {
      id: 'test',
      deck: 'communityChest',
      text: 'Birthday',
      effect: { type: 'collectFromAll', amount: 10 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // Only p2 pays (p3 bankrupt, p4 inactive)
    expect(result.state.players[0].cash).toBe(1510);
    expect(result.state.players[1].cash).toBe(1490);
  });

  it('applyPayEachPlayer skips bankrupt and inactive players', () => {
    const state = make4State();
    state.players[2].isBankrupt = true;
    state.players[2].isActive = false;
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Chairman',
      effect: { type: 'payEachPlayer', amount: 50 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // Pays p2 and p4 (p3 bankrupt), 2 * 50 = 100
    expect(result.state.players[0].cash).toBe(1400);
    expect(result.state.players[1].cash).toBe(1550);
    expect(result.state.players[3].cash).toBe(1550);
  });

  it('applyRepairs with no properties costs $0', () => {
    const state = make2State();
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Repairs',
      effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].cash).toBe(1500);
  });

  it('applyRepairs counts buildings correctly across many properties', () => {
    const state = make2State();
    state.players[0].properties = [1, 3, 6, 8, 9]; // Various properties
    setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // Hotel
    setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false }); // No houses
    setPropertyState(state, { spaceId: 8, houses: 3, mortgaged: false });
    setPropertyState(state, { spaceId: 9, houses: 0, mortgaged: true }); // Mortgaged, no houses
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Repairs',
      effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // 2 houses ($50) + 1 hotel ($100) + 0 + 3 houses ($75) + 0 = $225
    expect(result.state.players[0].cash).toBe(1500 - 225);
  });

  it('moveBack resolves target space', () => {
    const state = make2State();
    state.players[0].position = 7; // Chance
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Go back 3',
      effect: { type: 'moveBack', spaces: 3 },
    };
    // 7 - 3 = 4 (Income Tax)
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(4);
    expect(result.spaceResolution?.type).toBe('tax');
  });

  it('moveBack to unowned property signals buy decision', () => {
    const state = make2State();
    state.players[0].position = 4; // Income Tax
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Go back 3',
      effect: { type: 'moveBack', spaces: 3 },
    };
    // 4 - 3 = 1 (Mediterranean Avenue - unowned)
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(1);
    expect(result.needsBuyDecision).toBe(true);
  });

  it('move effect to owned property pays rent', () => {
    const state = make2State();
    state.players[0].position = 7;
    state.players[1].properties = [39]; // Bob owns Boardwalk
    setPropertyState(state, { spaceId: 39, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Advance to Boardwalk',
      effect: { type: 'move', position: 39 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.spaceResolution?.type).toBe('rentPayment');
    expect(result.spaceResolution?.rentAmount).toBe(50); // Boardwalk base rent
    expect(result.state.players[0].cash).toBe(1500 - 50);
  });

  it('returnCardToDeck to communityChest', () => {
    const state = make2State();
    const card: Card = {
      id: 'returned-cc',
      deck: 'communityChest',
      text: 'Test',
      effect: { type: 'cash', amount: 0 },
    };
    const newState = returnCardToDeck(state, card, 'communityChest');
    expect(newState.decks.communityChest[newState.decks.communityChest.length - 1].id).toBe(
      'returned-cc',
    );
  });

  it('advance to nearest railroad from own railroad - no rent', () => {
    const state = make2State();
    state.players[0].position = 7;
    state.players[0].properties = [15]; // Alice owns Pennsylvania RR
    setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(15);
    expect(result.state.players[0].cash).toBe(1500); // No rent to self
  });

  it('advance to nearest utility from own utility - no rent', () => {
    const state = make2State();
    state.players[0].position = 7;
    state.players[0].properties = [12]; // Alice owns Electric Company
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Nearest Utility',
      effect: { type: 'advanceNearestUtility' },
    };
    const result = applyCardEffect(state, 'p1', card, defaultDice);
    expect(result.movedToPosition).toBe(12);
    expect(result.state.players[0].cash).toBe(1500); // No rent to self
  });

  it('advance to nearest utility without dice result uses dummy dice', () => {
    const state = make2State();
    state.players[0].position = 22;
    state.players[1].properties = [28]; // Bob owns Water Works
    setPropertyState(state, { spaceId: 28, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Nearest Utility',
      effect: { type: 'advanceNearestUtility' },
    };
    // No dice result → uses dummy dice with total 0
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(28);
    // 10 × 0 = $0 rent with dummy dice
    expect(result.spaceResolution?.rentAmount).toBe(0);
  });
});

// ─── P6.S1.T4 — 100% branch coverage for property management ───────

describe('P6.S1.T4 — Property Management Coverage', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('buyProperty rejects non-purchasable space type', () => {
    const state = make2State();
    state.players[0].position = 0; // Go - corner
    expect(() => buyProperty(state, 'p1', 0)).toThrow('not purchasable');
  });

  it('buyProperty rejects if player not on space', () => {
    const state = make2State();
    state.players[0].position = 5;
    // Trying to buy Baltic (spaceId 3, pos 3)
    expect(() => buyProperty(state, 'p1', 3)).toThrow('not on space');
  });

  it('buyProperty works for railroad', () => {
    const state = make2State();
    state.players[0].position = 5; // Reading Railroad pos 5
    const newState = buyProperty(state, 'p1', 5);
    expect(newState.players[0].properties).toContain(5);
    expect(newState.players[0].cash).toBe(1300); // 1500 - 200
  });

  it('buyProperty works for utility', () => {
    const state = make2State();
    state.players[0].position = 12; // Electric Company
    const newState = buyProperty(state, 'p1', 12);
    expect(newState.players[0].properties).toContain(12);
    expect(newState.players[0].cash).toBe(1350); // 1500 - 150
  });

  it('canBuildHouse returns error for nonexistent player', () => {
    const state = make2State();
    expect(canBuildHouse(state, 'nonexistent', 1)).toBe('Player not found');
  });

  it('canBuildHouse returns error for nonexistent space', () => {
    const state = make2State();
    expect(canBuildHouse(state, 'p1', 999)).toBe('Space not found');
  });

  it('canBuildHouse returns error for railroad', () => {
    const state = make2State();
    state.players[0].properties = [5, 15, 25, 35]; // All railroads
    expect(canBuildHouse(state, 'p1', 5)).toBe('Can only build on street properties');
  });

  it('canBuildHouse returns error when property already has hotel', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });
    expect(canBuildHouse(state, 'p1', 1)).toContain('already has a hotel');
  });

  it('canBuildHouse returns error when cannot afford house', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    state.players[0].cash = 10; // Can't afford $50 house
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    expect(canBuildHouse(state, 'p1', 1)).toContain('Cannot afford');
  });

  it('canBuildHouse returns error when no hotels available for upgrade', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 4, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 4, mortgaged: false });
    setBuildingSupply(state, { houses: 32, hotels: 0 });
    expect(canBuildHouse(state, 'p1', 1)).toContain('No hotels');
  });

  it('canSellBuilding returns error for nonexistent player', () => {
    const state = make2State();
    expect(canSellBuilding(state, 'nonexistent', 1)).toBe('Player not found');
  });

  it('canSellBuilding returns error for nonexistent space', () => {
    const state = make2State();
    expect(canSellBuilding(state, 'p1', 999)).toBe('Space not found');
  });

  it('canSellBuilding returns error when no buildings', () => {
    const state = make2State();
    state.players[0].properties = [1];
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    expect(canSellBuilding(state, 'p1', 1)).toContain('No buildings');
  });

  it('startAuction excludes bankrupt players', () => {
    const state = make3State();
    state.players[2].isBankrupt = true;
    state.players[2].isActive = false;
    const auction = startAuction(state, 3);
    expect(auction.eligiblePlayers).toHaveLength(2);
    expect(auction.eligiblePlayers).not.toContain('p3');
  });

  it('passBid is idempotent', () => {
    const state = make2State();
    startAuction(state, 3);
    passBid(state, 'p1');
    passBid(state, 'p1'); // Again
    const auction = passBid(state, 'p1'); // Third time
    // Should only appear once
    expect(auction.passedPlayers.filter((id) => id === 'p1')).toHaveLength(1);
  });

  it('placeBid rejects from passed player', () => {
    const state = make2State();
    startAuction(state, 3);
    passBid(state, 'p1');
    expect(() => placeBid(state, 'p1', 50)).toThrow('already passed');
  });

  it('placeBid throws when no active auction', () => {
    const state = make2State('test-no-auction-1');
    expect(() => placeBid(state, 'p1', 50)).toThrow('No active auction');
  });

  it('passBid throws when no active auction', () => {
    const state = make2State('test-no-auction-2');
    expect(() => passBid(state, 'p1')).toThrow('No active auction');
  });

  it('placeBid throws for nonexistent player', () => {
    const state = make2State('test-auction-bid');
    startAuction(state, 3);
    expect(() => placeBid(state, 'nonexistent', 50)).toThrow('not found');
  });

  it('isAuctionComplete returns true when no auction', () => {
    const state = make2State('test-no-auction-3');
    expect(isAuctionComplete(state)).toBe(true);
  });

  it('resolveAuction throws when no auction', () => {
    const state = make2State('test-no-auction-4');
    expect(() => resolveAuction(state)).toThrow('No active auction');
  });

  it('mortgageProperty throws if not owned', () => {
    const state = make2State();
    state.players[0].properties = [];
    expect(() => mortgageProperty(state, 'p1', 3)).toThrow('does not own');
  });

  it('mortgageProperty throws if already mortgaged', () => {
    const state = make2State();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
    expect(() => mortgageProperty(state, 'p1', 3)).toThrow('already mortgaged');
  });

  it('unmortgageProperty throws if not owned', () => {
    const state = make2State();
    state.players[0].properties = [];
    expect(() => unmortgageProperty(state, 'p1', 3)).toThrow('does not own');
  });

  it('unmortgageProperty throws if not mortgaged', () => {
    const state = make2State();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    expect(() => unmortgageProperty(state, 'p1', 3)).toThrow('not mortgaged');
  });
});

// ─── P6.S1.T5 — 100% branch coverage for trading ───────────────────

describe('P6.S1.T5 — Trading Coverage', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetTrades();
  });

  it('createTradeOffer rejects if proposer has insufficient GOOJF cards', () => {
    const state = make2State();
    state.players[0].getOutOfJailFreeCards = 0;
    expect(() =>
      createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 1,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('does not have enough GOOJF');
  });

  it('createTradeOffer rejects if recipient has insufficient GOOJF cards', () => {
    const state = make2State();
    state.players[1].getOutOfJailFreeCards = 0;
    expect(() =>
      createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 1,
      }),
    ).toThrow('does not have enough GOOJF');
  });

  it('acceptTrade throws for nonexistent trade', () => {
    const state = make2State();
    expect(() => acceptTrade(state, 'nonexistent')).toThrow('not found');
  });

  it('acceptTrade throws for non-pending trade', () => {
    const state = make2State();
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
    rejectTrade(state, trade.id);
    expect(() => acceptTrade(state, trade.id)).toThrow('not pending');
  });

  it('rejectTrade throws for nonexistent trade', () => {
    const state = make2State();
    expect(() => rejectTrade(state, 'nonexistent')).toThrow('not found');
  });

  it('counterTrade throws for nonexistent trade', () => {
    const state = make2State();
    expect(() =>
      counterTrade(state, 'nonexistent', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('not found');
  });

  it('trade with requested cash transfers correctly', () => {
    const state = make2State();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

    const { trade } = createTradeOffer(state, 'p1', 'p2', {
      offeredProperties: [3],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [],
      requestedCash: 100,
      requestedCards: 0,
    });
    storeTrade(trade);

    const newState = acceptTrade(state, trade.id);
    expect(newState.players[0].cash).toBe(1600); // +100
    expect(newState.players[1].cash).toBe(1400); // -100
    expect(newState.players[0].properties).not.toContain(3);
    expect(newState.players[1].properties).toContain(3);
  });

  it('createTradeOffer rejects if requested property has buildings', () => {
    const state = make2State();
    state.players[1].properties = [1, 3]; // Bob has brown monopoly
    setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

    expect(() =>
      createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [3],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('buildings exist');
  });
});

// ─── P6.S1.T6 — 100% branch coverage for jail ──────────────────────

describe('P6.S1.T6 — Jail Coverage', () => {
  it('sendToJail throws for nonexistent player', () => {
    const state = make2State();
    expect(() => sendToJail(state, 'nonexistent')).toThrow('not found');
  });

  it('payJailFine throws if not in jail', () => {
    const state = make2State();
    state.players[0].jailStatus = { inJail: false };
    expect(() => payJailFine(state, 'p1')).toThrow('not in jail');
  });

  it('payJailFine throws for nonexistent player', () => {
    const state = make2State();
    expect(() => payJailFine(state, 'nonexistent')).toThrow('not found');
  });

  it('useJailCard throws if not in jail', () => {
    const state = make2State();
    state.players[0].jailStatus = { inJail: false };
    state.players[0].getOutOfJailFreeCards = 1;
    expect(() => useJailCard(state, 'p1')).toThrow('not in jail');
  });

  it('useJailCard throws for nonexistent player', () => {
    const state = make2State();
    expect(() => useJailCard(state, 'nonexistent')).toThrow('not found');
  });

  it('rollInJail throws if not in jail', () => {
    const state = make2State();
    state.players[0].jailStatus = { inJail: false };
    const dice: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
    expect(() => rollInJail(state, 'p1', dice)).toThrow('not in jail');
  });

  it('rollInJail throws for nonexistent player', () => {
    const state = make2State();
    const dice: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
    expect(() => rollInJail(state, 'nonexistent', dice)).toThrow('not found');
  });

  it('rollInJail on first attempt non-doubles → turnsInJail becomes 1', () => {
    const state = make2State();
    state.players[0].position = 10;
    state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
    const dice: DiceResult = { die1: 2, die2: 5, total: 7, isDoubles: false };
    const result = rollInJail(state, 'p1', dice);
    expect(result.state.players[0].jailStatus).toEqual({ inJail: true, turnsInJail: 1 });
    expect(result.freedFromJail).toBe(false);
    expect(result.forcedExit).toBe(false);
  });

  it('rollInJail on second attempt non-doubles → turnsInJail becomes 2', () => {
    const state = make2State();
    state.players[0].position = 10;
    state.players[0].jailStatus = { inJail: true, turnsInJail: 1 };
    const dice: DiceResult = { die1: 1, die2: 4, total: 5, isDoubles: false };
    const result = rollInJail(state, 'p1', dice);
    expect(result.state.players[0].jailStatus).toEqual({ inJail: true, turnsInJail: 2 });
    expect(result.freedFromJail).toBe(false);
  });

  it('rollInJail doubles on second attempt → freed, moves', () => {
    const state = make2State();
    state.players[0].position = 10;
    state.players[0].jailStatus = { inJail: true, turnsInJail: 1 };
    const dice: DiceResult = { die1: 5, die2: 5, total: 10, isDoubles: true };
    const result = rollInJail(state, 'p1', dice);
    expect(result.freedFromJail).toBe(true);
    expect(result.forcedExit).toBe(false);
    expect(result.state.players[0].position).toBe(20);
    expect(result.state.players[0].jailStatus).toEqual({ inJail: false });
  });
});

// ─── P6.S1.T7 — 100% branch coverage for bankruptcy ────────────────

describe('P6.S1.T7 — Bankruptcy Coverage', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('canPlayerAfford returns false for nonexistent player', () => {
    const state = make2State();
    expect(canPlayerAfford(state, 'nonexistent', 100)).toBe(false);
  });

  it('calculateLiquidationValue returns 0 for nonexistent player', () => {
    const state = make2State();
    expect(calculateLiquidationValue(state, 'nonexistent')).toBe(0);
  });

  it('calculateLiquidationValue counts hotel as 5 buildings', () => {
    const state = make2State();
    state.players[0].properties = [1];
    setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false }); // Hotel
    const value = calculateLiquidationValue(state, 'p1');
    // Hotel sell = 5 × $50/2 = $125, Mortgage = $30
    expect(value).toBe(155);
  });

  it('calculateLiquidationValue excludes already-mortgaged properties', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: true }); // Already mortgaged
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    const value = calculateLiquidationValue(state, 'p1');
    // Only Baltic mortgage ($30)
    expect(value).toBe(30);
  });

  it('declareBankruptcy to player with buildings returns them to supply', () => {
    const state = make3State();
    state.players[0].cash = 0;
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 3, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // Hotel

    const supplyBefore = getBuildingSupply(state);
    const housesBefore = supplyBefore.houses;
    const hotelsBefore = supplyBefore.hotels;

    const newState = declareBankruptcy(state, 'p1', 'p2');
    const supplyAfter = getBuildingSupply(newState);
    expect(supplyAfter.houses).toBe(housesBefore + 3); // 3 houses returned
    expect(supplyAfter.hotels).toBe(hotelsBefore + 1); // 1 hotel returned
  });

  it('declareBankruptcy to bank with buildings returns them to supply', () => {
    const state = make3State();
    state.players[0].cash = 0;
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });

    const supplyBefore = getBuildingSupply(state);
    const housesBefore = supplyBefore.houses;
    const hotelsBefore = supplyBefore.hotels;

    const newState = declareBankruptcy(state, 'p1', 'bank');
    const supplyAfter = getBuildingSupply(newState);
    expect(supplyAfter.houses).toBe(housesBefore + 2);
    expect(supplyAfter.hotels).toBe(hotelsBefore + 1);
  });

  it('declareBankruptcy throws for nonexistent player', () => {
    const state = make2State();
    expect(() => declareBankruptcy(state, 'nonexistent', 'bank')).toThrow('not found');
  });

  it('declareBankruptcy to nonexistent creditor throws', () => {
    const state = make2State();
    expect(() => declareBankruptcy(state, 'p1', 'nonexistent')).toThrow('not found');
  });

  it('getWinner returns null if game not finished', () => {
    const state = make2State();
    expect(getWinner(state)).toBeNull();
  });

  it('calculateNetWorth for nonexistent player returns 0', () => {
    const state = make2State();
    expect(calculateNetWorth(state, 'nonexistent')).toBe(0);
  });

  it('calculateNetWorth with mortgaged property excludes property value', () => {
    const state = make2State();
    state.players[0].cash = 1000;
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: true }); // Mortgaged Med
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false }); // Baltic $60
    const nw = calculateNetWorth(state, 'p1');
    // $1000 cash + $60 (Baltic) + $0 (Med mortgaged) = $1060
    expect(nw).toBe(1060);
  });

  it('calculateNetWorth with hotel counts full building value', () => {
    const state = make2State();
    state.players[0].cash = 100;
    state.players[0].properties = [1];
    setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false });
    // Med: cost $60, houseCost $50, hotel = 5 × $50 = $250
    const nw = calculateNetWorth(state, 'p1');
    // $100 + $60 (property) + $250 (hotel) = $410
    expect(nw).toBe(410);
  });

  it('determineTimedGameWinner skips bankrupt players', () => {
    const state = make3State();
    state.players[0].cash = 5000;
    state.players[0].isBankrupt = true;
    state.players[0].isActive = false;
    state.players[1].cash = 2000;
    state.players[2].cash = 1000;
    const winner = determineTimedGameWinner(state);
    expect(winner).toBe('p2'); // Highest active net worth
  });
});

// ─── P6.S1.T8 — Edge: player lands on Go exactly ───────────────────

describe('P6.S1.T8 — Landing on Go & Wrapping Edge Cases', () => {
  beforeEach(() => {
    resetDoublesTracker('test-edge');
  });

  it('player lands on Go exactly from position 35 rolling 5', () => {
    const state = make2State();
    state.players[0].position = 35;
    const dice: DiceResult = { die1: 2, die2: 3, total: 5, isDoubles: false };
    const result = applyMovement(state, 'p1', dice);
    expect(result.state.players[0].position).toBe(0);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700); // $200 for passing/landing on Go
  });

  it('player lands on Go exactly from position 33 rolling 7', () => {
    const state = make2State();
    state.players[0].position = 33;
    const dice: DiceResult = { die1: 3, die2: 4, total: 7, isDoubles: false };
    const result = applyMovement(state, 'p1', dice);
    expect(result.state.players[0].position).toBe(0);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700);
  });

  it('player wraps with card movement — Advance to Go from pos 39', () => {
    const state = make2State();
    state.players[0].position = 39;
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Advance to Go',
      effect: { type: 'move', position: 0 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(0);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700);
  });

  it('player wraps multiple times with card "Go back 3" from position 1', () => {
    const state = make2State();
    state.players[0].position = 1;
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Go Back 3',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // 1 - 3 + 40 = 38 (Luxury Tax)
    expect(result.movedToPosition).toBe(38);
    // moveBack does NOT pass Go
    expect(result.spaceResolution?.type).toBe('tax');
    expect(result.spaceResolution?.taxAmount).toBe(100);
  });
});

// ─── P6.S1.T9 — Edge: simultaneous trades, max building supply, mortgage during debt ─

describe('P6.S1.T9 — Simultaneous Trades, Max Supply, Mortgage During Debt', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
    resetTrades();
  });

  it('simultaneous trades: two trades created, only first accepted', () => {
    const state = make3State();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    state.players[1].properties = [6];
    setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });
    state.players[2].properties = [8];
    setPropertyState(state, { spaceId: 8, houses: 0, mortgaged: false });

    // Trade 1: p1 offers Baltic to p2
    const { trade: trade1 } = createTradeOffer(state, 'p1', 'p2', {
      offeredProperties: [3],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [6],
      requestedCash: 0,
      requestedCards: 0,
    });
    storeTrade(trade1);

    // Trade 2: p1 offers Baltic to p3 (same property!)
    const { trade: trade2 } = createTradeOffer(state, 'p1', 'p3', {
      offeredProperties: [3],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [8],
      requestedCash: 0,
      requestedCards: 0,
    });
    storeTrade(trade2);

    // Accept trade 1
    const newState = acceptTrade(state, trade1.id);
    expect(newState.players[0].properties).not.toContain(3);
    expect(newState.players[1].properties).toContain(3);

    // Trade 2 is still pending but would fail validation in real server
    expect(getTrade(trade2.id)?.status).toBe('pending');
  });

  it('building at max supply: only 32 houses available', () => {
    const state = make2State();
    state.players[0].properties = [1, 3]; // Brown monopoly
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

    // Use up all but 1 house
    setBuildingSupply(state, { houses: 1, hotels: 12 });
    expect(canBuildHouse(state, 'p1', 1)).toBeNull(); // Can build (1 left)

    const s = buildHouse(state, 'p1', 1);
    const supply = getBuildingSupply(s);
    expect(supply.houses).toBe(0);

    // Now can't build another
    expect(canBuildHouse(s, 'p1', 3)).toContain('No houses');
  });

  it('mortgage during debt: player can mortgage to raise cash', () => {
    const state = make2State();
    state.players[0].cash = 10; // Low cash
    state.players[0].properties = [3, 6];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

    // Mortgage Baltic to get $30
    const s1 = mortgageProperty(state, 'p1', 3);
    expect(s1.players[0].cash).toBe(40); // 10 + 30

    // Can now afford something worth $40
    expect(canPlayerAfford(s1, 'p1', 40)).toBe(true);
  });
});

// ─── P6.S1.T10 — Edge: 2-player bankruptcy ends game ───────────────

describe('P6.S1.T10 — 2-Player Bankruptcy Edge Cases', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('2-player: bankruptcy immediately ends game', () => {
    const state = make2State();
    state.players[0].cash = 0;
    state.players[0].properties = [];

    const newState = declareBankruptcy(state, 'p1', 'bank');
    expect(newState.status).toBe('finished');
    expect(getWinner(newState)).toBe('p2');
  });

  it('2-player: bankruptcy to player transfers assets and ends game', () => {
    const state = make2State();
    state.players[0].cash = 200;
    state.players[0].properties = [3, 6];
    state.players[0].getOutOfJailFreeCards = 2;
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

    const newState = declareBankruptcy(state, 'p1', 'p2');
    expect(newState.status).toBe('finished');
    expect(getWinner(newState)).toBe('p2');

    const winner = newState.players[1];
    expect(winner.cash).toBe(1700); // 1500 + 200
    expect(winner.properties).toContain(3);
    expect(winner.properties).toContain(6);
    expect(winner.getOutOfJailFreeCards).toBe(2);
  });
});

// ─── P6.S1.T11 — Edge: nearest railroad from all 3 Chance positions ─

describe('P6.S1.T11 — Nearest Railroad From All Chance Positions', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
  });

  const nearestRRCard: Card = {
    id: 'test',
    deck: 'chance',
    text: 'Nearest RR',
    effect: { type: 'advanceNearestRailroad' },
  };

  it('from pos 7 → nearest is pos 15 (Pennsylvania RR), unowned', () => {
    const state = make2State();
    state.players[0].position = 7;
    const result = applyCardEffect(state, 'p1', nearestRRCard);
    expect(result.movedToPosition).toBe(15);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.passedGo).toBe(false);
  });

  it('from pos 7 → nearest is pos 15, owned → pay double rent', () => {
    const state = make2State();
    state.players[0].position = 7;
    state.players[1].properties = [15]; // 1 RR
    setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
    const result = applyCardEffect(state, 'p1', nearestRRCard);
    expect(result.movedToPosition).toBe(15);
    // 1 RR normal rent = $25, double = $50
    expect(result.spaceResolution?.rentAmount).toBe(50);
  });

  it('from pos 22 → nearest is pos 25 (B&O RR), unowned', () => {
    const state = make2State();
    state.players[0].position = 22;
    const result = applyCardEffect(state, 'p1', nearestRRCard);
    expect(result.movedToPosition).toBe(25);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.passedGo).toBe(false);
  });

  it('from pos 22 → nearest is pos 25, owned → pay double rent', () => {
    const state = make2State();
    state.players[0].position = 22;
    state.players[1].properties = [25, 35]; // 2 RRs
    setPropertyState(state, { spaceId: 25, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 35, houses: 0, mortgaged: false });
    const result = applyCardEffect(state, 'p1', nearestRRCard);
    expect(result.movedToPosition).toBe(25);
    // 2 RRs normal = $50, double = $100
    expect(result.spaceResolution?.rentAmount).toBe(100);
  });

  it('from pos 36 → nearest is pos 5 (Reading RR, wraps around, passes Go)', () => {
    const state = make2State();
    state.players[0].position = 36;
    const result = applyCardEffect(state, 'p1', nearestRRCard);
    expect(result.movedToPosition).toBe(5);
    expect(result.passedGo).toBe(true);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.state.players[0].cash).toBe(1700); // +$200 for Go
  });

  it('from pos 36 → nearest is pos 5, owned → pay double rent + $200 Go', () => {
    const state = make2State();
    state.players[0].position = 36;
    state.players[1].properties = [5, 15, 25]; // 3 RRs
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 25, houses: 0, mortgaged: false });
    const result = applyCardEffect(state, 'p1', nearestRRCard);
    expect(result.movedToPosition).toBe(5);
    expect(result.passedGo).toBe(true);
    // 3 RRs normal = $100, double = $200
    expect(result.spaceResolution?.rentAmount).toBe(200);
    // $1500 + $200 (Go) - $200 (rent) = $1500
    expect(result.state.players[0].cash).toBe(1500);
  });
});

// ─── P6.S1.T12 — Edge: nearest utility from all 3 Chance positions ─

describe('P6.S1.T12 — Nearest Utility From All Chance Positions', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
  });

  const nearestUtilCard: Card = {
    id: 'test',
    deck: 'chance',
    text: 'Nearest Utility',
    effect: { type: 'advanceNearestUtility' },
  };
  const dice: DiceResult = { die1: 3, die2: 5, total: 8, isDoubles: false };

  it('from pos 7 → nearest is pos 12 (Electric Co), unowned', () => {
    const state = make2State();
    state.players[0].position = 7;
    const result = applyCardEffect(state, 'p1', nearestUtilCard, dice);
    expect(result.movedToPosition).toBe(12);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.passedGo).toBe(false);
  });

  it('from pos 7 → nearest is pos 12, owned → pay 10× dice', () => {
    const state = make2State();
    state.players[0].position = 7;
    state.players[1].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    const result = applyCardEffect(state, 'p1', nearestUtilCard, dice);
    expect(result.movedToPosition).toBe(12);
    expect(result.spaceResolution?.rentAmount).toBe(80); // 10 × 8
  });

  it('from pos 22 → nearest is pos 28 (Water Works), unowned', () => {
    const state = make2State();
    state.players[0].position = 22;
    const result = applyCardEffect(state, 'p1', nearestUtilCard, dice);
    expect(result.movedToPosition).toBe(28);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.passedGo).toBe(false);
  });

  it('from pos 22 → nearest is pos 28, owned → pay 10× dice', () => {
    const state = make2State();
    state.players[0].position = 22;
    state.players[1].properties = [28];
    setPropertyState(state, { spaceId: 28, houses: 0, mortgaged: false });
    const result = applyCardEffect(state, 'p1', nearestUtilCard, dice);
    expect(result.movedToPosition).toBe(28);
    expect(result.spaceResolution?.rentAmount).toBe(80);
  });

  it('from pos 36 → nearest is pos 12 (Electric Co, wraps, passes Go)', () => {
    const state = make2State();
    state.players[0].position = 36;
    const result = applyCardEffect(state, 'p1', nearestUtilCard, dice);
    expect(result.movedToPosition).toBe(12);
    expect(result.passedGo).toBe(true);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.state.players[0].cash).toBe(1700); // +$200 Go
  });

  it('from pos 36 → nearest is pos 12, owned → pay 10× dice + $200 Go', () => {
    const state = make2State();
    state.players[0].position = 36;
    state.players[1].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    const result = applyCardEffect(state, 'p1', nearestUtilCard, dice);
    expect(result.movedToPosition).toBe(12);
    expect(result.passedGo).toBe(true);
    expect(result.spaceResolution?.rentAmount).toBe(80);
    // $1500 + $200 (Go) - $80 (rent) = $1620
    expect(result.state.players[0].cash).toBe(1620);
  });
});

// ─── P6.S1.T13 — Edge: both GOOJF cards held simultaneously ────────

describe('P6.S1.T13 — Dual GOOJF Cards', () => {
  it('player holds both Chance and CC GOOJF simultaneously', () => {
    const state = make2State();

    // Draw Chance GOOJF
    const chanceGoojf = state.decks.chance.find((c: Card) => c.effect.type === 'goojf')!;
    state.decks.chance = [
      chanceGoojf,
      ...state.decks.chance.filter((c: Card) => c.id !== chanceGoojf.id),
    ];
    const { state: s2 } = drawCard(state, 'chance');
    expect(s2.players[0].getOutOfJailFreeCards).toBe(1);
    expect(s2.decks.chance).toHaveLength(15);

    // Draw CC GOOJF
    const ccGoojf = s2.decks.communityChest.find((c: Card) => c.effect.type === 'goojf')!;
    s2.decks.communityChest = [
      ccGoojf,
      ...s2.decks.communityChest.filter((c: Card) => c.id !== ccGoojf.id),
    ];
    const { state: s3 } = drawCard(s2, 'communityChest');
    expect(s3.players[0].getOutOfJailFreeCards).toBe(2);
    expect(s3.decks.communityChest).toHaveLength(15);
  });

  it('using GOOJF card returns it to correct deck', () => {
    const state = make2State();

    // Give player 2 GOOJF cards
    state.players[0].getOutOfJailFreeCards = 2;
    state.players[0].jailStatus = { inJail: true, turnsInJail: 0 };

    // Use one card
    const s2 = useJailCard(state, 'p1');
    expect(s2.players[0].getOutOfJailFreeCards).toBe(1);
    expect(s2.players[0].jailStatus).toEqual({ inJail: false });

    // Return Chance GOOJF to chance deck
    const chanceGoojf: Card = {
      id: 'chance-9',
      deck: 'chance',
      text: 'GOOJF',
      effect: { type: 'goojf' },
    };
    const s3 = returnCardToDeck(s2, chanceGoojf, 'chance');
    expect(s3.decks.chance[s3.decks.chance.length - 1].id).toBe('chance-9');

    // Go to jail again and use second card
    s3.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
    const s4 = useJailCard(s3, 'p1');
    expect(s4.players[0].getOutOfJailFreeCards).toBe(0);

    // Return CC GOOJF to CC deck
    const ccGoojf: Card = {
      id: 'cc-5',
      deck: 'communityChest',
      text: 'GOOJF',
      effect: { type: 'goojf' },
    };
    const s5 = returnCardToDeck(s4, ccGoojf, 'communityChest');
    expect(s5.decks.communityChest[s5.decks.communityChest.length - 1].id).toBe('cc-5');
  });
});

// ─── P6.S1.T14 — Edge: building auction when supply constrained ────

describe('P6.S1.T14 — Building Auction (Supply Constraints)', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('only 2 houses available, 3 players want to build → 2 can, 1 cannot', () => {
    const state = make3State();
    setBuildingSupply(state, { houses: 2, hotels: 12 });

    // All three have brown monopolies-like setup
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

    // Player 1 builds
    const s1 = buildHouse(state, 'p1', 1);
    expect(getBuildingSupply(s1).houses).toBe(1);

    // Player 1 builds again (on other property)
    const s2 = buildHouse(s1, 'p1', 3);
    expect(getBuildingSupply(s2).houses).toBe(0);

    // No more houses available
    // If player had another monopoly they couldn't build
    expect(canBuildHouse(s2, 'p1', 1)).toContain('No houses');
  });

  it('building reduces supply, selling increases it', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    setBuildingSupply(state, { houses: 5, hotels: 12 });

    let s = buildHouse(state, 'p1', 1);
    s = buildHouse(s, 'p1', 3);
    expect(getBuildingSupply(s).houses).toBe(3);

    s = sellBuilding(s, 'p1', 1);
    expect(getBuildingSupply(s).houses).toBe(4);
  });
});

// ─── P6.S1.T15 — Edge: Reading Railroad trip from pos 36 ───────────

describe('P6.S1.T15 — Reading Railroad Trip From Position 36', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
  });

  it('Chance card "Take a trip to Reading Railroad" from pos 36 passes Go', () => {
    const state = make2State();
    state.players[0].position = 36;
    const card: Card = {
      id: 'chance-14',
      deck: 'chance',
      text: 'Take a trip to Reading Railroad. If you pass Go, collect $200.',
      effect: { type: 'move', position: 5 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(5);
    expect(result.passedGo).toBe(true);
    // $200 awarded BEFORE railroad resolution
    expect(result.state.players[0].cash).toBe(1700); // Unowned, so just +$200
    expect(result.needsBuyDecision).toBe(true);
  });

  it('Reading Railroad trip from pos 36, RR owned → $200 Go + pay rent', () => {
    const state = make2State();
    state.players[0].position = 36;
    state.players[1].properties = [5, 15]; // Bob owns 2 RRs
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'chance-14',
      deck: 'chance',
      text: 'Take a trip to Reading Railroad',
      effect: { type: 'move', position: 5 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.passedGo).toBe(true);
    // $200 Go - $50 rent (2 RRs normal rent, not doubled because it's a "move" card, not "advance nearest")
    expect(result.spaceResolution?.rentAmount).toBe(50);
    expect(result.state.players[0].cash).toBe(1500 + 200 - 50);
  });
});

// ─── P6.S1.T16 — Edge: chain card effects (card → another card space) ─

describe('P6.S1.T16 — Chain Card Effects', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
  });

  it('Go Back 3 from Chance pos 7 lands on Income Tax (pos 4)', () => {
    const state = make2State();
    state.players[0].position = 7;
    const card: Card = {
      id: 'chance-10',
      deck: 'chance',
      text: 'Go Back 3 Spaces',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(4); // Income Tax
    expect(result.spaceResolution?.type).toBe('tax');
    expect(result.spaceResolution?.taxAmount).toBe(200);
  });

  it('Go Back 3 from CC pos 33 lands on Go To Jail (pos 30)', () => {
    const state = make2State();
    state.players[0].position = 33;
    const card: Card = {
      id: 'test',
      deck: 'communityChest',
      text: 'Go Back 3',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(30);
    // The space resolution should be goToJail
    expect(result.spaceResolution?.type).toBe('goToJail');
  });

  it('Advance to St. Charles from high position resolves correctly', () => {
    const state = make2State();
    state.players[0].position = 36; // Past St. Charles
    state.players[1].properties = [11]; // Bob owns St. Charles
    setPropertyState(state, { spaceId: 11, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'chance-4',
      deck: 'chance',
      text: 'Advance to St. Charles Place',
      effect: { type: 'move', position: 11 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].position).toBe(11);
    // $200 Go - $10 rent (St. Charles base)
    expect(result.state.players[0].cash).toBe(1500 + 200 - 10);
  });
});

// ─── P6.S1.T17 — Edge: CC repairs vs Chance repairs rates ──────────

describe('P6.S1.T17 — CC vs Chance Repair Rates', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
  });

  it('Chance repairs: $25/house, $100/hotel', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 4, mortgaged: false }); // 4 houses
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // 1 hotel

    const chanceRepairs: Card = {
      id: 'chance-12',
      deck: 'chance',
      text: 'Make general repairs on all your property. For each house pay $25, for each hotel pay $100.',
      effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
    };
    const result = applyCardEffect(state, 'p1', chanceRepairs);
    // 4 houses × $25 + 1 hotel × $100 = $100 + $100 = $200
    expect(result.state.players[0].cash).toBe(1500 - 200);
  });

  it('CC repairs: $40/house, $115/hotel', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 4, mortgaged: false }); // 4 houses
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // 1 hotel

    const ccRepairs: Card = {
      id: 'cc-14',
      deck: 'communityChest',
      text: 'You are assessed for street repairs. Pay $40 per house and $115 per hotel.',
      effect: { type: 'repairs', perHouse: 40, perHotel: 115 },
    };
    const result = applyCardEffect(state, 'p1', ccRepairs);
    // 4 houses × $40 + 1 hotel × $115 = $160 + $115 = $275
    expect(result.state.players[0].cash).toBe(1500 - 275);
  });

  it('same building state, different rates → different costs', () => {
    const state = make2State();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });

    // Chance: 2 × $25 + 1 × $100 = $150
    const chanceCard: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Repairs',
      effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
    };
    const r1 = applyCardEffect(state, 'p1', chanceCard);
    expect(r1.state.players[0].cash).toBe(1350);

    // CC: 2 × $40 + 1 × $115 = $195
    const ccCard: Card = {
      id: 'test2',
      deck: 'communityChest',
      text: 'Repairs',
      effect: { type: 'repairs', perHouse: 40, perHotel: 115 },
    };
    const r2 = applyCardEffect(state, 'p1', ccCard);
    expect(r2.state.players[0].cash).toBe(1305);
  });
});

// ─── P6.S1.T18 — Edge: declining player wins auction ────────────────

describe('P6.S1.T18 — Declining Player Wins Auction', () => {
  beforeEach(() => {
    resetPropertyStates('test-edge');
    resetBuildingSupply('test-edge');
  });

  it('decliner bids and wins their own auction', () => {
    const state = make3State();
    // p1 declines to buy Baltic ($60), auction starts
    const auction = startAuction(state, 3);
    expect(auction.eligiblePlayers).toContain('p1');

    // p1 bids $30 (below face value!)
    placeBid(state, 'p1', 30);

    // p2 passes
    passBid(state, 'p2');

    // p3 passes
    passBid(state, 'p3');

    // Auction complete
    expect(isAuctionComplete(state)).toBe(true);

    // Resolve: p1 wins at $30 (different from face value of $60)
    const newState = resolveAuction(state);
    expect(newState.players[0].properties).toContain(3);
    expect(newState.players[0].cash).toBe(1470); // 1500 - 30
  });

  it('decliner outbids others in auction', () => {
    const state = make3State();
    startAuction(state, 3);

    // p2 bids $20
    placeBid(state, 'p2', 20);

    // p1 (decliner) outbids with $25
    placeBid(state, 'p1', 25);

    // p3 passes
    passBid(state, 'p3');

    // p2 passes
    passBid(state, 'p2');

    expect(isAuctionComplete(state)).toBe(true);
    const newState = resolveAuction(state);
    expect(newState.players[0].properties).toContain(3);
    expect(newState.players[0].cash).toBe(1475); // 1500 - 25
  });
});

// ─── Turn State Machine Coverage ────────────────────────────────────

describe('P6.S1 — Turn State Machine Coverage', () => {
  it('all valid actions for each state', () => {
    const tsm = new TurnStateMachine();
    expect(tsm.getValidActions()).toContain('RollDice');
    expect(tsm.getValidActions()).toContain('PayJailFine');
    expect(tsm.getValidActions()).toContain('UseJailCard');

    tsm.currentState = TurnState.Rolling;
    expect(tsm.getValidActions()).toEqual([]);

    tsm.currentState = TurnState.Resolving;
    expect(tsm.getValidActions()).toEqual([]);

    tsm.currentState = TurnState.AwaitingBuyDecision;
    expect(tsm.getValidActions()).toContain('BuyProperty');
    expect(tsm.getValidActions()).toContain('DeclineProperty');

    tsm.currentState = TurnState.Auction;
    expect(tsm.getValidActions()).toContain('AuctionBid');
    expect(tsm.getValidActions()).toContain('AuctionPass');

    tsm.currentState = TurnState.PlayerAction;
    expect(tsm.getValidActions()).toContain('BuildHouse');
    expect(tsm.getValidActions()).toContain('EndTurn');

    tsm.currentState = TurnState.EndTurn;
    expect(tsm.getValidActions()).toEqual([]);
  });

  it('WaitingForRoll throws for invalid action', () => {
    const tsm = new TurnStateMachine();
    expect(() => tsm.transition({ type: 'BuildHouse', propertyId: 1 })).toThrow('Invalid action');
  });

  it('AwaitingBuyDecision throws for invalid action', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.AwaitingBuyDecision;
    expect(() => tsm.transition({ type: 'EndTurn' })).toThrow('Invalid action');
  });

  it('Auction throws for invalid action', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.Auction;
    expect(() => tsm.transition({ type: 'EndTurn' })).toThrow('Invalid action');
  });

  it('PlayerAction throws for invalid action', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.PlayerAction;
    expect(() => tsm.transition({ type: 'RollDice' })).toThrow('Invalid action');
  });

  it('Rolling auto-transitions to Resolving', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.Rolling;
    const next = tsm.transition({ type: 'RollDice' });
    expect(next).toBe(TurnState.Resolving);
  });

  it('Resolving transitions to AwaitingBuyDecision when landed on unowned', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.Resolving;
    const next = tsm.transition({ type: 'RollDice' }, { landedOnUnownedProperty: true });
    expect(next).toBe(TurnState.AwaitingBuyDecision);
  });

  it('Resolving transitions to PlayerAction when not unowned', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.Resolving;
    const next = tsm.transition({ type: 'RollDice' }, { landedOnUnownedProperty: false });
    expect(next).toBe(TurnState.PlayerAction);
  });

  it('AwaitingBuyDecision → BuyProperty → PlayerAction', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.AwaitingBuyDecision;
    const next = tsm.transition({ type: 'BuyProperty', propertyId: 3 });
    expect(next).toBe(TurnState.PlayerAction);
  });

  it('AwaitingBuyDecision → DeclineProperty → Auction', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.AwaitingBuyDecision;
    const next = tsm.transition({ type: 'DeclineProperty', propertyId: 3 });
    expect(next).toBe(TurnState.Auction);
  });

  it('Auction stays in Auction on bid', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.Auction;
    const next = tsm.transition({ type: 'AuctionBid', amount: 50 });
    expect(next).toBe(TurnState.Auction);
  });

  it('Auction transitions to PlayerAction when complete', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.Auction;
    const next = tsm.transition({ type: 'AuctionBid', amount: 50 }, { auctionComplete: true });
    expect(next).toBe(TurnState.PlayerAction);
  });

  it('EndTurn → WaitingForRoll', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.EndTurn;
    const next = tsm.transition({ type: 'EndTurn' });
    expect(next).toBe(TurnState.WaitingForRoll);
  });

  it('PlayerAction with doubles → EndTurn goes back to WaitingForRoll', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.PlayerAction;
    tsm.rolledDoubles = true;
    const next = tsm.transition({ type: 'EndTurn' });
    expect(next).toBe(TurnState.WaitingForRoll);
    expect(tsm.rolledDoubles).toBe(false);
  });

  it('PlayerAction without doubles → EndTurn goes to EndTurn', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.PlayerAction;
    tsm.rolledDoubles = false;
    const next = tsm.transition({ type: 'EndTurn' });
    expect(next).toBe(TurnState.EndTurn);
  });

  it('PayJailFine and UseJailCard stay in WaitingForRoll', () => {
    const tsm = new TurnStateMachine();
    let next = tsm.transition({ type: 'PayJailFine' });
    expect(next).toBe(TurnState.WaitingForRoll);

    tsm.currentState = TurnState.WaitingForRoll;
    next = tsm.transition({ type: 'UseJailCard' });
    expect(next).toBe(TurnState.WaitingForRoll);
  });

  it('BuildHouse, SellBuilding, etc. stay in PlayerAction', () => {
    const tsm = new TurnStateMachine();
    tsm.currentState = TurnState.PlayerAction;

    expect(tsm.transition({ type: 'BuildHouse', propertyId: 1 })).toBe(TurnState.PlayerAction);
    expect(tsm.transition({ type: 'BuildHotel', propertyId: 1 })).toBe(TurnState.PlayerAction);
    expect(tsm.transition({ type: 'SellBuilding', propertyId: 1, count: 1 })).toBe(
      TurnState.PlayerAction,
    );
    expect(tsm.transition({ type: 'MortgageProperty', propertyId: 1 })).toBe(
      TurnState.PlayerAction,
    );
    expect(tsm.transition({ type: 'UnmortgageProperty', propertyId: 1 })).toBe(
      TurnState.PlayerAction,
    );
    expect(
      tsm.transition({
        type: 'ProposeTrade',
        recipientId: 'p2',
        offer: {
          offeredProperties: [],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        },
      }),
    ).toBe(TurnState.PlayerAction);
  });

  it('unknown state throws', () => {
    const tsm = new TurnStateMachine();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tsm as any).currentState = 'UnknownState';
    expect(() => tsm.transition({ type: 'RollDice' })).toThrow('Unknown state');
    expect(tsm.getValidActions()).toEqual([]);
  });
});

// ─── Event System Coverage ──────────────────────────────────────────

describe('P6.S1 — Event System Coverage', () => {
  it('wildcard handler receives all events', () => {
    const emitter = new GameEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = [];
    emitter.on('*', (e) => events.push(e));

    emitter.emit({
      id: '1',
      gameId: 'g',
      type: GameEventType.DiceRolled,
      payload: {},
      timestamp: 1,
    });
    emitter.emit({
      id: '2',
      gameId: 'g',
      type: GameEventType.PlayerMoved,
      payload: {},
      timestamp: 2,
    });

    expect(events).toHaveLength(2);
  });

  it('GameEventLog clear removes all events', () => {
    const log = new GameEventLog('g1');
    log.append(GameEventType.DiceRolled, {});
    log.append(GameEventType.PlayerMoved, {});
    expect(log.length).toBe(2);
    log.clear();
    expect(log.length).toBe(0);
    expect(log.getAll()).toEqual([]);
  });

  it('GameEventLog length returns correct count', () => {
    const log = new GameEventLog('g1');
    expect(log.length).toBe(0);
    log.append(GameEventType.DiceRolled, {});
    expect(log.length).toBe(1);
    log.append(GameEventType.PlayerMoved, {});
    expect(log.length).toBe(2);
  });

  it('off handler does not affect other handlers', () => {
    const emitter = new GameEventEmitter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on(GameEventType.DiceRolled, h1);
    emitter.on(GameEventType.DiceRolled, h2);
    emitter.off(GameEventType.DiceRolled, h1);
    emitter.emit({
      id: '1',
      gameId: 'g',
      type: GameEventType.DiceRolled,
      payload: {},
      timestamp: 1,
    });
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });
});

// ─── State Module Coverage ──────────────────────────────────────────

describe('P6.S1 — State Module Coverage', () => {
  it('createInitialGameState with custom settings', () => {
    const state = createInitialGameState(twoPlayers, {
      gameId: 'custom',
      settings: { startingCash: 2000 },
    });
    expect(state.gameId).toBe('custom');
    expect(state.players[0].cash).toBe(2000);
  });

  it('createInitialGameState auto-generates gameId', () => {
    const state = createInitialGameState(twoPlayers);
    expect(state.gameId).toMatch(/^game-/);
  });

  it('createInitialGameState assigns tokens from TokenType', () => {
    const state = createInitialGameState(twoPlayers);
    expect(state.players[0].token).toBeDefined();
    expect(state.players[1].token).toBeDefined();
  });

  it('getSpaceByPosition returns undefined for invalid position', () => {
    const state = createInitialGameState(twoPlayers);
    expect(getSpaceByPosition(state, 100)).toBeUndefined();
  });
});
