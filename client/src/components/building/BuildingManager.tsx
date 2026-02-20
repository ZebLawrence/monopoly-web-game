'use client';

import React, { useState, useMemo } from 'react';
import type { Player, Property, Space, ColorGroup } from '@monopoly/shared';
import { SpaceType } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './BuildingManager.module.css';

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

export interface BuildingSupply {
  houses: number;
  hotels: number;
}

export interface BuildingManagerProps {
  isOpen: boolean;
  player: Player;
  properties: Property[];
  board: Space[];
  supply: BuildingSupply;
  onBuildHouse: (propertyId: number) => void;
  onSellBuilding: (propertyId: number) => void;
  onClose: () => void;
}

interface MonopolyGroup {
  colorGroup: ColorGroup;
  properties: Property[];
  spaces: Space[];
}

export function BuildingManager({
  isOpen,
  player,
  properties,
  board,
  supply,
  onBuildHouse,
  onSellBuilding,
  onClose,
}: BuildingManagerProps) {
  const [mode, setMode] = useState<'build' | 'sell'>('build');

  const monopolyGroups = useMemo(() => {
    const playerProps = properties.filter((p) => p.ownerId === player.id && p.type === 'street');
    const groups = new Map<ColorGroup, Property[]>();

    for (const prop of playerProps) {
      if (!prop.colorGroup) continue;
      const list = groups.get(prop.colorGroup) || [];
      list.push(prop);
      groups.set(prop.colorGroup, list);
    }

    // Filter to only monopolies (player owns all in color group)
    const result: MonopolyGroup[] = [];
    for (const [colorGroup, props] of groups.entries()) {
      const boardSpaces = board.filter(
        (s) => s.type === SpaceType.Property && s.colorGroup === colorGroup,
      );
      if (props.length === boardSpaces.length) {
        result.push({ colorGroup, properties: props, spaces: boardSpaces });
      }
    }

    return result;
  }, [player.id, properties, board]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'build' ? 'Build Houses' : 'Sell Buildings'}
    >
      <div className={styles.container} data-testid="building-manager">
        <div className={styles.modeToggle}>
          <Button
            variant={mode === 'build' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('build')}
            data-testid="build-mode-button"
          >
            Build
          </Button>
          <Button
            variant={mode === 'sell' ? 'danger' : 'ghost'}
            size="sm"
            onClick={() => setMode('sell')}
            data-testid="sell-mode-button"
          >
            Sell
          </Button>
        </div>

        <BuildingSupplyDisplay supply={supply} />

        {monopolyGroups.length === 0 ? (
          <div className={styles.noMonopolies} data-testid="no-monopolies">
            You don&apos;t own any complete color groups. You need a monopoly to build houses.
          </div>
        ) : (
          monopolyGroups.map((group) => (
            <div key={group.colorGroup} className={styles.groupSection}>
              <div
                className={styles.groupHeader}
                style={{ backgroundColor: COLOR_GROUP_CSS[group.colorGroup] }}
              >
                {group.colorGroup.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </div>
              {group.properties.map((prop) => {
                const space = group.spaces.find((s) => s.id === prop.spaceId);
                const houseCost = space?.houseCost ?? 0;

                if (mode === 'build') {
                  return (
                    <BuildPropertyRow
                      key={prop.spaceId}
                      property={prop}
                      houseCost={houseCost}
                      playerCash={player.cash}
                      supply={supply}
                      groupProperties={group.properties}
                      onBuild={() => onBuildHouse(prop.spaceId)}
                    />
                  );
                } else {
                  return (
                    <SellBuildingRow
                      key={prop.spaceId}
                      property={prop}
                      houseCost={houseCost}
                      supply={supply}
                      groupProperties={group.properties}
                      onSell={() => onSellBuilding(prop.spaceId)}
                    />
                  );
                }
              })}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

interface BuildPropertyRowProps {
  property: Property;
  houseCost: number;
  playerCash: number;
  supply: BuildingSupply;
  groupProperties: Property[];
  onBuild: () => void;
}

function BuildPropertyRow({
  property,
  houseCost,
  playerCash,
  supply,
  groupProperties,
  onBuild,
}: BuildPropertyRowProps) {
  const isHotel = property.houses === 5;
  const canBuild = canBuildOnProperty(property, houseCost, playerCash, supply, groupProperties);
  const isHotelUpgrade = property.houses === 4;

  return (
    <div className={styles.propertyRow} data-testid={`build-row-${property.spaceId}`}>
      <div className={styles.propertyInfo}>
        <span className={styles.propName}>{property.name}</span>
        <HouseIndicator houses={property.houses} />
      </div>
      <div className={styles.propertyAction}>
        {isHotel ? (
          <span className={styles.maxBuilt}>Max (Hotel)</span>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={!canBuild}
            onClick={onBuild}
            data-testid={`add-house-${property.spaceId}`}
          >
            {isHotelUpgrade ? `Build Hotel ($${houseCost})` : `Add House ($${houseCost})`}
          </Button>
        )}
      </div>
    </div>
  );
}

interface SellBuildingRowProps {
  property: Property;
  houseCost: number;
  supply: BuildingSupply;
  groupProperties: Property[];
  onSell: () => void;
}

function SellBuildingRow({
  property,
  houseCost,
  supply,
  groupProperties,
  onSell,
}: SellBuildingRowProps) {
  const refund = Math.floor(houseCost / 2);
  const canSell = canSellFromProperty(property, supply, groupProperties);

  return (
    <div className={styles.propertyRow} data-testid={`sell-row-${property.spaceId}`}>
      <div className={styles.propertyInfo}>
        <span className={styles.propName}>{property.name}</span>
        <HouseIndicator houses={property.houses} />
      </div>
      <div className={styles.propertyAction}>
        {property.houses === 0 ? (
          <span className={styles.noBuildings}>No buildings</span>
        ) : (
          <Button
            variant="danger"
            size="sm"
            disabled={!canSell}
            onClick={onSell}
            data-testid={`sell-house-${property.spaceId}`}
          >
            {property.houses === 5 ? `Sell Hotel ($${refund})` : `Sell House ($${refund})`}
          </Button>
        )}
      </div>
    </div>
  );
}

export function HouseIndicator({ houses }: { houses: number }) {
  if (houses === 0) return <span className={styles.houseCount}>No buildings</span>;
  if (houses === 5) {
    return (
      <span className={styles.hotelIndicator} data-testid="hotel-indicator">
        &#127976; Hotel
      </span>
    );
  }
  return (
    <span className={styles.houseCount} data-testid="house-indicator">
      {'\u{1F3E0}'.repeat(houses)} {houses} House{houses > 1 ? 's' : ''}
    </span>
  );
}

export function BuildingSupplyDisplay({ supply }: { supply: BuildingSupply }) {
  return (
    <div className={styles.supplyDisplay} data-testid="building-supply">
      <div className={styles.supplyItem}>
        <span>&#127968;</span>
        <span>Houses: {supply.houses}/32</span>
        {supply.houses === 0 && <span className={styles.exhausted}>No houses available</span>}
      </div>
      <div className={styles.supplyItem}>
        <span>&#127976;</span>
        <span>Hotels: {supply.hotels}/12</span>
        {supply.hotels === 0 && <span className={styles.exhausted}>No hotels available</span>}
      </div>
    </div>
  );
}

function canBuildOnProperty(
  property: Property,
  houseCost: number,
  playerCash: number,
  supply: BuildingSupply,
  groupProperties: Property[],
): boolean {
  if (property.houses >= 5) return false;
  if (property.mortgaged) return false;
  if (playerCash < houseCost) return false;

  // Check supply
  if (property.houses === 4) {
    if (supply.hotels <= 0) return false;
  } else {
    if (supply.houses <= 0) return false;
  }

  // Even-build rule: can only build if this property has <= min of group
  const minHouses = Math.min(...groupProperties.map((p) => p.houses));
  if (property.houses > minHouses) return false;

  // Can't build if any property in group is mortgaged
  if (groupProperties.some((p) => p.mortgaged)) return false;

  return true;
}

function canSellFromProperty(
  property: Property,
  supply: BuildingSupply,
  groupProperties: Property[],
): boolean {
  if (property.houses <= 0) return false;

  // Even-sell rule: can only sell if this property has >= max of group
  const maxHouses = Math.max(...groupProperties.map((p) => p.houses));
  if (property.houses < maxHouses) return false;

  // If selling a hotel, need 4 houses in supply
  if (property.houses === 5 && supply.houses < 4) return false;

  return true;
}
