'use client';

import { useEffect, useRef } from 'react';
import type { LastResolution } from '@monopoly/shared';
import { useToast } from '../ui/Toast';

export interface SpaceNotificationProps {
  resolution: LastResolution | null | undefined;
  localPlayerName: string;
}

export function SpaceNotification({ resolution, localPlayerName }: SpaceNotificationProps) {
  const { showToast } = useToast();
  const lastResolution = useRef<LastResolution | null>(null);

  useEffect(() => {
    if (!resolution) return;
    // Avoid duplicate toasts for the same resolution
    if (
      lastResolution.current?.type === resolution.type &&
      lastResolution.current?.spaceName === resolution.spaceName &&
      lastResolution.current?.amount === resolution.amount
    ) {
      return;
    }
    lastResolution.current = resolution;

    switch (resolution.type) {
      case 'rentPayment': {
        const ownerName = resolution.ownerName ?? 'someone';
        showToast(
          `Rent: Pay $${(resolution.amount ?? 0).toLocaleString()} to ${ownerName}`,
          'warning',
        );
        break;
      }
      case 'tax':
        showToast(
          `${resolution.spaceName}: Pay $${(resolution.amount ?? 0).toLocaleString()}`,
          'warning',
        );
        break;
      case 'passedGo':
        showToast('Passed Go! Collected $200', 'success');
        break;
      case 'goToJail':
        showToast('Go to Jail!', 'error');
        break;
      case 'threeDoublesToJail':
        showToast('Three doubles! Go to Jail!', 'error');
        break;
      case 'freedFromJail':
        showToast('Freed from Jail!', 'success');
        break;
      case 'forcedJailExit':
        showToast('Forced out of Jail — paid $50', 'warning');
        break;
      case 'stayInJail':
        showToast('Still in Jail — no doubles', 'info');
        break;
      case 'paidJailFine':
        showToast("Paid $50 jail fine — you're free!", 'success');
        break;
      case 'usedJailCard':
        showToast('Used Get Out of Jail Free card!', 'success');
        break;
      case 'ownProperty':
        // No toast for landing on own property
        break;
      default:
        break;
    }
  }, [resolution, showToast, localPlayerName]);

  return null;
}
