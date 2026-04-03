# 0G Storage Skill

Persist and retrieve agent state using 0G's decentralized storage network.

## When to Use

Use this skill to save agent state that must survive restarts:
- Seer: cached signal analysis, trend history
- Edge: open positions, trade history
- Shield: validation cache, risk assessments
- Lens: aggregated metrics, observation log

## Parameters

- `action` (required): `put`, `get`, `list`, or `delete`
- `key` (required for put/get/delete): State key name
- `value` (required for put): JSON string to store

## Example

```
Store Seer's latest signal analysis:
  action=put, key=signals-latest, value={"trends": [...], "timestamp": 1711900000}

Retrieve it later:
  action=get, key=signals-latest
```

## Implementation

Uses `src/lib/og-storage.ts` which wraps 0G Storage KV operations.
Currently uses in-memory fallback; will be wired to `@0glabs/0g-ts-sdk`
when the storage network configuration is available.

## Constraints

- State keys must be namespaced by agent (handled automatically)
- Maximum value size: 1MB
- Do not store secrets or private keys
