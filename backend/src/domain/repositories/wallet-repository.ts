import type { Wallet } from "../entities/wallet.js";

export interface WalletRepository {
  getByAccountId(accountId: string): Promise<Wallet | undefined>;
  upsert(wallet: Wallet): Promise<void>;
}
