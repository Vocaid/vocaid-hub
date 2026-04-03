# OpenClaw Agent Security Risk Assessment

**Date:** 2026-04-02
**Context:** Running 4 OpenClaw agents on MacBook Pro M3 Max (48GB) at ETHGlobal Cannes 2026
**Agents:** Seer, Edge, Shield, Lens — handling wallet keys for 0G Chain, Arc, World Chain
**Risk Level:** HIGH without mitigations, MEDIUM with recommended controls

---

## Hardware Profile

| Resource | Available | OpenClaw Need | Headroom |
|----------|-----------|--------------|----------|
| RAM | 48 GB (6.5 GB free typical) | ~1 GB (Gateway 500MB + 4x agents 100MB each) | Sufficient |
| CPU | M3 Max 16-core | Light (compute on 0G network) | Ample |
| Storage | SSD | Minimal (agent state files) | Ample |
| Network | WiFi / Hotspot | Moderate (RPC calls, inference) | Dependent on venue |

**Kaspersky antivirus is running** — may flag/block OpenClaw behaviors (WebSocket server, shell execution). Test before venue.

---

## Threat Model: 5 Attack Surfaces

### 1. ClawJacked — WebSocket Hijacking (CRITICAL, PATCHED)

**What:** Any website's JavaScript can connect to `localhost:18789` (OpenClaw Gateway port). Browser does not enforce same-origin policy on WebSocket connections to localhost.

**Attack:** Pre-patch, the Gateway auto-approved localhost pairings with no user prompt. Attacker's page brute-forces the gateway password (rate limiter exempted localhost), then gains full agent control — reads config, dumps data, executes commands.

**Status:** Patched in v2026.2.25. Fix adds rate limiting on localhost, removes auto-approval.

**Our installed version:** v2026.4.1 ✅ (patched)

**Residual risk:** Other undiscovered WebSocket vulnerabilities. Any malicious page visited during the hackathon could attempt new variants.

**Mitigation:**
- Keep browser tabs minimal during agent runtime
- Don't visit untrusted sites while agents run
- Verify Gateway binds to `127.0.0.1` (default), never `0.0.0.0`

### 2. Malicious Skills / Supply Chain (CRITICAL)

**Scale:** 1,184+ malicious skills flagged on ClawHub. 386 found in a 3-day window. Specifically targeting crypto wallets — AMOS malware family on macOS steals Keychain credentials, browser passwords, crypto keys.

**Attack vector:** Skills contain base64-encoded payloads that fetch second-stage malware from C2 infrastructure. Posed as ByBit, Polymarket, Axiom trading tools.

**What they steal:** Crypto exchange API keys, wallet private keys, SSH credentials, browser passwords, Keychain data, Telegram sessions.

**Our risk:** If ANY ClawHub skill is installed without audit, all wallet keys (0G, Arc, World) are exposed.

**Mitigation:**
- **NEVER install skills from ClawHub** for this hackathon
- Write all skills from scratch or use only `0g-agent-skills` (audited, from 0G Foundation)
- Disable `.OpenClaw/extensions/` auto-discovery (empty the directory, set read-only)
- Audit every SKILL.md file before loading

### 3. Single-Process Multi-Agent Key Exposure (HIGH)

**Architecture:** All 4 agents run in one Gateway process. OpenClaw's security model is "personal assistant" (one trusted operator), NOT multi-tenant isolation.

**Risk:** Agent A's environment variables are accessible to Agent B within the same process. A compromised agent (via prompt injection, skill exploit, or command bypass) can read all wallet keys.

**Evidence:** Skills define required env vars in SKILL.md metadata, but this is a capability check, not a security boundary. Once loaded, a skill operates with the full permissions of the agent process.

**Mitigation options:**

| Approach | Isolation Level | LOE | Hackathon Feasibility |
|----------|----------------|-----|----------------------|
| **A: Single Gateway (default)** | None — all agents share process | 0h | ✅ Simplest, highest risk |
| **B: Docker per agent** | OS-level process isolation | 3-4h | ⚠️ Feasible but setup time |
| **C: Separate Gateway instances** | Process isolation, different ports | 1-2h | ✅ Good balance |
| **D: Single wallet, per-agent allowance** | Financial isolation only | 0.5h | ✅ Mitigates financial loss |

**Recommended for hackathon:** Option D (single wallet with low balance) + Option A (single Gateway). The agents are running our own code, not untrusted skills. The risk is theoretical for a 48h build. Deploy with only the minimum testnet tokens needed.

### 4. Shell Command Execution (HIGH)

