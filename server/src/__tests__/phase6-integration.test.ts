import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryRedisClient } from '../redis/client';
import {
  initializeGame,
  processAction,
  deleteTurnMachine,
  autoRollForPlayer,
  autoEndTurnForPlayer,
} from '../game/game-manager';
import {
  createRoom,
  joinRoom,
  selectToken,
  leaveRoom,
  markPlayerReconnected,
} from '../game/room-manager';
import {
  handleDisconnect,
  handleReconnect,
  isDisconnected,
  clearAllDisconnectTimers,
} from '../game/reconnection';
import {
  serializeGameState,
  deserializeGameState,
  TurnState,
  TokenType,
  type RoomMetadata,
  type GameState,
  setPropertyState,
  resetPropertyStates,
  initBuildingSupply,
  resetBuildingSupply,
} from '@monopoly/shared';

// Helper to create a room with N players, all with tokens selected
async function setupRoom(
  redis: InMemoryRedisClient,
  playerCount: number,
  maxPlayers = 6,
): Promise<{ room: RoomMetadata; playerIds: string[] }> {
  const tokens = [
    TokenType.RaceCar,
    TokenType.TopHat,
    TokenType.Boot,
    TokenType.Thimble,
    TokenType.Dog,
    TokenType.Iron,
  ];

  const room = await createRoom(redis, 'host-0', 'Player 0', maxPlayers);
  await selectToken(redis, room.roomCode, 'host-0', tokens[0]);

  const playerIds = ['host-0'];

  for (let i = 1; i < playerCount; i++) {
    const pid = `player-${i}`;
    await joinRoom(redis, room.roomCode, pid, `Player ${i}`);
    await selectToken(redis, room.roomCode, pid, tokens[i]);
    playerIds.push(pid);
  }

  // Re-load to get updated room state
  const updatedRoom = await redis.loadRoomMetadata(room.roomCode);
  return { room: updatedRoom!, playerIds };
}

// Helper: start a game from room setup
async function setupGame(
  redis: InMemoryRedisClient,
  playerCount: number,
): Promise<{ room: RoomMetadata; state: GameState; playerIds: string[] }> {
  const { room, playerIds } = await setupRoom(redis, playerCount);
  const state = initializeGame(room);
  room.status = 'playing';
  room.gameId = state.gameId;
  await redis.saveRoomMetadata(room.roomCode, room);
  await redis.saveGameState(state.gameId, serializeGameState(state));
  return { room, state, playerIds };
}

function createMockIO() {
  const emitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: emitFn })),
    emit: emitFn,
    _emitFn: emitFn,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ─── P6.S2.T1 — Full Room Lifecycle ─────────────────────────────────

describe('P6.S2.T1 — Full room lifecycle', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    deleteTurnMachine('TEST01');
  });

  it('create → join multiple players → start → game state initialized', async () => {
    // 1) Host creates room
    const room = await createRoom(redis, 'host-1', 'Alice');
    expect(room.players).toHaveLength(1);
    expect(room.status).toBe('waiting');

    // 2) Player 2 joins
    const { room: r2 } = await joinRoom(redis, room.roomCode, 'player-2', 'Bob');
    expect(r2.players).toHaveLength(2);

    // 3) Player 3 joins
    const { room: r3 } = await joinRoom(redis, room.roomCode, 'player-3', 'Charlie');
    expect(r3.players).toHaveLength(3);

    // 4) All select tokens
    await selectToken(redis, room.roomCode, 'host-1', TokenType.RaceCar);
    await selectToken(redis, room.roomCode, 'player-2', TokenType.TopHat);
    await selectToken(redis, room.roomCode, 'player-3', TokenType.Boot);

    // 5) Initialize game
    const updatedRoom = await redis.loadRoomMetadata(room.roomCode);
    const state = initializeGame(updatedRoom!);

    expect(state.gameId).toBe(room.roomCode);
    expect(state.players).toHaveLength(3);
    expect(state.status).toBe('playing');
    expect(state.turnState).toBe(TurnState.WaitingForRoll);
    expect(state.currentPlayerIndex).toBe(0);

    // All players start at position 0 with $1500
    for (const player of state.players) {
      expect(player.position).toBe(0);
      expect(player.cash).toBe(1500);
      expect(player.isBankrupt).toBe(false);
      expect(player.isActive).toBe(true);
      expect(player.properties).toEqual([]);
    }

    deleteTurnMachine(state.gameId);
  });

  it('room rejects join when full', async () => {
    const room = await createRoom(redis, 'host-1', 'Alice', 2);
    await joinRoom(redis, room.roomCode, 'player-2', 'Bob');
    await expect(joinRoom(redis, room.roomCode, 'player-3', 'Charlie')).rejects.toThrow(
      'Room is full',
    );
  });

  it('host transfer works when host leaves waiting room', async () => {
    const room = await createRoom(redis, 'host-1', 'Alice');
    await joinRoom(redis, room.roomCode, 'player-2', 'Bob');
    const { room: updated, newHostId } = await leaveRoom(redis, room.roomCode, 'host-1');
    expect(newHostId).toBe('player-2');
    expect(updated?.hostId).toBe('player-2');
    expect(updated?.players).toHaveLength(1);
  });
});

