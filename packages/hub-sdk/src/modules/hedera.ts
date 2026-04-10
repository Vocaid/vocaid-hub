import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenId,
  TopicId,
  AccountId,
  PrivateKey,
  TransferTransaction,
} from "@hashgraph/sdk";
import { HubChainError } from "../errors.js";
import type { HederaChainConfig } from "../types/index.js";
import type { SharedConfig } from "./shared.js";

export interface AuditLogEntry {
  agentId: string;
  action: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface CredentialTokenConfig {
  name: string;
  symbol: string;
  maxSupply?: number;
}

export interface MintCredentialInput {
  tokenId: string;
  metadata: string;
}

export class HederaModule {
  private client: Client | null = null;
  private readonly hederaConfig: HederaChainConfig | undefined;

  constructor(config: SharedConfig) {
    this.hederaConfig = config.chains.hedera as HederaChainConfig | undefined;
  }

  private getClient(): Client {
    if (this.client) return this.client;

    if (!this.hederaConfig) {
      throw new HubChainError("hedera", "Hedera chain not configured. Add hedera to chains config.");
    }

    const network = this.hederaConfig.network ?? "testnet";
    this.client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    this.client.setOperator(
      AccountId.fromString(this.hederaConfig.operatorId),
      PrivateKey.fromStringED25519(this.hederaConfig.operatorKey),
    );

    return this.client;
  }

  get isConfigured(): boolean {
    return this.hederaConfig !== undefined;
  }

  // ── HCS Audit Trail ────────────────────────────────────────────

  async createAuditTopic(memo?: string): Promise<string> {
    const client = this.getClient();
    const tx = new TopicCreateTransaction();
    if (memo) tx.setTopicMemo(memo);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const topicId = receipt.topicId;

    if (!topicId) {
      throw new HubChainError("hedera", "Failed to create HCS topic — no topicId in receipt");
    }

    return topicId.toString();
  }

  async logAudit(topicId: string, entry: AuditLogEntry): Promise<string> {
    const client = this.getClient();
    const message = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });

    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message)
      .execute(client);

    const receipt = await response.getReceipt(client);
    return receipt.topicSequenceNumber?.toString() ?? "0";
  }

  async queryAudit(topicId: string, limit = 10): Promise<Record<string, unknown>[]> {
    const baseUrl = this.hederaConfig?.mirrorNodeUrl ?? "https://testnet.mirrornode.hedera.com";
    const url = `${baseUrl}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new HubChainError("hedera", `Mirror Node query failed: ${response.status}`);
    }

    const data = (await response.json()) as { messages: Array<{ message: string; sequence_number: number; consensus_timestamp: string }> };

    return data.messages.map((msg) => {
      try {
        const decoded = Buffer.from(msg.message, "base64").toString("utf-8");
        return {
          sequenceNumber: msg.sequence_number,
          consensusTimestamp: msg.consensus_timestamp,
          ...JSON.parse(decoded),
        };
      } catch {
        return {
          sequenceNumber: msg.sequence_number,
          consensusTimestamp: msg.consensus_timestamp,
          raw: msg.message,
        };
      }
    });
  }

  // ── HTS Credential Tokens ─────────────────────────────────────

  async createCredentialToken(config: CredentialTokenConfig): Promise<string> {
    const client = this.getClient();

    const operatorKey = PrivateKey.fromStringED25519(this.hederaConfig!.operatorKey);

    const tx = new TokenCreateTransaction()
      .setTokenName(config.name)
      .setTokenSymbol(config.symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(
        config.maxSupply ? TokenSupplyType.Finite : TokenSupplyType.Infinite,
      )
      .setTreasuryAccountId(AccountId.fromString(this.hederaConfig!.operatorId))
      .setSupplyKey(operatorKey.publicKey)
      .setFreezeKey(operatorKey.publicKey)
      .setAdminKey(operatorKey.publicKey);

    if (config.maxSupply) {
      tx.setMaxSupply(config.maxSupply);
    }

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId;

    if (!tokenId) {
      throw new HubChainError("hedera", "Failed to create HTS token — no tokenId in receipt");
    }

    return tokenId.toString();
  }

  async mintCredential(input: MintCredentialInput): Promise<number[]> {
    const client = this.getClient();

    const metadataBytes = Buffer.from(input.metadata, "utf-8");

    const response = await new TokenMintTransaction()
      .setTokenId(TokenId.fromString(input.tokenId))
      .addMetadata(metadataBytes)
      .execute(client);

    const receipt = await response.getReceipt(client);
    return receipt.serials.map((s) => Number(s));
  }

  // ── USDC Transfer (for x402 settlement) ───────────────────────

  async transferUSDC(
    tokenId: string,
    from: string,
    to: string,
    amount: number,
  ): Promise<string> {
    const client = this.getClient();

    const response = await new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(from), -amount)
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(to), amount)
      .execute(client);

    const receipt = await response.getReceipt(client);
    return receipt.status.toString();
  }

  close(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}
