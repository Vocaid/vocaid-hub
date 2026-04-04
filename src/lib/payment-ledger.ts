import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const LEDGER_PATH = join(DATA_DIR, "payments.json");
const MAX_PAYMENTS = 50;

export interface PaymentRecord {
  id: string;
  payer: string;
  amount: string;
  resource: string;
  txHash: string;
  network: string;
  settledAt: string;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readPayments(): PaymentRecord[] {
  ensureDir();
  if (!existsSync(LEDGER_PATH)) return [];
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function addPayment(record: PaymentRecord): void {
  const payments = readPayments();
  payments.unshift(record);
  if (payments.length > MAX_PAYMENTS) payments.length = MAX_PAYMENTS;
  writeFileSync(LEDGER_PATH, JSON.stringify(payments, null, 2));
}
