import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRedisClient } from '../redis/client';
import {
  createRoom,
  joinRoom,
  selectToken,
  leaveRoom,
  generateRoomCode,
  markPlayerDisconnected,
  markPlayerReconnected,
} from '../game/room-manager';
import { TokenType } from '@monopoly/shared';

describe('Room Manager', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  describe('generateRoomCode', () => {
    it('should generate a 6-character code', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
    });

    it('should generate alphanumeric codes', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z2-9]+$/);
    });

    it('should generate unique codes on successive calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode());
      }
      // With 6 chars from 28-char alphabet, collisions extremely unlikely in 100 tries
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('createRoom', () => {
    it('should create a room with the host as the only player', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      expect(room.roomCode).toHaveLength(6);
      expect(room.hostId).toBe('host-1');
      expect(room.players).toHaveLength(1);
      expect(room.players[0]).toEqual({
        id: 'host-1',
        name: 'Alice',
        isReady: true,
        isHost: true,
        isConnected: true,
      });
      expect(room.status).toBe('waiting');
    });

    it('should store room in Redis', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      const loaded = await redis.loadRoomMetadata(room.roomCode);
      expect(loaded).toEqual(room);
    });

    it('should use custom maxPlayers and startingCash', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice', 4, 2000);
      expect(room.maxPlayers).toBe(4);
      expect(room.startingCash).toBe(2000);
    });

    it('should regenerate code on collision', async () => {
      // Pre-populate a room to force at least one collision check
      const firstRoom = await createRoom(redis, 'host-0', 'Pre');
      expect(firstRoom.roomCode).toHaveLength(6);

      // This should still work (generates different code)
      const secondRoom = await createRoom(redis, 'host-1', 'Alice');
      expect(secondRoom.roomCode).not.toBe(firstRoom.roomCode);
    });
  });

  describe('joinRoom', () => {
    it('should add player to room', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      const { room: updatedRoom, player } = await joinRoom(redis, room.roomCode, 'player-2', 'Bob');
      expect(updatedRoom.players).toHaveLength(2);
      expect(player.id).toBe('player-2');
      expect(player.name).toBe('Bob');
      expect(player.isHost).toBe(false);
    });

    it('should reject invalid room code', async () => {
      await expect(joinRoom(redis, 'INVALID', 'p1', 'Test')).rejects.toThrow('Room not found');
    });

    it('should reject if room is full', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice', 2);
      await joinRoom(redis, room.roomCode, 'p2', 'Bob');
      await expect(joinRoom(redis, room.roomCode, 'p3', 'Charlie')).rejects.toThrow('Room is full');
    });

    it('should reject if game already started', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      room.status = 'playing';
      await redis.saveRoomMetadata(room.roomCode, room);
      await expect(joinRoom(redis, room.roomCode, 'p2', 'Bob')).rejects.toThrow(
        'Game already started',
      );
    });

    it('should reject duplicate player', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      await expect(joinRoom(redis, room.roomCode, 'host-1', 'Alice')).rejects.toThrow(
        'Already in room',
      );
    });
  });

  describe('selectToken', () => {
    it('should update player token', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      const updated = await selectToken(redis, room.roomCode, 'host-1', TokenType.RaceCar);
      expect(updated.players[0].token).toBe(TokenType.RaceCar);
      expect(updated.players[0].isReady).toBe(true);
    });

    it('should reject duplicate token in room', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      await joinRoom(redis, room.roomCode, 'p2', 'Bob');
      await selectToken(redis, room.roomCode, 'host-1', TokenType.RaceCar);
      await expect(selectToken(redis, room.roomCode, 'p2', TokenType.RaceCar)).rejects.toThrow(
        'Token already taken',
      );
    });

    it('should allow same player to re-select same token', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      await selectToken(redis, room.roomCode, 'host-1', TokenType.TopHat);
      const updated = await selectToken(redis, room.roomCode, 'host-1', TokenType.TopHat);
      expect(updated.players[0].token).toBe(TokenType.TopHat);
    });
  });

  describe('leaveRoom', () => {
    it('should remove player from room', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      await joinRoom(redis, room.roomCode, 'p2', 'Bob');
      const { room: updated } = await leaveRoom(redis, room.roomCode, 'p2');
      expect(updated?.players).toHaveLength(1);
    });

    it('should transfer host when host leaves', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      await joinRoom(redis, room.roomCode, 'p2', 'Bob');
      const { room: updated, newHostId } = await leaveRoom(redis, room.roomCode, 'host-1');
      expect(newHostId).toBe('p2');
      expect(updated?.hostId).toBe('p2');
      expect(updated?.players[0].isHost).toBe(true);
    });

    it('should delete room when last player leaves', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      const { room: updated } = await leaveRoom(redis, room.roomCode, 'host-1');
      expect(updated).toBeNull();
      expect(await redis.roomExists(room.roomCode)).toBe(false);
    });
  });

  describe('disconnect / reconnect markers', () => {
    it('should mark player as disconnected', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      const updated = await markPlayerDisconnected(redis, room.roomCode, 'host-1');
      expect(updated?.players[0].isConnected).toBe(false);
    });

    it('should mark player as reconnected', async () => {
      const room = await createRoom(redis, 'host-1', 'Alice');
      await markPlayerDisconnected(redis, room.roomCode, 'host-1');
      const updated = await markPlayerReconnected(redis, room.roomCode, 'host-1');
      expect(updated?.players[0].isConnected).toBe(true);
    });
  });
});
