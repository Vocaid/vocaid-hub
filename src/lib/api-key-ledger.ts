import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHash } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const KEYS_PATH = join(DATA_DIR, 'api-keys.json');
const KEY_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type ChainId = '0g' | 'hedera' | 'world';

export interface ApiKeyRecord {
  keyHash: string;
  maskedKey: string;
  walletAddress: string;
  ownerWallet?: string; // session wallet that generated the key (may differ from agent wallet)
  chain: ChainId;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

let _cache: ApiKeyRecord[] | null = null;

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readKeys(): ApiKeyRecord[] {
  if (_cache) return _cache;
  ensureDir();
  if (!existsSync(KEYS_PATH)) return [];
  _cache = JSON.parse(readFileSync(KEYS_PATH, 'utf-8'));
  return _cache!;
}

function writeKeys(keys: ApiKeyRecord[]) {
  ensureDir();
  writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
  _cache = keys;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Purge revoked keys older than 7 days and expired keys */
function purgeStale(keys: ApiKeyRecord[]): ApiKeyRecord[] {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  return keys.filter((k) => {
    if (k.revoked && new Date(k.createdAt).getTime() < sevenDaysAgo) return false;
    if (new Date(k.expiresAt).getTime() < now && !k.revoked) {
      k.revoked = true; // auto-expire
    }
    return true;
  });
}

export function generateApiKey(walletAddress: string, chain: ChainId, ownerWallet?: string): { key: string; record: ApiKeyRecord } {
  const raw = randomBytes(24).toString('base64url');
  const key = `voc_${raw}`;
  const now = new Date();
  const record: ApiKeyRecord = {
    keyHash: hashKey(key),
    maskedKey: `voc_${raw.slice(0, 4)}...${raw.slice(-2)}`,
    walletAddress,
    ownerWallet: ownerWallet || walletAddress,
    chain,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + KEY_TTL_MS).toISOString(),
    lastUsedAt: null,
    revoked: false,
  };
  let keys = readKeys();
  keys = purgeStale(keys); // clean up on write
  keys.push(record);
  writeKeys(keys);
  return { key, record };
}

export function validateApiKey(key: string): ApiKeyRecord | null {
  const hash = hashKey(key);
  let keys = readKeys();
  keys = purgeStale(keys);
  const record = keys.find((k) => k.keyHash === hash && !k.revoked);
  if (!record) return null;

  // Check expiration
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    record.revoked = true;
    writeKeys(keys);
    return null;
  }

  record.lastUsedAt = new Date().toISOString();
  writeKeys(keys);
  return record;
}

export function revokeApiKey(walletAddress: string): boolean {
  const keys = readKeys();
  const record = keys.find((k) =>
    (k.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      || k.ownerWallet?.toLowerCase() === walletAddress.toLowerCase())
    && !k.revoked
  );
  if (!record) return false;
  record.revoked = true;
  writeKeys(keys);
  return true;
}

export function getKeyByWallet(walletAddress: string): ApiKeyRecord | null {
  const keys = readKeys();
  const record = keys.find((k) => k.walletAddress.toLowerCase() === walletAddress.toLowerCase() && !k.revoked);
  if (!record) return null;
  // Check expiration
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;
  return record;
}

/** Look up by ownerWallet (the session wallet that generated the key) — handles agent wallet ≠ session wallet */
export function getKeyByOwner(ownerWallet: string): ApiKeyRecord | null {
  const keys = readKeys();
  const record = keys.find((k) =>
    (k.ownerWallet?.toLowerCase() === ownerWallet.toLowerCase()
      || k.walletAddress.toLowerCase() === ownerWallet.toLowerCase())
    && !k.revoked
  );
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;
  return record;
}
