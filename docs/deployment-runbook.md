# Deployment Runbook

## Architecture Overview

- **Client**: Next.js app served via CDN/hosting (e.g., Vercel)
- **Server**: Node.js + Express + Socket.IO, containerized
- **State**: Redis for game state persistence (24h TTL)
- **Protocol**: HTTPS + WSS for all connections

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose
- Access to deployment platform credentials

## Local Development

```bash
# Install dependencies
pnpm install

# Start all services
pnpm run dev

# Or use Docker Compose
docker compose up
```

## Deployment Procedures

### Deploy to Staging

Staging deploys automatically on push to `develop` branch.

```bash
git checkout develop
git merge main
git push origin develop
```

Monitor deployment: GitHub Actions > Deploy to Staging workflow

### Deploy to Production

Production deploys via manual trigger in GitHub Actions.

1. Go to GitHub Actions > Deploy to Production
2. Click "Run workflow"
3. Type `deploy` in the confirmation field
4. Click "Run workflow"

### Manual Deployment (Docker)

```bash
# Build and start all services
docker compose up -d --build

# Verify health
curl http://localhost:3001/health
curl http://localhost:3001/ready

# Check logs
docker compose logs -f server
```

## Rollback Procedures

### Quick Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or redeploy a specific version tag
git checkout v1.x.x
# Deploy from this tag
```

### Docker Rollback

```bash
# Stop current deployment
docker compose down

# Deploy previous image
docker compose up -d --build
```

## Scaling

### Horizontal Scaling (Server)

The server uses in-memory state for turn machines and auctions.
For horizontal scaling, migrate these to Redis:

1. Move `turnMachines` Map to Redis
2. Move `_auctionStates` Map to Redis
3. Move `_trades` Map to Redis
4. Use Redis pub/sub for cross-instance Socket.IO events

```bash
# Scale server replicas (with sticky sessions)
docker compose up -d --scale server=3
```

### Redis Scaling

```bash
# Monitor Redis memory
redis-cli INFO memory

# Increase maxmemory if needed
redis-cli CONFIG SET maxmemory 512mb
```

## Monitoring

### Health Checks

| Endpoint  | Expected | Meaning                    |
| --------- | -------- | -------------------------- |
| `/health` | 200      | Server process is running  |
| `/ready`  | 200      | Server + Redis are healthy |
| `/ready`  | 503      | Redis is disconnected      |

### Key Metrics to Monitor

- WebSocket connection count
- Game action latency (p50, p95, p99)
- Redis memory usage
- Active game rooms count
- Error rate

### Error Tracking

Errors are tracked via Sentry (when configured):

```bash
# Set Sentry DSN in environment
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Troubleshooting

### Server won't start

```bash
# Check logs
docker compose logs server

# Common issues:
# - Port 3001 already in use
# - Redis connection refused
# - Missing environment variables
```

### Redis connection failed

```bash
# Check Redis health
docker compose exec redis redis-cli ping

# Check Redis logs
docker compose logs redis

# Restart Redis
docker compose restart redis
```

### WebSocket connections dropping

```bash
# Check server memory
docker stats server

# Check for rate limiting
# Default: 10 actions/sec, burst of 20

# Check nginx/proxy timeouts (if applicable)
# Ensure proxy_read_timeout >= 120s for WebSocket
```

### Game state corruption

```bash
# Inspect game state in Redis
docker compose exec redis redis-cli GET "game:ROOMCODE"

# Delete corrupted game
docker compose exec redis redis-cli DEL "game:ROOMCODE"

# Clear all game data (CAUTION: affects all active games)
docker compose exec redis redis-cli FLUSHDB
```

## Environment Variables

### Server

| Variable        | Default                 | Description             |
| --------------- | ----------------------- | ----------------------- |
| `PORT`          | `3001`                  | Server port             |
| `CLIENT_ORIGIN` | `http://localhost:3000` | CORS allowed origin     |
| `REDIS_URL`     | (in-memory fallback)    | Redis connection string |
| `NODE_ENV`      | `development`           | Environment mode        |
| `SENTRY_DSN`    | (none)                  | Sentry error tracking   |

### Client

| Variable                 | Default                 | Description     |
| ------------------------ | ----------------------- | --------------- |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3001` | Game server URL |

## SSL/TLS Configuration

For production, SSL is handled at the load balancer/proxy level:

```nginx
# Example nginx config for WSS
server {
    listen 443 ssl;
    server_name game.example.com;

    ssl_certificate /etc/ssl/certs/game.crt;
    ssl_certificate_key /etc/ssl/private/game.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
}
```
