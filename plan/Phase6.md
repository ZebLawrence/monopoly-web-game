# Phase 6: Testing, CI/CD & Deployment

Comprehensive testing, pipeline hardening, and production deployment.

**Depends on:** Phase 4 (E2E needs full game)
**Parallel with:** Phase 5 (unit/integration can start earlier)
**Tasks:** 58

---

### Step 6.1 — Unit Test Completion

| ID | Task | Test |
|----|------|------|
| P6.S1.T1 | Achieve 100% branch coverage for dice and movement logic (1A.3) | Coverage report: all branches in dice/movement modules covered |
| P6.S1.T2 | Achieve 100% branch coverage for space resolution (1A.4) — every space type, every ownership scenario | Coverage report: all branches in space resolution covered |
| P6.S1.T3 | Achieve 100% branch coverage for card effects (1A.5) — every card in both decks | Coverage report: all 32 card effects covered; all branches |
| P6.S1.T4 | Achieve 100% branch coverage for property management (1A.6) — buy, auction, build, mortgage | Coverage report: all branches in property management covered |
| P6.S1.T5 | Achieve 100% branch coverage for trading (1A.7) — propose, validate, accept, reject, counter | Coverage report: all trading logic branches covered |
| P6.S1.T6 | Achieve 100% branch coverage for jail (1A.8) — entry, exit by all methods, forced exit | Coverage report: all jail logic branches covered |
| P6.S1.T7 | Achieve 100% branch coverage for bankruptcy (1A.9) — to player, to bank, elimination, win check | Coverage report: all bankruptcy branches covered |
| P6.S1.T8 | Edge case tests: player lands on Go exactly, player wraps around multiple times with card effects | Tests pass for all edge cases |
| P6.S1.T9 | Edge case tests: simultaneous trades, building at max supply, mortgage during debt | Tests pass for all edge cases |
| P6.S1.T10 | Edge case tests: 2-player specific scenarios (bankruptcy immediately ends game) | Tests pass: 2-player bankruptcy triggers win |
| P6.S1.T11 | Edge case tests: Chance "nearest railroad" from all 3 Chance positions (7→15, 22→25, 36→5 with Go-pass) — both owned and unowned scenarios | Tests pass for all 6 scenarios |
| P6.S1.T12 | Edge case tests: Chance "nearest utility" from all 3 Chance positions (7→12, 22→28, 36→12 with Go-pass) — both owned and unowned scenarios | Tests pass for all 6 scenarios |
| P6.S1.T13 | Edge case tests: both GOOJF cards held simultaneously — use Chance GOOJF returns to Chance deck, use CC GOOJF returns to CC deck | Tests pass: correct deck receives the returned card |
| P6.S1.T14 | Edge case tests: building auction — 3 players want to build, only 2 houses available → 2 auctions conducted | Tests pass: auctions resolve correctly |
| P6.S1.T15 | Edge case tests: Chance card "Take a trip to Reading Railroad" from pos 36 → passes Go → collects $200 + resolves Reading Railroad | Tests pass: $200 awarded before railroad resolution |
| P6.S1.T16 | Edge case tests: Chance card triggers movement to another Chance/CC space → second card drawn and resolved | Tests pass: chain of card effects processed correctly |
| P6.S1.T17 | Edge case tests: CC "Street repairs" with $40/house and $115/hotel rates (NOT $25/$100 Chance rates) — verify correct rates for each deck | Tests pass: Chance repairs at $25/$100; CC repairs at $40/$115 |
| P6.S1.T18 | Edge case tests: declining player participates in and wins their own auction after declining to buy | Tests pass: decliner bids, wins, receives property at auction price (may be different from face value) |

### Step 6.2 — Integration Tests

| ID | Task | Test |
|----|------|------|
| P6.S2.T1 | Integration test: full room lifecycle — create → join (multiple players) → start → game state initialized | Test passes: room created, players join, game starts with correct initial state |
| P6.S2.T2 | Integration test: complete turn cycle — roll → move → resolve → action → end turn → next player | Test passes: turn flows through all states correctly |
| P6.S2.T3 | Integration test: Redis state persistence — save state → kill server → restart → load state → state intact | Test passes: state survives server restart |
| P6.S2.T4 | Integration test: reconnection flow — player disconnects → reconnects → receives current state → resumes play | Test passes: reconnected player has correct state and can take actions |
| P6.S2.T5 | Integration test: concurrent actions — two clients sending actions simultaneously → server processes sequentially | Test passes: no race conditions; state is consistent |
| P6.S2.T6 | Integration test: full auction flow with 4 players — bids, passes, winner resolution | Test passes: auction resolves correctly with property transferred |
| P6.S2.T7 | Integration test: trading between two players while game is active | Test passes: trade completes; all clients see updated state |
| P6.S2.T8 | Integration test: bankruptcy cascade — player goes bankrupt to another player mid-game | Test passes: assets transfer; game continues with remaining players |

