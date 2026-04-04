import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const AGENT_NAMES = ["seer", "edge", "shield", "lens"] as const;

/**
 * GET /.well-known/agent-card.json
 *
 * A2A discovery endpoint — returns a composite agent card listing all
 * Vocaid agents with their ERC-8004 identities and service endpoints.
 * Sponsors and judges look for this standard path.
 */
export async function GET() {
  const agents = await Promise.all(
    AGENT_NAMES.map(async (name) => {
      const filePath = join(process.cwd(), "public", "agent-cards", `${name}.json`);
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw);
    }),
  );

  const card = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Vocaid Hub",
    description:
      "Reliable Resources for the Agentic Economy — 4 AI agents backed by World ID-verified human operators, registered on 0G Chain via ERC-8004.",
    version: "1.0.0",
    operator: {
      worldAppId: process.env.NEXT_PUBLIC_WORLD_APP_ID || "app_74d7b06d88b9e220ad1cc06e387c55f3",
      identityRegistry: process.env.IDENTITY_REGISTRY || null,
      chain: "0g-galileo-testnet",
    },
    agents,
  };

  return NextResponse.json(card, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json",
    },
  });
}
