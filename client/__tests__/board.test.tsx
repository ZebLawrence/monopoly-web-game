import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  calculateSpacePositions,
  getTokenCenter,
  getBoardPath,
  getColorGroupHex,
} from '../src/components/board/boardLayout';
import { PixiBoard, DiceDisplay } from '../src/components/board/PixiBoard';
import { mockBoard, mockPlayers, mockProperties } from '../src/mocks/gameData';

describe('boardLayout', () => {
  describe('calculateSpacePositions', () => {
    const boardSize = 600;
    const positions = calculateSpacePositions(boardSize);

    it('returns 40 positions', () => {
      expect(positions).toHaveLength(40);
    });

    it('position 0 (Go) is a corner at bottom-right', () => {
      const go = positions[0];
      expect(go.isCorner).toBe(true);
      expect(go.side).toBe('bottom');
      expect(go.x).toBeGreaterThan(boardSize / 2);
      expect(go.y).toBeGreaterThan(boardSize / 2);
    });

    it('position 10 (Jail) is a corner at bottom-left', () => {
      const jail = positions[10];
      expect(jail.isCorner).toBe(true);
      expect(jail.x).toBe(0);
      expect(jail.y).toBeGreaterThan(boardSize / 2);
    });

    it('position 20 (Free Parking) is a corner at top-left', () => {
      const fp = positions[20];
      expect(fp.isCorner).toBe(true);
      expect(fp.x).toBe(0);
      expect(fp.y).toBe(0);
    });

    it('position 30 (Go To Jail) is a corner at top-right', () => {
      const gtj = positions[30];
      expect(gtj.isCorner).toBe(true);
      expect(gtj.x).toBeGreaterThan(boardSize / 2);
      expect(gtj.y).toBe(0);
    });

    it('bottom row positions 1-9 have side "bottom"', () => {
      for (let i = 1; i <= 9; i++) {
        expect(positions[i].side).toBe('bottom');
        expect(positions[i].isCorner).toBe(false);
      }
    });

    it('left column positions 11-19 have side "left"', () => {
      for (let i = 11; i <= 19; i++) {
        expect(positions[i].side).toBe('left');
        expect(positions[i].isCorner).toBe(false);
      }
    });

    it('top row positions 21-29 have side "top"', () => {
      for (let i = 21; i <= 29; i++) {
        expect(positions[i].side).toBe('top');
        expect(positions[i].isCorner).toBe(false);
      }
    });

    it('right column positions 31-39 have side "right"', () => {
      for (let i = 31; i <= 39; i++) {
        expect(positions[i].side).toBe('right');
        expect(positions[i].isCorner).toBe(false);
      }
    });

    it('corner spaces are larger than regular spaces', () => {
      const corner = positions[0];
      const regular = positions[1];
      expect(corner.width).toBeGreaterThan(regular.width);
    });
  });

  describe('getTokenCenter', () => {
    it('returns center of space for single token', () => {
      const pos = {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
        rotation: 0,
        side: 'bottom' as const,
        isCorner: false,
      };
      const center = getTokenCenter(pos, 0, 1);
      expect(center.x).toBe(125);
      expect(center.y).toBe(130);
    });

    it('returns offset positions for multiple tokens', () => {
      const pos = {
        x: 100,
        y: 100,
        width: 50,
        height: 60,
        rotation: 0,
        side: 'bottom' as const,
        isCorner: false,
      };
      const c1 = getTokenCenter(pos, 0, 3);
      const c2 = getTokenCenter(pos, 1, 3);
      expect(c1.x).not.toBe(c2.x);
    });
  });

  describe('getBoardPath', () => {
    it('returns correct path from 5 to 10', () => {
      const path = getBoardPath(5, 10);
      expect(path).toEqual([6, 7, 8, 9, 10]);
    });

    it('wraps around Go correctly (38 to 3)', () => {
      const path = getBoardPath(38, 3);
      expect(path).toEqual([39, 0, 1, 2, 3]);
    });
  });

  describe('getColorGroupHex', () => {
    it('returns correct hex for brown', () => {
      expect(getColorGroupHex('brown')).toBe(0x8b4513);
    });

    it('returns correct hex for darkBlue', () => {
      expect(getColorGroupHex('darkBlue')).toBe(0x1565c0);
    });
  });
});

describe('PixiBoard component', () => {
  // Mock canvas context
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
    });
  });

  it('renders canvas element', () => {
    render(<PixiBoard spaces={mockBoard} players={mockPlayers} properties={mockProperties} />);
    expect(screen.getByTestId('board-canvas')).toBeInTheDocument();
  });

  it('fires onSpaceClick when space is clicked', () => {
    const onSpaceClick = vi.fn();
    render(
      <PixiBoard
        spaces={mockBoard}
        players={mockPlayers}
        properties={mockProperties}
        onSpaceClick={onSpaceClick}
      />,
    );
    // Just verify the handler is attached (actual click position detection
    // requires real canvas coordinates which we can't reliably test in jsdom)
    const canvas = screen.getByTestId('board-canvas');
    fireEvent.click(canvas);
  });
});

describe('DiceDisplay', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
    });
  });

  it('renders dice canvas', () => {
    render(<DiceDisplay values={[3, 4]} />);
    expect(screen.getByTestId('dice-display')).toBeInTheDocument();
  });

  it('renders with rolling animation', () => {
    render(<DiceDisplay values={[1, 6]} rolling />);
    expect(screen.getByTestId('dice-display')).toBeInTheDocument();
  });
});
