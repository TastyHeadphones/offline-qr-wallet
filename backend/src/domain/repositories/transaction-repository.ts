import type { OfflineTransaction } from "../entities/transaction.js";

export interface TransactionRepository {
  getByTxId(txId: string): Promise<OfflineTransaction | undefined>;
  getByIdempotencyKey(idempotencyKey: string): Promise<OfflineTransaction | undefined>;
  save(transaction: OfflineTransaction): Promise<void>;
  listByAccount(accountId: string, limit: number): Promise<OfflineTransaction[]>;
  listByMerchantAndDate(merchantAccountId: string, date: string): Promise<OfflineTransaction[]>;
}
