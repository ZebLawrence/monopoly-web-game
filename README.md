![CI](https://github.com/your-username/monopoly-web-game/actions/workflows/ci.yml/badge.svg)

# Monopoly Web Game

A full-featured, real-time multiplayer Monopoly game built with modern web technologies.

## Tech Stack

- **Client**: Next.js (App Router) + TypeScript + Canvas 2D board rendering
- **Server**: Node.js + Express + Socket.IO
- **State**: Redis for game state persistence
- **Shared**: Common game engine, types, and board data

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm run dev

# Or use Docker Compose
docker compose up
```

## Project Structure

```
├── client/    — Next.js frontend (Canvas 2D board, React components)
├── server/    — Express + Socket.IO backend
├── shared/    — Game engine, types, and board data
├── e2e/       — Playwright end-to-end tests
└── docs/      — Deployment runbook and documentation
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm run dev`       | Start all services in dev mode |
| `pnpm run build`     | Build all packages             |
| `pnpm run test`      | Run unit tests (Vitest)        |
| `pnpm run typecheck` | TypeScript type checking       |
| `pnpm run lint`      | ESLint across all packages     |

## License

MIT
