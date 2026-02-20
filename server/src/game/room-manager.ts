import type { RoomMetadata, RoomPlayer } from '@monopoly/shared';
import { TokenType } from '@monopoly/shared';
import type { RedisClient } from '../redis/client';

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export async function createRoom(
  redis: RedisClient,
  hostId: string,
  hostName: string,
  maxPlayers = 6,
  startingCash = 1500,
): Promise<RoomMetadata> {
  // Generate unique room code
  let roomCode: string;
  let attempts = 0;
  do {
    roomCode = generateRoomCode();
    attempts++;
    if (attempts > 100) {
      throw new Error('Failed to generate unique room code');
    }
  } while (await redis.roomExists(roomCode));

  const host: RoomPlayer = {
    id: hostId,
    name: hostName,
    isReady: true,
    isHost: true,
    isConnected: true,
  };

  const room: RoomMetadata = {
    roomCode,
    hostId,
    players: [host],
    maxPlayers,
    startingCash,
    status: 'waiting',
    createdAt: Date.now(),
  };

  await redis.saveRoomMetadata(roomCode, room);
  return room;
}

export async function joinRoom(
  redis: RedisClient,
  roomCode: string,
  playerId: string,
  playerName: string,
): Promise<{ room: RoomMetadata; player: RoomPlayer }> {
  const room = await redis.loadRoomMetadata(roomCode);
  if (!room) {
    throw new Error('Room not found');
  }
  if (room.status !== 'waiting') {
    throw new Error('Game already started');
  }
  if (room.players.length >= room.maxPlayers) {
    throw new Error('Room is full');
  }
  if (room.players.some((p) => p.id === playerId)) {
    throw new Error('Already in room');
  }

  const player: RoomPlayer = {
    id: playerId,
    name: playerName,
    isReady: false,
    isHost: false,
    isConnected: true,
  };

  room.players.push(player);
  await redis.saveRoomMetadata(roomCode, room);
  return { room, player };
}

export async function selectToken(
  redis: RedisClient,
  roomCode: string,
  playerId: string,
  token: TokenType,
): Promise<RoomMetadata> {
  const room = await redis.loadRoomMetadata(roomCode);
  if (!room) throw new Error('Room not found');

  // Check token uniqueness
  const tokenTaken = room.players.some((p) => p.id !== playerId && p.token === token);
  if (tokenTaken) {
    throw new Error('Token already taken by another player');
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not in room');

  player.token = token;
  player.isReady = true;
  await redis.saveRoomMetadata(roomCode, room);
  return room;
}

export async function leaveRoom(
  redis: RedisClient,
  roomCode: string,
  playerId: string,
): Promise<{ room: RoomMetadata | null; newHostId?: string }> {
  const room = await redis.loadRoomMetadata(roomCode);
  if (!room) throw new Error('Room not found');

  room.players = room.players.filter((p) => p.id !== playerId);

  // If no players left, delete the room
  if (room.players.length === 0) {
    await redis.deleteRoomMetadata(roomCode);
    return { room: null };
  }

  // Transfer host if the leaving player was host
  let newHostId: string | undefined;
  if (room.hostId === playerId) {
    const newHost = room.players[0];
    room.hostId = newHost.id;
    newHost.isHost = true;
    newHostId = newHost.id;
  }

  await redis.saveRoomMetadata(roomCode, room);
  return { room, newHostId };
}

export async function markPlayerDisconnected(
  redis: RedisClient,
  roomCode: string,
  playerId: string,
): Promise<RoomMetadata | null> {
  const room = await redis.loadRoomMetadata(roomCode);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.isConnected = false;
  }

  await redis.saveRoomMetadata(roomCode, room);
  return room;
}

export async function markPlayerReconnected(
  redis: RedisClient,
  roomCode: string,
  playerId: string,
): Promise<RoomMetadata | null> {
  const room = await redis.loadRoomMetadata(roomCode);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.isConnected = true;
  }

  await redis.saveRoomMetadata(roomCode, room);
  return room;
}

export async function removeDisconnectedPlayer(
  redis: RedisClient,
  roomCode: string,
  playerId: string,
): Promise<RoomMetadata | null> {
  const room = await redis.loadRoomMetadata(roomCode);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;

  player.isConnected = false;

  // If game is in waiting state, remove the player
  if (room.status === 'waiting') {
    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      await redis.deleteRoomMetadata(roomCode);
      return null;
    }

    // Transfer host if needed
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }
  }

  await redis.saveRoomMetadata(roomCode, room);
  return room;
}
