'use client';

/**
 * GameSoundWatcher — invisible component that converts game events into sounds.
 *
 * Mount this INSIDE <GameStateProvider> AND <SoundProvider>.
 * It reads the event stream and calls play() for each new event.
 */

import { useEffect, useRef } from 'react';
import { GameEventType, SpaceType } from '@monopoly/shared';
import type { GameEvent, GameState, ColorGroup } from '@monopoly/shared';
import { useGameState } from '../hooks/useGameState';
import { useSoundEngineSafe } from './SoundContext';
import { SoundEvent } from './types';

// ─── Color group → sound mapping ─────────────────────────────────────────────

const COLOR_SOUND: Record<ColorGroup, SoundEvent> = {
  brown: SoundEvent.LandBrown,
  lightBlue: SoundEvent.LandLightBlue,
  pink: SoundEvent.LandPink,
  orange: SoundEvent.LandOrange,
  red: SoundEvent.LandRed,
  yellow: SoundEvent.LandYellow,
  green: SoundEvent.LandGreen,
  darkBlue: SoundEvent.LandDarkBlue,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GameSoundWatcher() {
  const sound = useSoundEngineSafe();
  const { gameState, playerId } = useGameState();
  const prevLengthRef = useRef(0);

  // NOTE: The server sends full stateUpdate messages, not individual gameEvent
  // socket messages. Real events live in gameState.events, not context.events.

  useEffect(() => {
    const gameEvents = gameState?.events ?? [];

    if (!sound) {
      // Advance pointer so we don't replay a pile of old events if sound
      // becomes available later.
      prevLengthRef.current = gameEvents.length;
      return;
    }

    const newEvents = gameEvents.slice(prevLengthRef.current);
    prevLengthRef.current = gameEvents.length;

    for (const event of newEvents) {
      handleEvent(event, sound.play, gameState, playerId);
    }
  });

  return null; // Renders nothing
}

// ─── Event → Sound dispatch ───────────────────────────────────────────────────

type PlayFn = (event: SoundEvent) => void;

function handleEvent(
  event: GameEvent,
  play: PlayFn,
  gameState: GameState | null,
  localPlayerId: string | null,
) {
  switch (event.type) {
    // ── Turn ──────────────────────────────────────────────────────────────
    case GameEventType.TurnStarted: {
      const isMyTurn = event.payload.playerId === localPlayerId;
      play(isMyTurn ? SoundEvent.YourTurn : SoundEvent.OpponentTurn);
      break;
    }

    // ── Dice ──────────────────────────────────────────────────────────────
    case GameEventType.DiceRolled:
      play(SoundEvent.DiceRoll);
      break;

    // ── Movement & landing ────────────────────────────────────────────────
    case GameEventType.PlayerMoved: {
      play(SoundEvent.TokenMove); // always play the movement tick
      if (!gameState) break; // board position lookup needs game state
      const toPosition = event.payload.toPosition as number;
      const space = gameState.board.find((s) => s.position === toPosition);
      if (!space) break;

      switch (space.type) {
        case SpaceType.Property:
          play(COLOR_SOUND[space.colorGroup as ColorGroup] ?? SoundEvent.LandBrown);
          break;
        case SpaceType.Railroad:
          play(SoundEvent.LandRailroad);
          break;
        case SpaceType.Utility:
          play(SoundEvent.LandUtility);
          break;
        case SpaceType.Tax:
          play(SoundEvent.LandTax);
          break;
        case SpaceType.Chance:
          play(SoundEvent.LandChance);
          break;
        case SpaceType.CommunityChest:
          play(SoundEvent.LandCommunityChest);
          break;
        case SpaceType.Corner:
          // GO is position 0; Free Parking is position 20; Jail/Just Visiting is 10; Go To Jail is 30
          if (space.position === 0) play(SoundEvent.LandGo);
          else if (space.position === 20) play(SoundEvent.LandFreeParking);
          break;
      }
      break;
    }

    // ── Pass Go ───────────────────────────────────────────────────────────
    case GameEventType.PassedGo:
      play(SoundEvent.PassGo);
      break;

    // ── Property ──────────────────────────────────────────────────────────
    case GameEventType.PropertyPurchased:
      play(SoundEvent.BuyProperty);
      break;

    case GameEventType.RentPaid: {
      const isLocalPayer = event.payload.payerId === localPlayerId;
      play(isLocalPayer ? SoundEvent.PayRent : SoundEvent.CollectRent);
      break;
    }

    // ── Building ──────────────────────────────────────────────────────────
    case GameEventType.HouseBuilt: {
      const buildingType = event.payload.buildingType as string;
      const isSold = event.payload.action === 'sold';
      if (isSold) {
        play(SoundEvent.SellBuilding);
      } else if (buildingType === 'hotel') {
        play(SoundEvent.BuildHotel);
      } else {
        play(SoundEvent.BuildHouse);
      }
      break;
    }

    case GameEventType.HotelBuilt:
      play(SoundEvent.BuildHotel);
      break;

    // ── Mortgage ──────────────────────────────────────────────────────────
    case GameEventType.PropertyMortgaged:
      play(SoundEvent.Mortgage);
      break;

    case GameEventType.PropertyUnmortgaged:
      play(SoundEvent.Unmortgage);
      break;

    // ── Cards ─────────────────────────────────────────────────────────────
    case GameEventType.CardDrawn:
      play(SoundEvent.CardDraw);
      break;

    // ── Jail ──────────────────────────────────────────────────────────────
    case GameEventType.PlayerJailed:
      play(SoundEvent.GoToJail);
      break;

    case GameEventType.PlayerFreed:
      play(SoundEvent.GetOutOfJail);
      break;

    // ── Auction ───────────────────────────────────────────────────────────
    case GameEventType.AuctionStarted:
      play(SoundEvent.AuctionStart);
      break;

    case GameEventType.AuctionBid:
      play(SoundEvent.AuctionBid);
      break;

    case GameEventType.AuctionEnded:
      play(SoundEvent.AuctionWin);
      break;

    // ── Trade ─────────────────────────────────────────────────────────────
    case GameEventType.TradeCompleted:
      play(SoundEvent.TradeComplete);
      break;

    // ── Economy ───────────────────────────────────────────────────────────
    case GameEventType.TaxPaid:
      play(SoundEvent.TaxPaid);
      break;

    // ── End game ──────────────────────────────────────────────────────────
    case GameEventType.PlayerBankrupt:
      play(SoundEvent.Bankruptcy);
      break;

    case GameEventType.GameEnded:
      play(SoundEvent.Victory);
      break;

    // GameStarted — no sound; it's handled by the lobby transition
    case GameEventType.GameStarted:
      break;

    default:
      break;
  }
}
