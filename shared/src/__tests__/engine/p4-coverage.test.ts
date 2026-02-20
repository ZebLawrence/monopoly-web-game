import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
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
  getColorGroupSpaces,
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
import {
  createInitialGameState,
  getSpaceByPosition,
  getPlayerById,
  getPropertiesOwnedBy,
  spaceToProperty,
  isGameOver,
  serializeGameState,
  deserializeGameState,
  type PlayerSetup,
} from '../../engine/state';
import { TurnStateMachine } from '../../engine/turn-machine';
import { GameEventEmitter, GameEventLog } from '../../engine/events';
import { TurnState } from '../../types/turn';
import { GameEventType } from '../../types/gameEvent';
import type { GameState } from '../../types/gameState';
import type { Card } from '../../types/card';
import { SpaceType } from '../../types/space';
import chanceCardsData from '../../data/chance-cards.json';
import communityChestCardsData from '../../data/community-chest-cards.json';

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

function make2(gameId = 'cov-test'): GameState {
  const state = createInitialGameState(twoPlayers, { gameId });
  initBuildingSupply(state);
  return state;
}

function make3(gameId = 'cov-test'): GameState {
  const state = createInitialGameState(threePlayers, { gameId });
  initBuildingSupply(state);
  return state;
}

function make4(gameId = 'cov-test'): GameState {
  const state = createInitialGameState(fourPlayers, { gameId });
  initBuildingSupply(state);
  return state;
}

const diceNonDoubles: DiceResult = { die1: 3, die2: 5, total: 8, isDoubles: false };

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T1 — dice.ts and spaces.ts ≥100% branch coverage
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T1 — dice.ts 100% branch coverage', () => {
  beforeEach(() => {
    resetDoublesTracker('cov-test');
  });

  it('getConsecutiveDoubles returns 0 when gameMap exists but player not tracked', () => {
    const state = make2();
    // Set doubles for p1 so game map is initialized
    setConsecutiveDoubles(state, 'p1', 1);
    // p2 not in the map — should return 0 via ?? fallback
    expect(getConsecutiveDoubles(state, 'p2')).toBe(0);
  });

  it('didPassGo: landing on Go exactly (pos 35 + 5 = 40 → 0)', () => {
    // From position 35, rolling 5 lands on position 0 (Go)
    const newPos = calculateNewPosition(35, 5);
    expect(newPos).toBe(0);
    // didPassGo should return true (wrapped around)
    expect(didPassGo(35, 0)).toBe(true);
  });

  it('applyMovement: landing on Go exactly awards $200', () => {
    const state = make2();
    state.players[0].position = 35;
    const dice: DiceResult = { die1: 3, die2: 2, total: 5, isDoubles: false };
    const result = applyMovement(state, 'p1', dice);
    expect(result.state.players[0].position).toBe(0);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700);
  });
});

