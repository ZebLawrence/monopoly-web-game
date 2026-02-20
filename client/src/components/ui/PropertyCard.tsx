import React from 'react';
import type { ColorGroup } from '@monopoly/shared';
import styles from './PropertyCard.module.css';

const COLOR_GROUP_MAP: Record<ColorGroup, string> = {
  brown: '#8B4513',
  lightBlue: '#87CEEB',
  pink: '#D81B60',
  orange: '#FF8F00',
  red: '#D32F2F',
  yellow: '#FDD835',
  green: '#388E3C',
  darkBlue: '#1565C0',
};

export interface PropertyCardProps {
  name: string;
  colorGroup: ColorGroup;
  cost: number;
  rentTiers: number[];
  mortgageValue: number;
  houseCost?: number;
  hotelCost?: number;
}

export function PropertyCard({
  name,
  colorGroup,
  cost,
  rentTiers,
  mortgageValue,
  houseCost,
  hotelCost,
}: PropertyCardProps) {
  const bgColor = COLOR_GROUP_MAP[colorGroup];
  const rentLabels = [
    'Rent',
    'With 1 House',
    'With 2 Houses',
    'With 3 Houses',
    'With 4 Houses',
    'With Hotel',
  ];

  return (
    <div className={styles.card} data-testid="property-card">
      <div
        className={styles.colorBand}
        style={{ backgroundColor: bgColor }}
        data-testid="color-band"
      />
      <div className={styles.cardBody}>
        <div className={styles.titleDeed}>Title Deed</div>
        <div className={styles.name}>{name}</div>
        <hr className={styles.divider} />
        <div className={styles.rentTable}>
          {rentTiers.map((rent, i) => (
            <div className={styles.rentRow} key={i}>
              <span className={styles.rentLabel}>{rentLabels[i]}</span>
              <span className={styles.rentValue}>${rent}</span>
            </div>
          ))}
        </div>
        {houseCost && (
          <div className={styles.buildCost}>
            Houses cost ${houseCost} each{hotelCost ? ` / Hotel costs $${hotelCost}` : ''}
          </div>
        )}
        <div className={styles.mortgage}>Mortgage Value: ${mortgageValue}</div>
        <div className={styles.mortgage}>Cost: ${cost}</div>
      </div>
    </div>
  );
}

export interface RailroadCardProps {
  name: string;
  cost: number;
  mortgageValue: number;
}

export function RailroadCard({ name, cost, mortgageValue }: RailroadCardProps) {
  return (
    <div className={styles.card} data-testid="railroad-card">
      <div className={styles.cardBody}>
        <div className={styles.railroadIcon}>&#128646;</div>
        <div className={styles.titleDeed}>Title Deed</div>
        <div className={styles.name}>{name}</div>
        <hr className={styles.divider} />
        <div className={styles.rentTable}>
          <div className={styles.rentRow}>
            <span className={styles.rentLabel}>1 Railroad owned</span>
            <span className={styles.rentValue}>$25</span>
          </div>
          <div className={styles.rentRow}>
            <span className={styles.rentLabel}>2 Railroads owned</span>
            <span className={styles.rentValue}>$50</span>
          </div>
          <div className={styles.rentRow}>
            <span className={styles.rentLabel}>3 Railroads owned</span>
            <span className={styles.rentValue}>$100</span>
          </div>
          <div className={styles.rentRow}>
            <span className={styles.rentLabel}>4 Railroads owned</span>
            <span className={styles.rentValue}>$200</span>
          </div>
        </div>
        <div className={styles.mortgage}>Mortgage Value: ${mortgageValue}</div>
        <div className={styles.mortgage}>Cost: ${cost}</div>
      </div>
    </div>
  );
}

export interface UtilityCardProps {
  name: string;
  cost: number;
  mortgageValue: number;
}

export function UtilityCard({ name, cost, mortgageValue }: UtilityCardProps) {
  const isElectric = name.toLowerCase().includes('electric');
  return (
    <div className={styles.card} data-testid="utility-card">
      <div className={styles.cardBody}>
        <div className={styles.utilityIcon}>{isElectric ? '\u{1F4A1}' : '\u{1F4A7}'}</div>
        <div className={styles.titleDeed}>Title Deed</div>
        <div className={styles.name}>{name}</div>
        <hr className={styles.divider} />
        <div className={styles.rulesText}>
          If one utility is owned, rent is <strong>4 times</strong> the amount shown on dice.
        </div>
        <div className={styles.rulesText}>
          If both utilities are owned, rent is <strong>10 times</strong> the amount shown on dice.
        </div>
        <div className={styles.mortgage}>Mortgage Value: ${mortgageValue}</div>
        <div className={styles.mortgage}>Cost: ${cost}</div>
      </div>
    </div>
  );
}
