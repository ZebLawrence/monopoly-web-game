import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnState } from '@monopoly/shared';
import {
  PlayerDashboard,
  CurrentPlayerPanel,
  OwnedPropertiesList,
  HeldCardsDisplay,
  OtherPlayersSummary,
  ActionButtonBar,
  TurnIndicator,
} from '../src/components/dashboard/PlayerDashboard';
import { mockPlayers, mockProperties } from '../src/mocks/gameData';

describe('PlayerDashboard', () => {
  it('renders the dashboard container', () => {
    render(
      <PlayerDashboard
        currentPlayer={mockPlayers[0]}
        allPlayers={mockPlayers}
        properties={mockProperties}
        turnState={TurnState.WaitingForRoll}
        isCurrentPlayersTurn={true}
      />,
    );
    expect(screen.getByTestId('player-dashboard')).toBeInTheDocument();
  });
});

describe('CurrentPlayerPanel', () => {
  it('displays player name, token, and cash', () => {
    render(<CurrentPlayerPanel player={mockPlayers[0]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByTestId('cash-display')).toHaveTextContent('$1,500');
  });
});

describe('OwnedPropertiesList', () => {
  it('renders properties grouped by color', () => {
    const ownedProps = mockProperties.filter((p) => p.ownerId === 'player-1');
    render(<OwnedPropertiesList properties={ownedProps} onPropertyClick={() => {}} />);
    expect(screen.getByTestId('owned-properties')).toBeInTheDocument();
    expect(screen.getByText(/Mediterranean/)).toBeInTheDocument();
    expect(screen.getByText(/Baltic/)).toBeInTheDocument();
  });

  it('clicking a property fires callback', () => {
    const onClick = vi.fn();
    const ownedProps = mockProperties.filter((p) => p.ownerId === 'player-1');
    render(<OwnedPropertiesList properties={ownedProps} onPropertyClick={onClick} />);
    fireEvent.click(screen.getByText(/Mediterranean/));
    expect(onClick).toHaveBeenCalledWith(ownedProps[0]);
  });

  it('returns null when no properties owned', () => {
    const { container } = render(
      <OwnedPropertiesList properties={[]} onPropertyClick={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('HeldCardsDisplay', () => {
  it('shows GOOJF card when player has one', () => {
    render(<HeldCardsDisplay count={1} />);
    expect(screen.getByTestId('held-cards')).toBeInTheDocument();
    expect(screen.getByText(/Get Out of Jail Free/)).toBeInTheDocument();
  });

  it('returns null when player has 0 cards', () => {
    const { container } = render(<HeldCardsDisplay count={0} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('OtherPlayersSummary', () => {
  it('displays other players with correct info', () => {
    const others = mockPlayers.filter((p) => p.id !== 'player-1');
    render(<OtherPlayersSummary players={others} properties={mockProperties} />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows bankrupt players as eliminated', () => {
    const others = mockPlayers.filter((p) => p.id !== 'player-1');
    render(<OtherPlayersSummary players={others} properties={mockProperties} />);
    expect(screen.getByText(/Diana \(Bankrupt\)/)).toBeInTheDocument();
  });
});

describe('ActionButtonBar', () => {
  it('renders all action buttons', () => {
    render(<ActionButtonBar turnState={TurnState.WaitingForRoll} isCurrentPlayersTurn={true} />);
    expect(screen.getByText('Roll Dice')).toBeInTheDocument();
    expect(screen.getByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Mortgage')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('End Turn')).toBeInTheDocument();
  });

  it('only Roll Dice enabled in WaitingForRoll state', () => {
    render(<ActionButtonBar turnState={TurnState.WaitingForRoll} isCurrentPlayersTurn={true} />);
    expect(screen.getByText('Roll Dice')).not.toBeDisabled();
    expect(screen.getByText('Buy')).toBeDisabled();
    expect(screen.getByText('Build')).toBeDisabled();
    expect(screen.getByText('End Turn')).toBeDisabled();
  });

  it('Build, Mortgage, Trade, End Turn enabled in PlayerAction state', () => {
    render(<ActionButtonBar turnState={TurnState.PlayerAction} isCurrentPlayersTurn={true} />);
    expect(screen.getByText('Roll Dice')).toBeDisabled();
    expect(screen.getByText('Build')).not.toBeDisabled();
    expect(screen.getByText('Mortgage')).not.toBeDisabled();
    expect(screen.getByText('Trade')).not.toBeDisabled();
    expect(screen.getByText('End Turn')).not.toBeDisabled();
  });

  it('all buttons disabled when not current player turn', () => {
    render(<ActionButtonBar turnState={TurnState.WaitingForRoll} isCurrentPlayersTurn={false} />);
    expect(screen.getByText('Roll Dice')).toBeDisabled();
    expect(screen.getByText('End Turn')).toBeDisabled();
  });

  it('fires onAction when button clicked', () => {
    const onAction = vi.fn();
    render(
      <ActionButtonBar
        turnState={TurnState.WaitingForRoll}
        isCurrentPlayersTurn={true}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByText('Roll Dice'));
    expect(onAction).toHaveBeenCalledWith('rollDice');
  });
});

describe('TurnIndicator', () => {
  it('displays player name with turn text', () => {
    render(<TurnIndicator currentPlayer={mockPlayers[1]} />);
    expect(screen.getByTestId('turn-indicator')).toHaveTextContent("Bob's Turn");
  });
});
