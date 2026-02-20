import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  RentBreakdown,
  RentPaymentNotification,
  CashTransferAnimation,
  InsufficientFundsWarning,
} from '../src/components/property/RentNotification';
import { mockPlayers, mockProperties } from '../src/mocks/gameData';
import { fireEvent } from '@testing-library/react';

const mediterraneanProp = mockProperties.find((p) => p.spaceId === 1)!;
const connProp = mockProperties.find((p) => p.spaceId === 9)!; // 3 houses

describe('Step 3B.2 — Rent Collection UI', () => {
  describe('RentBreakdown', () => {
    it('P3B.S2.T1: shows base rent with monopoly bonus', () => {
      render(<RentBreakdown property={mediterraneanProp} rentAmount={4} hasMonopoly={true} />);

      expect(screen.getByTestId('rent-breakdown')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean Avenue')).toBeInTheDocument();
      expect(screen.getByText(/Base Rent/)).toBeInTheDocument();
      expect(screen.getByText(/Monopoly Bonus/)).toBeInTheDocument();
    });

    it('P3B.S2.T1: shows rent with houses', () => {
      render(<RentBreakdown property={connProp} rentAmount={300} hasMonopoly={true} />);

      expect(screen.getByText(/3 Houses/)).toBeInTheDocument();
    });

    it('P3B.S2.T1: shows hotel rent', () => {
      const hotelProp = { ...connProp, houses: 5 };

      render(<RentBreakdown property={hotelProp} rentAmount={600} hasMonopoly={true} />);

      expect(screen.getByText(/Hotel/)).toBeInTheDocument();
    });
  });

  describe('RentPaymentNotification', () => {
    it('P3B.S2.T2: shows payer notification', () => {
      render(
        <RentPaymentNotification
          isOpen={true}
          property={mediterraneanProp}
          rentAmount={4}
          payer={mockPlayers[1]}
          receiver={mockPlayers[0]}
          hasMonopoly={true}
          isPayer={true}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('rent-payer-message')).toHaveTextContent(
        'You paid $4 rent to Alice for Mediterranean Avenue',
      );
    });

    it('P3B.S2.T3: shows receiver notification', () => {
      render(
        <RentPaymentNotification
          isOpen={true}
          property={mediterraneanProp}
          rentAmount={4}
          payer={mockPlayers[1]}
          receiver={mockPlayers[0]}
          hasMonopoly={true}
          isPayer={false}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('rent-receiver-message')).toHaveTextContent(
        'Bob paid you $4 rent for Mediterranean Avenue',
      );
    });
  });

  describe('CashTransferAnimation', () => {
    it('P3B.S2.T4: shows animated cash transfer', () => {
      render(<CashTransferAnimation fromName="Bob" toName="Alice" amount={100} />);

      expect(screen.getByTestId('cash-transfer-animation')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('-$100')).toBeInTheDocument();
      expect(screen.getByText('+$100')).toBeInTheDocument();
    });
  });

  describe('InsufficientFundsWarning', () => {
    it('P3B.S2.T5: shows warning with shortfall and action links', () => {
      const onSell = vi.fn();
      const onMortgage = vi.fn();

      render(
        <InsufficientFundsWarning
          isOpen={true}
          amountOwed={500}
          playerCash={100}
          onSellBuildings={onSell}
          onMortgage={onMortgage}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('insufficient-funds-warning')).toBeInTheDocument();
      expect(screen.getByText(/You owe/)).toHaveTextContent('$500');
      expect(screen.getByText(/only have/)).toHaveTextContent('$100');
      expect(screen.getByText(/\$400/)).toBeInTheDocument(); // shortfall

      fireEvent.click(screen.getByTestId('sell-buildings-link'));
      expect(onSell).toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('mortgage-link'));
      expect(onMortgage).toHaveBeenCalled();
    });

    it('does not render when isOpen is false', () => {
      render(
        <InsufficientFundsWarning
          isOpen={false}
          amountOwed={500}
          playerCash={100}
          onSellBuildings={vi.fn()}
          onMortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByTestId('insufficient-funds-warning')).not.toBeInTheDocument();
    });
  });
});
