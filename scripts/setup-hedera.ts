/**
 * scripts/setup-hedera.ts
 *
 * Run once to create HTS credential tokens and HCS audit topic on Hedera testnet.
 * Prints the created IDs so they can be added to .env.
 *
 * Usage:
 *   npx tsx scripts/setup-hedera.ts
 */

import { createCredentialToken, createAuditTopic, associateToken, initClient } from "../src/lib/hedera";

async function main() {
  console.log("=== Hedera Setup Script ===\n");

  // Initialise client (also validates credentials)
  initClient();
  console.log("✓ Hedera client initialised\n");

  // 1. Create credential token for verified healthcare providers
  console.log("Creating credential token: VocaidCredential (VCRED)...");
  const credentialTokenId = await createCredentialToken(
    "VocaidCredential",
    "VCRED",
  );
  console.log(`✓ Credential Token ID: ${credentialTokenId}\n`);

  // 1b. Associate token with operator (treasury auto-associates, this validates the function)
  const operatorId = process.env.HEDERA_OPERATOR_ID ?? process.env.HEDERA_ACCOUNT_ID ?? "0.0.8368570";
  console.log(`Associating token with operator ${operatorId}...`);
  try {
    await associateToken(operatorId, credentialTokenId);
    console.log("✓ Token associated with operator\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
      console.log("✓ Token already associated (treasury auto-association)\n");
    } else {
      console.warn("⚠ Association failed (non-critical):", msg, "\n");
    }
  }

  // 2. Create audit topic for agent decisions
  console.log("Creating HCS audit topic...");
  const auditTopicId = await createAuditTopic(
    "Vocaid Hub — Agent Decision Audit Trail",
  );
  console.log(`✓ Audit Topic ID: ${auditTopicId}\n`);

  // 3. Print environment variables
  console.log("=== Add these to your .env ===\n");
  console.log(`HEDERA_CREDENTIAL_TOKEN=${credentialTokenId}`);
  console.log(`HEDERA_AUDIT_TOPIC=${auditTopicId}`);
  console.log(`HEDERA_USDC_TOKEN=0.0.429274`);
  console.log(`HEDERA_OPERATOR_ID=0.0.8368570`);
  console.log();
  console.log("Setup complete.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
