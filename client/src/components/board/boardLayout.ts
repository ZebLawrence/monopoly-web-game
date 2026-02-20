import type { ColorGroup } from '@monopoly/shared';

export interface SpacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  side: 'bottom' | 'left' | 'top' | 'right';
  isCorner: boolean;
}

const COLOR_GROUP_HEX: Record<ColorGroup, number> = {
  brown: 0x8b4513,
  lightBlue: 0x87ceeb,
  pink: 0xd81b60,
  orange: 0xff8f00,
  red: 0xd32f2f,
  yellow: 0xfdd835,
  green: 0x388e3c,
  darkBlue: 0x1565c0,
};

export function getColorGroupHex(colorGroup: ColorGroup): number {
  return COLOR_GROUP_HEX[colorGroup];
}

export function calculateSpacePositions(boardSize: number): SpacePosition[] {
  const cornerSize = boardSize * 0.12;
  const spaceWidth = (boardSize - 2 * cornerSize) / 9;
  const spaceHeight = cornerSize;
  const positions: SpacePosition[] = [];

  // Position 0: Go (bottom-right corner)
  positions.push({
    x: boardSize - cornerSize,
    y: boardSize - cornerSize,
    width: cornerSize,
    height: cornerSize,
    rotation: 0,
    side: 'bottom',
    isCorner: true,
  });

  // Positions 1-9: Bottom row (right to left)
  for (let i = 0; i < 9; i++) {
    positions.push({
      x: boardSize - cornerSize - (i + 1) * spaceWidth,
      y: boardSize - spaceHeight,
      width: spaceWidth,
      height: spaceHeight,
      rotation: 0,
      side: 'bottom',
      isCorner: false,
    });
  }

  // Position 10: Jail (bottom-left corner)
  positions.push({
    x: 0,
    y: boardSize - cornerSize,
    width: cornerSize,
    height: cornerSize,
    rotation: 0,
    side: 'bottom',
    isCorner: true,
  });

  // Positions 11-19: Left column (bottom to top)
  for (let i = 0; i < 9; i++) {
    positions.push({
      x: 0,
      y: boardSize - cornerSize - (i + 1) * spaceWidth,
      width: spaceHeight,
      height: spaceWidth,
      rotation: 0,
      side: 'left',
      isCorner: false,
    });
  }

  // Position 20: Free Parking (top-left corner)
  positions.push({
    x: 0,
    y: 0,
    width: cornerSize,
    height: cornerSize,
    rotation: 0,
    side: 'top',
    isCorner: true,
  });

  // Positions 21-29: Top row (left to right)
  for (let i = 0; i < 9; i++) {
    positions.push({
      x: cornerSize + i * spaceWidth,
      y: 0,
      width: spaceWidth,
      height: spaceHeight,
      rotation: 0,
      side: 'top',
      isCorner: false,
    });
  }

  // Position 30: Go To Jail (top-right corner)
  positions.push({
    x: boardSize - cornerSize,
    y: 0,
    width: cornerSize,
    height: cornerSize,
    rotation: 0,
    side: 'top',
    isCorner: true,
  });

  // Positions 31-39: Right column (top to bottom)
  for (let i = 0; i < 9; i++) {
    positions.push({
      x: boardSize - spaceHeight,
      y: cornerSize + i * spaceWidth,
      width: spaceHeight,
      height: spaceWidth,
      rotation: 0,
      side: 'right',
      isCorner: false,
    });
  }

  return positions;
}

export function getTokenCenter(
  spacePos: SpacePosition,
  tokenIndex: number,
  totalTokens: number,
): { x: number; y: number } {
  const cx = spacePos.x + spacePos.width / 2;
  const cy = spacePos.y + spacePos.height / 2;

  if (totalTokens <= 1) return { x: cx, y: cy };

  const offsetRadius = Math.min(spacePos.width, spacePos.height) * 0.2;
  const angle = (tokenIndex / totalTokens) * Math.PI * 2 - Math.PI / 2;

  return {
    x: cx + Math.cos(angle) * offsetRadius,
    y: cy + Math.sin(angle) * offsetRadius,
  };
}

export function getBoardPath(from: number, to: number): number[] {
  const path: number[] = [];
  let current = from;
  while (current !== to) {
    current = (current + 1) % 40;
    path.push(current);
  }
  return path;
}
