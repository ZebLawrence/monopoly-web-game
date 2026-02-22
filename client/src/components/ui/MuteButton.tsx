'use client';

/**
 * MuteButton — drop this anywhere inside <SoundProvider> to give players
 * a mute toggle and optional volume slider.
 *
 * Usage:
 *   <MuteButton />              // icon only
 *   <MuteButton showSlider />   // icon + volume slider
 */

import { useSoundEngineSafe } from '../../sounds/SoundContext';
import styles from './MuteButton.module.css';

interface MuteButtonProps {
  /** Show a volume slider beneath the mute icon (default: false) */
  showSlider?: boolean;
  className?: string;
}

export function MuteButton({ showSlider = false, className }: MuteButtonProps) {
  const sound = useSoundEngineSafe();

  // Render nothing if sound system isn't available (SSR, test env)
  if (!sound) return null;

  const { muted, toggleMute, volume, setVolume } = sound;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <button
        type="button"
        className={styles.muteBtn}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        title={muted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {muted ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
      </button>

      {showSlider && !muted && (
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Sound volume"
        />
      )}
    </div>
  );
}
