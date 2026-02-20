import { describe, it, expect } from 'vitest';
import boardData from '../data/board.json';
import type { Space } from '../types/space';
import type { TitleDeedData } from '../types/titleDeed';

const board = boardData as Space[];

describe('Title Deed Data (P0.S5.T17)', () => {
  const buyableSpaces = board.filter(
    (s) => s.type === 'property' || s.type === 'railroad' || s.type === 'utility',
  );

  it('should have 28 buyable properties (22 streets + 4 railroads + 2 utilities)', () => {
    expect(buyableSpaces).toHaveLength(28);
  });

  it('should be able to create a TitleDeedData for each buyable property', () => {
    const deeds: TitleDeedData[] = buyableSpaces.map((s) => ({
      propertyId: s.id,
      name: s.name,
      colorGroup: s.colorGroup,
      cost: s.cost!,
      rentTiers: s.rentTiers!,
      mortgageValue: s.mortgageValue!,
      houseCost: s.houseCost,
      hotelCost: s.hotelCost,
    }));
    expect(deeds).toHaveLength(28);
    deeds.forEach((d) => {
      expect(d.cost).toBeGreaterThan(0);
      expect(d.mortgageValue).toBeGreaterThan(0);
      expect(d.rentTiers.length).toBeGreaterThan(0);
    });
  });
});
