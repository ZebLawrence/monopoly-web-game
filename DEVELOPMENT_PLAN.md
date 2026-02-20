# Monopoly Web Game — Development Plan

**Tech Stack:**
- **Frontend:** Next.js + TypeScript + Pixi.js (canvas rendering)
- **Backend:** Node.js + TypeScript + Socket.IO
- **State Store:** Redis
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Structure:** Monorepo (`/client`, `/server`, `/shared`)
- **Mobile:** Responsive web (phone + tablet browsers)
- **Identity:** Display name only (no accounts in v1)

---

## Phase Overview & Parallelization Map

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
(bankruptcy, elimination, victory,                            │
 spectating, activity feed, chat)                             │
                │                                              │
Phase 5: Mobile Optimization & Cross-Browser QA               │
(responsive tuning, touch interactions,                       │
 performance, browser compat)                                 │
                │                                              │
Phase 6: Testing, CI/CD & Deployment                          │
(E2E test suite, CI pipeline,                                 │
 staging/production deploy)                                   │
```

**Key parallelization opportunities:**
- **1A + 1B** run fully in parallel (engine has no UI dependency and vice versa)
- **3A + 3B** run mostly in parallel (both depend on Phase 2, but are independent of each other)
- **Testing** runs continuously from Phase 0 onward (unit tests written alongside code)

---

## Phase 0: Project Foundation

Sets up the monorepo, tooling, CI skeleton, and shared infrastructure that all subsequent work depends on.

### Step 0.1 — Monorepo Scaffold
- Initialize monorepo structure: `/client`, `/server`, `/shared`
- Configure package manager workspaces (npm/pnpm)
- Set up TypeScript project references across packages
- Configure path aliases for cross-package imports

### Step 0.2 — Development Tooling
- ESLint + Prettier configuration (shared config)
- Husky + lint-staged for pre-commit hooks
- EditorConfig for consistent formatting
- Environment variable management (.env files, schema validation)

### Step 0.3 — Testing Infrastructure
- Vitest setup for `/shared` and `/server` packages
- Vitest + React Testing Library for `/client`
- Playwright installation and base config for E2E
- Test coverage reporting configuration

### Step 0.4 — CI/CD Skeleton
- GitHub Actions workflow: lint → type-check → test → build
- Branch protection rules
- Automated PR checks

### Step 0.5 — Shared Types & Constants
- Define core TypeScript interfaces in `/shared` (Game, Player, Property, Card, TradeOffer, GameEvent)
- Define game constants (board layout, property data, card decks) as JSON configs
- Define Socket.IO event type contracts (client→server, server→client)
- Define game action types and payloads

---

## Phase 1A: Game Engine (Shared Logic)

Builds the server-authoritative game engine as a pure TypeScript module with no I/O dependencies. This is the heart of the game and runs in `/shared` so both client (for prediction) and server (for authority) can use it.

### Step 1A.1 — Game State Manager
- Immutable game state data structure
- State creation (new game initialization)
- State query helpers (whose turn, is game over, get player by ID, etc.)
- State serialization/deserialization (for Redis persistence)

### Step 1A.2 — Turn State Machine
- Finite state machine implementation (states: `WaitingForRoll`, `Rolling`, `Resolving`, `PlayerAction`, `Auction`, `TradeNegotiation`, `EndTurn`)
- Valid transition map and enforcement
- Action validation per state (what actions are legal in each state)

### Step 1A.3 — Dice & Movement
- Dice roll logic (two d6, doubles detection)
- Position calculation (wrapping around 40 spaces)
- Pass-Go detection ($200 award)
- Three-consecutive-doubles → Jail rule
- Movement event generation

### Step 1A.4 — Space Resolution Engine
- Landing resolver: dispatch logic based on space type
- Property space: unowned → buy/auction flow; owned → rent calculation
- Railroad rent calculation (scales with count owned)
- Utility rent calculation (dice × 4 or dice × 10)
- Tax spaces (Income Tax $200, Luxury Tax $100)
- Go To Jail space
- Community Chest / Chance → card draw trigger
- Free Parking, Just Visiting (no-ops)

### Step 1A.5 — Card System
- Deck initialization and shuffling
- Card draw (top of deck) and return (bottom of deck)
- Card effect executor (cash gain/loss, movement, jail, collect from all players, repairs, etc.)
- "Get Out of Jail Free" card: held by player, usable, tradeable

### Step 1A.6 — Property Management Logic
- Property purchase at face value
- Auction engine (bidding state, minimum increments, winner resolution)
- Monopoly detection (player owns all in color group)
- House/hotel building with even-build rule enforcement
- Building supply tracking (32 houses, 12 hotels)
- Building sale (half price return)
- Mortgage / unmortgage with 10% interest calculation

### Step 1A.7 — Trading Logic
- Trade proposal creation (properties, cash, GOOJF cards)
- Trade validation (proposer actually owns offered items)
- Accept / reject / counter-offer flow
- Trade execution (atomic asset swap)

### Step 1A.8 — Jail Logic
- Jail entry (from Go To Jail space, card, or three doubles)
- Jail exit options: pay $50, use GOOJF card, roll doubles
- Three-turn jail limit (forced $50 payment and move)
- Jail state tracking per player

### Step 1A.9 — Bankruptcy & Endgame
- Debt detection (player cannot pay)
- Forced asset liquidation sequence (sell buildings → mortgage properties → still short = bankrupt)
- Bankruptcy to player: all assets transfer to creditor
- Bankruptcy to bank: all assets auctioned individually
- Player elimination
- Win condition check (last player standing)
- Optional: timed game wealth calculation

### Step 1A.10 — Event System
- Event emitter for all game actions (`PlayerMoved`, `PropertyPurchased`, `RentPaid`, `DiceRolled`, `CardDrawn`, `PlayerBankrupt`, etc.)
- Event payload types
- Event log (ordered list of all game events for replay/history)

---

## Phase 1B: UI Foundation

Builds the Next.js application shell, Pixi.js board renderer, responsive layout system, and reusable UI components. No game logic integration yet — uses mock/static data.

### Step 1B.1 — Next.js App Shell
- Next.js project initialization inside `/client`
- App router setup with pages: Home, Lobby, Game, (404)
- Global styles, CSS reset, font loading
- Layout component with responsive breakpoints (mobile-first: 320px → 768px → 1024px → 1440px)

### Step 1B.2 — Design System & UI Components
- Color palette, typography scale, spacing system (matching Monopoly aesthetic)
- Button, Input, Modal, Toast, Card components
- Player avatar / token selector component
- Cash display with formatting
- Responsive navigation / header

### Step 1B.3 — Pixi.js Board Renderer
- Pixi.js Application setup and lifecycle (mount/unmount in React)
- Board layout engine: render 40 spaces in the classic square arrangement
- Space rendering: property colors, names, prices, icons for special spaces
- Responsive canvas sizing (fit viewport, maintain aspect ratio)
- Touch and mouse interaction support (tap/click on spaces)

### Step 1B.4 — Board Visual Elements
- Player token sprites (placement on spaces, stacking multiple tokens)
- Token movement animation (smooth path along board edges)
- House and hotel sprites on properties
- Property ownership indicators (colored border/marker)
- Dice roll animation (2D or sprite-based)

### Step 1B.5 — Player Dashboard UI
- Current player panel: cash, property list, cards held
- Other players summary strip: name, token, cash, property count
- Action button bar: Roll Dice, Buy, Build, Mortgage, Trade, End Turn
- Property detail card modal (rent tiers, mortgage value, current state)
- Turn indicator (whose turn, state label)

### Step 1B.6 — Mobile-Responsive Layout
- Board view scaling for phone screens (pinch-to-zoom, pan)
- Collapsible/tabbed player dashboard for small screens
- Bottom sheet / drawer patterns for actions on mobile
- Touch-friendly button sizing (minimum 44px tap targets)
- Orientation handling (landscape encouraged for game, portrait for lobby)

### Step 1B.7 — Lobby UI
- Create game screen (host settings: player count, starting cash)
- Join game screen (enter code/link)
- Waiting room: connected players list, token selection, ready status
- Host controls: start game button, kick player
- Shareable link / room code display

---

## Phase 2: Real-Time Integration

Connects the game engine to a Socket.IO server and wires the client to receive and display live game state. This phase bridges 1A and 1B.

### Step 2.1 — Socket.IO Server Setup
- Express + Socket.IO server in `/server`
- Connection handling, room management (join/leave)
- Event routing architecture (incoming actions → game engine → outgoing state)
- CORS configuration for Next.js client

### Step 2.2 — Redis Integration
- Redis connection and client setup
- Game state serialization to/from Redis
- Room metadata storage (player list, game settings, status)
- Key expiration for abandoned games (TTL cleanup)

### Step 2.3 — Lobby & Room Management
- Create room → generate room code → store in Redis
- Join room → validate code → add player → broadcast update
- Player ready / token selection → broadcast
- Host start game → initialize game state via engine → broadcast
- Leave room / disconnect handling

### Step 2.4 — Game State Synchronization
- Server: receive player action → validate via engine → apply → persist → broadcast new state
- Client: Socket.IO hook/context for React (connection, state subscription, action dispatch)
- State diff or full-state broadcast strategy
- Latency handling and optimistic UI updates

### Step 2.5 — Reconnection Handling
- Detect disconnect (Socket.IO disconnect event)
- Grace period timer (120s configurable)
- Reconnect: re-authenticate session → rejoin room → receive current state
- Timeout: mark player as disconnected, auto-actions (skip turn or auto-pay)
- Client-side reconnection UI (overlay with reconnecting status)

### Step 2.6 — Turn Management Server
- Turn timer (optional, configurable)
- Turn advancement and broadcast
- Server-side doubles tracking and extra turn logic
- Action timeout handling (auto-pass if player doesn't act)

---

## Phase 3A: Core Gameplay Integration

Wires the game engine's core turn mechanics into the live client-server system with full UI interactions.

### Step 3A.1 — Dice Rolling Flow
- Client: Roll Dice button → emit action → receive result → animate dice → animate token movement
- Server: validate roll action → generate dice result → calculate position → resolve space → broadcast
- Doubles → extra turn UX
- Three doubles → Jail UX

### Step 3A.2 — Space Landing Resolution UI
- Unowned property: Buy/Auction prompt modal
- Owned property: rent payment notification (payer and receiver)
- Tax space: payment notification
- Go To Jail: animation + jail status update
- Free Parking / Just Visiting: brief notification
- Pass Go: $200 award notification

### Step 3A.3 — Card Draw Flow
- Chance / Community Chest landing → card draw animation → card display modal → effect execution
- Card effects reflected in state (cash change, movement, jail)
- Get Out of Jail Free card added to player inventory

### Step 3A.4 — Jail UI & Flow
- Jail status display on player dashboard
- Jail options UI: Pay $50 / Use GOOJF Card / Roll for Doubles
- Jail turn counter display
- Forced exit after 3 turns

### Step 3A.5 — Turn Flow UI
- Turn indicator: active player highlight
- State machine reflected in UI (disabled/enabled buttons per state)
- End Turn button and turn transition animation
- Turn history / activity feed (scrollable log of events)
- Turn notifications (toast/banner when it's your turn)

---

## Phase 3B: Property & Economy Integration

Wires property management, trading, and economic mechanics into the live system. Can proceed in parallel with 3A.

### Step 3B.1 — Property Purchase & Auction UI
- Buy property confirmation modal (price, rent table preview)
- Decline → auction kicks off
- Auction UI: real-time bidding interface, current bid display, countdown timer, bid increment buttons
- Auction winner notification and property transfer

### Step 3B.2 — Rent Collection UI
- Automatic rent calculation display (show breakdown: base rent, monopoly bonus, house/hotel level)
- Payment animation (cash transfer between players)
- Insufficient funds warning → forced liquidation flow

### Step 3B.3 — Building Management UI
- Build button → select property in monopoly → add house/hotel
- Even-build rule enforcement (grayed out invalid options)
- Building supply counter display (remaining houses/hotels)
- Sell buildings flow (select buildings to sell, half-price confirmation)
- Visual update on board (houses/hotels appear on properties)

### Step 3B.4 — Mortgage Management UI
- Mortgage button → select property → confirm → receive cash
- Mortgaged property visual indicator on board (dimmed/flipped)
- Unmortgage flow with 10% interest calculation display
- Restrictions: must sell buildings first in color group

### Step 3B.5 — Trading UI
- Trade proposal interface: select player → drag/add properties, cash, cards → send offer
- Incoming trade modal: review offer → accept / reject / counter
- Counter-offer flow (modify and re-send)
- Trade visibility to all players (notification/log)
- Trade execution animation (assets swap)

---

## Phase 4: Bankruptcy, Endgame & Polish

Completes the game loop and adds social/communication features.

### Step 4.1 — Bankruptcy Flow
- Insufficient funds detection UI (warning: you owe $X, you have $Y)
- Forced liquidation assistant (suggest buildings to sell, properties to mortgage)
- Bankruptcy declaration (confirm or attempt to liquidate)
- Asset transfer animation (to creditor player or bank auction)
- Player elimination visual (token removed, grayed out in player list)

### Step 4.2 — Endgame & Victory
- Win condition detection → victory screen
- Victory screen: winner announcement, final standings
- Stats summary: net worth breakdown, properties owned, rent collected, turns played
- Play again / return to lobby options

### Step 4.3 — Spectator Mode (Eliminated Players)
- Eliminated players remain in the room as spectators
- Spectator view: full board visibility, read-only
- Spectator chat access

### Step 4.4 — Activity Feed & Notifications
- Real-time event feed panel (scrollable log)
- Events: property bought, rent paid, card drawn, trade completed, player bankrupt
- Toast notifications for key events
- Sound effects for events (dice roll, cash register, card flip) — toggleable

### Step 4.5 — In-Game Chat
- Text chat panel (collapsible on mobile)
- Message display with player name and token color
- Chat visible to all players (including spectators)

### Step 4.6 — Visual & UX Polish
- Animation refinements (smoother token movement, dice tumble, card flip)
- Loading states and skeleton screens
- Error states and fallback UI
- Accessibility pass: keyboard navigation, ARIA labels, screen reader testing
- Color-blind friendly property indicators (patterns/icons alongside colors)

---

## Phase 5: Mobile Optimization & Cross-Browser QA

Ensures the game plays well on phones and works across all target browsers.

### Step 5.1 — Mobile Touch Optimization
- Pixi.js touch event handling (tap, pinch-to-zoom, pan/drag on board)
- Touch-friendly action buttons (sizing, spacing, placement)
- Swipe gestures for navigating panels (dashboard, chat, properties)
- Virtual keyboard handling (chat input doesn't obscure game)

### Step 5.2 — Responsive Layout Refinement
- Phone portrait layout (320px–480px): stacked board + dashboard
- Phone landscape layout: side-by-side board + compact dashboard
- Tablet layout (768px–1024px): optimized proportions
- Desktop layout (1024px+): full experience
- Dynamic canvas resolution for performance on low-end devices

### Step 5.3 — Performance Optimization
- Pixi.js rendering optimization (sprite batching, texture atlases)
- Bundle size analysis and code splitting
- Lazy loading for non-critical assets
- Socket.IO message compression
- Memory profiling for long game sessions

### Step 5.4 — Cross-Browser Testing
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- iOS Safari and Chrome specific testing
- Android Chrome specific testing
- WebSocket compatibility verification
- Canvas rendering verification across browsers

---

## Phase 6: Testing, CI/CD & Deployment

Comprehensive testing, pipeline hardening, and production deployment.

### Step 6.1 — Unit Test Completion
- Game engine: 100% coverage of all rules, edge cases, state transitions
- Space resolution: every space type with every ownership/improvement scenario
- Card effects: every card in both decks
- Bankruptcy: all creditor scenarios (player vs bank)
- Auction: bidding edge cases

### Step 6.2 — Integration Tests
- Socket.IO server: room management, action processing, state broadcast
- Redis: state persistence, reconnection state recovery
- Client-server: full action round-trip (emit → process → broadcast → render)

### Step 6.3 — E2E Tests (Playwright)
- Complete game flow: create room → join → play turns → win
- Lobby flow: create, join, token select, start
- Property purchase and auction flow
- Trading flow
- Bankruptcy and elimination flow
- Reconnection flow (simulate disconnect)
- Mobile viewport E2E tests

### Step 6.4 — CI/CD Pipeline Finalization
- GitHub Actions: lint → type-check → unit test → integration test → build → E2E
- Automated deployment to staging on merge to `develop`
- Manual promotion to production from staging
- Environment-specific configuration (staging vs production Redis, etc.)

### Step 6.5 — Production Deployment
- Infrastructure provisioning (Node.js server, Redis instance, CDN for static assets)
- SSL/TLS configuration (HTTPS, WSS)
- Monitoring and alerting setup (error tracking, latency monitoring)
- Rate limiting configuration
- Health check endpoints
- Deployment documentation / runbook

---

## Dependency Summary

| Phase | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| Phase 0 | — | — |
| Phase 1A | Phase 0 | Phase 1B |
| Phase 1B | Phase 0 | Phase 1A |
| Phase 2 | Phase 1A, Phase 1B | — |
| Phase 3A | Phase 2 | Phase 3B |
| Phase 3B | Phase 2 | Phase 3A |
| Phase 4 | Phase 3A, Phase 3B | — |
| Phase 5 | Phase 4 | Phase 6 (partially) |
| Phase 6 | Phase 4 (E2E needs full game) | Phase 5 (unit/integration can start earlier) |

**Note:** Unit and integration tests are written alongside code in every phase, not deferred to Phase 6. Phase 6 focuses on test completion, coverage gaps, E2E suite, and CI/CD finalization.
