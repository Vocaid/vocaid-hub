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
NGROK_FRONTEND=""
NGROK_BACKEND=""

start_ngrok() {
  NGROK_BIN=$(command -v ngrok 2>/dev/null)
  if [ -z "$NGROK_BIN" ]; then
    echo -e "${TAG_NGROK} ${RED}Not found. Install: brew install ngrok${NC}"
    echo -e "${TAG_NGROK} ${YELLOW}Continuing without tunnels — localhost only${NC}"
    return
  fi

  echo -e "${TAG_NGROK} Starting 2 tunnels (frontend :3000 + backend :5001)..."

  # Start both tunnels from ngrok.yml config (requires paid plan)
  "$NGROK_BIN" start --all --log=stdout --log-format=json > /tmp/ngrok.log 2>&1 &
  sleep 1

  echo -e "${TAG_NGROK} Waiting for tunnel URLs..."
  for i in {1..15}; do
    sleep 1
    # Extract both tunnel URLs from the ngrok API
    TUNNELS=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
    if [ -n "$TUNNELS" ]; then
      NGROK_FRONTEND=$(echo "$TUNNELS" | node -e "
        const c=[];process.stdin.on('data',d=>c.push(d));
        process.stdin.on('end',()=>{
          try{const t=JSON.parse(Buffer.concat(c));
          const fe=t.tunnels.find(x=>x.name==='frontend');
          console.log(fe?.public_url||'')}
          catch{console.log('')}
        })
      " 2>/dev/null || echo "")
      NGROK_BACKEND=$(echo "$TUNNELS" | node -e "
        const c=[];process.stdin.on('data',d=>c.push(d));
        process.stdin.on('end',()=>{
          try{const t=JSON.parse(Buffer.concat(c));
          const be=t.tunnels.find(x=>x.name==='backend');
          console.log(be?.public_url||'')}
          catch{console.log('')}
        })
      " 2>/dev/null || echo "")
      if [ -n "$NGROK_FRONTEND" ] && [ -n "$NGROK_BACKEND" ]; then break; fi
    fi
  done

  if [ -n "$NGROK_FRONTEND" ] && [ -n "$NGROK_BACKEND" ]; then
    echo -e "${TAG_NGROK} ${GREEN}✓ Frontend: ${NGROK_FRONTEND}${NC}"
    echo -e "${TAG_NGROK} ${GREEN}✓ Backend:  ${NGROK_BACKEND}${NC}"

    # Auto-patch .env.local with both URLs
    if [ -f ".env.local" ]; then
      sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=${NGROK_FRONTEND}|" .env.local 2>/dev/null || true
      sed -i '' "s|AUTH_URL=.*|AUTH_URL=${NGROK_FRONTEND}|" .env.local 2>/dev/null || true
      if grep -q "NEXT_PUBLIC_APP_URL" .env.local 2>/dev/null; then
        sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${NGROK_FRONTEND}|" .env.local 2>/dev/null || true
      else
        echo "NEXT_PUBLIC_APP_URL=${NGROK_FRONTEND}" >> .env.local
      fi
      if grep -q "BACKEND_URL" .env.local 2>/dev/null; then
        sed -i '' "s|BACKEND_URL=.*|BACKEND_URL=${NGROK_BACKEND}|" .env.local 2>/dev/null || true
      else
        echo "BACKEND_URL=${NGROK_BACKEND}" >> .env.local
      fi
      set -a; source .env.local; set +a
      echo -e "${TAG_NGROK} ${GREEN}✓ .env.local patched (frontend + backend URLs)${NC}"
    fi

    echo ""
    echo -e "${TAG_NGROK} ${YELLOW}World Developer Portal:${NC}"
    echo -e "${TAG_NGROK}   App URL: ${GREEN}your-vercel-domain.vercel.app${NC}"
    echo -e "${TAG_NGROK}   Additional domain: ${GREEN}${NGROK_FRONTEND}${NC}"
    echo ""
  else
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
[ -n "$NGROK_FRONTEND" ] && echo -e "  ${MAGENTA}[ngrok]${NC}  ${NGROK_FRONTEND}  (frontend tunnel)"
[ -n "$NGROK_BACKEND" ] && echo -e "  ${MAGENTA}[ngrok]${NC}  ${NGROK_BACKEND}  (backend tunnel)"
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
