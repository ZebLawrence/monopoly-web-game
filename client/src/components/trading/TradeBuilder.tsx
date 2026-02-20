'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { Player, Property, ColorGroup, TradeOfferPayload } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './TradeBuilder.module.css';

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

export interface TradeBuilderProps {
  isOpen: boolean;
  currentPlayer: Player;
  otherPlayers: Player[];
  properties: Property[];
  onSendOffer: (recipientId: string, offer: TradeOfferPayload) => void;
  onClose: () => void;
  prefilledRecipientId?: string;
  prefilledOffer?: Partial<TradeOfferPayload>;
}

type TradeStep = 'selectPlayer' | 'buildOffer';

export function TradeBuilder({
  isOpen,
  currentPlayer,
  otherPlayers,
  properties,
  onSendOffer,
  onClose,
  prefilledRecipientId,
  prefilledOffer,
}: TradeBuilderProps) {
  const [step, setStep] = useState<TradeStep>(prefilledRecipientId ? 'buildOffer' : 'selectPlayer');
  const [recipientId, setRecipientId] = useState<string | null>(prefilledRecipientId ?? null);

  // Offer state
  const [offeredProperties, setOfferedProperties] = useState<number[]>(
    prefilledOffer?.offeredProperties ?? [],
  );
  const [requestedProperties, setRequestedProperties] = useState<number[]>(
    prefilledOffer?.requestedProperties ?? [],
  );
  const [offeredCash, setOfferedCash] = useState(prefilledOffer?.offeredCash ?? 0);
  const [requestedCash, setRequestedCash] = useState(prefilledOffer?.requestedCash ?? 0);
  const [offeredCards, setOfferedCards] = useState(prefilledOffer?.offeredCards ?? 0);
  const [requestedCards, setRequestedCards] = useState(prefilledOffer?.requestedCards ?? 0);

  const recipient = otherPlayers.find((p) => p.id === recipientId);

  const myProperties = useMemo(
    () => properties.filter((p) => p.ownerId === currentPlayer.id),
    [properties, currentPlayer.id],
  );

  const theirProperties = useMemo(
    () => (recipientId ? properties.filter((p) => p.ownerId === recipientId) : []),
    [properties, recipientId],
  );

  const validationError = useMemo(() => {
    if (!recipientId) return 'Select a player to trade with';
    if (
      offeredProperties.length === 0 &&
      requestedProperties.length === 0 &&
      offeredCash === 0 &&
      requestedCash === 0 &&
      offeredCards === 0 &&
      requestedCards === 0
    ) {
      return 'Add items to the trade';
    }
    if (offeredCash > currentPlayer.cash) return 'You cannot afford the offered cash';

    // Check for buildings on offered properties
    for (const propId of offeredProperties) {
      const prop = properties.find((p) => p.spaceId === propId);
      if (prop?.colorGroup) {
        const groupProps = properties.filter(
          (p) => p.colorGroup === prop.colorGroup && p.ownerId === currentPlayer.id,
        );
        if (groupProps.some((p) => p.houses > 0)) {
          return `Remove buildings before trading ${prop.name}`;
        }
      }
    }

    // Check for buildings on requested properties
    for (const propId of requestedProperties) {
      const prop = properties.find((p) => p.spaceId === propId);
      if (prop?.colorGroup) {
        const groupProps = properties.filter(
          (p) => p.colorGroup === prop.colorGroup && p.ownerId === recipientId,
        );
        if (groupProps.some((p) => p.houses > 0)) {
          return `Cannot request ${prop.name} — buildings exist in color group`;
        }
      }
    }

    return null;
  }, [
    recipientId,
    offeredProperties,
    requestedProperties,
    offeredCash,
    requestedCash,
    offeredCards,
    requestedCards,
    currentPlayer,
    properties,
  ]);

  const handleSelectPlayer = useCallback((playerId: string) => {
    setRecipientId(playerId);
    setStep('buildOffer');
  }, []);

  const toggleProperty = useCallback((propId: number, side: 'offer' | 'request') => {
    if (side === 'offer') {
      setOfferedProperties((prev) =>
        prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId],
      );
    } else {
      setRequestedProperties((prev) =>
        prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId],
      );
    }
  }, []);

  const handleSendOffer = useCallback(() => {
    if (!recipientId || validationError) return;
    onSendOffer(recipientId, {
      offeredProperties,
      offeredCash,
      offeredCards,
      requestedProperties,
      requestedCash,
      requestedCards,
    });
  }, [
    recipientId,
    validationError,
    onSendOffer,
    offeredProperties,
    offeredCash,
    offeredCards,
    requestedProperties,
    requestedCash,
    requestedCards,
  ]);

  const handleClose = useCallback(() => {
    setStep('selectPlayer');
    setRecipientId(null);
    setOfferedProperties([]);
    setRequestedProperties([]);
    setOfferedCash(0);
    setRequestedCash(0);
    setOfferedCards(0);
    setRequestedCards(0);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Trade">
      <div className={styles.container} data-testid="trade-builder">
        {step === 'selectPlayer' && (
          <PlayerSelection players={otherPlayers} onSelect={handleSelectPlayer} />
        )}

        {step === 'buildOffer' && recipient && (
          <>
            <div className={styles.tradeHeader}>
              Trading with <strong>{recipient.name}</strong>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('selectPlayer');
                  setRecipientId(null);
                }}
              >
                Change
              </Button>
            </div>

            <div className={styles.tradeColumns}>
              <div className={styles.tradeColumn}>
                <div className={styles.columnTitle}>You Offer</div>
                <TradePropertyPicker
                  properties={myProperties}
                  selectedIds={offeredProperties}
                  allProperties={properties}
                  ownerId={currentPlayer.id}
                  onToggle={(id) => toggleProperty(id, 'offer')}
                  testIdPrefix="offer"
                />
                <TradeCashInput
                  value={offeredCash}
                  max={currentPlayer.cash}
                  onChange={setOfferedCash}
                  testId="offered-cash"
                />
                {currentPlayer.getOutOfJailFreeCards > 0 && (
                  <TradeCardToggle
                    count={offeredCards}
                    maxCards={currentPlayer.getOutOfJailFreeCards}
                    onChange={setOfferedCards}
                    testId="offered-cards"
                  />
                )}
              </div>

              <div className={styles.divider} />

              <div className={styles.tradeColumn}>
                <div className={styles.columnTitle}>You Request</div>
                <TradePropertyPicker
                  properties={theirProperties}
                  selectedIds={requestedProperties}
                  allProperties={properties}
                  ownerId={recipientId!}
                  onToggle={(id) => toggleProperty(id, 'request')}
                  testIdPrefix="request"
                />
                <TradeCashInput
                  value={requestedCash}
                  max={recipient.cash}
                  onChange={setRequestedCash}
                  testId="requested-cash"
                />
                {recipient.getOutOfJailFreeCards > 0 && (
                  <TradeCardToggle
                    count={requestedCards}
                    maxCards={recipient.getOutOfJailFreeCards}
                    onChange={setRequestedCards}
                    testId="requested-cards"
                  />
                )}
              </div>
            </div>

            {validationError && (
              <div className={styles.validationError} data-testid="trade-validation-error">
                {validationError}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleSendOffer}
              disabled={!!validationError}
              data-testid="send-offer-button"
            >
              Send Offer
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

function PlayerSelection({
  players,
  onSelect,
}: {
  players: Player[];
  onSelect: (id: string) => void;
}) {
  const activePlayers = players.filter((p) => p.isActive && !p.isBankrupt);

  return (
    <div className={styles.playerSelection} data-testid="player-selection">
      <div className={styles.selectionTitle}>Who do you want to trade with?</div>
      {activePlayers.map((player) => (
        <button
          key={player.id}
          className={styles.playerOption}
          onClick={() => onSelect(player.id)}
          data-testid={`trade-player-${player.id}`}
        >
          <span className={styles.playerName}>{player.name}</span>
          <span className={styles.playerCash}>${player.cash.toLocaleString()}</span>
          <span className={styles.playerPropCount}>{player.properties.length} props</span>
        </button>
      ))}
    </div>
  );
}

function TradePropertyPicker({
  properties,
  selectedIds,
  allProperties,
  ownerId,
  onToggle,
  testIdPrefix,
}: {
  properties: Property[];
  selectedIds: number[];
  allProperties: Property[];
  ownerId: string;
  onToggle: (id: number) => void;
  testIdPrefix: string;
}) {
  return (
    <div className={styles.propertyPicker} data-testid={`${testIdPrefix}-property-picker`}>
      {properties.length === 0 ? (
        <div className={styles.noProps}>No properties</div>
      ) : (
        properties.map((prop) => {
          const isSelected = selectedIds.includes(prop.spaceId);
          const hasBuildings =
            prop.colorGroup &&
            allProperties
              .filter((p) => p.colorGroup === prop.colorGroup && p.ownerId === ownerId)
              .some((p) => p.houses > 0);

          return (
            <button
              key={prop.spaceId}
              className={`${styles.propChip} ${isSelected ? styles.propSelected : ''} ${
                hasBuildings ? styles.propDisabled : ''
              }`}
              style={{
                borderColor: prop.colorGroup ? COLOR_GROUP_CSS[prop.colorGroup] : '#666',
              }}
              onClick={() => !hasBuildings && onToggle(prop.spaceId)}
              disabled={!!hasBuildings}
              data-testid={`${testIdPrefix}-prop-${prop.spaceId}`}
            >
              {prop.colorGroup && (
                <span
                  className={styles.chipDot}
                  style={{ backgroundColor: COLOR_GROUP_CSS[prop.colorGroup] }}
                />
              )}
              {prop.name}
              {prop.mortgaged && ' (M)'}
            </button>
          );
        })
      )}
    </div>
  );
}

function TradeCashInput({
  value,
  max,
  onChange,
  testId,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  testId: string;
}) {
  return (
    <div className={styles.cashInputRow}>
      <label className={styles.cashLabel}>Cash:</label>
      <div className={styles.cashInputWrapper}>
        <span className={styles.dollarSign}>$</span>
        <input
          type="number"
          className={styles.cashInput}
          value={value || ''}
          onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value))))}
          min={0}
          max={max}
          placeholder="0"
          data-testid={testId}
        />
      </div>
    </div>
  );
}

function TradeCardToggle({
  count,
  maxCards,
  onChange,
  testId,
}: {
  count: number;
  maxCards: number;
  onChange: (n: number) => void;
  testId: string;
}) {
  return (
    <div className={styles.cardToggle}>
      <label className={styles.cardLabel}>
        <input
          type="checkbox"
          checked={count > 0}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
          data-testid={testId}
        />
        Get Out of Jail Free Card
        {maxCards > 1 && ` (${maxCards} available)`}
      </label>
    </div>
  );
}
