'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { SoundEngine } from './engine/SoundEngine';
import type { SoundTheme } from './types';
import { SoundEvent } from './types';
import { classicTheme } from './themes/classic';

// ─── Context shape ────────────────────────────────────────────────────────────

interface SoundContextValue {
  /** Play a sound by event key */
  play: (event: SoundEvent) => void;
  /** Whether all sounds are muted */
  muted: boolean;
  /** Toggle mute on/off */
  toggleMute: () => void;
  /** 0–1 master volume */
  volume: number;
  /** Set master volume (0–1) */
  setVolume: (v: number) => void;
  /** Currently active theme */
  theme: SoundTheme;
  /** Swap to a different theme at runtime */
  setTheme: (theme: SoundTheme) => void;
  /**
   * Call once on the first meaningful user interaction (button click, etc.)
   * to pre-load all sounds. This is optional — sounds lazy-load on first
   * play — but pre-loading eliminates the first-play latency.
   */
  preload: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SoundProviderProps {
  children: ReactNode;
  /** Override the default theme (defaults to classicTheme) */
  initialTheme?: SoundTheme;
  /** Start muted (useful for tests / SSR) */
  initiallyMuted?: boolean;
}

export function SoundProvider({
  children,
  initialTheme = classicTheme,
  initiallyMuted = false,
}: SoundProviderProps) {
  const engineRef = useRef<SoundEngine | null>(null);
  const [muted, setMuted] = useState(initiallyMuted);
  const [volume, setVolumeState] = useState(initialTheme.masterVolume ?? 0.8);
  const [theme, setThemeState] = useState<SoundTheme>(initialTheme);

  // Initialise engine once on mount
  useEffect(() => {
    const engine = new SoundEngine();
    engineRef.current = engine;
    engine.loadTheme(initialTheme);
    engine.setMuted(initiallyMuted);
    return () => {
      engine.unload();
      engineRef.current = null;
    };
  }, []);

  const play = useCallback((event: SoundEvent) => {
    engineRef.current?.play(event);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    engineRef.current?.setMasterVolume(clamped);
  }, []);

  const setTheme = useCallback(
    (next: SoundTheme) => {
      setThemeState(next);
      engineRef.current?.loadTheme(next);
      // Re-apply mute state for the new theme
      engineRef.current?.setMuted(muted);
      engineRef.current?.setMasterVolume(next.masterVolume ?? volume);
    },
    [muted, volume],
  );

  const preload = useCallback(() => {
    engineRef.current?.preload();
  }, []);

  const value: SoundContextValue = {
    play,
    muted,
    toggleMute,
    volume,
    setVolume,
    theme,
    setTheme,
    preload,
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Access the sound system from any component inside <SoundProvider>.
 *
 * @example
 *   const { play, muted, toggleMute } = useSoundEngine();
 *   play(SoundEvent.DiceRoll);
 */
export function useSoundEngine(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error('useSoundEngine must be used within a <SoundProvider>');
  }
  return ctx;
}

/** Safe version — returns null if called outside a provider (useful in shared components). */
export function useSoundEngineSafe(): SoundContextValue | null {
  return useContext(SoundContext);
}
