import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TradeBuilder } from '../src/components/trading/TradeBuilder';
import {
  IncomingTradeModal,
  TradeNotification,
} from '../src/components/trading/IncomingTradeModal';
import { mockPlayers, mockProperties } from '../src/mocks/gameData';
import type { TradeOffer, Property } from '@monopoly/shared';

const activePlayers = mockPlayers.filter((p) => p.isActive && !p.isBankrupt);
const otherPlayers = activePlayers.filter((p) => p.id !== 'player-1');

describe('Step 3B.5 — Trading UI', () => {
  describe('TradeBuilder', () => {
    it('P3B.S5.T1: shows player selection list', () => {
      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={mockProperties}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('player-selection')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('P3B.S5.T1: selecting a player opens trade builder', () => {
      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={mockProperties}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('trade-player-player-2'));
      expect(screen.getByText(/Trading with/)).toBeInTheDocument();
      expect(screen.getByText('You Offer')).toBeInTheDocument();
      expect(screen.getByText('You Request')).toBeInTheDocument();
    });

    it('P3B.S5.T2: shows two-column layout with offer and request', () => {
      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={mockProperties}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
          prefilledRecipientId="player-2"
        />,
      );

      expect(screen.getByText('You Offer')).toBeInTheDocument();
      expect(screen.getByText('You Request')).toBeInTheDocument();
    });

    it('P3B.S5.T3: clicking property toggles selection', () => {
      // Use properties with no buildings so they're not disabled
      const propsNoBuildings: Property[] = mockProperties.map((p) => ({ ...p, houses: 0 }));

      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={propsNoBuildings}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
          prefilledRecipientId="player-2"
        />,
      );

      const propButton = screen.getByTestId('offer-prop-1');
      fireEvent.click(propButton);
      // Should have selected class
      expect(propButton.className).toContain('propSelected');

      // Click again to deselect
      fireEvent.click(propButton);
      expect(propButton.className).not.toContain('propSelected');
    });

    it('P3B.S5.T4: cash input updates offered cash', () => {
      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={mockProperties}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
          prefilledRecipientId="player-2"
        />,
      );

      const cashInput = screen.getByTestId('offered-cash') as HTMLInputElement;
      fireEvent.change(cashInput, { target: { value: '200' } });
      expect(Number(cashInput.value)).toBe(200);
    });

    it('P3B.S5.T5: GOOJF card toggle appears when player has cards', () => {
      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]} // Alice has 1 GOOJF
          otherPlayers={otherPlayers}
          properties={mockProperties}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
          prefilledRecipientId="player-2"
        />,
      );

      expect(screen.getByTestId('offered-cards')).toBeInTheDocument();
    });

    it('P3B.S5.T6: shows validation error for invalid trade', () => {
      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={mockProperties}
          onSendOffer={vi.fn()}
          onClose={vi.fn()}
          prefilledRecipientId="player-2"
        />,
      );

      // No items selected — should show validation error
      expect(screen.getByTestId('trade-validation-error')).toHaveTextContent(
        'Add items to the trade',
      );
      expect(screen.getByTestId('send-offer-button')).toBeDisabled();
    });

    it('P3B.S5.T7: send offer calls onSendOffer with correct payload', () => {
      const onSend = vi.fn();
      // Use properties with no buildings so they're not disabled
      const propsNoBuildings: Property[] = mockProperties.map((p) => ({ ...p, houses: 0 }));

      render(
        <TradeBuilder
          isOpen={true}
          currentPlayer={mockPlayers[0]}
          otherPlayers={otherPlayers}
          properties={propsNoBuildings}
          onSendOffer={onSend}
          onClose={vi.fn()}
          prefilledRecipientId="player-2"
        />,
      );

      // Select a property to offer
      fireEvent.click(screen.getByTestId('offer-prop-1'));
      // Send offer
      fireEvent.click(screen.getByTestId('send-offer-button'));

      expect(onSend).toHaveBeenCalledWith(
        'player-2',
        expect.objectContaining({
          offeredProperties: [1],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        }),
      );
    });
  });

  describe('IncomingTradeModal', () => {
    const sampleTrade: TradeOffer = {
      id: 'trade-1',
      proposerId: 'player-2',
      recipientId: 'player-1',
      offeredProperties: [5],
      offeredCash: 100,
      offeredCards: 0,
      requestedProperties: [1],
      requestedCash: 0,
      requestedCards: 0,
      status: 'pending',
    };

    it('P3B.S5.T8: shows full offer with Accept/Reject/Counter buttons', () => {
      render(
        <IncomingTradeModal
          isOpen={true}
          trade={sampleTrade}
          proposer={mockPlayers[1]}
          properties={mockProperties}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onCounter={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('incoming-trade-modal')).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.getByText('Reading Railroad')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean Avenue')).toBeInTheDocument();
      expect(screen.getByTestId('accept-trade-button')).toBeInTheDocument();
      expect(screen.getByTestId('reject-trade-button')).toBeInTheDocument();
      expect(screen.getByTestId('counter-trade-button')).toBeInTheDocument();
    });

    it('P3B.S5.T9: Accept button calls onAccept', () => {
      const onAccept = vi.fn();

      render(
        <IncomingTradeModal
          isOpen={true}
          trade={sampleTrade}
          proposer={mockPlayers[1]}
          properties={mockProperties}
          onAccept={onAccept}
          onReject={vi.fn()}
          onCounter={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('accept-trade-button'));
      expect(onAccept).toHaveBeenCalled();
    });

    it('P3B.S5.T10: Reject button calls onReject', () => {
      const onReject = vi.fn();

      render(
        <IncomingTradeModal
          isOpen={true}
          trade={sampleTrade}
          proposer={mockPlayers[1]}
          properties={mockProperties}
          onAccept={vi.fn()}
          onReject={onReject}
          onCounter={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('reject-trade-button'));
      expect(onReject).toHaveBeenCalled();
    });

    it('P3B.S5.T11: Counter button calls onCounter', () => {
      const onCounter = vi.fn();

      render(
        <IncomingTradeModal
          isOpen={true}
          trade={sampleTrade}
          proposer={mockPlayers[1]}
          properties={mockProperties}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onCounter={onCounter}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('counter-trade-button'));
      expect(onCounter).toHaveBeenCalled();
    });
  });

  describe('TradeNotification', () => {
    it('P3B.S5.T12: shows trade completion in activity feed', () => {
      render(<TradeNotification player1Name="Alice" player2Name="Bob" />);

      expect(screen.getByTestId('trade-notification')).toHaveTextContent('Alice traded with Bob');
    });
  });
});