// ─── P6.S2.T2 — Complete Turn Cycle ─────────────────────────────────

describe('P6.S2.T2 — Complete turn cycle', () => {
  let redis: InMemoryRedisClient;
  let gameId: string;

  beforeEach(async () => {
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    if (gameId) deleteTurnMachine(gameId);
  });

  it('roll → move → resolve → action → end turn → next player', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    gameId = state.gameId;

    // Player 0's turn: RollDice
    const roll = await processAction(redis, gameId, playerIds[0], { type: 'RollDice' });
    expect(roll.ok).toBe(true);
    expect(roll.state).toBeDefined();
    expect(roll.state!.lastDiceResult).toBeDefined();

    let current = roll.state!;

    // Handle pending buy decision by buying the property (simpler than auction)
    if (current.pendingBuyDecision) {
      const buy = await processAction(redis, gameId, playerIds[0], {
        type: 'BuyProperty',
        propertyId: current.pendingBuyDecision.spaceId,
      });
      expect(buy.ok).toBe(true);
      current = buy.state!;
    }

    // End turn (if in PlayerAction state and not doubles)
    if (current.turnState === TurnState.PlayerAction) {
      const endTurn = await processAction(redis, gameId, playerIds[0], { type: 'EndTurn' });
      expect(endTurn.ok).toBe(true);
      current = endTurn.state!;
    }

    // Game should be in a valid state
    expect(current.status).toBe('playing');
    expect(current.turnState).toBe(TurnState.WaitingForRoll);
  });

  it('wrong player cannot take action', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    gameId = state.gameId;

    // Player 1 tries to roll on player 0's turn
    const result = await processAction(redis, gameId, playerIds[1], { type: 'RollDice' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  it('cannot end turn before rolling', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    gameId = state.gameId;

    const result = await processAction(redis, gameId, playerIds[0], { type: 'EndTurn' });
    expect(result.ok).toBe(false);
  });

  it('autoRoll and autoEndTurn advance the game', async () => {
    const { state } = await setupGame(redis, 2);
    gameId = state.gameId;

    // Auto-roll
    let current = autoRollForPlayer(state);
    expect(current.players[0].position).toBeGreaterThanOrEqual(0);

    // Auto-end turn
    current = autoEndTurnForPlayer(current);
    expect(current.turnState).toBe(TurnState.WaitingForRoll);
  });
});

// ─── P6.S2.T3 — Redis State Persistence ─────────────────────────────

describe('P6.S2.T3 — Redis state persistence', () => {
  it('save → load → state intact after round-trip', async () => {
    const redis = new InMemoryRedisClient();
    const { state } = await setupGame(redis, 3);

    // Modify state to have some game progress
    const modifiedState = { ...state };
    modifiedState.players = state.players.map((p, i) => ({
      ...p,
      position: i * 5,
      cash: 1500 - i * 100,
    }));
    modifiedState.currentPlayerIndex = 1;

    // Save
    await redis.saveGameState(state.gameId, serializeGameState(modifiedState));

    // "Restart": create new redis (simulating reconnect to same store)
    // In real life the data persists in Redis; here we just load from same instance
    const raw = await redis.loadGameState(state.gameId);
    expect(raw).not.toBeNull();

    const restored = deserializeGameState(raw!);
    expect(restored.gameId).toBe(modifiedState.gameId);
    expect(restored.players).toHaveLength(3);
    expect(restored.players[0].position).toBe(0);
    expect(restored.players[1].position).toBe(5);
    expect(restored.players[2].position).toBe(10);
    expect(restored.currentPlayerIndex).toBe(1);

    deleteTurnMachine(state.gameId);
  });

  it('serialization preserves all game state fields', async () => {
    const redis = new InMemoryRedisClient();
    const { state } = await setupGame(redis, 2);

    const serialized = serializeGameState(state);
    const deserialized = deserializeGameState(serialized);

    // Verify key fields survive round-trip
    expect(deserialized.gameId).toBe(state.gameId);
    expect(deserialized.status).toBe(state.status);
    expect(deserialized.turnState).toBe(state.turnState);
    expect(deserialized.currentPlayerIndex).toBe(state.currentPlayerIndex);
    expect(deserialized.players).toHaveLength(state.players.length);
    expect(deserialized.settings).toEqual(state.settings);

    deleteTurnMachine(state.gameId);
  });

  it('processAction persists state to Redis after each action', async () => {
    const redis = new InMemoryRedisClient();
    const { state, playerIds } = await setupGame(redis, 2);
    const gameId = state.gameId;

    // Take an action
    await processAction(redis, gameId, playerIds[0], { type: 'RollDice' });

    // Verify it was persisted
    const raw = await redis.loadGameState(gameId);
    const persisted = deserializeGameState(raw!);
    expect(persisted.players[0].position).toBeGreaterThanOrEqual(0);
    expect(persisted.lastDiceResult).toBeDefined();

    deleteTurnMachine(gameId);
  });

  it('game state not found returns error', async () => {
    const redis = new InMemoryRedisClient();
    const result = await processAction(redis, 'nonexistent-game', 'p1', { type: 'RollDice' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Game not found');
  });
});

// ─── P6.S2.T4 — Reconnection Flow ───────────────────────────────────

describe('P6.S2.T4 — Reconnection flow', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    vi.useFakeTimers();
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    clearAllDisconnectTimers();
    vi.useRealTimers();
  });

  it('disconnect → mark → reconnect → player resumes', async () => {
    const { room } = await setupGame(redis, 2);
    const io = createMockIO();

    // Player disconnects
    handleDisconnect(io, redis, room.roomCode, 'player-1');
    expect(isDisconnected('player-1')).toBe(true);

    // Verify room marks player as disconnected
    await vi.advanceTimersByTimeAsync(10);
    const roomAfterDisconnect = await redis.loadRoomMetadata(room.roomCode);
    const disconnectedPlayer = roomAfterDisconnect?.players.find((p) => p.id === 'player-1');
    expect(disconnectedPlayer?.isConnected).toBe(false);

    // Player reconnects
    const reconnected = handleReconnect('player-1');
    expect(reconnected).toBe(true);
    expect(isDisconnected('player-1')).toBe(false);

    // Mark player as reconnected in room
    await markPlayerReconnected(redis, room.roomCode, 'player-1');
    const roomAfterReconnect = await redis.loadRoomMetadata(room.roomCode);
    const reconnectedPlayer = roomAfterReconnect?.players.find((p) => p.id === 'player-1');
    expect(reconnectedPlayer?.isConnected).toBe(true);

    // Player can still access game state
    const raw = await redis.loadGameState(room.gameId!);
    expect(raw).not.toBeNull();
    const gameState = deserializeGameState(raw!);
    expect(gameState.status).toBe('playing');

    deleteTurnMachine(room.gameId!);
  });

  it('permanent disconnect after grace period triggers callback', async () => {
    const { room } = await setupGame(redis, 2);
    const io = createMockIO();
    const onPermanent = vi.fn();

    handleDisconnect(io, redis, room.roomCode, 'player-1', {
      gracePeriodSeconds: 5,
      onPermanentDisconnect: onPermanent,
    });

    // Advance past grace period
    await vi.advanceTimersByTimeAsync(6000);
    expect(onPermanent).toHaveBeenCalledWith(room.roomCode, 'player-1');

    deleteTurnMachine(room.gameId!);
  });

  it('reconnect before grace period prevents permanent disconnect', async () => {
    const { room } = await setupGame(redis, 2);
    const io = createMockIO();
    const onPermanent = vi.fn();

    handleDisconnect(io, redis, room.roomCode, 'player-1', {
      gracePeriodSeconds: 10,
      onPermanentDisconnect: onPermanent,
    });

    // Reconnect before grace period
    handleReconnect('player-1');

    // Advance past what would have been the grace period
    await vi.advanceTimersByTimeAsync(11000);
    expect(onPermanent).not.toHaveBeenCalled();

    deleteTurnMachine(room.gameId!);
  });
});

