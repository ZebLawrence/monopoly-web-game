'use client';

import React from 'react';
import type { Space, Player, ColorGroup } from '@monopoly/shared';
import { SpaceType } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { CashDisplay } from '../ui/CashDisplay';
import { PropertyCard, RailroadCard, UtilityCard } from '../ui/PropertyCard';
import { Modal } from '../ui/Modal';
import styles from './BuyConfirmationModal.module.css';

export interface BuyConfirmationModalProps {
  isOpen: boolean;
  space: Space;
  player: Player;
  onBuy: () => void;
  onDecline: () => void;
}

export function BuyConfirmationModal({
  isOpen,
  space,
  player,
  onBuy,
  onDecline,
}: BuyConfirmationModalProps) {
  const cost = space.cost ?? 0;
  const canAfford = player.cash >= cost;
  const cashAfterPurchase = player.cash - cost;

  return (
    <Modal isOpen={isOpen} onClose={onDecline} title="Property Available!">
      <div className={styles.container} data-testid="buy-confirmation-modal">
        <div className={styles.cardSection}>
          {space.type === SpaceType.Property && space.colorGroup && (
            <PropertyCard
              name={space.name}
              colorGroup={space.colorGroup as ColorGroup}
              cost={cost}
              rentTiers={space.rentTiers ?? []}
              mortgageValue={space.mortgageValue ?? 0}
              houseCost={space.houseCost}
            />
          )}
          {space.type === SpaceType.Railroad && (
            <RailroadCard name={space.name} cost={cost} mortgageValue={space.mortgageValue ?? 0} />
          )}
          {space.type === SpaceType.Utility && (
            <UtilityCard name={space.name} cost={cost} mortgageValue={space.mortgageValue ?? 0} />
          )}
        </div>

        <div className={styles.purchaseInfo}>
          <div className={styles.priceRow}>
            <span className={styles.label}>Price:</span>
            <span className={styles.price}>${cost.toLocaleString()}</span>
          </div>
          <div className={styles.cashRow}>
            <span className={styles.label}>Your Cash:</span>
            <CashDisplay amount={player.cash} />
          </div>
          {canAfford && (
            <div className={styles.cashRow}>
              <span className={styles.label}>After Purchase:</span>
              <span className={cashAfterPurchase < 200 ? styles.lowCash : ''}>
                ${cashAfterPurchase.toLocaleString()}
              </span>
            </div>
          )}
          {!canAfford && (
            <div className={styles.warning} data-testid="cannot-afford-warning">
              You cannot afford this property!
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onBuy} disabled={!canAfford} data-testid="buy-button">
            Buy for ${cost.toLocaleString()}
          </Button>
          <Button variant="secondary" onClick={onDecline} data-testid="decline-button">
            Decline (Auction)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
