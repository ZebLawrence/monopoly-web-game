'use client';

import React, { useMemo } from 'react';
import type { GameState, Player } from '@monopoly/shared';
import { GameEventType, TokenType, calculateNetWorth, getPropertyState } from '@monopoly/shared';
import styles from './VictoryScreen.module.css';

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

export interface VictoryScreenProps {
  gameState: GameState;
  winnerId: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}

interface PlayerStanding {
  player: Player;
  position: number;
  netWorth: number;
}

export function VictoryScreen({ gameState, winnerId, onPlayAgain, onLeave }: VictoryScreenProps) {
  const winner = gameState.players.find((p) => p.id === winnerId);

  const standings = useMemo((): PlayerStanding[] => {
    // Get elimination order from events
    const bankruptEvents = gameState.events.filter((e) => e.type === GameEventType.PlayerBankrupt);
    const eliminationOrder = bankruptEvents.map((e) => e.payload.playerId as string);

    const result: PlayerStanding[] = [];

    // Winner is first
    if (winner) {
      result.push({
        player: winner,
        position: 1,
        netWorth: calculateNetWorth(gameState, winner.id),
      });
    }

    // Others in reverse elimination order (last eliminated = 2nd place)
    const eliminated = [...eliminationOrder].reverse();
    let pos = 2;
    for (const playerId of eliminated) {
      const player = gameState.players.find((p) => p.id === playerId);
      if (player) {
        result.push({
          player,
          position: pos,
          netWorth: 0, // Bankrupt players have 0
        });
        pos++;
      }
    }

    return result;
  }, [gameState, winner]);

  const netWorthBreakdown = useMemo(() => {
    if (!winner) return null;

    let propertyValue = 0;
    let buildingValue = 0;

    for (const spaceId of winner.properties) {
      const space = gameState.board.find((s) => s.id === spaceId);
      if (!space) continue;
      const propState = getPropertyState(gameState, spaceId);

      if (!propState?.mortgaged) {
        propertyValue += space.cost ?? 0;
      }

      if (propState && propState.houses > 0) {
        const houseCost = space.houseCost ?? 0;
        buildingValue += houseCost * propState.houses;
      }
    }

    return {
      cash: winner.cash,
      properties: propertyValue,
      buildings: buildingValue,
      total: winner.cash + propertyValue + buildingValue,
    };
  }, [gameState, winner]);

  const gameStats = useMemo(() => {
    const events = gameState.events;
    const turnsPlayed = events.filter((e) => e.type === GameEventType.TurnStarted).length;
    const propertiesBought = events.filter(
      (e) => e.type === GameEventType.PropertyPurchased,
    ).length;
    const totalRentCollected = events
      .filter((e) => e.type === GameEventType.RentPaid)
      .reduce((sum, e) => sum + ((e.payload.amount as number) ?? 0), 0);
    const tradesMade = events.filter((e) => e.type === GameEventType.TradeCompleted).length;

    return { turnsPlayed, propertiesBought, totalRentCollected, tradesMade };
  }, [gameState.events]);

  if (!winner) return null;

  return (
    <div className={styles.overlay} data-testid="victory-screen">
      <div className={styles.container}>
        {/* Winner Banner */}
        <div className={styles.winnerBanner}>
          <span className={styles.trophy}>&#x1F3C6;</span>
          <div className={styles.winnerLabel}>Winner!</div>
          <div className={styles.winnerName}>{winner.name}</div>
          <div className={styles.winnerToken}>{TOKEN_ICONS[winner.token] || '\u26AB'}</div>
        </div>

        <div className={styles.body}>
          {/* Final Standings */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Final Standings</div>
            <table className={styles.standingsTable} data-testid="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Net Worth</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr
                    key={s.player.id}
                    className={`${styles.standingsRow} ${s.position === 1 ? styles.winnerRow : ''}`}
                  >
                    <td>
                      <span
                        className={`${styles.positionBadge} ${
                          s.position === 1
                            ? styles.position1
                            : s.position === 2
                              ? styles.position2
                              : s.position === 3
                                ? styles.position3
                                : styles.positionOther
                        }`}
                      >
                        {s.position}
                      </span>
                    </td>
                    <td>
                      {TOKEN_ICONS[s.player.token] || '\u26AB'} {s.player.name}
                    </td>
                    <td>${s.netWorth.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Net Worth Breakdown */}
          {netWorthBreakdown && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Winner&apos;s Net Worth</div>
              <div className={styles.breakdown} data-testid="net-worth-breakdown">
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Cash</span>
                  <span className={styles.breakdownValue}>
                    ${netWorthBreakdown.cash.toLocaleString()}
                  </span>
                </div>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Property Value</span>
                  <span className={styles.breakdownValue}>
                    ${netWorthBreakdown.properties.toLocaleString()}
                  </span>
                </div>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Building Value</span>
                  <span className={styles.breakdownValue}>
                    ${netWorthBreakdown.buildings.toLocaleString()}
                  </span>
                </div>
                <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                  <span className={styles.breakdownLabel}>Total</span>
                  <span className={styles.breakdownValue}>
                    ${netWorthBreakdown.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Game Statistics */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Game Statistics</div>
            <div className={styles.statsGrid} data-testid="game-stats">
              <div className={styles.statCard}>
                <div className={styles.statValue}>{gameStats.turnsPlayed}</div>
                <div className={styles.statLabel}>Turns Played</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{gameStats.propertiesBought}</div>
                <div className={styles.statLabel}>Properties Bought</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  ${gameStats.totalRentCollected.toLocaleString()}
                </div>
                <div className={styles.statLabel}>Rent Collected</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{gameStats.tradesMade}</div>
                <div className={styles.statLabel}>Trades Made</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.playAgainButton}
            onClick={onPlayAgain}
            data-testid="play-again-button"
          >
            Play Again
          </button>
          <button className={styles.leaveButton} onClick={onLeave} data-testid="leave-button">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