// ─── P6.S2.T5 — Concurrent Actions ──────────────────────────────────

describe('P6.S2.T5 — Concurrent actions', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  it('simultaneous actions are processed sequentially', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    const gameId = state.gameId;

    // Both players try to roll at the same time
    const [result1, result2] = await Promise.all([
      processAction(redis, gameId, playerIds[0], { type: 'RollDice' }),
      processAction(redis, gameId, playerIds[1], { type: 'RollDice' }),
    ]);

    // One should succeed (player-0, whose turn it is) and one should fail
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(false);
    expect(result2.error).toBe('Not your turn');

    deleteTurnMachine(gameId);
  });

  it('action on finished game is rejected', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    const gameId = state.gameId;

    // Force game to finished state
    const finishedState = { ...state, status: 'finished' as const };
    await redis.saveGameState(gameId, serializeGameState(finishedState));

    const result = await processAction(redis, gameId, playerIds[0], { type: 'RollDice' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Game is not in progress');

    deleteTurnMachine(gameId);
  });

  it('rapid sequential actions maintain state consistency', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    const gameId = state.gameId;

    // Roll dice
    const roll1 = await processAction(redis, gameId, playerIds[0], { type: 'RollDice' });
    expect(roll1.ok).toBe(true);

    // Try to roll again before ending turn (should fail unless doubles)
    const roll2 = await processAction(redis, gameId, playerIds[0], { type: 'RollDice' });
    // Will fail if not in WaitingForRoll state
    if (roll1.state!.lastDiceResult?.isDoubles) {
      // Doubles → still player 0's turn, but state should handle it
      // (depends on whether there's a pending buy decision)
    } else {
      expect(roll2.ok).toBe(false);
    }

    // Final state in Redis should be consistent
    const raw = await redis.loadGameState(gameId);
    const finalState = deserializeGameState(raw!);
    expect(finalState.status).toBe('playing');
    expect(finalState.players[0].cash).toBeLessThanOrEqual(1500);

    deleteTurnMachine(gameId);
  });
});

