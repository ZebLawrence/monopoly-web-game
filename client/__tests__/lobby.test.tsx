import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TokenType } from '@monopoly/shared';
import {
  CreateGameForm,
  JoinGameForm,
  WaitingRoom,
  PlayerListItem,
  NameEntryModal,
} from '../src/components/lobby/Lobby';
import type { LobbyPlayer } from '../src/components/lobby/Lobby';

const mockLobbyPlayers: LobbyPlayer[] = [
  { id: 'p1', name: 'Alice', token: TokenType.ScottieDog, isReady: true, isHost: true },
  { id: 'p2', name: 'Bob', token: TokenType.TopHat, isReady: false, isHost: false },
];

describe('CreateGameForm', () => {
  it('renders form with player count and starting cash', () => {
    render(<CreateGameForm onSubmit={() => {}} />);
    expect(screen.getByTestId('create-game-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Players')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting Cash')).toBeInTheDocument();
  });

  it('submits with settings', () => {
    const onSubmit = vi.fn();
    render(<CreateGameForm onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByTestId('create-game-form'));
    expect(onSubmit).toHaveBeenCalledWith({ playerCount: 4, startingCash: 1500 });
  });
});

describe('JoinGameForm', () => {
  it('renders form with room code input', () => {
    render(<JoinGameForm onSubmit={() => {}} />);
    expect(screen.getByTestId('join-game-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Room Code')).toBeInTheDocument();
  });

  it('submits with entered code', () => {
    const onSubmit = vi.fn();
    render(<JoinGameForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Room Code'), { target: { value: 'abc123' } });
    fireEvent.submit(screen.getByTestId('join-game-form'));
    expect(onSubmit).toHaveBeenCalledWith('ABC123');
  });
});

describe('PlayerListItem', () => {
  it('shows player name and ready status', () => {
    render(<PlayerListItem player={mockLobbyPlayers[0]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('HOST')).toBeInTheDocument();
    expect(screen.getByLabelText('Ready')).toBeInTheDocument();
  });

  it('shows not ready status', () => {
    render(<PlayerListItem player={mockLobbyPlayers[1]} />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByLabelText('Not ready')).toBeInTheDocument();
  });
});

describe('WaitingRoom', () => {
  it('renders room code and player list', () => {
    render(<WaitingRoom roomCode="ABCDEF" players={mockLobbyPlayers} isHost={true} />);
    expect(screen.getByTestId('room-code')).toHaveTextContent('ABCDEF');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('host sees Start Game button', () => {
    render(<WaitingRoom roomCode="ABCDEF" players={mockLobbyPlayers} isHost={true} />);
    expect(screen.getByTestId('start-game-button')).toBeInTheDocument();
  });

  it('Start Game enabled with 2+ players', () => {
    render(<WaitingRoom roomCode="ABCDEF" players={mockLobbyPlayers} isHost={true} />);
    expect(screen.getByTestId('start-game-button')).not.toBeDisabled();
  });

  it('Start Game disabled with 1 player', () => {
    render(<WaitingRoom roomCode="ABCDEF" players={[mockLobbyPlayers[0]]} isHost={true} />);
    expect(screen.getByTestId('start-game-button')).toBeDisabled();
  });

  it('non-host does not see Start Game button', () => {
    render(<WaitingRoom roomCode="ABCDEF" players={mockLobbyPlayers} isHost={false} />);
    expect(screen.queryByTestId('start-game-button')).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for host/)).toBeInTheDocument();
  });

  it('copy room link button exists', () => {
    render(<WaitingRoom roomCode="ABCDEF" players={mockLobbyPlayers} isHost={true} />);
    expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
  });
});

describe('NameEntryModal', () => {
  it('renders name input and token selector', () => {
    render(<NameEntryModal isOpen={true} onSubmit={() => {}} />);
    expect(screen.getByTestId('name-entry-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    expect(screen.getByTestId('token-selector')).toBeInTheDocument();
  });

  it('submit disabled without name and token', () => {
    render(<NameEntryModal isOpen={true} onSubmit={() => {}} />);
    const submitBtn = screen.getByText('Join');
    expect(submitBtn).toBeDisabled();
  });

  it('does not render when closed', () => {
    render(<NameEntryModal isOpen={false} onSubmit={() => {}} />);
    expect(screen.queryByTestId('name-entry-form')).not.toBeInTheDocument();
  });
});
