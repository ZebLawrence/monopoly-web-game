import type { GameEvent } from '../types/gameEvent';
import { GameEventType } from '../types/gameEvent';

type EventHandler = (event: GameEvent) => void;

export class GameEventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(eventType: GameEventType | string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  off(eventType: GameEventType | string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(
      eventType,
      existing.filter((h) => h !== handler),
    );
  }

  emit(event: GameEvent): void {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      handler(event);
    }
    // Also notify '*' handlers (wildcard)
    const wildcardHandlers = this.handlers.get('*') ?? [];
    for (const handler of wildcardHandlers) {
      handler(event);
    }
  }
}

export class GameEventLog {
  private events: GameEvent[] = [];
  private gameId: string;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  private nextId(): string {
    return `evt-${this.events.length + 1}`;
  }

  append(type: GameEventType, payload: Record<string, unknown>): GameEvent {
    const event: GameEvent = {
      id: this.nextId(),
      gameId: this.gameId,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.events.push(event);
    return event;
  }

  getAll(): GameEvent[] {
    return [...this.events];
  }

  getEventsSince(timestamp: number): GameEvent[] {
    return this.events.filter((e) => e.timestamp > timestamp);
  }

  get length(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}

// Helper to create events for common actions
export function createPlayerMovedEvent(
  gameId: string,
  playerId: string,
  fromPosition: number,
  toPosition: number,
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.PlayerMoved,
    payload: { playerId, fromPosition, toPosition },
    timestamp: Date.now(),
  };
}

export function createPropertyPurchasedEvent(
  gameId: string,
  playerId: string,
  propertyId: number,
  price: number,
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.PropertyPurchased,
    payload: { playerId, propertyId, price },
    timestamp: Date.now(),
  };
}

export function createRentPaidEvent(
  gameId: string,
  payerId: string,
  receiverId: string,
  amount: number,
  propertyId: number,
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.RentPaid,
    payload: { payerId, receiverId, amount, propertyId },
    timestamp: Date.now(),
  };
}

export function createCardDrawnEvent(
  gameId: string,
  playerId: string,
  cardText: string,
  deck: string,
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.CardDrawn,
    payload: { playerId, cardText, deck },
    timestamp: Date.now(),
  };
}

export function createPlayerBankruptEvent(
  gameId: string,
  playerId: string,
  creditorId: string | 'bank',
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.PlayerBankrupt,
    payload: { playerId, creditorId },
    timestamp: Date.now(),
  };
}

export function createTradeCompletedEvent(
  gameId: string,
  tradeId: string,
  proposerId: string,
  recipientId: string,
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.TradeCompleted,
    payload: { tradeId, proposerId, recipientId },
    timestamp: Date.now(),
  };
}

export function createBuildingPlacedEvent(
  gameId: string,
  playerId: string,
  propertyId: number,
  buildingType: 'house' | 'hotel',
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.HouseBuilt,
    payload: { playerId, propertyId, buildingType },
    timestamp: Date.now(),
  };
}

export function createBuildingSoldEvent(
  gameId: string,
  playerId: string,
  propertyId: number,
  buildingType: 'house' | 'hotel',
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.HouseBuilt, // reuse — or could be a separate type
    payload: { playerId, propertyId, buildingType, action: 'sold' },
    timestamp: Date.now(),
  };
}

export function createDiceRolledEvent(
  gameId: string,
  playerId: string,
  die1: number,
  die2: number,
  total: number,
  isDoubles: boolean,
): GameEvent {
  return {
    id: '',
    gameId,
    type: GameEventType.DiceRolled,
    payload: { playerId, die1, die2, total, isDoubles },
    timestamp: Date.now(),
  };
}
