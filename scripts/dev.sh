#!/bin/bash
# ============================================================
# Vocaid Hub — Development Startup Script
# Starts: Next.js dev + ngrok tunnel + OpenClaw Gateway
# Deploys contracts if changes detected
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
export PATH="/usr/local/bin:$HOME/.npm-global/bin:$HOME/.foundry/bin:$PATH"

# PID tracking for cleanup
PIDS=()
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  # Kill ngrok if running
  pkill -f "ngrok" 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================================
# 1. Check environment
# ============================================================
echo -e "${BLUE}=== Vocaid Hub Dev Startup ===${NC}"
echo ""

cd "$PROJECT_DIR"

# Check .env exists
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo -e "${RED}ERROR: No .env or .env.local file found.${NC}"
  echo "Copy .env.example to .env and fill in your keys:"
  echo "  cp .env.example .env"
  exit 1
fi

# Load env vars
set -a
[ -f .env ] && source .env
[ -f .env.local ] && source .env.local
set +a

echo -e "${GREEN}✓ Environment loaded${NC}"

# ============================================================
# 2. Install dependencies if needed
# ============================================================
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"

# ============================================================
# 3. Deploy contracts if changes detected
# ============================================================
deploy_contracts() {
  local DEPLOY_NEEDED=false

  # Check if deployments exist
  if [ ! -f "deployments/0g-galileo.json" ] || [ "$(cat deployments/0g-galileo.json 2>/dev/null)" = "{}" ]; then
    DEPLOY_NEEDED=true
    echo -e "${YELLOW}No 0G deployments found. Deploying...${NC}"
  fi

  # Check if contract source changed since last deploy
  if [ -f "deployments/0g-galileo.json" ]; then
    local DEPLOY_TIME=$(stat -f %m deployments/0g-galileo.json 2>/dev/null || echo 0)
    local CONTRACT_TIME=$(find contracts/0g -name "*.sol" -newer deployments/0g-galileo.json 2>/dev/null | head -1)
    if [ -n "$CONTRACT_TIME" ]; then
      DEPLOY_NEEDED=true
      echo -e "${YELLOW}Contract changes detected. Redeploying...${NC}"
    fi
  fi

  if [ "$DEPLOY_NEEDED" = true ]; then
    if [ -z "$PRIVATE_KEY" ]; then
      echo -e "${RED}PRIVATE_KEY not set. Skipping contract deployment.${NC}"
      return
    fi

    echo -e "${BLUE}Deploying contracts to 0G Galileo...${NC}"
    npx hardhat run scripts/deploy-0g.ts --network 0g-galileo 2>&1 || echo -e "${YELLOW}0G deploy failed (may need contracts first)${NC}"

    if [ -f "scripts/deploy-world.ts" ] && [ -n "$WORLD_RPC_URL" ]; then
      echo -e "${BLUE}Deploying CredentialGate to World Chain...${NC}"
      npx hardhat run scripts/deploy-world.ts --network world-sepolia 2>&1 || echo -e "${YELLOW}World deploy failed${NC}"
    fi

    echo -e "${GREEN}✓ Contract deployment complete${NC}"
  else
    echo -e "${GREEN}✓ Contracts up to date${NC}"
  fi
}

deploy_contracts

# ============================================================
# 4. Setup Hedera tokens + topics (if not done)
# ============================================================
setup_hedera() {
  if [ -z "$HEDERA_OPERATOR_ID" ] || [ -z "$HEDERA_OPERATOR_KEY" ]; then
    echo -e "${YELLOW}Hedera credentials not set. Skipping HTS/HCS setup.${NC}"
    return
  fi

  if [ -f "deployments/hedera-testnet.json" ]; then
    echo -e "${GREEN}✓ Hedera tokens/topics already configured${NC}"
    return
  fi

  if [ -f "scripts/setup-hedera.ts" ]; then
    echo -e "${BLUE}Setting up Hedera HTS tokens + HCS topics...${NC}"
    npx ts-node scripts/setup-hedera.ts 2>&1 || echo -e "${YELLOW}Hedera setup failed${NC}"
    echo -e "${GREEN}✓ Hedera setup complete${NC}"
  fi
}

setup_hedera

