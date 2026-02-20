import { describe, it, expect } from 'vitest';
import { createApp } from '../index';
import http from 'http';

function fetchHealth(
  app: ReturnType<typeof createApp>,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
        });
      });
    });
  });
}

describe('Server', () => {
  describe('Health Check', () => {
    it('should return 200 with { status: "ok" }', async () => {
      const app = createApp();
      const res = await fetchHealth(app);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('createApp', () => {
    it('should return an Express app', () => {
      const app = createApp();
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });
  });
});
