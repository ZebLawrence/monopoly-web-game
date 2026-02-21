import type { Socket } from 'socket.io';
import {
  serializeGameState,
  deserializeGameState,
  TurnState,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type InterServerEvents,
  type SocketData,
} from '@monopoly/shared';
import type { AppIO } from '../index';
import type { RedisClient } from '../redis/client';
import * as RoomManager from '../game/room-manager';
import * as GameManager from '../game/game-manager';
import * as Reconnection from '../game/reconnection';
import {
  startTurnTimer,
  pauseTurnTimer,
  resumeTurnTimer,
  shouldPauseForState,
} from '../game/turn-timer';
import { recordLatency } from '../metrics/latency-tracker';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSocketHandlers(io: AppIO, socket: AppSocket, redis: RedisClient): void {
  // --- Lobby / Room ---

  socket.on('createRoom', async (settings, callback) => {
    try {
      const playerId = socket.id;
      socket.data.playerId = playerId;
      socket.data.playerName = settings.playerName;

      const room = await RoomManager.createRoom(
        redis,
        playerId,
        settings.playerName,
        settings.maxPlayers,
        settings.startingCash,
      );

      socket.data.roomCode = room.roomCode;
      await socket.join(room.roomCode);

      // Save session
      await redis.saveSession(playerId, {
        socketId: socket.id,
        roomCode: room.roomCode,
        playerName: settings.playerName,
        connectedAt: Date.now(),
      });

      callback({ ok: true, roomCode: room.roomCode });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      callback({ ok: false, error: message });
    }
  });

  socket.on('joinRoom', async (data, callback) => {
    try {
      const playerId = socket.id;
      socket.data.playerId = playerId;
      socket.data.playerName = data.playerName;
      socket.data.roomCode = data.roomCode;

      const { room, player } = await RoomManager.joinRoom(
        redis,
        data.roomCode,
        playerId,
        data.playerName,
      );

      await socket.join(data.roomCode);

      // Save session
      await redis.saveSession(playerId, {
        socketId: socket.id,
        roomCode: data.roomCode,
        playerName: data.playerName,
        connectedAt: Date.now(),
      });

      // Notify others
      socket.to(data.roomCode).emit('playerJoined', player);
      // Send full room to joiner
      callback({ ok: true, room, playerId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      callback({ ok: false, error: message });
    }
  });

  socket.on('selectToken', async (data, callback) => {
    try {
      const playerId = socket.data.playerId ?? socket.id;
      const room = await RoomManager.selectToken(redis, data.roomCode, playerId, data.token);

      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        io.to(data.roomCode).emit('playerUpdated', player);
      }

      callback({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select token';
      callback({ ok: false, error: message });
    }
  });

  socket.on('startGame', async (data, callback) => {
    try {
      const playerId = socket.data.playerId ?? socket.id;
      const room = await redis.loadRoomMetadata(data.roomCode);

      if (!room) {
        callback({ ok: false, error: 'Room not found' });
        return;
      }
      if (room.hostId !== playerId) {
        callback({ ok: false, error: 'Only the host can start the game' });
        return;
      }
      if (room.players.length < 2) {
        callback({ ok: false, error: 'Need at least 2 players to start' });
        return;
      }

      // Initialize game state
      const state = GameManager.initializeGame(room);

      // Update room status
      room.status = 'playing';
      room.gameId = state.gameId;
      await redis.saveRoomMetadata(data.roomCode, room);

      // Persist game state
      await redis.saveGameState(state.gameId, serializeGameState(state));

      // Broadcast to all players
      io.to(data.roomCode).emit('gameStarted', state);

      // Start turn timer
      startTurnTimerForRoom(io, redis, data.roomCode, state);

      callback({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      callback({ ok: false, error: message });
    }
  });

  socket.on('leaveRoom', async (data, callback) => {
    try {
      const playerId = socket.data.playerId ?? socket.id;
      const { room, newHostId } = await RoomManager.leaveRoom(redis, data.roomCode, playerId);

      await socket.leave(data.roomCode);
      socket.data.roomCode = undefined;
      await redis.deleteSession(playerId);

      // Notify others
      io.to(data.roomCode).emit('playerLeft', { playerId, newHostId });

      if (room) {
        io.to(data.roomCode).emit('roomUpdated', room);
      }

      callback({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave room';
      callback({ ok: false, error: message });
    }
  });

  // --- Chat ---

  socket.on('chatMessage', async (data, callback) => {
    try {
      const playerId = socket.data.playerId ?? socket.id;
      const room = await redis.loadRoomMetadata(data.roomCode);

      if (!room) {
        callback({ ok: false, error: 'Room not found' });
        return;
      }

      // Resolve player name: prefer room player list, then game state, then socket data
      let playerName = socket.data.playerName ?? '';
      if (!playerName) {
        const roomPlayer = room.players.find(
          (p: { id: string; name: string }) => p.id === playerId,
        );
        if (roomPlayer) playerName = roomPlayer.name;
      }
      if (!playerName && room.gameId) {
        const raw = await redis.loadGameState(room.gameId);
        if (raw) {
          const gs = deserializeGameState(raw);
          const gsPlayer = gs.players.find((p: { id: string; name: string }) => p.id === playerId);
          if (gsPlayer) playerName = gsPlayer.name;
        }
      }
      if (!playerName) playerName = 'Unknown';

      // Update socket data with resolved name for future messages
      if (playerName !== 'Unknown') socket.data.playerName = playerName;

      // Check if player is a spectator (bankrupt but still in room)
      let isSpectator = false;
      if (room.gameId) {
        const raw = await redis.loadGameState(room.gameId);
        if (raw) {
          const state = deserializeGameState(raw);
          const player = state.players.find((p: { id: string }) => p.id === playerId);
          isSpectator = player ? player.isBankrupt : false;
        }
      }

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        playerId,
        playerName,
        message: data.message.slice(0, 500),
        timestamp: Date.now(),
        isSpectator,
      };

      io.to(data.roomCode).emit('chatMessage', message);
      callback({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      callback({ ok: false, error: message });
    }
  });

  // --- Game Actions ---

  socket.on('gameAction', async (data, callback) => {
    const actionStart = Date.now();
    try {
      const playerId = socket.data.playerId ?? socket.id;
      const room = await redis.loadRoomMetadata(data.roomCode);
      if (!room || !room.gameId) {
        callback({ ok: false, error: 'No active game' });
        return;
      }

      const result = await GameManager.processAction(redis, room.gameId, playerId, data.action);

      if (!result.ok) {
        socket.emit('actionError', { message: result.error ?? 'Action failed' });
        callback({ ok: false, error: result.error });
        return;
      }

      // Broadcast updated state
      if (result.state) {
        io.to(data.roomCode).emit('stateUpdate', result.state);

        const latencyMs = Date.now() - actionStart;
        recordLatency(latencyMs);
        console.log(JSON.stringify({ event: 'stateUpdate', latencyMs }));

        // Check for game over
        if (result.state.status === 'finished') {
          const { getWinner, calculateNetWorth } = await import('@monopoly/shared');
          const winnerId = getWinner(result.state);
          if (winnerId) {
            const standings = result.state.players.map((p, _idx) => {
              const netWorth = p.isBankrupt ? 0 : calculateNetWorth(result.state!, p.id);
              return {
                playerId: p.id,
                playerName: p.name,
                position: p.id === winnerId ? 1 : 0,
                netWorth,
                eliminationOrder: p.isBankrupt ? 1 : 0,
              };
            });
            // Sort: winner first, then by net worth descending
            standings.sort((a, b) => {
              if (a.playerId === winnerId) return -1;
              if (b.playerId === winnerId) return 1;
              return b.netWorth - a.netWorth;
            });
            standings.forEach((s, i) => {
              s.position = i + 1;
            });

            io.to(data.roomCode).emit('gameOver', { winnerId, standings });

            // Update room status
            const roomMeta = await redis.loadRoomMetadata(data.roomCode);
            if (roomMeta) {
              roomMeta.status = 'finished';
              await redis.saveRoomMetadata(data.roomCode, roomMeta);
            }
          }
        }

        // Handle turn timer based on new state
        if (result.state.status !== 'finished') {
          handleTurnTimerUpdate(io, redis, data.roomCode, result.state);
        }
      }

      callback({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      socket.emit('actionError', { message });
      callback({ ok: false, error: message });
    }
  });

  // --- Reconnection ---

  socket.on('reconnect', async (data, callback) => {
    try {
      // Cancel disconnect timer
      const wasDisconnected = Reconnection.handleReconnect(data.playerId);

      // Update socket data
      socket.data.playerId = data.playerId;
      socket.data.roomCode = data.roomCode;

      // Rejoin room
      await socket.join(data.roomCode);

      // Mark reconnected
      const room = await RoomManager.markPlayerReconnected(redis, data.roomCode, data.playerId);
      if (!room) {
        callback({ ok: false, error: 'Room not found' });
        return;
      }

      // Update session
      await redis.saveSession(data.playerId, {
        socketId: socket.id,
        roomCode: data.roomCode,
        playerName: socket.data.playerName ?? '',
        connectedAt: Date.now(),
      });

      // Load game state if game is in progress
      let gameState: ReturnType<typeof deserializeGameState> | undefined;
      if (room.gameId) {
        const raw = await redis.loadGameState(room.gameId);
        if (raw) {
          gameState = deserializeGameState(raw);
        }
      }

      // Notify others
      if (wasDisconnected) {
        socket.to(data.roomCode).emit('playerReconnected', { playerId: data.playerId });
      }

      callback({ ok: true, room, gameState });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reconnection failed';
      callback({ ok: false, error: message });
    }
  });

  // --- Disconnect ---

  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    Reconnection.handleDisconnect(io, redis, roomCode, playerId, {
      gracePeriodSeconds: 120,
      onPermanentDisconnect: async (rc, pid) => {
        // If game is in progress, handle auto-action for disconnected player
        const room = await redis.loadRoomMetadata(rc);
        if (room?.gameId) {
          const raw = await redis.loadGameState(room.gameId);
          if (raw) {
            const state = deserializeGameState(raw);
            const activePlayer = state.players[state.currentPlayerIndex];
            if (activePlayer?.id === pid) {
              // Auto-end their turn
              const newState = GameManager.autoEndTurnForPlayer(state);
              await redis.saveGameState(room.gameId, serializeGameState(newState));
              io.to(rc).emit('stateUpdate', newState);
              startTurnTimerForRoom(io, redis, rc, newState);
            }
          }
        }
      },
    });
  });
}

// --- Turn timer helpers ---

function startTurnTimerForRoom(
  io: AppIO,
  redis: RedisClient,
  roomCode: string,
  state: import('@monopoly/shared').GameState,
): void {
  const duration = state.settings.turnTimeLimit;
  if (duration <= 0) return;

  // Don't start timer during auction/trade
  if (shouldPauseForState(state.turnState)) return;

  startTurnTimer(roomCode, duration, state.turnState, io, async () => {
    // On timeout, auto-act
    const room = await redis.loadRoomMetadata(roomCode);
    if (!room?.gameId) return;

    const raw = await redis.loadGameState(room.gameId);
    if (!raw) return;

    let currentState = deserializeGameState(raw);

    if (currentState.turnState === TurnState.WaitingForRoll) {
      currentState = GameManager.autoRollForPlayer(currentState);
    }

    if (
      currentState.turnState === TurnState.PlayerAction ||
      currentState.turnState === TurnState.AwaitingBuyDecision
    ) {
      currentState = GameManager.autoEndTurnForPlayer(currentState);
    }

    await redis.saveGameState(room.gameId, serializeGameState(currentState));
    io.to(roomCode).emit('stateUpdate', currentState);

    // Restart timer for next player
    startTurnTimerForRoom(io, redis, roomCode, currentState);
  });
}

function handleTurnTimerUpdate(
  io: AppIO,
  redis: RedisClient,
  roomCode: string,
  state: import('@monopoly/shared').GameState,
): void {
  // Pause during auctions and trades
  if (shouldPauseForState(state.turnState)) {
    pauseTurnTimer(roomCode);
    return;
  }

  // If turn just ended and new turn started, restart timer
  if (state.turnState === TurnState.WaitingForRoll) {
    startTurnTimerForRoom(io, redis, roomCode, state);
    return;
  }

  // Resume if was paused
  resumeTurnTimer(roomCode);
}
