import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Player } from '@monopoly/shared';
import { TokenType } from '@monopoly/shared';
import { JailStatusIndicator } from '../src/components/jail/JailStatusIndicator';
import { JailOptionsPanel } from '../src/components/jail/JailOptionsPanel';

const freePlayer: Player = {
  id: 'p1',
  name: 'Alice',
  token: TokenType.ScottieDog,
  cash: 1500,
  position: 5,
  properties: [],
  jailStatus: { inJail: false },
  isActive: true,
  isBankrupt: false,
  getOutOfJailFreeCards: 0,
};

const jailedPlayer: Player = {
  id: 'p2',
  name: 'Bob',
  token: TokenType.TopHat,
  cash: 1500,
  position: 10,
  properties: [],
  jailStatus: { inJail: true, turnsInJail: 1 },
  isActive: true,
  isBankrupt: false,
  getOutOfJailFreeCards: 1,
};

const jailedBrokePlayer: Player = {
  ...jailedPlayer,
  cash: 30,
  getOutOfJailFreeCards: 0,
};

const jailedThirdTurn: Player = {
  ...jailedPlayer,
  jailStatus: { inJail: true, turnsInJail: 2 },
};

describe('JailStatusIndicator', () => {
  it('renders nothing for free player', () => {
    const { container } = render(<JailStatusIndicator player={freePlayer} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders jail status for jailed player', () => {
    render(<JailStatusIndicator player={jailedPlayer} />);
    expect(screen.getByTestId('jail-status')).toBeInTheDocument();
    expect(screen.getByText(/In Jail \(Turn 2\/3\)/)).toBeInTheDocument();
  });

  it('shows turn counter correctly', () => {
    const p = {
      ...jailedPlayer,
      jailStatus: { inJail: true as const, turnsInJail: 0 },
    };
    render(<JailStatusIndicator player={p} />);
    expect(screen.getByText(/In Jail \(Turn 1\/3\)/)).toBeInTheDocument();
  });

  it('shows warning on third turn', () => {
    render(<JailStatusIndicator player={jailedThirdTurn} />);
    expect(screen.getByText(/Must exit next turn!/)).toBeInTheDocument();
  });
});

describe('JailOptionsPanel', () => {
  it('renders nothing for free player', () => {
    const { container } = render(
      <JailOptionsPanel
        player={freePlayer}
        onPayFine={() => {}}
        onUseCard={() => {}}
        onRollForDoubles={() => {}}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders jail options for jailed player', () => {
    render(
      <JailOptionsPanel
        player={jailedPlayer}
        onPayFine={() => {}}
        onUseCard={() => {}}
        onRollForDoubles={() => {}}
      />,
    );
    expect(screen.getByTestId('jail-options')).toBeInTheDocument();
    expect(screen.getByTestId('pay-fine-button')).toBeInTheDocument();
    expect(screen.getByTestId('use-card-button')).toBeInTheDocument();
    expect(screen.getByTestId('roll-doubles-button')).toBeInTheDocument();
  });

  it('pay fine button calls onPayFine', () => {
    const onPayFine = vi.fn();
    render(
      <JailOptionsPanel
        player={jailedPlayer}
        onPayFine={onPayFine}
        onUseCard={() => {}}
        onRollForDoubles={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('pay-fine-button'));
    expect(onPayFine).toHaveBeenCalled();
  });

  it('use card button calls onUseCard', () => {
    const onUseCard = vi.fn();
    render(
      <JailOptionsPanel
        player={jailedPlayer}
        onPayFine={() => {}}
        onUseCard={onUseCard}
        onRollForDoubles={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('use-card-button'));
    expect(onUseCard).toHaveBeenCalled();
  });

  it('roll for doubles button calls onRollForDoubles', () => {
    const onRoll = vi.fn();
    render(
      <JailOptionsPanel
        player={jailedPlayer}
        onPayFine={() => {}}
        onUseCard={() => {}}
        onRollForDoubles={onRoll}
      />,
    );
    fireEvent.click(screen.getByTestId('roll-doubles-button'));
    expect(onRoll).toHaveBeenCalled();
  });

  it('disables pay fine when player cannot afford', () => {
    render(
      <JailOptionsPanel
        player={jailedBrokePlayer}
        onPayFine={() => {}}
        onUseCard={() => {}}
        onRollForDoubles={() => {}}
      />,
    );
    expect(screen.getByTestId('pay-fine-button')).toBeDisabled();
  });

  it('disables use card when player has no GOOJF cards', () => {
    render(
      <JailOptionsPanel
        player={jailedBrokePlayer}
        onPayFine={() => {}}
        onUseCard={() => {}}
        onRollForDoubles={() => {}}
      />,
    );
    expect(screen.getByTestId('use-card-button')).toBeDisabled();
  });

  it('enables use card when player has GOOJF card', () => {
    render(
      <JailOptionsPanel
        player={jailedPlayer}
        onPayFine={() => {}}
        onUseCard={() => {}}
        onRollForDoubles={() => {}}
      />,
    );
    expect(screen.getByTestId('use-card-button')).not.toBeDisabled();
  });
});
