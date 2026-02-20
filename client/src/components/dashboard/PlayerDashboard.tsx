'use client';

import React, { useState } from 'react';
import type { Player, Property, ColorGroup } from '@monopoly/shared';
import { TokenType, TurnState } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { CashDisplay } from '../ui/CashDisplay';
import { Modal } from '../ui/Modal';
import { PropertyCard, RailroadCard, UtilityCard } from '../ui/PropertyCard';
import styles from './PlayerDashboard.module.css';

const TOKEN_ICONS: Record<string, string> = {
  [TokenType.ScottieDog]: '\u{1F415}',
  [TokenType.TopHat]: '\u{1F3A9}',
  [TokenType.RaceCar]: '\u{1F3CE}\uFE0F',
  [TokenType.Boot]: '\u{1F462}',
  [TokenType.Thimble]: '\u{1F9F5}',
  [TokenType.Iron]: '\u2668\uFE0F',
  [TokenType.Wheelbarrow]: '\u{1F6D2}',
  [TokenType.Battleship]: '\u{1F6A2}',
};

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

export interface PlayerDashboardProps {
  currentPlayer: Player;
  allPlayers: Player[];
  properties: Property[];
  turnState: TurnState;
  isCurrentPlayersTurn: boolean;
  onAction?: (action: string) => void;
}

