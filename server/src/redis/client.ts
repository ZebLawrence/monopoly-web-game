import type { RoomMetadata } from '@monopoly/shared';

const GAME_TTL = 86400; // 24 hours in seconds
const ROOM_TTL = 86400;
const SESSION_TTL = 86400;

export interface RedisClient {
  // Game state
  saveGameState(gameId: string, state: string): Promise<void>;
  loadGameState(gameId: string): Promise<string | null>;
  deleteGameState(gameId: string): Promise<void>;

  // Room metadata
  saveRoomMetadata(roomCode: string, metadata: RoomMetadata): Promise<void>;
  loadRoomMetadata(roomCode: string): Promise<RoomMetadata | null>;
  deleteRoomMetadata(roomCode: string): Promise<void>;
  roomExists(roomCode: string): Promise<boolean>;

  // Session mapping (playerId → socketId, roomCode, etc.)
  saveSession(playerId: string, data: SessionData): Promise<void>;
  loadSession(playerId: string): Promise<SessionData | null>;
  deleteSession(playerId: string): Promise<void>;

  // TTL
  getTTL(key: string): Promise<number>;

  // Lifecycle
  disconnect(): Promise<void>;
}

export interface SessionData {
  socketId: string;
  roomCode: string;
  playerName: string;
  connectedAt: number;
}

// In-memory fallback for development / testing without Redis
export class InMemoryRedisClient implements RedisClient {
  private store = new Map<string, string>();
  private ttls = new Map<string, number>();

  async saveGameState(gameId: string, state: string): Promise<void> {
    const key = `game:${gameId}`;
    this.store.set(key, state);
    this.ttls.set(key, GAME_TTL);
  }

  async loadGameState(gameId: string): Promise<string | null> {
    return this.store.get(`game:${gameId}`) ?? null;
  }

  async deleteGameState(gameId: string): Promise<void> {
    const key = `game:${gameId}`;
    this.store.delete(key);
    this.ttls.delete(key);
  }

  async saveRoomMetadata(roomCode: string, metadata: RoomMetadata): Promise<void> {
    const key = `room:${roomCode}`;
    this.store.set(key, JSON.stringify(metadata));
    this.ttls.set(key, ROOM_TTL);
  }

  async loadRoomMetadata(roomCode: string): Promise<RoomMetadata | null> {
    const raw = this.store.get(`room:${roomCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as RoomMetadata;
  }

  async deleteRoomMetadata(roomCode: string): Promise<void> {
    const key = `room:${roomCode}`;
    this.store.delete(key);
    this.ttls.delete(key);
  }

  async roomExists(roomCode: string): Promise<boolean> {
    return this.store.has(`room:${roomCode}`);
  }

  async saveSession(playerId: string, data: SessionData): Promise<void> {
    const key = `session:${playerId}`;
    this.store.set(key, JSON.stringify(data));
    this.ttls.set(key, SESSION_TTL);
  }

  async loadSession(playerId: string): Promise<SessionData | null> {
    const raw = this.store.get(`session:${playerId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  }

  async deleteSession(playerId: string): Promise<void> {
    const key = `session:${playerId}`;
    this.store.delete(key);
    this.ttls.delete(key);
  }

  async getTTL(key: string): Promise<number> {
    return this.ttls.get(key) ?? -2;
  }

  async disconnect(): Promise<void> {
    this.store.clear();
    this.ttls.clear();
  }

  // Test helper
  clear(): void {
    this.store.clear();
    this.ttls.clear();
  }
}

// Try to connect to real Redis; fall back to in-memory
export function createRedisClient(): RedisClient {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('[Redis] No REDIS_URL set, using in-memory store');
    return new InMemoryRedisClient();
  }

  // Dynamic import ioredis to keep it optional
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require('ioredis');
    return createIORedisClient(IORedis, redisUrl);
  } catch {
    console.log('[Redis] ioredis not available, using in-memory store');
    return new InMemoryRedisClient();
  }
}

function createIORedisClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  IORedis: any,
  redisUrl: string,
): RedisClient {
  const redis = new IORedis(redisUrl, {
    retryStrategy: (times: number) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return {
    async saveGameState(gameId: string, state: string) {
      await redis.setex(`game:${gameId}`, GAME_TTL, state);
    },
    async loadGameState(gameId: string) {
      return redis.get(`game:${gameId}`);
    },
    async deleteGameState(gameId: string) {
      await redis.del(`game:${gameId}`);
    },
    async saveRoomMetadata(roomCode: string, metadata: RoomMetadata) {
      await redis.setex(`room:${roomCode}`, ROOM_TTL, JSON.stringify(metadata));
    },
    async loadRoomMetadata(roomCode: string) {
      const raw = await redis.get(`room:${roomCode}`);
      if (!raw) return null;
      return JSON.parse(raw) as RoomMetadata;
    },
    async deleteRoomMetadata(roomCode: string) {
      await redis.del(`room:${roomCode}`);
    },
    async roomExists(roomCode: string) {
      return (await redis.exists(`room:${roomCode}`)) === 1;
    },
    async saveSession(playerId: string, data: SessionData) {
      await redis.setex(`session:${playerId}`, SESSION_TTL, JSON.stringify(data));
    },
    async loadSession(playerId: string) {
      const raw = await redis.get(`session:${playerId}`);
      if (!raw) return null;
      return JSON.parse(raw) as SessionData;
    },
    async deleteSession(playerId: string) {
      await redis.del(`session:${playerId}`);
    },
    async getTTL(key: string) {
      return redis.ttl(key);
    },
    async disconnect() {
      await redis.quit();
    },
  };
}
