'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Player, Property, Space } from '@monopoly/shared';
import { PixiBoard } from '../board/PixiBoard';
import { PlayerDashboard } from './PlayerDashboard';
import { calculateSpacePositions } from '../board/boardLayout';
import styles from './GameLayout.module.css';

/** Zoom level used when auto-following a player. */
const FOLLOW_ZOOM = 2.5;
/** Milliseconds of no user interaction before auto-follow re-engages. */
const AUTO_FOLLOW_DELAY_MS = 15_000;
/**
 * Normalised [0-1] board-space centres for every space, computed once.
 * calculateSpacePositions(1) returns x/y values in the 0–1 range.
 */
const NORMALISED_CENTERS = calculateSpacePositions(1).map((p) => ({
  nx: p.x + p.width / 2,
  ny: p.y + p.height / 2,
}));

export interface GameLayoutProps {
  spaces: Space[];
  players: Player[];
  properties: Property[];
  currentPlayer: Player;
  onSpaceClick?: (spaceId: number) => void;
}

export function GameLayout({
  spaces,
  players,
  properties,
  currentPlayer,
  onSpaceClick,
}: GameLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // Board touch gestures
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  /** True while a programmatic follow-zoom transition should animate. */
  const [withTransition, setWithTransition] = useState(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  /** Ref on the inner transform div — used to measure the board pixel size. */
  const transformDivRef = useRef<HTMLDivElement>(null);
  const lastTouchDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);

  // ── Auto-follow state (refs so timers/handlers always see latest values) ──
  /** Whether the view should automatically track the current player. */
  const followModeRef = useRef(true);
  const autoFollowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Always-current snapshot of currentPlayer for use inside callbacks. */
  const currentPlayerRef = useRef(currentPlayer);
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  // ── Follow-zoom helpers ────────────────────────────────────────────────────

  /** Returns the pixel size of the board square (capped at 800). */
  const getBoardPixelSize = useCallback((): number => {
    const el = transformDivRef.current ?? boardContainerRef.current;
    return Math.min(el?.offsetWidth ?? 600, el?.offsetHeight ?? 600, 800);
  }, []);

  /** Smoothly zoom in and centre the view on the given player's space. */
  const zoomToPlayer = useCallback(
    (player: Player) => {
      const W = getBoardPixelSize();
      const c = NORMALISED_CENTERS[player.position];
      if (!c) return;
      setWithTransition(true);
      setScale(FOLLOW_ZOOM);
      setTranslate({ x: (0.5 - c.nx) * W, y: (0.5 - c.ny) * W });
    },
    [getBoardPixelSize],
  );

  /** Reset the 15-second inactivity countdown. */
  const scheduleAutoFollow = useCallback(() => {
    if (autoFollowTimerRef.current) clearTimeout(autoFollowTimerRef.current);
    autoFollowTimerRef.current = setTimeout(() => {
      followModeRef.current = true;
      zoomToPlayer(currentPlayerRef.current);
    }, AUTO_FOLLOW_DELAY_MS);
  }, [zoomToPlayer]);

  /**
   * Call this whenever the user deliberately pans or pinches.
   * Exits follow mode and starts the inactivity timer.
   */
  const markUserInteraction = useCallback(() => {
    followModeRef.current = false;
    setWithTransition(false); // disable CSS transition for gesture responsiveness
    scheduleAutoFollow();
  }, [scheduleAutoFollow]);

  // Re-follow on player move.
  useEffect(() => {
    if (followModeRef.current) {
      zoomToPlayer(currentPlayer);
    }
  }, [currentPlayer.position, currentPlayer.id, zoomToPlayer]);

  // Initial zoom once the DOM has laid out (offsetWidth is available).
  useEffect(() => {
    const id = setTimeout(() => {
      if (followModeRef.current) zoomToPlayer(currentPlayerRef.current);
    }, 150);
    return () => clearTimeout(id);
  }, [zoomToPlayer]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (autoFollowTimerRef.current) clearTimeout(autoFollowTimerRef.current);
    };
  }, []);

  // ── Gesture handlers ──────────────────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Prevent browser zoom when pinching on the board
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
        markUserInteraction();
      } else if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    },
    [markUserInteraction],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch-to-zoom on board only
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistRef.current > 0) {
          const scaleDelta = dist / lastTouchDistRef.current;
          setScale((prev) => Math.max(0.5, Math.min(3, prev * scaleDelta)));
        }
        lastTouchDistRef.current = dist;
      } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
        // Pan when zoomed in
        e.preventDefault();
        const dx = e.touches[0].clientX - lastTouchRef.current.x;
        const dy = e.touches[0].clientY - lastTouchRef.current.y;
        setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        markUserInteraction();
      }
    },
    [scale, markUserInteraction],
  );

  const handleTouchEnd = useCallback(() => {
    // Double-tap: re-enter follow mode and zoom back to the current player
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      followModeRef.current = true;
      if (autoFollowTimerRef.current) clearTimeout(autoFollowTimerRef.current);
      zoomToPlayer(currentPlayerRef.current);
    }
    lastTapTimeRef.current = now;
    lastTouchDistRef.current = 0;
    isDraggingRef.current = false;
  }, [zoomToPlayer]);

  const handleDoubleClick = useCallback(() => {
    // Re-enter follow mode and zoom back to current player
    followModeRef.current = true;
    if (autoFollowTimerRef.current) clearTimeout(autoFollowTimerRef.current);
    zoomToPlayer(currentPlayerRef.current);
  }, [zoomToPlayer]);

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
        style={{ touchAction: scale > 1 ? 'none' : 'pan-x pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          ref={transformDivRef}
          style={{
            transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
            transition: withTransition ? 'transform 0.6s ease-in-out' : 'none',
            willChange: 'transform',
          }}
        >
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

          <PlayerDashboard
            currentPlayer={currentPlayer}
            allPlayers={players}
            properties={properties}
          />
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
