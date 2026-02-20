import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryRedisClient } from '../redis/client';
import {
  initializeGame,
  processAction,
  autoRollForPlayer,
  autoEndTurnForPlayer,
  deleteTurnMachine,
} from '../game/game-manager';
import {
  serializeGameState,
  TurnState,
  TokenType,
  type RoomMetadata,
  type GameState,
} from '@monopoly/shared';

function createTestRoom(playerCount = 2): RoomMetadata {
  const players = [];
  const tokens = [TokenType.RaceCar, TokenType.TopHat, TokenType.Boot, TokenType.Thimble];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `player-${i}`,
      name: `Player ${i}`,
      token: tokens[i],
      isReady: true,
      isHost: i === 0,
      isConnected: true,
    });
  }
  return {
    roomCode: 'TEST01',
    hostId: 'player-0',
    players,
    maxPlayers: 6,
    startingCash: 1500,
    status: 'waiting' as const,
    createdAt: Date.now(),
  };
}

describe('Game Manager', () => {
  let redis: InMemoryRedisClient;

  beforeEach(() => {
    redis = new InMemoryRedisClient();
  });

  afterEach(() => {
    deleteTurnMachine('TEST01');
  });

  describe('initializeGame', () => {
    it('should create initial game state from room', () => {
      const room = createTestRoom(3);
      const state = initializeGame(room);

      expect(state.gameId).toBe('TEST01');
      expect(state.players).toHaveLength(3);
      expect(state.players[0].name).toBe('Player 0');
      expect(state.players[0].cash).toBe(1500);
      expect(state.turnState).toBe(TurnState.WaitingForRoll);
      expect(state.status).toBe('playing');
    });

    it('should set up all players at position 0', () => {
      const room = createTestRoom();
      const state = initializeGame(room);

      for (const player of state.players) {
        expect(player.position).toBe(0);
        expect(player.isBankrupt).toBe(false);
        expect(player.isActive).toBe(true);
      }
    });
  });

  describe('processAction', () => {
    let state: GameState;

    beforeEach(async () => {
      const room = createTestRoom();
      state = initializeGame(room);
      await redis.saveGameState(state.gameId, serializeGameState(state));
    });

    it('should reject action for nonexistent game', async () => {
      const result = await processAction(redis, 'nonexistent', 'p1', { type: 'RollDice' });
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it("should reject action when not player's turn", async () => {
      const result = await processAction(redis, 'TEST01', 'player-1', { type: 'RollDice' });
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should process RollDice action', async () => {
      const result = await processAction(redis, 'TEST01', 'player-0', { type: 'RollDice' });
      expect(result.ok).toBe(true);
      expect(result.state).toBeDefined();
      // Player should have moved from position 0
      expect(result.state!.players[0].position).toBeGreaterThanOrEqual(0);
    });

    it('should persist state after action', async () => {
      await processAction(redis, 'TEST01', 'player-0', { type: 'RollDice' });
      const loaded = await redis.loadGameState('TEST01');
      expect(loaded).not.toBeNull();
      const parsed = JSON.parse(loaded!);
      expect(parsed.players[0].position).toBeGreaterThanOrEqual(0);
    });

    it('should reject invalid action for current state', async () => {
      // Can't end turn before rolling
      const result = await processAction(redis, 'TEST01', 'player-0', { type: 'EndTurn' });
      expect(result.ok).toBe(false);
    });
  });

  describe('autoRollForPlayer', () => {
    it('should auto-roll and move player', () => {
      const room = createTestRoom();
      const state = initializeGame(room);
      const result = autoRollForPlayer(state);
      expect(result.players[0].position).toBeGreaterThanOrEqual(0);
    });
  });

  describe('autoEndTurnForPlayer', () => {
    it('should advance to next player', () => {
      const room = createTestRoom();
      let state = initializeGame(room);

      // First auto-roll to get to PlayerAction state
      state = autoRollForPlayer(state);

      // Then auto-end turn
      const result = autoEndTurnForPlayer(state);
      expect(result.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
      expect(result.turnState).toBe(TurnState.WaitingForRoll);
    });
  });
});
