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

# PID tracking for cleanup
PIDS=()
cleanup() {
  echo ""
  echo -e "${TAG_DEV} ${YELLOW}Shutting down all services...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
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
NGROK_URL=""

start_ngrok() {
  NGROK_BIN=$(command -v ngrok 2>/dev/null)
  if [ -z "$NGROK_BIN" ]; then
    echo -e "${TAG_NGROK} ${RED}Not found. Install: brew install ngrok${NC}"
    echo -e "${TAG_NGROK} ${YELLOW}Continuing without tunnel — localhost only${NC}"
    return
  fi

  echo -e "${TAG_NGROK} Starting tunnel (${NGROK_BIN})..."

  if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo -e "${TAG_NGROK} ${YELLOW}No NGROK_AUTHTOKEN — tunnel will be rate-limited${NC}"
  fi

  "$NGROK_BIN" http 3000 --log=stdout --log-format=json > /tmp/ngrok.log 2>&1 &
  NGROK_PID=$!
  PIDS+=($NGROK_PID)

  echo -e "${TAG_NGROK} Waiting for tunnel URL..."
  for i in {1..10}; do
    sleep 1
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | node -e "
      const c=[];process.stdin.on('data',d=>c.push(d));
      process.stdin.on('end',()=>{
        try{const t=JSON.parse(Buffer.concat(c));
        console.log(t.tunnels[0]?.public_url||'')}
        catch(e){console.log('')}
      })
    " 2>/dev/null || echo "")
    if [ -n "$NGROK_URL" ]; then break; fi
  done

  if [ -n "$NGROK_URL" ]; then
    echo -e "${TAG_NGROK} ${GREEN}✓ Tunnel: ${NGROK_URL}${NC}"

    # Auto-patch .env.local
    if [ -f ".env.local" ]; then
      sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=${NGROK_URL}|" .env.local 2>/dev/null || true
      sed -i '' "s|AUTH_URL=.*|AUTH_URL=${NGROK_URL}|" .env.local 2>/dev/null || true
      if grep -q "NEXT_PUBLIC_APP_URL" .env.local 2>/dev/null; then
        sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${NGROK_URL}|" .env.local 2>/dev/null || true
      else
        echo "NEXT_PUBLIC_APP_URL=${NGROK_URL}" >> .env.local
      fi
      set -a; source .env.local; set +a
      echo -e "${TAG_NGROK} ${GREEN}✓ .env.local patched with tunnel URL${NC}"
    fi

    echo ""
    echo -e "${TAG_NGROK} ${YELLOW}MANUAL: Update World Developer Portal → App URL: ${NGROK_URL}${NC}"
    echo ""
  else
    echo -e "${TAG_NGROK} ${RED}Tunnel failed. Check /tmp/ngrok.log${NC}"
    echo -e "${TAG_NGROK} ${YELLOW}Continuing without tunnel${NC}"
  fi
}

start_ngrok

# ============================================================
# 6. Start Next.js dev server (with tagged output)
# ============================================================
echo -e "${TAG_NEXT} Starting Next.js on :3000..."

# Pipe both stdout and stderr through the prefixer
npm run dev 2>&1 | prefix "$TAG_NEXT" &
NEXTJS_PID=$!
PIDS+=($NEXTJS_PID)

# Wait for Next.js to be ready
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${TAG_NEXT} ${GREEN}✓ Ready at http://localhost:3000${NC}"
    break
  fi
  sleep 1
done

# ============================================================
# 7. Start OpenClaw Gateway (with tagged output)
# ============================================================
start_openclaw() {
  if [ ! -f "agents/openclaw.json" ]; then
    echo -e "${TAG_CLAW} ${YELLOW}No agents/openclaw.json — skipping${NC}"
    return
  fi

  echo -e "${TAG_CLAW} Starting Gateway on :18789..."
  (cd agents && openclaw gateway run 2>&1) | prefix "$TAG_CLAW" &
  OPENCLAW_PID=$!
  PIDS+=($OPENCLAW_PID)
  sleep 2

  if kill -0 $OPENCLAW_PID 2>/dev/null; then
    echo -e "${TAG_CLAW} ${GREEN}✓ Gateway running on ws://127.0.0.1:18789${NC}"
  else
    echo -e "${TAG_CLAW} ${RED}Failed to start. Check output above.${NC}"
  fi
}

start_openclaw

# ============================================================
# 8. Status summary
# ============================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Vocaid Hub — All Services Running${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}[next]${NC}   http://localhost:3000"
[ -n "$NGROK_URL" ] && echo -e "  ${MAGENTA}[ngrok]${NC}  ${NGROK_URL}"
echo -e "  ${YELLOW}[claw]${NC}   ws://127.0.0.1:18789"
echo ""
echo -e "  Chains:"
echo -e "    0G:     https://evmrpc-testnet.0g.ai (16602)"
echo -e "    World:  chainId 4801"
echo -e "    Hedera: ${HEDERA_OPERATOR_ID:-'not set'}"
echo ""
echo -e "  ${YELLOW}Ctrl+C to stop all services${NC}"
echo ""

# Keep alive — wait for Next.js
wait $NEXTJS_PID