### Step 6.3 — E2E Tests (Playwright)

| ID | Task | Test |
|----|------|------|
| P6.S3.T1 | E2E: Create game room and verify room code is displayed | Playwright: navigate to home → click Create → lobby page shows room code |
| P6.S3.T2 | E2E: Join game room with code and see player in waiting room | Playwright: open second browser → enter code → both players see each other |
| P6.S3.T3 | E2E: Select tokens and start game | Playwright: both players select tokens → host clicks Start → game board appears |
| P6.S3.T4 | E2E: Roll dice and see token move on board | Playwright: click Roll Dice → dice animate → token moves to new position |
| P6.S3.T5 | E2E: Land on unowned property and buy it | Playwright: land on property → buy modal → click Buy → property shows ownership |
| P6.S3.T6 | E2E: Land on owned property and pay rent | Playwright: land on opponent's property → rent notification → cash updates |
| P6.S3.T7 | E2E: Complete trade between two players | Playwright: open trade → propose → other player accepts → properties swap |
| P6.S3.T8 | E2E: Build houses on a monopoly | Playwright: acquire monopoly → click Build → select property → house appears |
| P6.S3.T9 | E2E: Go to jail and get out by paying fine | Playwright: land on Go To Jail → in jail → pay $50 → freed |
| P6.S3.T10 | E2E: Full game to completion (2 players, one goes bankrupt) | Playwright: play until one player can't pay → bankruptcy → victory screen |
| P6.S3.T11 | E2E: Reconnection — disconnect one player, reconnect, continue playing | Playwright: kill socket → reconnection overlay → reconnect → resume |
| P6.S3.T12 | E2E: Mobile viewport (375px) — full game flow playable | Playwright with mobile viewport: all actions accessible and game playable |
| P6.S3.T13 | E2E: Chat messages sent and received between players | Playwright: type message → send → both players see message |
| P6.S3.T14 | E2E: Decline property and participate in auction as the declining player | Playwright: land on unowned → click Decline → auction appears → declining player can bid |
| P6.S3.T15 | E2E: Draw a Chance/Community Chest card and see effect applied | Playwright: land on Chance space → card animation → card text displayed → effect applied (cash change or movement) |
| P6.S3.T16 | E2E: Mortgage and unmortgage a property | Playwright: click Mortgage → select property → cash increases → property dimmed; click Unmortgage → pay cost → property restored |

### Step 6.4 — CI/CD Pipeline Finalization

| ID | Task | Test |
|----|------|------|
| P6.S4.T1 | Add integration test step to CI — requires Redis service container | CI: integration test step runs with Redis; all tests pass |
| P6.S4.T2 | Add E2E test step to CI — runs Playwright against built app | CI: E2E step starts app, runs Playwright tests, reports results |
| P6.S4.T3 | Add build artifact caching — cache node_modules and Next.js build between CI runs | CI: subsequent runs use cache; faster execution |
| P6.S4.T4 | Configure staging deployment — auto-deploy on merge to `develop` branch | Merge to develop → staging deployment triggered; staging URL accessible |
| P6.S4.T5 | Configure production deployment — manual trigger from staging | Manual promotion → production deployment; production URL accessible |
| P6.S4.T6 | Add deployment status badges to README | Visual: README shows CI status badge with pass/fail |

### Step 6.5 — Production Deployment

| ID | Task | Test |
|----|------|------|
| P6.S5.T1 | Provision Node.js server (containerized) for game server | Server starts in container; health check returns 200 |
| P6.S5.T2 | Provision Redis instance for game state | Redis accessible from server; read/write operations work |
| P6.S5.T3 | Deploy Next.js frontend to CDN/hosting platform | Frontend loads at production URL; pages render correctly |
| P6.S5.T4 | Configure SSL/TLS for HTTPS and WSS | All connections use HTTPS; WebSocket upgrades use WSS |
| P6.S5.T5 | Configure rate limiting on game actions (max actions per second per player) | Test: rapid action spam → excess actions rejected with 429 |
| P6.S5.T6 | Implement health check endpoints for monitoring — `/health`, `/ready` | Both endpoints return 200 when server is healthy; fail when Redis is down |
| P6.S5.T7 | Set up error tracking service (e.g., Sentry) for client and server | Test: throw test error → error appears in tracking dashboard |
| P6.S5.T8 | Set up latency monitoring for WebSocket messages | Dashboard shows p50/p95/p99 latency for game state updates |
| P6.S5.T9 | Run load test — simulate 100 concurrent game rooms (200+ connections) | Load test passes: all rooms function correctly; latency stays under 200ms |
| P6.S5.T10 | Create deployment runbook documentation | Document covers: deploy, rollback, scale, troubleshoot procedures |

