import { ColorGroup } from './space';

export interface TitleDeedData {
  propertyId: number;
  name: string;
  colorGroup?: ColorGroup;
  cost: number;
  rentTiers: number[];
  mortgageValue: number;
  houseCost?: number;
  hotelCost?: number;
}