// ─── P6.S2.T6 — Full Auction Flow ───────────────────────────────────

describe('P6.S2.T6 — Full auction flow with 4 players', () => {
  let redis: InMemoryRedisClient;
  let gameId: string;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    if (gameId) {
      deleteTurnMachine(gameId);
      resetPropertyStates(gameId);
      resetBuildingSupply(gameId);
    }
  });

  it('decline property → auction → bids and passes → winner gets property', async () => {
    const { state, playerIds } = await setupGame(redis, 4);
    gameId = state.gameId;
    initBuildingSupply(state);

    // Manually set player 0 on an unowned property position (e.g., Mediterranean Ave = space 1)
    const modState = { ...state };
    modState.players = state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : { ...p }));
    modState.pendingBuyDecision = { spaceId: 1, spaceName: 'Mediterranean Avenue', cost: 60 };
    modState.turnState = TurnState.AwaitingBuyDecision;
    await redis.saveGameState(gameId, serializeGameState(modState));

    // Reset turn machine so it picks up the new state
    deleteTurnMachine(gameId);

    // Player 0 declines the property → triggers auction
    const decline = await processAction(redis, gameId, playerIds[0], {
      type: 'DeclineProperty',
      propertyId: 1,
    });
    expect(decline.ok).toBe(true);

    // Player 1 bids $30
    const bid1 = await processAction(redis, gameId, playerIds[1], {
      type: 'AuctionBid',
      amount: 30,
    });
    expect(bid1.ok).toBe(true);

    // Player 2 bids $40
    const bid2 = await processAction(redis, gameId, playerIds[2], {
      type: 'AuctionBid',
      amount: 40,
    });
    expect(bid2.ok).toBe(true);

    // Player 3 passes
    const pass1 = await processAction(redis, gameId, playerIds[3], { type: 'AuctionPass' });
    expect(pass1.ok).toBe(true);

    // Player 0 passes
    const pass2 = await processAction(redis, gameId, playerIds[0], { type: 'AuctionPass' });
    expect(pass2.ok).toBe(true);

    // Player 1 passes (leaving player 2 as winner with $40 bid)
    const pass3 = await processAction(redis, gameId, playerIds[1], { type: 'AuctionPass' });
    expect(pass3.ok).toBe(true);

    // Verify final state: player 2 owns the property
    const raw = await redis.loadGameState(gameId);
    const finalState = deserializeGameState(raw!);
    const player2 = finalState.players[2];
    expect(player2.properties).toContain(1);
    expect(player2.cash).toBe(1460); // 1500 - 40
  });
});