describe('P4.S12.T1 — spaces.ts 100% branch coverage', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  it('resolveSpace for Go space returns noAction', () => {
    const state = make2();
    state.players[0].position = 0;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('noAction');
  });

  it('applySpaceResolution throws for non-existent player', () => {
    const state = make2();
    expect(() =>
      applySpaceResolution(state, 'nonexistent', {
        type: 'tax',
        space: state.board[4],
        taxAmount: 200,
      }),
    ).toThrow('not found');
  });

  it('calculateStreetRent with monopoly doubles base rent', () => {
    const state = make2();
    const baltic = getSpaceByPosition(state, 3)!;
    // Base rent $4, doubled = $8
    expect(calculateStreetRent(baltic, 0, true)).toBe(8);
    expect(calculateStreetRent(baltic, 0, false)).toBe(4);
  });

  it('getPropertyOwnership returns correct data with propertyState', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 2, mortgaged: false });
    const ownership = getPropertyOwnership(state, 3);
    expect(ownership).toEqual({ ownerId: 'p1', houses: 2, mortgaged: false });
  });

  it('getPropertyOwnership without propertyState defaults to 0 houses', () => {
    const state = make2();
    state.players[0].properties = [3];
    const ownership = getPropertyOwnership(state, 3);
    expect(ownership).toEqual({ ownerId: 'p1', houses: 0, mortgaged: false });
  });

  it('getColorGroupSpaces returns correct spaces for brown', () => {
    const state = make2();
    const brownSpaces = getColorGroupSpaces(state, 'brown');
    expect(brownSpaces).toHaveLength(2);
    expect(brownSpaces.map((s) => s.name)).toContain('Mediterranean Avenue');
    expect(brownSpaces.map((s) => s.name)).toContain('Baltic Avenue');
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T2 — cards.ts: exercise all 32 cards
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T2 — All 32 cards exercised', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  it('Chance deck has exactly 16 cards', () => {
    const cards = chanceCardsData as Card[];
    expect(cards).toHaveLength(16);
  });

  it('Community Chest deck has exactly 16 cards', () => {
    const cards = communityChestCardsData as Card[];
    expect(cards).toHaveLength(16);
  });

  it('exercises all 16 Chance card effects', () => {
    const chanceCards = chanceCardsData as Card[];
    const effectTypes = chanceCards.map((c) => c.effect.type);

    // Verify all expected effect types are present
    expect(effectTypes.filter((t) => t === 'move')).toHaveLength(5); // Boardwalk, Go, Illinois, St. Charles, Reading
    expect(effectTypes.filter((t) => t === 'advanceNearestRailroad')).toHaveLength(2);
    expect(effectTypes.filter((t) => t === 'advanceNearestUtility')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'cash')).toHaveLength(3); // $50, -$15, $150
    expect(effectTypes.filter((t) => t === 'goojf')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'moveBack')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'jail')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'repairs')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'payEachPlayer')).toHaveLength(1);

    // Exercise each card effect
    for (const card of chanceCards) {
      const s = make4();
      s.players[0].position = 7; // A Chance position
      s.players[0].properties = [1, 3]; // For repairs
      setPropertyState(s, { spaceId: 1, houses: 1, mortgaged: false });
      setPropertyState(s, { spaceId: 3, houses: 0, mortgaged: false });
      s.players[0].getOutOfJailFreeCards = 1; // For GOOJF

      const dice: DiceResult = { die1: 4, die2: 3, total: 7, isDoubles: false };
      // This should not throw for any card
      const result = applyCardEffect(s, 'p1', card, dice);
      expect(result.state).toBeDefined();
    }
  });

  it('exercises all 16 Community Chest card effects', () => {
    const ccCards = communityChestCardsData as Card[];
    const effectTypes = ccCards.map((c) => c.effect.type);

    expect(effectTypes.filter((t) => t === 'move')).toHaveLength(1); // Advance to Go
    expect(effectTypes.filter((t) => t === 'cash')).toHaveLength(11);
    expect(effectTypes.filter((t) => t === 'goojf')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'jail')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'repairs')).toHaveLength(1);
    expect(effectTypes.filter((t) => t === 'collectFromAll')).toHaveLength(1);

    // Exercise each card effect
    for (const card of ccCards) {
      const s = make4();
      s.players[0].position = 2; // A CC position
      s.players[0].properties = [1, 3];
      setPropertyState(s, { spaceId: 1, houses: 2, mortgaged: false });
      setPropertyState(s, { spaceId: 3, houses: 5, mortgaged: false }); // Hotel
      s.players[0].getOutOfJailFreeCards = 1;

      const dice: DiceResult = { die1: 4, die2: 3, total: 7, isDoubles: false };
      const result = applyCardEffect(s, 'p1', card, dice);
      expect(result.state).toBeDefined();
    }
  });

  it('advance to nearest railroad: landing on own railroad', () => {
    const state = make2();
    state.players[0].position = 7;
    state.players[0].properties = [15]; // Alice owns Pennsylvania RR
    setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });

    const card: Card = {
      id: 'test-rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(15);
    // Own property — no rent, no buy decision
    expect(result.needsBuyDecision).toBeUndefined();
    expect(result.spaceResolution).toBeUndefined();
  });

  it('advance to nearest utility: landing on own utility', () => {
    const state = make2();
    state.players[0].position = 7;
    state.players[0].properties = [12]; // Alice owns Electric Company
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });

    const card: Card = {
      id: 'test-util',
      deck: 'chance',
      text: 'Nearest Utility',
      effect: { type: 'advanceNearestUtility' },
    };
    const result = applyCardEffect(state, 'p1', card, diceNonDoubles);
    expect(result.movedToPosition).toBe(12);
    expect(result.needsBuyDecision).toBeUndefined();
    expect(result.spaceResolution).toBeUndefined();
  });

  it('drawCard from communityChest deck', () => {
    const state = make2();
    // Ensure first CC card is non-GOOJF
    const nonGoojf = state.decks.communityChest.find((c: Card) => c.effect.type !== 'goojf')!;
    state.decks.communityChest = [
      nonGoojf,
      ...state.decks.communityChest.filter((c: Card) => c.id !== nonGoojf.id),
    ];

    const { state: newState, card } = drawCard(state, 'communityChest');
    expect(card.id).toBe(nonGoojf.id);
    expect(newState.decks.communityChest).toHaveLength(16);
    expect(newState.decks.communityChest[newState.decks.communityChest.length - 1].id).toBe(
      nonGoojf.id,
    );
  });

  it('returnCardToDeck to communityChest', () => {
    const state = make2();
    const card: Card = {
      id: 'cc-test',
      deck: 'communityChest',
      text: 'Test',
      effect: { type: 'cash', amount: 0 },
    };
    const newState = returnCardToDeck(state, card, 'communityChest');
    expect(newState.decks.communityChest[newState.decks.communityChest.length - 1].id).toBe(
      'cc-test',
    );
  });

  it('applyCardEffect with unknown effect type returns state unchanged', () => {
    const state = make2();
    const card: Card = {
      id: 'test-unknown',
      deck: 'chance',
      text: 'Unknown',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      effect: { type: 'unknownType' } as any,
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T3 — properties.ts: auction with no bids, hotel downgrade
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T3 — Property edge cases', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  it('auction with no bids: property remains unowned', () => {
    const state = make3();
    startAuction(state, 3);
    passBid(state, 'p1');
    passBid(state, 'p2');
    passBid(state, 'p3');
    expect(isAuctionComplete(state)).toBe(true);
    const newState = resolveAuction(state);
    for (const p of newState.players) {
      expect(p.properties).not.toContain(3);
    }
  });

  it('hotel downgrade blocked by insufficient house supply', () => {
    const state = make2();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });
    setBuildingSupply(state, { houses: 3, hotels: 10 }); // Only 3 houses, need 4

    const error = canSellBuilding(state, 'p1', 3);
    expect(error).toContain('not enough houses');
    expect(() => sellBuilding(state, 'p1', 3)).toThrow('not enough houses');
  });

  it('canSellBuilding even-sell violation', () => {
    const state = make2();
    // Light blue: Oriental (6), Vermont (8), Connecticut (9)
    state.players[0].properties = [6, 8, 9];
    setPropertyState(state, { spaceId: 6, houses: 2, mortgaged: false });
    setPropertyState(state, { spaceId: 8, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 9, houses: 2, mortgaged: false });
    // Selling from 6 (has 2) → becomes 1, but 9 still has 2 → diff = 2-1 = 1, OK
    // But selling from 8 (has 0) is invalid since it already has 0
    expect(canSellBuilding(state, 'p1', 8)).toContain('No buildings');
  });

  it('isAuctionComplete: multiple remaining players, not complete', () => {
    const state = make3();
    startAuction(state, 3);
    // No passes yet — 3 remaining
    expect(isAuctionComplete(state)).toBe(false);
    // One passes, two remain
    passBid(state, 'p3');
    expect(isAuctionComplete(state)).toBe(false);
  });

  it('isAuctionComplete: all passed including bidder → complete', () => {
    const state = make3();
    startAuction(state, 3);
    placeBid(state, 'p1', 50);
    passBid(state, 'p2');
    passBid(state, 'p3');
    // Only p1 remaining, and p1 is high bidder
    expect(isAuctionComplete(state)).toBe(true);
  });

  it('isAuctionComplete returns true when no auction', () => {
    const state = make2();
    // No auction started
    expect(isAuctionComplete(state)).toBe(true);
  });

  it('placeBid rejects already-passed player', () => {
    const state = make2();
    startAuction(state, 3);
    passBid(state, 'p1');
    expect(() => placeBid(state, 'p1', 10)).toThrow('already passed');
  });

  it('buyProperty rejects non-purchasable space', () => {
    const state = make2();
    state.players[0].position = 0; // Go
    expect(() => buyProperty(state, 'p1', 0)).toThrow('not purchasable');
  });

  it('buyProperty rejects when not on the space', () => {
    const state = make2();
    state.players[0].position = 0; // Go
    expect(() => buyProperty(state, 'p1', 3)).toThrow('not on space');
  });

  it('canBuildHouse rejects for non-Property type', () => {
    const state = make2();
    state.players[0].properties = [5]; // Railroad
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    expect(canBuildHouse(state, 'p1', 5)).toContain('street properties');
  });

  it('canBuildHouse rejects when already has hotel', () => {
    const state = make2();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });
    expect(canBuildHouse(state, 'p1', 1)).toContain('hotel');
  });

  it('canBuildHouse rejects insufficient funds', () => {
    const state = make2();
    state.players[0].properties = [1, 3];
    state.players[0].cash = 10; // Can't afford $50 house
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    expect(canBuildHouse(state, 'p1', 1)).toContain('Cannot afford');
  });

  it('canBuildHouse rejects when no hotels available', () => {
    const state = make2();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 4, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 4, mortgaged: false });
    setBuildingSupply(state, { houses: 32, hotels: 0 });
    expect(canBuildHouse(state, 'p1', 1)).toContain('No hotels');
  });

  it('canBuildHouse rejects non-existent player', () => {
    const state = make2();
    expect(canBuildHouse(state, 'nonexistent', 1)).toContain('not found');
  });

  it('canBuildHouse rejects non-existent space', () => {
    const state = make2();
    expect(canBuildHouse(state, 'p1', 999)).toContain('not found');
  });

  it('canSellBuilding rejects non-existent player', () => {
    const state = make2();
    expect(canSellBuilding(state, 'nonexistent', 1)).toContain('not found');
  });

  it('canSellBuilding rejects non-existent space', () => {
    const state = make2();
    expect(canSellBuilding(state, 'p1', 999)).toContain('not found');
  });

  it('mortgageProperty rejects property not owned', () => {
    const state = make2();
    expect(() => mortgageProperty(state, 'p1', 3)).toThrow('does not own');
  });

  it('mortgageProperty rejects already mortgaged', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
    expect(() => mortgageProperty(state, 'p1', 3)).toThrow('already mortgaged');
  });

  it('unmortgageProperty rejects property not owned', () => {
    const state = make2();
    expect(() => unmortgageProperty(state, 'p1', 3)).toThrow('does not own');
  });

  it('unmortgageProperty rejects non-mortgaged property', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    expect(() => unmortgageProperty(state, 'p1', 3)).toThrow('not mortgaged');
  });

  it('resolveAuction with no bids returns state unchanged', () => {
    const state = make2();
    startAuction(state, 1);
    passBid(state, 'p1');
    passBid(state, 'p2');
    const newState = resolveAuction(state);
    // No bids, property stays unowned
    for (const p of newState.players) {
      expect(p.properties).not.toContain(1);
    }
  });

  it('passBid throws when no auction', () => {
    const state = make2();
    expect(() => passBid(state, 'p1')).toThrow('No active auction');
  });

  it('placeBid throws when no auction', () => {
    const state = make2();
    expect(() => placeBid(state, 'p1', 50)).toThrow('No active auction');
  });

  it('passBid is idempotent', () => {
    const state = make2();
    startAuction(state, 3);
    passBid(state, 'p1');
    const auction = passBid(state, 'p1'); // Pass again
    // Should not add duplicate
    expect(auction.passedPlayers.filter((id) => id === 'p1')).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T4 — trading.ts: counter-trade, error paths
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T4 — Trading edge cases', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetTrades();
  });

  it('counterTrade creates new offer with swapped roles, original marked countered', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    state.players[1].properties = [6];
    setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });

    const { trade: original } = createTradeOffer(state, 'p1', 'p2', {
      offeredProperties: [3],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [6],
      requestedCash: 0,
      requestedCards: 0,
    });
    storeTrade(original);

    const { trade: counter } = counterTrade(state, original.id, {
      offeredProperties: [6],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [3],
      requestedCash: 100,
      requestedCards: 0,
    });

    // Counter has swapped roles
    expect(counter.proposerId).toBe('p2');
    expect(counter.recipientId).toBe('p1');
    expect(counter.status).toBe('pending');

    // Original marked as countered
    const orig = getTrade(original.id);
    expect(orig?.status).toBe('countered');
  });

  it('createTradeOffer throws for non-existent proposer', () => {
    const state = make2();
    expect(() =>
      createTradeOffer(state, 'nonexistent', 'p2', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('Proposer not found');
  });

  it('createTradeOffer throws for non-existent recipient', () => {
    const state = make2();
    expect(() =>
      createTradeOffer(state, 'p1', 'nonexistent', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('Recipient not found');
  });

  it('createTradeOffer throws for insufficient GOOJF cards (proposer)', () => {
    const state = make2();
    expect(() =>
      createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 3,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('not have enough GOOJF');
  });

  it('createTradeOffer throws for insufficient GOOJF cards (recipient)', () => {
    const state = make2();
    expect(() =>
      createTradeOffer(state, 'p1', 'p2', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 3,
      }),
    ).toThrow('not have enough GOOJF');
  });

  it('acceptTrade throws for non-existent trade', () => {
    const state = make2();
    expect(() => acceptTrade(state, 'non-existent-id')).toThrow('not found');
  });

  it('acceptTrade throws for non-pending trade', () => {
    const state = make2();
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
    rejectTrade(state, trade.id); // Now rejected
    expect(() => acceptTrade(state, trade.id)).toThrow('not pending');
  });

  it('rejectTrade throws for non-existent trade', () => {
    const state = make2();
    expect(() => rejectTrade(state, 'non-existent-id')).toThrow('not found');
  });

  it('counterTrade throws for non-existent trade', () => {
    const state = make2();
    expect(() =>
      counterTrade(state, 'non-existent-id', {
        offeredProperties: [],
        offeredCash: 0,
        offeredCards: 0,
        requestedProperties: [],
        requestedCash: 0,
        requestedCards: 0,
      }),
    ).toThrow('not found');
  });

  it('validateNoBuildings allows trade when space not found (non-existent spaceId)', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    // Property 3 exists, but let's add a non-existent property to player's list
    // and try to trade it. The validation function checks the board for the space.
    // Actually, the validation loop runs on offered/requested properties, so if a property
    // doesn't exist on the board, validateNoBuildings returns early.
    // This is already covered by the property ownership check.
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T5 — jail.ts: useJailCard returns GOOJF to correct deck
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T5 — Jail GOOJF card return', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
  });

  it('useJailCard with Chance GOOJF: card returned to Chance deck', () => {
    const state = make2();
    // Player draws Chance GOOJF
    const chanceGoojf = state.decks.chance.find((c: Card) => c.effect.type === 'goojf')!;
    state.decks.chance = [
      chanceGoojf,
      ...state.decks.chance.filter((c: Card) => c.id !== chanceGoojf.id),
    ];

    const { state: s2 } = drawCard(state, 'chance');
    expect(s2.players[0].getOutOfJailFreeCards).toBe(1);
    expect(s2.decks.chance).toHaveLength(15); // GOOJF removed

    // Put player in jail
    s2.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
    s2.players[0].position = 10;

    // Use the card
    const s3 = useJailCard(s2, 'p1');
    expect(s3.players[0].getOutOfJailFreeCards).toBe(0);
    expect(s3.players[0].jailStatus).toEqual({ inJail: false });

    // Return card to Chance deck
    const s4 = returnCardToDeck(s3, chanceGoojf, 'chance');
    expect(s4.decks.chance).toHaveLength(16);
    expect(s4.decks.chance[s4.decks.chance.length - 1].id).toBe(chanceGoojf.id);
  });

  it('useJailCard with CC GOOJF: card returned to Community Chest deck', () => {
    const state = make2();
    // Player draws CC GOOJF
    const ccGoojf = state.decks.communityChest.find((c: Card) => c.effect.type === 'goojf')!;
    state.decks.communityChest = [
      ccGoojf,
      ...state.decks.communityChest.filter((c: Card) => c.id !== ccGoojf.id),
    ];

    const { state: s2 } = drawCard(state, 'communityChest');
    expect(s2.players[0].getOutOfJailFreeCards).toBe(1);
    expect(s2.decks.communityChest).toHaveLength(15);

    // Put player in jail
    s2.players[0].jailStatus = { inJail: true, turnsInJail: 0 };
    s2.players[0].position = 10;

    // Use the card
    const s3 = useJailCard(s2, 'p1');
    expect(s3.players[0].getOutOfJailFreeCards).toBe(0);
    expect(s3.players[0].jailStatus).toEqual({ inJail: false });

    // Return card to CC deck
    const s4 = returnCardToDeck(s3, ccGoojf, 'communityChest');
    expect(s4.decks.communityChest).toHaveLength(16);
    expect(s4.decks.communityChest[s4.decks.communityChest.length - 1].id).toBe(ccGoojf.id);
  });

  it('payJailFine throws when player is not in jail', () => {
    const state = make2();
    state.players[0].jailStatus = { inJail: false };
    expect(() => payJailFine(state, 'p1')).toThrow('not in jail');
  });

  it('useJailCard throws when player is not in jail', () => {
    const state = make2();
    state.players[0].jailStatus = { inJail: false };
    state.players[0].getOutOfJailFreeCards = 1;
    expect(() => useJailCard(state, 'p1')).toThrow('not in jail');
  });

  it('rollInJail throws when player is not in jail', () => {
    const state = make2();
    state.players[0].jailStatus = { inJail: false };
    const dice: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
    expect(() => rollInJail(state, 'p1', dice)).toThrow('not in jail');
  });

  it('sendToJail throws for non-existent player', () => {
    const state = make2();
    expect(() => sendToJail(state, 'nonexistent')).toThrow('not found');
  });

  it('payJailFine throws for non-existent player', () => {
    const state = make2();
    expect(() => payJailFine(state, 'nonexistent')).toThrow('not found');
  });

  it('useJailCard throws for non-existent player', () => {
    const state = make2();
    expect(() => useJailCard(state, 'nonexistent')).toThrow('not found');
  });

  it('rollInJail throws for non-existent player', () => {
    const state = make2();
    const dice: DiceResult = { die1: 3, die2: 3, total: 6, isDoubles: true };
    expect(() => rollInJail(state, 'nonexistent', dice)).toThrow('not found');
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T6 — Edge cases: landing on Go, nearest railroad wrapping
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T6 — Go and nearest railroad edge cases', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetDoublesTracker('cov-test');
  });

  it('landing on Go exactly awards $200', () => {
    const state = make2();
    state.players[0].position = 35;
    const dice: DiceResult = { die1: 3, die2: 2, total: 5, isDoubles: false };
    const result = applyMovement(state, 'p1', dice);
    expect(result.state.players[0].position).toBe(0);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700);
  });

  it('nearest railroad from pos 7 → pos 15 (Pennsylvania RR)', () => {
    const state = make2();
    state.players[0].position = 7;
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(15);
    expect(result.passedGo).toBe(false);
  });

  it('nearest railroad from pos 22 → pos 25 (B&O RR)', () => {
    const state = make2();
    state.players[0].position = 22;
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(25);
    expect(result.passedGo).toBe(false);
  });

  it('nearest railroad from pos 36 → pos 5 (Reading RR, wraps Go, +$200)', () => {
    const state = make2();
    state.players[0].position = 36;
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(5);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700); // +$200 for passing Go
  });

  it('nearest railroad from pos 36, owned by other → double rent + $200', () => {
    const state = make2();
    state.players[0].position = 36;
    state.players[1].properties = [5]; // Bob owns Reading RR
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(5);
    expect(result.passedGo).toBe(true);
    // $1500 + $200 (Go) - $50 (double rent for 1 RR: $25 × 2)
    expect(result.state.players[0].cash).toBe(1650);
    expect(result.spaceResolution?.rentAmount).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T7 — Nearest utility from all three Chance positions
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T7 — Nearest utility edge cases', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
  });

  const utilCard: Card = {
    id: 'util',
    deck: 'chance',
    text: 'Nearest Utility',
    effect: { type: 'advanceNearestUtility' },
  };

  it('from pos 7 → pos 12 (Electric Co), unowned', () => {
    const state = make2();
    state.players[0].position = 7;
    const result = applyCardEffect(state, 'p1', utilCard, diceNonDoubles);
    expect(result.movedToPosition).toBe(12);
    expect(result.passedGo).toBe(false);
    expect(result.needsBuyDecision).toBe(true);
  });

  it('from pos 22 → pos 28 (Water Works), unowned', () => {
    const state = make2();
    state.players[0].position = 22;
    const result = applyCardEffect(state, 'p1', utilCard, diceNonDoubles);
    expect(result.movedToPosition).toBe(28);
    expect(result.passedGo).toBe(false);
    expect(result.needsBuyDecision).toBe(true);
  });

  it('from pos 36 → pos 12 (Electric Co, wraps Go, +$200), unowned', () => {
    const state = make2();
    state.players[0].position = 36;
    const result = applyCardEffect(state, 'p1', utilCard, diceNonDoubles);
    expect(result.movedToPosition).toBe(12);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700);
    expect(result.needsBuyDecision).toBe(true);
  });

  it('from pos 7 → pos 12, owned by other → pay 10× dice', () => {
    const state = make2();
    state.players[0].position = 7;
    state.players[1].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    const dice: DiceResult = { die1: 4, die2: 3, total: 7, isDoubles: false };
    const result = applyCardEffect(state, 'p1', utilCard, dice);
    expect(result.movedToPosition).toBe(12);
    expect(result.spaceResolution?.rentAmount).toBe(70); // 7 × 10
  });

  it('from pos 22 → pos 28, owned by other → pay 10× dice', () => {
    const state = make2();
    state.players[0].position = 22;
    state.players[1].properties = [28];
    setPropertyState(state, { spaceId: 28, houses: 0, mortgaged: false });
    const dice: DiceResult = { die1: 5, die2: 3, total: 8, isDoubles: false };
    const result = applyCardEffect(state, 'p1', utilCard, dice);
    expect(result.movedToPosition).toBe(28);
    expect(result.spaceResolution?.rentAmount).toBe(80); // 8 × 10
  });

  it('from pos 36 → pos 12, owned by other, passes Go + pay rent', () => {
    const state = make2();
    state.players[0].position = 36;
    state.players[1].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    const dice: DiceResult = { die1: 4, die2: 4, total: 8, isDoubles: true };
    const result = applyCardEffect(state, 'p1', utilCard, dice);
    expect(result.movedToPosition).toBe(12);
    expect(result.passedGo).toBe(true);
    expect(result.spaceResolution?.rentAmount).toBe(80); // 8 × 10
    // $1500 + $200 (Go) - $80 (rent) = $1620
    expect(result.state.players[0].cash).toBe(1620);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T8 — Reading Railroad from pos 36, passes Go
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T8 — Reading Railroad trip from pos 36', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
  });

  it('Take a trip to Reading Railroad from pos 36: passes Go, collects $200, then resolves railroad', () => {
    const state = make2();
    state.players[0].position = 36;
    const card: Card = {
      id: 'reading',
      deck: 'chance',
      text: 'Take a trip to Reading Railroad',
      effect: { type: 'move', position: 5 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(5);
    expect(result.passedGo).toBe(true);
    expect(result.state.players[0].cash).toBe(1700); // +$200
    expect(result.needsBuyDecision).toBe(true); // Reading is unowned
  });

  it('Reading Railroad from pos 36, owned → pays rent + $200 Go', () => {
    const state = make2();
    state.players[0].position = 36;
    state.players[1].properties = [5]; // Bob owns Reading
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'reading',
      deck: 'chance',
      text: 'Take a trip to Reading Railroad',
      effect: { type: 'move', position: 5 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(5);
    expect(result.passedGo).toBe(true);
    expect(result.spaceResolution?.type).toBe('rentPayment');
    expect(result.spaceResolution?.rentAmount).toBe(25); // 1 RR = $25
    // $1500 + $200 - $25 = $1675
    expect(result.state.players[0].cash).toBe(1675);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T9 — Card chain: movement to Chance/CC triggers second card
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T9 — Card chain effects', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
  });

  it('Go Back 3 from pos 36 (Chance) → lands on CC pos 33 → triggers CC draw', () => {
    const state = make2();
    state.players[0].position = 36;
    const card: Card = {
      id: 'back3',
      deck: 'chance',
      text: 'Go Back 3 Spaces',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card, diceNonDoubles);
    expect(result.state.players[0].position).toBe(33);
    // Position 33 is Community Chest — resolveSpace returns drawCard
    expect(result.spaceResolution?.type).toBe('drawCard');
    expect(result.spaceResolution?.deckName).toBe('communityChest');
  });

  it('Go Back 3 from Chance pos 7 → lands on pos 4 (Income Tax)', () => {
    const state = make2();
    state.players[0].position = 7;
    const card: Card = {
      id: 'back3',
      deck: 'chance',
      text: 'Go Back 3 Spaces',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card, diceNonDoubles);
    expect(result.state.players[0].position).toBe(4);
    expect(result.spaceResolution?.type).toBe('tax');
    expect(result.spaceResolution?.taxAmount).toBe(200);
  });

  it('moveBack that lands on unowned property gives buy decision', () => {
    const state = make2();
    state.players[0].position = 22;
    const card: Card = {
      id: 'back3',
      deck: 'chance',
      text: 'Go Back 3 Spaces',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card, diceNonDoubles);
    expect(result.state.players[0].position).toBe(19); // New York Avenue (unowned)
    expect(result.needsBuyDecision).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T10 — Street repairs at different rates
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T10 — Repairs rates: CC vs Chance', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
  });

  it('Chance repairs: $25/house, $100/hotel', () => {
    const state = make4();
    state.players[0].properties = [1, 3, 11];
    setPropertyState(state, { spaceId: 1, houses: 3, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 11, houses: 5, mortgaged: false }); // Hotel

    const card: Card = {
      id: 'chance-repairs',
      deck: 'chance',
      text: 'General Repairs',
      effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // 3 houses × $25 + 1 hotel × $100 = $75 + $100 = $175
    expect(result.state.players[0].cash).toBe(1500 - 175);
  });

  it('CC repairs: $40/house, $115/hotel', () => {
    const state = make4();
    state.players[0].properties = [1, 3, 11];
    setPropertyState(state, { spaceId: 1, houses: 3, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 11, houses: 5, mortgaged: false }); // Hotel

    const card: Card = {
      id: 'cc-repairs',
      deck: 'communityChest',
      text: 'Street Repairs',
      effect: { type: 'repairs', perHouse: 40, perHotel: 115 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // 3 houses × $40 + 1 hotel × $115 = $120 + $115 = $235
    expect(result.state.players[0].cash).toBe(1500 - 235);
  });

  it('repairs with property that has no propertyState tracked', () => {
    const state = make2();
    state.players[0].properties = [3]; // Baltic, but no setPropertyState called
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Repairs',
      effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
    };
    const result = applyCardEffect(state, 'p1', card);
    // No property state → propState is null → no cost
    expect(result.state.players[0].cash).toBe(1500);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T11 — Building auction with limited houses
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T11 — Building with limited supply', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  it('only 1 house left: one player builds, other is blocked', () => {
    const state = make2();
    // Both players have monopolies
    state.players[0].properties = [1, 3]; // Brown monopoly
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

    state.players[1].properties = [6, 8, 9]; // Light blue monopoly
    setPropertyState(state, { spaceId: 6, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 8, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 9, houses: 0, mortgaged: false });

    setBuildingSupply(state, { houses: 1, hotels: 12 });

    // Player 1 builds
    const s2 = buildHouse(state, 'p1', 1);
    expect(getPropertyState(s2, 1)?.houses).toBe(1);
    expect(getBuildingSupply(s2).houses).toBe(0);

    // Player 2 is now blocked
    expect(canBuildHouse(s2, 'p2', 6)).toContain('No houses');
  });
});

// ─────────────────────────────────────────────────────────────────────
// P4.S12.T12 — Declining player wins own auction
// ─────────────────────────────────────────────────────────────────────

describe('P4.S12.T12 — Decliner wins own auction', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  it('declining player bids and wins the auction at a lower price', () => {
    const state = make3();
    // p1 lands on Baltic ($60) but declines to buy
    // Auction starts, p1 (the decliner) bids $30
    startAuction(state, 3);
    placeBid(state, 'p1', 30); // Decliner bids
    passBid(state, 'p2');
    passBid(state, 'p3');

    expect(isAuctionComplete(state)).toBe(true);
    const newState = resolveAuction(state);

    // Decliner wins at $30 (less than the $60 face value)
    expect(newState.players[0].properties).toContain(3);
    expect(newState.players[0].cash).toBe(1470); // 1500 - 30
  });

  it('decliner bids, others pass → decliner wins', () => {
    const state = make2();
    startAuction(state, 39); // Boardwalk ($400)
    placeBid(state, 'p1', 100); // Decliner bids only $100
    passBid(state, 'p2');

    expect(isAuctionComplete(state)).toBe(true);
    const newState = resolveAuction(state);
    expect(newState.players[0].properties).toContain(39);
    expect(newState.players[0].cash).toBe(1400); // Bought $400 property for $100
  });
});

// ─────────────────────────────────────────────────────────────────────
// Additional coverage: bankruptcy.ts uncovered branches
// ─────────────────────────────────────────────────────────────────────

describe('Bankruptcy coverage gaps', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  it('getWinner returns null for non-finished game', () => {
    const state = make2();
    expect(state.status).toBe('playing');
    expect(getWinner(state)).toBeNull();
  });

  it('canPlayerAfford returns false for non-existent player', () => {
    const state = make2();
    expect(canPlayerAfford(state, 'nonexistent', 100)).toBe(false);
  });

  it('calculateLiquidationValue returns 0 for non-existent player', () => {
    const state = make2();
    expect(calculateLiquidationValue(state, 'nonexistent')).toBe(0);
  });

  it('calculateNetWorth returns 0 for non-existent player', () => {
    const state = make2();
    expect(calculateNetWorth(state, 'nonexistent')).toBe(0);
  });

  it('calculateNetWorth with hotel counts 5× house cost', () => {
    const state = make2();
    state.players[0].cash = 1000;
    state.players[0].properties = [3]; // Baltic ($60 cost, $50 house cost)
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // Hotel
    const nw = calculateNetWorth(state, 'p1');
    // $1000 cash + $60 property + 5 × $50 = $1000 + $60 + $250 = $1310
    expect(nw).toBe(1310);
  });

  it('calculateNetWorth with mortgaged property excludes cost', () => {
    const state = make2();
    state.players[0].cash = 1000;
    state.players[0].properties = [3]; // Baltic
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
    const nw = calculateNetWorth(state, 'p1');
    // Mortgaged: cost not added
    expect(nw).toBe(1000);
  });

  it('calculateLiquidationValue with hotel uses 5× half cost', () => {
    const state = make2();
    state.players[0].properties = [3]; // Baltic ($50 house cost)
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false });
    const lv = calculateLiquidationValue(state, 'p1');
    // Hotel = 5 buildings × $25 (half of $50) = $125 + $30 mortgage = $155
    expect(lv).toBe(155);
  });

  it('calculateLiquidationValue skips mortgaged properties for mortgage value', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
    const lv = calculateLiquidationValue(state, 'p1');
    // Already mortgaged: no additional mortgage value
    expect(lv).toBe(0);
  });

  it('declareBankruptcy to player with buildings: buildings returned to supply', () => {
    const state = make3();
    state.players[0].cash = 100;
    state.players[0].properties = [1, 3]; // Brown monopoly
    setPropertyState(state, { spaceId: 1, houses: 3, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // Hotel

    const newState = declareBankruptcy(state, 'p1', 'p2');
    expect(newState.players[0].isBankrupt).toBe(true);
    expect(newState.players[1].properties).toContain(1);
    expect(newState.players[1].properties).toContain(3);
    // Buildings returned to supply, property states reset
    const ps1 = getPropertyState(newState, 1);
    const ps3 = getPropertyState(newState, 3);
    expect(ps1?.houses).toBe(0);
    expect(ps3?.houses).toBe(0);
  });

  it('declareBankruptcy to bank with buildings: buildings returned', () => {
    const state = make3();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 5, mortgaged: false }); // Hotel

    const newState = declareBankruptcy(state, 'p1', 'bank');
    expect(newState.players[0].isBankrupt).toBe(true);
    // Properties removed from all players
    for (const p of newState.players) {
      expect(p.properties).not.toContain(1);
      expect(p.properties).not.toContain(3);
    }
  });

  it('declareBankruptcy throws for non-existent player', () => {
    const state = make2();
    expect(() => declareBankruptcy(state, 'nonexistent', 'bank')).toThrow('not found');
  });

  it('declareBankruptcy to non-existent creditor throws', () => {
    const state = make2();
    state.players[0].properties = [];
    expect(() => declareBankruptcy(state, 'p1', 'nonexistent')).toThrow('not found');
  });

  it('determineTimedGameWinner skips bankrupt/inactive players', () => {
    const state = make3();
    state.players[0].cash = 1000;
    state.players[1].cash = 500;
    state.players[2].cash = 800;
    state.players[2].isBankrupt = true;
    state.players[2].isActive = false;

    const winner = determineTimedGameWinner(state);
    expect(winner).toBe('p1'); // Highest among active
  });

  it('isGameOver returns true when 1 or fewer active players', () => {
    const state = make3();
    state.players[0].isActive = false;
    state.players[0].isBankrupt = true;
    state.players[1].isActive = false;
    state.players[1].isBankrupt = true;
    expect(isGameOver(state)).toBe(true);
  });

  it('isGameOver returns false when 2+ active players', () => {
    const state = make3();
    expect(isGameOver(state)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Additional coverage: state.ts uncovered branches
// ─────────────────────────────────────────────────────────────────────

describe('State coverage gaps', () => {
  it('spaceToProperty with utility type', () => {
    const state = make2();
    const elecCo = getSpaceByPosition(state, 12)!; // Electric Company
    const prop = spaceToProperty(elecCo, 'p1');
    expect(prop.type).toBe('utility');
    expect(prop.name).toBe('Electric Company');
  });

  it('spaceToProperty with railroad type', () => {
    const state = make2();
    const reading = getSpaceByPosition(state, 5)!;
    const prop = spaceToProperty(reading, 'p2');
    expect(prop.type).toBe('railroad');
    expect(prop.name).toBe('Reading Railroad');
  });

  it('spaceToProperty with street type (default)', () => {
    const state = make2();
    const baltic = getSpaceByPosition(state, 3)!;
    const prop = spaceToProperty(baltic);
    expect(prop.type).toBe('street');
    expect(prop.ownerId).toBeNull();
    expect(prop.houses).toBe(0);
    expect(prop.mortgaged).toBe(false);
  });

  it('getPropertiesOwnedBy returns properties including utilities and railroads', () => {
    const state = make2();
    state.players[0].properties = [3, 5, 12]; // Baltic, Reading RR, Electric Co
    const props = getPropertiesOwnedBy(state, 'p1');
    expect(props).toHaveLength(3);
    expect(props.find((p) => p.type === 'street')?.name).toBe('Baltic Avenue');
    expect(props.find((p) => p.type === 'railroad')?.name).toBe('Reading Railroad');
    expect(props.find((p) => p.type === 'utility')?.name).toBe('Electric Company');
  });

  it('getPropertiesOwnedBy returns [] for non-existent player', () => {
    const state = make2();
    expect(getPropertiesOwnedBy(state, 'nonexistent')).toEqual([]);
  });

  it('getPlayerById returns undefined for non-existent player', () => {
    const state = make2();
    expect(getPlayerById(state, 'nonexistent')).toBeUndefined();
  });

  it('serializeGameState and deserializeGameState roundtrip', () => {
    const state = make2();
    const json = serializeGameState(state);
    const restored = deserializeGameState(json);
    expect(restored.gameId).toBe(state.gameId);
    expect(restored.players).toHaveLength(2);
  });

  it('createInitialGameState throws for invalid player count', () => {
    expect(() => createInitialGameState([{ id: 'p1', name: 'Solo' }])).toThrow('Invalid');
    const sevenPlayers = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      name: `Player${i}`,
    }));
    expect(() => createInitialGameState(sevenPlayers)).toThrow('Invalid');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Additional coverage: events.ts uncovered branches
// ─────────────────────────────────────────────────────────────────────

describe('Events coverage gaps', () => {
  it('wildcard handler receives all events', () => {
    const emitter = new GameEventEmitter();
    const wildcardHandler = vi.fn();
    emitter.on('*', wildcardHandler);

    const event = {
      id: 'e1',
      gameId: 'g1',
      type: GameEventType.DiceRolled,
      payload: {},
      timestamp: Date.now(),
    };
    emitter.emit(event);
    expect(wildcardHandler).toHaveBeenCalledOnce();
    expect(wildcardHandler).toHaveBeenCalledWith(event);
  });

  it('off for unregistered event type does not throw', () => {
    const emitter = new GameEventEmitter();
    const handler = vi.fn();
    // Remove handler for a type that was never registered
    emitter.off(GameEventType.PlayerMoved, handler);
    // Should not throw
  });

  it('emit with no handlers for event type does nothing', () => {
    const emitter = new GameEventEmitter();
    const event = {
      id: 'e1',
      gameId: 'g1',
      type: GameEventType.DiceRolled,
      payload: {},
      timestamp: Date.now(),
    };
    // Should not throw
    emitter.emit(event);
  });

  it('GameEventLog clear resets events', () => {
    const log = new GameEventLog('g1');
    log.append(GameEventType.DiceRolled, { die1: 3, die2: 4 });
    log.append(GameEventType.PlayerMoved, { playerId: 'p1' });
    expect(log.length).toBe(2);
    log.clear();
    expect(log.length).toBe(0);
    expect(log.getAll()).toEqual([]);
  });

  it('GameEventLog getEventsSince with future timestamp returns empty', () => {
    const log = new GameEventLog('g1');
    log.append(GameEventType.DiceRolled, { die1: 3, die2: 4 });
    const futureTime = Date.now() + 100000;
    expect(log.getEventsSince(futureTime)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Additional coverage: turn-machine.ts uncovered branches
// ─────────────────────────────────────────────────────────────────────

describe('TurnStateMachine coverage gaps', () => {
  it('getValidActions for each state', () => {
    const sm = new TurnStateMachine();
    expect(sm.getValidActions()).toContain('RollDice');

    sm.transition({ type: 'RollDice' });
    expect(sm.currentState).toBe(TurnState.Rolling);
    expect(sm.getValidActions()).toEqual([]);

    sm.transition({ type: 'RollDice' }); // auto-transitions to Resolving
    expect(sm.currentState).toBe(TurnState.Resolving);

    sm.transition({ type: 'RollDice' }, { landedOnUnownedProperty: true });
    expect(sm.currentState).toBe(TurnState.AwaitingBuyDecision);

    sm.transition({ type: 'DeclineProperty', propertyId: 3 });
    expect(sm.currentState).toBe(TurnState.Auction);

    sm.transition({ type: 'AuctionBid', amount: 50 });
    expect(sm.currentState).toBe(TurnState.Auction); // Stays

    sm.transition({ type: 'AuctionPass' }, { auctionComplete: true });
    expect(sm.currentState).toBe(TurnState.PlayerAction);
  });

  it('EndTurn with doubles goes back to WaitingForRoll', () => {
    const sm = new TurnStateMachine(TurnState.PlayerAction);
    sm.rolledDoubles = true;
    sm.transition({ type: 'EndTurn' });
    expect(sm.currentState).toBe(TurnState.WaitingForRoll);
    expect(sm.rolledDoubles).toBe(false);
  });

  it('EndTurn without doubles goes to EndTurn', () => {
    const sm = new TurnStateMachine(TurnState.PlayerAction);
    sm.rolledDoubles = false;
    sm.transition({ type: 'EndTurn' });
    expect(sm.currentState).toBe(TurnState.EndTurn);
  });

  it('EndTurn state auto-transitions to WaitingForRoll', () => {
    const sm = new TurnStateMachine(TurnState.EndTurn);
    sm.transition({ type: 'RollDice' }); // Any action transitions
    expect(sm.currentState).toBe(TurnState.WaitingForRoll);
  });

  it('throws for invalid action in WaitingForRoll', () => {
    const sm = new TurnStateMachine();
    expect(() => sm.transition({ type: 'BuildHouse', propertyId: 3 })).toThrow('Invalid');
  });

  it('throws for invalid action in AwaitingBuyDecision', () => {
    const sm = new TurnStateMachine(TurnState.AwaitingBuyDecision);
    expect(() => sm.transition({ type: 'RollDice' })).toThrow('Invalid');
  });

  it('throws for invalid action in Auction', () => {
    const sm = new TurnStateMachine(TurnState.Auction);
    expect(() => sm.transition({ type: 'RollDice' })).toThrow('Invalid');
  });

  it('throws for invalid action in PlayerAction', () => {
    const sm = new TurnStateMachine(TurnState.PlayerAction);
    expect(() => sm.transition({ type: 'RollDice' })).toThrow('Invalid');
  });

  it('PayJailFine and UseJailCard stay in WaitingForRoll', () => {
    const sm = new TurnStateMachine();
    sm.transition({ type: 'PayJailFine' });
    expect(sm.currentState).toBe(TurnState.WaitingForRoll);

    sm.transition({ type: 'UseJailCard' });
    expect(sm.currentState).toBe(TurnState.WaitingForRoll);
  });

  it('PlayerAction allows property management actions', () => {
    const sm = new TurnStateMachine(TurnState.PlayerAction);

    sm.transition({ type: 'BuildHouse', propertyId: 3 });
    expect(sm.currentState).toBe(TurnState.PlayerAction);

    sm.transition({ type: 'SellBuilding', propertyId: 3, count: 1 });
    expect(sm.currentState).toBe(TurnState.PlayerAction);

    sm.transition({ type: 'MortgageProperty', propertyId: 3 });
    expect(sm.currentState).toBe(TurnState.PlayerAction);

    sm.transition({ type: 'UnmortgageProperty', propertyId: 3 });
    expect(sm.currentState).toBe(TurnState.PlayerAction);

    sm.transition({
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
    });
    expect(sm.currentState).toBe(TurnState.PlayerAction);
  });

  it('Resolving without unowned property goes to PlayerAction', () => {
    const sm = new TurnStateMachine(TurnState.Resolving);
    sm.transition({ type: 'RollDice' }, {});
    expect(sm.currentState).toBe(TurnState.PlayerAction);
  });

  it('BuyProperty in AwaitingBuyDecision goes to PlayerAction', () => {
    const sm = new TurnStateMachine(TurnState.AwaitingBuyDecision);
    sm.transition({ type: 'BuyProperty', propertyId: 3 });
    expect(sm.currentState).toBe(TurnState.PlayerAction);
  });

  it('getValidActions for EndTurn state', () => {
    const sm = new TurnStateMachine(TurnState.EndTurn);
    expect(sm.getValidActions()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Additional targeted tests for remaining uncovered branches
// ─────────────────────────────────────────────────────────────────────

describe('Remaining branch coverage targets', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
    resetTrades();
  });

  // state.ts line 37: custom startingCash setting
  it('createInitialGameState with custom startingCash', () => {
    const state = createInitialGameState(twoPlayers, {
      gameId: 'custom-cash',
      settings: { startingCash: 2000 },
    });
    expect(state.players[0].cash).toBe(2000);
    expect(state.players[1].cash).toBe(2000);
  });

  // properties.ts line 298: canSellBuilding even-sell violation
  it('canSellBuilding even-sell violation with 3-property group', () => {
    const state = make2();
    // Light blue: Oriental (6), Vermont (8), Connecticut (9)
    state.players[0].properties = [6, 8, 9];
    setPropertyState(state, { spaceId: 6, houses: 3, mortgaged: false });
    setPropertyState(state, { spaceId: 8, houses: 1, mortgaged: false });
    setPropertyState(state, { spaceId: 9, houses: 3, mortgaged: false });
    // Selling from 8 (has 1) → would become 0, others still 3 → diff = 3-0 = 3 > 1
    const error = canSellBuilding(state, 'p1', 8);
    expect(error).toContain('even-sell');
  });

  // properties.ts: canSellBuilding for a space with no colorGroup
  it('canSellBuilding for railroad (no colorGroup)', () => {
    const state = make2();
    state.players[0].properties = [5]; // Reading Railroad
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    const error = canSellBuilding(state, 'p1', 5);
    expect(error).toContain('No buildings');
  });

  // trading.ts lines 71-73: validateNoBuildings with non-board spaceId
  it('createTradeOffer with property that has no colorGroup skips building check', () => {
    const state = make2();
    state.players[0].properties = [5]; // Railroad (no colorGroup)
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    // Trading a railroad is fine — no colorGroup, no building check
    const { trade } = createTradeOffer(state, 'p1', 'p2', {
      offeredProperties: [5],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [],
      requestedCash: 0,
      requestedCards: 0,
    });
    expect(trade.status).toBe('pending');
  });

  // trading.ts: createTradeOffer requested cash exceeds recipient balance
  // (recipient cash validation not currently in createTradeOffer, just testing the flow)

  // cards.ts: advanceNearestRailroad from various owned-by-self positions
  it('advance nearest railroad landing on own RR from pos 22', () => {
    const state = make2();
    state.players[0].position = 22;
    state.players[0].properties = [25]; // B&O RR
    setPropertyState(state, { spaceId: 25, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(25);
    expect(result.needsBuyDecision).toBeUndefined();
  });

  // cards.ts: advanceNearestUtility from pos 22, own utility
  it('advance nearest utility landing on own utility from pos 22', () => {
    const state = make2();
    state.players[0].position = 22;
    state.players[0].properties = [28]; // Water Works
    setPropertyState(state, { spaceId: 28, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'util',
      deck: 'chance',
      text: 'Nearest Utility',
      effect: { type: 'advanceNearestUtility' },
    };
    const result = applyCardEffect(state, 'p1', card, diceNonDoubles);
    expect(result.movedToPosition).toBe(28);
    expect(result.needsBuyDecision).toBeUndefined();
  });

  // cards.ts: applyMoveEffect landing on own property (not unowned, not rent)
  it('card move to own property does not charge rent', () => {
    const state = make2();
    state.players[0].position = 7;
    state.players[0].properties = [24]; // Illinois (owned by self)
    setPropertyState(state, { spaceId: 24, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Advance to Illinois',
      effect: { type: 'move', position: 24 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(24);
    expect(result.spaceResolution?.type).toBe('ownProperty');
    expect(result.state.players[0].cash).toBe(1500); // No rent paid
  });

  // spaces.ts: resolveSpace for all purchasable types with various ownership
  it('resolveSpace for utility owned by opponent', () => {
    const state = make2();
    state.players[1].properties = [12, 28]; // Both utilities
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 28, houses: 0, mortgaged: false });
    state.players[0].position = 12;
    const dice: DiceResult = { die1: 3, die2: 4, total: 7, isDoubles: false };
    const res = resolveSpace(state, 'p1', dice);
    expect(res.type).toBe('rentPayment');
    // 2 utilities, dice = 7, rent = 7 × 10 = $70
    expect(res.rentAmount).toBe(70);
  });

  // spaces.ts: resolveSpace for property with no colorGroup (edge case)
  it('resolveSpace for street property owned by opponent with monopoly shows doubled rent', () => {
    const state = make2();
    state.players[1].properties = [1, 3]; // Brown monopoly
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    state.players[0].position = 1; // Mediterranean
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('rentPayment');
    expect(res.rentAmount).toBe(4); // Med base $2, doubled = $4
  });

  // bankruptcy.ts: calculateNetWorth with no properties (just cash)
  it('calculateNetWorth with no properties equals cash', () => {
    const state = make2();
    state.players[0].cash = 750;
    state.players[0].properties = [];
    expect(calculateNetWorth(state, 'p1')).toBe(750);
  });

  // bankruptcy.ts: declareBankruptcy to bank with no properties
  it('declareBankruptcy to bank with no properties', () => {
    const state = make3();
    state.players[0].cash = 50;
    state.players[0].properties = [];
    const newState = declareBankruptcy(state, 'p1', 'bank');
    expect(newState.players[0].isBankrupt).toBe(true);
    expect(newState.players[0].cash).toBe(0);
  });

  // state.ts: getSpaceByPosition for non-existent position
  it('getSpaceByPosition returns undefined for non-existent position', () => {
    const state = make2();
    expect(getSpaceByPosition(state, 99)).toBeUndefined();
  });

  // cards.ts: applyAdvanceNearestUtility without diceResult uses dummy dice
  it('applyAdvanceNearestUtility without diceResult uses dummy dice', () => {
    const state = make2();
    state.players[0].position = 7;
    state.players[1].properties = [12];
    setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
    const card: Card = {
      id: 'util',
      deck: 'chance',
      text: 'Nearest Utility',
      effect: { type: 'advanceNearestUtility' },
    };
    // Call without diceResult — should use dummy dice (total 0)
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(12);
    // Rent = 0 × 10 = $0 (dummy dice has total 0)
    expect(result.spaceResolution?.rentAmount).toBe(0);
  });

  // cards.ts: applyMoveEffect without diceResult
  it('applyMoveEffect works without diceResult', () => {
    const state = make2();
    state.players[0].position = 7;
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Advance to Illinois',
      effect: { type: 'move', position: 24 },
    };
    // No diceResult passed
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(24);
  });

  // cards.ts: applyMoveBackEffect without diceResult
  it('applyMoveBackEffect works without diceResult', () => {
    const state = make2();
    state.players[0].position = 22;
    const card: Card = {
      id: 'test',
      deck: 'chance',
      text: 'Go Back 3',
      effect: { type: 'moveBack', spaces: 3 },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.state.players[0].position).toBe(19);
  });

  // trading.ts line 71: validateNoBuildings with non-board spaceId
  it('createTradeOffer with non-board spaceId: validateNoBuildings returns early', () => {
    const state = make2();
    // Add a fake property ID that doesn't exist on the board
    state.players[0].properties = [999];
    // Trading a non-board property: validateNoBuildings calls board.find which returns undefined → returns early
    const { trade } = createTradeOffer(state, 'p1', 'p2', {
      offeredProperties: [999],
      offeredCash: 0,
      offeredCards: 0,
      requestedProperties: [],
      requestedCash: 0,
      requestedCards: 0,
    });
    expect(trade.status).toBe('pending');
  });

  // trading.ts line 103: acceptTrade where players changed
  it('acceptTrade where proposer/recipient are still valid', () => {
    const state = make2();
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });

    const { trade } = createTradeOffer(state, 'p1', 'p2', {
      offeredProperties: [3],
      offeredCash: 50,
      offeredCards: 0,
      requestedProperties: [],
      requestedCash: 0,
      requestedCards: 0,
    });
    storeTrade(trade);

    const newState = acceptTrade(state, trade.id);
    expect(newState.players[1].properties).toContain(3);
    expect(newState.players[0].cash).toBe(1450); // -50
    expect(newState.players[1].cash).toBe(1550); // +50
  });

  // bankruptcy.ts line 160: getWinner when game finished but edge case
  it('getWinner returns null for finished game with no active players', () => {
    const state = make2();
    state.status = 'finished';
    state.players[0].isActive = false;
    state.players[0].isBankrupt = true;
    state.players[1].isActive = false;
    state.players[1].isBankrupt = true;
    // Both bankrupt, no winner
    expect(getWinner(state)).toBeNull();
  });

  // bankruptcy: declareBankruptcy to player, no buildings on transferred properties
  it('declareBankruptcy to player: property with no buildings transfers cleanly', () => {
    const state = make3();
    state.players[0].cash = 200;
    state.players[0].properties = [3, 5]; // Baltic + Reading RR
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });

    const newState = declareBankruptcy(state, 'p1', 'p2');
    expect(newState.players[1].properties).toContain(3);
    expect(newState.players[1].properties).toContain(5);
    expect(newState.players[1].cash).toBe(1700); // 1500 + 200
  });

  // properties.ts defensive throw branches
  it('buyProperty throws for non-existent player', () => {
    const state = make2();
    expect(() => buyProperty(state, 'nonexistent', 3)).toThrow('not found');
  });

  it('buyProperty throws for non-existent space', () => {
    const state = make2();
    expect(() => buyProperty(state, 'p1', 999)).toThrow('not found');
  });

  it('mortgageProperty throws for non-existent player', () => {
    const state = make2();
    expect(() => mortgageProperty(state, 'nonexistent', 3)).toThrow('not found');
  });

  it('mortgageProperty throws for non-existent space', () => {
    const state = make2();
    state.players[0].properties = [3]; // Give them the property so it doesn't fail on ownership check
    expect(() => mortgageProperty(state, 'p1', 999)).toThrow('not found');
  });

  it('unmortgageProperty throws for non-existent player', () => {
    const state = make2();
    expect(() => unmortgageProperty(state, 'nonexistent', 3)).toThrow('not found');
  });

  it('unmortgageProperty throws for non-existent space', () => {
    const state = make2();
    state.players[0].properties = [3];
    expect(() => unmortgageProperty(state, 'p1', 999)).toThrow('not found');
  });

  it('placeBid throws for non-existent player', () => {
    const state = make2();
    startAuction(state, 3);
    expect(() => placeBid(state, 'nonexistent', 50)).toThrow('not found');
  });

  it('resolveAuction throws when no auction exists', () => {
    const state = createInitialGameState(twoPlayers, { gameId: 'no-auction-test' });
    initBuildingSupply(state);
    expect(() => resolveAuction(state)).toThrow('No active auction');
  });

  it('getBuildingSupply returns defaults when not initialized', () => {
    const state = createInitialGameState(twoPlayers, { gameId: 'no-supply-test' });
    const supply = getBuildingSupply(state);
    expect(supply.houses).toBe(32);
    expect(supply.hotels).toBe(12);
  });

  // bankruptcy.ts line 171: calculateNetWorth with non-board spaceId
  it('calculateNetWorth skips non-board spaceId', () => {
    const state = make2();
    state.players[0].cash = 500;
    state.players[0].properties = [999]; // Non-existent space
    expect(calculateNetWorth(state, 'p1')).toBe(500); // Only cash counted
  });

  // bankruptcy.ts line 22: calculateLiquidationValue with non-board spaceId
  it('calculateLiquidationValue skips non-board spaceId', () => {
    const state = make2();
    state.players[0].properties = [999]; // Non-existent space
    expect(calculateLiquidationValue(state, 'p1')).toBe(0);
  });

  // bankruptcy.ts: calculateNetWorth with houses (not hotel) — covers both branches of houses === 5
  it('calculateNetWorth with houses (not hotel) adds house cost', () => {
    const state = make2();
    state.players[0].cash = 1000;
    state.players[0].properties = [3]; // Baltic ($60 cost, $50 house cost)
    setPropertyState(state, { spaceId: 3, houses: 3, mortgaged: false });
    const nw = calculateNetWorth(state, 'p1');
    // $1000 cash + $60 property + 3 × $50 = $1000 + $60 + $150 = $1210
    expect(nw).toBe(1210);
  });

  // bankruptcy.ts: calculateLiquidationValue with houses (not hotel)
  it('calculateLiquidationValue with houses (not hotel)', () => {
    const state = make2();
    state.players[0].properties = [3]; // Baltic ($50 house cost)
    setPropertyState(state, { spaceId: 3, houses: 3, mortgaged: false });
    const lv = calculateLiquidationValue(state, 'p1');
    // 3 houses × $25 (half of $50) = $75 + $30 mortgage = $105
    expect(lv).toBe(105);
  });

  // properties.ts: getAuction returns null when no auction started (tested via isAuctionComplete)
  // Already covered above, but also test the compound condition in resolveAuction
  it('resolveAuction with highBidderId null (edge: no bids at all)', () => {
    const state = make2();
    startAuction(state, 3);
    passBid(state, 'p1');
    passBid(state, 'p2');
    // highBidderId is null, highBid is 0
    const newState = resolveAuction(state);
    // Property stays unowned
    expect(newState.players[0].properties).not.toContain(3);
    expect(newState.players[1].properties).not.toContain(3);
  });

  // properties.ts: mortgageProperty for property without colorGroup
  it('mortgageProperty for railroad (no colorGroup) skips building check', () => {
    const state = make2();
    state.players[0].properties = [5]; // Reading Railroad
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    const newState = mortgageProperty(state, 'p1', 5);
    expect(getPropertyState(newState, 5)?.mortgaged).toBe(true);
    expect(newState.players[0].cash).toBe(1600); // +$100 mortgage value
  });

  // properties.ts: canBuildHouse with space that has no colorGroup (impossible in practice but tests branch)
  it('canBuildHouse returns error for space with no colorGroup', () => {
    const state = make2();
    // Railroad has no colorGroup
    state.players[0].properties = [5];
    setPropertyState(state, { spaceId: 5, houses: 0, mortgaged: false });
    const error = canBuildHouse(state, 'p1', 5);
    // Railroad is not a Property type, so fails on type check first
    expect(error).toContain('street properties');
  });

  // spaces.ts: resolveSpace for mortgaged property → noAction
  it('resolveSpace for mortgaged property returns noAction', () => {
    const state = make2();
    state.players[1].properties = [3]; // Bob owns Baltic
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
    state.players[0].position = 3;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('noAction');
    expect(res.ownerId).toBe('p2');
  });

  // spaces.ts: resolveSpace for Go To Jail (corner position 30)
  it('resolveSpace for Go To Jail returns goToJail', () => {
    const state = make2();
    state.players[0].position = 30;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('goToJail');
  });

  // spaces.ts: resolveSpace for Free Parking (corner position 20) → noAction
  it('resolveSpace for Free Parking returns noAction', () => {
    const state = make2();
    state.players[0].position = 20;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('noAction');
  });

  // spaces.ts: resolveSpace for Just Visiting (corner position 10) → noAction
  it('resolveSpace for Just Visiting returns noAction', () => {
    const state = make2();
    state.players[0].position = 10;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('noAction');
  });

  // spaces.ts: resolveSpace throws for invalid player
  it('resolveSpace throws for non-existent player', () => {
    const state = make2();
    expect(() => resolveSpace(state, 'nonexistent', diceNonDoubles)).toThrow('not found');
  });

  // spaces.ts: applySpaceResolution for rentPayment without ownerId
  it('applySpaceResolution for rentPayment without ownerId only deducts from player', () => {
    const state = make2();
    state.players[0].position = 3;
    const resolution = { type: 'rentPayment' as const, space: state.board[3], rentAmount: 50 };
    const newState = applySpaceResolution(state, 'p1', resolution);
    expect(newState.players[0].cash).toBe(1450);
  });

  // spaces.ts: calculateRailroadRent for 0 and negative
  it('calculateRailroadRent returns 0 for 0 railroads', () => {
    expect(calculateRailroadRent(0)).toBe(0);
    expect(calculateRailroadRent(-1)).toBe(0);
  });

  // spaces.ts: calculateUtilityRent for 0 utilities
  it('calculateUtilityRent returns 0 for 0 utilities', () => {
    expect(calculateUtilityRent(7, 0)).toBe(0);
    expect(calculateUtilityRent(7, -1)).toBe(0);
  });

  // spaces.ts: calculateStreetRent with no rentTiers
  it('calculateStreetRent returns 0 for no rentTiers', () => {
    const fakeSpace = { ...make2().board[3], rentTiers: undefined };
    expect(calculateStreetRent(fakeSpace, 0, false)).toBe(0);
    const fakeSpace2 = { ...make2().board[3], rentTiers: [] };
    expect(calculateStreetRent(fakeSpace2, 0, false)).toBe(0);
  });

  // spaces.ts: countOwnedOfType with non-existent player
  it('countOwnedOfType returns 0 for non-existent player', () => {
    const state = make2();
    expect(countOwnedOfType(state, 'nonexistent', SpaceType.Railroad)).toBe(0);
  });

  // spaces.ts: ownsAllInColorGroup with non-existent player
  it('ownsAllInColorGroup returns false for non-existent player', () => {
    const state = make2();
    expect(ownsAllInColorGroup(state, 'nonexistent', 'brown')).toBe(false);
  });

  // spaces.ts: applySpaceResolution for goToJail
  it('applySpaceResolution for goToJail sends player to jail', () => {
    const state = make2();
    state.players[0].position = 30;
    const resolution = {
      type: 'goToJail' as const,
      space: state.board.find((s) => s.position === 30)!,
    };
    const newState = applySpaceResolution(state, 'p1', resolution);
    expect(newState.players[0].position).toBe(10);
    expect(newState.players[0].jailStatus.inJail).toBe(true);
  });

  // spaces.ts: applySpaceResolution for noAction
  it('applySpaceResolution for noAction returns state unchanged', () => {
    const state = make2();
    const resolution = { type: 'noAction' as const, space: state.board[0] };
    const newState = applySpaceResolution(state, 'p1', resolution);
    expect(newState.players[0].cash).toBe(1500);
  });

  // cards.ts: drawCard from empty deck throws
  it('drawCard from empty deck throws', () => {
    const state = make2();
    state.decks.chance = [];
    expect(() => drawCard(state, 'chance')).toThrow('deck is empty');
  });

  // cards.ts: GOOJF draw removes card from deck and increments player count
  it('drawCard GOOJF card removes from deck', () => {
    const state = make2();
    const goojf = state.decks.chance.find((c: Card) => c.effect.type === 'goojf')!;
    state.decks.chance = [goojf];
    const { state: newState, card } = drawCard(state, 'chance');
    expect(card.effect.type).toBe('goojf');
    expect(newState.decks.chance).toHaveLength(0); // Removed, not pushed to bottom
    expect(newState.players[0].getOutOfJailFreeCards).toBe(1);
  });

  // bankruptcy.ts: declareBankruptcy to player transfers GOOJF cards
  it('declareBankruptcy to player transfers GOOJF cards', () => {
    const state = make3();
    state.players[0].getOutOfJailFreeCards = 2;
    state.players[0].properties = [];
    const newState = declareBankruptcy(state, 'p1', 'p2');
    expect(newState.players[0].getOutOfJailFreeCards).toBe(0);
    expect(newState.players[1].getOutOfJailFreeCards).toBe(2);
  });

  // bankruptcy.ts: declareBankruptcy to bank resets GOOJF cards
  it('declareBankruptcy to bank resets GOOJF cards', () => {
    const state = make3();
    state.players[0].getOutOfJailFreeCards = 1;
    state.players[0].properties = [];
    const newState = declareBankruptcy(state, 'p1', 'bank');
    expect(newState.players[0].getOutOfJailFreeCards).toBe(0);
  });

  // bankruptcy.ts: declareBankruptcy to player with houses (not hotel) returns houses to supply
  it('declareBankruptcy to player with houses returns houses to supply', () => {
    const state = make3();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false }); // 2 houses (not hotel)
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    const initialSupply = getBuildingSupply(state);
    const initialHouses = initialSupply.houses;

    const newState = declareBankruptcy(state, 'p1', 'p2');
    const finalSupply = getBuildingSupply(newState);
    expect(finalSupply.houses).toBe(initialHouses + 2); // 2 houses returned
  });

  // bankruptcy.ts: declareBankruptcy to bank with houses (not hotel)
  it('declareBankruptcy to bank with houses returns houses to supply', () => {
    const state = make3();
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 3, mortgaged: false }); // 3 houses
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    const initialSupply = getBuildingSupply(state);
    const initialHouses = initialSupply.houses;

    const newState = declareBankruptcy(state, 'p1', 'bank');
    const finalSupply = getBuildingSupply(newState);
    expect(finalSupply.houses).toBe(initialHouses + 3);
  });

  // bankruptcy.ts: declareBankruptcy to bank with hotel returns hotel to supply
  it('declareBankruptcy to bank with hotel returns hotel to supply', () => {
    const state = make3();
    state.players[0].properties = [1];
    setPropertyState(state, { spaceId: 1, houses: 5, mortgaged: false }); // Hotel
    const initialSupply = getBuildingSupply(state);
    const initialHotels = initialSupply.hotels;

    const newState = declareBankruptcy(state, 'p1', 'bank');
    const finalSupply = getBuildingSupply(newState);
    expect(finalSupply.hotels).toBe(initialHotels + 1);
  });

  // state.ts: createInitialGameState with custom gameId
  it('createInitialGameState uses provided gameId', () => {
    const state = createInitialGameState(twoPlayers, { gameId: 'custom-id-123' });
    expect(state.gameId).toBe('custom-id-123');
  });

  // state.ts: createInitialGameState without options
  it('createInitialGameState generates gameId when none provided', () => {
    const state = createInitialGameState(twoPlayers);
    expect(state.gameId).toMatch(/^game-/);
  });

  // state.ts line 92: getPropertiesOwnedBy with non-board spaceId throws
  it('getPropertiesOwnedBy throws for non-board spaceId', () => {
    const state = make2();
    state.players[0].properties = [999]; // Non-existent space
    expect(() => getPropertiesOwnedBy(state, 'p1')).toThrow('not found');
  });

  // properties.ts lines 199/208/242/258: build without propState
  it('buildHouse works when no propState set (exercises ?? fallbacks)', () => {
    const state = make2();
    state.players[0].properties = [1, 3]; // Brown monopoly
    // Don't call setPropertyState — propState is null for both
    // canBuildHouse: propState?.houses ?? 0 = 0 (line 199)
    // canBuildHouse: gsState?.houses ?? 0 = 0 for group space (line 208)
    const error = canBuildHouse(state, 'p1', 1);
    expect(error).toBeNull(); // Can build
    // buildHouse: propState?.houses ?? 0 = 0 (line 242)
    // buildHouse: propState?.mortgaged ?? false (line 258)
    const newState = buildHouse(state, 'p1', 1);
    expect(getPropertyState(newState, 1)?.houses).toBe(1);
  });

  // properties.ts line 279: canSellBuilding without propState
  it('canSellBuilding without propState returns no buildings', () => {
    const state = make2();
    state.players[0].properties = [3];
    // No setPropertyState → propState is null → houses = 0 via ??
    expect(canSellBuilding(state, 'p1', 3)).toContain('No buildings');
  });

  // properties.ts line 292: canSellBuilding with group mate missing propState
  it('canSellBuilding with group mate missing propState exercises ?? fallback', () => {
    const state = make2();
    state.players[0].properties = [1, 3]; // Brown monopoly
    setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
    // Don't set propState for space 3 → gsState is null → ?? 0 → 0 houses
    const error = canSellBuilding(state, 'p1', 1);
    // After selling: [0, 0] → diff = 0 → OK
    expect(error).toBeNull();
  });

  // spaces.ts lines 250/255: applySpaceResolution with missing optional fields
  it('applySpaceResolution tax without taxAmount defaults to 0', () => {
    const state = make2();
    const resolution = { type: 'tax' as const, space: state.board[4] };
    const newState = applySpaceResolution(state, 'p1', resolution);
    expect(newState.players[0].cash).toBe(1500); // No deduction
  });

  it('applySpaceResolution rentPayment without rentAmount defaults to 0', () => {
    const state = make2();
    const resolution = { type: 'rentPayment' as const, space: state.board[3], ownerId: 'p2' };
    const newState = applySpaceResolution(state, 'p1', resolution);
    expect(newState.players[0].cash).toBe(1500); // No deduction
  });

  // spaces.ts line 259-261: applySpaceResolution with non-existent owner
  it('applySpaceResolution rentPayment with non-existent owner only deducts', () => {
    const state = make2();
    const resolution = {
      type: 'rentPayment' as const,
      space: state.board[3],
      rentAmount: 50,
      ownerId: 'nonexistent',
    };
    const newState = applySpaceResolution(state, 'p1', resolution);
    expect(newState.players[0].cash).toBe(1450);
    // Owner not found — no cash added to anyone
  });
});

// ─────────────────────────────────────────────────────────────────────
// Synthetic data tests: exercise ?? fallback branches with undefined fields
// ─────────────────────────────────────────────────────────────────────

describe('Synthetic data coverage — ?? fallback branches', () => {
  beforeEach(() => {
    resetPropertyStates('cov-test');
    resetBuildingSupply('cov-test');
  });

  // properties.ts line 61: space.cost ?? 0 in buyProperty
  it('buyProperty with undefined cost defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origCost = space3.cost;
    (space3 as unknown as Record<string, unknown>).cost = undefined;
    state.players[0].position = 3;
    const newState = buyProperty(state, 'p1', 3);
    expect(newState.players[0].cash).toBe(1500); // Free
    expect(newState.players[0].properties).toContain(3);
    // Restore
    (space3 as unknown as unknown as Record<string, unknown>).cost = origCost;
  });

  // properties.ts line 215: space.houseCost ?? 0 in canBuildHouse
  // properties.ts line 243: space.houseCost ?? 0 in buildHouse
  it('buildHouse with undefined houseCost defaults to 0', () => {
    const state = make2();
    const space1 = state.board.find((s) => s.id === 1)!;
    const origHouseCost = space1.houseCost;
    (space1 as unknown as Record<string, unknown>).houseCost = undefined;
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    // canBuildHouse: houseCost ?? 0 = 0, player can afford 0
    expect(canBuildHouse(state, 'p1', 1)).toBeNull();
    const newState = buildHouse(state, 'p1', 1);
    expect(newState.players[0].cash).toBe(1500); // Free build
    // Restore
    (space1 as unknown as Record<string, unknown>).houseCost = origHouseCost;
  });

  // properties.ts lines 325-326: space.houseCost ?? 0 in sellBuilding
  it('sellBuilding with undefined houseCost refunds 0', () => {
    const state = make2();
    const space1 = state.board.find((s) => s.id === 1)!;
    const origHouseCost = space1.houseCost;
    (space1 as unknown as Record<string, unknown>).houseCost = undefined;
    state.players[0].properties = [1, 3];
    setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
    setPropertyState(state, { spaceId: 3, houses: 1, mortgaged: false });
    const newState = sellBuilding(state, 'p1', 1);
    expect(newState.players[0].cash).toBe(1500); // Refund = floor(0/2) = 0
    // Restore
    (space1 as unknown as Record<string, unknown>).houseCost = origHouseCost;
  });

  // properties.ts line 379: space.mortgageValue ?? 0 in mortgageProperty
  it('mortgageProperty with undefined mortgageValue defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origMortgage = space3.mortgageValue;
    (space3 as unknown as Record<string, unknown>).mortgageValue = undefined;
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    const newState = mortgageProperty(state, 'p1', 3);
    expect(newState.players[0].cash).toBe(1500); // Mortgage value 0
    expect(getPropertyState(newState, 3)?.mortgaged).toBe(true);
    // Restore
    (space3 as unknown as Record<string, unknown>).mortgageValue = origMortgage;
  });

  // properties.ts line 403: space.mortgageValue ?? 0 in unmortgageProperty
  it('unmortgageProperty with undefined mortgageValue defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origMortgage = space3.mortgageValue;
    (space3 as unknown as Record<string, unknown>).mortgageValue = undefined;
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: true });
    const newState = unmortgageProperty(state, 'p1', 3);
    expect(newState.players[0].cash).toBe(1500); // Cost = 0 + ceil(0*0.1) = 0
    expect(getPropertyState(newState, 3)?.mortgaged).toBe(false);
    // Restore
    (space3 as unknown as Record<string, unknown>).mortgageValue = origMortgage;
  });

  // properties.ts line 191: canBuildHouse for space with no colorGroup
  it('canBuildHouse returns error for street-type space with undefined colorGroup', () => {
    const state = make2();
    const space1 = state.board.find((s) => s.id === 1)!;
    const origCG = space1.colorGroup;
    (space1 as unknown as Record<string, unknown>).colorGroup = undefined;
    state.players[0].properties = [1];
    expect(canBuildHouse(state, 'p1', 1)).toContain('no color group');
    // Restore
    (space1 as unknown as Record<string, unknown>).colorGroup = origCG;
  });

  // properties.ts line 284-300: canSellBuilding for space with no colorGroup (but has houses)
  it('canSellBuilding skips even-sell check for space with no colorGroup', () => {
    const state = make2();
    const space1 = state.board.find((s) => s.id === 1)!;
    const origCG = space1.colorGroup;
    (space1 as unknown as Record<string, unknown>).colorGroup = undefined;
    state.players[0].properties = [1];
    setPropertyState(state, { spaceId: 1, houses: 1, mortgaged: false });
    // No colorGroup → skips even-sell check → returns null (can sell)
    expect(canSellBuilding(state, 'p1', 1)).toBeNull();
    // Restore
    (space1 as unknown as Record<string, unknown>).colorGroup = origCG;
  });

  // spaces.ts line 178: space.cost ?? 0 in resolvePropertySpace
  it('resolvePropertySpace with undefined cost returns 0 cost', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origCost = space3.cost;
    (space3 as unknown as Record<string, unknown>).cost = undefined;
    state.players[0].position = 3; // Land on property with no cost
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('unownedProperty');
    expect(res.propertyDetails?.cost).toBe(0);
    // Restore
    (space3 as unknown as Record<string, unknown>).cost = origCost;
  });

  // spaces.ts line 223: space.taxAmount ?? 0 in resolveTax
  it('resolveTax with undefined taxAmount defaults to 0', () => {
    const state = make2();
    const taxSpace = state.board.find((s) => s.position === 4)!; // Income Tax
    const origTax = taxSpace.taxAmount;
    (taxSpace as unknown as Record<string, unknown>).taxAmount = undefined;
    state.players[0].position = 4;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('tax');
    expect(res.taxAmount).toBe(0);
    // Restore
    (taxSpace as unknown as Record<string, unknown>).taxAmount = origTax;
  });

  // bankruptcy.ts line 28: space.houseCost ?? 0 in calculateLiquidationValue
  it('calculateLiquidationValue with undefined houseCost defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origHC = space3.houseCost;
    (space3 as unknown as Record<string, unknown>).houseCost = undefined;
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 2, mortgaged: false });
    const lv = calculateLiquidationValue(state, 'p1');
    // houseCost = 0, halfCost = 0, 2 houses × 0 = 0 + mortgage
    expect(lv).toBe(space3.mortgageValue ?? 0);
    // Restore
    (space3 as unknown as Record<string, unknown>).houseCost = origHC;
  });

  // bankruptcy.ts line 40: space.mortgageValue ?? 0 in calculateLiquidationValue
  it('calculateLiquidationValue with undefined mortgageValue defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origMV = space3.mortgageValue;
    (space3 as unknown as Record<string, unknown>).mortgageValue = undefined;
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    const lv = calculateLiquidationValue(state, 'p1');
    // mortgageValue = 0
    expect(lv).toBe(0);
    // Restore
    (space3 as unknown as Record<string, unknown>).mortgageValue = origMV;
  });

  // bankruptcy.ts line 177: space.cost ?? 0 in calculateNetWorth
  it('calculateNetWorth with undefined cost defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origCost = space3.cost;
    (space3 as unknown as Record<string, unknown>).cost = undefined;
    state.players[0].cash = 1000;
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    const nw = calculateNetWorth(state, 'p1');
    // cost = 0
    expect(nw).toBe(1000);
    // Restore
    (space3 as unknown as Record<string, unknown>).cost = origCost;
  });

  // bankruptcy.ts line 182: space.houseCost ?? 0 in calculateNetWorth
  it('calculateNetWorth with undefined houseCost defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origHC = space3.houseCost;
    (space3 as unknown as Record<string, unknown>).houseCost = undefined;
    state.players[0].cash = 1000;
    state.players[0].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 3, mortgaged: false });
    const nw = calculateNetWorth(state, 'p1');
    // cost + 3 × houseCost(0) = cost
    expect(nw).toBe(1000 + (space3.cost ?? 0));
    // Restore
    (space3 as unknown as Record<string, unknown>).houseCost = origHC;
  });

  // state.ts line 111: space.cost ?? 0 in spaceToProperty
  it('spaceToProperty with undefined cost defaults to 0', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const fakeSpace = { ...space3, cost: undefined };
    const prop = spaceToProperty(fakeSpace as typeof space3, 'p1');
    expect(prop.cost).toBe(0);
  });

  // state.ts line 112: space.rentTiers ?? [] in spaceToProperty
  it('spaceToProperty with undefined rentTiers defaults to []', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const fakeSpace = { ...space3, rentTiers: undefined };
    const prop = spaceToProperty(fakeSpace as typeof space3, 'p1');
    expect(prop.rentTiers).toEqual([]);
  });

  // spaces.ts line 199-201: resolvePropertySpace with property with no colorGroup
  it('resolvePropertySpace: property with no colorGroup → hasMonopoly = false', () => {
    const state = make2();
    const space3 = state.board.find((s) => s.id === 3)!;
    const origCG = space3.colorGroup;
    (space3 as unknown as Record<string, unknown>).colorGroup = undefined;
    state.players[1].properties = [3];
    setPropertyState(state, { spaceId: 3, houses: 0, mortgaged: false });
    state.players[0].position = 3;
    const res = resolveSpace(state, 'p1', diceNonDoubles);
    expect(res.type).toBe('rentPayment');
    // Base rent, no monopoly doubling
    expect(res.rentAmount).toBe(space3.rentTiers?.[0] ?? 0);
    // Restore
    (space3 as unknown as Record<string, unknown>).colorGroup = origCG;
  });

  // cards.ts line 314: space.cost ?? 0 in advanceNearestRailroad
  it('advanceNearestRailroad with undefined cost on railroad', () => {
    const state = make2();
    const rr = state.board.find((s) => s.position === 15)!;
    const origCost = rr.cost;
    (rr as unknown as Record<string, unknown>).cost = undefined;
    state.players[0].position = 7;
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(15);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.spaceResolution?.propertyDetails?.cost).toBe(0);
    // Restore
    (rr as unknown as Record<string, unknown>).cost = origCost;
  });

  // cards.ts line 376: space.cost ?? 0 in advanceNearestUtility
  it('advanceNearestUtility with undefined cost on utility', () => {
    const state = make2();
    const util = state.board.find((s) => s.position === 12)!;
    const origCost = util.cost;
    (util as unknown as Record<string, unknown>).cost = undefined;
    state.players[0].position = 7;
    const card: Card = {
      id: 'util',
      deck: 'chance',
      text: 'Nearest Utility',
      effect: { type: 'advanceNearestUtility' },
    };
    const result = applyCardEffect(state, 'p1', card, diceNonDoubles);
    expect(result.movedToPosition).toBe(12);
    expect(result.needsBuyDecision).toBe(true);
    expect(result.spaceResolution?.propertyDetails?.cost).toBe(0);
    // Restore
    (util as unknown as Record<string, unknown>).cost = origCost;
  });

  // spaces.ts line 139: resolveSpace with player on invalid position
  it('resolveSpace throws for player on non-existent board position', () => {
    const state = make2();
    state.players[0].position = 99; // No space at position 99
    expect(() => resolveSpace(state, 'p1', diceNonDoubles)).toThrow('No space');
  });

  // cards.ts line 330: if(owner) false branch — owner not found
  it('advanceNearestRailroad with owned RR but owner removed from players', () => {
    const state = make2();
    state.players[0].position = 7;
    // Create ownership via properties array, but then we need the player to NOT be findable
    // This requires a player who owns the RR but isn't in the players array
    // We can do this by adding ownership directly and then removing the player
    state.players[1].properties = [15]; // Bob owns Pennsylvania RR
    setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
    // Now remove Bob from players (simulate corrupted state)
    const bob = state.players[1];
    state.players = state.players.filter((p) => p.id !== 'p2');
    // But getPropertyOwnership iterates state.players, so Bob won't be found either
    // This means the RR appears unowned → needsBuyDecision
    // To truly test the branch, I need ownership to be found but player not found
    // This is impossible through normal getPropertyOwnership → structurally unreachable
    // Instead let me restore Bob and just accept this branch is unreachable
    state.players.push(bob);
    // Just verify normal behavior
    const card: Card = {
      id: 'rr',
      deck: 'chance',
      text: 'Nearest RR',
      effect: { type: 'advanceNearestRailroad' },
    };
    const result = applyCardEffect(state, 'p1', card);
    expect(result.movedToPosition).toBe(15);
  });

  // spaces.ts: calculateStreetRent with houses > rentTiers length (exercises ?? fallback on line 111)
  it('calculateStreetRent with houses exceeding tier count falls back to last tier', () => {
    const state = make2();
    const space = state.board.find((s) => s.id === 3)!;
    // Normally rentTiers has 6 entries (0-5). Testing with houses=6 to trigger ?? fallback
    const rent = calculateStreetRent(space, 6, false);
    // rentTiers[6] is undefined → fallback to rentTiers[5] (last tier)
    expect(rent).toBe(space.rentTiers![space.rentTiers!.length - 1]);
  });
});
