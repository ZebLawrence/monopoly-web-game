export enum SpaceType {
  Property = 'property',
  Railroad = 'railroad',
  Utility = 'utility',
  Tax = 'tax',
  Chance = 'chance',
  CommunityChest = 'communityChest',
  Corner = 'corner',
}

export type ColorGroup =
  | 'brown'
  | 'lightBlue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkBlue';

export interface Space {
  id: number;
  name: string;
  type: SpaceType;
  position: number;
  colorGroup?: ColorGroup;
  cost?: number;
  rentTiers?: number[];
  mortgageValue?: number;
  houseCost?: number;
  hotelCost?: number;
  taxAmount?: number;
}
