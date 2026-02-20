export enum GameEventType {
  GameStarted = 'GameStarted',
  TurnStarted = 'TurnStarted',
  DiceRolled = 'DiceRolled',
  PlayerMoved = 'PlayerMoved',
  PropertyPurchased = 'PropertyPurchased',
  RentPaid = 'RentPaid',
  CardDrawn = 'CardDrawn',
  PlayerJailed = 'PlayerJailed',
  PlayerFreed = 'PlayerFreed',
  HouseBuilt = 'HouseBuilt',
  HotelBuilt = 'HotelBuilt',
  PropertyMortgaged = 'PropertyMortgaged',
  PropertyUnmortgaged = 'PropertyUnmortgaged',
  TradeCompleted = 'TradeCompleted',
  PlayerBankrupt = 'PlayerBankrupt',
  GameEnded = 'GameEnded',
  AuctionStarted = 'AuctionStarted',
  AuctionBid = 'AuctionBid',
  AuctionEnded = 'AuctionEnded',
  PassedGo = 'PassedGo',
  TaxPaid = 'TaxPaid',
}

export interface GameEvent {
  id: string;
  gameId: string;
  type: GameEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}
