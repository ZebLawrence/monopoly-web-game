# Phase 5: Mobile Optimization & Cross-Browser QA

Ensures the game plays well on phones and works across all target browsers.

**Depends on:** Phase 4
**Parallel with:** Phase 6 (partially)
**Tasks:** 31

---

### Step 5.1 — Mobile Touch Optimization

| ID       | Task                                                                                       | Test                                                                           |
| -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| P5.S1.T1 | Implement tap-on-space interaction for mobile — tap to select a space and view its details | Test on mobile: tap property space → detail card opens                         |
| P5.S1.T2 | Implement pinch-to-zoom on Pixi.js canvas using touch events                               | Test on mobile: two-finger pinch zooms board in/out smoothly                   |
| P5.S1.T3 | Implement pan/drag on zoomed board using single-finger touch                               | Test on mobile: when zoomed, single finger drag pans the view                  |
| P5.S1.T4 | Implement double-tap to reset zoom level                                                   | Test on mobile: double-tap board → zoom resets to fit-to-viewport              |
| P5.S1.T5 | Prevent browser zoom on game page — only board canvas zooms                                | Test: pinching on the game page zooms the board, not the browser viewport      |
| P5.S1.T6 | Ensure action buttons have sufficient spacing for thumb interaction                        | Visual at 375px: buttons don't overlap; enough space between to avoid mis-taps |
| P5.S1.T7 | Handle virtual keyboard appearance — chat input doesn't get hidden behind keyboard         | Test on mobile: opening keyboard to type chat message keeps input visible      |

### Step 5.2 — Responsive Layout Refinement

| ID       | Task                                                                                           | Test                                                                        |
| -------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| P5.S2.T1 | Test and fix layout at 320px viewport width (small phones)                                     | Visual: all content accessible; no horizontal overflow; text readable       |
| P5.S2.T2 | Test and fix layout at 375px viewport width (iPhone SE / standard)                             | Visual: game playable; board visible; dashboard accessible                  |
| P5.S2.T3 | Test and fix layout at 414px viewport width (larger phones)                                    | Visual: proportions look good; no wasted space                              |
| P5.S2.T4 | Test and fix layout at 768px viewport width (tablet portrait)                                  | Visual: board and dashboard both visible without scrolling                  |
| P5.S2.T5 | Test and fix layout at 1024px viewport width (tablet landscape / small desktop)                | Visual: full experience displayed; comfortable proportions                  |
| P5.S2.T6 | Test and fix layout at 1440px+ viewport width (large desktop)                                  | Visual: content well-centered; no extreme stretching                        |
| P5.S2.T7 | Implement landscape orientation handling on mobile — show board in landscape mode              | Visual: rotating phone to landscape shows wider board view                  |
| P5.S2.T8 | Implement dynamic Pixi.js canvas resolution — lower resolution on weak devices for performance | Test: on low-DPI mock, canvas renders at 1x; on high-DPI, renders at 2x max |

### Step 5.3 — Performance Optimization

| ID       | Task                                                                                           | Test                                                                              |
| -------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| P5.S3.T1 | Create sprite atlas for all board assets (tokens, houses, hotels, dice, icons)                 | Test: single texture atlas loaded instead of individual images; fewer draw calls  |
| P5.S3.T2 | Implement Pixi.js sprite batching for house/hotel rendering                                    | Test: rendering 32 houses uses batch rendering; FPS stays above 30                |
| P5.S3.T3 | Analyze and optimize Next.js bundle size — identify and code-split large dependencies          | Test: `next build` reports main bundle < 200KB gzipped                            |
| P5.S3.T4 | Implement lazy loading for Pixi.js — don't load the canvas engine until entering the game page | Test: home and lobby pages don't load Pixi.js bundle                              |
| P5.S3.T5 | Implement lazy loading for sound assets — load on first interaction, not on page load          | Test: page load doesn't fetch audio files; first action triggers audio load       |
| P5.S3.T6 | Enable Socket.IO binary parser and message compression                                         | Test: Socket.IO messages are smaller with compression enabled (compare wire size) |
| P5.S3.T7 | Profile memory usage during a 50-turn game simulation — no memory leaks                        | Test: memory usage stays stable (no unbounded growth) over 50 turns               |
| P5.S3.T8 | Implement Pixi.js ticker optimization — only render when state changes, not every frame        | Test: FPS counter shows rendering pauses when no animation is active              |

### Step 5.4 — Cross-Browser Testing

| ID       | Task                                                                        | Test                                                                |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| P5.S4.T1 | Test full game flow in Chrome (latest 2 versions) — create, join, play, win | Pass: all flows work without errors                                 |
| P5.S4.T2 | Test full game flow in Firefox (latest 2 versions)                          | Pass: all flows work without errors                                 |
| P5.S4.T3 | Test full game flow in Safari (latest 2 versions)                           | Pass: all flows work without errors; WebSocket connects             |
| P5.S4.T4 | Test full game flow in Edge (latest 2 versions)                             | Pass: all flows work without errors                                 |
| P5.S4.T5 | Test on iOS Safari (iPhone) — touch, zoom, layout, WebSocket                | Pass: game playable; touch interactions work; WebSocket stable      |
| P5.S4.T6 | Test on Android Chrome (phone) — touch, zoom, layout, WebSocket             | Pass: game playable; touch interactions work; WebSocket stable      |
| P5.S4.T7 | Test canvas rendering consistency across all browsers — no visual glitches  | Pass: board looks identical across browsers; no rendering artifacts |
| P5.S4.T8 | Test WebSocket reconnection across all browsers                             | Pass: disconnect and reconnect works on all tested browsers         |

---
