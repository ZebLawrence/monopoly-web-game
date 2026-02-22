'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Space, Player, Property } from '@monopoly/shared';
import { SpaceType } from '@monopoly/shared';
import {
  calculateSpacePositions,
  getColorGroupHex,
  getTokenCenter,
  type SpacePosition,
} from './boardLayout';
import styles from './PixiBoard.module.css';

export interface PixiBoardProps {
  spaces: Space[];
  players: Player[];
  properties: Property[];
  onSpaceClick?: (spaceId: number) => void;
  className?: string;
}

const BOARD_BG_COLOR = '#c8e6c0';
const BOARD_CENTER_COLOR = '#1a5e3a';
const SPACE_BG_COLOR = '#dcedc8';
const SPACE_BORDER_COLOR = '#333333';
const TOKEN_COLORS: Record<string, string> = {
  scottieDog: '#8B4513',
  topHat: '#1a1a1a',
  raceCar: '#d32f2f',
  boot: '#5d4037',
  thimble: '#9e9e9e',
  iron: '#607d8b',
  wheelbarrow: '#2e7d32',
  battleship: '#37474f',
};
/** Different train emoji for each of the four railroads (keyed by board position). */
const RAILROAD_ICONS: Record<number, string> = {
  5: '\u{1F682}', // 🚂 Reading Railroad      — steam locomotive
  15: '\u{1F686}', // 🚆 Pennsylvania Railroad  — intercity train
  25: '\u{1F685}', // 🚅 B&O Railroad           — bullet train
  35: '\u{1F688}', // 🚈 Short Line Railroad    — light rail
};

const TOKEN_ICONS: Record<string, string> = {
  scottieDog: '\u{1F415}',
  topHat: '\u{1F3A9}',
  raceCar: '\u{1F3CE}\uFE0F',
  boot: '\u{1F462}',
  thimble: '\u{1F9F5}',
  iron: '\u2668\uFE0F',
  wheelbarrow: '\u{1F6D2}',
  battleship: '\u{1F6A2}',
};

