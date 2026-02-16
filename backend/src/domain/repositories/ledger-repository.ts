import type { LedgerEntry } from "../entities/ledger.js";

export interface LedgerRepository {
  append(entry: LedgerEntry): Promise<void>;
  listByAccount(accountId: string, limit: number): Promise<LedgerEntry[]>;
  listByMerchantAndDate(merchantAccountId: string, date: string): Promise<LedgerEntry[]>;
}
