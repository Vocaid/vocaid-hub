# Prediction Market Skill

Interact with the ResourcePrediction contract on 0G Chain to create markets and place bets.

## When to Use

When Seer detects a price signal worth betting on, or when Edge wants to manage
a prediction position on future resource prices (GPU hours, inference tokens, storage).

## Parameters

- `action` (required): One of `createMarket`, `placeBet`, `resolveMarket`
- `question` (required for createMarket): The prediction question
- `resolutionTime` (required for createMarket): Unix timestamp when market resolves
- `marketId` (required for placeBet/resolveMarket): On-chain market ID
- `side` (required for placeBet): `yes` or `no`
- `amount` (required for placeBet): Amount in A0GI (will be converted to wei)

## Example

```
Create market: "Will H100 inference cost < 0.05 A0GI by April 5?"
Place bet: market 0, side=yes, amount=5 A0GI
```

## Implementation

Calls `ResourcePrediction.createMarket()` and `ResourcePrediction.placeBet()` on 0G Galileo
testnet at `0x82d5f12e55390016c49faab2ccb3c8d55d63fe7a`.
API routes:
- `POST /api/predictions` -- create market
- `POST /api/predictions/[id]/bet` -- place bet
- `POST /api/predictions/[id]/claim` -- claim winnings
- `POST /api/predictions/[id]/resolve` -- resolve market

> POST endpoints require `X-API-Key` header.

## Constraints

- Max 3 concurrent positions (Edge agent limit)
- Max 10% of balance per position
- Requires Seer signal (confidence >70%) AND Shield clearance before opening
- Only Edge agent should place bets
