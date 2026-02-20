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

| Endpoint   | Expected | Meaning                         |
| ---------- | -------- | ------------------------------- |
| `/health`  | 200      | Server process is running       |
| `/ready`   | 200      | Server + Redis are healthy      |
| `/ready`   | 503      | Redis is disconnected           |
| `/metrics` | 200      | Game action latency p50/p95/p99 |

### Latency Metrics Endpoint

The server exposes a `GET /metrics` endpoint that returns WebSocket game-action latency percentiles computed from a rolling window of the last 1000 events:

```bash
curl http://localhost:3001/metrics
# {"p50":8,"p95":25,"p99":60}
```

| Field | Meaning                                              |
| ----- | ---------------------------------------------------- |
| `p50` | Median latency (ms) from action receipt to broadcast |
| `p95` | 95th percentile latency (ms)                         |
| `p99` | 99th percentile latency (ms)                         |

If no game actions have been processed yet, all values return `0`. The window resets on server restart.

Use this endpoint for external monitoring (e.g. Prometheus scraping, Datadog, or manual health checks). Healthy values depend on deployment, but generally p99 should stay under 200 ms.

### Key Metrics to Monitor

- WebSocket connection count
- Game action latency (p50, p95, p99) — available at `GET /metrics`
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

All production traffic must use encrypted protocols:

- **HTTPS** for the Next.js client and all API requests
- **WSS** (WebSocket Secure) for Socket.IO connections
- The reverse proxy must forward the `Upgrade` header so WebSocket connections can upgrade from HTTP to WS

### TLS Certificate Provisioning

For self-hosted deployments, use [Let's Encrypt](https://letsencrypt.org/) with Certbot:

```bash
# Install Certbot (Ubuntu/Debian)
sudo apt install certbot python3-certbot-nginx

# Obtain a certificate
sudo certbot --nginx -d game.example.com

# Auto-renewal (Certbot sets up a systemd timer by default)
sudo certbot renew --dry-run
```

For managed platforms (Vercel, Fly.io, Railway), TLS is provisioned automatically.

### Reverse Proxy Configuration (Nginx)

The reverse proxy terminates TLS and forwards traffic to the backend over plain HTTP internally.
The `Upgrade` and `Connection` headers are required for WebSocket (Socket.IO) connections.

```nginx
server {
    listen 443 ssl http2;
    server_name game.example.com;

    ssl_certificate     /etc/letsencrypt/live/game.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/game.example.com/privkey.pem;

    # Redirect HTTP to HTTPS
    if ($scheme = http) {
        return 301 https://$host$request_uri;
    }

    # Next.js client
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO server — must forward Upgrade header for WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name game.example.com;
    return 301 https://$host$request_uri;
}
```

### Environment Variables for Production

When deploying with TLS, update these environment variables:

| Variable                 | Local                   | Production                     |
| ------------------------ | ----------------------- | ------------------------------ |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3001` | `https://api.game.example.com` |
| `NEXT_PUBLIC_WS_URL`     | `ws://localhost:3001`   | `wss://api.game.example.com`   |
| `CLIENT_ORIGIN`          | `http://localhost:3000` | `https://game.example.com`     |

## Load Testing

### Overview

A k6 load test script is provided at `load-tests/socketio-load-test.js`. It simulates 200 concurrent Socket.IO connections organized into 100 game rooms (2 players per room), with each virtual user performing a full game loop: connect, create/join a room, roll dice, wait for state updates, and end their turn.

### Prerequisites

Install [k6](https://k6.io/docs/get-started/installation/) and the [xk6-socketio](https://github.com/grafana/xk6-output-prometheus-remote) extension:

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <load-tests/socketio-load-test.js
```

### Running the Load Test

```bash
# Against local dev server (start the server first)
k6 run load-tests/socketio-load-test.js

# Against staging/production
k6 run -e TARGET_URL=https://api.staging.example.com load-tests/socketio-load-test.js

# Custom duration and VU count
k6 run -e TARGET_URL=https://api.staging.example.com \
  --duration 5m --vus 200 load-tests/socketio-load-test.js
```

### Interpreting Results

k6 outputs metrics at the end of each run. Key metrics to check:

| Metric                 | Target      | Description                                |
| ---------------------- | ----------- | ------------------------------------------ |
| `ws_connecting`        | < 500ms p95 | Time to establish WebSocket connection     |
| `state_update_latency` | < 200ms p99 | Time from dice roll to stateUpdate receipt |
| `ws_msgs_received`     | > 0         | Confirms server is responding              |
| `checks`               | 100% pass   | All assertions passed                      |
| `vus` (peak)           | 200         | Confirms target concurrency was reached    |
| `iteration_duration`   | < 30s p95   | Full create/join/play loop time            |

If `state_update_latency` p99 exceeds 200ms, investigate:

- Server CPU/memory usage (`docker stats`)
- Redis latency (`redis-cli --latency`)
- Network throughput between load generator and server
