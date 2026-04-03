# Shield Verification Check Skill

Query the ERC-8004 ValidationRegistry and ReputationRegistry to determine
whether a provider should be allowed or denied for resource allocation.

## When to Use

Before any resource allocation, Shield checks whether the provider:
1. Has a valid TEE attestation in the ValidationRegistry
2. Has acceptable reputation scores in the ReputationRegistry
3. Is registered in the IdentityRegistry with a valid ERC-8004 identity

## Parameters

- `agentId` (required): The ERC-8004 agent ID to check
- `minQuality` (optional): Minimum quality score (default: 50)
- `requireTEE` (optional): Whether TEE validation is required (default: true)

## Decision Logic

```
IF no ERC-8004 identity → DENY
IF requireTEE AND no ValidationRegistry pass → DENY
IF quality < minQuality → DENY
ELSE → ALLOW
```

## Implementation

Reads from `IdentityRegistry`, `ValidationRegistry`, and `ReputationRegistry`
on 0G Galileo testnet. Shield never writes — only reads and issues ALLOW/DENY.

## Constraints

- Default stance: DENY. Only allow if all checks pass.
- Only a human operator can override a DENY decision.
- Never approve a provider that lacks TEE validation.
