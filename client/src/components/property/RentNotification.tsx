'use client';

import React, { useEffect, useState } from 'react';
import type { Player, Property, ColorGroup } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './RentNotification.module.css';

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

export interface RentBreakdownProps {
  property: Property;
  rentAmount: number;
  hasMonopoly: boolean;
}

export function RentBreakdown({ property, rentAmount, hasMonopoly }: RentBreakdownProps) {
  const baseRent = property.rentTiers[0] ?? 0;
  const isHotel = property.houses === 5;
  const houseCount = property.houses < 5 ? property.houses : 0;

  return (
    <div className={styles.breakdown} data-testid="rent-breakdown">
      {property.colorGroup && (
        <div
          className={styles.colorBand}
          style={{ backgroundColor: COLOR_GROUP_CSS[property.colorGroup] }}
        />
      )}
      <div className={styles.breakdownContent}>
        <div className={styles.propertyName}>{property.name}</div>
        {isHotel ? (
          <div className={styles.breakdownRow}>
            <span>Rent (Hotel):</span>
            <span className={styles.rentValue}>${rentAmount.toLocaleString()}</span>
          </div>
        ) : houseCount > 0 ? (
          <div className={styles.breakdownRow}>
            <span>
              Rent ({houseCount} House{houseCount > 1 ? 's' : ''}):
            </span>
            <span className={styles.rentValue}>${rentAmount.toLocaleString()}</span>
          </div>
        ) : (
          <>
            <div className={styles.breakdownRow}>
              <span>Base Rent:</span>
              <span>${baseRent.toLocaleString()}</span>
            </div>
            {hasMonopoly && (
              <div className={styles.breakdownRow}>
                <span>Monopoly Bonus (2x):</span>
                <span>+${baseRent.toLocaleString()}</span>
              </div>
            )}
            <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
              <span>Total:</span>
              <span className={styles.rentValue}>${rentAmount.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export interface RentPaymentNotificationProps {
  isOpen: boolean;
  property: Property;
  rentAmount: number;
  payer: Player;
  receiver: Player;
  hasMonopoly: boolean;
  isPayer: boolean;
  onClose: () => void;
}

export function RentPaymentNotification({
  isOpen,
  property,
  rentAmount,
  payer,
  receiver,
  hasMonopoly,
  isPayer,
  onClose,
}: RentPaymentNotificationProps) {
  const title = isPayer ? 'Rent Payment' : 'Rent Received';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.notification} data-testid="rent-notification">
        <div className={styles.message}>
          {isPayer ? (
            <span data-testid="rent-payer-message">
              You paid <strong>${rentAmount.toLocaleString()}</strong> rent to{' '}
              <strong>{receiver.name}</strong> for {property.name}
            </span>
          ) : (
            <span data-testid="rent-receiver-message">
              <strong>{payer.name}</strong> paid you <strong>${rentAmount.toLocaleString()}</strong>{' '}
              rent for {property.name}
            </span>
          )}
        </div>
        <RentBreakdown property={property} rentAmount={rentAmount} hasMonopoly={hasMonopoly} />
        <CashTransferAnimation fromName={payer.name} toName={receiver.name} amount={rentAmount} />
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </div>
    </Modal>
  );
}

export interface CashTransferAnimationProps {
  fromName: string;
  toName: string;
  amount: number;
}

export function CashTransferAnimation({ fromName, toName, amount }: CashTransferAnimationProps) {
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.transferAnimation} data-testid="cash-transfer-animation">
      <span className={styles.transferFrom}>{fromName}</span>
      <span className={`${styles.transferAmount} ${animating ? styles.transferAnimating : ''}`}>
        -${amount.toLocaleString()}
      </span>
      <span className={styles.transferArrow}>&rarr;</span>
      <span className={`${styles.transferAmount} ${animating ? styles.transferAnimating : ''}`}>
        +${amount.toLocaleString()}
      </span>
      <span className={styles.transferTo}>{toName}</span>
    </div>
  );
}

export interface InsufficientFundsWarningProps {
  isOpen: boolean;
  amountOwed: number;
  playerCash: number;
  onSellBuildings: () => void;
  onMortgage: () => void;
  onClose: () => void;
}

export function InsufficientFundsWarning({
  isOpen,
  amountOwed,
  playerCash,
  onSellBuildings,
  onMortgage,
  onClose,
}: InsufficientFundsWarningProps) {
  const shortfall = amountOwed - playerCash;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Insufficient Funds">
      <div className={styles.insufficientFunds} data-testid="insufficient-funds-warning">
        <div className={styles.warningIcon}>&#9888;&#65039;</div>
        <div className={styles.warningMessage}>
          You owe <strong>${amountOwed.toLocaleString()}</strong> but only have{' '}
          <strong>${playerCash.toLocaleString()}</strong>
        </div>
        <div className={styles.shortfallMessage}>
          You must raise <strong>${shortfall.toLocaleString()}</strong> by selling buildings or
          mortgaging properties.
        </div>
        <div className={styles.warningActions}>
          <Button variant="secondary" onClick={onSellBuildings} data-testid="sell-buildings-link">
            Sell Buildings
          </Button>
          <Button variant="secondary" onClick={onMortgage} data-testid="mortgage-link">
            Mortgage Properties
          </Button>
        </div>
      </div>
    </Modal>
  );
}
