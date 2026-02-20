import { describe, it, expect } from 'vitest';
import boardData from '../data/board.json';
import type { Space } from '../types/space';

const board = boardData as Space[];

describe('Board data (P0.S5.T7)', () => {
  it('should have exactly 40 spaces', () => {
    expect(board).toHaveLength(40);
  });

  it('should have 22 street properties', () => {
    const streets = board.filter((s) => s.type === 'property');
    expect(streets).toHaveLength(22);
  });

  it('should have 4 railroads', () => {
    const railroads = board.filter((s) => s.type === 'railroad');
    expect(railroads).toHaveLength(4);
  });

  it('should have 2 utilities', () => {
    const utilities = board.filter((s) => s.type === 'utility');
    expect(utilities).toHaveLength(2);
  });
});

describe('Board positions and names (P0.S5.T7a)', () => {
  const expectedBoard: [number, string, string][] = [
    [0, 'Go', 'corner'],
    [1, 'Mediterranean Avenue', 'property'],
    [2, 'Community Chest', 'communityChest'],
    [3, 'Baltic Avenue', 'property'],
    [4, 'Income Tax', 'tax'],
    [5, 'Reading Railroad', 'railroad'],
    [6, 'Oriental Avenue', 'property'],
    [7, 'Chance', 'chance'],
    [8, 'Vermont Avenue', 'property'],
    [9, 'Connecticut Avenue', 'property'],
    [10, 'Jail / Just Visiting', 'corner'],
    [11, 'St. Charles Place', 'property'],
    [12, 'Electric Company', 'utility'],
    [13, 'States Avenue', 'property'],
    [14, 'Virginia Avenue', 'property'],
    [15, 'Pennsylvania Railroad', 'railroad'],
    [16, 'St. James Place', 'property'],
    [17, 'Community Chest', 'communityChest'],
    [18, 'Tennessee Avenue', 'property'],
    [19, 'New York Avenue', 'property'],
    [20, 'Free Parking', 'corner'],
    [21, 'Kentucky Avenue', 'property'],
    [22, 'Chance', 'chance'],
    [23, 'Indiana Avenue', 'property'],
    [24, 'Illinois Avenue', 'property'],
    [25, 'B&O Railroad', 'railroad'],
    [26, 'Atlantic Avenue', 'property'],
    [27, 'Ventnor Avenue', 'property'],
    [28, 'Water Works', 'utility'],
    [29, 'Marvin Gardens', 'property'],
    [30, 'Go To Jail', 'corner'],
    [31, 'Pacific Avenue', 'property'],
    [32, 'North Carolina Avenue', 'property'],
    [33, 'Community Chest', 'communityChest'],
    [34, 'Pennsylvania Avenue', 'property'],
    [35, 'Short Line Railroad', 'railroad'],
    [36, 'Chance', 'chance'],
    [37, 'Park Place', 'property'],
    [38, 'Luxury Tax', 'tax'],
    [39, 'Boardwalk', 'property'],
  ];

  it.each(expectedBoard)('position %i should be "%s" of type "%s"', (position, name, type) => {
    const space = board[position];
    expect(space.name).toBe(name);
    expect(space.type).toBe(type);
    expect(space.position).toBe(position);
  });
});

describe('Color groups (P0.S5.T7b)', () => {
  const colorGroupTests: {
    group: string;
    members: string[];
    houseCost: number;
    count: number;
  }[] = [
    {
      group: 'brown',
      members: ['Mediterranean Avenue', 'Baltic Avenue'],
      houseCost: 50,
      count: 2,
    },
    {
      group: 'lightBlue',
      members: ['Oriental Avenue', 'Vermont Avenue', 'Connecticut Avenue'],
      houseCost: 50,
      count: 3,
    },
    {
      group: 'pink',
      members: ['St. Charles Place', 'States Avenue', 'Virginia Avenue'],
      houseCost: 100,
      count: 3,
    },
    {
      group: 'orange',
      members: ['St. James Place', 'Tennessee Avenue', 'New York Avenue'],
      houseCost: 100,
      count: 3,
    },
    {
      group: 'red',
      members: ['Kentucky Avenue', 'Indiana Avenue', 'Illinois Avenue'],
      houseCost: 150,
      count: 3,
    },
    {
      group: 'yellow',
      members: ['Atlantic Avenue', 'Ventnor Avenue', 'Marvin Gardens'],
      houseCost: 150,
      count: 3,
    },
    {
      group: 'green',
      members: ['Pacific Avenue', 'North Carolina Avenue', 'Pennsylvania Avenue'],
      houseCost: 200,
      count: 3,
    },
    {
      group: 'darkBlue',
      members: ['Park Place', 'Boardwalk'],
      houseCost: 200,
      count: 2,
    },
  ];

  it.each(colorGroupTests)(
    '$group group should have $count members with $houseCost house cost',
    ({ group, members, houseCost, count }) => {
      const groupSpaces = board.filter((s) => s.colorGroup === group);
      expect(groupSpaces).toHaveLength(count);
      const names = groupSpaces.map((s) => s.name);
      members.forEach((m) => expect(names).toContain(m));
      groupSpaces.forEach((s) => expect(s.houseCost).toBe(houseCost));
    },
  );
});

