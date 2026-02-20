export type GameAction =
  | { type: 'RollDice' }
  | { type: 'BuyProperty'; propertyId: number }
  | { type: 'DeclineProperty'; propertyId: number }
  | { type: 'AuctionBid'; amount: number }
  | { type: 'AuctionPass' }
  | { type: 'BuildHouse'; propertyId: number }
  | { type: 'BuildHotel'; propertyId: number }
  | { type: 'SellBuilding'; propertyId: number; count: number }
  | { type: 'MortgageProperty'; propertyId: number }
  | { type: 'UnmortgageProperty'; propertyId: number }
  | { type: 'ProposeTrade'; recipientId: string; offer: TradeOfferPayload }
  | { type: 'AcceptTrade'; tradeId: string }
  | { type: 'RejectTrade'; tradeId: string }
  | { type: 'CounterTrade'; tradeId: string; offer: TradeOfferPayload }
  | { type: 'PayJailFine' }
  | { type: 'UseJailCard' }
  | { type: 'RollForDoubles' }
  | { type: 'DeclareBankruptcy'; creditorId: string | 'bank' }
  | { type: 'EndTurn' };

export interface TradeOfferPayload {
  offeredProperties: number[];
  offeredCash: number;
  offeredCards: number;
  requestedProperties: number[];
  requestedCash: number;
  requestedCards: number;
}