# ============================================================
# 5. Start Next.js dev server
# ============================================================
echo -e "${BLUE}Starting Next.js dev server on :3000...${NC}"
npm run dev &
NEXTJS_PID=$!
PIDS+=($NEXTJS_PID)

# Wait for Next.js to be ready
echo -e "${YELLOW}Waiting for Next.js...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Next.js running on http://localhost:3000${NC}"
    break
  fi
  sleep 1
done

# ============================================================
# 6. Start ngrok tunnel
# ============================================================
start_ngrok() {
  echo -e "${BLUE}Starting ngrok tunnel...${NC}"

  # Check for ngrok authtoken
  if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo -e "${YELLOW}NGROK_AUTHTOKEN not set. Tunnel will be rate-limited.${NC}"
    echo -e "${YELLOW}Get a free token at https://dashboard.ngrok.com/signup${NC}"
  fi

  # Start ngrok in background
  ngrok http 3000 --log=stdout --log-format=json > /tmp/ngrok.log 2>&1 &
  NGROK_PID=$!
  PIDS+=($NGROK_PID)

  # Wait for tunnel URL
  sleep 3
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | node -e "
    const c=[];process.stdin.on('data',d=>c.push(d));
    process.stdin.on('end',()=>{
      try{const t=JSON.parse(Buffer.concat(c));
      console.log(t.tunnels[0]?.public_url||'FAILED')}
      catch(e){console.log('FAILED')}
    })
  " 2>/dev/null || echo "FAILED")

  if [ "$NGROK_URL" != "FAILED" ] && [ -n "$NGROK_URL" ]; then
    echo -e "${GREEN}✓ ngrok tunnel: ${NGROK_URL}${NC}"
    echo ""
    echo -e "${YELLOW}UPDATE THESE:${NC}"
    echo -e "  1. World Developer Portal → App URL: ${NGROK_URL}"
    echo -e "  2. .env.local → NEXTAUTH_URL=${NGROK_URL}"
    echo -e "  3. World App simulator → Use: ${NGROK_URL}"
    echo ""

    # Auto-update .env.local with ngrok URL
    if [ -f ".env.local" ]; then
      sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=${NGROK_URL}|" .env.local 2>/dev/null || true
    fi
  else
    echo -e "${RED}ngrok tunnel failed to start. Check /tmp/ngrok.log${NC}"
    echo -e "${YELLOW}Running without tunnel — MiniKit will only work on localhost${NC}"
  fi
}

start_ngrok

# ============================================================
# 7. Start OpenClaw Gateway (if configured)
# ============================================================
start_openclaw() {
  if [ -f "agents/openclaw.json" ]; then
    echo -e "${BLUE}Starting OpenClaw Gateway on :18789...${NC}"
    cd agents
    openclaw gateway run > /tmp/openclaw.log 2>&1 &
    OPENCLAW_PID=$!
    PIDS+=($OPENCLAW_PID)
    cd "$PROJECT_DIR"
    sleep 2
    if kill -0 $OPENCLAW_PID 2>/dev/null; then
      echo -e "${GREEN}✓ OpenClaw Gateway running on ws://127.0.0.1:18789${NC}"
    else
      echo -e "${YELLOW}OpenClaw Gateway failed to start. Check /tmp/openclaw.log${NC}"
    fi
  else
    echo -e "${YELLOW}No agents/openclaw.json found. Skipping OpenClaw.${NC}"
  fi
}

start_openclaw

# ============================================================
# 8. Print status summary
# ============================================================
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  Vocaid Hub — All Services Running${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "  Next.js:     http://localhost:3000"
[ -n "$NGROK_URL" ] && echo -e "  ngrok:       ${NGROK_URL}"
echo -e "  OpenClaw:    ws://127.0.0.1:18789"
echo ""
echo -e "  Chains:"
echo -e "    0G Galileo:     https://evmrpc-testnet.0g.ai (16602)"
echo -e "    World Sepolia:  chainId 4801"
echo -e "    Hedera Testnet: account ${HEDERA_OPERATOR_ID:-'not set'}"
echo -e "    Blocky402:      https://api.testnet.blocky402.com"
echo ""
echo -e "  Logs:"
echo -e "    ngrok:     /tmp/ngrok.log"
echo -e "    OpenClaw:  /tmp/openclaw.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep running — stream Next.js logs
wait $NEXTJS_PID
