import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRedisClient } from '../redis/client';
import type { RoomMetadata } from '@monopoly/shared';

describe('Redis Client (InMemory)', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  // --- Game State ---

  describe('saveGameState / loadGameState', () => {
    it('should save and load game state', async () => {
      const state = JSON.stringify({ gameId: 'test-123', status: 'playing' });
      await redis.saveGameState('test-123', state);
      const loaded = await redis.loadGameState('test-123');
      expect(loaded).toBe(state);
    });

    it('should return null for nonexistent game', async () => {
      const result = await redis.loadGameState('nonexistent');
      expect(result).toBeNull();
    });

    it('should deep-equal original after round-trip', async () => {
      const original = { gameId: 'g1', players: [{ id: 'p1', name: 'Alice', cash: 1500 }] };
      await redis.saveGameState('g1', JSON.stringify(original));
      const loaded = JSON.parse((await redis.loadGameState('g1'))!);
      expect(loaded).toEqual(original);
    });
  });

  describe('deleteGameState', () => {
    it('should delete a saved game state', async () => {
      await redis.saveGameState('g1', '{}');
      await redis.deleteGameState('g1');
      const result = await redis.loadGameState('g1');
      expect(result).toBeNull();
    });
  });

  describe('TTL', () => {
    it('should set TTL on game keys', async () => {
      await redis.saveGameState('g1', '{}');
      const ttl = await redis.getTTL('game:g1');
      expect(ttl).toBeGreaterThan(0);
    });

    it('should return -2 for nonexistent keys', async () => {
      const ttl = await redis.getTTL('nonexistent');
      expect(ttl).toBe(-2);
    });
  });

  // --- Room Metadata ---

  describe('saveRoomMetadata / loadRoomMetadata', () => {
    const testRoom: RoomMetadata = {
      roomCode: 'ABC123',
      hostId: 'host-1',
      players: [{ id: 'host-1', name: 'Host', isReady: true, isHost: true, isConnected: true }],
      maxPlayers: 6,
      startingCash: 1500,
      status: 'waiting',
      createdAt: Date.now(),
    };

    it('should save and load room metadata', async () => {
      await redis.saveRoomMetadata('ABC123', testRoom);
      const loaded = await redis.loadRoomMetadata('ABC123');
      expect(loaded).toEqual(testRoom);
    });

    it('should return null for nonexistent room', async () => {
      const result = await redis.loadRoomMetadata('NOROOM');
      expect(result).toBeNull();
    });
  });

  describe('roomExists', () => {
    it('should return true for existing room', async () => {
      await redis.saveRoomMetadata('XYZ', {
        roomCode: 'XYZ',
        hostId: 'h1',
        players: [],
        maxPlayers: 6,
        startingCash: 1500,
        status: 'waiting',
        createdAt: Date.now(),
      });
      expect(await redis.roomExists('XYZ')).toBe(true);
    });

    it('should return false for nonexistent room', async () => {
      expect(await redis.roomExists('NOPE')).toBe(false);
    });
  });

  describe('deleteRoomMetadata', () => {
    it('should delete room', async () => {
      await redis.saveRoomMetadata('DEL', {
        roomCode: 'DEL',
        hostId: 'h1',
        players: [],
        maxPlayers: 6,
        startingCash: 1500,
        status: 'waiting',
        createdAt: Date.now(),
      });
      await redis.deleteRoomMetadata('DEL');
      expect(await redis.roomExists('DEL')).toBe(false);
    });
  });

  // --- Session ---

  describe('session management', () => {
    it('should save and load session', async () => {
      const session = {
        socketId: 'sock-1',
        roomCode: 'ROOM1',
        playerName: 'Alice',
        connectedAt: Date.now(),
      };
      await redis.saveSession('player-1', session);
      const loaded = await redis.loadSession('player-1');
      expect(loaded).toEqual(session);
    });

    it('should return null for nonexistent session', async () => {
      const result = await redis.loadSession('nobody');
      expect(result).toBeNull();
    });

    it('should delete session', async () => {
      await redis.saveSession('p1', {
        socketId: 's1',
        roomCode: 'R1',
        playerName: 'Bob',
        connectedAt: Date.now(),
      });
      await redis.deleteSession('p1');
      expect(await redis.loadSession('p1')).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('should clear all data', async () => {
      await redis.saveGameState('g1', '{}');
      await redis.disconnect();
      expect(await redis.loadGameState('g1')).toBeNull();
    });
  });
});
