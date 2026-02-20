# Phase 1B: UI Foundation

Builds the Next.js application shell, Pixi.js board renderer, responsive layout system, and reusable UI components. No game logic integration yet — uses mock/static data.

**Depends on:** Phase 0
**Parallel with:** Phase 1A
**Tasks:** 72

---

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
