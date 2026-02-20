'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { Player, Property, Space } from '@monopoly/shared';
import { TurnState } from '@monopoly/shared';
import { PixiBoard } from '../board/PixiBoard';
import { PlayerDashboard } from './PlayerDashboard';
import styles from './GameLayout.module.css';

export interface GameLayoutProps {
  spaces: Space[];
  players: Player[];
  properties: Property[];
  currentPlayer: Player;
  turnState: TurnState;
  isCurrentPlayersTurn: boolean;
  onSpaceClick?: (spaceId: number) => void;
  onAction?: (action: string) => void;
}

type MobileTab = 'properties' | 'players' | 'actions';

export function GameLayout({
  spaces,
  players,
  properties,
  currentPlayer,
  turnState,
  isCurrentPlayersTurn,
  onSpaceClick,
  onAction,
}: GameLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('actions');
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // Board touch gestures
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch-to-zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistRef.current > 0) {
          const scaleDelta = dist / lastTouchDistRef.current;
          setScale((prev) => Math.max(0.5, Math.min(3, prev * scaleDelta)));
        }
        lastTouchDistRef.current = dist;
      } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
        // Pan when zoomed
        const dx = e.touches[0].clientX - lastTouchRef.current.x;
        const dy = e.touches[0].clientY - lastTouchRef.current.y;
        setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    },
    [scale],
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = 0;
    isDraggingRef.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Handle swipe down to close drawer
  const handleDrawerTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleDrawerTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 50) {
      setDrawerOpen(false);
    }
  }, []);

  return (
    <div className={styles.gameLayout} data-testid="game-layout">
      <div
        ref={boardContainerRef}
        className={styles.boardSection}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div style={{ transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)` }}>
          <PixiBoard
            spaces={spaces}
            players={players}
            properties={properties}
            onSpaceClick={onSpaceClick}
          />
        </div>
      </div>

      {/* Desktop / Tablet Dashboard */}
      <div className={styles.dashboardSection}>
        <PlayerDashboard
          currentPlayer={currentPlayer}
          allPlayers={players}
          properties={properties}
          turnState={turnState}
          isCurrentPlayersTurn={isCurrentPlayersTurn}
          onAction={onAction}
        />
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div
          ref={drawerRef}
          className={`${styles.dashboardSection} ${styles.dashboardSectionVisible}`}
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
          data-testid="mobile-drawer"
        >
          <div className={styles.drawerHandle} onClick={() => setDrawerOpen(false)}>
            <div className={styles.drawerBar} />
          </div>

          <div className={styles.mobileTabs}>
            {(['properties', 'players', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                className={`${styles.mobileTab} ${activeTab === tab ? styles.mobileTabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'properties' ? 'My Properties' : tab === 'players' ? 'Players' : 'Actions'}
              </button>
            ))}
          </div>

          <div className={styles.mobileTabContent}>
            <PlayerDashboard
              currentPlayer={currentPlayer}
              allPlayers={players}
              properties={properties}
              turnState={turnState}
              isCurrentPlayersTurn={isCurrentPlayersTurn}
              onAction={onAction}
            />
          </div>
        </div>
      )}

      {/* Mobile Toggle */}
      <div className={styles.mobileToggle}>
        <button
          className={styles.toggleButton}
          onClick={handleDrawerToggle}
          aria-label={drawerOpen ? 'Close dashboard' : 'Open dashboard'}
          data-testid="mobile-toggle"
        >
          {drawerOpen ? 'Board' : 'Dashboard'}
        </button>
      </div>
    </div>
  );
}
