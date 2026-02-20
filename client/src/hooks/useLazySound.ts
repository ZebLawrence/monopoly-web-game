'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * Lazy-loads sound assets only on first user interaction.
 * Sound files are NOT loaded on page load — they're fetched
 * when the user first triggers an action (click/tap).
 */

interface SoundMap {
  [key: string]: string; // name -> URL
}

interface SoundCache {
  loaded: boolean;
  buffers: Map<string, AudioBuffer>;
  context: AudioContext | null;
}

export function useLazySound(sounds: SoundMap) {
  const cacheRef = useRef<SoundCache>({
    loaded: false,
    buffers: new Map(),
    context: null,
  });
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadSounds = useCallback(async () => {
    if (cacheRef.current.loaded) return;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    loadPromiseRef.current = (async () => {
      try {
        const ctx = new AudioContext();
        cacheRef.current.context = ctx;

        const entries = Object.entries(sounds);
        const results = await Promise.allSettled(
          entries.map(async ([name, url]) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            return { name, audioBuffer };
          }),
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            cacheRef.current.buffers.set(result.value.name, result.value.audioBuffer);
          }
        }

        cacheRef.current.loaded = true;
      } catch {
        // Audio not supported — silently continue
      }
    })();

    return loadPromiseRef.current;
  }, [sounds]);

  const play = useCallback(
    async (name: string) => {
      if (!cacheRef.current.loaded) {
        await loadSounds();
      }

      const ctx = cacheRef.current.context;
      const buffer = cacheRef.current.buffers.get(name);
      if (!ctx || !buffer) return;

      // Resume context if suspended (autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    },
    [loadSounds],
  );

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.context?.close();
    };
  }, []);

  return { play, loadSounds, loaded: cacheRef.current.loaded };
}