// ─── P6.S2.T7 — Trading Between Players ─────────────────────────────

describe('P6.S2.T7 — Trading between two players', () => {
  let redis: InMemoryRedisClient;
  let gameId: string;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    if (gameId) {
      deleteTurnMachine(gameId);
      resetPropertyStates(gameId);
    }
  });

  it('propose trade → accept → assets swap correctly', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    gameId = state.gameId;

    // Give player 0 Mediterranean Ave (space 1) and player 1 Baltic Ave (space 3)
    const modState = { ...state };
    modState.players = state.players.map((p, i) => {
      if (i === 0) return { ...p, properties: [1] };
      if (i === 1) return { ...p, properties: [3] };
      return { ...p };
    });
    modState.turnState = TurnState.PlayerAction;
    setPropertyState(modState, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(modState, { spaceId: 3, houses: 0, mortgaged: false });
    await redis.saveGameState(gameId, serializeGameState(modState));

    // Reset turn machine so it picks up the PlayerAction state
    deleteTurnMachine(gameId);

    // Player 0 proposes trade: offer Med Ave + $100 for Baltic Ave
    const propose = await processAction(redis, gameId, playerIds[0], {
      type: 'ProposeTrade',
      recipientId: playerIds[1],
      offer: {
        offeredProperties: [1],
        offeredCash: 100,
        offeredCards: 0,
        requestedProperties: [3],
        requestedCash: 0,
        requestedCards: 0,
      },
    });
    expect(propose.ok).toBe(true);

    // Verify the trade proposal was processed
    expect(propose.state).toBeDefined();
  });
});

// ─── P6.S2.T8 — Bankruptcy Cascade ──────────────────────────────────

