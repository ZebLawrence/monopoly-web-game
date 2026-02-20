# Monopoly Web Game — Development Tasks (Granular Breakdown)

Every task below is designed to be independently testable. Each task includes a **Test** line describing how to verify it passes.

Task IDs follow the pattern `P{phase}.S{step}.T{task}` (e.g., `P0.S1.T1`).

---

## Phase 0: Project Foundation

### Step 0.1 — Monorepo Scaffold

| ID | Task | Test |
|----|------|------|
| P0.S1.T1 | Initialize root `package.json` with pnpm workspaces pointing to `client/`, `server/`, `shared/` | `pnpm install` completes without errors; `pnpm -r list` shows all three packages |
| P0.S1.T2 | Create `/shared` package with its own `package.json` and `tsconfig.json` | `cd shared && pnpm tsc --noEmit` compiles with zero errors on an empty index.ts |
| P0.S1.T3 | Create `/server` package with its own `package.json` and `tsconfig.json`, referencing `/shared` | `cd server && pnpm tsc --noEmit` compiles; can `import {} from '@monopoly/shared'` without error |
| P0.S1.T4 | Create `/client` package by initializing a Next.js app with TypeScript inside `/client` | `cd client && pnpm dev` starts the Next.js dev server; home page loads at localhost:3000 |
| P0.S1.T5 | Configure `/client` `tsconfig.json` to reference `/shared` with path aliases | A file in `/client` can `import {} from '@monopoly/shared'` and `pnpm tsc --noEmit` passes |
| P0.S1.T6 | Add root-level scripts (`dev`, `build`, `test`, `lint`, `typecheck`) that run across all packages | `pnpm run typecheck` runs tsc in all three packages; `pnpm run build` produces build artifacts |

### Step 0.2 — Development Tooling

| ID | Task | Test |
|----|------|------|
| P0.S2.T1 | Install and configure ESLint with a shared config at root, extending to all packages | `pnpm run lint` executes across all packages; a deliberate lint violation (e.g., unused var) is flagged |
| P0.S2.T2 | Install and configure Prettier with a shared `.prettierrc` at root | `pnpm exec prettier --check .` returns 0 on formatted code; returns non-zero on unformatted code |
| P0.S2.T3 | Install Husky and configure a pre-commit hook running lint-staged | On `git commit`, lint-staged runs ESLint + Prettier on staged files; commit blocked if violations exist |
| P0.S2.T4 | Add `.editorconfig` at root with project conventions (indent, charset, newline) | EditorConfig-compatible editors respect the settings (verify tab/space behavior in a test file) |
| P0.S2.T5 | Create `.env.example` files for `/server` and `/client` with documented variables | Both `.env.example` files exist with placeholder values; a startup validation script warns on missing vars |

### Step 0.3 — Testing Infrastructure

| ID | Task | Test |
|----|------|------|
| P0.S3.T1 | Install Vitest in `/shared` and configure with TypeScript support | A sample test file `shared/src/__tests__/sample.test.ts` with `expect(1+1).toBe(2)` passes via `pnpm --filter shared test` |
| P0.S3.T2 | Install Vitest in `/server` and configure with TypeScript support | A sample test in `server/src/__tests__/sample.test.ts` passes via `pnpm --filter server test` |
| P0.S3.T3 | Install Vitest + React Testing Library in `/client` and configure for Next.js | A sample component test (render a `<div>Hello</div>`, assert text content) passes via `pnpm --filter client test` |
| P0.S3.T4 | Install Playwright and create base config with browser targets (Chrome, Firefox, WebKit) | `pnpm exec playwright test --list` lists zero tests but exits cleanly; browsers downloadable |
| P0.S3.T5 | Configure Vitest coverage reporting (v8 provider) across all packages | `pnpm run test -- --coverage` generates an HTML coverage report in each package |

### Step 0.4 — CI/CD Skeleton

| ID | Task | Test |
|----|------|------|
| P0.S4.T1 | Create GitHub Actions workflow file that runs `lint` on push/PR | Push a branch; GH Actions runs lint step and shows pass/fail |
| P0.S4.T2 | Add `typecheck` step to the CI workflow | CI runs `pnpm run typecheck` and fails the build on type errors |
| P0.S4.T3 | Add `test` step to the CI workflow (runs Vitest across all packages) | CI runs all unit tests; a failing test fails the build |
| P0.S4.T4 | Add `build` step to the CI workflow | CI runs `pnpm run build`; Next.js and server builds succeed |

### Step 0.5 — Shared Types & Constants

| ID | Task | Test |
|----|------|------|
| P0.S5.T1 | Define `SpaceType` enum and `Space` interface (id, name, type, position, colorGroup?, cost?, etc.) | TypeScript compiles; a test asserts that the enum has all expected space types (property, railroad, utility, tax, chance, chest, corner) |
| P0.S5.T2 | Define `Player` interface (id, name, token, cash, position, properties, jailStatus, isActive, etc.) | TypeScript compiles; a test creates a valid player object matching the interface |
| P0.S5.T3 | Define `Property` interface (spaceId, name, type, colorGroup, cost, rentTiers, mortgaged, ownerId, houses) | TypeScript compiles; a test validates that rentTiers is an array of the correct length |
| P0.S5.T4 | Define `Card` interface (id, deck, text, effect) and `CardEffect` discriminated union (cash, move, moveBack, jail, collectFromAll, payEachPlayer, repairs, advanceNearestRailroad, advanceNearestUtility, goojf) | TypeScript compiles; a test creates one card of each effect type without type errors (10 variants total) |
| P0.S5.T5 | Define `GameState` interface (gameId, status, players, currentPlayerIndex, board, decks, turnState, settings, events) | TypeScript compiles; a test creates a minimal valid GameState object |
| P0.S5.T6 | Define `GameSettings` interface (maxPlayers, startingCash, turnTimeLimit, etc.) with defaults | TypeScript compiles; a test validates default settings object has correct starting cash of $1500 |
| P0.S5.T7 | Create `board.json` — the 40-space board layout with all property data, rent tiers, costs | JSON parses without error; a test validates exactly 40 spaces, 22 streets, 4 railroads, 2 utilities |
| P0.S5.T7a | Validate `board.json` — all 40 spaces present by exact name and position: Pos 0 Go, 1 Mediterranean Ave, 2 Community Chest, 3 Baltic Ave, 4 Income Tax, 5 Reading Railroad, 6 Oriental Ave, 7 Chance, 8 Vermont Ave, 9 Connecticut Ave, 10 Jail/Just Visiting, 11 St. Charles Place, 12 Electric Company, 13 States Ave, 14 Virginia Ave, 15 Pennsylvania Railroad, 16 St. James Place, 17 Community Chest, 18 Tennessee Ave, 19 New York Ave, 20 Free Parking, 21 Kentucky Ave, 22 Chance, 23 Indiana Ave, 24 Illinois Ave, 25 B&O Railroad, 26 Atlantic Ave, 27 Ventnor Ave, 28 Water Works, 29 Marvin Gardens, 30 Go To Jail, 31 Pacific Ave, 32 North Carolina Ave, 33 Community Chest, 34 Pennsylvania Ave, 35 Short Line Railroad, 36 Chance, 37 Park Place, 38 Luxury Tax, 39 Boardwalk | Test: iterate all 40 positions; each matches expected name and type |
| P0.S5.T7b | Validate `board.json` — all 8 color groups have correct properties and house costs: Brown (Mediterranean, Baltic; $50/house), Light Blue (Oriental, Vermont, Connecticut; $50/house), Pink (St. Charles, States, Virginia; $100/house), Orange (St. James, Tennessee, New York; $100/house), Red (Kentucky, Indiana, Illinois; $150/house), Yellow (Atlantic, Ventnor, Marvin Gardens; $150/house), Green (Pacific, N. Carolina, Pennsylvania; $200/house), Dark Blue (Park Place, Boardwalk; $200/house) | Test: for each color group, verify member count (brown/dark blue = 2, rest = 3) and house cost |
| P0.S5.T7c | Validate `board.json` — all 22 street properties have correct rent tiers (base, 1 house, 2 houses, 3 houses, 4 houses, hotel) matching official Monopoly rent tables. Example spot checks: Mediterranean base $2/hotel $250, Boardwalk base $50/hotel $2000, Illinois Ave base $20/hotel $1100 | Test: assert every street property has exactly 6 rent tiers; spot-check at least one property per color group |
| P0.S5.T7d | Validate `board.json` — mortgage values for all 28 properties: streets = half purchase price, railroads = $100 each, utilities = $75 each | Test: assert mortgage value = price/2 for all streets; railroads mortgage = $100; utilities mortgage = $75 |
| P0.S5.T7e | Validate `board.json` — Chance spaces at exactly positions 7, 22, 36; Community Chest spaces at exactly positions 2, 17, 33 | Test: filter spaces by type 'chance' → positions [7, 22, 36]; filter by 'communityChest' → positions [2, 17, 33] |
| P0.S5.T7f | Validate `board.json` — Tax spaces: Income Tax at position 4 ($200), Luxury Tax at position 38 ($100) | Test: position 4 is type 'tax' with amount $200; position 38 is type 'tax' with amount $100 |
| P0.S5.T7g | Validate `board.json` — Railroad prices: all 4 railroads cost $200 (Reading pos 5, Pennsylvania pos 15, B&O pos 25, Short Line pos 35) | Test: all railroad-type spaces have cost $200 |
| P0.S5.T7h | Validate `board.json` — Utility prices: Electric Company (pos 12) and Water Works (pos 28) both cost $150 | Test: all utility-type spaces have cost $150 |
| P0.S5.T8 | Create `chance-cards.json` — all 16 Chance card definitions with effect descriptors including: Advance to Boardwalk, Advance to Go ($200), Advance to Illinois Ave, Advance to St. Charles Place, Advance to nearest Railroad (×2 — TWO copies of this card), Advance to nearest Utility, Bank pays dividend $50, Get Out of Jail Free, Go Back 3 Spaces, Go to Jail, General repairs ($25/house $100/hotel), Speeding fine $15, Take a trip to Reading Railroad, Elected Chairman pay each player $50, Building loan matures $150 | JSON parses; test validates exactly 16 cards; test validates 2 cards have 'advanceNearestRailroad' effect |
| P0.S5.T9 | Create `community-chest-cards.json` — all 16 Community Chest card definitions including: Advance to Go, Bank error $200, Doctor's fee $50, Sale of stock $50, Get Out of Jail Free, Go to Jail, Holiday fund $100, Income tax refund $20, Birthday collect $10 from each player, Life insurance $100, Hospital fees $100, School fees $50, Consultancy fee $25, Street repairs ($40/house $115/hotel), Beauty contest $10, Inherit $100 | JSON parses; test validates exactly 16 cards; each with a valid `CardEffect` shape |
| P0.S5.T10 | Define `GameAction` discriminated union (RollDice, BuyProperty, DeclineProperty, AuctionBid, AuctionPass, BuildHouse, BuildHotel, SellBuilding, MortgageProperty, UnmortgageProperty, ProposeTrade, AcceptTrade, RejectTrade, CounterTrade, PayJailFine, UseJailCard, RollForDoubles, EndTurn) | TypeScript compiles; a test creates one action of each type without type errors (18 action types total) |
| P0.S5.T11 | Define Socket.IO event type contracts: `ClientToServerEvents` and `ServerToClientEvents` interfaces | TypeScript compiles; both interfaces have all expected event names with typed payloads |
| P0.S5.T12 | Define `GameEvent` interface (id, gameId, type, payload, timestamp) and event type enum | TypeScript compiles; a test creates sample events of different types |
| P0.S5.T13 | Define `TokenType` enum with classic Monopoly tokens: ScottieDog, TopHat, RaceCar, Boot, Thimble, Iron, Wheelbarrow, Battleship | TypeScript compiles; test asserts exactly 8 token types: scottieDog, topHat, raceCar, boot, thimble, iron, wheelbarrow, battleship |
| P0.S5.T14 | Define `TurnState` enum (WaitingForRoll, Rolling, Resolving, AwaitingBuyDecision, Auction, PlayerAction, TradeNegotiation, EndTurn) | TypeScript compiles; test asserts all expected states are present |
| P0.S5.T15 | Define `TradeOffer` interface (id, proposerId, recipientId, offeredProperties, offeredCash, offeredCards, requestedProperties, requestedCash, requestedCards, status) | TypeScript compiles; test creates a valid trade offer object |
| P0.S5.T16 | Define `MoneyDenomination` type and starting cash breakdown constant: 2×$500, 4×$100, 1×$50, 1×$20, 2×$10, 1×$5, 5×$1 = $1,500 total. Denominations available in the game: $1, $5, $10, $20, $50, $100, $500 | Test: sum of starting cash breakdown equals $1500; all 7 denominations defined |
| P0.S5.T17 | Define `TitleDeedData` interface (propertyId, name, colorGroup, cost, rentTiers, mortgageValue, houseCost, hotelCost) — represents the physical title deed card data for all 28 properties (22 streets + 4 railroads + 2 utilities) | TypeScript compiles; test validates 28 title deed entries exist |

