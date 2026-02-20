export interface GameSettings {
  maxPlayers: number;
  startingCash: number;
  turnTimeLimit: number;
  freeParking: 'classic' | 'houserule';
  auctionEnabled: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: 6,
  startingCash: 1500,
  turnTimeLimit: 60,
  freeParking: 'classic',
  auctionEnabled: true,
};
