'use client';

/**
 * useSoundEffects — backward-compatible adapter over the new SoundEngine system.
 *
 * Existing code that calls `useSoundEffects()` continues to work unchanged.
 * New code should use `useSoundEngine()` from '@/sounds' directly for full control.
 *
 * @deprecated Use `useSoundEngine` from `src/sounds` for new code.
 */

import { useCallback } from 'react';
import type { GameEvent } from '@monopoly/shared';
import { GameEventType } from '@monopoly/shared';
import { useSoundEngineSafe } from '../sounds/SoundContext';
import { SoundEvent } from '../sounds/types';

// Map from legacy GameEventType to the new SoundEvent enum
const EVENT_TO_SOUND: Partial<Record<GameEventType, SoundEvent>> = {
  [GameEventType.DiceRolled]: SoundEvent.DiceRoll,
  [GameEventType.PropertyPurchased]: SoundEvent.BuyProperty,
  [GameEventType.RentPaid]: SoundEvent.PayRent,
  [GameEventType.CardDrawn]: SoundEvent.CardDraw,
  [GameEventType.PlayerBankrupt]: SoundEvent.Bankruptcy,
  [GameEventType.GameEnded]: SoundEvent.Victory,
  [GameEventType.TradeCompleted]: SoundEvent.TradeComplete,
  [GameEventType.PassedGo]: SoundEvent.PassGo,
  [GameEventType.AuctionStarted]: SoundEvent.AuctionStart,
  [GameEventType.AuctionBid]: SoundEvent.AuctionBid,
  [GameEventType.AuctionEnded]: SoundEvent.AuctionWin,
  [GameEventType.PlayerJailed]: SoundEvent.GoToJail,
  [GameEventType.PlayerFreed]: SoundEvent.GetOutOfJail,
  [GameEventType.HouseBuilt]: SoundEvent.BuildHouse,
  [GameEventType.HotelBuilt]: SoundEvent.BuildHotel,
  [GameEventType.PropertyMortgaged]: SoundEvent.Mortgage,
  [GameEventType.PropertyUnmortgaged]: SoundEvent.Unmortgage,
  [GameEventType.TaxPaid]: SoundEvent.TaxPaid,
  [GameEventType.TurnStarted]: SoundEvent.YourTurn,
};

export function useSoundEffects() {
  const engine = useSoundEngineSafe();

  const toggleMute = useCallback(() => {
    engine?.toggleMute();
  }, [engine]);

  /** Play a sound corresponding to a raw game event. */
  const playForEvent = useCallback(
    (event: GameEvent) => {
      if (!engine) return;
      const soundEvent = EVENT_TO_SOUND[event.type];
      if (soundEvent) {
        engine.play(soundEvent);
      }
    },
    [engine],
  );

  /** Play a sound by SoundEvent key. */
  const playSound = useCallback(
    (soundEvent: SoundEvent) => {
      engine?.play(soundEvent);
    },
    [engine],
  );

  return {
    muted: engine?.muted ?? false,
    toggleMute,
    playForEvent,
    playSound,
  };
}
