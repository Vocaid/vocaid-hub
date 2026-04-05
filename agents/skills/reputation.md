# Reputation Feedback Skill

Write reputation feedback to the ERC-8004 ReputationRegistry on 0G Chain.

## When to Use

After observing a provider or agent complete a task, use this skill to record
quality, uptime, success rate, or response time feedback on-chain.

## Parameters

- `agentId` (required): The ERC-8004 agent ID (uint256) to rate
- `value` (required): Score from 0-100
- `tag` (required): One of `starred` (quality), `uptime`, `successRate`, `responseTime`
- `endpoint` (optional): The service endpoint that was evaluated

## Example

```
Give feedback for agent 1: quality=85, uptime=99
```

## HTTP Endpoints

- `GET /api/reputation?agentId=X&tag=Y` -- read reputation scores
- `POST /api/reputation` (body: `{ agentId, value, tag1, tag2, endpoint, feedbackURI }`) -- write feedback

> Requires `X-API-Key` header.

## Implementation

Calls `ReputationRegistry.giveFeedback()` on 0G Galileo testnet via `src/lib/reputation.ts`.
Only the Lens agent should write reputation. Other agents read via `getSummary()`.

## Constraints

- Only write observed data, never predictions
- Quality scores must reflect actual interaction outcomes
- Uptime scores must reflect measured availability
- Never fabricate scores or copy from other agents
