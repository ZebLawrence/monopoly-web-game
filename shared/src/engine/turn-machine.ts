import { TurnState } from '../types/turn';
import type { GameAction } from '../types/gameAction';

export interface TurnContext {
  landedOnUnownedProperty?: boolean;
  rolledDoubles?: boolean;
  auctionComplete?: boolean;
}

export class TurnStateMachine {
  currentState: TurnState;
  private _rolledDoubles = false;

  constructor(initialState: TurnState = TurnState.WaitingForRoll) {
    this.currentState = initialState;
  }

  get rolledDoubles(): boolean {
    return this._rolledDoubles;
  }

  set rolledDoubles(value: boolean) {
    this._rolledDoubles = value;
  }

  transition(action: GameAction, context: TurnContext = {}): TurnState {
    const actionType = action.type;

    switch (this.currentState) {
      case TurnState.WaitingForRoll:
        if (actionType === 'RollDice' || actionType === 'RollForDoubles') {
          this.currentState = TurnState.Rolling;
          return this.currentState;
        }
        if (actionType === 'PayJailFine' || actionType === 'UseJailCard') {
          return this.currentState;
        }
        throw new Error(`Invalid action '${actionType}' in state '${this.currentState}'`);

      case TurnState.Rolling:
        // Auto-transition to Resolving after dice result
        this.currentState = TurnState.Resolving;
        return this.currentState;

      case TurnState.Resolving:
        if (context.landedOnUnownedProperty) {
          this.currentState = TurnState.AwaitingBuyDecision;
          return this.currentState;
        }
        this.currentState = TurnState.PlayerAction;
        return this.currentState;

      case TurnState.AwaitingBuyDecision:
        if (actionType === 'BuyProperty') {
          this.currentState = TurnState.PlayerAction;
          return this.currentState;
        }
        if (actionType === 'DeclineProperty') {
          this.currentState = TurnState.Auction;
          return this.currentState;
        }
        throw new Error(`Invalid action '${actionType}' in state '${this.currentState}'`);

      case TurnState.Auction:
        if (context.auctionComplete) {
          this.currentState = TurnState.PlayerAction;
          return this.currentState;
        }
        if (actionType === 'AuctionBid' || actionType === 'AuctionPass') {
          return this.currentState;
        }
        throw new Error(`Invalid action '${actionType}' in state '${this.currentState}'`);

      case TurnState.PlayerAction:
        if (actionType === 'EndTurn') {
          if (this._rolledDoubles) {
            this._rolledDoubles = false;
            this.currentState = TurnState.WaitingForRoll;
            return this.currentState;
          }
          this.currentState = TurnState.EndTurn;
          return this.currentState;
        }
        if (
          actionType === 'BuildHouse' ||
          actionType === 'BuildHotel' ||
          actionType === 'SellBuilding' ||
          actionType === 'MortgageProperty' ||
          actionType === 'UnmortgageProperty' ||
          actionType === 'ProposeTrade'
        ) {
          return this.currentState;
        }
        throw new Error(`Invalid action '${actionType}' in state '${this.currentState}'`);

      case TurnState.EndTurn:
        // Advances to next player's WaitingForRoll
        this.currentState = TurnState.WaitingForRoll;
        return this.currentState;

      default:
        throw new Error(`Unknown state: ${this.currentState}`);
    }
  }

  getValidActions(): string[] {
    switch (this.currentState) {
      case TurnState.WaitingForRoll:
        return ['RollDice', 'PayJailFine', 'UseJailCard', 'RollForDoubles'];
      case TurnState.Rolling:
        return [];
      case TurnState.Resolving:
        return [];
      case TurnState.AwaitingBuyDecision:
        return ['BuyProperty', 'DeclineProperty'];
      case TurnState.Auction:
        return ['AuctionBid', 'AuctionPass'];
      case TurnState.PlayerAction:
        return [
          'BuildHouse',
          'BuildHotel',
          'SellBuilding',
          'MortgageProperty',
          'UnmortgageProperty',
          'ProposeTrade',
          'EndTurn',
        ];
      case TurnState.EndTurn:
        return [];
      default:
        return [];
    }
  }
}
