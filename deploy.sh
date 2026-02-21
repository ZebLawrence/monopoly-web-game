#!/usr/bin/env bash
set -e

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Stopping containers..."
$COMPOSE down

echo "==> Building images..."
$COMPOSE build

echo "==> Starting containers..."
$COMPOSE up -d

echo "==> Following logs (Ctrl+C to exit)..."
$COMPOSE logs -f
