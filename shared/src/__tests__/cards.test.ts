import { describe, it, expect } from 'vitest';
import chanceCards from '../data/chance-cards.json';
import communityChestCards from '../data/community-chest-cards.json';
import type { Card } from '../types/card';

const chance = chanceCards as Card[];
const communityChest = communityChestCards as Card[];

describe('Chance cards (P0.S5.T8)', () => {
  it('should have exactly 16 cards', () => {
    expect(chance).toHaveLength(16);
  });

  it('should all have deck set to "chance"', () => {
    chance.forEach((card) => {
      expect(card.deck).toBe('chance');
    });
  });

  it('should have 2 cards with advanceNearestRailroad effect', () => {
    const rrCards = chance.filter((c) => c.effect.type === 'advanceNearestRailroad');
    expect(rrCards).toHaveLength(2);
  });

  it('should have 1 advanceNearestUtility card', () => {
    const utilCards = chance.filter((c) => c.effect.type === 'advanceNearestUtility');
    expect(utilCards).toHaveLength(1);
  });

  it('should have 1 Get Out of Jail Free card', () => {
    const goojf = chance.filter((c) => c.effect.type === 'goojf');
    expect(goojf).toHaveLength(1);
  });

  it('should have a Go to Jail card', () => {
    const jailCard = chance.filter((c) => c.effect.type === 'jail');
    expect(jailCard).toHaveLength(1);
  });

  it('should have a repairs card ($25/house $100/hotel)', () => {
    const repairCards = chance.filter((c) => c.effect.type === 'repairs');
    expect(repairCards).toHaveLength(1);
    const repair = repairCards[0].effect;
    if (repair.type === 'repairs') {
      expect(repair.perHouse).toBe(25);
      expect(repair.perHotel).toBe(100);
    }
  });

  it('should have unique IDs', () => {
    const ids = chance.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every card should have a valid CardEffect shape', () => {
    const validTypes = [
      'cash',
      'move',
      'moveBack',
      'jail',
      'collectFromAll',
      'payEachPlayer',
      'repairs',
      'advanceNearestRailroad',
      'advanceNearestUtility',
      'goojf',
    ];
    chance.forEach((card) => {
      expect(validTypes).toContain(card.effect.type);
    });
  });
});

describe('Community Chest cards (P0.S5.T9)', () => {
  it('should have exactly 16 cards', () => {
    expect(communityChest).toHaveLength(16);
  });

  it('should all have deck set to "communityChest"', () => {
    communityChest.forEach((card) => {
      expect(card.deck).toBe('communityChest');
    });
  });

  it('should have unique IDs', () => {
    const ids = communityChest.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have 1 Get Out of Jail Free card', () => {
    const goojf = communityChest.filter((c) => c.effect.type === 'goojf');
    expect(goojf).toHaveLength(1);
  });

  it('should have a Go to Jail card', () => {
    const jailCards = communityChest.filter((c) => c.effect.type === 'jail');
    expect(jailCards).toHaveLength(1);
  });

  it('should have a birthday collectFromAll card ($10)', () => {
    const birthday = communityChest.filter((c) => c.effect.type === 'collectFromAll');
    expect(birthday).toHaveLength(1);
    const effect = birthday[0].effect;
    if (effect.type === 'collectFromAll') {
      expect(effect.amount).toBe(10);
    }
  });

  it('should have a repairs card ($40/house $115/hotel)', () => {
    const repairCards = communityChest.filter((c) => c.effect.type === 'repairs');
    expect(repairCards).toHaveLength(1);
    const repair = repairCards[0].effect;
    if (repair.type === 'repairs') {
      expect(repair.perHouse).toBe(40);
      expect(repair.perHotel).toBe(115);
    }
  });

  it('every card should have a valid CardEffect shape', () => {
    const validTypes = [
      'cash',
      'move',
      'moveBack',
      'jail',
      'collectFromAll',
      'payEachPlayer',
      'repairs',
      'advanceNearestRailroad',
      'advanceNearestUtility',
      'goojf',
    ];
    communityChest.forEach((card) => {
      expect(validTypes).toContain(card.effect.type);
    });
  });
});
