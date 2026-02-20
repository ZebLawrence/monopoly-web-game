import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleDisconnect,
  handleReconnect,
  isDisconnected,
  clearAllDisconnectTimers,
} from '../game/reconnection';
import { InMemoryRedisClient } from '../redis/client';
import type { RoomMetadata } from '@monopoly/shared';

function createMockIO() {
  const emitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: emitFn })),
    emit: emitFn,
    _emitFn: emitFn,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('Reconnection', () => {
  let redis: InMemoryRedisClient;
  let io: ReturnType<typeof createMockIO>;

  const testRoom: RoomMetadata = {
    roomCode: 'ROOM1',
    hostId: 'player-1',
    players: [
      { id: 'player-1', name: 'Alice', isReady: true, isHost: true, isConnected: true },
      { id: 'player-2', name: 'Bob', isReady: true, isHost: false, isConnected: true },
    ],
    maxPlayers: 6,
    startingCash: 1500,
    status: 'playing',
    createdAt: Date.now(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    redis = new InMemoryRedisClient();
    io = createMockIO();
    await redis.saveRoomMetadata('ROOM1', testRoom);
  });

  afterEach(() => {
    clearAllDisconnectTimers();
    vi.useRealTimers();
  });

  it('should mark player as disconnected', () => {
    handleDisconnect(io, redis, 'ROOM1', 'player-2');
    expect(isDisconnected('player-2')).toBe(true);
  });

  it('should notify other players of disconnect', async () => {
    handleDisconnect(io, redis, 'ROOM1', 'player-2');

    // Wait for async markPlayerDisconnected
    await vi.advanceTimersByTimeAsync(10);

    expect(io.to).toHaveBeenCalledWith('ROOM1');
    expect(io._emitFn).toHaveBeenCalledWith('playerDisconnected', { playerId: 'player-2' });
  });

  it('should handle reconnect within grace period', () => {
    handleDisconnect(io, redis, 'ROOM1', 'player-2');
    expect(isDisconnected('player-2')).toBe(true);

    const result = handleReconnect('player-2');
    expect(result).toBe(true);
    expect(isDisconnected('player-2')).toBe(false);
  });

  it('should call onPermanentDisconnect after grace period', async () => {
    const onPermanent = vi.fn();
    handleDisconnect(io, redis, 'ROOM1', 'player-2', {
      gracePeriodSeconds: 5,
      onPermanentDisconnect: onPermanent,
    });

    await vi.advanceTimersByTimeAsync(6000);

    expect(onPermanent).toHaveBeenCalledWith('ROOM1', 'player-2');
    expect(isDisconnected('player-2')).toBe(false);
  });

  it('should not fire permanent disconnect if reconnected', async () => {
    const onPermanent = vi.fn();
    handleDisconnect(io, redis, 'ROOM1', 'player-2', {
      gracePeriodSeconds: 5,
      onPermanentDisconnect: onPermanent,
    });

    // Reconnect within grace period
    handleReconnect('player-2');

    await vi.advanceTimersByTimeAsync(6000);

    expect(onPermanent).not.toHaveBeenCalled();
  });

  it('should use default 120s grace period', () => {
    handleDisconnect(io, redis, 'ROOM1', 'player-2');
    expect(isDisconnected('player-2')).toBe(true);

    // After 119s, still disconnected
    vi.advanceTimersByTime(119000);
    expect(isDisconnected('player-2')).toBe(true);
  });
});
