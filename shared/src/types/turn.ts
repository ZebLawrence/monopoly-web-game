export enum TurnState {
  WaitingForRoll = 'WaitingForRoll',
  Rolling = 'Rolling',
  Resolving = 'Resolving',
  AwaitingBuyDecision = 'AwaitingBuyDecision',
  Auction = 'Auction',
  PlayerAction = 'PlayerAction',
  TradeNegotiation = 'TradeNegotiation',
  EndTurn = 'EndTurn',
}
