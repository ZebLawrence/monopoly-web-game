import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  getActivePlayer,
  getPlayerById,
  getSpaceByPosition,
  getPropertiesOwnedBy,
  isGameOver,
  serializeGameState,
  deserializeGameState,
  type PlayerSetup,
} from '../../engine/state';

const twoPlayers: PlayerSetup[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

describe('Step 1A.1 — Game State Manager', () => {
  describe('createInitialGameState', () => {
    it('P1A.S1.T1: creates a valid 2-player game with correct starting state', () => {
      const state = createInitialGameState(twoPlayers);
      expect(state.players).toHaveLength(2);
      for (const p of state.players) {
        expect(p.cash).toBe(1500);
        expect(p.position).toBe(0);
        expect(p.properties).toEqual([]);
        expect(p.isActive).toBe(true);
        expect(p.isBankrupt).toBe(false);
        expect(p.jailStatus).toEqual({ inJail: false });
      }
      expect(state.status).toBe('playing');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.board).toHaveLength(40);
    });

    it('P1A.S1.T2: creates games with 3, 4, 5, 6 players', () => {
      for (let count = 3; count <= 6; count++) {
        const players: PlayerSetup[] = Array.from({ length: count }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
        }));
        const state = createInitialGameState(players);
        expect(state.players).toHaveLength(count);
        for (const p of state.players) {
          expect(p.cash).toBe(1500);
          expect(p.position).toBe(0);
          expect(p.properties).toEqual([]);
        }
      }
    });

    it('rejects invalid player counts', () => {
      expect(() => createInitialGameState([{ id: 'p1', name: 'Solo' }])).toThrow();
      const sevenPlayers = Array.from({ length: 7 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
      }));
      expect(() => createInitialGameState(sevenPlayers)).toThrow();
    });
  });

  describe('getActivePlayer', () => {
    it('P1A.S1.T3: returns the player at currentPlayerIndex', () => {
      const players: PlayerSetup[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ];
      const state = createInitialGameState(players);
      state.currentPlayerIndex = 1;
      const active = getActivePlayer(state);
      expect(active.id).toBe('p2');
      expect(active.name).toBe('Bob');
    });
  });

  describe('getPlayerById', () => {
    it('P1A.S1.T4: finds existing player', () => {
      const state = createInitialGameState(twoPlayers);
      const player = getPlayerById(state, 'p1');
      expect(player).toBeDefined();
      expect(player!.name).toBe('Alice');
    });

    it('P1A.S1.T4: returns undefined for non-existent ID', () => {
      const state = createInitialGameState(twoPlayers);
      expect(getPlayerById(state, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getSpaceByPosition', () => {
    it('P1A.S1.T5: position 0 returns Go', () => {
      const state = createInitialGameState(twoPlayers);
      const space = getSpaceByPosition(state, 0);
      expect(space).toBeDefined();
      expect(space!.name).toBe('Go');
    });

    it('P1A.S1.T5: position 39 returns Boardwalk', () => {
      const state = createInitialGameState(twoPlayers);
      const space = getSpaceByPosition(state, 39);
      expect(space).toBeDefined();
      expect(space!.name).toBe('Boardwalk');
    });
  });

  describe('getPropertiesOwnedBy', () => {
    it('P1A.S1.T6: returns properties owned by player', () => {
      const state = createInitialGameState(twoPlayers);
      // Give player p1 three properties: Mediterranean (1), Baltic (3), Reading RR (5)
      state.players[0].properties = [1, 3, 5];
      const owned = getPropertiesOwnedBy(state, 'p1');
      expect(owned).toHaveLength(3);
      expect(owned.map((p) => p.spaceId).sort()).toEqual([1, 3, 5]);
    });

    it('returns empty array for player with no properties', () => {
      const state = createInitialGameState(twoPlayers);
      const owned = getPropertiesOwnedBy(state, 'p1');
      expect(owned).toEqual([]);
    });
  });

  describe('isGameOver', () => {
    it('P1A.S1.T7: returns false with 2 active players', () => {
      const state = createInitialGameState(twoPlayers);
      expect(isGameOver(state)).toBe(false);
    });

    it('P1A.S1.T7: returns true with 1 active player', () => {
      const state = createInitialGameState(twoPlayers);
      state.players[1].isActive = false;
      state.players[1].isBankrupt = true;
      expect(isGameOver(state)).toBe(true);
    });
  });

  describe('serialize / deserialize', () => {
    it('P1A.S1.T8: round-trips a game state', () => {
      const state = createInitialGameState(twoPlayers);
      state.players[0].cash = 1200;
      state.players[0].position = 5;
      const json = serializeGameState(state);
      const restored = deserializeGameState(json);
      expect(restored).toEqual(state);
    });
  });
});
