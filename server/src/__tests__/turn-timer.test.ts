import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startTurnTimer,
  stopTurnTimer,
  pauseTurnTimer,
  resumeTurnTimer,
  getTimerRemaining,
  isTimerPaused,
  shouldPauseForState,
  clearAllTimers,
} from '../game/turn-timer';
import { TurnState } from '@monopoly/shared';

// Mock IO
function createMockIO() {
  const emitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: emitFn })),
    emit: emitFn,
    _emitFn: emitFn,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('Turn Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllTimers();
  });

  afterEach(() => {
    clearAllTimers();
    vi.useRealTimers();
  });

  it('should start a timer with correct duration', () => {
    const io = createMockIO();
    const onTimeout = vi.fn();

    startTurnTimer('ROOM1', 30, 'WaitingForRoll', io, onTimeout);

    expect(getTimerRemaining('ROOM1')).toBe(30);
  });

  it('should count down every second', () => {
    const io = createMockIO();
    const onTimeout = vi.fn();

    startTurnTimer('ROOM1', 30, 'WaitingForRoll', io, onTimeout);

    vi.advanceTimersByTime(5000);
    expect(getTimerRemaining('ROOM1')).toBe(25);
  });

  it('should broadcast timer updates', () => {
    const io = createMockIO();
    const onTimeout = vi.fn();

    startTurnTimer('ROOM1', 30, 'WaitingForRoll', io, onTimeout);

    vi.advanceTimersByTime(1000);
    expect(io.to).toHaveBeenCalledWith('ROOM1');
    expect(io._emitFn).toHaveBeenCalledWith('turnTimerUpdate', {
      secondsRemaining: 29,
      phase: 'WaitingForRoll',
    });
  });

  it('should call onTimeout when timer reaches 0', () => {
    const io = createMockIO();
    const onTimeout = vi.fn();

    startTurnTimer('ROOM1', 5, 'WaitingForRoll', io, onTimeout);

    vi.advanceTimersByTime(5000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('should stop timer', () => {
    const io = createMockIO();
    const onTimeout = vi.fn();

    startTurnTimer('ROOM1', 30, 'WaitingForRoll', io, onTimeout);
    stopTurnTimer('ROOM1');

    expect(getTimerRemaining('ROOM1')).toBeNull();
    vi.advanceTimersByTime(31000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('should pause and resume timer', () => {
    const io = createMockIO();
    const onTimeout = vi.fn();

    startTurnTimer('ROOM1', 30, 'WaitingForRoll', io, onTimeout);

    vi.advanceTimersByTime(5000);
    expect(getTimerRemaining('ROOM1')).toBe(25);

    pauseTurnTimer('ROOM1');
    expect(isTimerPaused('ROOM1')).toBe(true);

    // Timer shouldn't count down while paused
    vi.advanceTimersByTime(5000);
    expect(getTimerRemaining('ROOM1')).toBe(25);

    resumeTurnTimer('ROOM1');
    expect(isTimerPaused('ROOM1')).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(getTimerRemaining('ROOM1')).toBe(20);
  });

  it('should replace existing timer on restart', () => {
    const io = createMockIO();
    const onTimeout1 = vi.fn();
    const onTimeout2 = vi.fn();

    startTurnTimer('ROOM1', 30, 'WaitingForRoll', io, onTimeout1);
    startTurnTimer('ROOM1', 60, 'PlayerAction', io, onTimeout2);

    expect(getTimerRemaining('ROOM1')).toBe(60);
    vi.advanceTimersByTime(30000);
    expect(onTimeout1).not.toHaveBeenCalled();
  });

  describe('shouldPauseForState', () => {
    it('should pause for Auction', () => {
      expect(shouldPauseForState(TurnState.Auction)).toBe(true);
    });

    it('should pause for TradeNegotiation', () => {
      expect(shouldPauseForState(TurnState.TradeNegotiation)).toBe(true);
    });

    it('should not pause for WaitingForRoll', () => {
      expect(shouldPauseForState(TurnState.WaitingForRoll)).toBe(false);
    });

    it('should not pause for PlayerAction', () => {
      expect(shouldPauseForState(TurnState.PlayerAction)).toBe(false);
    });
  });
});