export function PixiBoard({
  spaces,
  players,
  properties,
  onSpaceClick,
  className,
}: PixiBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(600);
  const [hoveredSpace, setHoveredSpace] = useState<number | null>(null);
  const positionsRef = useRef<SpacePosition[]>([]);
  const animatingTokensRef = useRef<Map<string, { from: number; to: number; progress: number }>>(
    new Map(),
  );
  const prevPlayersRef = useRef<Map<string, number>>(new Map());
  const animFrameRef = useRef<number>(0);
  const prevRenderStateRef = useRef('');

  // Keep latest props in a ref so drawBoard can access current values during animation
  const stateRef = useRef({ spaces, players, properties, hoveredSpace, boardSize });
  stateRef.current = { spaces, players, properties, hoveredSpace, boardSize };

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = Math.min(entry.contentRect.width, entry.contentRect.height, 800);
        setBoardSize(Math.max(size, 300));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Find space at given canvas coordinates
  const findSpaceAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = boardSize / rect.width;
      const scaleY = boardSize / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      for (let i = 0; i < positionsRef.current.length; i++) {
        const pos = positionsRef.current[i];
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
          return i;
        }
      }
      return null;
    },
    [boardSize],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSpaceClick) return;
      const spaceId = findSpaceAt(e.clientX, e.clientY);
      if (spaceId !== null) onSpaceClick(spaceId);
    },
    [onSpaceClick, findSpaceAt],
  );

  // Mobile tap handler — uses touchend to detect taps (not drags)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, []);

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!onSpaceClick || !touchStartPosRef.current) return;
      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartPosRef.current.x;
      const dy = touch.clientY - touchStartPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only treat as tap if finger didn't move much (not a drag/pan)
      if (dist < 10) {
        const spaceId = findSpaceAt(touch.clientX, touch.clientY);
        if (spaceId !== null) onSpaceClick(spaceId);
      }
      touchStartPosRef.current = null;
    },
    [onSpaceClick, findSpaceAt],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const spaceId = findSpaceAt(e.clientX, e.clientY);
      setHoveredSpace(spaceId);
    },
    [findSpaceAt],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredSpace(null);
  }, []);

  // Draw the entire board — reads latest props from stateRef
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { spaces, players, properties, hoveredSpace, boardSize } = stateRef.current;

    // Determine device pixel ratio for crisp rendering on high-DPI screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = boardSize * dpr;
    canvas.height = boardSize * dpr;
    canvas.style.width = `${boardSize}px`;
    canvas.style.height = `${boardSize}px`;
    if (typeof ctx.scale === 'function') {
      ctx.scale(dpr, dpr);
    }

    const positions = calculateSpacePositions(boardSize);
    positionsRef.current = positions;

    // Clear and draw board background
    ctx.fillStyle = BOARD_BG_COLOR;
    ctx.fillRect(0, 0, boardSize, boardSize);

    // Draw center area
    const cornerSize = boardSize * 0.12;
    ctx.fillStyle = BOARD_CENTER_COLOR;
    ctx.fillRect(cornerSize, cornerSize, boardSize - 2 * cornerSize, boardSize - 2 * cornerSize);

    // Draw center title text
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${boardSize * 0.05}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MONOPOLY', boardSize / 2, boardSize / 2);
    ctx.restore();

    // Draw each space
    for (let i = 0; i < spaces.length && i < positions.length; i++) {
      const space = spaces[i];
      const pos = positions[i];
      drawSpace(ctx, space, pos, i, properties, hoveredSpace === i);
    }

    // Draw player tokens — skip tokens that are currently animating
    const animatingIds = new Set(animatingTokensRef.current.keys());
    const playersByPosition = new Map<number, Player[]>();
    for (const player of players) {
      if (player.isBankrupt) continue;
      if (animatingIds.has(player.id)) continue;
      const list = playersByPosition.get(player.position) || [];
      list.push(player);
      playersByPosition.set(player.position, list);
    }

    for (const [position, playersAtPos] of playersByPosition) {
      if (position >= positions.length) continue;
      const pos = positions[position];

      // Position 10 (Jail): split jailed vs visiting tokens
      if (position === 10) {
        const jailed = playersAtPos.filter((p) => p.jailStatus?.inJail);
        const visiting = playersAtPos.filter((p) => !p.jailStatus?.inJail);

        // Jailed tokens in upper-right quadrant (jail cell)
        for (let i = 0; i < jailed.length; i++) {
          const cellCx = pos.x + pos.width * 0.7;
          const cellCy = pos.y + pos.height * 0.3;
          const offsetRadius = Math.min(pos.width, pos.height) * 0.12;
          const angle = (i / Math.max(jailed.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const tx = jailed.length <= 1 ? cellCx : cellCx + Math.cos(angle) * offsetRadius;
          const ty = jailed.length <= 1 ? cellCy : cellCy + Math.sin(angle) * offsetRadius;
          drawToken(ctx, jailed[i], tx, ty, boardSize);
        }

        // Visiting tokens in lower-left area (Just Visiting strip)
        for (let i = 0; i < visiting.length; i++) {
          const visitCx = pos.x + pos.width * 0.3;
          const visitCy = pos.y + pos.height * 0.75;
          const offsetRadius = Math.min(pos.width, pos.height) * 0.12;
          const angle = (i / Math.max(visiting.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const tx = visiting.length <= 1 ? visitCx : visitCx + Math.cos(angle) * offsetRadius;
          const ty = visiting.length <= 1 ? visitCy : visitCy + Math.sin(angle) * offsetRadius;
          drawToken(ctx, visiting[i], tx, ty, boardSize);
        }
        continue;
      }

      for (let i = 0; i < playersAtPos.length; i++) {
        const player = playersAtPos[i];
        const center = getTokenCenter(pos, i, playersAtPos.length);
        drawToken(ctx, player, center.x, center.y, boardSize);
      }
    }

    // Draw animating tokens at interpolated positions
    for (const [playerId, anim] of animatingTokensRef.current) {
      const player = players.find((p) => p.id === playerId);
      if (!player || player.isBankrupt) continue;
      const fromPos = positions[anim.from];
      const toPos = positions[anim.to];
      if (!fromPos || !toPos) continue;

      const t = easeOutCubic(anim.progress);
      const fromCenter = { x: fromPos.x + fromPos.width / 2, y: fromPos.y + fromPos.height / 2 };
      const toCenter = { x: toPos.x + toPos.width / 2, y: toPos.y + toPos.height / 2 };
      const x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
      const y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

      drawToken(ctx, player, x, y, boardSize);
    }

    // Draw houses/hotels
    for (const prop of properties) {
      if (prop.houses > 0 && prop.spaceId < positions.length) {
        const pos = positions[prop.spaceId];
        drawBuildings(ctx, prop.houses, pos, boardSize);
      }
    }

    // Draw ownership indicators
    for (const prop of properties) {
      if (prop.ownerId && prop.spaceId < positions.length) {
        const owner = players.find((p) => p.id === prop.ownerId);
        if (owner) {
          const pos = positions[prop.spaceId];
          drawOwnershipIndicator(ctx, pos, TOKEN_COLORS[owner.token] || '#333');
        }
      }
    }

    // Draw mortgaged overlay
    for (const prop of properties) {
      if (prop.mortgaged && prop.spaceId < positions.length) {
        const pos = positions[prop.spaceId];
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#888888';
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${boardSize * 0.015}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', pos.x + pos.width / 2, pos.y + pos.height / 2);
        ctx.restore();
      }
    }
  }, []);

  // Track player position changes and start animation loop
  useEffect(() => {
    const prevPositions = prevPlayersRef.current;
    let hasNewAnimations = false;
    for (const player of players) {
      const prev = prevPositions.get(player.id);
      if (prev !== undefined && prev !== player.position) {
        animatingTokensRef.current.set(player.id, {
          from: prev,
          to: player.position,
          progress: 0,
        });
        hasNewAnimations = true;
      }
      prevPositions.set(player.id, player.position);
    }

    // Start requestAnimationFrame loop only while animations are active
    if (hasNewAnimations && !animFrameRef.current) {
      const animate = () => {
        const animMap = animatingTokensRef.current;
        const completed: string[] = [];
        for (const [id, anim] of animMap) {
          anim.progress = Math.min(anim.progress + 0.05, 1);
          if (anim.progress >= 1) completed.push(id);
        }
        for (const id of completed) animMap.delete(id);

        drawBoard();

        if (animMap.size > 0) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete — stop the loop (no idle redraws)
          animFrameRef.current = 0;
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [players, drawBoard]);

  // Main render with dirty-checking — only redraws when relevant state actually changes
  useEffect(() => {
    const playersKey = players
      .map((p) => `${p.id}:${p.position}:${p.isBankrupt}:${p.jailStatus?.inJail}:${p.token}`)
      .join('|');
    const propsKey = properties
      .map((p) => `${p.spaceId}:${p.ownerId || ''}:${p.houses}:${p.mortgaged}`)
      .join('|');
    const stateKey = `${boardSize}:${hoveredSpace}:${playersKey}:${propsKey}`;

    if (stateKey === prevRenderStateRef.current) return;
    prevRenderStateRef.current = stateKey;

    // If animation loop is already running, it handles drawing
    if (animFrameRef.current) return;

    drawBoard();
  }, [boardSize, spaces, players, properties, hoveredSpace, drawBoard]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className || ''}`}
      data-testid="pixi-board"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouchStart}
        onTouchEnd={handleCanvasTouchEnd}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        data-testid="board-canvas"
      />
    </div>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function drawSpace(
  ctx: CanvasRenderingContext2D,
  space: Space,
  pos: SpacePosition,
  _index: number,
  properties: Property[],
  isHovered: boolean,
) {
  // Background
  ctx.fillStyle = isHovered ? '#e8f5e9' : SPACE_BG_COLOR;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

  // Border
  ctx.strokeStyle = SPACE_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

  // Hover highlight
  if (isHovered) {
    ctx.save();
    ctx.strokeStyle = '#1a5e3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x + 1, pos.y + 1, pos.width - 2, pos.height - 2);
    ctx.restore();
  }

  // Color band for properties
  if (space.colorGroup) {
    const bandHeight = pos.isCorner ? 0 : Math.min(pos.width, pos.height) * 0.25;
    if (bandHeight > 0) {
      ctx.fillStyle = '#' + getColorGroupHex(space.colorGroup).toString(16).padStart(6, '0');
      if (pos.side === 'bottom') {
        ctx.fillRect(pos.x, pos.y, pos.width, bandHeight);
      } else if (pos.side === 'top') {
        ctx.fillRect(pos.x, pos.y + pos.height - bandHeight, pos.width, bandHeight);
      } else if (pos.side === 'left') {
        ctx.fillRect(pos.x + pos.width - bandHeight, pos.y, bandHeight, pos.height);
      } else if (pos.side === 'right') {
        ctx.fillRect(pos.x, pos.y, bandHeight, pos.height);
      }
    }
  }

  // Space text
  ctx.save();
  ctx.fillStyle = '#333333';
  const fontSize = pos.isCorner
    ? Math.max(pos.width * 0.12, 7)
    : Math.max(Math.min(pos.width, pos.height) * 0.13, 6);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (pos.isCorner) {
    drawCornerSpace(ctx, space, pos);
  } else if (
    space.type === SpaceType.Property ||
    space.type === SpaceType.Railroad ||
    space.type === SpaceType.Utility
  ) {
    drawPropertySpace(ctx, space, pos, fontSize);
  } else {
    drawSpecialSpace(ctx, space, pos, fontSize);
  }

  ctx.restore();
}

function drawCornerSpace(ctx: CanvasRenderingContext2D, space: Space, pos: SpacePosition) {
  const cx = pos.x + pos.width / 2;
  const cy = pos.y + pos.height / 2;
  const iconSize = pos.width * 0.3;

  ctx.font = `bold ${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (space.position === 0) {
    // Go
    ctx.fillStyle = '#d32f2f';
    ctx.fillText('GO', cx, cy - iconSize * 0.3);
    ctx.font = `${iconSize * 0.6}px sans-serif`;
    ctx.fillText('\u2190', cx, cy + iconSize * 0.5);
  } else if (space.position === 10) {
    // Jail
    ctx.fillStyle = '#333';
    ctx.font = `bold ${iconSize * 0.5}px sans-serif`;
    ctx.fillText('IN JAIL', cx, cy - iconSize * 0.3);
    ctx.font = `${iconSize * 0.4}px sans-serif`;
    ctx.fillStyle = '#666';
    ctx.fillText('JUST', cx, cy + iconSize * 0.2);
    ctx.fillText('VISITING', cx, cy + iconSize * 0.6);
  } else if (space.position === 20) {
    // Free Parking
    ctx.fillStyle = '#d32f2f';
    ctx.fillText('FREE', cx, cy - iconSize * 0.3);
    ctx.font = `bold ${iconSize * 0.7}px sans-serif`;
    ctx.fillText('PARKING', cx, cy + iconSize * 0.3);
  } else if (space.position === 30) {
    // Go To Jail
    ctx.fillStyle = '#333';
    ctx.fillText('GO TO', cx, cy - iconSize * 0.3);
    ctx.font = `bold ${iconSize * 0.8}px sans-serif`;
    ctx.fillText('JAIL', cx, cy + iconSize * 0.3);
  }
}

function drawPropertySpace(
  ctx: CanvasRenderingContext2D,
  space: Space,
  pos: SpacePosition,
  fontSize: number,
) {
  const isVertical = pos.side === 'left' || pos.side === 'right';
  const cx = pos.x + pos.width / 2;
  const cy = pos.y + pos.height / 2;

  const railroadIcon =
    space.type === SpaceType.Railroad ? (RAILROAD_ICONS[space.position] ?? '\u{1F682}') : null;

  // Name
  const name = truncateName(space.name, isVertical ? pos.height : pos.width, fontSize);
  const nameOffset = pos.isCorner ? 0 : isVertical ? 0 : pos.height * 0.15;

  if (isVertical) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(pos.side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    if (railroadIcon) {
      // Icon above, name & cost shifted down
      ctx.font = `${fontSize * 1.9}px sans-serif`;
      ctx.fillText(railroadIcon, 0, -fontSize * 1.5);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(name, 0, -fontSize * 0.05);
      if (space.cost) {
        ctx.font = `bold ${fontSize * 0.85}px sans-serif`;
        ctx.fillText(`$${space.cost}`, 0, fontSize * 1.1);
      }
    } else {
      ctx.fillText(name, 0, -fontSize * 0.6);
      if (space.cost) {
        ctx.font = `bold ${fontSize * 0.85}px sans-serif`;
        ctx.fillText(`$${space.cost}`, 0, fontSize * 0.8);
      }
    }
    ctx.restore();
  } else {
    if (railroadIcon) {
      // Icon above, name & cost shifted down
      ctx.font = `${fontSize * 1.9}px sans-serif`;
      ctx.fillText(railroadIcon, cx, cy - fontSize * 0.9);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(name, cx, cy + fontSize * 0.7);
      if (space.cost) {
        ctx.font = `bold ${fontSize * 0.85}px sans-serif`;
        ctx.fillText(`$${space.cost}`, cx, cy + fontSize * 1.9);
      }
    } else {
      ctx.fillText(name, cx, cy + nameOffset);
      if (space.cost) {
        ctx.font = `bold ${fontSize * 0.85}px sans-serif`;
        ctx.fillText(`$${space.cost}`, cx, cy + nameOffset + fontSize * 1.2);
      }
    }
  }
}

function drawSpecialSpace(
  ctx: CanvasRenderingContext2D,
  space: Space,
  pos: SpacePosition,
  fontSize: number,
) {
  const cx = pos.x + pos.width / 2;
  const cy = pos.y + pos.height / 2;
  const isVertical = pos.side === 'left' || pos.side === 'right';

  let icon = '';
  if (space.type === SpaceType.Tax) icon = '\u{1F4B0}';
  else if (space.type === SpaceType.Chance) icon = '?';
  else if (space.type === SpaceType.CommunityChest) icon = '\u{1F4E6}';

  if (isVertical) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(pos.side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    ctx.font = `${fontSize * 1.5}px sans-serif`;
    ctx.fillText(icon, 0, -fontSize * 0.3);
    ctx.font = `${fontSize * 0.8}px sans-serif`;
    const name = truncateName(space.name, pos.height, fontSize * 0.8);
    ctx.fillText(name, 0, fontSize * 1);
    ctx.restore();
  } else {
    ctx.font = `${fontSize * 1.5}px sans-serif`;
    ctx.fillText(icon, cx, cy - fontSize * 0.5);
    ctx.font = `${fontSize * 0.8}px sans-serif`;
    const name = truncateName(space.name, pos.width, fontSize * 0.8);
    ctx.fillText(name, cx, cy + fontSize * 0.8);
  }
}

function drawToken(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  boardSize: number,
) {
  const tokenSize = boardSize * 0.028; // ~40% larger than before
  const icon = TOKEN_ICONS[player.token] || '\u26AB';
  const tokenColor = TOKEN_COLORS[player.token] || '#333';

  ctx.save();

  // Background circle
  ctx.beginPath();
  ctx.arc(x, y, tokenSize * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = tokenColor;
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ring border on every token
  ctx.beginPath();
  ctx.arc(x, y, tokenSize * 1.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = tokenSize * 0.35;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, tokenSize * 1.55, 0, Math.PI * 2);
  ctx.strokeStyle = tokenColor;
  ctx.lineWidth = tokenSize * 0.2;
  ctx.stroke();

  // Token icon with text outline for legibility
  ctx.font = `${tokenSize * 1.8}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = tokenSize * 0.8;
  ctx.shadowOffsetX = tokenSize * 0.15;
  ctx.shadowOffsetY = tokenSize * 0.15;
  ctx.fillText(icon, x, y);
  // Second pass with reduced shadow for a crisp outline effect
  ctx.shadowBlur = tokenSize * 0.3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(icon, x, y);

  ctx.restore();
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  houses: number,
  pos: SpacePosition,
  boardSize: number,
) {
  const buildingSize = boardSize * 0.015;
  const isHotel = houses === 5;
  const count = isHotel ? 1 : houses;
  const color = isHotel ? '#d32f2f' : '#2e7d32';

  const startX = pos.x + pos.width / 2 - (count * buildingSize * 1.3) / 2;
  const startY = pos.side === 'bottom' ? pos.y + 2 : pos.y + pos.height - buildingSize - 2;

  for (let i = 0; i < count; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(startX + i * buildingSize * 1.3, startY, buildingSize, buildingSize);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(startX + i * buildingSize * 1.3, startY, buildingSize, buildingSize);
  }
}

function drawOwnershipIndicator(ctx: CanvasRenderingContext2D, pos: SpacePosition, color: string) {
  const size = 5;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pos.x + pos.width - size - 2, pos.y + pos.height - size - 2, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function truncateName(name: string, maxWidth: number, fontSize: number): string {
  const charsPerPixel = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / charsPerPixel);
  if (name.length <= maxChars) return name;
  return name.substring(0, maxChars - 1) + '\u2026';
}

// Dice rendering utility
export function renderDice(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  // Die background
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  const radius = size * 0.15;
  roundRect(ctx, x, y, size, size, radius);
  ctx.fill();
  ctx.stroke();

  // Pips
  ctx.fillStyle = '#333';
  const pipR = size * 0.08;
  const positions = getDicePipPositions(value, x, y, size);
  for (const [px, py] of positions) {
    ctx.beginPath();
    ctx.arc(px, py, pipR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function getDicePipPositions(
  value: number,
  x: number,
  y: number,
  size: number,
): [number, number][] {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const offset = size * 0.25;

  const positions: Record<number, [number, number][]> = {
    1: [[cx, cy]],
    2: [
      [cx - offset, cy - offset],
      [cx + offset, cy + offset],
    ],
    3: [
      [cx - offset, cy - offset],
      [cx, cy],
      [cx + offset, cy + offset],
    ],
    4: [
      [cx - offset, cy - offset],
      [cx + offset, cy - offset],
      [cx - offset, cy + offset],
      [cx + offset, cy + offset],
    ],
    5: [
      [cx - offset, cy - offset],
      [cx + offset, cy - offset],
      [cx, cy],
      [cx - offset, cy + offset],
      [cx + offset, cy + offset],
    ],
    6: [
      [cx - offset, cy - offset],
      [cx + offset, cy - offset],
      [cx - offset, cy],
      [cx + offset, cy],
      [cx - offset, cy + offset],
      [cx + offset, cy + offset],
    ],
  };

  return positions[value] || positions[1];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Dice animation component
export interface DiceDisplayProps {
  values: [number, number];
  rolling?: boolean;
}

export function DiceDisplay({ values, rolling }: DiceDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 60;
    canvas.width = size * 2 + 20;
    canvas.height = size + 10;

    if (rolling) {
      let frame = 0;
      const animate = () => {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const v1 = ((frame * 3) % 6) + 1;
        const v2 = ((frame * 7 + 2) % 6) + 1;
        // Add slight shake
        const shakeX = Math.sin(frame * 0.5) * 3;
        const shakeY = Math.cos(frame * 0.7) * 3;
        renderDice(ctx, v1, 5 + shakeX, 5 + shakeY, size);
        renderDice(ctx, v2, size + 15 + shakeX, 5 + shakeY, size);

        if (frame < 30) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          renderDice(ctx, values[0], 5, 5, size);
          renderDice(ctx, values[1], size + 15, 5, size);
        }
      };
      animate();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderDice(ctx, values[0], 5, 5, size);
      renderDice(ctx, values[1], size + 15, 5, size);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [values, rolling]);

  return <canvas ref={canvasRef} className={styles.diceCanvas} data-testid="dice-display" />;
}
