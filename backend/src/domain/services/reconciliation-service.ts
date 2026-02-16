import { nowIso } from "../entities/common.js";
import type { LedgerRepository } from "../repositories/ledger-repository.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";
import type { AuditService } from "./audit-service.js";

export interface ReconciliationSummary {
  merchantAccountId: string;
  date: string;
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  reversedCount: number;
  acceptedAmountCents: number;
  creditedAmountCents: number;
  mismatch: boolean;
  reconciledAt: string;
}

export class ReconciliationService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly auditService: AuditService,
  ) {}

  async reconcile(merchantAccountId: string, date: string, actorAccountId?: string): Promise<ReconciliationSummary> {
    const txs = await this.transactionRepository.listByMerchantAndDate(merchantAccountId, date);
    const ledgers = await this.ledgerRepository.listByMerchantAndDate(merchantAccountId, date);

    let acceptedCount = 0;
    let rejectedCount = 0;
    let duplicateCount = 0;
    let reversedCount = 0;
    let acceptedAmountCents = 0;

    for (const tx of txs) {
      if (tx.status === "accepted") {
        acceptedCount += 1;
        acceptedAmountCents += tx.amountCents;
        tx.status = "reconciled";
        tx.updatedAt = nowIso();
        await this.transactionRepository.save(tx);
      } else if (tx.status === "rejected") {
        rejectedCount += 1;
      } else if (tx.status === "duplicate") {
        duplicateCount += 1;
      } else if (tx.status === "reversed") {
        reversedCount += 1;
      } else if (tx.status === "reconciled") {
        acceptedCount += 1;
        acceptedAmountCents += tx.amountCents;
      }
    }

    const creditedAmountCents = ledgers
      .filter((row) => row.type === "offline_credit")
      .reduce((sum, row) => sum + row.deltaCents, 0);

    const mismatch = acceptedAmountCents !== creditedAmountCents;
    const summary: ReconciliationSummary = {
      merchantAccountId,
      date,
      acceptedCount,
      rejectedCount,
      duplicateCount,
      reversedCount,
      acceptedAmountCents,
      creditedAmountCents,
      mismatch,
      reconciledAt: nowIso(),
    };

    await this.auditService.append(
      "settlement.reconciled",
      merchantAccountId,
      {
        date,
        mismatch: String(mismatch),
        acceptedAmountCents: String(acceptedAmountCents),
        creditedAmountCents: String(creditedAmountCents),
      },
      actorAccountId ? { accountId: actorAccountId } : undefined,
    );

    return summary;
  }
}
