import type { LedgerRepository } from "../repositories/ledger-repository.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";

export class HistoryService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  async getAccountHistory(accountId: string, limit: number): Promise<{ transactions: readonly unknown[]; ledger: readonly unknown[] }> {
    const transactions = await this.transactionRepository.listByAccount(accountId, limit);
    const ledger = await this.ledgerRepository.listByAccount(accountId, limit);
    return { transactions, ledger };
  }
}
