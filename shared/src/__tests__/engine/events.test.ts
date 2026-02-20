import { describe, it, expect, vi } from 'vitest';
import {
  GameEventEmitter,
  GameEventLog,
  createPlayerMovedEvent,
  createPropertyPurchasedEvent,
  createRentPaidEvent,
  createCardDrawnEvent,
  createPlayerBankruptEvent,
  createTradeCompletedEvent,
  createBuildingPlacedEvent,
  createBuildingSoldEvent,
  createDiceRolledEvent,
} from '../../engine/events';
import { GameEventType } from '../../types/gameEvent';
import type { GameEvent } from '../../types/gameEvent';

describe('Step 1A.10 — Event System', () => {
  describe('GameEventEmitter', () => {
    it('P1A.S10.T1: on and emit work correctly', () => {
      const emitter = new GameEventEmitter();
      const handler = vi.fn();
      emitter.on(GameEventType.DiceRolled, handler);

      const event: GameEvent = {
        id: 'e1',
        gameId: 'g1',
        type: GameEventType.DiceRolled,
        payload: { die1: 3, die2: 4 },
        timestamp: Date.now(),
      };

      emitter.emit(event);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('does not call handler for different event type', () => {
      const emitter = new GameEventEmitter();
      const handler = vi.fn();
      emitter.on(GameEventType.DiceRolled, handler);

      const event: GameEvent = {
        id: 'e1',
        gameId: 'g1',
        type: GameEventType.PlayerMoved,
        payload: {},
        timestamp: Date.now(),
      };

      emitter.emit(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('off removes handler', () => {
      const emitter = new GameEventEmitter();
      const handler = vi.fn();
      emitter.on(GameEventType.DiceRolled, handler);
      emitter.off(GameEventType.DiceRolled, handler);

      const event: GameEvent = {
        id: 'e1',
        gameId: 'g1',
        type: GameEventType.DiceRolled,
        payload: {},
        timestamp: Date.now(),
      };

      emitter.emit(event);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('event generation', () => {
    it('P1A.S10.T2: PlayerMoved event has correct fields', () => {
      const event = createPlayerMovedEvent('g1', 'p1', 5, 12);
      expect(event.type).toBe(GameEventType.PlayerMoved);
      expect(event.payload.playerId).toBe('p1');
      expect(event.payload.fromPosition).toBe(5);
      expect(event.payload.toPosition).toBe(12);
    });

    it('P1A.S10.T3: PropertyPurchased event', () => {
      const event = createPropertyPurchasedEvent('g1', 'p1', 3, 60);
      expect(event.type).toBe(GameEventType.PropertyPurchased);
      expect(event.payload.playerId).toBe('p1');
      expect(event.payload.propertyId).toBe(3);
      expect(event.payload.price).toBe(60);
    });

    it('P1A.S10.T4: RentPaid event', () => {
      const event = createRentPaidEvent('g1', 'p1', 'p2', 50, 3);
      expect(event.type).toBe(GameEventType.RentPaid);
      expect(event.payload.payerId).toBe('p1');
      expect(event.payload.receiverId).toBe('p2');
      expect(event.payload.amount).toBe(50);
      expect(event.payload.propertyId).toBe(3);
    });

    it('P1A.S10.T5: CardDrawn event', () => {
      const event = createCardDrawnEvent('g1', 'p1', 'Advance to Go', 'chance');
      expect(event.type).toBe(GameEventType.CardDrawn);
      expect(event.payload.playerId).toBe('p1');
      expect(event.payload.cardText).toBe('Advance to Go');
      expect(event.payload.deck).toBe('chance');
    });

    it('P1A.S10.T6: PlayerBankrupt event', () => {
      const event = createPlayerBankruptEvent('g1', 'p1', 'p2');
      expect(event.type).toBe(GameEventType.PlayerBankrupt);
      expect(event.payload.playerId).toBe('p1');
      expect(event.payload.creditorId).toBe('p2');
    });

    it('P1A.S10.T7: TradeCompleted event', () => {
      const event = createTradeCompletedEvent('g1', 't1', 'p1', 'p2');
      expect(event.type).toBe(GameEventType.TradeCompleted);
      expect(event.payload.tradeId).toBe('t1');
      expect(event.payload.proposerId).toBe('p1');
      expect(event.payload.recipientId).toBe('p2');
    });

    it('P1A.S10.T8: BuildingPlaced and BuildingSold events', () => {
      const placed = createBuildingPlacedEvent('g1', 'p1', 3, 'house');
      expect(placed.payload.propertyId).toBe(3);
      expect(placed.payload.buildingType).toBe('house');

      const sold = createBuildingSoldEvent('g1', 'p1', 3, 'hotel');
      expect(sold.payload.propertyId).toBe(3);
      expect(sold.payload.buildingType).toBe('hotel');
      expect(sold.payload.action).toBe('sold');
    });

    it('DiceRolled event', () => {
      const event = createDiceRolledEvent('g1', 'p1', 3, 4, 7, false);
      expect(event.type).toBe(GameEventType.DiceRolled);
      expect(event.payload.die1).toBe(3);
      expect(event.payload.die2).toBe(4);
      expect(event.payload.total).toBe(7);
      expect(event.payload.isDoubles).toBe(false);
    });
  });

  describe('GameEventLog', () => {
    it('P1A.S10.T9: ordered append-only list with timestamps', () => {
      const log = new GameEventLog('g1');

      log.append(GameEventType.DiceRolled, { die1: 3, die2: 4 });
      log.append(GameEventType.PlayerMoved, { playerId: 'p1', from: 0, to: 7 });
      log.append(GameEventType.PropertyPurchased, { playerId: 'p1', propertyId: 3 });

      const events = log.getAll();
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe(GameEventType.DiceRolled);
      expect(events[1].type).toBe(GameEventType.PlayerMoved);
      expect(events[2].type).toBe(GameEventType.PropertyPurchased);

      // All have timestamps
      for (const e of events) {
        expect(e.timestamp).toBeGreaterThan(0);
      }

      // Timestamps are in order
      expect(events[0].timestamp).toBeLessThanOrEqual(events[1].timestamp);
      expect(events[1].timestamp).toBeLessThanOrEqual(events[2].timestamp);
    });

    it('P1A.S10.T10: getEventsSince returns events after timestamp', () => {
      const log = new GameEventLog('g1');

      // Add events with controlled timestamps
      const baseTime = Date.now();
      for (let i = 0; i < 10; i++) {
        const event = log.append(GameEventType.DiceRolled, { roll: i + 1 });
        // Override timestamp for testing
        (event as { timestamp: number }).timestamp = baseTime + i * 100;
      }

      const allEvents = log.getAll();
      const event5Timestamp = allEvents[4].timestamp; // Event 5 (0-indexed: 4)

      const since = log.getEventsSince(event5Timestamp);
      expect(since).toHaveLength(5); // Events 6-10
      expect((since[0].payload as { roll: number }).roll).toBe(6);
    });
  });
});
