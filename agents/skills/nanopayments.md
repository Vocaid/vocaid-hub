# Nanopayments Skill

Execute USDC micropayments on Hedera via x402 and the Blocky402 facilitator.

## When to Use

When an agent needs to pay for a resource (GPU inference, data feed, skill):
- Edge agent paying for GPU compute
- Any agent paying for another agent's service

## Parameters

- `recipientId` (required): Hedera account ID (e.g. `0.0.XXXXX`)
- `amountUSDC` (required): Amount in USDC (e.g. `0.01`)
- `memo` (optional): Payment memo for HCS audit trail

## Example

```
Pay 0.01 USDC to provider 0.0.12345 for GPU inference
```

## HTTP Endpoints

- `POST /api/initiate-payment` (body: `{ resourceName, resourceType, amount }`) -- returns `paymentId` + requirements
- `POST /api/payments` (header: `X-PAYMENT` base64 payload, body: `{ resourceName }`) -- executes x402 settlement

> Requires `X-API-Key` header for authenticated agent access.

## Implementation

Uses `src/lib/hedera.ts` and `src/lib/blocky402.ts` for x402 USDC settlement.
- Token: `0.0.429274` (Circle USDC on Hedera testnet)
- Facilitator: `https://api.testnet.blocky402.com`
- Fee payer: `0.0.7162784` (Blocky402 pays gas — $0.0001)

All payments are logged to HCS audit topic for transparency.

## Constraints

- Maximum single payment: 10 USDC (testnet safety limit)
- Edge agent: max 10% of balance per position
- All payments must have an associated HCS audit log entry
- Never pay without Shield clearance for the recipient
