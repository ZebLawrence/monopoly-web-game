import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  BuildingManager,
  BuildingSupplyDisplay,
  HouseIndicator,
} from '../src/components/building/BuildingManager';
import { mockPlayers, mockBoard, mockProperties } from '../src/mocks/gameData';
import type { Property } from '@monopoly/shared';

// Player-1 owns both brown properties (spaceId 1 and 3 — a monopoly)
const playerWithMonopoly = mockPlayers[0]; // Alice — owns properties 1 and 3

const fullSupply = { houses: 32, hotels: 12 };
const noHouseSupply = { houses: 0, hotels: 12 };

describe('Step 3B.3 — Building Management UI', () => {
  describe('BuildingManager', () => {
    it('P3B.S3.T1: Build button opens panel showing eligible monopolies', () => {
      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('building-manager')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean Avenue')).toBeInTheDocument();
      expect(screen.getByText('Baltic Avenue')).toBeInTheDocument();
    });

    it('P3B.S3.T2: shows house count and Add House button for each property', () => {
      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('build-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('build-row-3')).toBeInTheDocument();
      // Baltic has 2 houses in mock data
      expect(screen.getByTestId('add-house-1')).toBeInTheDocument();
    });

    it('P3B.S3.T3: grays out Add House for properties that violate even-build', () => {
      // Baltic (id=3) has 2 houses, Mediterranean (id=1) has 0
      // Mediterranean should allow building (it's the lowest)
      // Baltic should NOT allow building (it has more than minimum)
      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('add-house-1')).not.toBeDisabled(); // Mediterranean (0 houses, min)
      expect(screen.getByTestId('add-house-3')).toBeDisabled(); // Baltic (2 houses, not min)
    });

    it('P3B.S3.T4: wire Add House calls onBuildHouse with propertyId', () => {
      const onBuild = vi.fn();

      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={onBuild}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('add-house-1'));
      expect(onBuild).toHaveBeenCalledWith(1);
    });

    it('P3B.S3.T5: shows Build Hotel when property has 4 houses', () => {
      const propsWithFourHouses: Property[] = mockProperties.map((p) =>
        p.spaceId === 1 ? { ...p, houses: 4 } : p.spaceId === 3 ? { ...p, houses: 4 } : p,
      );

      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={propsWithFourHouses}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('add-house-1')).toHaveTextContent('Build Hotel');
    });

    it('P3B.S3.T7: disables build when no houses left in supply', () => {
      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={noHouseSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('add-house-1')).toBeDisabled();
    });

    it('P3B.S3.T8: sell mode shows sell buttons with half-price refund', () => {
      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('sell-mode-button'));

      // Baltic has 2 houses, house cost $50, refund = $25
      expect(screen.getByTestId('sell-house-3')).toHaveTextContent('Sell House ($25)');
    });

    it('P3B.S3.T9: wire Sell House calls onSellBuilding', () => {
      const onSell = vi.fn();

      render(
        <BuildingManager
          isOpen={true}
          player={playerWithMonopoly}
          properties={mockProperties}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={onSell}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('sell-mode-button'));
      fireEvent.click(screen.getByTestId('sell-house-3'));
      expect(onSell).toHaveBeenCalledWith(3);
    });

    it('shows no monopolies message when player has none', () => {
      const playerNoMonopoly = { ...mockPlayers[0], properties: [1] }; // only one brown

      render(
        <BuildingManager
          isOpen={true}
          player={playerNoMonopoly}
          properties={mockProperties.filter((p) => p.spaceId === 1)}
          board={mockBoard}
          supply={fullSupply}
          onBuildHouse={vi.fn()}
          onSellBuilding={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('no-monopolies')).toBeInTheDocument();
    });
  });

  describe('BuildingSupplyDisplay', () => {
    it('P3B.S3.T6: displays building supply counts', () => {
      render(<BuildingSupplyDisplay supply={fullSupply} />);
      expect(screen.getByTestId('building-supply')).toBeInTheDocument();
      expect(screen.getByText('Houses: 32/32')).toBeInTheDocument();
      expect(screen.getByText('Hotels: 12/12')).toBeInTheDocument();
    });

    it('P3B.S3.T7: shows exhaustion message when supply is 0', () => {
      render(<BuildingSupplyDisplay supply={noHouseSupply} />);
      expect(screen.getByText('No houses available')).toBeInTheDocument();
    });
  });

  describe('HouseIndicator', () => {
    it('shows correct house count', () => {
      render(<HouseIndicator houses={3} />);
      expect(screen.getByTestId('house-indicator')).toHaveTextContent('3 Houses');
    });

    it('shows hotel indicator for 5 houses', () => {
      render(<HouseIndicator houses={5} />);
      expect(screen.getByTestId('hotel-indicator')).toHaveTextContent('Hotel');
    });

    it('shows no buildings for 0 houses', () => {
      render(<HouseIndicator houses={0} />);
      expect(screen.getByText('No buildings')).toBeInTheDocument();
    });
  });
});
