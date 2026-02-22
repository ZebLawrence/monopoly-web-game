/**
 * SoundEngine — thin Howler.js wrapper.
 *
 * Responsibilities:
 *  - Load a SoundTheme (individual files OR sprite)
 *  - Play sounds by SoundEvent key with per-event volume
 *  - Handle mute / master volume
 *  - Survive iOS autoplay lock (Howler unlocks on first user gesture automatically)
 *  - Tear down cleanly on theme swap
 *
 * This is NOT a React component — it's a plain class so it can be used
 * as a stable singleton inside a React ref.
 */

import { Howl } from 'howler';
import type { SoundTheme } from '../types';
import { SoundEvent } from '../types';

export class SoundEngine {
  /**
   * Howl instances are created LAZILY on first play(), not at loadTheme().
   * This prevents Chrome/Safari from logging AudioContext autoplay warnings
   * because no Web Audio object is touched until after a real user gesture.
   */
  private howls = new Map<SoundEvent, Howl>();
  private spriteHowl: Howl | null = null;
  private theme: SoundTheme | null = null;
  private muted = false;
  private masterVolume = 0.8;

  // ─── Theme loading ────────────────────────────────────────────────────────

  /**
   * Store the theme config only — no Howl instances are created here.
   * AudioContext stays untouched until the user's first play() call.
   */
  loadTheme(theme: SoundTheme) {
    this.unload();
    this.theme = theme;
    this.masterVolume = theme.masterVolume ?? 0.8;
    // No Howl construction — fully lazy.
  }

  /**
   * Build (or return cached) Howl for a single-file event.
   * Called from play() on demand.
   */
  private getOrCreateHowl(event: SoundEvent): Howl | null {
    const existing = this.howls.get(event);
    if (existing) return existing;

    const src = this.theme?.files?.[event];
    if (!src) return null;

    const sources = Array.isArray(src) ? src : [src];
    const vol = (this.theme?.volume?.[event] ?? 1.0) * this.masterVolume;

    const howl = new Howl({
      src: sources,
      volume: this.muted ? 0 : vol,
      // html5: true uses the HTML5 <audio> element instead of Web Audio API.
      // This sidesteps the AudioContext autoplay gesture requirement — the
      // browser only requires that the user has interacted with the page at
      // some point, not that the play() call is directly in a gesture handler.
      // This matches the behaviour of `new Audio()` which worked in testing.
      html5: true,
      onloaderror: (_id: number, err: unknown) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[SoundEngine] Failed to load "${event}":`, sources, err);
        }
      },
      onplayerror: (_id: number, err: unknown) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[SoundEngine] Failed to play "${event}":`, err);
        }
        // Howler will fire 'unlock' once the user's next gesture clears the
        // AudioContext suspension — retry then.
        howl.once('unlock', () => howl.play());
      },
    });

    this.howls.set(event, howl);
    return howl;
  }

  /** Build (or return cached) sprite Howl. Called from play() on demand. */
  private getOrCreateSprite(): Howl | null {
    if (this.spriteHowl) return this.spriteHowl;
    if (!this.theme?.sprite || !this.theme.spriteMap) return null;

    const sprite: Record<string, [number, number]> = {};
    for (const [event, timing] of Object.entries(this.theme.spriteMap) as [
      SoundEvent,
      [number, number],
    ][]) {
      sprite[event] = timing;
    }

    const src = Array.isArray(this.theme.sprite) ? this.theme.sprite : [this.theme.sprite];
    this.spriteHowl = new Howl({ src, sprite, volume: this.muted ? 0 : this.masterVolume });
    return this.spriteHowl;
  }

  /**
   * Eagerly create and load all Howl instances.
   * Call this inside a user-gesture handler (e.g. the Roll Dice button click)
   * to pre-buffer sounds before they're needed, eliminating first-play latency.
   */
  preload() {
    if (!this.theme) return;

    if (this.theme.sprite && this.theme.spriteMap) {
      this.getOrCreateSprite()?.load();
      return;
    }

    if (this.theme.files) {
      for (const event of Object.keys(this.theme.files) as SoundEvent[]) {
        this.getOrCreateHowl(event)?.load();
      }
    }
  }

  // ─── Playback ─────────────────────────────────────────────────────────────

  play(event: SoundEvent) {
    if (this.muted) return;

    // Sprite mode
    if (this.theme?.sprite && this.theme.spriteMap?.[event]) {
      this.getOrCreateSprite()?.play(event);
      return;
    }

    // Individual file mode — Howl is created here on first play
    this.getOrCreateHowl(event)?.play();
  }

  // ─── Volume / mute ────────────────────────────────────────────────────────

  setMuted(muted: boolean) {
    this.muted = muted;
    this.spriteHowl?.mute(muted);
    for (const howl of this.howls.values()) {
      howl.mute(muted);
    }
  }

  isMuted() {
    return this.muted;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.spriteHowl) {
      this.spriteHowl.volume(this.masterVolume);
      return;
    }
    for (const [event, howl] of this.howls.entries()) {
      const perEvent = this.theme?.volume?.[event] ?? 1.0;
      howl.volume(perEvent * this.masterVolume);
    }
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  unload() {
    this.spriteHowl?.unload();
    this.spriteHowl = null;
    for (const howl of this.howls.values()) {
      howl.unload();
    }
    this.howls.clear();
    this.theme = null;
  }
}
