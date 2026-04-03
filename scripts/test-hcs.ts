import { logAuditMessage, queryAuditTrail, initClient } from "../src/lib/hedera.ts";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TOPIC = "0.0.8499635";

async function main() {
  initClient();

  // Submit test message
  const msg = JSON.stringify({
    type: "system_test",
    agent: "agent-3",
    timestamp: new Date().toISOString(),
    message: "Hedera HCS audit trail initialized",
  });
  await logAuditMessage(TOPIC, msg);
  console.log("✓ HCS message submitted");

  // Query audit trail
  console.log("\nQuerying audit trail (may take a few seconds to appear)...");
  await new Promise((r) => setTimeout(r, 5000));
  const messages = await queryAuditTrail(TOPIC, 5);
  console.log(`✓ ${messages.length} messages found:`);
  for (const m of messages) {
    console.log(`  [${m.sequenceNumber}] ${m.contents}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
