'use client';

import React from 'react';
import { TokenType } from '@monopoly/shared';
import styles from './TokenSelector.module.css';

const TOKEN_DISPLAY: Record<TokenType, { icon: string; label: string }> = {
  [TokenType.ScottieDog]: { icon: '\u{1F415}', label: 'Dog' },
  [TokenType.TopHat]: { icon: '\u{1F3A9}', label: 'Top Hat' },
  [TokenType.RaceCar]: { icon: '\u{1F3CE}\uFE0F', label: 'Race Car' },
  [TokenType.Boot]: { icon: '\u{1F462}', label: 'Boot' },
  [TokenType.Thimble]: { icon: '\u{1F9F5}', label: 'Thimble' },
  [TokenType.Iron]: { icon: '\u2668\uFE0F', label: 'Iron' },
  [TokenType.Wheelbarrow]: { icon: '\u{1F6D2}', label: 'Barrow' },
  [TokenType.Battleship]: { icon: '\u{1F6A2}', label: 'Ship' },
};

export interface TokenSelectorProps {
  selectedToken?: TokenType;
  disabledTokens?: TokenType[];
  onSelect: (token: TokenType) => void;
}

export function TokenSelector({
  selectedToken,
  disabledTokens = [],
  onSelect,
}: TokenSelectorProps) {
  const allTokens = Object.values(TokenType);

  return (
    <div className={styles.container} data-testid="token-selector">
      {allTokens.map((token) => {
        const display = TOKEN_DISPLAY[token];
        const isSelected = selectedToken === token;
        const isDisabled = disabledTokens.includes(token);

        const classNames = [
          styles.token,
          isSelected ? styles.selected : '',
          isDisabled ? styles.disabled : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={token}
            className={classNames}
            onClick={() => !isDisabled && onSelect(token)}
            disabled={isDisabled}
            aria-label={display.label}
            aria-pressed={isSelected}
            data-testid={`token-${token}`}
          >
            <span className={styles.icon}>{display.icon}</span>
            <span className={styles.label}>{display.label}</span>
          </button>
        );
      })}
    </div>
  );
}
