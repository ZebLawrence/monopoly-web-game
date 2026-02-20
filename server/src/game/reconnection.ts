import type { AppIO } from '../index';
import type { RedisClient } from '../redis/client';
import * as RoomManager from './room-manager';

const DEFAULT_GRACE_PERIOD = 120; // seconds

// Track active disconnect timers
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface DisconnectHandlerOptions {
  gracePeriodSeconds?: number;
  onPermanentDisconnect?: (roomCode: string, playerId: string) => void;
}

export function handleDisconnect(
  io: AppIO,
  redis: RedisClient,
  roomCode: string,
  playerId: string,
  options: DisconnectHandlerOptions = {},
): void {
  const gracePeriod = options.gracePeriodSeconds ?? DEFAULT_GRACE_PERIOD;

  // Mark player as disconnected
  RoomManager.markPlayerDisconnected(redis, roomCode, playerId).then(() => {
    // Notify other players
    io.to(roomCode).emit('playerDisconnected', { playerId });
  });

  // Start grace period timer
  const timerId = setTimeout(async () => {
    disconnectTimers.delete(playerId);

    // Mark as permanently disconnected
    await RoomManager.removeDisconnectedPlayer(redis, roomCode, playerId);
    io.to(roomCode).emit('playerLeft', { playerId });

    options.onPermanentDisconnect?.(roomCode, playerId);
  }, gracePeriod * 1000);

  disconnectTimers.set(playerId, timerId);
}

export function handleReconnect(playerId: string): boolean {
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
    return true;
  }
  return false;
}

export function isDisconnected(playerId: string): boolean {
  return disconnectTimers.has(playerId);
}

export function cancelDisconnectTimer(playerId: string): void {
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
  }
}

export function clearAllDisconnectTimers(): void {
  for (const timer of disconnectTimers.values()) {
    clearTimeout(timer);
  }
  disconnectTimers.clear();
}