**Capability:** OpenClaw agents can execute arbitrary shell commands via `system.run` / exec tool.

**Known CVEs (all patched in our version):**
- CVE-2026-29607: "Allow always" persisted approval at wrapper level — approve safe command, swap inner payload
- CVE-2026-28460: Shell line-continuation injection (`$\` + newline) bypassed allowlists
- CVE-2026-32920: Auto-loaded plugins from `.OpenClaw/extensions/` without trust verification
- CVE-2026-25253: Auth token theft → RCE

**What an agent with shell access can do:** Install packages, modify files, access entire filesystem, make network requests, exfiltrate data.

**Mitigation:**
- Set exec tool to `allowlist` mode — only permit: `curl` (for RPC calls), `node` (for SDK scripts)
- Never use `full` mode with crypto keys present
- Consider `deny` mode if agents only need SDK function calls (not shell)

### 5. Network Exposure at Venue (MEDIUM)

**Shared WiFi risks:** ARP poisoning, DNS spoofing, MitM on non-TLS connections, malicious captive portals.

**Our RPC endpoints:**
- 0G: `https://evmrpc-testnet.0g.ai` — HTTPS ✅
- Arc: `https://rpc.testnet.arc.network` — HTTPS ✅
- World: `https://worldchain-sepolia.g.alchemy.com` — HTTPS ✅
- 0G Compute: TLS (broker SDK uses HTTPS) ✅

All blockchain RPCs use HTTPS. The main risk is non-TLS connections from skills or shell commands.

**Mitigation:**
- Use personal hotspot instead of venue WiFi
- If shared WiFi required, use VPN
- Verify all agent network calls use HTTPS/WSS

---

## Gap Analysis: OpenClaw vs Our Use Cases

| Use Case | OpenClaw Capability | Gap | Mitigation |
|----------|-------------------|-----|-----------|
| **ERC-8004 registration** | Shell execution + ethers.js | None — can call contracts via node scripts | Use allowlisted node commands |
| **0G inference calls** | 0g-agent-skills has `streaming-chat`, `provider-discovery` | None — production skills from 0G Foundation | Audit skill code before loading |
| **Agent-to-agent coordination** | `agentToAgent` tool (local mode) | None — built-in, zero setup | Works in single Gateway process |
| **Circle Nanopayments** | Shell execution + TypeScript SDK | Need custom skill wrapping `@circle-fin/x402-batching` | Write custom skill (~30 lines) |
| **Reputation feedback** | Shell execution + ethers.js | Need custom skill calling ReputationRegistry | Write custom skill (~40 lines) |
| **Prediction market interaction** | Shell execution + ethers.js | Need custom skill calling ResourcePrediction.sol | Write custom skill (~40 lines) |
| **World ID verification** | Not native to OpenClaw | Agent doesn't verify World ID — the Mini App frontend does | No gap — different layer |
| **Persistent state** | OpenClaw has markdown-based memory | 0G Storage KV preferred for on-chain persistence | Custom skill for 0G Storage (~30 lines) |
| **Wallet key isolation** | Single process, shared env | All keys accessible to all agents | Use low-balance wallets + Option D |

**Total custom skills needed:** 4 (Nanopayments, Reputation, Prediction Market, 0G Storage)
**LOE for custom skills:** ~2-3 hours total

---

## Pros and Cons: OpenClaw for This Use Case

### Pros

| Advantage | Impact |
|-----------|--------|
| **Direct path to 0G OpenClaw Agent track ($6k)** | Track literally requires OpenClaw |
| **0g-agent-skills already exists** | 14 production skills, audited by 0G Foundation |
| **Single Gateway hosts all agents** | Simple deployment, low resource usage (~1GB RAM) |
| **Agent-to-agent built in** | `agentToAgent` tool requires zero A2A server setup |
| **ERC-8004 skill on ClawHub** | (but audit before using — write our own if suspicious) |
| **Model-agnostic** | Can route to 0G Compute, Anthropic fallback, or local models |
| **M3 Max 48GB is overkill** | ~6x the minimum RAM requirement |
| **v2026.4.1 has all CVEs patched** | No known unpatched vulnerabilities |

### Cons

| Risk | Severity | Mitigation Available |
|------|----------|---------------------|
| **No multi-tenant isolation** | HIGH | Use low-balance wallets |
| **Shell execution by default** | HIGH | Set to allowlist/deny mode |
| **1,184+ malicious skills on ClawHub** | CRITICAL | Never install ClawHub skills |
| **9 CVEs in 2 months (Jan-Mar 2026)** | HIGH | Run latest version (v2026.4.1) |
| **Kaspersky may block behaviors** | MEDIUM | Test before venue |
| **Shared WiFi at venue** | MEDIUM | Use personal hotspot |
| **No hardware wallet support** | MEDIUM | Use testnet tokens only |
| **Gateway password brute-forceable pre-patch** | LOW (patched) | Updated version |

---

## Recommended Security Configuration

### 1. OpenClaw Gateway Config

```json
{
  "gateway": {
    "bindAddress": "127.0.0.1",
    "port": 18789,
    "authToken": "<generate-strong-random-token>",
    "autoApproveLocalhost": false
  },
  "exec": {
    "mode": "allowlist",
    "allowedCommands": [
      "node",
      "npx",
      "curl"
    ]
  },
  "skills": {
    "autoDiscovery": false,
    "trustedSources": ["./skills/"]
  }
}
```

### 2. Wallet Strategy

| Chain | Wallet | Balance | Purpose |
|-------|--------|---------|---------|
| 0G Galileo | `0x1B506fA...` | ~10 A0GI | Contract deployment + inference |
| Arc Testnet | Same or separate | ~100 USDC | Prediction markets + nanopayments |
| World Sepolia | Same or separate | ~0.1 ETH | CredentialGate deployment |

**All testnet tokens.** Zero real funds. If keys are compromised, maximum loss = hackathon time to re-fund from faucets.

### 3. Pre-Hackathon Security Checklist

- [ ] Verify OpenClaw version >= v2026.4.1 (`openclaw --version`)
- [ ] Empty `~/.OpenClaw/extensions/` directory (prevent auto-loaded plugins)
- [ ] Set exec mode to `allowlist` in gateway config
- [ ] Set `autoApproveLocalhost: false`
- [ ] Generate strong gateway authToken
- [ ] Audit all 0g-agent-skills SKILL.md files
- [ ] Test Kaspersky compatibility with OpenClaw Gateway
- [ ] Prepare personal hotspot (don't rely on venue WiFi)
- [ ] Fund wallets with minimum testnet tokens only

---

## LOE Summary

| Task | Hours | When |
|------|-------|------|
| Write 4 custom OpenClaw skills (Nanopayments, Reputation, Prediction, 0G Storage) | 2-3 | Wave 2 |
| Security hardening (config, allowlist, audit 0g-skills) | 1 | Wave 1 |
| Kaspersky compatibility test | 0.5 | Pre-hackathon |
| Docker isolation per agent (optional, if time) | 3-4 | Wave 1 |
| **Total** | **3.5-4.5h** (without Docker) | |

---

## Decision: Go or No-Go

**GO** — with the following conditions:

1. ✅ v2026.4.1 installed (all CVEs patched)
2. ✅ Testnet tokens only (zero financial risk)
3. ✅ No ClawHub skills (write our own)
4. ✅ Exec allowlist mode (restrict shell commands)
5. ✅ Personal hotspot (avoid venue WiFi)
6. ✅ M3 Max 48GB handles 4 agents easily

The security risks are real but mitigable for a hackathon context with testnet tokens. The 0G OpenClaw Agent track ($6k) requires OpenClaw specifically — there is no alternative framework that qualifies.

---

## Sources

- [Oasis Security: ClawJacked Disclosure](https://www.oasis.security/blog/openclaw-vulnerability)
- [The Hacker News: 341 Malicious ClawHub Skills](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub-skills.html)
- [OpenClaw Official Post-Mortem](https://openclawai.io/blog/clawjacked-vulnerability-what-happened/)
- [Docker: Run OpenClaw Securely](https://www.docker.com/blog/run-openclaw-securely-in-docker-sandboxes/)
- [Microsoft: Running OpenClaw Safely](https://www.microsoft.com/en-us/security/blog/2026/02/19/running-openclaw-safely-identity-isolation-runtime-risk/)
- [OpenClaw CVE Flood Blog](https://openclawai.io/blog/openclaw-cve-flood-nine-vulnerabilities-four-days-march-2026)
- [Nebius: OpenClaw Security Architecture](https://nebius.com/blog/posts/openclaw-security)
- [Adversa AI: OpenClaw Security 101](https://adversa.ai/blog/openclaw-security-101-vulnerabilities-hardening-2026/)
- [DeepWiki: OpenClaw Secret Management](https://deepwiki.com/openclaw/openclaw/7.4-secret-management)
- [CryptoNewsZ: 1,184 Malicious Skills Flagged](https://www.cryptonewsz.com/openclaws-clawhub-flags-1184-malicious-skills/)
