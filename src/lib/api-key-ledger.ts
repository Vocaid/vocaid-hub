import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHash } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const KEYS_PATH = join(DATA_DIR, 'api-keys.json');

export type ChainId = '0g' | 'hedera' | 'world';

export interface ApiKeyRecord {
  keyHash: string;
  maskedKey: string;
  walletAddress: string;
  chain: ChainId;
  createdAt: string;
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

export function generateApiKey(walletAddress: string, chain: ChainId): { key: string; record: ApiKeyRecord } {
  const raw = randomBytes(24).toString('base64url');
  const key = `voc_${raw}`;
  const record: ApiKeyRecord = {
    keyHash: hashKey(key),
    maskedKey: `voc_${raw.slice(0, 4)}...${raw.slice(-2)}`,
    walletAddress,
    chain,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
  };
  const keys = readKeys();
  keys.push(record);
  writeKeys(keys);
  return { key, record };
}

export function validateApiKey(key: string): ApiKeyRecord | null {
  const hash = hashKey(key);
  const keys = readKeys();
  const record = keys.find((k) => k.keyHash === hash && !k.revoked);
  if (record) {
    record.lastUsedAt = new Date().toISOString();
    writeKeys(keys);
  }
  return record ?? null;
}

export function revokeApiKey(walletAddress: string): boolean {
  const keys = readKeys();
  const record = keys.find((k) => k.walletAddress === walletAddress && !k.revoked);
  if (!record) return false;
  record.revoked = true;
  writeKeys(keys);
  return true;
}

export function getKeyByWallet(walletAddress: string): ApiKeyRecord | null {
  const keys = readKeys();
  return keys.find((k) => k.walletAddress === walletAddress && !k.revoked) ?? null;
}
