# Phase 2: Real-Time Integration

Connects the game engine to a Socket.IO server and wires the client to receive and display live game state. This phase bridges Phase 1A and 1B.

**Depends on:** Phase 1A, Phase 1B
**Parallel with:** None
**Tasks:** 38

---

### Step 2.1 — Socket.IO Server Setup

| ID       | Task                                                                       | Test                                                                                       |
| -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P2.S1.T1 | Create Express server with Socket.IO attached in `/server/src/index.ts`    | Server starts on configured port; `curl http://localhost:PORT/health` returns 200          |
| P2.S1.T2 | Implement health check endpoint `GET /health` returning `{ status: 'ok' }` | HTTP GET `/health` returns 200 with JSON body                                              |
| P2.S1.T3 | Configure CORS to allow connections from Next.js dev server origin         | Client connects from localhost:3000 to server on localhost:3001 without CORS error         |
| P2.S1.T4 | Implement Socket.IO `connection` event handler that logs new connections   | Integration test: client connects → server logs connection; client appears in `io.sockets` |
| P2.S1.T5 | Implement Socket.IO `disconnect` event handler                             | Integration test: client disconnects → server logs disconnection and fires cleanup         |

### Step 2.2 — Redis Integration

| ID       | Task                                                                                               | Test                                                                           |
| -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| P2.S2.T1 | Set up Redis client connection with connection error handling and retry logic                      | Integration test: Redis client connects; on Redis down, logs error and retries |
| P2.S2.T2 | Implement `saveGameState(gameId, state)` → serializes and stores in Redis with key `game:{gameId}` | Test: save state; `redis.get('game:123')` returns serialized state             |
| P2.S2.T3 | Implement `loadGameState(gameId)` → retrieves and deserializes from Redis                          | Test: save then load → deserialized state deep-equals original                 |
| P2.S2.T4 | Implement `saveRoomMetadata(roomCode, metadata)` → stores room info (players, settings, status)    | Test: save metadata; retrieve → matches original                               |
| P2.S2.T5 | Implement `deleteGameState(gameId)` → removes game from Redis                                      | Test: save then delete → load returns null                                     |
| P2.S2.T6 | Implement TTL on game keys (e.g., 24 hours) for automatic cleanup of abandoned games               | Test: save with TTL; verify key has TTL set via `redis.ttl()`                  |

### Step 2.3 — Lobby & Room Management

| ID       | Task                                                                                                     | Test                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P2.S3.T1 | Implement `createRoom` server handler → generates unique 6-char room code, stores in Redis, returns code | Test: emit `createRoom` → receive `roomCreated` with 6-char alphanumeric code; Redis has room data |
| P2.S3.T2 | Implement room code uniqueness — regenerate if collision detected                                        | Test: mock Redis to return existing key → code regenerated until unique                            |
| P2.S3.T3 | Implement `joinRoom` server handler → validates code, adds player to room, joins Socket.IO room          | Test: emit `joinRoom` with valid code → receive `roomJoined`; other players receive `playerJoined` |
| P2.S3.T4 | Implement `joinRoom` validation → reject if room full, game already started, or invalid code             | Test: join full room → error; join started game → error; invalid code → error                      |
| P2.S3.T5 | Implement `selectToken` handler → updates player's token in room, broadcasts update                      | Test: emit `selectToken` → all clients receive `playerUpdated` with new token                      |
| P2.S3.T6 | Implement token uniqueness in room — reject if another player already has that token                     | Test: player 1 selects car; player 2 tries car → rejected with error                               |
| P2.S3.T7 | Implement `startGame` handler (host only) → initializes game state via engine, broadcasts `gameStarted`  | Test: host emits `startGame` → all clients receive `gameStarted` with initial game state           |
| P2.S3.T8 | Implement `startGame` validation → must be host, must have 2+ players                                    | Test: non-host tries to start → rejected; 1 player tries to start → rejected                       |
| P2.S3.T9 | Implement `leaveRoom` handler → removes player from room, broadcasts update, handles host transfer       | Test: player leaves → others receive `playerLeft`; if host left, new host assigned                 |

### Step 2.4 — Game State Synchronization

| ID       | Task                                                                                                                             | Test                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| P2.S4.T1 | Implement server action handler: receive `gameAction` → validate via engine → apply → persist to Redis → broadcast `stateUpdate` | Integration test: client emits action → all clients receive updated state; Redis contains new state         |
| P2.S4.T2 | Implement action rejection: invalid action returns error to sender only                                                          | Test: emit invalid action (e.g., roll dice when not your turn) → sender receives `actionError` with message |
| P2.S4.T3 | Implement client-side `useGameSocket` hook — connects to server, subscribes to `stateUpdate` events                              | React hook test: hook connects; on `stateUpdate` event, state value updates                                 |
| P2.S4.T4 | Implement client-side `emitAction(action)` function via the hook                                                                 | Test: calling `emitAction({ type: 'RollDice' })` sends the event to server                                  |
| P2.S4.T5 | Implement `useGameState` React context providing current game state to all components                                            | Test: provider wraps app; child components access state via `useGameState()` hook                           |
| P2.S4.T6 | Implement full-state broadcast (send complete state to all clients on every update)                                              | Test: state update broadcast contains all game state fields; client state matches server state              |

### Step 2.5 — Reconnection Handling

| ID       | Task                                                                                                | Test                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P2.S5.T1 | Store player-to-session mapping in Redis so disconnected players can be identified on reconnect     | Test: player connects → session stored; disconnect → session still exists in Redis                  |
| P2.S5.T2 | Implement disconnect detection → start grace period timer (120s default)                            | Test: player disconnects → server starts countdown; `playerDisconnected` event broadcast            |
| P2.S5.T3 | Implement reconnection → player reconnects within grace period → rejoin room, receive current state | Test: disconnect then reconnect within 120s → player receives full current game state               |
| P2.S5.T4 | Implement grace period timeout → mark player as permanently disconnected                            | Test: disconnect and wait >120s → player marked disconnected; other players notified                |
| P2.S5.T5 | Implement auto-action for disconnected player's turn → skip turn after timeout                      | Test: disconnected player's turn → after turn timeout, turn automatically advances                  |
| P2.S5.T6 | Create client-side reconnection overlay UI — "Reconnecting..." with countdown                       | Visual: on socket disconnect, overlay appears with status message; on reconnect, overlay disappears |
| P2.S5.T7 | Implement Socket.IO client auto-reconnect with exponential backoff                                  | Test: disconnect socket → client attempts reconnection with increasing intervals                    |

### Step 2.6 — Turn Management Server

| ID       | Task                                                                           | Test                                                                                               |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| P2.S6.T1 | Implement server-side turn timer — configurable duration per turn phase        | Test: set turn timer to 30s; after 30s of inactivity, auto-action fires                            |
| P2.S6.T2 | Implement turn timer broadcast — clients receive remaining time                | Test: clients receive `turnTimerUpdate` events with seconds remaining                              |
| P2.S6.T3 | Implement auto-roll on timeout when in WaitingForRoll state                    | Test: player doesn't roll within time limit → server auto-rolls and processes                      |
| P2.S6.T4 | Implement auto-end-turn on timeout when in PlayerAction state                  | Test: player doesn't act within time limit → turn automatically ends                               |
| P2.S6.T5 | Implement timer pause during auctions and trades (these have their own timing) | Test: auction starts → main turn timer pauses; auction ends → timer resumes or moves to next state |

---
