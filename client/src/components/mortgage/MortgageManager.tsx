'use client';

import React, { useState, useMemo } from 'react';
import type { Player, Property, Space, ColorGroup } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { CashDisplay } from '../ui/CashDisplay';
import { Modal } from '../ui/Modal';
import styles from './MortgageManager.module.css';

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

export interface MortgageManagerProps {
  isOpen: boolean;
  player: Player;
  properties: Property[];
  board: Space[];
  onMortgage: (propertyId: number) => void;
  onUnmortgage: (propertyId: number) => void;
  onClose: () => void;
}

export function MortgageManager({
  isOpen,
  player,
  properties,
  board,
  onMortgage,
  onUnmortgage,
  onClose,
}: MortgageManagerProps) {
  const [mode, setMode] = useState<'mortgage' | 'unmortgage'>('mortgage');

  const playerProps = useMemo(
    () => properties.filter((p) => p.ownerId === player.id),
    [properties, player.id],
  );

  const mortgageable = useMemo(() => {
    return playerProps.filter((prop) => {
      if (prop.mortgaged) return false;
      // Check if any property in color group has buildings
      if (prop.colorGroup) {
        const groupProps = properties.filter(
          (p) => p.colorGroup === prop.colorGroup && p.ownerId === player.id,
        );
        if (groupProps.some((p) => p.houses > 0)) return false;
      }
      return true;
    });
  }, [playerProps, properties, player.id]);

  const unmortgageable = useMemo(() => playerProps.filter((p) => p.mortgaged), [playerProps]);

  const displayProps = mode === 'mortgage' ? mortgageable : unmortgageable;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'mortgage' ? 'Mortgage Properties' : 'Unmortgage Properties'}
    >
      <div className={styles.container} data-testid="mortgage-manager">
        <div className={styles.modeToggle}>
          <Button
            variant={mode === 'mortgage' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('mortgage')}
            data-testid="mortgage-mode-button"
          >
            Mortgage
          </Button>
          <Button
            variant={mode === 'unmortgage' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('unmortgage')}
            data-testid="unmortgage-mode-button"
          >
            Unmortgage
          </Button>
        </div>

        <div className={styles.cashInfo}>
          Your Cash: <CashDisplay amount={player.cash} />
        </div>

        {displayProps.length === 0 ? (
          <div className={styles.emptyMessage} data-testid="no-properties-message">
            {mode === 'mortgage'
              ? 'No properties available to mortgage. Properties with buildings in their color group must have buildings sold first.'
              : 'No mortgaged properties to unmortgage.'}
          </div>
        ) : (
          <div className={styles.propertyList}>
            {displayProps.map((prop) => {
              const space = board.find((s) => s.id === prop.spaceId);
              const mortgageValue = space?.mortgageValue ?? Math.floor(prop.cost / 2);

              if (mode === 'mortgage') {
                return (
                  <MortgagePropertyRow
                    key={prop.spaceId}
                    property={prop}
                    mortgageValue={mortgageValue}
                    onMortgage={() => onMortgage(prop.spaceId)}
                  />
                );
              } else {
                const interest = Math.ceil(mortgageValue * 0.1);
                const totalCost = mortgageValue + interest;
                return (
                  <UnmortgagePropertyRow
                    key={prop.spaceId}
                    property={prop}
                    mortgageValue={mortgageValue}
                    interest={interest}
                    totalCost={totalCost}
                    canAfford={player.cash >= totalCost}
                    onUnmortgage={() => onUnmortgage(prop.spaceId)}
                  />
                );
              }
            })}
          </div>
        )}

        {/* Show properties that can't be mortgaged due to buildings */}
        {mode === 'mortgage' && (
          <BlockedProperties
            properties={playerProps}
            allProperties={properties}
            playerId={player.id}
          />
        )}
      </div>
    </Modal>
  );
}

interface MortgagePropertyRowProps {
  property: Property;
  mortgageValue: number;
  onMortgage: () => void;
}

function MortgagePropertyRow({ property, mortgageValue, onMortgage }: MortgagePropertyRowProps) {
  return (
    <div className={styles.propertyRow} data-testid={`mortgage-row-${property.spaceId}`}>
      <div className={styles.propertyInfo}>
        {property.colorGroup && (
          <span
            className={styles.colorDot}
            style={{ backgroundColor: COLOR_GROUP_CSS[property.colorGroup] }}
          />
        )}
        <span className={styles.propName}>{property.name}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onMortgage}
        data-testid={`mortgage-button-${property.spaceId}`}
      >
        Mortgage for ${mortgageValue}
      </Button>
    </div>
  );
}

interface UnmortgagePropertyRowProps {
  property: Property;
  mortgageValue: number;
  interest: number;
  totalCost: number;
  canAfford: boolean;
  onUnmortgage: () => void;
}

function UnmortgagePropertyRow({
  property,
  mortgageValue,
  interest,
  totalCost,
  canAfford,
  onUnmortgage,
}: UnmortgagePropertyRowProps) {
  return (
    <div className={styles.propertyRow} data-testid={`unmortgage-row-${property.spaceId}`}>
      <div className={styles.propertyInfo}>
        {property.colorGroup && (
          <span
            className={styles.colorDot}
            style={{ backgroundColor: COLOR_GROUP_CSS[property.colorGroup] }}
          />
        )}
        <div className={styles.propDetails}>
          <span className={`${styles.propName} ${styles.mortgagedName}`}>{property.name}</span>
          <span className={styles.costBreakdown}>
            ${mortgageValue} + ${interest} interest = ${totalCost}
          </span>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        disabled={!canAfford}
        onClick={onUnmortgage}
        title={canAfford ? undefined : `Need $${totalCost} to unmortgage`}
        data-testid={`unmortgage-button-${property.spaceId}`}
      >
        Unmortgage for ${totalCost}
      </Button>
    </div>
  );
}

function BlockedProperties({
  properties,
  allProperties,
  playerId,
}: {
  properties: Property[];
  allProperties: Property[];
  playerId: string;
}) {
  const blocked = properties.filter((prop) => {
    if (prop.mortgaged) return false;
    if (!prop.colorGroup) return false;
    const groupProps = allProperties.filter(
      (p) => p.colorGroup === prop.colorGroup && p.ownerId === playerId,
    );
    return groupProps.some((p) => p.houses > 0);
  });

  if (blocked.length === 0) return null;

  return (
    <div className={styles.blockedSection} data-testid="blocked-properties">
      <div className={styles.blockedTitle}>Cannot Mortgage (Buildings in Color Group)</div>
      {blocked.map((prop) => (
        <div key={prop.spaceId} className={styles.blockedRow}>
          {prop.colorGroup && (
            <span
              className={styles.colorDot}
              style={{ backgroundColor: COLOR_GROUP_CSS[prop.colorGroup] }}
            />
          )}
          <span className={styles.propName}>{prop.name}</span>
          <span className={styles.blockedReason}>Sell buildings first</span>
        </div>
      ))}
    </div>
  );
}
