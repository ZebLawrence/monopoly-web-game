# Phase 3B: Property & Economy Integration

Wires property management, trading, and economic mechanics into the live system. Can proceed in parallel with Phase 3A.

**Depends on:** Phase 2
**Parallel with:** Phase 3A
**Tasks:** 46

---

### Step 3B.1 — Property Purchase & Auction UI

| ID         | Task                                                                                                                         | Test                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P3B.S1.T1  | Implement buy confirmation modal — shows property card, price, player's current cash, and Buy/Decline buttons                | Render test: modal shows correct property info; Buy deducts cash; Decline triggers auction |
| P3B.S1.T2  | Wire Buy button → emits BuyProperty → server validates and broadcasts → property ownership updates                           | Integration test: buy → property owner updated on all clients                              |
| P3B.S1.T3  | Wire Decline button → emits DeclineProperty → server starts auction → auction state broadcast                                | Integration test: decline → all clients enter auction state                                |
| P3B.S1.T3a | Verify declining player is included in auction — the player who declined to buy appears as an eligible bidder in the auction | Test: player declines → auction starts → that same player CAN place bids                   |
| P3B.S1.T4  | Create `AuctionPanel` component — shows property being auctioned, current high bid, high bidder name, timer                  | Render test: panel displays all auction info; updates on new bids                          |
| P3B.S1.T5  | Implement bid input — preset increment buttons ($1, $10, $50, $100) and custom amount input                                  | Render test: clicking $10 when current bid is $50 → bid input shows $60                    |
| P3B.S1.T6  | Wire "Place Bid" button → emits AuctionBid → server validates → broadcasts updated auction state                             | Integration test: bid placed → all clients see new high bid and bidder                     |
| P3B.S1.T7  | Wire "Pass" button → emits AuctionPass → player can no longer bid                                                            | Test: pass → player's bid controls disabled; player removed from active bidders            |
| P3B.S1.T8  | Implement auction countdown timer — resets on each new bid, expires when no bids for X seconds                               | Visual: timer counts down; resets on bid; reaching 0 ends auction                          |
| P3B.S1.T9  | Implement auction resolution UI — winner announcement, property transfer, cash deduction                                     | Visual: "Player 2 wins the auction for $120!" → property ownership updates on board        |
| P3B.S1.T10 | Implement auction with no bids result → "No bids — property remains unowned" notification                                    | Visual: all pass → property stays unowned; notification shown                              |

### Step 3B.2 — Rent Collection UI

| ID        | Task                                                                                                    | Test                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| P3B.S2.T1 | Implement rent breakdown display — show base rent, monopoly bonus, per-house/hotel rate                 | Visual: "Rent: $50 (base) + monopoly = $100" or "Rent: $750 (hotel)"                   |
| P3B.S2.T2 | Implement rent payment notification for payer — "You paid $X rent to Player Y for Z"                    | Render test: notification shows correct amount, recipient, and property name           |
| P3B.S2.T3 | Implement rent receipt notification for receiver — "Player X paid you $Y rent for Z"                    | Render test: property owner sees receipt notification                                  |
| P3B.S2.T4 | Implement cash transfer animation — visual cash flowing from payer to receiver                          | Visual: animated dollar amount moves between player panels                             |
| P3B.S2.T5 | Implement insufficient funds warning — "You owe $X but only have $Y — you must sell or mortgage assets" | Visual: warning modal appears with shortfall amount and links to sell/mortgage actions |

### Step 3B.3 — Building Management UI

| ID         | Task                                                                                                                                                                    | Test                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P3B.S3.T1  | Implement Build button → opens building interface showing eligible monopolies                                                                                           | Test: click Build → panel shows only color groups where player has monopoly                        |
| P3B.S3.T2  | Implement property selection in build interface — show each property in monopoly with current houses and "Add House" button                                             | Render test: each property shows house count; Add House button enabled only if even-build allows   |
| P3B.S3.T3  | Implement even-build visual enforcement — grayed out "Add House" for properties that would violate even build                                                           | Visual: if Baltic has 2, Mediterranean has 1 → Baltic's Add House is disabled                      |
| P3B.S3.T4  | Wire "Add House" → emits BuildHouse action → server validates → house appears on board                                                                                  | Integration test: build house → board renders new house sprite on property                         |
| P3B.S3.T5  | Implement hotel upgrade prompt — "Upgrade to Hotel?" when property reaches 4 houses                                                                                     | Visual: at 4 houses, button changes to "Build Hotel"; confirms upgrade                             |
| P3B.S3.T6  | Implement building supply display — "Houses remaining: X / Hotels remaining: Y"                                                                                         | Render test: displays current supply counts; updates after building                                |
| P3B.S3.T7  | Implement building supply exhaustion — disable build when no houses/hotels left                                                                                         | Visual: "No houses available" message when supply is 0                                             |
| P3B.S3.T8  | Implement Sell Buildings interface — select buildings to sell, shows half-price refund                                                                                  | Render test: each property shows "Sell House ($25 refund)" button                                  |
| P3B.S3.T9  | Wire "Sell House" → emits SellBuilding → server validates even-sell → house removed, cash refunded                                                                      | Integration test: sell house → house removed from board; cash increases by half price              |
| P3B.S3.T10 | Implement hotel sell → downgrade to 4 houses (if supply available) or blocked with explanation                                                                          | Visual: sell hotel → 4 houses appear; if insufficient house supply, shows error                    |
| P3B.S3.T11 | Implement building auction UI — when house/hotel supply is limited and multiple players want to build, a building auction interface appears for each contested building | Visual: "Building Auction: 1 House Available" → bidding interface → winner gets to place the house |

