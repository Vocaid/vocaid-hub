# AI Attribution — Vocaid Hub

## AI Tools Used

**Claude Code** (Anthropic) — Used throughout the 48-hour hackathon for:
- Architecture design and technical research
- Smart contract development and deployment scripts
- Next.js API routes and React components
- Documentation and submission materials

## Human Decisions

The following decisions were made by the human team, not AI:

- **Partner selection:** World + 0G + Hedera (from 12 available tracks)
- **Architecture:** 3-chain design — Trust (World) / Verify (0G) / Settle (Hedera)
- **Innovation focus:** GPU provider verification as 0G's confirmed infrastructure gap
- **Bounty strategy:** Targeting 8 tracks across 3 partners ($50k ceiling)
- **UX design:** Mobile-first Mini App for World App viewport
- **Risk assessment:** TEE.Fail mitigation via dual trust signals (DCAP + Reputation)

## AI-Generated Code

All implementation code was written during the 48-hour hackathon window with AI assistance:

- Solidity contracts (ERC-8004 interfaces, CredentialGate, GPUProviderRegistry, ResourcePrediction, MockTEEValidator)
- TypeScript SDK integrations (0G broker, Hedera SDK, World ID, AgentKit)
- Next.js pages and API routes
- React components (ResourceCard, PredictionCard, GPUStepper, PaymentConfirmation, etc.)
- Deployment and seed scripts
- OpenClaw agent configurations

## Pre-Existing Code (Not Written During Hackathon)

- ERC-8004 contract interfaces — from [erc-8004/erc-8004-contracts](https://github.com/erc-8004/erc-8004-contracts) (open source)
- Automata DCAP attestation contracts — from [automata-network](https://github.com/automata-network) (open source)
- World MiniKit starter template — from `@worldcoin/create-mini-app` (public starter kit, explicitly permitted by ETHGlobal rules)
- OpenClaw agent framework — open source
- All third-party SDKs (@worldcoin/minikit-js, @0glabs/0g-serving-broker, @hashgraph/sdk, etc.)

## AI in the Product

The product itself uses AI agents:

- **4 OpenClaw agents** (Seer, Edge, Shield, Lens) powered by LLM inference via 0G Compute Network
- Seer: Signal analysis and market intelligence
- Edge: Resource pricing and market making
- Shield: Risk management and provider validation
- Lens: Discovery, monitoring, and reputation feedback

## Planning Documents

18 planning and research documents were written pre-hackathon with AI assistance. These contain architecture design, technology research, and execution planning — no implementation code. All code was written during the hackathon.