describe('Rent tiers (P0.S5.T7c)', () => {
  it('should give every street property exactly 6 rent tiers', () => {
    const streets = board.filter((s) => s.type === 'property');
    streets.forEach((s) => {
      expect(s.rentTiers).toHaveLength(6);
    });
  });

  it('Mediterranean Avenue: base $2, hotel $250', () => {
    const med = board.find((s) => s.name === 'Mediterranean Avenue')!;
    expect(med.rentTiers![0]).toBe(2);
    expect(med.rentTiers![5]).toBe(250);
  });

  it('Boardwalk: base $50, hotel $2000', () => {
    const bw = board.find((s) => s.name === 'Boardwalk')!;
    expect(bw.rentTiers![0]).toBe(50);
    expect(bw.rentTiers![5]).toBe(2000);
  });

  it('Illinois Avenue: base $20, hotel $1100', () => {
    const ill = board.find((s) => s.name === 'Illinois Avenue')!;
    expect(ill.rentTiers![0]).toBe(20);
    expect(ill.rentTiers![5]).toBe(1100);
  });

  // Spot-check one property per color group
  it('Baltic Avenue (brown): base $4, hotel $450', () => {
    const space = board.find((s) => s.name === 'Baltic Avenue')!;
    expect(space.rentTiers![0]).toBe(4);
    expect(space.rentTiers![5]).toBe(450);
  });

  it('Connecticut Avenue (lightBlue): base $8, hotel $600', () => {
    const space = board.find((s) => s.name === 'Connecticut Avenue')!;
    expect(space.rentTiers![0]).toBe(8);
    expect(space.rentTiers![5]).toBe(600);
  });

  it('Virginia Avenue (pink): base $12, hotel $900', () => {
    const space = board.find((s) => s.name === 'Virginia Avenue')!;
    expect(space.rentTiers![0]).toBe(12);
    expect(space.rentTiers![5]).toBe(900);
  });

  it('New York Avenue (orange): base $16, hotel $1000', () => {
    const space = board.find((s) => s.name === 'New York Avenue')!;
    expect(space.rentTiers![0]).toBe(16);
    expect(space.rentTiers![5]).toBe(1000);
  });

  it('Marvin Gardens (yellow): base $24, hotel $1200', () => {
    const space = board.find((s) => s.name === 'Marvin Gardens')!;
    expect(space.rentTiers![0]).toBe(24);
    expect(space.rentTiers![5]).toBe(1200);
  });

  it('Pennsylvania Avenue (green): base $28, hotel $1400', () => {
    const space = board.find((s) => s.name === 'Pennsylvania Avenue')!;
    expect(space.rentTiers![0]).toBe(28);
    expect(space.rentTiers![5]).toBe(1400);
  });

  it('Park Place (darkBlue): base $35, hotel $1500', () => {
    const space = board.find((s) => s.name === 'Park Place')!;
    expect(space.rentTiers![0]).toBe(35);
    expect(space.rentTiers![5]).toBe(1500);
  });
});

describe('Mortgage values (P0.S5.T7d)', () => {
  it('all streets: mortgage = price / 2', () => {
    const streets = board.filter((s) => s.type === 'property');
    streets.forEach((s) => {
      expect(s.mortgageValue).toBe(s.cost! / 2);
    });
  });

  it('all railroads: mortgage = $100', () => {
    const railroads = board.filter((s) => s.type === 'railroad');
    railroads.forEach((s) => {
      expect(s.mortgageValue).toBe(100);
    });
  });

  it('all utilities: mortgage = $75', () => {
    const utilities = board.filter((s) => s.type === 'utility');
    utilities.forEach((s) => {
      expect(s.mortgageValue).toBe(75);
    });
  });
});

describe('Chance and Community Chest positions (P0.S5.T7e)', () => {
  it('Chance spaces at positions 7, 22, 36', () => {
    const chancePositions = board.filter((s) => s.type === 'chance').map((s) => s.position);
    expect(chancePositions).toEqual([7, 22, 36]);
  });

  it('Community Chest spaces at positions 2, 17, 33', () => {
    const ccPositions = board.filter((s) => s.type === 'communityChest').map((s) => s.position);
    expect(ccPositions).toEqual([2, 17, 33]);
  });
});

describe('Tax spaces (P0.S5.T7f)', () => {
  it('Income Tax at position 4 with $200', () => {
    const incomeTax = board[4];
    expect(incomeTax.type).toBe('tax');
    expect(incomeTax.name).toBe('Income Tax');
    expect(incomeTax.taxAmount).toBe(200);
  });

  it('Luxury Tax at position 38 with $100', () => {
    const luxuryTax = board[38];
    expect(luxuryTax.type).toBe('tax');
    expect(luxuryTax.name).toBe('Luxury Tax');
    expect(luxuryTax.taxAmount).toBe(100);
  });
});

describe('Railroad prices (P0.S5.T7g)', () => {
  it('all 4 railroads cost $200', () => {
    const railroads = board.filter((s) => s.type === 'railroad');
    expect(railroads).toHaveLength(4);
    railroads.forEach((r) => {
      expect(r.cost).toBe(200);
    });
  });

  it('railroads are at positions 5, 15, 25, 35', () => {
    const positions = board.filter((s) => s.type === 'railroad').map((s) => s.position);
    expect(positions).toEqual([5, 15, 25, 35]);
  });
});

describe('Utility prices (P0.S5.T7h)', () => {
  it('Electric Company (pos 12) costs $150', () => {
    expect(board[12].type).toBe('utility');
    expect(board[12].cost).toBe(150);
  });

  it('Water Works (pos 28) costs $150', () => {
    expect(board[28].type).toBe('utility');
    expect(board[28].cost).toBe(150);
  });
});
