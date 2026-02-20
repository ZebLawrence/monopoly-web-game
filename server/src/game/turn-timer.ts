import { TurnState } from '@monopoly/shared';
import type { AppIO } from '../index';

export interface TurnTimerConfig {
  durationSeconds: number;
  onTimeout: (roomCode: string) => void;
}

interface ActiveTimer {
  roomCode: string;
  secondsRemaining: number;
  intervalId: ReturnType<typeof setInterval>;
  paused: boolean;
  phase: string;
}

const activeTimers = new Map<string, ActiveTimer>();

export function startTurnTimer(
  roomCode: string,
  durationSeconds: number,
  phase: string,
  io: AppIO,
  onTimeout: () => void,
): void {
  // Clear any existing timer for this room
  stopTurnTimer(roomCode);

  const timer: ActiveTimer = {
    roomCode,
    secondsRemaining: durationSeconds,
    paused: false,
    phase,
    intervalId: setInterval(() => {
      if (timer.paused) return;

      timer.secondsRemaining--;

      // Broadcast remaining time
      io.to(roomCode).emit('turnTimerUpdate', {
        secondsRemaining: timer.secondsRemaining,
        phase: timer.phase,
      });

      if (timer.secondsRemaining <= 0) {
        stopTurnTimer(roomCode);
        onTimeout();
      }
    }, 1000),
  };

  activeTimers.set(roomCode, timer);
}

export function stopTurnTimer(roomCode: string): void {
  const timer = activeTimers.get(roomCode);
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(roomCode);
  }
}

export function pauseTurnTimer(roomCode: string): void {
  const timer = activeTimers.get(roomCode);
  if (timer) {
    timer.paused = true;
  }
}

export function resumeTurnTimer(roomCode: string): void {
  const timer = activeTimers.get(roomCode);
  if (timer) {
    timer.paused = false;
  }
}

export function getTimerRemaining(roomCode: string): number | null {
  const timer = activeTimers.get(roomCode);
  if (!timer) return null;
  return timer.secondsRemaining;
}

export function isTimerPaused(roomCode: string): boolean {
  const timer = activeTimers.get(roomCode);
  return timer?.paused ?? false;
}

export function shouldPauseForState(turnState: TurnState): boolean {
  return turnState === TurnState.Auction || turnState === TurnState.TradeNegotiation;
}

export function clearAllTimers(): void {
  for (const timer of activeTimers.values()) {
    clearInterval(timer.intervalId);
  }
  activeTimers.clear();
}
