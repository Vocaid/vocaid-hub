import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenGrantKycTransaction,
  TokenFreezeTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  ScheduleCreateTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Transaction,
  NftId,
} from "@hashgraph/sdk";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEDERA_ACCOUNT_ID =
  process.env.HEDERA_OPERATOR_ID ?? process.env.HEDERA_ACCOUNT_ID ?? "0.0.8368570";
const HEDERA_PRIVATE_KEY =
  process.env.HEDERA_OPERATOR_KEY ??
  process.env.HEDERA_PRIVATE_KEY ??
  "0xf7ea04d37cce8441b89b95c3ded4b3f373f4e1ce70a1619d6a44c1b851a386f4";
const HEDERA_NETWORK = process.env.HEDERA_NETWORK ?? "testnet";

const MIRROR_NODE_BASE =
  HEDERA_NETWORK === "mainnet"
    ? "https://mainnet.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

let _client: Client | null = null;

export function initClient(): Client {
  if (_client) return _client;

  const operatorId = AccountId.fromString(HEDERA_ACCOUNT_ID);
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  _client =
    HEDERA_NETWORK === "mainnet"
      ? Client.forMainnet()
      : Client.forTestnet();

  _client.setOperator(operatorId, operatorKey);
  return _client;
}

// ---------------------------------------------------------------------------
// HTS — Credential Tokens (non-transferable, KYC-enabled)
// ---------------------------------------------------------------------------

/**
 * Creates a non-transferable HTS token for verified credentials.
 * - No supply key omission means minting is gated by the admin key.
 * - KYC key = operator ⇒ only KYC-approved accounts can hold the token.
 * - No transfer key set ⇒ token is non-transferable (soulbound).
 */
export async function createCredentialToken(
  tokenName: string,
  tokenSymbol: string,
): Promise<string> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TokenCreateTransaction()
    .setTokenName(tokenName)
    .setTokenSymbol(tokenSymbol)
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setInitialSupply(0)
    .setAdminKey(operatorKey.publicKey)
    .setSupplyKey(operatorKey.publicKey)
    .setKycKey(operatorKey.publicKey)
    .setFreezeKey(operatorKey.publicKey)
    // Deliberately omitting setTransferKey — makes token non-transferable
    .setTreasuryAccountId(AccountId.fromString(HEDERA_ACCOUNT_ID))
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  const tokenId = receipt.tokenId;
  if (!tokenId) throw new Error("Token creation failed — no tokenId in receipt");
  return tokenId.toString();
}

/**
 * Grant KYC to a specific account for a credential token.
 * Call this after World ID verification succeeds.
 */
export async function grantKyc(
  accountId: string,
  tokenId: string,
): Promise<void> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TokenGrantKycTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenId(tokenId)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

/**
 * Mint a credential NFT to the treasury. The metadata bytes typically
 * contain an IPFS CID pointing to the full credential JSON.
 */
export async function mintCredential(
  tokenId: string,
  metadata: Uint8Array[],
): Promise<number[]> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(metadata)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  return receipt.serials.map((s) => Number(s));
}

/**
 * Freeze an account's holdings of a credential token.
 * Use for flagging fraudulent credentials.
 */
export async function freezeCredential(
  accountId: string,
  tokenId: string,
): Promise<void> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TokenFreezeTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenId(tokenId)
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

// ---------------------------------------------------------------------------
// HTS — Token Association & NFT Transfer
// ---------------------------------------------------------------------------

/**
 * Associate a token with an account. Hedera requires this before an account
 * can hold any HTS token. The receiving account must sign — here we use
 * the operator key (works for operator-controlled testnet accounts).
 */
export async function associateToken(
  accountId: string,
  tokenId: string,
): Promise<void> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds([tokenId])
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

/**
 * Transfer an NFT from one account to another.
 * Operator must be the treasury or have allowance.
 */
