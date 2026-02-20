import { ColorGroup } from './space';

export type PropertyType = 'street' | 'railroad' | 'utility';

export interface Property {
  spaceId: number;
  name: string;
  type: PropertyType;
  colorGroup?: ColorGroup;
  cost: number;
  rentTiers: number[];
  mortgaged: boolean;
  ownerId: string | null;
  houses: number;
}
