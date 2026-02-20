import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AuctionPanel,
  AuctionTimer,
  AuctionResult,
  type AuctionInfo,
} from '../src/components/auction/AuctionPanel';
import { mockPlayers, mockBoard } from '../src/mocks/gameData';

const mediterraneanSpace = mockBoard.find((s) => s.id === 1)!;

const baseAuction: AuctionInfo = {
  propertyId: 1,
  highBid: 0,
  highBidderId: null,
  eligiblePlayers: ['player-1', 'player-2', 'player-3'],
  passedPlayers: [],
};

describe('Step 3B.1 — Auction UI', () => {
  describe('AuctionPanel', () => {
    it('P3B.S1.T4: renders auction panel with property, current bid, timer', () => {
      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={baseAuction}
          currentPlayerId="player-1"
          players={mockPlayers}
          timerSeconds={15}
          onBid={vi.fn()}
          onPass={vi.fn()}
        />,
      );

      expect(screen.getByTestId('auction-panel')).toBeInTheDocument();
      expect(screen.getByTestId('property-card')).toBeInTheDocument();
      expect(screen.getByTestId('current-bid')).toHaveTextContent('No bids yet');
      expect(screen.getByTestId('auction-timer')).toBeInTheDocument();
    });

    it('P3B.S1.T4: displays high bidder name when bid exists', () => {
      const auctionWithBid: AuctionInfo = {
        ...baseAuction,
        highBid: 50,
        highBidderId: 'player-2',
      };

      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={auctionWithBid}
          currentPlayerId="player-1"
          players={mockPlayers}
          onBid={vi.fn()}
          onPass={vi.fn()}
        />,
      );

      expect(screen.getByTestId('current-bid')).toHaveTextContent('$50');
      expect(screen.getByTestId('high-bidder')).toHaveTextContent('Bob');
    });

    it('P3B.S1.T5: bid increment buttons adjust bid amount', () => {
      const auctionWithBid: AuctionInfo = {
        ...baseAuction,
        highBid: 50,
        highBidderId: 'player-2',
      };

      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={auctionWithBid}
          currentPlayerId="player-1"
          players={mockPlayers}
          onBid={vi.fn()}
          onPass={vi.fn()}
        />,
      );

      // Initial bid should be highBid + 1 = 51
      const bidInput = screen.getByTestId('bid-input') as HTMLInputElement;
      expect(Number(bidInput.value)).toBe(51);

      // Click $10 increment
      fireEvent.click(screen.getByTestId('bid-increment-10'));
      expect(Number(bidInput.value)).toBe(61);
    });

    it('P3B.S1.T6: Place Bid button calls onBid with amount', () => {
      const onBid = vi.fn();
      const auctionWithBid: AuctionInfo = {
        ...baseAuction,
        highBid: 50,
        highBidderId: 'player-2',
      };

      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={auctionWithBid}
          currentPlayerId="player-1"
          players={mockPlayers}
          onBid={onBid}
          onPass={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('place-bid-button'));
      expect(onBid).toHaveBeenCalledWith(51);
    });

    it('P3B.S1.T7: Pass button calls onPass and shows passed message', () => {
      const onPass = vi.fn();
      const passedAuction: AuctionInfo = {
        ...baseAuction,
        passedPlayers: ['player-1'],
      };

      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={passedAuction}
          currentPlayerId="player-1"
          players={mockPlayers}
          onBid={vi.fn()}
          onPass={onPass}
        />,
      );

      expect(screen.getByTestId('passed-message')).toBeInTheDocument();
      expect(screen.queryByTestId('bid-controls')).not.toBeInTheDocument();
    });

    it('P3B.S1.T3a: declining player appears as eligible bidder', () => {
      // The declining player (player-1) should be in eligiblePlayers
      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={baseAuction}
          currentPlayerId="player-1"
          players={mockPlayers}
          onBid={vi.fn()}
          onPass={vi.fn()}
        />,
      );

      const biddersInfo = screen.getByTestId('bidders-info');
      expect(biddersInfo).toHaveTextContent('Alice');
      expect(screen.getByTestId('bid-controls')).toBeInTheDocument();
    });

    it('shows passed players with strikethrough in bidders info', () => {
      const auctionWithPass: AuctionInfo = {
        ...baseAuction,
        passedPlayers: ['player-3'],
      };

      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={auctionWithPass}
          currentPlayerId="player-1"
          players={mockPlayers}
          onBid={vi.fn()}
          onPass={vi.fn()}
        />,
      );

      expect(screen.getByText(/Charlie \(Passed\)/)).toBeInTheDocument();
    });

    it('disables Place Bid when player cannot afford', () => {
      const poorPlayer = { ...mockPlayers[0], cash: 0 };
      const players = [poorPlayer, ...mockPlayers.slice(1)];

      render(
        <AuctionPanel
          isOpen={true}
          space={mediterraneanSpace}
          auction={baseAuction}
          currentPlayerId="player-1"
          players={players}
          onBid={vi.fn()}
          onPass={vi.fn()}
        />,
      );

      expect(screen.getByTestId('place-bid-button')).toBeDisabled();
    });
  });

  describe('AuctionTimer', () => {
    it('P3B.S1.T8: displays countdown timer', () => {
      render(<AuctionTimer seconds={15} />);
      expect(screen.getByTestId('auction-timer')).toHaveTextContent('15s');
    });

    it('P3B.S1.T8: shows low warning when <= 5 seconds', () => {
      const { container } = render(<AuctionTimer seconds={3} />);
      expect(container.querySelector('.timerLow')).toBeInTheDocument();
    });
  });

  describe('AuctionResult', () => {
    it('P3B.S1.T9: shows winner announcement', () => {
      render(
        <AuctionResult
          isOpen={true}
          space={mediterraneanSpace}
          winnerName="Bob"
          winningBid={120}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('auction-winner')).toHaveTextContent(
        'Bob wins the auction for $120!',
      );
    });

    it('P3B.S1.T10: shows no-bids result', () => {
      render(
        <AuctionResult
          isOpen={true}
          space={mediterraneanSpace}
          winnerName={null}
          winningBid={0}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId('no-bids-result')).toHaveTextContent(
        'No bids — Mediterranean Avenue remains unowned',
      );
    });
  });
});
