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

  it('Join Game button is disabled when inputs are empty', () => {
    render(<Home />);
    const joinBtn = screen.getByText('Join Game');
    expect(joinBtn).toBeDisabled();
  });

  it('enables Create Game button when name is entered', () => {
    render(<Home />);
    const nameInput = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    expect(screen.getByText('Create Game')).not.toBeDisabled();
  });

  it('enables Join Game button when room code and name are entered', () => {
    render(<Home />);
    const roomInput = screen.getByPlaceholderText('Room code');
    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(roomInput, { target: { value: 'ABC123' } });
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    expect(screen.getByText('Join Game')).not.toBeDisabled();
  });

  it('Create Game navigates to /lobby/create with name param', () => {
    render(<Home />);
    const nameInput = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('Create Game'));
    expect(mockPush).toHaveBeenCalledWith('/lobby/create?name=Alice');
  });

  it('Join Game navigates to /lobby/{code} with name param', () => {
    render(<Home />);
    const roomInput = screen.getByPlaceholderText('Room code');
    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(roomInput, { target: { value: 'abc123' } });
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText('Join Game'));
    expect(mockPush).toHaveBeenCalledWith('/lobby/ABC123?name=Bob');
  });

  it('has data-testid attributes for E2E tests', () => {
    render(<Home />);
    expect(screen.getByTestId('create-game-form')).toBeInTheDocument();
    expect(screen.getByTestId('join-game-form')).toBeInTheDocument();
  });

  it('create-game-form has text input and submit button', () => {
    render(<Home />);
    const form = screen.getByTestId('create-game-form');
    expect(form.querySelector('input[type="text"]')).toBeInTheDocument();
    expect(form.querySelector('button[type="submit"]')).toBeInTheDocument();
  });

  it('join-game-form has two text inputs and submit button', () => {
    render(<Home />);
    const form = screen.getByTestId('join-game-form');
    const inputs = form.querySelectorAll('input[type="text"]');
    expect(inputs).toHaveLength(2);
    expect(form.querySelector('button[type="submit"]')).toBeInTheDocument();
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
