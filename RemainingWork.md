# Remaining Work

Audit conducted: 2026-02-20. All component and engine code is implemented; the primary gap is that the two main route pages are stubs, leaving the application non-functional despite the underlying infrastructure being complete.

---

## Audit Findings by Phase

### Phase 0 — Project Foundation ✅ Complete

All 45 tasks done. No remaining work.

---

### Phase 1A — Game Engine ✅ Complete

All 136 tasks done across `shared/src/engine/`. No remaining work.

---

### Phase 1B — UI Foundation ⚠️ One Deviation

All tasks complete with one note: [`PixiBoard.tsx`](client/src/components/board/PixiBoard.tsx) uses the HTML5 Canvas 2D API rather than the Pixi.js library despite its name. It is functionally equivalent for current needs. If Pixi.js is required for performance (see [P1B.S3.T1](plan/Phase1B.md#step-1b3--pixi.js-board-renderer)), the renderer would need to be rewritten using `Application` from `pixi.js`.

---

### Phase 2 — Real-Time Integration ✅ Complete

All 38 tasks done. No remaining work.

---

### Phase 3A — Core Gameplay UI ❌ Critical Gap

All components are built but [`app/game/[gameId]/page.tsx`](client/app/game/%5BgameId%5D/page.tsx) is a 10-line placeholder — none of the gameplay components are mounted. See **Priority 1** below.

Affected tasks: [P3A.S1](plan/Phase3A.md#step-3a1--dice-rolling-flow), [P3A.S2](plan/Phase3A.md#step-3a2--space-landing-resolution-ui), [P3A.S3](plan/Phase3A.md#step-3a3--card-draw-flow), [P3A.S4](plan/Phase3A.md#step-3a4--jail-ui--flow), [P3A.S5](plan/Phase3A.md#step-3a5--turn-flow-ui) — all steps.

---

### Phase 3B — Property & Economy UI ❌ Critical Gap

All components are built but not mounted in the game page.

Affected tasks: [P3B.S1](plan/Phase3B.md#step-3b1--property-purchase--auction-ui), [P3B.S2](plan/Phase3B.md#step-3b2--rent-collection-ui), [P3B.S3](plan/Phase3B.md#step-3b3--building-management-ui), [P3B.S4](plan/Phase3B.md#step-3b4--mortgage-management-ui), [P3B.S5](plan/Phase3B.md#step-3b5--trading-ui) — all steps.

---

### Phase 4 — Endgame & Polish ❌ Critical Gap

All components are built but not wired up. Additionally, [`app/page.tsx`](client/app/page.tsx) links to `/lobby/new` via `<Link>` instead of calling `createRoom` via socket.

Affected tasks: [P4.S1](plan/Phase4.md#step-41--bankruptcy-flow), [P4.S2](plan/Phase4.md#step-42--endgame--victory), [P4.S3](plan/Phase4.md#step-43--spectator-mode-eliminated-players), [P4.S4](plan/Phase4.md#step-44--activity-feed--notifications), [P4.S5](plan/Phase4.md#step-45--in-game-chat), [P4.S6](plan/Phase4.md#step-46--visual--ux-polish).

---

### Phase 5 — Mobile & QA ❌ Not Started

| Task                           | Status                                              | Phase Ref                                                           |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------- |
| Touch zoom/pan                 | ✅ Implemented in `GameLayout.tsx`                  | [P5.S1.T2–T4](plan/Phase5.md#step-51--mobile-touch-optimization)    |
| Board lazy loading             | ✅ `LazyBoard.tsx` exists                           | [P5.S3.T4](plan/Phase5.md#step-53--performance-optimization)        |
| Responsive layout verification | ❌                                                  | [P5.S2.T1–T8](plan/Phase5.md#step-52--responsive-layout-refinement) |
| Bundle size analysis           | ❌                                                  | [P5.S3.T3](plan/Phase5.md#step-53--performance-optimization)        |
| Lazy-load sound assets         | ❌                                                  | [P5.S3.T5](plan/Phase5.md#step-53--performance-optimization)        |
| Socket.IO binary/compression   | ✅ `perMessageDeflate` enabled                      | [P5.S3.T6](plan/Phase5.md#step-53--performance-optimization)        |
| Canvas render-on-change only   | ❌                                                  | [P5.S3.T8](plan/Phase5.md#step-53--performance-optimization)        |
| Cross-browser testing          | ❌                                                  | [P5.S4.T1–T8](plan/Phase5.md#step-54--cross-browser-testing)        |
| `client/Dockerfile`            | ❌ **Missing** — `docker-compose.yml` references it | [P6.S5.T1](plan/Phase6.md#step-65--production-deployment)           |

---

### Phase 6 — Testing & Deployment ⚠️ Partial

| Task                                      | Status                                      | Phase Ref                                                         |
| ----------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Unit tests exist                          | ✅                                          | [P6.S1](plan/Phase6.md#step-61--unit-test-completion)             |
| Coverage targets met                      | ❌ Not verified                             | [P6.S1.T1–T18](plan/Phase6.md#step-61--unit-test-completion)      |
| Integration tests                         | ✅ `phase6-integration.test.ts` (816 lines) | [P6.S2.T1–T8](plan/Phase6.md#step-62--integration-tests)          |
| E2E tests written                         | ✅ `e2e/game.spec.ts` (729 lines)           | [P6.S3](plan/Phase6.md#step-63--e2e-tests-playwright)             |
| E2E tests pass                            | ❌ Will fail until pages are wired          | [P6.S3.T1–T16](plan/Phase6.md#step-63--e2e-tests-playwright)      |
| CI pipeline (lint/test/build/E2E)         | ✅                                          | [P6.S4.T1–T3](plan/Phase6.md#step-64--cicd-pipeline-finalization) |
| Staging/production deploy workflows       | ✅                                          | [P6.S4.T4–T5](plan/Phase6.md#step-64--cicd-pipeline-finalization) |
| README badges                             | ❌                                          | [P6.S4.T6](plan/Phase6.md#step-64--cicd-pipeline-finalization)    |
| Deployment runbook                        | ✅ `docs/deployment-runbook.md`             | [P6.S5.T10](plan/Phase6.md#step-65--production-deployment)        |
| SSL/TLS (infra config)                    | ❌                                          | [P6.S5.T4](plan/Phase6.md#step-65--production-deployment)         |
| Rate limiting middleware                  | ✅ Exists in `server/src/middleware/`       | [P6.S5.T5](plan/Phase6.md#step-65--production-deployment)         |
| Health check endpoints `/health` `/ready` | ✅                                          | [P6.S5.T6](plan/Phase6.md#step-65--production-deployment)         |
| Error tracking (Sentry)                   | ❌                                          | [P6.S5.T7](plan/Phase6.md#step-65--production-deployment)         |
| Latency monitoring                        | ❌                                          | [P6.S5.T8](plan/Phase6.md#step-65--production-deployment)         |
| Load testing                              | ❌                                          | [P6.S5.T9](plan/Phase6.md#step-65--production-deployment)         |

---

## Prioritized Work Plan

### Priority 1 — Wire the Route Pages (makes the app functional)

These three changes connect all the already-built infrastructure to the actual browser routes. Nothing is playable until these are done.

1. **Fix the home page** — replace `<Link href="/lobby/new">` with a button that calls `createRoom` via socket and navigates to the returned room code.
   - [`app/page.tsx`](client/app/page.tsx)
   - Spec: [P2.S3.T1](plan/Phase2.md#step-23--lobby--room-management), [P1B.S1.T3](plan/Phase1B.md#step-1b1--nextjs-app-shell)

2. **Wire the Lobby page** — replace the 10-line placeholder with the `WaitingRoom` component from `Lobby.tsx`, connected to `useGameSocket` for real-time player list, token selection, and start game.
   - [`app/lobby/[roomCode]/page.tsx`](client/app/lobby/%5BroomCode%5D/page.tsx)
   - Spec: [P2.S3.T3–T9](plan/Phase2.md#step-23--lobby--room-management), [P1B.S7.T3–T7](plan/Phase1B.md#step-1b7--lobby-ui)

3. **Wire the Game page** — replace the 10-line placeholder with `GameStateProvider` wrapping `GameLayout` + `GameplayController` + all gameplay modals, connected to `useGameState`.
   - [`app/game/[gameId]/page.tsx`](client/app/game/%5BgameId%5D/page.tsx)
   - Spec: [P3A.S1–S5](plan/Phase3A.md), [P3B.S1–S5](plan/Phase3B.md), [P4.S1–S6](plan/Phase4.md)

---

### Priority 2 — Verify End-to-End Gameplay Flows

Once the pages are wired, manually verify each flow works correctly through the full client→server→engine→client cycle:

4. **Core turn flow** — roll dice → move token → resolve space (tax, Go To Jail, passing Go) → end turn → next player
   - Spec: [P3A.S1](plan/Phase3A.md#step-3a1--dice-rolling-flow), [P3A.S2](plan/Phase3A.md#step-3a2--space-landing-resolution-ui), [P3A.S5](plan/Phase3A.md#step-3a5--turn-flow-ui)

5. **Card draw flow** — Chance and Community Chest card reveals, all effect types (cash, move, jail, GOOJF, repairs, nearest railroad/utility)
   - Spec: [P3A.S3](plan/Phase3A.md#step-3a3--card-draw-flow)

6. **Jail flow** — enter jail, exit via pay fine / GOOJF card / doubles roll, forced exit on 3rd turn
   - Spec: [P3A.S4](plan/Phase3A.md#step-3a4--jail-ui--flow)

7. **Property economy flow** — unowned landing → buy or auction → rent payment → build houses/hotel → mortgage/unmortgage → trade
   - Spec: [P3B.S1](plan/Phase3B.md#step-3b1--property-purchase--auction-ui), [P3B.S2](plan/Phase3B.md#step-3b2--rent-collection-ui), [P3B.S3](plan/Phase3B.md#step-3b3--building-management-ui), [P3B.S4](plan/Phase3B.md#step-3b4--mortgage-management-ui), [P3B.S5](plan/Phase3B.md#step-3b5--trading-ui)

8. **Endgame flow** — bankruptcy declaration → asset transfer → elimination → victory screen → play again
   - Spec: [P4.S1](plan/Phase4.md#step-41--bankruptcy-flow), [P4.S2](plan/Phase4.md#step-42--endgame--victory), [P4.S3](plan/Phase4.md#step-43--spectator-mode-eliminated-players)

9. **Social features** — activity feed, chat (including spectator chat), sound toggle
   - Spec: [P4.S4](plan/Phase4.md#step-44--activity-feed--notifications), [P4.S5](plan/Phase4.md#step-45--in-game-chat)

---

### Priority 3 — Docker & Missing Infrastructure

10. **Create `client/Dockerfile`** — `docker-compose.yml` references it but it doesn't exist, so `docker compose up` fails.
    - Spec: [P6.S5.T1](plan/Phase6.md#step-65--production-deployment)
    - Model after [`server/Dockerfile`](server/Dockerfile): multi-stage build using pnpm, build shared, then build client with `next build`, production image runs `next start`.

11. **Run and fix E2E tests** — `e2e/game.spec.ts` is fully written (729 lines, 16 scenarios) but all tests will fail until Priority 1 is done. After wiring the pages, run `pnpm exec playwright test` and fix any gaps.
    - Spec: [P6.S3.T1–T16](plan/Phase6.md#step-63--e2e-tests-playwright)

---

### Priority 4 — Test Coverage & Phase 5 Polish

12. **Verify unit test coverage targets** — run `pnpm test -- --coverage` across all packages and address any uncovered branches identified in [P6.S1.T1–T18](plan/Phase6.md#step-61--unit-test-completion).

13. **Canvas render optimization** — the board currently re-renders on every state change; add a dirty-check so it only redraws when relevant state changes.
    - Spec: [P5.S3.T8](plan/Phase5.md#step-53--performance-optimization)

14. **Responsive layout verification** — test and fix at 320px, 375px, 414px, 768px, 1024px, 1440px viewports.
    - Spec: [P5.S2.T1–T8](plan/Phase5.md#step-52--responsive-layout-refinement)

15. **Bundle size analysis** — run `next build` and check if main bundle is under 200KB gzipped; code-split large dependencies if not.
    - Spec: [P5.S3.T3](plan/Phase5.md#step-53--performance-optimization)

16. **Cross-browser testing** — Chrome, Firefox, Safari, Edge (latest 2 versions), iOS Safari, Android Chrome.
    - Spec: [P5.S4.T1–T8](plan/Phase5.md#step-54--cross-browser-testing)

---

### Priority 5 — Production Hardening

17. **README badges** — add CI status badge to README.
    - Spec: [P6.S4.T6](plan/Phase6.md#step-64--cicd-pipeline-finalization)

18. **Error tracking** — integrate Sentry (or equivalent) into both client and server.
    - Spec: [P6.S5.T7](plan/Phase6.md#step-65--production-deployment)

19. **Latency monitoring** — set up p50/p95/p99 WebSocket latency dashboard.
    - Spec: [P6.S5.T8](plan/Phase6.md#step-65--production-deployment)

20. **SSL/TLS** — configure HTTPS + WSS for production deployment.
    - Spec: [P6.S5.T4](plan/Phase6.md#step-65--production-deployment)

21. **Load testing** — simulate 100 concurrent rooms (200+ connections).
    - Spec: [P6.S5.T9](plan/Phase6.md#step-65--production-deployment)
