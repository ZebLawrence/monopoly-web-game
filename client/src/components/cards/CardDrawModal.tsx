'use client';

import React, { useState, useEffect } from 'react';
import type { Card, DeckType } from '@monopoly/shared';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import styles from './CardDrawModal.module.css';

export interface CardDrawModalProps {
  card: Card;
  onDismiss: () => void;
}

function getEffectDescription(card: Card): string {
  const effect = card.effect;
  switch (effect.type) {
    case 'cash':
      return effect.amount >= 0
        ? `Receive $${effect.amount.toLocaleString()}`
        : `Pay $${Math.abs(effect.amount).toLocaleString()}`;
    case 'move':
      return `Move to space ${effect.position}`;
    case 'moveBack':
      return `Move back ${effect.spaces} spaces`;
    case 'jail':
      return 'Go directly to Jail';
    case 'collectFromAll':
      return `Collect $${effect.amount.toLocaleString()} from each player`;
    case 'payEachPlayer':
      return `Pay $${effect.amount.toLocaleString()} to each player`;
    case 'repairs':
      return `Pay $${effect.perHouse}/house, $${effect.perHotel}/hotel`;
    case 'advanceNearestRailroad':
      return 'Advance to nearest Railroad (double rent if owned)';
    case 'advanceNearestUtility':
      return 'Advance to nearest Utility (10x dice if owned)';
    case 'goojf':
      return 'Keep this card until needed';
    default:
      return '';
  }
}

function getDeckLabel(deck: DeckType): string {
  return deck === 'chance' ? 'Chance' : 'Community Chest';
}

function getDeckColor(deck: DeckType): string {
  return deck === 'chance' ? '#ff6f00' : '#1565c0';
}

export function CardDrawModal({ card, onDismiss }: CardDrawModalProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const deckLabel = getDeckLabel(card.deck);
  const deckColor = getDeckColor(card.deck);
  const effectDesc = getEffectDescription(card);

  return (
    <Modal isOpen={true} onClose={onDismiss} title={deckLabel}>
      <div className={styles.container} data-testid="card-draw-modal">
        <div
          className={`${styles.card} ${revealed ? styles.cardRevealed : styles.cardHidden}`}
          style={{ borderColor: deckColor }}
          data-testid="drawn-card"
        >
          <div className={styles.cardDeck} style={{ backgroundColor: deckColor }}>
            {deckLabel}
          </div>
          <div className={styles.cardText} data-testid="card-text">
            {card.text}
          </div>
          {effectDesc && (
            <div className={styles.cardEffect} data-testid="card-effect">
              {effectDesc}
            </div>
          )}
        </div>

        {revealed && (
          <Button variant="primary" onClick={onDismiss} data-testid="card-ok-button">
            OK
          </Button>
        )}
      </div>
    </Modal>
  );
}
