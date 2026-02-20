# Monopoly Web Game — Development Tasks

Every task below is designed to be independently testable. Each task includes a **Test** line describing how to verify it passes.

Task IDs follow the pattern `P{phase}.S{step}.T{task}` (e.g., `P0.S1.T1`).

---

## Phase Files

| File                       | Phase                          | Tasks | Description                                                                            |
| -------------------------- | ------------------------------ | ----- | -------------------------------------------------------------------------------------- |
| [Phase0.md](./Phase0.md)   | Phase 0: Project Foundation    | 45    | Monorepo scaffold, tooling, CI, shared types & constants                               |
| [Phase1A.md](./Phase1A.md) | Phase 1A: Game Engine          | 136   | State manager, FSM, dice, spaces, cards, properties, trading, jail, bankruptcy, events |
| [Phase1B.md](./Phase1B.md) | Phase 1B: UI Foundation        | 72    | Next.js shell, design system, Pixi.js board, dashboard, mobile layout, lobby           |
| [Phase2.md](./Phase2.md)   | Phase 2: Real-Time Integration | 38    | Socket.IO server, Redis, lobby rooms, state sync, reconnection, turn timers            |
| [Phase3A.md](./Phase3A.md) | Phase 3A: Core Gameplay        | 43    | Dice flow, space landing UI, card draw, jail UI, turn flow                             |
| [Phase3B.md](./Phase3B.md) | Phase 3B: Property & Economy   | 46    | Purchase/auction UI, rent, building, mortgage, trading UI                              |
| [Phase4.md](./Phase4.md)   | Phase 4: Endgame & Polish      | 42    | Bankruptcy, victory, spectator, activity feed, chat, accessibility                     |
| [Phase5.md](./Phase5.md)   | Phase 5: Mobile & QA           | 31    | Touch optimization, responsive, performance, cross-browser                             |
| [Phase6.md](./Phase6.md)   | Phase 6: Testing & Deployment  | 58    | Unit test completion, integration, E2E, CI/CD, production deploy                       |

---

## Parallelization Map

```
Phase 0: Project Foundation ──────────────────────────────────┐
                                                              │
     ┌────────────────────────────────────────────────────────┤
     │                                                        │
Phase 1A: Game Engine          Phase 1B: UI Foundation        │
(shared game logic,            (Next.js app, Pixi.js board,   │
 state machine, rules)          responsive layout, components)│
     │                                    │                   │
     └──────────┬─────────────────────────┘                   │
                │                                              │
Phase 2: Real-Time Integration                                │
(Socket.IO, server, client-server sync,                       │
 lobby system, reconnection)                                  │
                │                                              │
     ┌──────────┴─────────────────────────┐                   │
     │                                    │                   │
Phase 3A: Core Gameplay        Phase 3B: Property & Economy   │
(turns, dice, movement,       (buying, rent, auction,         │
 jail, cards, taxes)           building, mortgage, trading)   │
     │                                    │                   │
     └──────────┬─────────────────────────┘                   │
                │                                              │
Phase 4: Bankruptcy, Endgame & Polish                         │
                │                                              │
Phase 5: Mobile Optimization & Cross-Browser QA               │
                │                                              │
Phase 6: Testing, CI/CD & Deployment                          │
```

## Dependency Summary

| Phase    | Depends On                    | Can Parallel With                            |
| -------- | ----------------------------- | -------------------------------------------- |
| Phase 0  | —                             | —                                            |
| Phase 1A | Phase 0                       | Phase 1B                                     |
| Phase 1B | Phase 0                       | Phase 1A                                     |
| Phase 2  | Phase 1A, Phase 1B            | —                                            |
| Phase 3A | Phase 2                       | Phase 3B                                     |
| Phase 3B | Phase 2                       | Phase 3A                                     |
| Phase 4  | Phase 3A, Phase 3B            | —                                            |
| Phase 5  | Phase 4                       | Phase 6 (partially)                          |
| Phase 6  | Phase 4 (E2E needs full game) | Phase 5 (unit/integration can start earlier) |

## Task Summary

| Phase     | Steps  | Tasks   | Delta from v1                                                                                                                                  |
| --------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0   | 5      | 45      | +14 (board validation, card enumeration, tokens, denominations, title deeds, action types)                                                     |
| Phase 1A  | 10     | 136     | +48 (rent validation, CC repairs, nearest RR/utility from all positions, dual GOOJF, building auction, missing card effects, chain resolution) |
| Phase 1B  | 7      | 72      | +12 (railroad card, utility card, title deed component)                                                                                        |
| Phase 2   | 6      | 38      | —                                                                                                                                              |
| Phase 3A  | 5      | 43      | +5 (CC repairs UI, nearest RR/utility UI)                                                                                                      |
| Phase 3B  | 5      | 46      | +5 (declining player in auction, building auction UI)                                                                                          |
| Phase 4   | 6      | 42      | -6 (recount correction)                                                                                                                        |
| Phase 5   | 4      | 31      | —                                                                                                                                              |
| Phase 6   | 5      | 58      | +19 (edge cases for new rules, E2E for auction/cards/mortgage)                                                                                 |
| **Total** | **53** | **511** | **+97 new tasks**                                                                                                                              |
