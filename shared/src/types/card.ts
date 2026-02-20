export type DeckType = 'chance' | 'communityChest';

export type CardEffect =
  | { type: 'cash'; amount: number }
  | { type: 'move'; position: number }
  | { type: 'moveBack'; spaces: number }
  | { type: 'jail' }
  | { type: 'collectFromAll'; amount: number }
  | { type: 'payEachPlayer'; amount: number }
  | { type: 'repairs'; perHouse: number; perHotel: number }
  | { type: 'advanceNearestRailroad' }
  | { type: 'advanceNearestUtility' }
  | { type: 'goojf' };

export interface Card {
  id: string;
  deck: DeckType;
  text: string;
  effect: CardEffect;
}