export async function transferNft(
  tokenId: string,
  serialNumber: number,
  fromAccountId: string,
  toAccountId: string,
): Promise<void> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const nftId = NftId.fromString(`${tokenId}/${serialNumber}`);
  const tx = new TransferTransaction()
    .addNftTransfer(
      nftId,
      AccountId.fromString(fromAccountId),
      AccountId.fromString(toAccountId),
    )
    .freezeWith(client);

  const signed = await tx.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

/**
 * End-to-end credential issuance: associate token → grant KYC → mint → transfer.
 * Returns the minted serial numbers.
 */
export async function mintAndTransferCredential(
  tokenId: string,
  metadata: Uint8Array[],
  recipientAccountId: string,
): Promise<number[]> {
  // Associate (catches "already associated" gracefully)
  try {
    await associateToken(recipientAccountId, tokenId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) throw err;
  }

  await grantKyc(recipientAccountId, tokenId);
  const serials = await mintCredential(tokenId, metadata);

  for (const serial of serials) {
    await transferNft(tokenId, serial, HEDERA_ACCOUNT_ID, recipientAccountId);
  }

  return serials;
}

// ---------------------------------------------------------------------------
// Scheduled Transactions (3rd native Hedera service for No Solidity track)
// ---------------------------------------------------------------------------

/**
 * Wrap any frozen transaction in a ScheduleCreateTransaction.
 * Adds a 3rd native Hedera service (HTS + HCS + Scheduled Tx).
 */
export async function scheduleTransaction(
  innerTx: Transaction,
  memo?: string,
): Promise<string> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const scheduleTx = new ScheduleCreateTransaction()
    .setScheduledTransaction(innerTx)
    .setPayerAccountId(AccountId.fromString(HEDERA_ACCOUNT_ID))
    .setAdminKey(operatorKey.publicKey);

  if (memo) scheduleTx.setScheduleMemo(memo);

  const response = await scheduleTx.execute(client);
  const receipt = await response.getReceipt(client);

  const scheduleId = receipt.scheduleId;
  if (!scheduleId) throw new Error("Schedule creation failed — no scheduleId");
  return scheduleId.toString();
}

// ---------------------------------------------------------------------------
// HCS — Audit Trail
// ---------------------------------------------------------------------------

/**
 * Create a new HCS topic for agent audit logging.
 * Returns the topic ID string (e.g. "0.0.12345").
 */
export async function createAuditTopic(memo?: string): Promise<string> {
  const client = initClient();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);

  const tx = new TopicCreateTransaction()
    .setAdminKey(operatorKey.publicKey)
    .setSubmitKey(operatorKey.publicKey);

  if (memo) tx.setTopicMemo(memo);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  const topicId = receipt.topicId;
  if (!topicId) throw new Error("Topic creation failed — no topicId in receipt");
  return topicId.toString();
}

/**
 * Submit an audit message to an HCS topic.
 */
export async function logAuditMessage(
  topicId: string,
  message: string,
): Promise<void> {
  const client = initClient();

  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message);

  const response = await tx.execute(client);
  await response.getReceipt(client);
}

/**
 * Query the audit trail for a topic via Mirror Node REST API.
 * Returns the raw messages array from the mirror node response.
 */
export async function queryAuditTrail(
  topicId: string,
  limit = 100,
): Promise<HcsMessage[]> {
  const url = `${MIRROR_NODE_BASE}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Mirror Node query failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { messages: RawHcsMessage[] };

  return data.messages.map((m) => ({
    sequenceNumber: m.sequence_number,
    contents: Buffer.from(m.message, "base64").toString("utf-8"),
    consensusTimestamp: m.consensus_timestamp,
    topicId: m.topic_id,
  }));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HcsMessage {
  sequenceNumber: number;
  contents: string;
  consensusTimestamp: string;
  topicId: string;
}

interface RawHcsMessage {
  sequence_number: number;
  message: string;
  consensus_timestamp: string;
  topic_id: string;
}