---

## Phase 1A: Game Engine (Shared Logic)

### Step 1A.1 — Game State Manager

| ID | Task | Test |
|----|------|------|
| P1A.S1.T1 | Implement `createInitialGameState(settings, players)` → returns a valid `GameState` with players at position 0, starting cash, empty properties | Test: 2-player game created; both players have $1500, position 0, empty property arrays |
| P1A.S1.T2 | Implement `createInitialGameState` for 3–6 players | Test: create games with 3, 4, 5, 6 players; all have correct starting state |
| P1A.S1.T3 | Implement `getActivePlayer(state)` → returns the player whose turn it is | Test: create state with 3 players, currentPlayerIndex=1; function returns player at index 1 |
| P1A.S1.T4 | Implement `getPlayerById(state, playerId)` → returns the player or undefined | Test: find existing player returns correct player; non-existent ID returns undefined |
| P1A.S1.T5 | Implement `getSpaceByPosition(state, position)` → returns the Space at that board position | Test: position 0 returns Go; position 39 returns Boardwalk |
| P1A.S1.T6 | Implement `getPropertiesOwnedBy(state, playerId)` → returns array of properties owned by that player | Test: set up state with player owning 3 properties; function returns exactly those 3 |
| P1A.S1.T7 | Implement `isGameOver(state)` → returns true when only 1 active player remains | Test: state with 2 active players returns false; state with 1 active returns true |
| P1A.S1.T8 | Implement `serializeGameState(state)` → JSON string and `deserializeGameState(json)` → GameState | Test: serialize a state, deserialize it, deep-equal the original |

### Step 1A.2 — Turn State Machine

| ID | Task | Test |
|----|------|------|
| P1A.S2.T1 | Implement `TurnStateMachine` class with `currentState` and `transition(action)` method | Test: machine starts in `WaitingForRoll`; calling `transition` with invalid action throws error |
| P1A.S2.T2 | Define valid transitions: `WaitingForRoll` → `Rolling` (on RollDice action) | Test: machine in WaitingForRoll transitions to Rolling on RollDice; rejects BuyProperty |
| P1A.S2.T3 | Define transition: `Rolling` → `Resolving` (automatic after dice result generated) | Test: machine transitions from Rolling to Resolving |
| P1A.S2.T4 | Define transition: `Resolving` → `AwaitingBuyDecision` (when landing on unowned property) | Test: resolving with unowned property context transitions to AwaitingBuyDecision |
| P1A.S2.T5 | Define transition: `AwaitingBuyDecision` → `Auction` (on decline) or `PlayerAction` (on buy) | Test: decline transitions to Auction; buy transitions to PlayerAction |
| P1A.S2.T6 | Define transition: `Auction` → `PlayerAction` (when auction completes) | Test: auction complete transitions to PlayerAction |
| P1A.S2.T7 | Define transition: `Resolving` → `PlayerAction` (when landing on space that requires no decision, e.g., owned property, tax, free parking) | Test: resolving on owned property goes to PlayerAction |
| P1A.S2.T8 | Define transition: `PlayerAction` → `EndTurn` (on EndTurn action) | Test: EndTurn action in PlayerAction state transitions to EndTurn |
| P1A.S2.T9 | Define transition: `EndTurn` → `WaitingForRoll` (advances to next player) | Test: EndTurn transitions to WaitingForRoll; active player index advances |
| P1A.S2.T10 | Define transition: `PlayerAction` → `WaitingForRoll` (when doubles were rolled — extra turn) | Test: if doubles were rolled, EndTurn transitions to WaitingForRoll for SAME player |
| P1A.S2.T11 | Implement `getValidActions(state)` → returns list of action types legal in current turn state | Test: WaitingForRoll returns [RollDice]; PlayerAction returns [BuildHouse, MortgageProperty, ProposeTrade, EndTurn, ...] |

### Step 1A.3 — Dice & Movement

| ID | Task | Test |
|----|------|------|
| P1A.S3.T1 | Implement `rollDice()` → returns `{ die1: number, die2: number, total: number, isDoubles: boolean }` | Test: call 1000 times; all die values 1–6; total = die1+die2; isDoubles correct |
| P1A.S3.T2 | Implement `rollDice` with injectable RNG for deterministic testing | Test: with seeded RNG, rollDice returns predictable results |
| P1A.S3.T3 | Implement `calculateNewPosition(currentPosition, diceTotal)` → wraps around 40 spaces | Test: position 38 + roll 4 = position 2; position 0 + roll 7 = position 7 |
| P1A.S3.T4 | Implement `didPassGo(oldPosition, newPosition)` → returns true if player passed or landed on Go | Test: old=38, new=2 → true; old=5, new=10 → false; old=0, new=0 → false (landing on Go from Go is not passing) |
| P1A.S3.T5 | Implement `applyMovement(state, playerId, diceResult)` → updates player position, awards $200 if passed Go, returns new state | Test: player at pos 35, rolls 7 → position 2, cash increased by $200 |
| P1A.S3.T6 | Implement doubles tracking: `state.consecutiveDoubles` counter increments on doubles, resets on non-doubles | Test: roll doubles 2x → counter is 2; roll non-doubles → counter resets to 0 |
| P1A.S3.T7 | Implement three-consecutive-doubles sends player to Jail (position 10, jailStatus = inJail) | Test: simulate 3 doubles in a row; player ends at position 10 with inJail status |

### Step 1A.4 — Space Resolution Engine

| ID | Task | Test |
|----|------|------|
| P1A.S4.T1 | Implement `resolveSpace(state, playerId, diceResult)` dispatcher that routes to handler based on space type | Test: player lands on a property space → returns a resolution with type 'property'; lands on tax → type 'tax' |
| P1A.S4.T2 | Implement unowned property resolution → returns `AwaitingBuyDecision` with property details | Test: player lands on unowned Baltic Ave → resolution contains property info and buy/auction options |
| P1A.S4.T3 | Implement owned property resolution → calculates base rent for a street with no monopoly | Test: player lands on Baltic (owned by opponent, no monopoly, 0 houses) → rent is $4 |
| P1A.S4.T4 | Implement monopoly rent calculation → doubles base rent when owner has all properties in color group | Test: opponent owns both Baltic and Mediterranean (no houses) → rent on Baltic is $8 |
| P1A.S4.T5 | Implement house/hotel rent calculation → returns correct rent tier based on house count | Test: Baltic with 1 house → $20; 2 houses → $60; 3 → $180; 4 → $320; hotel → $450 |
| P1A.S4.T6 | Implement mortgaged property resolution → no rent charged | Test: player lands on mortgaged property → rent is $0, no cash deducted |
| P1A.S4.T7 | Implement railroad rent calculation: $25 × 2^(railroadsOwned - 1) | Test: 1 railroad → $25; 2 → $50; 3 → $100; 4 → $200 |
| P1A.S4.T8 | Implement utility rent calculation: 1 utility owned → dice × 4; 2 utilities → dice × 10 | Test: dice total 8, 1 utility → $32; dice total 8, 2 utilities → $80 |
| P1A.S4.T9 | Implement Income Tax resolution → deducts $200 from player | Test: player with $1500 lands on Income Tax → cash becomes $1300 |
| P1A.S4.T10 | Implement Luxury Tax resolution → deducts $100 from player | Test: player with $1500 lands on Luxury Tax → cash becomes $1400 |
| P1A.S4.T11 | Implement Go To Jail resolution → sets player position to 10, jailStatus to inJail, does NOT collect $200 | Test: player at pos 27 lands on Go To Jail (pos 30) → position is 10, no $200 awarded, jailStatus is inJail |
| P1A.S4.T12 | Implement Chance space resolution → triggers card draw | Test: player lands on Chance → resolution type is 'drawCard' with deck='chance' |
| P1A.S4.T13 | Implement Community Chest space resolution → triggers card draw | Test: player lands on Community Chest → resolution type is 'drawCard' with deck='communityChest' |
| P1A.S4.T14 | Implement Free Parking resolution → no-op | Test: player lands on Free Parking → no state change (same cash, same position) |
| P1A.S4.T15 | Implement Just Visiting resolution → no-op | Test: player lands on position 10 while NOT in jail → no state change |
| P1A.S4.T16 | Implement Go resolution (landing directly) → collects $200 | Test: player lands exactly on Go → $200 awarded |
| P1A.S4.T17 | Implement landing on own property → no rent charged | Test: player lands on their own property → no cash change |
| P1A.S4.T18 | Validate rent tiers for ALL 22 street properties — spot-check one property per color group against official rent table: Mediterranean (Brown) base $2, Oriental (LightBlue) base $6, St. Charles (Pink) base $10, St. James (Orange) base $14, Kentucky (Red) base $18, Atlantic (Yellow) base $22, Pacific (Green) base $26, Park Place (DarkBlue) base $35 | Test: for each listed property, verify base rent, 1-house rent, and hotel rent match expected values |
| P1A.S4.T19 | Validate Boardwalk rent tiers specifically: base $50, 1 house $200, 2 houses $600, 3 houses $1400, 4 houses $1700, hotel $2000 | Test: all 6 rent tiers for Boardwalk return correct amounts |
| P1A.S4.T20 | Validate railroad mortgage value ($100 each) and utility mortgage value ($75 each) used in mortgage/unmortgage calculations | Test: mortgage Reading Railroad → receive $100; mortgage Electric Company → receive $75 |

