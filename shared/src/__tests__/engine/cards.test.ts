import { describe, it, expect, beforeEach } from 'vitest';
import { createDeck, drawCard, returnCardToDeck, applyCardEffect } from '../../engine/cards';
import { setPropertyState, resetPropertyStates } from '../../engine/spaces';
import { createInitialGameState, type PlayerSetup } from '../../engine/state';
import type { Card } from '../../types/card';
import type { DiceResult } from '../../engine/dice';
import chanceCardsData from '../../data/chance-cards.json';

const players: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Diana' },
];

function makeState(): GameState {
  return createInitialGameState(players, { gameId: 'test-cards' });
}

const defaultDice: DiceResult = { die1: 4, die2: 4, total: 8, isDoubles: true };

describe('Step 1A.5 — Card System', () => {
  beforeEach(() => {
    resetPropertyStates('test-cards');
  });

  describe('createDeck', () => {
    it('P1A.S5.T1: deck has 16 cards, order differs from input', () => {
      const cards = chanceCardsData as Card[];
      // Use a deterministic RNG to ensure shuffling
      let i = 0;
      const rng = () => {
        i++;
        return ((i * 7 + 3) % 17) / 17;
      };
      const deck = createDeck(cards, rng);
      expect(deck).toHaveLength(16);
      // Check that at least some cards are in different positions
      const samePosition = deck.filter((c, idx) => c.id === cards[idx].id).length;
      expect(samePosition).toBeLessThan(16);
    });
  });

  describe('drawCard', () => {
    it('P1A.S5.T2: draws top card and moves to bottom', () => {
      const state = makeState();
      const firstCard = state.decks.chance[0];
      // Skip if GOOJF (they get removed)
      if (firstCard.effect.type === 'goojf') {
        // Put a non-goojf card first
        const nonGoojf = state.decks.chance.find((c) => c.effect.type !== 'goojf')!;
        state.decks.chance = [nonGoojf, ...state.decks.chance.filter((c) => c.id !== nonGoojf.id)];
      }
      const topCard = state.decks.chance[0];
      const { state: newState, card } = drawCard(state, 'chance');
      expect(card.id).toBe(topCard.id);
      expect(newState.decks.chance).toHaveLength(16);
      expect(newState.decks.chance[newState.decks.chance.length - 1].id).toBe(topCard.id);
    });

    it('P1A.S5.T3: GOOJF card removed from deck and added to player', () => {
      const state = makeState();
      // Put GOOJF card first
      const goojfCard = state.decks.chance.find((c) => c.effect.type === 'goojf')!;
      state.decks.chance = [goojfCard, ...state.decks.chance.filter((c) => c.id !== goojfCard.id)];

      const { state: newState, card } = drawCard(state, 'chance');
      expect(card.effect.type).toBe('goojf');
      expect(newState.decks.chance).toHaveLength(15);
      expect(newState.players[0].getOutOfJailFreeCards).toBe(1);
    });
  });

  describe('card effects', () => {
    it('P1A.S5.T4: Collect $X adds cash', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'communityChest',
        text: 'Bank pays you $200',
        effect: { type: 'cash', amount: 200 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1700);
    });

    it('P1A.S5.T5: Pay $X deducts cash', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'communityChest',
        text: 'Hospital fees $100',
        effect: { type: 'cash', amount: -100 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1400);
    });

    it('P1A.S5.T6: Advance to Go from pos 15 → pos 0, collects $200', () => {
      const state = makeState();
      state.players[0].position = 15;
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

    it('P1A.S5.T7: Advance to St. Charles from pos 30 passes Go, collects $200', () => {
      const state = makeState();
      state.players[0].position = 30;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Advance to St. Charles Place',
        effect: { type: 'move', position: 11 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].position).toBe(11);
      expect(result.passedGo).toBe(true);
      expect(result.state.players[0].cash).toBe(1700);
    });

    it('P1A.S5.T8: Go to Jail sends to jail, no $200', () => {
      const state = makeState();
      state.players[0].position = 22;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Go to Jail',
        effect: { type: 'jail' },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].position).toBe(10);
      expect(result.state.players[0].jailStatus).toEqual({ inJail: true, turnsInJail: 0 });
      expect(result.sentToJail).toBe(true);
      expect(result.state.players[0].cash).toBe(1500);
    });

    it('P1A.S5.T9: Go back 3 spaces', () => {
      const state = makeState();
      state.players[0].position = 20;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Go back 3',
        effect: { type: 'moveBack', spaces: 3 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].position).toBe(17);

      // Wrap-around case
      const state2 = makeState();
      state2.players[0].position = 2;
      const result2 = applyCardEffect(state2, 'p1', card);
      expect(result2.state.players[0].position).toBe(39);
    });

    it('P1A.S5.T10: Collect $X from every player', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'communityChest',
        text: 'Birthday',
        effect: { type: 'collectFromAll', amount: 50 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1650); // +150 (50 from each of 3 others)
      expect(result.state.players[1].cash).toBe(1450);
      expect(result.state.players[2].cash).toBe(1450);
      expect(result.state.players[3].cash).toBe(1450);
    });

    it('P1A.S5.T11: Pay each player $X', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Chairman',
        effect: { type: 'payEachPlayer', amount: 50 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1350); // -150
      expect(result.state.players[1].cash).toBe(1550);
      expect(result.state.players[2].cash).toBe(1550);
      expect(result.state.players[3].cash).toBe(1550);
    });

    it('P1A.S5.T12: Chance repairs — $25/house, $100/hotel', () => {
      const state = makeState();
      state.players[0].properties = [1, 3, 11]; // Med, Baltic, St Charles
      setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false }); // 2 houses
      setPropertyState(state, { spaceId: 3, houses: 1, mortgaged: false }); // 1 house
      setPropertyState(state, { spaceId: 11, houses: 5, mortgaged: false }); // hotel
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Repairs',
        effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
      };
      const result = applyCardEffect(state, 'p1', card);
      // 3 houses * $25 + 1 hotel * $100 = $75 + $100 = $175
      expect(result.state.players[0].cash).toBe(1500 - 175);
    });

    it('P1A.S5.T12a: CC repairs — $40/house, $115/hotel', () => {
      const state = makeState();
      state.players[0].properties = [1, 3, 11];
      setPropertyState(state, { spaceId: 1, houses: 2, mortgaged: false });
      setPropertyState(state, { spaceId: 3, houses: 1, mortgaged: false });
      setPropertyState(state, { spaceId: 11, houses: 5, mortgaged: false });
      const card: Card = {
        id: 'test',
        deck: 'communityChest',
        text: 'Street repairs',
        effect: { type: 'repairs', perHouse: 40, perHotel: 115 },
      };
      const result = applyCardEffect(state, 'p1', card);
      // 3 houses * $40 + 1 hotel * $115 = $120 + $115 = $235
      expect(result.state.players[0].cash).toBe(1500 - 235);
    });

    it('P1A.S5.T12b: repairs with zero buildings pays $0', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Repairs',
        effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1500);
    });
  });

  describe('advance to nearest railroad', () => {
    it('P1A.S5.T13: nearest railroad from Chance positions', () => {
      const state = makeState();
      // From pos 7 → nearest is pos 15 (Pennsylvania RR)
      state.players[0].position = 7;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Nearest RR',
        effect: { type: 'advanceNearestRailroad' },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.movedToPosition).toBe(15);

      // From pos 22 → nearest is pos 25 (B&O RR)
      const state2 = makeState();
      state2.players[0].position = 22;
      const result2 = applyCardEffect(state2, 'p1', card);
      expect(result2.movedToPosition).toBe(25);

      // From pos 36 → nearest is pos 5 (Reading RR, wraps around)
      const state3 = makeState();
      state3.players[0].position = 36;
      const result3 = applyCardEffect(state3, 'p1', card);
      expect(result3.movedToPosition).toBe(5);
    });

    it('P1A.S5.T13a: unowned railroad → player may buy', () => {
      const state = makeState();
      state.players[0].position = 7;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Nearest RR',
        effect: { type: 'advanceNearestRailroad' },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.needsBuyDecision).toBe(true);
    });

    it('P1A.S5.T13b: owned railroad → pay double rent', () => {
      const state = makeState();
      state.players[0].position = 7;
      state.players[1].properties = [15, 25]; // Bob owns Pennsylvania + B&O (2 RRs)
      setPropertyState(state, { spaceId: 15, houses: 0, mortgaged: false });
      setPropertyState(state, { spaceId: 25, houses: 0, mortgaged: false });
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Nearest RR',
        effect: { type: 'advanceNearestRailroad' },
      };
      const result = applyCardEffect(state, 'p1', card);
      // Normal rent for 2 RRs = $50, double = $100
      expect(result.spaceResolution?.rentAmount).toBe(100);
      expect(result.state.players[0].cash).toBe(1500 - 100);
      expect(result.state.players[1].cash).toBe(1500 + 100);
    });

    it('P1A.S5.T13c: Chance deck has exactly 2 advanceNearestRailroad cards', () => {
      const chanceCards = chanceCardsData as Card[];
      const rrCards = chanceCards.filter((c) => c.effect.type === 'advanceNearestRailroad');
      expect(rrCards).toHaveLength(2);
    });
  });

  describe('advance to nearest utility', () => {
    it('P1A.S5.T14: nearest utility from Chance positions', () => {
      const state = makeState();
      // From pos 7 → nearest is pos 12 (Electric Co)
      state.players[0].position = 7;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Nearest Utility',
        effect: { type: 'advanceNearestUtility' },
      };
      const result = applyCardEffect(state, 'p1', card, defaultDice);
      expect(result.movedToPosition).toBe(12);

      // From pos 22 → nearest is pos 28 (Water Works)
      const state2 = makeState();
      state2.players[0].position = 22;
      const result2 = applyCardEffect(state2, 'p1', card, defaultDice);
      expect(result2.movedToPosition).toBe(28);

      // From pos 36 → nearest is pos 12 (Electric Co, wraps)
      const state3 = makeState();
      state3.players[0].position = 36;
      const result3 = applyCardEffect(state3, 'p1', card, defaultDice);
      expect(result3.movedToPosition).toBe(12);
    });

    it('P1A.S5.T14a: unowned utility → player may buy', () => {
      const state = makeState();
      state.players[0].position = 7;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Nearest Utility',
        effect: { type: 'advanceNearestUtility' },
      };
      const result = applyCardEffect(state, 'p1', card, defaultDice);
      expect(result.needsBuyDecision).toBe(true);
    });

    it('P1A.S5.T14b: owned utility → pay 10× dice', () => {
      const state = makeState();
      state.players[0].position = 7;
      state.players[1].properties = [12]; // Bob owns Electric Company
      setPropertyState(state, { spaceId: 12, houses: 0, mortgaged: false });
      const dice: DiceResult = { die1: 4, die2: 4, total: 8, isDoubles: true };
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Nearest Utility',
        effect: { type: 'advanceNearestUtility' },
      };
      const result = applyCardEffect(state, 'p1', card, dice);
      // 10 × 8 = $80
      expect(result.spaceResolution?.rentAmount).toBe(80);
      expect(result.state.players[0].cash).toBe(1500 - 80);
    });
  });

  describe('specific card effects', () => {
    it('P1A.S5.T15: Advance to Boardwalk', () => {
      const state = makeState();
      state.players[0].position = 7;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Advance to Boardwalk',
        effect: { type: 'move', position: 39 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].position).toBe(39);
      // Should NOT pass Go (7 → 39 is forward, no wrap)
      expect(result.passedGo).toBe(false);
    });

    it('P1A.S5.T16: Take a trip to Reading Railroad', () => {
      const state = makeState();
      // From pos 36 → to pos 5, passes Go
      state.players[0].position = 36;
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Reading RR trip',
        effect: { type: 'move', position: 5 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].position).toBe(5);
      expect(result.passedGo).toBe(true);
      expect(result.state.players[0].cash).toBe(1700);
    });

    it('P1A.S5.T17: Speeding fine $15', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Speeding fine',
        effect: { type: 'cash', amount: -15 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1485);
    });

    it('P1A.S5.T18: Building loan matures, collect $150', () => {
      const state = makeState();
      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Building loan',
        effect: { type: 'cash', amount: 150 },
      };
      const result = applyCardEffect(state, 'p1', card);
      expect(result.state.players[0].cash).toBe(1650);
    });
  });

  describe('GOOJF coexistence', () => {
    it('P1A.S5.T19: player can hold GOOJF from both decks', () => {
      const state = makeState();

      // Put Chance GOOJF first
      const chanceGoojf = state.decks.chance.find((c) => c.effect.type === 'goojf')!;
      state.decks.chance = [
        chanceGoojf,
        ...state.decks.chance.filter((c) => c.id !== chanceGoojf.id),
      ];

      const { state: state2 } = drawCard(state, 'chance');
      expect(state2.players[0].getOutOfJailFreeCards).toBe(1);

      // Put CC GOOJF first
      const ccGoojf = state2.decks.communityChest.find((c) => c.effect.type === 'goojf')!;
      state2.decks.communityChest = [
        ccGoojf,
        ...state2.decks.communityChest.filter((c) => c.id !== ccGoojf.id),
      ];

      const { state: state3 } = drawCard(state2, 'communityChest');
      expect(state3.players[0].getOutOfJailFreeCards).toBe(2);
      expect(state3.decks.chance).toHaveLength(15);
      expect(state3.decks.communityChest).toHaveLength(15);
    });
  });

  describe('returnCardToDeck', () => {
    it('P1A.S5.T20: places card at bottom of deck', () => {
      const state = makeState();
      const card: Card = {
        id: 'returned',
        deck: 'chance',
        text: 'Test',
        effect: { type: 'cash', amount: 0 },
      };
      const newState = returnCardToDeck(state, card, 'chance');
      expect(newState.decks.chance[newState.decks.chance.length - 1].id).toBe('returned');
    });
  });

  describe('card-triggered space resolution', () => {
    it('P1A.S5.T21: Advance to Illinois and pay rent if owned', () => {
      const state = makeState();
      state.players[0].position = 7;
      state.players[1].properties = [24]; // Bob owns Illinois (pos 24)
      setPropertyState(state, { spaceId: 24, houses: 0, mortgaged: false });

      const card: Card = {
        id: 'test',
        deck: 'chance',
        text: 'Advance to Illinois',
        effect: { type: 'move', position: 24 },
      };
      const result = applyCardEffect(state, 'p1', card);
      // Illinois base rent = $20 (no monopoly)
      expect(result.state.players[0].position).toBe(24);
      expect(result.spaceResolution?.type).toBe('rentPayment');
      expect(result.spaceResolution?.rentAmount).toBe(20);
      expect(result.state.players[0].cash).toBe(1500 - 20);
    });
  });
});
