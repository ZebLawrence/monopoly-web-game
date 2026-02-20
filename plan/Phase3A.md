# Phase 3A: Core Gameplay Integration

Wires the game engine's core turn mechanics into the live client-server system with full UI interactions.

**Depends on:** Phase 2
**Parallel with:** Phase 3B
**Tasks:** 43

---

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
