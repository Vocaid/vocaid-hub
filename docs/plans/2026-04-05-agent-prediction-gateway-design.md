# Design: Agent Prediction Gateway + Positive Reinforcement Loop

**Date:** 2026-04-05
**Status:** Approved
**Chain:** 0G Galileo (same chain as IdentityRegistry + ResourcePrediction)
**Time budget:** ~15 hours

---

## Problem

Agents registered by users can discover resources and monitor signals, but cannot participate in prediction markets autonomously. There is no mechanism for agents to propose bets/polls to their owner for approval. After hiring resources, there is no feedback loop prompting users to rate quality or create prediction markets based on their experience.

## Solution

Three interconnected pieces:

### 1. AgentProposalRegistry (On-Chain)

A new contract on 0G Galileo where registered agents submit prediction proposals (bets or market creations) that require owner approval before execution.

**Contract:** `contracts/0g/AgentProposalRegistry.sol` (~80 lines)

```solidity
struct Proposal {
    uint256 agentId;
    ProposalType pType;        // BET or CREATE_MARKET
    bytes data;                 // abi.encode(marketId, side, amount) or abi.encode(question, resolutionTime)
    Status status;              // PENDING, APPROVED, REJECTED, EXPIRED
    uint256 createdAt;
}

enum ProposalType { BET, CREATE_MARKET }
enum Status { PENDING, APPROVED, REJECTED, EXPIRED }
```

**Functions:**
- `submitProposal(agentId, pType, data)` — Agent submits. Requires `identityRegistry.isAuthorizedOrOwner(msg.sender, agentId)`.
- `approveAndExecute(proposalId)` — Owner approves + executes in one tx. For BET: calls `resourcePrediction.placeBet()`. For CREATE_MARKET: calls `resourcePrediction.createMarket()`.
- `reject(proposalId)` — Owner rejects.
- `getProposals(agentId)` — View pending proposals for an agent.

**Expiry:** Proposals auto-expire after 24 hours (`createdAt + 1 days`).

**Links to:**
- `IdentityRegistry` — ownership verification
- `ResourcePrediction` — bet/market execution

### 2. Seer Signal → Agent Proposal Flow

Seer analyzes market signals via existing A2A, then Edge submits proposals on-chain:

```
Seer (A2A: querySignal)
  → detects: "H100 demand rising, YES pool undervalued"
  → confidence: 78%
  
Edge (receives Seer signal)
  → Shield clearance check (A2A: requestClearance)
  → If cleared: submitProposal(agentId, BET, encode(marketId=0, side=YES, amount=0.01))
  
Owner (Profile page)
  → sees: "Edge proposes: Bet 0.01 A0GI YES on 'H100 cost < $0.03'"
  → clicks Approve → approveAndExecute() → bet placed on-chain
  → or clicks Reject → reject()
```

**API route:** `POST /api/proposals` — reads proposals from chain, submits approval/rejection txs.
**API route:** `GET /api/proposals?agentId=X` — returns pending proposals for display.

### 3. Positive Reinforcement Loop (Post-Hire)

After a user hires/leases a resource:

**Step A — Automatic (Lens agent):**
- Lens measures technical metrics (latency, uptime) after hire
- Writes reputation to ERC-8004 ReputationRegistry (existing `giveFeedback()`)
- This happens in the payment completion handler

**Step B — User prompt (Post-Hire Rating Modal):**
- After hire completes, show a modal with:
  - Star rating (1-5) → writes reputation via `/api/reputation` POST
  - Optional: "Create prediction: Will [resource] maintain [metric]?" → submits via `/api/predictions` POST
- This closes the feedback loop: use resource → rate it → predict its future → reputation grows

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `contracts/0g/AgentProposalRegistry.sol` | Create (~80 lines) |
| `src/app/api/proposals/route.ts` | Create (GET/POST) |
| `src/components/ProposalQueue.tsx` | Create (approval UI for Profile) |
| `src/components/PostHireRating.tsx` | Create (rating + prediction suggestion modal) |
| `src/app/(protected)/profile/profile-content.tsx` | Modify (add ProposalQueue) |
| `src/app/(protected)/home/marketplace-content.tsx` | Modify (show PostHireRating after payment) |
| `scripts/deploy-0g.ts` | Modify (add AgentProposalRegistry deployment) |
| `src/app/api/payments/route.ts` | Modify (trigger Lens auto-feedback after payment) |

---

## Verification

- Contract compiles and deploys to 0G Galileo
- Agent can submit proposal via API → appears on-chain
- Owner sees proposal in Profile page → approves → bet executes
- After hiring a resource, user sees rating modal
- Rating writes reputation on-chain
- `npm run build` passes
