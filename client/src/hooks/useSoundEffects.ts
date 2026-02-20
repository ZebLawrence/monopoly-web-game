'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameEvent } from '@monopoly/shared';
import { GameEventType } from '@monopoly/shared';

type SoundType = 'dice' | 'cash' | 'card' | 'notification' | 'victory' | 'bankruptcy';

// Audio context-based sound generation (no external files needed)
class SoundManager {
  private audioContext: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(type: SoundType) {
    if (this.muted) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);

      switch (type) {
        case 'dice':
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.05);
          oscillator.frequency.setValueAtTime(500, ctx.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;

        case 'cash':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;

        case 'card':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;

        case 'notification':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.35);
          break;

        case 'victory':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.7);
          break;

        case 'bankruptcy':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.5);
          break;
      }
    } catch {
      // AudioContext may not be available in all environments
    }
  }
}

const EVENT_SOUNDS: Partial<Record<GameEventType, SoundType>> = {
  [GameEventType.DiceRolled]: 'dice',
  [GameEventType.PropertyPurchased]: 'cash',
  [GameEventType.RentPaid]: 'cash',
  [GameEventType.CardDrawn]: 'card',
  [GameEventType.PlayerBankrupt]: 'bankruptcy',
  [GameEventType.GameEnded]: 'victory',
  [GameEventType.TradeCompleted]: 'notification',
  [GameEventType.PassedGo]: 'cash',
};

export function useSoundEffects() {
  const [muted, setMuted] = useState(false);
  const managerRef = useRef<SoundManager | null>(null);

  useEffect(() => {
    managerRef.current = new SoundManager();
    return () => {
      managerRef.current = null;
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const newVal = !prev;
      managerRef.current?.setMuted(newVal);
      return newVal;
    });
  }, []);

  const playForEvent = useCallback((event: GameEvent) => {
    const soundType = EVENT_SOUNDS[event.type];
    if (soundType) {
      managerRef.current?.play(soundType);
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    managerRef.current?.play(type);
  }, []);

  return { muted, toggleMute, playForEvent, playSound };
}
