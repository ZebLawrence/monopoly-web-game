import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../app/page';
import NotFound from '../app/not-found';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useGameSocket
const mockCreateRoom = vi.fn();
vi.mock('@/src/hooks/useGameSocket', () => ({
  useGameSocket: () => ({
    createRoom: mockCreateRoom,
  }),
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Monopoly');
  });

  it('renders Create Game and Join Game buttons', () => {
    render(<Home />);
    expect(screen.getByText('Create Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
  });

  it('Create Game button is disabled when name is empty', () => {
    render(<Home />);
    const createBtn = screen.getByText('Create Game');
    expect(createBtn).toBeDisabled();
  });

  it('Join Game button is disabled when name is empty', () => {
    render(<Home />);
    const joinBtn = screen.getByText('Join Game');
    expect(joinBtn).toBeDisabled();
  });

  it('enables buttons when a name is entered', () => {
    render(<Home />);
    const nameInput = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    expect(screen.getByText('Create Game')).not.toBeDisabled();
    expect(screen.getByText('Join Game')).not.toBeDisabled();
  });

  it('Join Game navigates to /lobby/join', () => {
    render(<Home />);
    const nameInput = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('Join Game'));
    expect(mockPush).toHaveBeenCalledWith('/lobby/join');
  });

  it('Create Game calls createRoom and navigates on success', async () => {
    mockCreateRoom.mockResolvedValue({ ok: true, roomCode: 'ABC123' });
    render(<Home />);
    const nameInput = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('Create Game'));
    await vi.waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith('Alice');
      expect(mockPush).toHaveBeenCalledWith('/lobby/ABC123');
    });
  });
});

describe('404 Page', () => {
  it('renders 404 text', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('has a link back to home', () => {
    render(<NotFound />);
    const homeLink = screen.getByText('Back to Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});
