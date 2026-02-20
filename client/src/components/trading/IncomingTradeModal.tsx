'use client';

import React from 'react';
import type { Player, Property, TradeOffer, ColorGroup } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './IncomingTradeModal.module.css';

const COLOR_GROUP_CSS: Record<ColorGroup, string> = {
  brown: '#8B4513',
  lightBlue: '#87CEEB',
  pink: '#D81B60',
  orange: '#FF8F00',
  red: '#D32F2F',
  yellow: '#FDD835',
  green: '#388E3C',
  darkBlue: '#1565C0',
};

export interface IncomingTradeModalProps {
  isOpen: boolean;
  trade: TradeOffer;
  proposer: Player;
  properties: Property[];
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  onClose: () => void;
}

export function IncomingTradeModal({
  isOpen,
  trade,
  proposer,
  properties,
  onAccept,
  onReject,
  onCounter,
  onClose,
}: IncomingTradeModalProps) {
  const offeredProps = trade.offeredProperties
    .map((id) => properties.find((p) => p.spaceId === id))
    .filter(Boolean) as Property[];
  const requestedProps = trade.requestedProperties
    .map((id) => properties.find((p) => p.spaceId === id))
    .filter(Boolean) as Property[];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trade Offer">
      <div className={styles.container} data-testid="incoming-trade-modal">
        <div className={styles.proposerInfo}>
          <strong>{proposer.name}</strong> wants to trade with you
        </div>

        <div className={styles.tradeColumns}>
          <div className={styles.column}>
            <div className={styles.columnTitle}>They Offer</div>
            <TradeItemsList
              propertyItems={offeredProps}
              cash={trade.offeredCash}
              cards={trade.offeredCards}
            />
          </div>

          <div className={styles.exchangeIcon}>&harr;</div>

          <div className={styles.column}>
            <div className={styles.columnTitle}>They Request</div>
            <TradeItemsList
              propertyItems={requestedProps}
              cash={trade.requestedCash}
              cards={trade.requestedCards}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onAccept} data-testid="accept-trade-button">
            Accept
          </Button>
          <Button variant="danger" onClick={onReject} data-testid="reject-trade-button">
            Reject
          </Button>
          <Button variant="secondary" onClick={onCounter} data-testid="counter-trade-button">
            Counter
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TradeItemsList({
  propertyItems,
  cash,
  cards,
}: {
  propertyItems: Property[];
  cash: number;
  cards: number;
}) {
  const hasItems = propertyItems.length > 0 || cash > 0 || cards > 0;

  return (
    <div className={styles.itemsList}>
      {!hasItems && <div className={styles.noItems}>Nothing</div>}
      {propertyItems.map((prop) => (
        <div key={prop.spaceId} className={styles.tradeItem}>
          {prop.colorGroup && (
            <span
              className={styles.itemDot}
              style={{ backgroundColor: COLOR_GROUP_CSS[prop.colorGroup] }}
            />
          )}
          <span>{prop.name}</span>
        </div>
      ))}
      {cash > 0 && (
        <div className={styles.tradeItem}>
          <span className={styles.cashIcon}>&#128176;</span>
          <span>${cash.toLocaleString()}</span>
        </div>
      )}
      {cards > 0 && (
        <div className={styles.tradeItem}>
          <span className={styles.cardIcon}>&#127183;</span>
          <span>Get Out of Jail Free &times; {cards}</span>
        </div>
      )}
    </div>
  );
}

export interface TradeNotificationProps {
  player1Name: string;
  player2Name: string;
}

export function TradeNotification({ player1Name, player2Name }: TradeNotificationProps) {
  return (
    <div className={styles.notification} data-testid="trade-notification">
      <span className={styles.notificationIcon}>&#128260;</span>
      {player1Name} traded with {player2Name}
    </div>
  );
}
