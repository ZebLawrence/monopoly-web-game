import { TokenType } from './token';

export type JailStatus = { inJail: false } | { inJail: true; turnsInJail: number };

export interface Player {
  id: string;
  name: string;
  token: TokenType;
  cash: number;
  position: number;
  properties: number[];
  jailStatus: JailStatus;
  isActive: boolean;
  isBankrupt: boolean;
  getOutOfJailFreeCards: number;
}
