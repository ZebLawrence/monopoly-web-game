# Remaining Work — Master Tracker

> **Last updated:** 2026-02-20
> **Current Phase:** Priority 3 — Docker & Missing Infrastructure

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Complete

---

## Priority 1 — Wire the Route Pages (COMPLETE)

> Connect existing socket infrastructure, hooks, and components to browser route pages.

### Step 1 — Fix the Home Page — DONE (commit ea5d013)

### Step 2 — Wire the Lobby Page — DONE (commit 2640a39)

### Step 3 — Wire the Game Page — DONE (commit 8d70d3e)

---

## Priority 2 — Verify End-to-End Gameplay Flows (COMPLETE)

> Manual + automated verification of each game mechanic through the full stack.

### Step 4 — Core Turn Flow — DONE

- [x] Dice, doubles, tax, Go, jail, end turn, activity feed
- Fixes: RollForDoubles double-movement (584cd97), duplicate addEvent (0d4f6a5), passedGo notification (c42e4dd)

### Step 5 — Card Draw Flow — DONE

- [x] Chance/CC draws, all card effect types
- Fixes: jailed token positioning (eeec542), buy decision state machine (d45e89b)

### Step 6 — Jail Flow — DONE

- [x] Jail status, three exit methods, forced exit

### Step 7 — Property Economy Flow — DONE

- [x] Buy, auction, rent, monopoly, building, mortgage, trading
- Fixes: trade storage & events (1e2306f), emoji encoding (8c35b93), even-sell cleanup (17f5a68)

### Step 8 — Endgame Flow — DONE

- [x] Debt, bankruptcy, asset transfer, victory, spectator
- Fixes: auto-trigger bankruptcy modal (c6ee06f)

### Step 9 — Social Features — DONE

- [x] Activity feed with property names (af9b52c), chat, sound toggle

---

## Priority 3 — Docker & Missing Infrastructure

### Step 10 — Create Client Dockerfile (7 tasks)

- [ ] P3.S10.T1–T7: Multi-stage Dockerfile, docker-compose, full flow test

### Step 11 — Run and Fix E2E Tests (18 tasks)

- [ ] P3.S11.T1–T18: Fix all 16 E2E scenarios + CI artifact upload

---

## Priority 4 — Test Coverage & Phase 5 Polish

### Step 12 — Unit Test Coverage Targets (13 tasks)

- [ ] P4.S12.T1–T13: Coverage gaps, edge cases, ≥95% branch coverage

### Step 13 — Canvas Render Optimization (2 tasks)

- [ ] P4.S13.T1–T2: Dirty-checking, animation-only redraws

### Step 14 — Responsive Layout Verification (8 tasks)

- [ ] P4.S14.T1–T8: Six viewport widths + touch targets

### Step 15 — Bundle Size Analysis (3 tasks)

- [ ] P4.S15.T1–T3: Chunk analysis, lazy loading, sound assets

### Step 16 — Cross-Browser Testing (7 tasks)

- [ ] P4.S16.T1–T7: Chrome, Firefox, Safari, Edge, iOS, Android, Playwright

---

## Priority 5 — Production Hardening

### Step 17 — README Badge (1 task)

- [ ] P5.S17.T1: CI status badge

### Step 18 — Error Tracking / Sentry (4 tasks)

- [ ] P5.S18.T1–T4: Sentry DSN, server + client init, env/release tags

### Step 19 — WebSocket Latency Monitoring (3 tasks)

- [ ] P5.S19.T1–T3: Timing middleware, /metrics endpoint, docs

### Step 20 — SSL/TLS Configuration (3 tasks)

- [ ] P5.S20.T1–T3: HTTPS, WSS, env docs

### Step 21 — Load Testing (3 tasks)

- [ ] P5.S21.T1–T3: Artillery/k6 script, 5-min run, docs