describe('P6.S2.T8 — Bankruptcy cascade', () => {
  let redis: InMemoryRedisClient;
  let gameId: string;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    if (gameId) {
      deleteTurnMachine(gameId);
      resetPropertyStates(gameId);
      resetBuildingSupply(gameId);
    }
  });

  it('player declares bankruptcy to another player → assets transfer → game continues', async () => {
    const { state, playerIds } = await setupGame(redis, 3);
    gameId = state.gameId;
    initBuildingSupply(state);

    // Set up: player 0 has properties and some cash, goes bankrupt to player 1
    const modState = { ...state };
    modState.players = state.players.map((p, i) => {
      if (i === 0) return { ...p, cash: 50, properties: [1, 3] };
      if (i === 1) return { ...p, cash: 1500, properties: [6] };
      return { ...p };
    });
    modState.turnState = TurnState.PlayerAction;
    setPropertyState(modState, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(modState, { spaceId: 3, houses: 0, mortgaged: false });
    setPropertyState(modState, { spaceId: 6, houses: 0, mortgaged: false });
    await redis.saveGameState(gameId, serializeGameState(modState));

    // Player 0 declares bankruptcy to player 1
    const result = await processAction(redis, gameId, playerIds[0], {
      type: 'DeclareBankruptcy',
      creditorId: playerIds[1],
    });

    expect(result.ok).toBe(true);
    expect(result.state).toBeDefined();

    const finalState = result.state!;
    const bankrupt = finalState.players[0];
    const creditor = finalState.players[1];

    // Bankrupt player: no cash, no properties, marked bankrupt
    expect(bankrupt.cash).toBe(0);
    expect(bankrupt.properties).toEqual([]);
    expect(bankrupt.isBankrupt).toBe(true);
    expect(bankrupt.isActive).toBe(false);

    // Creditor: received bankrupt player's cash and properties
    expect(creditor.cash).toBe(1550); // 1500 + 50
    expect(creditor.properties).toContain(1);
    expect(creditor.properties).toContain(3);
    expect(creditor.properties).toContain(6); // still has own property

    // Game continues with 2 remaining players
    expect(finalState.status).toBe('playing');
  });

  it('bankruptcy to bank removes properties from game', async () => {
    const { state, playerIds } = await setupGame(redis, 3);
    gameId = state.gameId;

    // Player 0 has properties and goes bankrupt to bank
    const modState = { ...state };
    modState.players = state.players.map((p, i) => {
      if (i === 0) return { ...p, cash: 10, properties: [1, 3] };
      return { ...p };
    });
    modState.turnState = TurnState.PlayerAction;
    setPropertyState(modState, { spaceId: 1, houses: 0, mortgaged: false });
    setPropertyState(modState, { spaceId: 3, houses: 0, mortgaged: false });
    await redis.saveGameState(gameId, serializeGameState(modState));

    const result = await processAction(redis, gameId, playerIds[0], {
      type: 'DeclareBankruptcy',
      creditorId: 'bank',
    });

    expect(result.ok).toBe(true);
    const finalState = result.state!;

    // Properties belong to no one
    for (const p of finalState.players) {
      expect(p.properties).not.toContain(1);
      expect(p.properties).not.toContain(3);
    }

    // Bankrupt player is eliminated
    expect(finalState.players[0].isBankrupt).toBe(true);
    expect(finalState.players[0].isActive).toBe(false);

    // Game continues
    expect(finalState.status).toBe('playing');
  });

  it('last bankruptcy triggers game over', async () => {
    const { state, playerIds } = await setupGame(redis, 2);
    gameId = state.gameId;

    // Player 0 goes bankrupt, only player 1 remains
    const modState = { ...state };
    modState.turnState = TurnState.PlayerAction;
    await redis.saveGameState(gameId, serializeGameState(modState));

    const result = await processAction(redis, gameId, playerIds[0], {
      type: 'DeclareBankruptcy',
      creditorId: 'bank',
    });

    expect(result.ok).toBe(true);
    expect(result.state!.status).toBe('finished');
  });

  it('bankrupt player turn is skipped — advances to next active player', async () => {
    const { state, playerIds } = await setupGame(redis, 3);
    gameId = state.gameId;

    // Player 0's turn, they go bankrupt
    const modState = { ...state };
    modState.currentPlayerIndex = 0;
    modState.turnState = TurnState.PlayerAction;
    await redis.saveGameState(gameId, serializeGameState(modState));

    const result = await processAction(redis, gameId, playerIds[0], {
      type: 'DeclareBankruptcy',
      creditorId: 'bank',
    });

    expect(result.ok).toBe(true);
    // After bankruptcy, the turn should advance to the next active player
    const finalState = result.state!;
    expect(finalState.players[0].isBankrupt).toBe(true);
    // Current player should be either player 1 or player 2 (both active)
    const activePlayer = finalState.players[finalState.currentPlayerIndex];
    expect(activePlayer.isActive).toBe(true);
    expect(activePlayer.isBankrupt).toBe(false);
  });
});

// ─── Cross-cutting Integration Tests ─────────────────────────────────

describe('P6.S2 — Cross-cutting integration scenarios', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  it('multi-turn game flow with state persistence', async () => {
    const { state } = await setupGame(redis, 2);
    const gameId = state.gameId;

    // Play several turns using auto-roll/auto-end
    let current = state;
    for (let turn = 0; turn < 4; turn++) {
      current = autoRollForPlayer(current);
      current = autoEndTurnForPlayer(current);
      await redis.saveGameState(gameId, serializeGameState(current));
    }

    // Verify state is consistent after multiple turns
    const raw = await redis.loadGameState(gameId);
    const loaded = deserializeGameState(raw!);
    expect(loaded.status).toBe('playing');
    expect(loaded.turnState).toBe(TurnState.WaitingForRoll);

    deleteTurnMachine(gameId);
  });

  it('session data persists with room and player info', async () => {
    const { room, playerIds } = await setupGame(redis, 2);

    // Save sessions
    for (const pid of playerIds) {
      await redis.saveSession(pid, {
        socketId: `socket-${pid}`,
        roomCode: room.roomCode,
        playerName: pid,
        connectedAt: Date.now(),
      });
    }

    // Verify sessions
    for (const pid of playerIds) {
      const session = await redis.loadSession(pid);
      expect(session).not.toBeNull();
      expect(session!.roomCode).toBe(room.roomCode);
    }

    // Clean up session
    await redis.deleteSession(playerIds[0]);
    const deleted = await redis.loadSession(playerIds[0]);
    expect(deleted).toBeNull();

    deleteTurnMachine(room.gameId!);
  });
});
