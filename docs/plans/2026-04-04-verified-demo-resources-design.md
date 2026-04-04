# Verified Demo Resources — Design Document

**Date:** 2026-04-04
**Problem:** Marketplace only shows GPU providers from 0G testnet. Human and DePIN tabs are empty. Unverified resources clutter the listing.
**Solution:** Deploy HumanSkillRegistry + DePINRegistry contracts on 0G Galileo. Seed 3 humans + 3 DePIN devices as verified ERC-8004 identities tied to primary wallet. Update /api/resources to read from all registries.

---

## New Contracts

### HumanSkillRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HumanSkillRegistry {
    struct HumanProvider {
        uint256 agentId;
        string skillName;
        string skillLevel;
        string hourlyRate;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => HumanProvider) public providers;
    address[] public activeProviders;

    error AlreadyRegistered();
    event ProviderRegistered(address indexed provider, uint256 agentId, string skillName);

    function registerProvider(
        uint256 agentId, string calldata skillName,
        string calldata skillLevel, string calldata hourlyRate
    ) external {
        if (providers[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        providers[msg.sender] = HumanProvider(agentId, skillName, skillLevel, hourlyRate, block.timestamp, true);
        activeProviders.push(msg.sender);
        emit ProviderRegistered(msg.sender, agentId, skillName);
    }

    function getActiveProviders() external view returns (address[] memory) { return activeProviders; }
    function getProvider(address addr) external view returns (HumanProvider memory) { return providers[addr]; }
}
```

### DePINRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DePINRegistry {
    struct DePINDevice {
        uint256 agentId;
        string deviceName;
        string deviceType;  // "battery", "solar", "ev-charger"
        string capacity;
        string pricePerUnit;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => DePINDevice) public devices;
    address[] public activeDevices;

    error AlreadyRegistered();
    event DeviceRegistered(address indexed device, uint256 agentId, string deviceName);

    function registerDevice(
        uint256 agentId, string calldata deviceName, string calldata deviceType,
        string calldata capacity, string calldata pricePerUnit
    ) external {
        if (devices[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        devices[msg.sender] = DePINDevice(agentId, deviceName, deviceType, capacity, pricePerUnit, block.timestamp, true);
        activeDevices.push(msg.sender);
        emit DeviceRegistered(msg.sender, agentId, deviceName);
    }

    function getActiveDevices() external view returns (address[] memory) { return activeDevices; }
    function getDevice(address addr) external view returns (DePINDevice memory) { return devices[addr]; }
}
```

## Demo Resources (12 total)

All registered from primary wallet (`0x58c45613290313c3aeE76c4C4e70E6e6c54a7eeE`) with `operatorWorldId` set.

### GPU (2) — already seeded via GPUProviderRegistry
- GPU-Alpha: H100 80GB, Intel TDX, $0.05/call
- GPU-Beta: H200 141GB, AMD SEV, $0.08/call

### Agents (4) — already seeded via IdentityRegistry
- Seer: Signal Analysis
- Edge: Market Pricing
- Shield: Risk Management
- Lens: Discovery

### Human Skills (3) — NEW via HumanSkillRegistry
- Maria Santos: Rust Developer L4, $25/hr
- Carlos Rivera: ML Engineer L3, $35/hr
- Aisha Okonkwo: Smart Contract Auditor L5, $50/hr

### DePIN (3) — NEW via DePINRegistry
- Tesla Powerwall: Battery Storage, 13.5 kWh, $0.12/kWh
- Solar Array (5kW): Rooftop PV, Grid-tied, $0.08/kWh
- EV Charger (Level 2): 240V 32A J1772, $0.15/kWh

## API Updates

### /api/resources/route.ts

Add two new data sources alongside existing GPU + Agent:

```typescript
// Existing
const gpuResources = await mapGpuToResources(broker, onChain, getValidationSummary);
const agentResources = await mapAgentsToResources(agents);

// NEW
const humanResources = await mapHumanToResources();  // reads HumanSkillRegistry
const depinResources = await mapDePINToResources();   // reads DePINRegistry

const rawResources = [...agentResources, ...gpuResources, ...humanResources, ...depinResources];
```

### Filter type update

Update `FilterType` to include `depin`:
```typescript
type FilterType = "gpu" | "agent" | "human" | "depin";
```

## Seed Script

New phase in `seed-demo-data.ts`:
- Phase 7: Register 3 human providers (deploy HumanSkillRegistry if needed)
- Phase 8: Register 3 DePIN devices (deploy DePINRegistry if needed)
- Both use primary wallet so `operatorWorldId` matches deployer

## Deploy Script

Extend `scripts/deploy-0g.ts` or create `scripts/deploy-registries.ts` for the two new contracts.

## Files

| Action | File |
|--------|------|
| Create | `contracts/0g/HumanSkillRegistry.sol` |
| Create | `contracts/0g/DePINRegistry.sol` |
| Modify | `scripts/seed-demo-data.ts` (add phases 7-8) |
| Modify | `src/app/api/resources/route.ts` (add human + depin data sources) |
| Modify | `src/lib/og-chain.ts` (add read functions for both registries) |
| Modify | `src/lib/contracts.ts` (add ABIs + addresses) |
| Modify | `.env.example` (add HUMAN_SKILL_REGISTRY + DEPIN_REGISTRY) |
| Modify | `deployments/0g-galileo.json` (add new contract addresses) |

## Verification

1. `npx hardhat compile` — both contracts compile
2. Deploy to 0G Galileo — addresses in deployments JSON
3. `npx tsx scripts/seed-demo-data.ts` — 3 humans + 3 DePIN registered
4. `/api/resources` returns 12 resources (2 GPU + 4 agents + 3 humans + 3 DePIN)
5. All 12 show `verified: true` in marketplace
6. Filter tabs (All/GPU/Agent/Human/DePIN) all show correct resources
7. `npx next build` passes
