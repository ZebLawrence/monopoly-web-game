import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuyConfirmationModal } from '../src/components/property/BuyConfirmationModal';
import { mockPlayers, mockBoard } from '../src/mocks/gameData';

const mediterraneanSpace = mockBoard.find((s) => s.id === 1)!;
const railroadSpace = mockBoard.find((s) => s.id === 5)!;
const utilitySpace = mockBoard.find((s) => s.id === 12)!;

describe('Step 3B.1 — Property Purchase UI', () => {
  describe('BuyConfirmationModal', () => {
    it('P3B.S1.T1: renders modal with property card, price, cash, and buttons', () => {
      const onBuy = vi.fn();
      const onDecline = vi.fn();

      render(
        <BuyConfirmationModal
          isOpen={true}
          space={mediterraneanSpace}
          player={mockPlayers[0]}
          onBuy={onBuy}
          onDecline={onDecline}
        />,
      );

      expect(screen.getByTestId('buy-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('property-card')).toBeInTheDocument();
      expect(screen.getByText('$60')).toBeInTheDocument(); // price
      expect(screen.getByTestId('cash-display')).toHaveTextContent('$1,500');
      expect(screen.getByTestId('buy-button')).toBeInTheDocument();
      expect(screen.getByTestId('decline-button')).toBeInTheDocument();
    });

    it('P3B.S1.T1: Buy button fires onBuy callback', () => {
      const onBuy = vi.fn();
      const onDecline = vi.fn();

      render(
        <BuyConfirmationModal
          isOpen={true}
          space={mediterraneanSpace}
          player={mockPlayers[0]}
          onBuy={onBuy}
          onDecline={onDecline}
        />,
      );

      fireEvent.click(screen.getByTestId('buy-button'));
      expect(onBuy).toHaveBeenCalledTimes(1);
    });

    it('P3B.S1.T1: Decline button fires onDecline callback', () => {
      const onBuy = vi.fn();
      const onDecline = vi.fn();

      render(
        <BuyConfirmationModal
          isOpen={true}
          space={mediterraneanSpace}
          player={mockPlayers[0]}
          onBuy={onBuy}
          onDecline={onDecline}
        />,
      );

      fireEvent.click(screen.getByTestId('decline-button'));
      expect(onDecline).toHaveBeenCalledTimes(1);
    });

    it('P3B.S1.T1: Buy button disabled when player cannot afford', () => {
      const poorPlayer = { ...mockPlayers[0], cash: 10 };

      render(
        <BuyConfirmationModal
          isOpen={true}
          space={mediterraneanSpace}
          player={poorPlayer}
          onBuy={vi.fn()}
          onDecline={vi.fn()}
        />,
      );

      expect(screen.getByTestId('buy-button')).toBeDisabled();
      expect(screen.getByTestId('cannot-afford-warning')).toBeInTheDocument();
    });

    it('shows after-purchase cash amount', () => {
      render(
        <BuyConfirmationModal
          isOpen={true}
          space={mediterraneanSpace}
          player={mockPlayers[0]}
          onBuy={vi.fn()}
          onDecline={vi.fn()}
        />,
      );

      // After buying $60 property with $1500, should show $1,440
      expect(screen.getByText('$1,440')).toBeInTheDocument();
    });

    it('renders railroad card for railroad spaces', () => {
      render(
        <BuyConfirmationModal
          isOpen={true}
          space={railroadSpace}
          player={mockPlayers[0]}
          onBuy={vi.fn()}
          onDecline={vi.fn()}
        />,
      );

      expect(screen.getByTestId('railroad-card')).toBeInTheDocument();
    });

    it('renders utility card for utility spaces', () => {
      render(
        <BuyConfirmationModal
          isOpen={true}
          space={utilitySpace}
          player={mockPlayers[0]}
          onBuy={vi.fn()}
          onDecline={vi.fn()}
        />,
      );

      expect(screen.getByTestId('utility-card')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <BuyConfirmationModal
          isOpen={false}
          space={mediterraneanSpace}
          player={mockPlayers[0]}
          onBuy={vi.fn()}
          onDecline={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('buy-confirmation-modal')).not.toBeInTheDocument();
    });
  });
});
