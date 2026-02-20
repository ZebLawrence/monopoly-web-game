# Phase 4: Bankruptcy, Endgame & Polish

Completes the game loop and adds social/communication features.

**Depends on:** Phase 3A, Phase 3B
**Parallel with:** None
**Tasks:** 42

---

### Step 4.1 — Bankruptcy Flow

| ID       | Task                                                                                                      | Test                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P4.S1.T1 | Implement debt detection UI — "You owe $X but have $Y" warning modal when can't pay                       | Visual: modal appears with debt amount, current cash, and options to liquidate                    |
| P4.S1.T2 | Implement liquidation assistant — lists buildings that can be sold with refund values                     | Render test: shows all sellable buildings sorted by refund value                                  |
| P4.S1.T3 | Implement liquidation assistant — lists properties that can be mortgaged with values                      | Render test: shows mortgageable properties with their mortgage values                             |
| P4.S1.T4 | Implement running total in liquidation — updates as player sells/mortgages to show remaining debt         | Visual: "Debt: $200                                                                               | After selling: $50 remaining" → updates as assets are sold |
| P4.S1.T5 | Implement "Declare Bankruptcy" button — appears when player cannot cover debt even after full liquidation | Visual: button shown with confirmation prompt "Are you sure? This is irreversible."               |
| P4.S1.T6 | Wire bankruptcy declaration → emits DeclareBankruptcy → server processes → assets transfer to creditor    | Integration test: bankruptcy → all assets transfer to creditor player; bankrupt player eliminated |
| P4.S1.T7 | Implement bank bankruptcy — assets auctioned individually when debt is to bank                            | Integration test: bankrupt to bank → each property put up for auction sequentially                |
| P4.S1.T8 | Implement elimination visual — bankrupt player's token removed from board, grayed out in player list      | Visual: token disappears with fade animation; player name shows "Bankrupt" label                  |

### Step 4.2 — Endgame & Victory

| ID       | Task                                                                                           | Test                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| P4.S2.T1 | Implement win condition detection → when 1 player remains, server emits `gameOver` event       | Integration test: second-to-last player goes bankrupt → `gameOver` event with winner ID     |
| P4.S2.T2 | Create `VictoryScreen` overlay — shows winner's name, token, and "Winner!" banner              | Visual: full-screen overlay with celebration design                                         |
| P4.S2.T3 | Implement final standings table — all players ranked by elimination order (winner first)       | Render test: table shows player names, tokens, and finishing positions                      |
| P4.S2.T4 | Implement net worth breakdown for winner — cash + property values + building values            | Render test: breakdown shows cash, unmortgaged property total, building total, grand total  |
| P4.S2.T5 | Implement game statistics — turns played, properties bought, total rent collected, trades made | Render test: stats section shows aggregate game data                                        |
| P4.S2.T6 | Implement "Play Again" button → returns all players to lobby with same room                    | Test: click Play Again → navigate to lobby; room code preserved; players can start new game |
| P4.S2.T7 | Implement "Leave" button → exits to home page                                                  | Test: click Leave → navigate to home; player removed from room                              |

### Step 4.3 — Spectator Mode (Eliminated Players)

| ID       | Task                                                                                               | Test                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| P4.S3.T1 | Implement spectator state for eliminated players — remain in Socket.IO room, receive state updates | Test: eliminated player still receives `stateUpdate` events                                                    |
| P4.S3.T2 | Implement spectator UI — full board view, all player info visible, no action buttons               | Visual: eliminated player sees board and player info but action bar is hidden/replaced with "Spectating" label |
| P4.S3.T3 | Implement spectator badge — "Spectating" label on eliminated player's dashboard                    | Visual: prominent "You are spectating" indicator                                                               |

### Step 4.4 — Activity Feed & Notifications

