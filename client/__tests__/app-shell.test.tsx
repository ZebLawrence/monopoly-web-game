import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';
import NotFound from '../app/not-found';

describe('Home Page', () => {
  it('renders the game title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Monopoly');
  });

  it('renders Create Game and Join Game buttons', () => {
    render(<Home />);
    expect(screen.getByText('Create Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
  });

  it('Create Game links to lobby', () => {
    render(<Home />);
    const createLink = screen.getByText('Create Game');
    expect(createLink.closest('a')).toHaveAttribute('href', '/lobby/new');
  });

  it('Join Game links to lobby join', () => {
    render(<Home />);
    const joinLink = screen.getByText('Join Game');
    expect(joinLink.closest('a')).toHaveAttribute('href', '/lobby/join');
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
