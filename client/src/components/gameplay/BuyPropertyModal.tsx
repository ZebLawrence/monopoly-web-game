'use client';

import React from 'react';
import type { PendingBuyDecision, Space } from '@monopoly/shared';
import { SpaceType } from '@monopoly/shared';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PropertyCard, RailroadCard, UtilityCard } from '../ui/PropertyCard';
import styles from './BuyPropertyModal.module.css';

export interface BuyPropertyModalProps {
  decision: PendingBuyDecision;
  space: Space | undefined;
  playerCash: number;
  onBuy: () => void;
  onAuction: () => void;
}

export function BuyPropertyModal({
  decision,
  space,
  playerCash,
  onBuy,
  onAuction,
}: BuyPropertyModalProps) {
  const canAfford = playerCash >= decision.cost;

  return (
    <Modal isOpen={true} onClose={onAuction} title="Unowned Property">
      <div className={styles.container} data-testid="buy-property-modal">
        <div className={styles.propertyPreview}>
          {space?.type === SpaceType.Property && space.colorGroup && (
            <PropertyCard
              name={decision.spaceName}
              colorGroup={space.colorGroup}
              cost={decision.cost}
              rentTiers={space.rentTiers ?? []}
              mortgageValue={space.mortgageValue ?? decision.cost / 2}
              houseCost={space.houseCost ?? 50}
            />
          )}
          {space?.type === SpaceType.Railroad && (
            <RailroadCard
              name={decision.spaceName}
              cost={decision.cost}
              mortgageValue={space.mortgageValue ?? 100}
            />
          )}
          {space?.type === SpaceType.Utility && (
            <UtilityCard
              name={decision.spaceName}
              cost={decision.cost}
              mortgageValue={space.mortgageValue ?? 75}
            />
          )}
        </div>

        <div className={styles.priceTag}>
          <span className={styles.priceLabel}>Price:</span>
          <span className={styles.priceValue}>${decision.cost.toLocaleString()}</span>
        </div>

        {!canAfford && (
          <div className={styles.cantAfford} data-testid="cant-afford-message">
            You don&apos;t have enough cash
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={onBuy} disabled={!canAfford} data-testid="buy-button">
            Buy (${decision.cost.toLocaleString()})
          </Button>
          <Button variant="secondary" onClick={onAuction} data-testid="auction-button">
            Auction
          </Button>
        </div>
      </div>
    </Modal>
  );
}