| ID       | Task                                                                                                   | Test                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| P4.S4.T1 | Implement event-to-message formatter — converts GameEvents to human-readable strings with icons        | Test: `PropertyPurchased` event → "🏠 Player 1 bought Baltic Avenue for $60"            |
| P4.S4.T2 | Implement activity feed panel — scrollable list positioned in dashboard area                           | Visual: feed panel shows last N events; scrollable; newest at bottom                    |
| P4.S4.T3 | Implement real-time event streaming — new events appear in feed as they happen                         | Test: action occurs → event appears in feed within 1 second                             |
| P4.S4.T4 | Implement toast notifications for high-impact events (bankruptcy, trade, monopoly achieved)            | Visual: important events trigger toast notification in addition to feed entry           |
| P4.S4.T5 | Implement sound effects system — audio manager with sound for dice roll, cash, card flip, notification | Test: sound manager plays correct audio file for each event type; respects mute setting |
| P4.S4.T6 | Implement sound toggle button — mute/unmute all game sounds                                            | Visual: speaker icon toggles; sounds play/don't play accordingly                        |
| P4.S4.T7 | Implement feed filtering — toggle to show all events or only "my events"                               | Test: filter to "my events" → only events involving the local player shown              |

### Step 4.5 — In-Game Chat

| ID       | Task                                                                                                   | Test                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| P4.S5.T1 | Implement `ChatPanel` component — message list with text input at bottom                               | Render test: panel renders with input field and send button                                 |
| P4.S5.T2 | Implement chat message display — player name (colored by token), message text, timestamp               | Render test: message shows colored name, text, and time                                     |
| P4.S5.T3 | Wire send message → emits `chatMessage` to server → server broadcasts to room → appears in all clients | Integration test: send "hello" → all clients see the message                                |
| P4.S5.T4 | Implement chat scroll — auto-scroll to newest message; scroll lock when user scrolls up                | Visual: new messages auto-scroll; scrolling up holds position with "new messages" indicator |
| P4.S5.T5 | Implement chat panel toggle on mobile — collapsible chat drawer                                        | Visual: chat icon button opens/closes chat panel as overlay on mobile                       |
| P4.S5.T6 | Implement spectator chat — eliminated players can send and receive messages                            | Test: spectator sends message → active players see it with "Spectator" badge                |

### Step 4.6 — Visual & UX Polish

| ID        | Task                                                                                             | Test                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| P4.S6.T1  | Refine token movement animation — smooth easing, appropriate speed, pause on pass Go             | Visual: movement feels natural; not too fast or too slow                                       |
| P4.S6.T2  | Refine dice roll animation — satisfying tumble effect with anticipation                          | Visual: dice animation feels tactile and fun                                                   |
| P4.S6.T3  | Implement card flip animation for Chance/CC — card flips from back to front                      | Visual: card starts face-down, flips to reveal text                                            |
| P4.S6.T4  | Implement loading skeleton screens for game page while state loads                               | Visual: skeleton placeholders shown before game state arrives                                  |
| P4.S6.T5  | Implement error boundary component with fallback UI and retry button                             | Test: component throwing error → fallback UI shown with retry option                           |
| P4.S6.T6  | Implement connection error states — "Unable to connect" with retry                               | Visual: if Socket.IO can't connect, error message with retry button shown                      |
| P4.S6.T7  | Implement keyboard navigation for all interactive elements                                       | Test: tab through all buttons, modals, and inputs; Enter/Space activates them                  |
| P4.S6.T8  | Add ARIA labels and roles to all game UI elements                                                | Test: screen reader announces element purposes correctly                                       |
| P4.S6.T9  | Add ARIA live regions for game event announcements (dice results, turn changes)                  | Test: screen reader announces "Player 1 rolled 7" when dice are rolled                         |
| P4.S6.T10 | Implement color-blind-friendly property indicators — add pattern or icon overlays to color bands | Visual: each color group has a unique pattern (stripes, dots, crosshatch) in addition to color |
| P4.S6.T11 | Add focus-visible outlines to all interactive elements for keyboard users                        | Visual: tabbing through elements shows clear focus indicator                                   |

---