### Step 1A.5 — Card System

| ID | Task | Test |
|----|------|------|
| P1A.S5.T1 | Implement `createDeck(cardDefinitions)` → shuffled array of Card objects | Test: deck has 16 cards; order differs from input order (with non-trivial probability) |
| P1A.S5.T2 | Implement `drawCard(state, deckName)` → returns top card, moves it to bottom of deck | Test: draw card; deck still has 16 cards; drawn card is now last in deck |
| P1A.S5.T3 | Implement `drawCard` for GOOJF card → card is removed from deck and added to player's hand | Test: draw GOOJF; deck has 15 cards; player's cards array contains the GOOJF card |
| P1A.S5.T4 | Implement card effect: "Collect $X" → adds cash to player | Test: "Bank pays you $200" → player cash increases by $200 |
| P1A.S5.T5 | Implement card effect: "Pay $X" → deducts cash from player | Test: "Pay hospital fees of $100" → player cash decreases by $100 |
| P1A.S5.T6 | Implement card effect: "Advance to X" (specific space) → moves player to that position | Test: "Advance to Go" from position 15 → player at position 0, collects $200 for passing Go |
| P1A.S5.T7 | Implement card effect: "Advance to X" where X is behind current position → pass Go and collect $200 | Test: "Advance to St. Charles Place" (pos 11) from position 30 → player at pos 11, $200 awarded |
| P1A.S5.T8 | Implement card effect: "Go to Jail" → player sent to jail | Test: "Go directly to Jail" → position 10, jailStatus inJail, no $200 |
| P1A.S5.T9 | Implement card effect: "Go back 3 spaces" | Test: player at position 20 → moves to position 17; at position 2 → moves to position 39 (wraps) |
| P1A.S5.T10 | Implement card effect: "Collect $X from every player" | Test: 4-player game, card says collect $50 each → player gains $150, other 3 players each lose $50 |
| P1A.S5.T11 | Implement card effect: "Pay each player $X" | Test: 4-player game, pay $50 each → player loses $150, other 3 players each gain $50 |
| P1A.S5.T12 | Implement card effect: Chance "General repairs — pay $25 per house, $100 per hotel" | Test: player with 3 houses and 1 hotel → pays $175 ($75 + $100) |
| P1A.S5.T12a | Implement card effect: Community Chest "Street repairs — pay $40 per house, $115 per hotel" (different rates than Chance) | Test: player with 3 houses and 1 hotel → pays $235 ($120 + $115) |
| P1A.S5.T12b | Implement repairs card with zero buildings → pays $0 | Test: player with no buildings → pays nothing |
| P1A.S5.T13 | Implement card effect: "Advance to nearest railroad, pay double rent" — nearest railroad calculation from ALL Chance positions | Test: from pos 7 → nearest is pos 15 (Pennsylvania RR); from pos 22 → nearest is pos 25 (B&O RR); from pos 36 → nearest is pos 5 (Reading RR, wraps around) |
| P1A.S5.T13a | Implement "Advance to nearest railroad" — if railroad is UNOWNED, player may buy it at face value | Test: nearest railroad is unowned → player gets buy/auction choice |
| P1A.S5.T13b | Implement "Advance to nearest railroad" — if railroad is OWNED, pay DOUBLE the normal railroad rent | Test: owner has 2 railroads → normal rent $50 → card rent $100 |
| P1A.S5.T13c | Validate that the Chance deck contains exactly TWO "Advance to nearest Railroad" cards | Test: filter chance deck by effect type 'advanceNearestRailroad' → count is 2 |
| P1A.S5.T14 | Implement card effect: "Advance to nearest utility, pay 10× dice" — nearest utility calculation from ALL Chance positions | Test: from pos 7 → nearest is pos 12 (Electric Co); from pos 22 → nearest is pos 28 (Water Works); from pos 36 → nearest is pos 12 (Electric Co, wraps around) |
| P1A.S5.T14a | Implement "Advance to nearest utility" — if utility is UNOWNED, player may buy it at face value | Test: nearest utility is unowned → player gets buy/auction choice |
| P1A.S5.T14b | Implement "Advance to nearest utility" — if utility is OWNED, pay 10× dice roll (not the normal 4× or 10× based on ownership count) | Test: roll 8 → pay $80 regardless of how many utilities owner has |
| P1A.S5.T15 | Implement card effect: "Advance to Boardwalk" → moves to position 39 | Test: from any Chance position → player moves to pos 39; no Go passing (all Chance spaces are before pos 39 or at 36 which doesn't pass Go) |
| P1A.S5.T16 | Implement card effect: "Take a trip to Reading Railroad" → move to position 5, collect $200 if passing Go | Test: from Chance pos 36 → move to pos 5, pass Go → collect $200; from Chance pos 7 → move to pos 5 does NOT pass Go from pos 7 (would need to be after pos 5) — actually from pos 7 going forward doesn't reach pos 5 without passing Go, so this only applies from pos 22 or 36 |
| P1A.S5.T17 | Implement card effect: "Speeding fine $15" → deducts $15 from player | Test: player cash decreases by exactly $15 |
| P1A.S5.T18 | Implement card effect: "Building loan matures, collect $150" → adds $150 to player | Test: player cash increases by exactly $150 |
| P1A.S5.T19 | Implement both GOOJF cards can coexist — player can hold one from Chance AND one from Community Chest simultaneously | Test: draw GOOJF from Chance, then draw GOOJF from CC → player holds 2 cards; using one returns it to correct deck |
| P1A.S5.T20 | Implement `returnCardToDeck(state, card, deckName)` → places card at bottom of deck | Test: return a non-GOOJF card; it appears at the bottom of the deck |
| P1A.S5.T21 | Implement card-triggered movement → after moving to target space, RESOLVE that space (may trigger buy/rent/tax/another card draw) | Test: "Advance to Illinois Ave" and Illinois is owned by opponent → player pays rent after moving |

### Step 1A.6 — Property Management Logic

| ID | Task | Test |
|----|------|------|
| P1A.S6.T1 | Implement `buyProperty(state, playerId, spaceId)` → transfers property ownership, deducts cost from player | Test: player buys Baltic ($60) → cash decreases by $60, property owner is now playerId |
| P1A.S6.T2 | Implement `buyProperty` validation → rejects if property already owned, player can't afford, or not on that space | Test: attempt to buy owned property throws; attempt with insufficient funds throws |
| P1A.S6.T3 | Implement `startAuction(state, spaceId)` → creates auction state with starting bid $0; ALL active players eligible including the player who declined to buy | Test: auction state created with correct property, all active players (including decliner) eligible, starting bid 0 |
| P1A.S6.T4 | Implement `placeBid(state, playerId, amount)` → records bid if valid (> current high bid, ≤ player's cash) | Test: bid $50 when current is $30 → accepted; bid $20 when current is $30 → rejected |
| P1A.S6.T5 | Implement `placeBid` validation → player can only bid what they can afford | Test: player with $100 bids $150 → rejected |
| P1A.S6.T6 | Implement `passBid(state, playerId)` → marks player as passed in auction | Test: player passes → no longer eligible to bid; auction continues with remaining bidders |
| P1A.S6.T7 | Implement auction resolution → last remaining bidder or highest bidder wins when all pass | Test: 3 players, 2 pass → remaining player wins at their last bid amount |
| P1A.S6.T8 | Implement auction resolution → property transferred to winner, cash deducted | Test: winner gets property ownership; cash reduced by winning bid amount |
| P1A.S6.T9 | Implement auction with no bids → property remains unowned | Test: all players pass immediately → property has no owner |
| P1A.S6.T10 | Implement `hasMonopoly(state, playerId, colorGroup)` → checks if player owns all properties in that color group | Test: player owns Baltic + Mediterranean → hasMonopoly('brown') returns true; owns only Baltic → false |
| P1A.S6.T11 | Implement `buildHouse(state, playerId, spaceId)` → adds a house to the property | Test: player owns brown monopoly, builds on Baltic → Baltic has 1 house; player cash reduced by house cost |
| P1A.S6.T12 | Implement `buildHouse` validation → requires monopoly ownership | Test: attempt to build without monopoly → rejected |
| P1A.S6.T13 | Implement even-build rule enforcement → can't build on property with more houses than another in same group | Test: Baltic has 1 house, Mediterranean has 0 → can't build on Baltic again; must build on Mediterranean first |
| P1A.S6.T14 | Implement `buildHouse` max check → no more than 4 houses (5th = hotel upgrade) | Test: property with 4 houses → buildHouse upgrades to hotel (houses = 5 / isHotel flag) |
| P1A.S6.T15 | Implement hotel building → requires 4 houses, converts to hotel, returns 4 houses to supply | Test: build hotel → property has hotel; house supply increases by 4; hotel supply decreases by 1 |
| P1A.S6.T16 | Implement building supply tracking → 32 houses, 12 hotels | Test: initial state has 32 houses, 12 hotels; after building 3 houses → 29 remain |
| P1A.S6.T17 | Implement building supply shortage → can't build if no houses/hotels remain | Test: set house supply to 0 → buildHouse rejected |
| P1A.S6.T17a | Implement building auction — when multiple players want to build and house/hotel supply is insufficient for all, the buildings must be auctioned off one at a time to the highest bidder | Test: 2 players both want to build, only 1 house left → house is auctioned; highest bidder gets to build |
| P1A.S6.T18 | Implement `sellBuilding(state, playerId, spaceId)` → removes house/hotel, refunds half price | Test: sell 1 house on Baltic (house cost $50) → player gets $25, Baltic has 0 houses |
| P1A.S6.T19 | Implement even-sell rule → can't sell if it would violate even distribution | Test: Baltic 2 houses, Mediterranean 1 house → can sell from Baltic; Baltic 1, Mediterranean 1 → can sell from either |
| P1A.S6.T20 | Implement hotel downgrade → selling hotel returns to 4 houses (if supply available) | Test: sell hotel → property goes to 4 houses; house supply decreases by 4; hotel supply increases by 1 |
| P1A.S6.T21 | Implement hotel downgrade blocked → can't sell hotel if not enough houses in supply | Test: house supply at 2 → can't downgrade hotel (needs 4 houses); error returned |
| P1A.S6.T22 | Implement `mortgageProperty(state, playerId, spaceId)` → marks property mortgaged, gives player half value | Test: mortgage Baltic ($60 value) → player gets $30, property.mortgaged = true |
| P1A.S6.T23 | Implement mortgage validation → can't mortgage if property has buildings in its color group | Test: Baltic has houses → mortgage rejected; must sell buildings first |
| P1A.S6.T24 | Implement `unmortgageProperty(state, playerId, spaceId)` → pays mortgage + 10% interest, unmortgages | Test: unmortgage Baltic (mortgage value $30) → player pays $33 ($30 + $3 interest), property.mortgaged = false |
| P1A.S6.T25 | Implement unmortgage validation → player must have enough cash | Test: player with $20 tries to unmortgage $33 cost → rejected |

### Step 1A.7 — Trading Logic

| ID | Task | Test |
|----|------|------|
| P1A.S7.T1 | Implement `createTradeOffer(state, proposerId, recipientId, offer)` → creates a TradeOffer in pending status | Test: trade offer created with correct fields; status is 'pending' |
| P1A.S7.T2 | Implement trade offer validation → proposer must own all offered properties; offered cash ≤ proposer's cash | Test: offering property not owned → rejected; offering more cash than available → rejected |
| P1A.S7.T3 | Implement trade offer validation → recipient must own all requested properties | Test: requesting property not owned by recipient → rejected |
| P1A.S7.T4 | Implement trade offer validation → can't trade properties that have buildings in their color group | Test: property in a color group with houses → trade rejected (must sell buildings first) |
| P1A.S7.T5 | Implement `acceptTrade(state, tradeId)` → executes the asset swap atomically | Test: properties swap owners, cash transfers between players, GOOJF cards move |
| P1A.S7.T6 | Implement trade execution → properties, cash, and GOOJF cards all transfer correctly | Test: complex trade with 2 properties, $200, and 1 GOOJF card → all assets in correct hands after |
| P1A.S7.T7 | Implement `rejectTrade(state, tradeId)` → marks trade as rejected, no state change | Test: trade rejected; no property or cash changes; trade status = 'rejected' |
| P1A.S7.T8 | Implement `counterTrade(state, tradeId, newOffer)` → creates a new trade offer with swapped roles | Test: counter-offer created with original recipient as new proposer; original trade marked 'countered' |

### Step 1A.8 — Jail Logic

| ID | Task | Test |
|----|------|------|
| P1A.S8.T1 | Implement `sendToJail(state, playerId)` → sets position to 10, jailStatus to inJail, resets doubles counter | Test: player at pos 30 → position 10, jailStatus='inJail', consecutiveDoubles=0 |
| P1A.S8.T2 | Implement `sendToJail` does NOT award $200 even if "passing" Go | Test: player at pos 35 sent to jail (pos 10) → cash unchanged |
| P1A.S8.T3 | Implement `payJailFine(state, playerId)` → deducts $50, sets jailStatus to free | Test: player pays $50 → cash reduced by $50, jailStatus='free', player can roll normally |
| P1A.S8.T4 | Implement `payJailFine` validation → player must have $50 | Test: player with $30 tries to pay fine → rejected (or triggers bankruptcy flow) |
| P1A.S8.T5 | Implement `useJailCard(state, playerId)` → removes GOOJF card from player, frees from jail, returns card to deck | Test: player uses GOOJF → card removed from hand, returned to correct deck, jailStatus='free' |
| P1A.S8.T6 | Implement `useJailCard` validation → player must actually hold a GOOJF card | Test: player without GOOJF tries to use one → rejected |
| P1A.S8.T7 | Implement jail roll for doubles → if doubles rolled, player exits jail and moves that amount | Test: player in jail rolls doubles (3,3) → jailStatus='free', moves 6 spaces from pos 10 |
| P1A.S8.T8 | Implement jail roll failure → non-doubles, player stays in jail, turnsInJail increments | Test: player rolls (2,5) → stays at pos 10, turnsInJail increments |
| P1A.S8.T9 | Implement forced jail exit after 3 failed rolls → pay $50 and move dice total | Test: turnsInJail=2, rolls non-doubles → forced to pay $50, moves dice total |

### Step 1A.9 — Bankruptcy & Endgame

| ID | Task | Test |
|----|------|------|
| P1A.S9.T1 | Implement `canPlayerAfford(state, playerId, amount)` → checks if player can pay with cash + potential liquidation value | Test: player with $100, 2 houses (sellable for $50 total), 1 mortgageable property ($30) → can afford $180 but not $181 |
| P1A.S9.T2 | Implement `calculateLiquidationValue(state, playerId)` → total possible cash from selling buildings + mortgaging all properties | Test: player with houses worth $50 sell value and mortgage values of $60 → liquidation value = $110 |
| P1A.S9.T3 | Implement `declareBankruptcy(state, playerId, creditorId)` → when creditor is a player, transfer all assets | Test: bankrupt player's properties transfer to creditor; creditor receives all cash and GOOJF cards |
| P1A.S9.T4 | Implement bankruptcy asset transfer → mortgaged properties transfer still mortgaged; creditor must pay 10% interest or keep mortgaged | Test: mortgaged properties transfer to creditor with mortgaged flag; interest becomes due |
| P1A.S9.T5 | Implement `declareBankruptcy(state, playerId, 'bank')` → when creditor is bank, all properties go up for auction | Test: bankrupt player's properties are queued for individual auctions; cash goes to bank (removed) |
| P1A.S9.T6 | Implement player elimination → set isActive = false, remove from turn order | Test: eliminated player skipped in turn rotation; isActive = false |
| P1A.S9.T7 | Implement win condition check → last active player wins | Test: 3 players, 2 eliminated → game status = 'completed', winner = remaining player |
| P1A.S9.T8 | Implement timed game end → calculate net worth (cash + unmortgaged property values + building values) | Test: player with $500, 2 properties worth $200 each, 3 houses worth $50 each → net worth = $1050 |
| P1A.S9.T9 | Implement timed game winner determination → player with highest net worth wins | Test: 3 active players with different net worths → correct player identified as winner |

### Step 1A.10 — Event System

| ID | Task | Test |
|----|------|------|
| P1A.S10.T1 | Implement `GameEventEmitter` class with `on(eventType, handler)` and `emit(event)` methods | Test: register handler for 'DiceRolled'; emit DiceRolled event → handler called with correct payload |
| P1A.S10.T2 | Implement event generation in `applyMovement` → emits `PlayerMoved` event | Test: after movement, event log contains PlayerMoved with fromPosition, toPosition, playerId |
| P1A.S10.T3 | Implement event generation in `buyProperty` → emits `PropertyPurchased` event | Test: after buying, event log contains PropertyPurchased with playerId, propertyId, price |
| P1A.S10.T4 | Implement event generation for rent payment → emits `RentPaid` event | Test: after rent, event log contains RentPaid with payerId, receiverId, amount, propertyId |
| P1A.S10.T5 | Implement event generation for card draw → emits `CardDrawn` event | Test: after drawing, event log contains CardDrawn with playerId, cardText, deck |
| P1A.S10.T6 | Implement event generation for bankruptcy → emits `PlayerBankrupt` event | Test: after bankruptcy, event log contains PlayerBankrupt with playerId, creditorId |
| P1A.S10.T7 | Implement event generation for trade → emits `TradeCompleted` event | Test: after trade, event log contains TradeCompleted with tradeId, both player IDs |
| P1A.S10.T8 | Implement event generation for building → emits `BuildingPlaced` and `BuildingSold` events | Test: after building/selling, event log contains correct event with propertyId, buildingType |
| P1A.S10.T9 | Implement `GameEventLog` — ordered append-only list of all events with timestamps | Test: play several actions; event log has correct order, all events timestamped |
| P1A.S10.T10 | Implement `getEventsSince(state, timestamp)` → returns events after a given time (for late-joining spectators/reconnection) | Test: 10 events total, query since event 5's timestamp → returns events 6–10 |

---

## Phase 1B: UI Foundation

### Step 1B.1 — Next.js App Shell

| ID | Task | Test |
|----|------|------|
| P1B.S1.T1 | Initialize Next.js project in `/client` with App Router and TypeScript | `pnpm --filter client dev` starts dev server; root page renders at localhost:3000 |
| P1B.S1.T2 | Create root layout with HTML structure, meta tags, and font loading | Page loads with correct `<html lang="en">`, meta viewport tag, and custom font applied |
| P1B.S1.T3 | Create Home page (`/`) with game title and Create/Join game buttons | Render test: page contains heading text and two buttons |
| P1B.S1.T4 | Create Lobby page route (`/lobby/[roomCode]`) with placeholder content | Navigation to `/lobby/ABC123` renders lobby page with room code displayed |
| P1B.S1.T5 | Create Game page route (`/game/[gameId]`) with placeholder content | Navigation to `/game/123` renders game page |
| P1B.S1.T6 | Create 404 page with navigation back to home | Navigating to invalid route shows 404 page with home link |
| P1B.S1.T7 | Add global CSS reset and base styles (box-sizing, margin, etc.) | Visual: no browser default margins; box-sizing is border-box globally |
| P1B.S1.T8 | Configure responsive breakpoint CSS custom properties (320, 768, 1024, 1440) | Media queries at each breakpoint apply correctly (verify with browser dev tools) |

### Step 1B.2 — Design System & UI Components

| ID | Task | Test |
|----|------|------|
| P1B.S2.T1 | Define CSS custom properties for color palette (Monopoly green, red, brown, blue, etc. + neutral grays) | Visual test: all colors render correctly; contrast ratios meet WCAG AA |
| P1B.S2.T2 | Define typography scale (heading sizes, body text, small text) with responsive sizing | Render test: headings and body text are correct sizes; scale adjusts at breakpoints |
| P1B.S2.T3 | Define spacing scale (4px base unit: 4, 8, 12, 16, 24, 32, 48, 64) | Spacing tokens applied to a test component produce correct margins/padding |
| P1B.S2.T4 | Create `Button` component with variants (primary, secondary, danger, ghost) and sizes (sm, md, lg) | Render test: each variant/size combination renders with correct styles; click handler fires |
| P1B.S2.T5 | Create `Input` component with label, placeholder, error state, and disabled state | Render test: input renders with label; error message shown when error prop passed; disabled state works |
| P1B.S2.T6 | Create `Modal` component with overlay, close button, title, and body content slot | Render test: modal opens over content; close button fires onClose; clicking overlay closes modal |
| P1B.S2.T7 | Create `Toast` component with variants (success, error, info, warning) and auto-dismiss timer | Render test: toast appears with correct variant style; disappears after timeout |
| P1B.S2.T8 | Create `ToastProvider` context and `useToast()` hook for showing toasts from anywhere | Integration test: calling `showToast('message')` from a child component renders a toast |
| P1B.S2.T9 | Create `PropertyCard` component displaying property details (name, color, cost, rent tiers, mortgage value) styled like a classic Title Deed card — shows color band, property name, all 6 rent tiers (base, 1–4 houses, hotel), mortgage value, house/hotel build cost | Render test: pass property data → all fields render correctly; color bar matches colorGroup; all rent tiers visible |
| P1B.S2.T9a | Create `RailroadCard` component variant — shows railroad name, rent table (1 RR: $25, 2: $50, 3: $100, 4: $200), mortgage value $100 | Render test: railroad card shows correct tiered rent; no house/hotel section |
| P1B.S2.T9b | Create `UtilityCard` component variant — shows utility name, rent rules ("1 utility: 4× dice / 2 utilities: 10× dice"), mortgage value $75 | Render test: utility card shows correct rent rules text; no house section |
| P1B.S2.T10 | Create `CashDisplay` component with formatted dollar amount and +/- animation on change | Render test: displays "$1,500"; changing value triggers brief animation |
| P1B.S2.T11 | Create `TokenSelector` component showing available tokens as selectable icons | Render test: all tokens displayed; clicking one fires onSelect with token type; selected token highlighted |
| P1B.S2.T12 | Create `TokenSelector` disabled state for tokens already chosen by other players | Render test: passing `disabledTokens` prop grays out those tokens; they can't be selected |

### Step 1B.3 — Pixi.js Board Renderer

| ID | Task | Test |
|----|------|------|
| P1B.S3.T1 | Create `PixiApp` React component that initializes and destroys a Pixi.Application on mount/unmount | Mount component → Pixi canvas element appears in DOM; unmount → canvas removed, no memory leak |
| P1B.S3.T2 | Implement responsive canvas sizing — canvas fills its container and resizes on window resize | Resize browser window → canvas dimensions update; aspect ratio maintained |
| P1B.S3.T3 | Render the board background — the classic Monopoly board center area with color | Visual: center area renders with correct background; board outline visible |
| P1B.S3.T4 | Implement board space positioning — calculate x,y coordinates for all 40 spaces in the square layout | Test: position calculator returns correct coordinates; bottom row left-to-right, left column bottom-to-top, etc. |
| P1B.S3.T5 | Render bottom row spaces (positions 0–10: Go through Jail) with correct dimensions and colors | Visual: 11 spaces rendered along bottom edge; Go and Jail corners are larger squares |
| P1B.S3.T6 | Render left column spaces (positions 11–19) | Visual: 9 spaces rendered along left edge with correct colors |
| P1B.S3.T7 | Render top row spaces (positions 20–30: Free Parking through Go To Jail) | Visual: 11 spaces rendered along top edge; corners are larger squares |
| P1B.S3.T8 | Render right column spaces (positions 31–39) | Visual: 9 spaces rendered along right edge with correct colors |
| P1B.S3.T9 | Render property space details — color band, name text, price text | Visual: each property space shows its color group band, truncated name, and price |
| P1B.S3.T10 | Render special space icons — railroad icon, utility icons, tax icons, Chance/CC icons | Visual: special spaces show appropriate icons/symbols |
| P1B.S3.T11 | Render corner spaces — Go (with arrow), Jail (with visiting area), Free Parking, Go To Jail | Visual: all 4 corners render with distinctive designs |
| P1B.S3.T12 | Implement space click/tap handler — tapping a space emits its spaceId | Test: click on Mediterranean Ave → handler fires with spaceId=1 |
| P1B.S3.T13 | Implement space hover highlight effect (desktop only) | Visual: hovering over a space shows a subtle highlight; leaving removes it |

### Step 1B.4 — Board Visual Elements

| ID | Task | Test |
|----|------|------|
| P1B.S4.T1 | Create player token sprites for each token type (car, dog, hat, etc.) | Visual: each token type renders as a distinct recognizable sprite |
| P1B.S4.T2 | Place token sprites on board spaces at correct positions | Test: set player position to 5 → token appears on Reading Railroad space |
| P1B.S4.T3 | Stack multiple tokens on the same space with offset to prevent overlap | Visual: 3 players on Go → all 3 tokens visible with slight offset |
| P1B.S4.T4 | Implement token movement animation — smooth interpolation along board path | Visual: token moves from pos 5 to pos 10 along the board edges, not diagonally |
| P1B.S4.T5 | Implement token movement around corners — animation follows the L-shaped board path | Visual: moving from pos 9 to pos 12 goes around the Jail corner correctly |
| P1B.S4.T6 | Implement token movement wrapping around Go — animation goes past pos 39 to pos 0+ | Visual: moving from pos 38 to pos 3 wraps around the Go corner |
| P1B.S4.T7 | Create house sprite (small green rectangle) and render 1–4 houses on a property space | Visual: property with 3 houses shows 3 small green rectangles in a row |
| P1B.S4.T8 | Create hotel sprite (small red rectangle) and render on a property space | Visual: property with hotel shows 1 red rectangle (replacing houses) |
| P1B.S4.T9 | Implement property ownership indicator — colored dot or border matching owner's token color | Visual: owned property shows a small colored marker indicating the owner |
| P1B.S4.T10 | Implement mortgaged property visual — dimmed/grayed out appearance | Visual: mortgaged property appears faded or has a visual "mortgaged" indicator |
| P1B.S4.T11 | Create dice sprites or 2D rendered dice faces (1–6 pips) | Visual: each face (1–6) renders correctly with appropriate pip layout |
| P1B.S4.T12 | Implement dice roll animation — dice tumble/shake then land on final values | Visual: dice animate for ~1 second then display the final values clearly |

### Step 1B.5 — Player Dashboard UI

| ID | Task | Test |
|----|------|------|
| P1B.S5.T1 | Create `PlayerDashboard` layout container that sits alongside the board | Render test: dashboard renders next to board on desktop; board and dashboard share viewport |
| P1B.S5.T2 | Create `CurrentPlayerPanel` showing active player's token, name, and cash | Render test: displays player name, token icon, and formatted cash amount |
| P1B.S5.T3 | Create `OwnedPropertiesList` showing player's properties grouped by color | Render test: properties displayed in color groups; clicking one opens PropertyCard modal |
| P1B.S5.T4 | Create `HeldCardsDisplay` showing GOOJF cards and count | Render test: player with 1 GOOJF card shows card; player with 0 shows nothing |
| P1B.S5.T5 | Create `OtherPlayersSummary` strip showing all other players' name, token, cash, and property count | Render test: 3 other players displayed with correct info; bankrupt players shown as eliminated |
| P1B.S5.T6 | Create `ActionButtonBar` with Roll Dice, Buy, Build, Mortgage, Trade, End Turn buttons | Render test: all buttons render; disabled state works (grayed out, not clickable) |
| P1B.S5.T7 | Implement button enable/disable based on turn state — only valid actions are clickable | Test: pass turnState='WaitingForRoll' → only Roll Dice enabled; pass 'PlayerAction' → Build, Mortgage, Trade, End Turn enabled |
| P1B.S5.T8 | Create `TurnIndicator` showing whose turn it is with player name and token | Render test: displays "Player 2's Turn" with their token icon |
| P1B.S5.T9 | Create `PropertyDetailModal` triggered by clicking a property — shows full rent table, mortgage value, current state | Render test: modal shows all rent tiers, mortgage value, owner, houses/hotel count |

### Step 1B.6 — Mobile-Responsive Layout

| ID | Task | Test |
|----|------|------|
| P1B.S6.T1 | Implement game layout for desktop (≥1024px): board left, dashboard right | Visual at 1440px: board takes ~65% width, dashboard takes ~35% |
| P1B.S6.T2 | Implement game layout for tablet (768–1023px): board top, dashboard bottom | Visual at 768px: board fills width with reduced height, dashboard below |
| P1B.S6.T3 | Implement game layout for phone (< 768px): full-screen board with overlay dashboard | Visual at 375px: board fills screen; dashboard accessible via bottom tab/drawer |
| P1B.S6.T4 | Implement collapsible dashboard drawer for mobile — swipe up to expand, swipe down to collapse | Visual: drawer slides up over board; swiping down hides it |
| P1B.S6.T5 | Implement tabbed navigation for mobile dashboard (My Properties, Players, Actions) | Visual: tabs switch between different dashboard views on mobile |
| P1B.S6.T6 | Ensure all tap targets are at least 44×44px on mobile | Test: audit all interactive elements at 375px viewport; none smaller than 44px |
| P1B.S6.T7 | Implement pinch-to-zoom on the Pixi.js board canvas for mobile | Visual: pinch gesture zooms board in/out; double-tap resets zoom |
| P1B.S6.T8 | Implement pan/drag on zoomed board for mobile | Visual: when zoomed in, dragging scrolls the board view |

### Step 1B.7 — Lobby UI

| ID | Task | Test |
|----|------|------|
| P1B.S7.T1 | Create `CreateGameForm` with player count selector (2–6) and starting cash input | Render test: form renders with dropdown and input; submit emits settings object |
| P1B.S7.T2 | Create `JoinGameForm` with room code text input and Join button | Render test: form renders; submitting with code emits the code value |
| P1B.S7.T3 | Create `WaitingRoom` layout showing room code prominently and player list | Render test: room code displayed large and copyable; player list renders below |
| P1B.S7.T4 | Create `PlayerListItem` showing player name, selected token, and ready status | Render test: player with token and ready status shows green check; unready shows gray |
| P1B.S7.T5 | Implement "Copy Room Link" button that copies join URL to clipboard | Test: clicking button puts URL in clipboard (mock clipboard API in test) |
| P1B.S7.T6 | Create host-only "Start Game" button, enabled when 2+ players have joined | Render test: 1 player → button disabled; 2+ players → button enabled; non-host doesn't see button |
| P1B.S7.T7 | Implement name entry modal/form shown when joining a game | Render test: modal with name input appears; submitting sets player name |
| P1B.S7.T8 | Implement lobby responsive layout — works on phone and desktop | Visual at 375px: lobby is usable, form elements full-width, player list scrollable |

---

## Phase 2: Real-Time Integration

### Step 2.1 — Socket.IO Server Setup

| ID | Task | Test |
|----|------|------|
| P2.S1.T1 | Create Express server with Socket.IO attached in `/server/src/index.ts` | Server starts on configured port; `curl http://localhost:PORT/health` returns 200 |
| P2.S1.T2 | Implement health check endpoint `GET /health` returning `{ status: 'ok' }` | HTTP GET `/health` returns 200 with JSON body |
| P2.S1.T3 | Configure CORS to allow connections from Next.js dev server origin | Client connects from localhost:3000 to server on localhost:3001 without CORS error |
| P2.S1.T4 | Implement Socket.IO `connection` event handler that logs new connections | Integration test: client connects → server logs connection; client appears in `io.sockets` |
| P2.S1.T5 | Implement Socket.IO `disconnect` event handler | Integration test: client disconnects → server logs disconnection and fires cleanup |

### Step 2.2 — Redis Integration

| ID | Task | Test |
|----|------|------|
| P2.S2.T1 | Set up Redis client connection with connection error handling and retry logic | Integration test: Redis client connects; on Redis down, logs error and retries |
| P2.S2.T2 | Implement `saveGameState(gameId, state)` → serializes and stores in Redis with key `game:{gameId}` | Test: save state; `redis.get('game:123')` returns serialized state |
| P2.S2.T3 | Implement `loadGameState(gameId)` → retrieves and deserializes from Redis | Test: save then load → deserialized state deep-equals original |
| P2.S2.T4 | Implement `saveRoomMetadata(roomCode, metadata)` → stores room info (players, settings, status) | Test: save metadata; retrieve → matches original |
| P2.S2.T5 | Implement `deleteGameState(gameId)` → removes game from Redis | Test: save then delete → load returns null |
| P2.S2.T6 | Implement TTL on game keys (e.g., 24 hours) for automatic cleanup of abandoned games | Test: save with TTL; verify key has TTL set via `redis.ttl()` |

### Step 2.3 — Lobby & Room Management

| ID | Task | Test |
|----|------|------|
| P2.S3.T1 | Implement `createRoom` server handler → generates unique 6-char room code, stores in Redis, returns code | Test: emit `createRoom` → receive `roomCreated` with 6-char alphanumeric code; Redis has room data |
| P2.S3.T2 | Implement room code uniqueness — regenerate if collision detected | Test: mock Redis to return existing key → code regenerated until unique |
| P2.S3.T3 | Implement `joinRoom` server handler → validates code, adds player to room, joins Socket.IO room | Test: emit `joinRoom` with valid code → receive `roomJoined`; other players receive `playerJoined` |
| P2.S3.T4 | Implement `joinRoom` validation → reject if room full, game already started, or invalid code | Test: join full room → error; join started game → error; invalid code → error |
| P2.S3.T5 | Implement `selectToken` handler → updates player's token in room, broadcasts update | Test: emit `selectToken` → all clients receive `playerUpdated` with new token |
| P2.S3.T6 | Implement token uniqueness in room — reject if another player already has that token | Test: player 1 selects car; player 2 tries car → rejected with error |
| P2.S3.T7 | Implement `startGame` handler (host only) → initializes game state via engine, broadcasts `gameStarted` | Test: host emits `startGame` → all clients receive `gameStarted` with initial game state |
| P2.S3.T8 | Implement `startGame` validation → must be host, must have 2+ players | Test: non-host tries to start → rejected; 1 player tries to start → rejected |
| P2.S3.T9 | Implement `leaveRoom` handler → removes player from room, broadcasts update, handles host transfer | Test: player leaves → others receive `playerLeft`; if host left, new host assigned |

### Step 2.4 — Game State Synchronization

| ID | Task | Test |
|----|------|------|
| P2.S4.T1 | Implement server action handler: receive `gameAction` → validate via engine → apply → persist to Redis → broadcast `stateUpdate` | Integration test: client emits action → all clients receive updated state; Redis contains new state |
| P2.S4.T2 | Implement action rejection: invalid action returns error to sender only | Test: emit invalid action (e.g., roll dice when not your turn) → sender receives `actionError` with message |
| P2.S4.T3 | Implement client-side `useGameSocket` hook — connects to server, subscribes to `stateUpdate` events | React hook test: hook connects; on `stateUpdate` event, state value updates |
| P2.S4.T4 | Implement client-side `emitAction(action)` function via the hook | Test: calling `emitAction({ type: 'RollDice' })` sends the event to server |
| P2.S4.T5 | Implement `useGameState` React context providing current game state to all components | Test: provider wraps app; child components access state via `useGameState()` hook |
| P2.S4.T6 | Implement full-state broadcast (send complete state to all clients on every update) | Test: state update broadcast contains all game state fields; client state matches server state |

### Step 2.5 — Reconnection Handling

| ID | Task | Test |
|----|------|------|
| P2.S5.T1 | Store player-to-session mapping in Redis so disconnected players can be identified on reconnect | Test: player connects → session stored; disconnect → session still exists in Redis |
| P2.S5.T2 | Implement disconnect detection → start grace period timer (120s default) | Test: player disconnects → server starts countdown; `playerDisconnected` event broadcast |
| P2.S5.T3 | Implement reconnection → player reconnects within grace period → rejoin room, receive current state | Test: disconnect then reconnect within 120s → player receives full current game state |
| P2.S5.T4 | Implement grace period timeout → mark player as permanently disconnected | Test: disconnect and wait >120s → player marked disconnected; other players notified |
| P2.S5.T5 | Implement auto-action for disconnected player's turn → skip turn after timeout | Test: disconnected player's turn → after turn timeout, turn automatically advances |
| P2.S5.T6 | Create client-side reconnection overlay UI — "Reconnecting..." with countdown | Visual: on socket disconnect, overlay appears with status message; on reconnect, overlay disappears |
| P2.S5.T7 | Implement Socket.IO client auto-reconnect with exponential backoff | Test: disconnect socket → client attempts reconnection with increasing intervals |

### Step 2.6 — Turn Management Server

| ID | Task | Test |
|----|------|------|
| P2.S6.T1 | Implement server-side turn timer — configurable duration per turn phase | Test: set turn timer to 30s; after 30s of inactivity, auto-action fires |
| P2.S6.T2 | Implement turn timer broadcast — clients receive remaining time | Test: clients receive `turnTimerUpdate` events with seconds remaining |
| P2.S6.T3 | Implement auto-roll on timeout when in WaitingForRoll state | Test: player doesn't roll within time limit → server auto-rolls and processes |
| P2.S6.T4 | Implement auto-end-turn on timeout when in PlayerAction state | Test: player doesn't act within time limit → turn automatically ends |
| P2.S6.T5 | Implement timer pause during auctions and trades (these have their own timing) | Test: auction starts → main turn timer pauses; auction ends → timer resumes or moves to next state |

---

## Phase 3A: Core Gameplay Integration

### Step 3A.1 — Dice Rolling Flow

| ID | Task | Test |
|----|------|------|
| P3A.S1.T1 | Wire Roll Dice button → emits `RollDice` action to server | Test: click Roll Dice → server receives RollDice action for current player |
| P3A.S1.T2 | Server processes RollDice → generates result → broadcasts state with dice values and new position | Integration test: roll processed; state update contains diceResult and updated player position |
| P3A.S1.T3 | Client receives dice result → triggers dice animation with correct final values | Visual: dice animate and land on the values from server |
| P3A.S1.T4 | Client receives new position → triggers token movement animation | Visual: token moves from old position to new position along board path |
| P3A.S1.T5 | Implement animation sequencing — dice animation completes THEN token moves THEN space resolution | Visual: animations play in correct order, not simultaneously |
| P3A.S1.T6 | Implement doubles UI feedback — "Doubles! Roll again" notification | Visual: when doubles rolled, toast/banner shows doubles message |
| P3A.S1.T7 | Implement three-doubles-to-jail UI — "Three doubles! Go to Jail" with jail animation | Visual: on third doubles, token moves to Jail with special notification |
| P3A.S1.T8 | Disable Roll Dice button after rolling (until turn state allows it again) | Test: after rolling, Roll Dice button is disabled; on doubles extra turn, it re-enables |

### Step 3A.2 — Space Landing Resolution UI

| ID | Task | Test |
|----|------|------|
| P3A.S2.T1 | Implement unowned property landing → show Buy/Auction modal with property details | Visual: modal appears with property card, price, and Buy/Auction buttons |
| P3A.S2.T2 | Implement Buy button in modal → emits BuyProperty action → property ownership updates on board | Test: click Buy → property shows ownership indicator; player cash decreases |
| P3A.S2.T3 | Implement Auction button in modal → transitions to auction state (Phase 3B handles auction UI) | Test: click Auction → turn state changes to Auction; auction UI triggers |
| P3A.S2.T4 | Implement owned property landing → show rent payment notification to both payer and receiver | Visual: payer sees "Pay $X to Player Y"; receiver sees "Received $X from Player Z" |
| P3A.S2.T5 | Implement rent payment cash animation — payer's cash decreases, receiver's increases | Visual: both CashDisplay components update with animation |
| P3A.S2.T6 | Implement tax space landing → show tax payment notification | Visual: "Income Tax: Pay $200" or "Luxury Tax: Pay $100" notification; cash decreases |
| P3A.S2.T7 | Implement Go To Jail landing → token animation to Jail + notification | Visual: token moves directly to Jail (pos 10); "Go to Jail!" notification |
| P3A.S2.T8 | Implement pass Go notification → "$200 salary collected" toast | Visual: when passing Go, brief toast notification; cash increases |
| P3A.S2.T9 | Implement landing on own property → no modal, brief "Your property" indicator | Visual: no rent charged; optional subtle indicator |

### Step 3A.3 — Card Draw Flow

| ID | Task | Test |
|----|------|------|
| P3A.S3.T1 | Implement Chance/CC space landing → card draw animation (card flips or reveals) | Visual: card appears with flip/reveal animation showing card text |
| P3A.S3.T2 | Implement card display modal — shows card text and effect description | Visual: modal with card text clearly readable; "OK" button to proceed |
| P3A.S3.T3 | Implement card effect: cash gain/loss → update cash display with animation | Test: "Bank pays you $200" card → cash increases by $200 with animation |
| P3A.S3.T4 | Implement card effect: movement → token animation to target space, then resolve that space | Visual: "Advance to Go" → token moves to Go; $200 awarded |
| P3A.S3.T5 | Implement card effect: Go to Jail → token moves to Jail | Visual: "Go directly to Jail" → token goes to Jail; no $200 |
| P3A.S3.T6 | Implement card effect: GOOJF → card added to player's HeldCardsDisplay | Visual: GOOJF card appears in player's held cards area |
| P3A.S3.T7 | Implement card effect: collect from/pay each player → all player cash displays update | Visual: all players' cash changes simultaneously with notification |
| P3A.S3.T8 | Implement card effect: Chance repairs → show cost breakdown "Pay $25/house, $100/hotel" and deduct | Visual: shows total calculation → cash deducted |
| P3A.S3.T8a | Implement card effect: Community Chest repairs → show cost breakdown "Pay $40/house, $115/hotel" and deduct (different rates than Chance) | Visual: shows correct CC repair rates → total calculation → cash deducted |
| P3A.S3.T9 | Implement card effect: "Advance to nearest Railroad, pay double rent" UI — token moves to railroad, special rent calculation displayed | Visual: token moves to nearest railroad; if owned, rent breakdown shows "Double Railroad Rent: $X" |
| P3A.S3.T10 | Implement card effect: "Advance to nearest Utility, pay 10× dice" UI — token moves to utility, dice roll for rent displayed | Visual: token moves to nearest utility; if owned, shows dice roll and "10× dice = $X" |

### Step 3A.4 — Jail UI & Flow

| ID | Task | Test |
|----|------|------|
| P3A.S4.T1 | Implement jail status indicator on player dashboard — shows "In Jail (Turn X/3)" | Render test: player in jail → dashboard shows jail status with turn counter |
| P3A.S4.T2 | Implement jail token placement — token appears in the "In Jail" area of the Jail space | Visual: jailed player's token is inside the jail cell area, not the "Just Visiting" area |
| P3A.S4.T3 | Implement jail action options UI — Pay $50 / Use GOOJF Card / Roll for Doubles | Visual: when jailed player's turn, three option buttons shown instead of normal Roll Dice |
| P3A.S4.T4 | Wire "Pay $50" button → emits PayJailFine → cash decreases, player freed → normal roll | Test: click Pay → cash -$50, jail status cleared, Roll Dice now available |
| P3A.S4.T5 | Wire "Use GOOJF Card" button (shown only if player has one) → emits UseJailCard → card removed, freed | Test: click Use Card → GOOJF removed from hand, jail status cleared |
| P3A.S4.T6 | Wire "Roll for Doubles" → if doubles, freed and moves; if not, stays in jail | Test: roll doubles → freed, token moves; roll non-doubles → stays, turn counter increments |
| P3A.S4.T7 | Implement forced exit on 3rd failed roll → "$50 paid, you're free" notification + movement | Visual: on 3rd non-doubles roll, auto-pay $50 notification, then normal movement |

### Step 3A.5 — Turn Flow UI

| ID | Task | Test |
|----|------|------|
| P3A.S5.T1 | Implement active player highlight — current player's summary has a visual "active" indicator | Visual: active player panel has glowing border or highlight; others do not |
| P3A.S5.T2 | Implement turn state display — small label showing "Roll Dice", "Buy or Auction", "Your Action", etc. | Render test: label text matches current turn state |
| P3A.S5.T3 | Wire End Turn button → emits EndTurn action → next player becomes active | Test: click End Turn → active player changes; new player highlighted; Roll Dice re-enabled for them |
| P3A.S5.T4 | Implement "Your Turn!" notification when it becomes the local player's turn | Visual: banner/toast appears when turn transitions to local player |
| P3A.S5.T5 | Implement turn transition animation — brief visual transition between players | Visual: smooth transition highlighting the new active player |
| P3A.S5.T6 | Create `ActivityFeed` component — scrollable list of game events with icons and timestamps | Render test: feed shows events in chronological order with readable descriptions |
| P3A.S5.T7 | Wire game events to ActivityFeed — new events appear at the top/bottom as they happen | Test: dice rolled → "Player 1 rolled 7 (4+3)" appears in feed; property bought → event appears |
| P3A.S5.T8 | Implement ActivityFeed auto-scroll to latest event | Visual: new events auto-scroll into view; user can scroll up to see history |

---

## Phase 3B: Property & Economy Integration

### Step 3B.1 — Property Purchase & Auction UI

| ID | Task | Test |
|----|------|------|
| P3B.S1.T1 | Implement buy confirmation modal — shows property card, price, player's current cash, and Buy/Decline buttons | Render test: modal shows correct property info; Buy deducts cash; Decline triggers auction |
| P3B.S1.T2 | Wire Buy button → emits BuyProperty → server validates and broadcasts → property ownership updates | Integration test: buy → property owner updated on all clients |
| P3B.S1.T3 | Wire Decline button → emits DeclineProperty → server starts auction → auction state broadcast | Integration test: decline → all clients enter auction state |
| P3B.S1.T3a | Verify declining player is included in auction — the player who declined to buy appears as an eligible bidder in the auction | Test: player declines → auction starts → that same player CAN place bids |
| P3B.S1.T4 | Create `AuctionPanel` component — shows property being auctioned, current high bid, high bidder name, timer | Render test: panel displays all auction info; updates on new bids |
| P3B.S1.T5 | Implement bid input — preset increment buttons ($1, $10, $50, $100) and custom amount input | Render test: clicking $10 when current bid is $50 → bid input shows $60 |
| P3B.S1.T6 | Wire "Place Bid" button → emits AuctionBid → server validates → broadcasts updated auction state | Integration test: bid placed → all clients see new high bid and bidder |
| P3B.S1.T7 | Wire "Pass" button → emits AuctionPass → player can no longer bid | Test: pass → player's bid controls disabled; player removed from active bidders |
| P3B.S1.T8 | Implement auction countdown timer — resets on each new bid, expires when no bids for X seconds | Visual: timer counts down; resets on bid; reaching 0 ends auction |
| P3B.S1.T9 | Implement auction resolution UI — winner announcement, property transfer, cash deduction | Visual: "Player 2 wins the auction for $120!" → property ownership updates on board |
| P3B.S1.T10 | Implement auction with no bids result → "No bids — property remains unowned" notification | Visual: all pass → property stays unowned; notification shown |

### Step 3B.2 — Rent Collection UI

| ID | Task | Test |
|----|------|------|
| P3B.S2.T1 | Implement rent breakdown display — show base rent, monopoly bonus, per-house/hotel rate | Visual: "Rent: $50 (base) + monopoly = $100" or "Rent: $750 (hotel)" |
| P3B.S2.T2 | Implement rent payment notification for payer — "You paid $X rent to Player Y for Z" | Render test: notification shows correct amount, recipient, and property name |
| P3B.S2.T3 | Implement rent receipt notification for receiver — "Player X paid you $Y rent for Z" | Render test: property owner sees receipt notification |
| P3B.S2.T4 | Implement cash transfer animation — visual cash flowing from payer to receiver | Visual: animated dollar amount moves between player panels |
| P3B.S2.T5 | Implement insufficient funds warning — "You owe $X but only have $Y — you must sell or mortgage assets" | Visual: warning modal appears with shortfall amount and links to sell/mortgage actions |

### Step 3B.3 — Building Management UI

| ID | Task | Test |
|----|------|------|
| P3B.S3.T1 | Implement Build button → opens building interface showing eligible monopolies | Test: click Build → panel shows only color groups where player has monopoly |
| P3B.S3.T2 | Implement property selection in build interface — show each property in monopoly with current houses and "Add House" button | Render test: each property shows house count; Add House button enabled only if even-build allows |
| P3B.S3.T3 | Implement even-build visual enforcement — grayed out "Add House" for properties that would violate even build | Visual: if Baltic has 2, Mediterranean has 1 → Baltic's Add House is disabled |
| P3B.S3.T4 | Wire "Add House" → emits BuildHouse action → server validates → house appears on board | Integration test: build house → board renders new house sprite on property |
| P3B.S3.T5 | Implement hotel upgrade prompt — "Upgrade to Hotel?" when property reaches 4 houses | Visual: at 4 houses, button changes to "Build Hotel"; confirms upgrade |
| P3B.S3.T6 | Implement building supply display — "Houses remaining: X / Hotels remaining: Y" | Render test: displays current supply counts; updates after building |
| P3B.S3.T7 | Implement building supply exhaustion — disable build when no houses/hotels left | Visual: "No houses available" message when supply is 0 |
| P3B.S3.T8 | Implement Sell Buildings interface — select buildings to sell, shows half-price refund | Render test: each property shows "Sell House ($25 refund)" button |
| P3B.S3.T9 | Wire "Sell House" → emits SellBuilding → server validates even-sell → house removed, cash refunded | Integration test: sell house → house removed from board; cash increases by half price |
| P3B.S3.T10 | Implement hotel sell → downgrade to 4 houses (if supply available) or blocked with explanation | Visual: sell hotel → 4 houses appear; if insufficient house supply, shows error |
| P3B.S3.T11 | Implement building auction UI — when house/hotel supply is limited and multiple players want to build, a building auction interface appears for each contested building | Visual: "Building Auction: 1 House Available" → bidding interface → winner gets to place the house |

### Step 3B.4 — Mortgage Management UI

| ID | Task | Test |
|----|------|------|
| P3B.S4.T1 | Implement Mortgage button → opens mortgage interface showing eligible properties | Test: click Mortgage → panel shows unmortgaged properties without buildings in their color group |
| P3B.S4.T2 | Implement property selection for mortgage — shows mortgage value for each eligible property | Render test: each property shows "Mortgage for $X" button |
| P3B.S4.T3 | Wire "Mortgage" → emits MortgageProperty → server validates → property marked mortgaged on board | Integration test: mortgage → property dims on board; cash increases by mortgage value |
| P3B.S4.T4 | Implement mortgage restriction — can't mortgage if any property in color group has buildings | Visual: properties in groups with buildings show "Sell buildings first" instead of mortgage button |
| P3B.S4.T5 | Implement Unmortgage interface — shows mortgaged properties with unmortgage cost (value + 10% interest) | Render test: mortgaged property shows "Unmortgage for $33" (if $30 mortgage value) |
| P3B.S4.T6 | Wire "Unmortgage" → emits UnmortgageProperty → server validates cash → property unmortgaged | Integration test: unmortgage → property appearance restored; cash decreases by value + interest |
| P3B.S4.T7 | Implement unmortgage insufficient funds — disable button with tooltip showing required amount | Visual: button disabled; hover shows "Need $33 to unmortgage" |

### Step 3B.5 — Trading UI

| ID | Task | Test |
|----|------|------|
| P3B.S5.T1 | Implement Trade button → opens player selection — "Who do you want to trade with?" | Test: click Trade → list of other active players shown |
| P3B.S5.T2 | Implement trade proposal builder — two columns: "You Offer" and "You Request" | Visual: two-column layout with property lists, cash input, and GOOJF card toggles |
| P3B.S5.T3 | Implement property picker in trade builder — shows player's properties, toggleable selection | Test: click property → added to offer; click again → removed |
| P3B.S5.T4 | Implement cash input in trade builder — numeric input for offered/requested cash | Test: enter $200 in "You Offer" cash field → trade offer includes $200 cash |
| P3B.S5.T5 | Implement GOOJF card toggle in trade builder (if player holds any) | Test: toggle GOOJF on → card included in offer |
| P3B.S5.T6 | Implement trade validation display — error message if trade is invalid (e.g., property has buildings) | Visual: "Remove buildings before trading" error when selecting property with houses |
| P3B.S5.T7 | Wire "Send Offer" → emits ProposeTrade → server validates → recipient receives trade proposal | Integration test: send offer → recipient sees incoming trade modal |
| P3B.S5.T8 | Implement incoming trade modal for recipient — shows full offer with Accept/Reject/Counter buttons | Render test: modal shows all offered and requested items; three action buttons |
| P3B.S5.T9 | Wire Accept button → emits AcceptTrade → server executes swap → all clients see updated state | Integration test: accept → properties swap owners; cash transfers; board updates |
| P3B.S5.T10 | Wire Reject button → emits RejectTrade → proposer notified | Test: reject → proposer receives "Trade rejected" notification; no state changes |
| P3B.S5.T11 | Wire Counter button → opens trade builder pre-filled with original trade (roles swapped) for modification | Test: counter → trade builder opens with swapped perspective; modified offer sends new proposal |
| P3B.S5.T12 | Implement trade notification for all players — "Player 1 traded with Player 2" in activity feed | Test: completed trade → event appears in all players' activity feeds |

---

## Phase 4: Bankruptcy, Endgame & Polish

### Step 4.1 — Bankruptcy Flow

| ID | Task | Test |
|----|------|------|
| P4.S1.T1 | Implement debt detection UI — "You owe $X but have $Y" warning modal when can't pay | Visual: modal appears with debt amount, current cash, and options to liquidate |
| P4.S1.T2 | Implement liquidation assistant — lists buildings that can be sold with refund values | Render test: shows all sellable buildings sorted by refund value |
| P4.S1.T3 | Implement liquidation assistant — lists properties that can be mortgaged with values | Render test: shows mortgageable properties with their mortgage values |
| P4.S1.T4 | Implement running total in liquidation — updates as player sells/mortgages to show remaining debt | Visual: "Debt: $200 | After selling: $50 remaining" → updates as assets are sold |
| P4.S1.T5 | Implement "Declare Bankruptcy" button — appears when player cannot cover debt even after full liquidation | Visual: button shown with confirmation prompt "Are you sure? This is irreversible." |
| P4.S1.T6 | Wire bankruptcy declaration → emits DeclareBankruptcy → server processes → assets transfer to creditor | Integration test: bankruptcy → all assets transfer to creditor player; bankrupt player eliminated |
| P4.S1.T7 | Implement bank bankruptcy — assets auctioned individually when debt is to bank | Integration test: bankrupt to bank → each property put up for auction sequentially |
| P4.S1.T8 | Implement elimination visual — bankrupt player's token removed from board, grayed out in player list | Visual: token disappears with fade animation; player name shows "Bankrupt" label |

### Step 4.2 — Endgame & Victory

| ID | Task | Test |
|----|------|------|
| P4.S2.T1 | Implement win condition detection → when 1 player remains, server emits `gameOver` event | Integration test: second-to-last player goes bankrupt → `gameOver` event with winner ID |
| P4.S2.T2 | Create `VictoryScreen` overlay — shows winner's name, token, and "Winner!" banner | Visual: full-screen overlay with celebration design |
| P4.S2.T3 | Implement final standings table — all players ranked by elimination order (winner first) | Render test: table shows player names, tokens, and finishing positions |
| P4.S2.T4 | Implement net worth breakdown for winner — cash + property values + building values | Render test: breakdown shows cash, unmortgaged property total, building total, grand total |
| P4.S2.T5 | Implement game statistics — turns played, properties bought, total rent collected, trades made | Render test: stats section shows aggregate game data |
| P4.S2.T6 | Implement "Play Again" button → returns all players to lobby with same room | Test: click Play Again → navigate to lobby; room code preserved; players can start new game |
| P4.S2.T7 | Implement "Leave" button → exits to home page | Test: click Leave → navigate to home; player removed from room |

### Step 4.3 — Spectator Mode (Eliminated Players)

| ID | Task | Test |
|----|------|------|
| P4.S3.T1 | Implement spectator state for eliminated players — remain in Socket.IO room, receive state updates | Test: eliminated player still receives `stateUpdate` events |
| P4.S3.T2 | Implement spectator UI — full board view, all player info visible, no action buttons | Visual: eliminated player sees board and player info but action bar is hidden/replaced with "Spectating" label |
| P4.S3.T3 | Implement spectator badge — "Spectating" label on eliminated player's dashboard | Visual: prominent "You are spectating" indicator |

### Step 4.4 — Activity Feed & Notifications

| ID | Task | Test |
|----|------|------|
| P4.S4.T1 | Implement event-to-message formatter — converts GameEvents to human-readable strings with icons | Test: `PropertyPurchased` event → "🏠 Player 1 bought Baltic Avenue for $60" |
| P4.S4.T2 | Implement activity feed panel — scrollable list positioned in dashboard area | Visual: feed panel shows last N events; scrollable; newest at bottom |
| P4.S4.T3 | Implement real-time event streaming — new events appear in feed as they happen | Test: action occurs → event appears in feed within 1 second |
| P4.S4.T4 | Implement toast notifications for high-impact events (bankruptcy, trade, monopoly achieved) | Visual: important events trigger toast notification in addition to feed entry |
| P4.S4.T5 | Implement sound effects system — audio manager with sound for dice roll, cash, card flip, notification | Test: sound manager plays correct audio file for each event type; respects mute setting |
| P4.S4.T6 | Implement sound toggle button — mute/unmute all game sounds | Visual: speaker icon toggles; sounds play/don't play accordingly |
| P4.S4.T7 | Implement feed filtering — toggle to show all events or only "my events" | Test: filter to "my events" → only events involving the local player shown |

### Step 4.5 — In-Game Chat

| ID | Task | Test |
|----|------|------|
| P4.S5.T1 | Implement `ChatPanel` component — message list with text input at bottom | Render test: panel renders with input field and send button |
| P4.S5.T2 | Implement chat message display — player name (colored by token), message text, timestamp | Render test: message shows colored name, text, and time |
| P4.S5.T3 | Wire send message → emits `chatMessage` to server → server broadcasts to room → appears in all clients | Integration test: send "hello" → all clients see the message |
| P4.S5.T4 | Implement chat scroll — auto-scroll to newest message; scroll lock when user scrolls up | Visual: new messages auto-scroll; scrolling up holds position with "new messages" indicator |
| P4.S5.T5 | Implement chat panel toggle on mobile — collapsible chat drawer | Visual: chat icon button opens/closes chat panel as overlay on mobile |
| P4.S5.T6 | Implement spectator chat — eliminated players can send and receive messages | Test: spectator sends message → active players see it with "Spectator" badge |

### Step 4.6 — Visual & UX Polish

| ID | Task | Test |
|----|------|------|
| P4.S6.T1 | Refine token movement animation — smooth easing, appropriate speed, pause on pass Go | Visual: movement feels natural; not too fast or too slow |
| P4.S6.T2 | Refine dice roll animation — satisfying tumble effect with anticipation | Visual: dice animation feels tactile and fun |
| P4.S6.T3 | Implement card flip animation for Chance/CC — card flips from back to front | Visual: card starts face-down, flips to reveal text |
| P4.S6.T4 | Implement loading skeleton screens for game page while state loads | Visual: skeleton placeholders shown before game state arrives |
| P4.S6.T5 | Implement error boundary component with fallback UI and retry button | Test: component throwing error → fallback UI shown with retry option |
| P4.S6.T6 | Implement connection error states — "Unable to connect" with retry | Visual: if Socket.IO can't connect, error message with retry button shown |
| P4.S6.T7 | Implement keyboard navigation for all interactive elements | Test: tab through all buttons, modals, and inputs; Enter/Space activates them |
| P4.S6.T8 | Add ARIA labels and roles to all game UI elements | Test: screen reader announces element purposes correctly |
| P4.S6.T9 | Add ARIA live regions for game event announcements (dice results, turn changes) | Test: screen reader announces "Player 1 rolled 7" when dice are rolled |
| P4.S6.T10 | Implement color-blind-friendly property indicators — add pattern or icon overlays to color bands | Visual: each color group has a unique pattern (stripes, dots, crosshatch) in addition to color |
| P4.S6.T11 | Add focus-visible outlines to all interactive elements for keyboard users | Visual: tabbing through elements shows clear focus indicator |

---

## Phase 5: Mobile Optimization & Cross-Browser QA

### Step 5.1 — Mobile Touch Optimization

| ID | Task | Test |
|----|------|------|
| P5.S1.T1 | Implement tap-on-space interaction for mobile — tap to select a space and view its details | Test on mobile: tap property space → detail card opens |
| P5.S1.T2 | Implement pinch-to-zoom on Pixi.js canvas using touch events | Test on mobile: two-finger pinch zooms board in/out smoothly |
| P5.S1.T3 | Implement pan/drag on zoomed board using single-finger touch | Test on mobile: when zoomed, single finger drag pans the view |
| P5.S1.T4 | Implement double-tap to reset zoom level | Test on mobile: double-tap board → zoom resets to fit-to-viewport |
| P5.S1.T5 | Prevent browser zoom on game page — only board canvas zooms | Test: pinching on the game page zooms the board, not the browser viewport |
| P5.S1.T6 | Ensure action buttons have sufficient spacing for thumb interaction | Visual at 375px: buttons don't overlap; enough space between to avoid mis-taps |
| P5.S1.T7 | Handle virtual keyboard appearance — chat input doesn't get hidden behind keyboard | Test on mobile: opening keyboard to type chat message keeps input visible |

### Step 5.2 — Responsive Layout Refinement

| ID | Task | Test |
|----|------|------|
| P5.S2.T1 | Test and fix layout at 320px viewport width (small phones) | Visual: all content accessible; no horizontal overflow; text readable |
| P5.S2.T2 | Test and fix layout at 375px viewport width (iPhone SE / standard) | Visual: game playable; board visible; dashboard accessible |
| P5.S2.T3 | Test and fix layout at 414px viewport width (larger phones) | Visual: proportions look good; no wasted space |
| P5.S2.T4 | Test and fix layout at 768px viewport width (tablet portrait) | Visual: board and dashboard both visible without scrolling |
| P5.S2.T5 | Test and fix layout at 1024px viewport width (tablet landscape / small desktop) | Visual: full experience displayed; comfortable proportions |
| P5.S2.T6 | Test and fix layout at 1440px+ viewport width (large desktop) | Visual: content well-centered; no extreme stretching |
| P5.S2.T7 | Implement landscape orientation handling on mobile — show board in landscape mode | Visual: rotating phone to landscape shows wider board view |
| P5.S2.T8 | Implement dynamic Pixi.js canvas resolution — lower resolution on weak devices for performance | Test: on low-DPI mock, canvas renders at 1x; on high-DPI, renders at 2x max |

### Step 5.3 — Performance Optimization

| ID | Task | Test |
|----|------|------|
| P5.S3.T1 | Create sprite atlas for all board assets (tokens, houses, hotels, dice, icons) | Test: single texture atlas loaded instead of individual images; fewer draw calls |
| P5.S3.T2 | Implement Pixi.js sprite batching for house/hotel rendering | Test: rendering 32 houses uses batch rendering; FPS stays above 30 |
| P5.S3.T3 | Analyze and optimize Next.js bundle size — identify and code-split large dependencies | Test: `next build` reports main bundle < 200KB gzipped |
| P5.S3.T4 | Implement lazy loading for Pixi.js — don't load the canvas engine until entering the game page | Test: home and lobby pages don't load Pixi.js bundle |
| P5.S3.T5 | Implement lazy loading for sound assets — load on first interaction, not on page load | Test: page load doesn't fetch audio files; first action triggers audio load |
| P5.S3.T6 | Enable Socket.IO binary parser and message compression | Test: Socket.IO messages are smaller with compression enabled (compare wire size) |
| P5.S3.T7 | Profile memory usage during a 50-turn game simulation — no memory leaks | Test: memory usage stays stable (no unbounded growth) over 50 turns |
| P5.S3.T8 | Implement Pixi.js ticker optimization — only render when state changes, not every frame | Test: FPS counter shows rendering pauses when no animation is active |

### Step 5.4 — Cross-Browser Testing

| ID | Task | Test |
|----|------|------|
| P5.S4.T1 | Test full game flow in Chrome (latest 2 versions) — create, join, play, win | Pass: all flows work without errors |
| P5.S4.T2 | Test full game flow in Firefox (latest 2 versions) | Pass: all flows work without errors |
| P5.S4.T3 | Test full game flow in Safari (latest 2 versions) | Pass: all flows work without errors; WebSocket connects |
| P5.S4.T4 | Test full game flow in Edge (latest 2 versions) | Pass: all flows work without errors |
| P5.S4.T5 | Test on iOS Safari (iPhone) — touch, zoom, layout, WebSocket | Pass: game playable; touch interactions work; WebSocket stable |
| P5.S4.T6 | Test on Android Chrome (phone) — touch, zoom, layout, WebSocket | Pass: game playable; touch interactions work; WebSocket stable |
| P5.S4.T7 | Test canvas rendering consistency across all browsers — no visual glitches | Pass: board looks identical across browsers; no rendering artifacts |
| P5.S4.T8 | Test WebSocket reconnection across all browsers | Pass: disconnect and reconnect works on all tested browsers |

---

## Phase 6: Testing, CI/CD & Deployment

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

---

## Task Summary

| Phase | Steps | Tasks | Delta from v1 |
|-------|-------|-------|---------------|
| Phase 0 | 5 | 45 | +14 (board validation, card enumeration, tokens, denominations, title deeds, action types) |
| Phase 1A | 10 | 136 | +48 (rent validation, CC repairs, nearest RR/utility from all positions, dual GOOJF, building auction, missing card effects, chain resolution) |
| Phase 1B | 7 | 72 | +12 (railroad card, utility card, title deed component) |
| Phase 2 | 6 | 38 | — |
| Phase 3A | 5 | 43 | +5 (CC repairs UI, nearest RR/utility UI) |
| Phase 3B | 5 | 46 | +5 (declining player in auction, building auction UI) |
| Phase 4 | 6 | 42 | -6 (recount correction) |
| Phase 5 | 4 | 31 | — |
| Phase 6 | 5 | 58 | +19 (edge cases for new rules, E2E for auction/cards/mortgage) |
| **Total** | **53** | **511** | **+97 new tasks** |
