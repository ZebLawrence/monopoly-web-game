'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Space, Player, ColorGroup } from '@monopoly/shared';
import { SpaceType } from '@monopoly/shared';
import { Button } from '../ui/Button';
import { CashDisplay } from '../ui/CashDisplay';
import { PropertyCard, RailroadCard, UtilityCard } from '../ui/PropertyCard';
import { Modal } from '../ui/Modal';
import styles from './AuctionPanel.module.css';

export interface AuctionInfo {
  propertyId: number;
  highBid: number;
  highBidderId: string | null;
  eligiblePlayers: string[];
  passedPlayers: string[];
}

export interface AuctionPanelProps {
  isOpen: boolean;
  space: Space;
  auction: AuctionInfo;
  currentPlayerId: string;
  players: Player[];
  timerSeconds?: number;
  onBid: (amount: number) => void;
  onPass: () => void;
  onClose?: () => void;
}

const BID_INCREMENTS = [1, 10, 50, 100];

export function AuctionPanel({
  isOpen,
  space,
  auction,
  currentPlayerId,
  players,
  timerSeconds,
  onBid,
  onPass,
  onClose,
}: AuctionPanelProps) {
  const [bidAmount, setBidAmount] = useState(auction.highBid + 1);
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const highBidder = auction.highBidderId
    ? players.find((p) => p.id === auction.highBidderId)
    : null;
  const hasPassed = auction.passedPlayers.includes(currentPlayerId);
  const isEligible = auction.eligiblePlayers.includes(currentPlayerId) && !hasPassed;
  const canAffordBid = currentPlayer ? currentPlayer.cash >= bidAmount : false;

  useEffect(() => {
    setBidAmount(auction.highBid + 1);
  }, [auction.highBid]);

  const handleIncrement = useCallback((increment: number) => {
    setBidAmount((prev) => prev + increment);
  }, []);

  const handleBid = useCallback(() => {
    if (canAffordBid && isEligible) {
      onBid(bidAmount);
    }
  }, [bidAmount, canAffordBid, isEligible, onBid]);

  return (
    <Modal isOpen={isOpen} onClose={onClose ?? (() => {})} title="Property Auction">
      <div className={styles.container} data-testid="auction-panel">
        <div className={styles.propertySection}>
          {space.type === SpaceType.Property && space.colorGroup && (
            <PropertyCard
              name={space.name}
              colorGroup={space.colorGroup as ColorGroup}
              cost={space.cost ?? 0}
              rentTiers={space.rentTiers ?? []}
              mortgageValue={space.mortgageValue ?? 0}
              houseCost={space.houseCost}
            />
          )}
          {space.type === SpaceType.Railroad && (
            <RailroadCard
              name={space.name}
              cost={space.cost ?? 0}
              mortgageValue={space.mortgageValue ?? 0}
            />
          )}
          {space.type === SpaceType.Utility && (
            <UtilityCard
              name={space.name}
              cost={space.cost ?? 0}
              mortgageValue={space.mortgageValue ?? 0}
            />
          )}
        </div>

        <div className={styles.auctionInfo}>
          <div className={styles.bidStatus}>
            <div className={styles.currentBid} data-testid="current-bid">
              <span className={styles.bidLabel}>Current Bid:</span>
              <span className={styles.bidAmount}>
                {auction.highBid > 0 ? `$${auction.highBid.toLocaleString()}` : 'No bids yet'}
              </span>
            </div>
            {highBidder && (
              <div className={styles.highBidder} data-testid="high-bidder">
                High Bidder: {highBidder.name}
              </div>
            )}
          </div>

          {timerSeconds !== undefined && <AuctionTimer seconds={timerSeconds} />}

          <div className={styles.biddersInfo} data-testid="bidders-info">
            {players
              .filter((p) => auction.eligiblePlayers.includes(p.id))
              .map((p) => (
                <span
                  key={p.id}
                  className={`${styles.bidderChip} ${
                    auction.passedPlayers.includes(p.id) ? styles.bidderPassed : ''
                  } ${p.id === auction.highBidderId ? styles.bidderLeading : ''}`}
                >
                  {p.name}
                  {auction.passedPlayers.includes(p.id) && ' (Passed)'}
                  {p.id === auction.highBidderId && ' (Leading)'}
                </span>
              ))}
          </div>
        </div>

        {isEligible && (
          <div className={styles.bidControls} data-testid="bid-controls">
            <div className={styles.bidInputRow}>
              <label className={styles.bidInputLabel}>Your Bid:</label>
              <div className={styles.bidInputWrapper}>
                <span className={styles.dollarSign}>$</span>
                <input
                  type="number"
                  className={styles.bidInput}
                  value={bidAmount}
                  onChange={(e) =>
                    setBidAmount(Math.max(auction.highBid + 1, Number(e.target.value)))
                  }
                  min={auction.highBid + 1}
                  max={currentPlayer?.cash ?? 0}
                  data-testid="bid-input"
                />
              </div>
            </div>

            <div className={styles.incrementButtons}>
              {BID_INCREMENTS.map((inc) => (
                <Button
                  key={inc}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleIncrement(inc)}
                  data-testid={`bid-increment-${inc}`}
                >
                  +${inc}
                </Button>
              ))}
            </div>

            {currentPlayer && (
              <div className={styles.playerCash}>
                Your Cash: <CashDisplay amount={currentPlayer.cash} />
              </div>
            )}

            <div className={styles.bidActions}>
              <Button
                variant="primary"
                onClick={handleBid}
                disabled={!canAffordBid || bidAmount <= auction.highBid}
                data-testid="place-bid-button"
              >
                Place Bid (${bidAmount.toLocaleString()})
              </Button>
              <Button variant="danger" onClick={onPass} data-testid="pass-button">
                Pass
              </Button>
            </div>
          </div>
        )}

        {hasPassed && (
          <div className={styles.passedMessage} data-testid="passed-message">
            You have passed. Waiting for other players...
          </div>
        )}
      </div>
    </Modal>
  );
}

export function AuctionTimer({ seconds }: { seconds: number }) {
  const isLow = seconds <= 5;

  return (
    <div className={`${styles.timer} ${isLow ? styles.timerLow : ''}`} data-testid="auction-timer">
      <span className={styles.timerIcon}>&#9200;</span>
      <span className={styles.timerValue}>{seconds}s</span>
    </div>
  );
}

export interface AuctionResultProps {
  isOpen: boolean;
  space: Space;
  winnerName: string | null;
  winningBid: number;
  onClose: () => void;
}

export function AuctionResult({
  isOpen,
  space,
  winnerName,
  winningBid,
  onClose,
}: AuctionResultProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auction Complete">
      <div className={styles.resultContainer} data-testid="auction-result">
        {winnerName ? (
          <div className={styles.winnerAnnouncement}>
            <div className={styles.winnerText} data-testid="auction-winner">
              {winnerName} wins the auction for ${winningBid.toLocaleString()}!
            </div>
            <div className={styles.propertyName}>{space.name}</div>
          </div>
        ) : (
          <div className={styles.noBidsMessage} data-testid="no-bids-result">
            No bids — {space.name} remains unowned
          </div>
        )}
        <Button variant="primary" onClick={onClose}>
          Continue
        </Button>
      </div>
    </Modal>
  );
}