export function PlayerDashboard({
  currentPlayer,
  allPlayers,
  properties,
  turnState,
  isCurrentPlayersTurn,
  onAction,
}: PlayerDashboardProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const ownedProperties = properties.filter((p) => p.ownerId === currentPlayer.id);
  const otherPlayers = allPlayers.filter((p) => p.id !== currentPlayer.id);

  return (
    <div
      className={styles.dashboard}
      data-testid="player-dashboard"
      role="region"
      aria-label="Player dashboard"
    >
      <TurnIndicator currentPlayer={currentPlayer} />
      <CurrentPlayerPanel player={currentPlayer} />
      <OwnedPropertiesList properties={ownedProperties} onPropertyClick={setSelectedProperty} />
      <HeldCardsDisplay count={currentPlayer.getOutOfJailFreeCards} />
      <OtherPlayersSummary players={otherPlayers} properties={properties} />
      <ActionButtonBar
        turnState={turnState}
        isCurrentPlayersTurn={isCurrentPlayersTurn}
        onAction={onAction}
      />

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          owner={allPlayers.find((p) => p.id === selectedProperty.ownerId)}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

export function CurrentPlayerPanel({ player }: { player: Player }) {
  return (
    <div className={styles.currentPlayer} data-testid="current-player-panel">
      <span className={styles.tokenIcon}>{TOKEN_ICONS[player.token] || '\u26AB'}</span>
      <div className={styles.playerInfo}>
        <div className={styles.playerName}>{player.name}</div>
        <div className={styles.playerCash}>
          <CashDisplay amount={player.cash} />
        </div>
      </div>
    </div>
  );
}

export function OwnedPropertiesList({
  properties,
  onPropertyClick,
}: {
  properties: Property[];
  onPropertyClick: (prop: Property) => void;
}) {
  if (properties.length === 0) return null;

  // Group by color
  const groups = new Map<string, Property[]>();
  for (const prop of properties) {
    const key = prop.colorGroup || prop.type;
    const list = groups.get(key) || [];
    list.push(prop);
    groups.set(key, list);
  }

  return (
    <div className={styles.propertiesSection} data-testid="owned-properties">
      <div className={styles.sectionTitle}>Properties</div>
      {Array.from(groups.entries()).map(([group, props]) => (
        <div key={group} className={styles.colorGroupRow}>
          {props.map((prop) => (
            <button
              key={prop.spaceId}
              className={`${styles.propertyChip} ${prop.mortgaged ? styles.propertyChipMortgaged : ''}`}
              style={{
                backgroundColor: prop.colorGroup ? COLOR_GROUP_CSS[prop.colorGroup] : '#666',
              }}
              onClick={() => onPropertyClick(prop)}
            >
              {prop.name}
              {prop.houses > 0 && prop.houses < 5 && ` (${prop.houses}H)`}
              {prop.houses === 5 && ' (Hotel)'}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HeldCardsDisplay({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className={styles.cardsSection} data-testid="held-cards">
      <span className={styles.cardBadge}>Get Out of Jail Free &times; {count}</span>
    </div>
  );
}

export function OtherPlayersSummary({
  players,
  properties,
}: {
  players: Player[];
  properties: Property[];
}) {
  return (
    <div
      className={styles.otherPlayers}
      data-testid="other-players"
      role="list"
      aria-label="Other players"
    >
      <div className={styles.sectionTitle}>Other Players</div>
      {players.map((player) => {
        const propertyCount = properties.filter((p) => p.ownerId === player.id).length;
        return (
          <div
            key={player.id}
            className={`${styles.otherPlayer} ${player.isBankrupt ? styles.otherPlayerEliminated : ''}`}
            role="listitem"
            aria-label={`${player.name}${player.isBankrupt ? ' - Bankrupt' : ''}`}
          >
            <span className={styles.otherPlayerToken} aria-hidden="true">
              {TOKEN_ICONS[player.token] || '\u26AB'}
            </span>
            <div className={styles.otherPlayerInfo}>
              <span className={styles.otherPlayerName}>
                {player.name}
                {player.isBankrupt && ' (Bankrupt)'}
              </span>
              <span className={styles.otherPlayerStats}>
                <span>${player.cash.toLocaleString()}</span>
                <span>{propertyCount} props</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ActionButtonBarProps {
  turnState: TurnState;
  isCurrentPlayersTurn: boolean;
  onAction?: (action: string) => void;
}

export function ActionButtonBar({
  turnState,
  isCurrentPlayersTurn,
  onAction,
}: ActionButtonBarProps) {
  const actions = [
    { id: 'rollDice', label: 'Roll Dice', enabledStates: [TurnState.WaitingForRoll] },
    { id: 'buy', label: 'Buy', enabledStates: [TurnState.AwaitingBuyDecision] },
    { id: 'build', label: 'Build', enabledStates: [TurnState.PlayerAction] },
    { id: 'mortgage', label: 'Mortgage', enabledStates: [TurnState.PlayerAction] },
    { id: 'trade', label: 'Trade', enabledStates: [TurnState.PlayerAction] },
    {
      id: 'endTurn',
      label: 'End Turn',
      enabledStates: [TurnState.PlayerAction, TurnState.EndTurn],
    },
  ];

  return (
    <div className={styles.actionBar} data-testid="action-bar">
      {actions.map((action) => {
        const isEnabled = isCurrentPlayersTurn && action.enabledStates.includes(turnState);
        return (
          <Button
            key={action.id}
            variant={action.id === 'rollDice' ? 'primary' : 'ghost'}
            size="sm"
            className={styles.actionButton}
            disabled={!isEnabled}
            onClick={() => onAction?.(action.id)}
            data-testid={`action-${action.id}`}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

export function TurnIndicator({ currentPlayer }: { currentPlayer: Player }) {
  return (
    <div className={styles.turnIndicator} data-testid="turn-indicator">
      <span className={styles.turnToken}>{TOKEN_ICONS[currentPlayer.token] || '\u26AB'}</span>
      <span>{currentPlayer.name}&apos;s Turn</span>
    </div>
  );
}

interface PropertyDetailModalProps {
  property: Property;
  owner?: Player;
  onClose: () => void;
}

export function PropertyDetailModal({ property, owner, onClose }: PropertyDetailModalProps) {
  const title = property.name;

  return (
    <Modal isOpen={true} onClose={onClose} title={title}>
      <div className={styles.propertyDetail} data-testid="property-detail-modal">
        {property.type === 'street' && property.colorGroup && (
          <PropertyCard
            name={property.name}
            colorGroup={property.colorGroup}
            cost={property.cost}
            rentTiers={property.rentTiers}
            mortgageValue={property.cost / 2}
            houseCost={property.cost <= 200 ? 50 : property.cost <= 300 ? 100 : 200}
          />
        )}
        {property.type === 'railroad' && (
          <RailroadCard name={property.name} cost={property.cost} mortgageValue={100} />
        )}
        {property.type === 'utility' && (
          <UtilityCard name={property.name} cost={property.cost} mortgageValue={75} />
        )}
        <div className={styles.propertyStatus}>
          {owner && (
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}
            >
              Owner: {owner.name}
            </span>
          )}
          {property.mortgaged && (
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: '#fce4ec', color: '#c62828' }}
            >
              Mortgaged
            </span>
          )}
          {property.houses > 0 && property.houses < 5 && (
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
            >
              {property.houses} House{property.houses > 1 ? 's' : ''}
            </span>
          )}
          {property.houses === 5 && (
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: '#fce4ec', color: '#c62828' }}
            >
              Hotel
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
