'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { GameState, GameAction, Player } from '@monopoly/shared';
import { calculateLiquidationValue, getPropertyState } from '@monopoly/shared';
import styles from './BankruptcyModal.module.css';

const COLOR_CSS: Record<string, string> = {
  brown: '#8B4513',
  lightBlue: '#87CEEB',
  pink: '#D81B60',
  orange: '#FF8F00',
  red: '#D32F2F',
  yellow: '#FDD835',
  green: '#388E3C',
  darkBlue: '#1565C0',
};

export interface BankruptcyModalProps {
  gameState: GameState;
  player: Player;
  debtAmount: number;
  creditorId: string | 'bank';
  emitAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

interface SellableBuilding {
  spaceId: number;
  spaceName: string;
  colorGroup?: string;
  houses: number;
  refundPerHouse: number;
  totalRefund: number;
}

interface MortgageableProperty {
  spaceId: number;
  spaceName: string;
  colorGroup?: string;
  mortgageValue: number;
}

export function BankruptcyModal({
  gameState,
  player,
  debtAmount,
  creditorId,
  emitAction,
  onClose,
}: BankruptcyModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const sellableBuildings = useMemo((): SellableBuilding[] => {
    const items: SellableBuilding[] = [];
    for (const spaceId of player.properties) {
      const space = gameState.board.find((s) => s.id === spaceId);
      if (!space) continue;
      const propState = getPropertyState(gameState, spaceId);
      if (propState && propState.houses > 0) {
        const houseCost = space.houseCost ?? 0;
        const refundPerHouse = Math.floor(houseCost / 2);
        items.push({
          spaceId,
          spaceName: space.name,
          colorGroup: space.colorGroup,
          houses: propState.houses,
          refundPerHouse,
          totalRefund: refundPerHouse * propState.houses,
        });
      }
    }
    return items.sort((a, b) => b.totalRefund - a.totalRefund);
  }, [gameState, player.properties]);

  const mortgageableProperties = useMemo((): MortgageableProperty[] => {
    const items: MortgageableProperty[] = [];
    for (const spaceId of player.properties) {
      const space = gameState.board.find((s) => s.id === spaceId);
      if (!space) continue;
      const propState = getPropertyState(gameState, spaceId);
      if (!propState?.mortgaged && (!propState || propState.houses === 0)) {
        items.push({
          spaceId,
          spaceName: space.name,
          colorGroup: space.colorGroup,
          mortgageValue: space.mortgageValue ?? 0,
        });
      }
    }
    return items.sort((a, b) => b.mortgageValue - a.mortgageValue);
  }, [gameState, player.properties]);

  const liquidationValue = useMemo(
    () => calculateLiquidationValue(gameState, player.id),
    [gameState, player.id],
  );

  const totalAvailable = player.cash + liquidationValue;
  const remainingDebt = debtAmount - player.cash;
  const canCoverDebt = totalAvailable >= debtAmount;

  const handleSellBuilding = useCallback(
    (spaceId: number) => {
      emitAction({ type: 'SellBuilding', propertyId: spaceId, count: 1 });
    },
    [emitAction],
  );

  const handleMortgage = useCallback(
    (spaceId: number) => {
      emitAction({ type: 'MortgageProperty', propertyId: spaceId });
    },
    [emitAction],
  );

  const handleDeclareBankruptcy = useCallback(() => {
    emitAction({ type: 'DeclareBankruptcy', creditorId });
    setShowConfirm(false);
    onClose();
  }, [emitAction, creditorId, onClose]);

  const creditorName =
    creditorId === 'bank'
      ? 'the Bank'
      : (gameState.players.find((p) => p.id === creditorId)?.name ?? 'Unknown');

  return (
    <div className={styles.overlay} data-testid="bankruptcy-modal">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Bankruptcy">
        <div className={styles.header}>
          <span className={styles.headerIcon}>&#x26A0;&#xFE0F;</span>
          <div className={styles.headerText}>
            <h2>Debt Alert</h2>
            <p>You owe {creditorName}</p>
          </div>
        </div>

        <div className={styles.body}>
          {/* Debt Summary */}
          <div className={styles.debtSummary}>
            {debtAmount > 0 ? (
              <div>
                <div className={styles.debtLabel}>Amount Owed</div>
                <div className={styles.debtAmount}>${debtAmount.toLocaleString()}</div>
              </div>
            ) : (
              <div>
                <div className={styles.debtLabel}>Shortfall</div>
                <div className={styles.debtAmount}>${Math.abs(player.cash).toLocaleString()}</div>
              </div>
            )}
            <div>
              <div className={styles.debtLabel}>Your Cash</div>
              <div className={styles.cashAmount}>${player.cash.toLocaleString()}</div>
            </div>
          </div>

          {/* Remaining Debt */}
          {remainingDebt > 0 ? (
            <div className={`${styles.remainingDebt} ${styles.remainingDebtPositive}`}>
              Still need: ${remainingDebt.toLocaleString()}
            </div>
          ) : (
            <div className={`${styles.remainingDebt} ${styles.remainingDebtCleared}`}>
              You can cover this debt!
            </div>
          )}

          {/* Sellable Buildings */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Sell Buildings</div>
            {sellableBuildings.length === 0 ? (
              <div className={styles.emptyMessage}>No buildings to sell</div>
            ) : (
              sellableBuildings.map((item) => (
                <div
                  key={item.spaceId}
                  className={styles.assetItem}
                  data-testid="sellable-building"
                >
                  <div className={styles.assetInfo}>
                    <div
                      className={styles.assetColorDot}
                      style={{
                        backgroundColor: item.colorGroup ? COLOR_CSS[item.colorGroup] : '#666',
                      }}
                    />
                    <span className={styles.assetName}>
                      {item.spaceName} ({item.houses === 5 ? 'Hotel' : `${item.houses}H`})
                    </span>
                  </div>
                  <span className={styles.assetValue}>+${item.refundPerHouse}</span>
                  <button
                    className={styles.assetAction}
                    onClick={() => handleSellBuilding(item.spaceId)}
                    data-testid={`sell-building-${item.spaceId}`}
                  >
                    Sell 1
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Mortgageable Properties */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Mortgage Properties</div>
            {mortgageableProperties.length === 0 ? (
              <div className={styles.emptyMessage}>No properties to mortgage</div>
            ) : (
              mortgageableProperties.map((item) => (
                <div
                  key={item.spaceId}
                  className={styles.assetItem}
                  data-testid="mortgageable-property"
                >
                  <div className={styles.assetInfo}>
                    <div
                      className={styles.assetColorDot}
                      style={{
                        backgroundColor: item.colorGroup ? COLOR_CSS[item.colorGroup] : '#666',
                      }}
                    />
                    <span className={styles.assetName}>{item.spaceName}</span>
                  </div>
                  <span className={styles.assetValue}>+${item.mortgageValue}</span>
                  <button
                    className={styles.assetAction}
                    onClick={() => handleMortgage(item.spaceId)}
                    data-testid={`mortgage-${item.spaceId}`}
                  >
                    Mortgage
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {canCoverDebt ? (
            <button className={styles.closeButton} onClick={onClose} data-testid="close-bankruptcy">
              Continue Playing
            </button>
          ) : (
            <button
              className={styles.bankruptButton}
              onClick={() => setShowConfirm(true)}
              data-testid="declare-bankruptcy-button"
            >
              Declare Bankruptcy
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal} role="alertdialog" aria-label="Confirm bankruptcy">
            <h3>Declare Bankruptcy?</h3>
            <p>
              This is irreversible. All your assets will be transferred to {creditorName}. You will
              be eliminated from the game.
            </p>
            <div className={styles.confirmButtons}>
              <button
                className={styles.confirmNo}
                onClick={() => setShowConfirm(false)}
                data-testid="cancel-bankruptcy"
              >
                Cancel
              </button>
              <button
                className={styles.confirmYes}
                onClick={handleDeclareBankruptcy}
                data-testid="confirm-bankruptcy"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
