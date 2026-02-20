import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@monopoly/shared';
import { registerSocketHandlers } from './socket/handlers';
import { createRedisClient, RedisClient } from './redis/client';
import { createRateLimiter } from './middleware/rate-limit';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

let redisRef: RedisClient | null = null;

export function createApp(redis?: RedisClient) {
  const app = express();

  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/ready', async (_req, res) => {
    try {
      const client = redis ?? redisRef;
      if (client) {
        // Verify Redis connectivity
        const ttl = await client.getTTL('__readiness_check__');
        if (ttl === -2) {
          // Key doesn't exist, which is fine — Redis responded
        }
      }
      res.json({ status: 'ready', redis: 'connected' });
    } catch {
      res.status(503).json({ status: 'not ready', redis: 'disconnected' });
    }
  });

  return app;
}

export function createSocketServer(app: ReturnType<typeof express>, redis: RedisClient) {
  const httpServer = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: CLIENT_ORIGIN,
        methods: ['GET', 'POST'],
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      // Enable per-message compression to reduce bandwidth
      perMessageDeflate: {
        threshold: 1024, // Only compress messages > 1KB
      },
    },
  );

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    registerSocketHandlers(io, socket, redis);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });

  return { httpServer, io };
}

export type AppIO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Start server when run directly (not imported for tests)
if (process.env.NODE_ENV !== 'test') {
  const redis = createRedisClient();
  redisRef = redis;
  const app = createApp(redis);
  const { httpServer, io } = createSocketServer(app, redis);

  // Apply rate limiting to socket connections
  const rateLimiter = createRateLimiter();
  io.use((socket, next) => {
    const allowed = rateLimiter.check(socket.id);
    if (!allowed) {
      next(new Error('Rate limit exceeded'));
      return;
    }
    next();
  });

  httpServer.listen(PORT, () => {
    console.log(`Monopoly server running on port ${PORT}`);
  });
}
