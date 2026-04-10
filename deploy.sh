#!/bin/bash
set -e

PROJECT_DIR="/home/orchestrator/bitcoder-orchestrator"
ENV_FILE="$PROJECT_DIR/.env"
COMPOSE="docker compose"

echo "========================================"
echo "  Bitcoder AI Orchestrator - Deploy"
echo "  Domain: orchestrator.gartanto.site"
echo "========================================"

cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found at $ENV_FILE"
    echo "Copy from .env.example and fill in the values."
    exit 1
fi

source "$ENV_FILE" 2>/dev/null || true

echo ""
echo "[1/5] Pulling latest code..."
git pull origin main || true

echo ""
echo "[2/5] Building containers..."
$COMPOSE build --no-cache

echo ""
echo "[3/5] Stopping old containers..."
$COMPOSE down

echo ""
echo "[4/5] Starting containers..."
$COMPOSE up -d

echo ""
echo "[5/5] Waiting for services..."
sleep 10

echo ""
echo "Running database migrations..."
$COMPOSE exec -T backend sh -c "npx prisma migrate deploy" || true

echo ""
echo "Seeding admin user (if not exists)..."
$COMPOSE exec -T backend sh -c "npx ts-node prisma/seed.ts" || true

echo ""
echo "========================================"
echo "  Deploy complete!"
echo "  Frontend: https://orchestrator.gartanto.site"
echo "  Backend:  https://orchestrator.gartanto.site/api/docs"
echo "  RAG:      http://127.0.0.1:8000 (internal)"
echo "========================================"
echo ""
echo "Useful commands:"
echo "  Logs:        cd $PROJECT_DIR && docker compose logs -f"
echo "  Logs backend: docker compose logs -f backend"
echo "  Restart:      cd $PROJECT_DIR && docker compose restart"
echo "  Stop:         cd $PROJECT_DIR && docker compose down"
echo ""
