'use client';

import React, { useRef, useEffect } from 'react';
import type { GameEvent, Player } from '@monopoly/shared';
import { GameEventType } from '@monopoly/shared';
import styles from './ActivityFeed.module.css';

export interface ActivityFeedProps {
  events: GameEvent[];
  players: Player[];
}

function getPlayerName(players: Player[], playerId: string): string {
  return players.find((p) => p.id === playerId)?.name ?? 'Unknown';
}

const EVENT_ICONS: Partial<Record<GameEventType, string>> = {
  [GameEventType.DiceRolled]: '\u{1F3B2}',
  [GameEventType.PlayerMoved]: '\u{1F9F3}',
  [GameEventType.PropertyPurchased]: '\u{1F3E0}',
  [GameEventType.RentPaid]: '\u{1F4B0}',
  [GameEventType.CardDrawn]: '\u{1F0CF}',
  [GameEventType.PlayerJailed]: '\u{1F6D1}',
  [GameEventType.PlayerFreed]: '\u{1F513}',
  [GameEventType.HouseBuilt]: '\u{1F3D7}\uFE0F',
  [GameEventType.HotelBuilt]: '\u{1F3E8}',
  [GameEventType.PropertyMortgaged]: '\u{1F4C4}',
  [GameEventType.TradeCompleted]: '\u{1F91D}',
  [GameEventType.PlayerBankrupt]: '\u{1F4A5}',
  [GameEventType.GameEnded]: '\u{1F3C6}',
  [GameEventType.PassedGo]: '\u27A1\uFE0F',
  [GameEventType.TaxPaid]: '\u{1F4B8}',
  [GameEventType.AuctionStarted]: '\u{1F4E2}',
  [GameEventType.GameStarted]: '\u{1F389}',
  [GameEventType.TurnStarted]: '\u{1F504}',
};

function formatEventMessage(event: GameEvent, players: Player[]): string {
  const p = event.payload;
  const playerId = (p.playerId as string) ?? '';
  const name = playerId ? getPlayerName(players, playerId) : '';

  switch (event.type) {
    case GameEventType.DiceRolled:
      return `${name} rolled ${p.total} (${p.die1}+${p.die2})${p.isDoubles ? ' - Doubles!' : ''}`;
    case GameEventType.PlayerMoved:
      return `${name} moved to space ${p.toPosition}`;
    case GameEventType.PropertyPurchased:
      return `${name} bought a property for $${p.price}`;
    case GameEventType.RentPaid:
      return `${getPlayerName(players, p.payerId as string)} paid $${p.amount} rent to ${getPlayerName(players, p.receiverId as string)}`;
    case GameEventType.CardDrawn:
      return `${name} drew: "${p.cardText}"`;
    case GameEventType.PlayerJailed:
      return `${name} went to Jail!`;
    case GameEventType.PlayerFreed:
      return `${name} got out of Jail`;
    case GameEventType.TaxPaid:
      return `${name} paid $${p.amount} in tax`;
    case GameEventType.PassedGo:
      return `${name} passed Go and collected $200`;
    case GameEventType.PlayerBankrupt:
      return `${name} went bankrupt!`;
    case GameEventType.GameStarted:
      return 'Game started!';
    case GameEventType.TurnStarted:
      return `${name}'s turn`;
    case GameEventType.GameEnded:
      return 'Game over!';
    default:
      return `${event.type}`;
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ActivityFeed({ events, players }: ActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className={styles.container} data-testid="activity-feed">
      <div className={styles.header}>Activity</div>
      <div className={styles.feed} ref={feedRef} data-testid="activity-feed-list">
        {events.length === 0 && <div className={styles.empty}>No events yet</div>}
        {events.map((event) => (
          <div key={event.id} className={styles.event} data-testid="activity-feed-event">
            <span className={styles.eventIcon}>{EVENT_ICONS[event.type] ?? '\u26AA'}</span>
            <span className={styles.eventMessage}>{formatEventMessage(event, players)}</span>
            <span className={styles.eventTime}>{formatTime(event.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
