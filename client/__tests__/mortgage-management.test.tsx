import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MortgageManager } from '../src/components/mortgage/MortgageManager';
import { mockPlayers, mockBoard, mockProperties } from '../src/mocks/gameData';
import type { Property } from '@monopoly/shared';

// Player-1 (Alice) owns both brown properties (1 and 3)
// Property 3 (Baltic) has 2 houses — so neither can be mortgaged
const playerAlice = mockPlayers[0];

// Properties without buildings for mortgage testing
const propsNoBuildingsAlice: Property[] = [
  { ...mockProperties[0], houses: 0 }, // Mediterranean, no houses
  { ...mockProperties[1], houses: 0 }, // Baltic, no houses
];

// Properties with one mortgaged
const propsWithMortgage: Property[] = [
  { ...mockProperties[0], mortgaged: true }, // Mediterranean, mortgaged
  { ...mockProperties[1], houses: 0 }, // Baltic, not mortgaged
];

const allPropsNoBuild: Property[] = [
  ...propsNoBuildingsAlice,
  ...mockProperties.filter((p) => p.ownerId !== 'player-1'),
];

const allPropsWithMortgage: Property[] = [
  ...propsWithMortgage,
  ...mockProperties.filter((p) => p.ownerId !== 'player-1'),
];

describe('Step 3B.4 — Mortgage Management UI', () => {
  describe('MortgageManager', () => {
    it('P3B.S4.T1: opens mortgage interface showing eligible properties', () => {
      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={allPropsNoBuild}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('mortgage-manager')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean Avenue')).toBeInTheDocument();
      expect(screen.getByText('Baltic Avenue')).toBeInTheDocument();
    });

    it('P3B.S4.T2: shows mortgage value for each eligible property', () => {
      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={allPropsNoBuild}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      // Mediterranean mortgage value is $30
      expect(screen.getByTestId('mortgage-button-1')).toHaveTextContent('Mortgage for $30');
    });

    it('P3B.S4.T3: wire Mortgage calls onMortgage with propertyId', () => {
      const onMortgage = vi.fn();

      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={allPropsNoBuild}
          board={mockBoard}
          onMortgage={onMortgage}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('mortgage-button-1'));
      expect(onMortgage).toHaveBeenCalledWith(1);
    });

    it('P3B.S4.T4: shows blocked properties with buildings message', () => {
      // Using original mockProperties where Baltic has 2 houses
      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={mockProperties}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('blocked-properties')).toBeInTheDocument();
      expect(screen.getAllByText(/Sell buildings first/).length).toBeGreaterThan(0);
    });

    it('P3B.S4.T5: unmortgage mode shows cost with 10% interest', () => {
      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={allPropsWithMortgage}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('unmortgage-mode-button'));

      // Mediterranean: mortgage value $30, interest = $3, total = $33
      expect(screen.getByTestId('unmortgage-button-1')).toHaveTextContent('Unmortgage for $33');
    });

    it('P3B.S4.T6: wire Unmortgage calls onUnmortgage with propertyId', () => {
      const onUnmortgage = vi.fn();

      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={allPropsWithMortgage}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={onUnmortgage}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('unmortgage-mode-button'));
      fireEvent.click(screen.getByTestId('unmortgage-button-1'));
      expect(onUnmortgage).toHaveBeenCalledWith(1);
    });

    it('P3B.S4.T7: disables unmortgage when insufficient funds', () => {
      const poorPlayer = { ...playerAlice, cash: 5 };

      render(
        <MortgageManager
          isOpen={true}
          player={poorPlayer}
          properties={allPropsWithMortgage}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('unmortgage-mode-button'));
      expect(screen.getByTestId('unmortgage-button-1')).toBeDisabled();
    });

    it('shows empty message when no properties to unmortgage', () => {
      render(
        <MortgageManager
          isOpen={true}
          player={playerAlice}
          properties={allPropsNoBuild}
          board={mockBoard}
          onMortgage={vi.fn()}
          onUnmortgage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('unmortgage-mode-button'));
      expect(screen.getByTestId('no-properties-message')).toBeInTheDocument();
    });
  });
});
