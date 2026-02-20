export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface TradeOffer {
  id: string;
  proposerId: string;
  recipientId: string;
  offeredProperties: number[];
  offeredCash: number;
  offeredCards: number;
  requestedProperties: number[];
  requestedCash: number;
  requestedCards: number;
  status: TradeStatus;
}
