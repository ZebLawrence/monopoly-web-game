import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpaceType } from '@monopoly/shared';
import { BuyPropertyModal } from '../src/components/gameplay/BuyPropertyModal';

const mockDecision = {
  spaceId: 1,
  spaceName: 'Mediterranean Avenue',
  cost: 60,
};

const mockSpace = {
  id: 1,
  name: 'Mediterranean Avenue',
  type: SpaceType.Property,
  position: 1,
  colorGroup: 'brown' as const,
  cost: 60,
  rentTiers: [2, 10, 30, 90, 160, 250],
  mortgageValue: 30,
  houseCost: 50,
  hotelCost: 50,
};

describe('BuyPropertyModal', () => {
  it('renders the buy property modal', () => {
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={1500}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByTestId('buy-property-modal')).toBeInTheDocument();
  });

  it('shows buy and auction buttons', () => {
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={1500}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByTestId('buy-button')).toBeInTheDocument();
    expect(screen.getByTestId('auction-button')).toBeInTheDocument();
  });

  it('buy button calls onBuy', () => {
    const onBuy = vi.fn();
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={1500}
        onBuy={onBuy}
        onAuction={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('buy-button'));
    expect(onBuy).toHaveBeenCalled();
  });

  it('auction button calls onAuction', () => {
    const onAuction = vi.fn();
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={1500}
        onBuy={() => {}}
        onAuction={onAuction}
      />,
    );
    fireEvent.click(screen.getByTestId('auction-button'));
    expect(onAuction).toHaveBeenCalled();
  });

  it('disables buy button when player cannot afford', () => {
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={30}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByTestId('buy-button')).toBeDisabled();
    expect(screen.getByTestId('cant-afford-message')).toBeInTheDocument();
  });

  it('enables buy button when player can afford', () => {
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={100}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByTestId('buy-button')).not.toBeDisabled();
    expect(screen.queryByTestId('cant-afford-message')).not.toBeInTheDocument();
  });

  it('shows property price', () => {
    render(
      <BuyPropertyModal
        decision={mockDecision}
        space={mockSpace}
        playerCash={1500}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByText('$60')).toBeInTheDocument();
  });

  it('renders railroad card for railroad space', () => {
    const rrDecision = { spaceId: 5, spaceName: 'Reading Railroad', cost: 200 };
    const rrSpace = {
      id: 5,
      name: 'Reading Railroad',
      type: SpaceType.Railroad,
      position: 5,
      cost: 200,
      mortgageValue: 100,
    };
    render(
      <BuyPropertyModal
        decision={rrDecision}
        space={rrSpace}
        playerCash={1500}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByTestId('buy-property-modal')).toBeInTheDocument();
  });

  it('renders utility card for utility space', () => {
    const utilDecision = { spaceId: 12, spaceName: 'Electric Company', cost: 150 };
    const utilSpace = {
      id: 12,
      name: 'Electric Company',
      type: SpaceType.Utility,
      position: 12,
      cost: 150,
      mortgageValue: 75,
    };
    render(
      <BuyPropertyModal
        decision={utilDecision}
        space={utilSpace}
        playerCash={1500}
        onBuy={() => {}}
        onAuction={() => {}}
      />,
    );
    expect(screen.getByTestId('buy-property-modal')).toBeInTheDocument();
  });
});
