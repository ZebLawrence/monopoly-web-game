import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnState } from '@monopoly/shared';
import { GameLayout } from '../src/components/dashboard/GameLayout';
import { mockBoard, mockPlayers, mockProperties } from '../src/mocks/gameData';

// Mock canvas context for the board
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

describe('GameLayout', () => {
  const defaultProps = {
    spaces: mockBoard,
    players: mockPlayers,
    properties: mockProperties,
    currentPlayer: mockPlayers[0],
    turnState: TurnState.WaitingForRoll,
    isCurrentPlayersTurn: true,
  };

  it('renders game layout container', () => {
    render(<GameLayout {...defaultProps} />);
    expect(screen.getByTestId('game-layout')).toBeInTheDocument();
  });

  it('renders the board canvas', () => {
    render(<GameLayout {...defaultProps} />);
    expect(screen.getByTestId('board-canvas')).toBeInTheDocument();
  });

  it('renders the player dashboard', () => {
    render(<GameLayout {...defaultProps} />);
    expect(screen.getByTestId('player-dashboard')).toBeInTheDocument();
  });

  it('renders mobile toggle button', () => {
    render(<GameLayout {...defaultProps} />);
    expect(screen.getByTestId('mobile-toggle')).toBeInTheDocument();
  });

  it('toggles mobile drawer on button click', () => {
    render(<GameLayout {...defaultProps} />);
    const toggle = screen.getByTestId('mobile-toggle');
    fireEvent.click(toggle);
    expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument();
  });
});
