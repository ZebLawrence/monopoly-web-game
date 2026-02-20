import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReconnectionOverlay } from '../src/components/connection/ReconnectionOverlay';

describe('ReconnectionOverlay', () => {
  it('should not render when connected', () => {
    const { container } = render(<ReconnectionOverlay isDisconnected={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render overlay when disconnected', () => {
    render(<ReconnectionOverlay isDisconnected={true} />);
    expect(screen.getByTestId('reconnection-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument();
  });

  it('should show connection lost message', () => {
    render(<ReconnectionOverlay isDisconnected={true} />);
    expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
  });

  it('should show attempt count when provided', () => {
    render(<ReconnectionOverlay isDisconnected={true} attemptCount={3} />);
    expect(screen.getByText('Attempt 3')).toBeInTheDocument();
  });

  it('should not show attempt count when 0', () => {
    render(<ReconnectionOverlay isDisconnected={true} attemptCount={0} />);
    expect(screen.queryByText(/^Attempt \d+$/)).not.toBeInTheDocument();
  });
});