### Step 3B.4 — Mortgage Management UI

| ID        | Task                                                                                                    | Test                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P3B.S4.T1 | Implement Mortgage button → opens mortgage interface showing eligible properties                        | Test: click Mortgage → panel shows unmortgaged properties without buildings in their color group   |
| P3B.S4.T2 | Implement property selection for mortgage — shows mortgage value for each eligible property             | Render test: each property shows "Mortgage for $X" button                                          |
| P3B.S4.T3 | Wire "Mortgage" → emits MortgageProperty → server validates → property marked mortgaged on board        | Integration test: mortgage → property dims on board; cash increases by mortgage value              |
| P3B.S4.T4 | Implement mortgage restriction — can't mortgage if any property in color group has buildings            | Visual: properties in groups with buildings show "Sell buildings first" instead of mortgage button |
| P3B.S4.T5 | Implement Unmortgage interface — shows mortgaged properties with unmortgage cost (value + 10% interest) | Render test: mortgaged property shows "Unmortgage for $33" (if $30 mortgage value)                 |
| P3B.S4.T6 | Wire "Unmortgage" → emits UnmortgageProperty → server validates cash → property unmortgaged             | Integration test: unmortgage → property appearance restored; cash decreases by value + interest    |
| P3B.S4.T7 | Implement unmortgage insufficient funds — disable button with tooltip showing required amount           | Visual: button disabled; hover shows "Need $33 to unmortgage"                                      |

### Step 3B.5 — Trading UI

| ID         | Task                                                                                                      | Test                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P3B.S5.T1  | Implement Trade button → opens player selection — "Who do you want to trade with?"                        | Test: click Trade → list of other active players shown                                          |
| P3B.S5.T2  | Implement trade proposal builder — two columns: "You Offer" and "You Request"                             | Visual: two-column layout with property lists, cash input, and GOOJF card toggles               |
| P3B.S5.T3  | Implement property picker in trade builder — shows player's properties, toggleable selection              | Test: click property → added to offer; click again → removed                                    |
| P3B.S5.T4  | Implement cash input in trade builder — numeric input for offered/requested cash                          | Test: enter $200 in "You Offer" cash field → trade offer includes $200 cash                     |
| P3B.S5.T5  | Implement GOOJF card toggle in trade builder (if player holds any)                                        | Test: toggle GOOJF on → card included in offer                                                  |
| P3B.S5.T6  | Implement trade validation display — error message if trade is invalid (e.g., property has buildings)     | Visual: "Remove buildings before trading" error when selecting property with houses             |
| P3B.S5.T7  | Wire "Send Offer" → emits ProposeTrade → server validates → recipient receives trade proposal             | Integration test: send offer → recipient sees incoming trade modal                              |
| P3B.S5.T8  | Implement incoming trade modal for recipient — shows full offer with Accept/Reject/Counter buttons        | Render test: modal shows all offered and requested items; three action buttons                  |
| P3B.S5.T9  | Wire Accept button → emits AcceptTrade → server executes swap → all clients see updated state             | Integration test: accept → properties swap owners; cash transfers; board updates                |
| P3B.S5.T10 | Wire Reject button → emits RejectTrade → proposer notified                                                | Test: reject → proposer receives "Trade rejected" notification; no state changes                |
| P3B.S5.T11 | Wire Counter button → opens trade builder pre-filled with original trade (roles swapped) for modification | Test: counter → trade builder opens with swapped perspective; modified offer sends new proposal |
| P3B.S5.T12 | Implement trade notification for all players — "Player 1 traded with Player 2" in activity feed           | Test: completed trade → event appears in all players' activity feeds                            |

---
