#!/bin/bash
# ============================================================
# Vocaid Hub — Development Startup Script
# Starts: ngrok tunnel → Next.js dev → OpenClaw Gateway
# All output tagged: [next] [ngrok] [claw] with colors
# ============================================================

set -e

# Colors & Tags
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

TAG_NEXT="${CYAN}[next]${NC}"
TAG_NGROK="${MAGENTA}[ngrok]${NC}"
TAG_CLAW="${YELLOW}[claw]${NC}"
TAG_DEV="${BLUE}[dev]${NC}"

# Prefixer: reads stdin line-by-line, prepends a colored tag
prefix() {
  local tag="$1"
  while IFS= read -r line; do
    echo -e "${tag} ${line}"
  done
}

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
export PATH="/opt/homebrew/bin:$HOME/bin:/usr/local/bin:$HOME/.npm-global/bin:$HOME/.foundry/bin:$PATH"

# Cleanup: stop PM2 + ngrok on exit
cleanup() {
  echo ""
  echo -e "${TAG_DEV} ${YELLOW}Shutting down all services...${NC}"
  npx pm2 delete all 2>/dev/null || true
  pkill -f "ngrok" 2>/dev/null || true
  echo -e "${TAG_DEV} ${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================================
# 1. Environment check
# ============================================================
echo -e "${TAG_DEV} ${BLUE}=== Vocaid Hub Dev Startup ===${NC}"
echo ""

cd "$PROJECT_DIR"

if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo -e "${TAG_DEV} ${RED}No .env or .env.local found. Run: cp .env.example .env.local${NC}"
  exit 1
fi

set -a
[ -f .env ] && source .env
[ -f .env.local ] && source .env.local
set +a
echo -e "${TAG_DEV} ${GREEN}✓ Environment loaded${NC}"

# ============================================================
# 2. Dependencies
# ============================================================
if [ ! -d "node_modules" ]; then
  echo -e "${TAG_DEV} ${YELLOW}Installing dependencies...${NC}"
  npm install 2>&1 | prefix "$TAG_DEV"
fi
echo -e "${TAG_DEV} ${GREEN}✓ Dependencies ready${NC}"

# ============================================================
# 3. Nuke stale caches (fixes prerender-manifest.json + webpack pack errors)
# ============================================================
echo -e "${TAG_DEV} ${YELLOW}Clearing build caches...${NC}"
rm -rf .next node_modules/.cache
echo -e "${TAG_DEV} ${GREEN}✓ Caches cleared${NC}"

# ============================================================
# 4. Deploy contracts if needed (skip for speed — uncomment to enable)
# ============================================================
# deploy_contracts() { ... }
# deploy_contracts
echo -e "${TAG_DEV} ${GREEN}✓ Contracts: using existing deployments${NC}"

# ============================================================
# 5. Start ngrok FIRST (env vars must be set before Next.js compiles)
# ============================================================
# Static ngrok domains (paid plan — never change)
NGROK_FRONTEND="https://vocaid-client.ngrok.dev"
NGROK_BACKEND="https://vocaid-api.ngrok.dev"

start_ngrok() {
  NGROK_BIN=$(command -v ngrok 2>/dev/null)
  if [ -z "$NGROK_BIN" ]; then
    echo -e "${TAG_NGROK} ${RED}Not found. Install: brew install ngrok${NC}"
    echo -e "${TAG_NGROK} ${YELLOW}Continuing without tunnels — localhost only${NC}"
    return
  fi

  echo -e "${TAG_NGROK} Starting static tunnels..."
  echo -e "${TAG_NGROK}   Frontend: ${CYAN}${NGROK_FRONTEND}${NC} → :3000"
  echo -e "${TAG_NGROK}   Backend:  ${CYAN}${NGROK_BACKEND}${NC} → :5001"

  # Start both tunnels from ngrok.yml config (static domains, paid plan)
  "$NGROK_BIN" start --all --log=stdout --log-format=json > /tmp/ngrok.log 2>&1 &

  # Wait for tunnels to be ready
  echo -e "${TAG_NGROK} Waiting for tunnels..."
  for i in {1..15}; do
    sleep 1
    TUNNEL_COUNT=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | node -e "
      const c=[];process.stdin.on('data',d=>c.push(d));
      process.stdin.on('end',()=>{try{console.log(JSON.parse(Buffer.concat(c)).tunnels.length)}catch{console.log(0)}})
    " 2>/dev/null || echo "0")
    if [ "$TUNNEL_COUNT" = "2" ]; then
      echo -e "${TAG_NGROK} ${GREEN}✓ Both tunnels online${NC}"
      break
    fi
  done

  if [ "$TUNNEL_COUNT" != "2" ]; then
    echo -e "${TAG_NGROK} ${RED}Tunnel setup failed. Check /tmp/ngrok.log${NC}"
    echo -e "${TAG_NGROK} ${YELLOW}Continuing without tunnels${NC}"
  fi
}

start_ngrok

# ============================================================
# 5b. Start all services via PM2
# ============================================================
echo -e "${TAG_DEV} Stopping any existing PM2 processes..."
npx pm2 delete all 2>/dev/null || true

echo -e "${TAG_DEV} Starting services via PM2 (api + next + claw)..."
npx pm2 start ecosystem.config.cjs 2>&1 | prefix "$TAG_DEV"

# Wait for Fastify backend
echo -e "${TAG_DEV} Waiting for Fastify backend..."
for i in {1..15}; do
  if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${TAG_DEV} ${GREEN}✓ Fastify backend ready at http://localhost:5001${NC}"
    break
  fi
  sleep 1
done

# Wait for Next.js
echo -e "${TAG_DEV} Waiting for Next.js..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${TAG_DEV} ${GREEN}✓ Next.js ready at http://localhost:3000${NC}"
    break
  fi
  sleep 1
done

# ============================================================
# 6. Status summary
# ============================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Vocaid Hub — All Services Running (PM2)${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}[api]${NC}    http://localhost:5001  (Fastify + Zod + dotenv)"
echo -e "  ${CYAN}[next]${NC}   http://localhost:3000  (Next.js + Turbopack)"
echo -e "  ${MAGENTA}[ngrok]${NC}  ${NGROK_FRONTEND}  (→ :3000)"
echo -e "  ${MAGENTA}[ngrok]${NC}  ${NGROK_BACKEND}  (→ :5001)"
echo -e "  ${YELLOW}[claw]${NC}   ws://127.0.0.1:18789  (OpenClaw Gateway)"
echo ""
echo -e "  Chains:"
echo -e "    0G:     https://evmrpc-testnet.0g.ai (16602)"
echo -e "    World:  chainId 4801"
echo -e "    Hedera: ${HEDERA_OPERATOR_ID:-'not set'}"
echo ""
echo -e "  ${CYAN}Commands:${NC}"
echo -e "    npm run dev:logs    ${YELLOW}# tail all process logs${NC}"
echo -e "    npm run dev:stop    ${YELLOW}# stop all processes${NC}"
echo -e "    npx pm2 monit       ${YELLOW}# real-time dashboard${NC}"
echo ""
echo -e "  ${YELLOW}Streaming logs below (Ctrl+C to stop)...${NC}"
echo ""

# Stream PM2 logs in foreground (replaces manual PID tracking)
npx pm2 logs --lines 20
