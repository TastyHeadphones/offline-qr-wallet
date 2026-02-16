import { v7 as uuidv7 } from "uuid";
import { nowIso } from "../entities/common.js";
import type { LedgerEntry } from "../entities/ledger.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";
import type { WalletRepository } from "../repositories/wallet-repository.js";
import type { LedgerRepository } from "../repositories/ledger-repository.js";
import type { AuditService } from "./audit-service.js";
import { DomainError } from "./errors.js";

export interface TopUpInput {
  accountId: string;
  amountCents: number;
  currency: string;
  reference: string;
  actorAccountId?: string;
}

export interface RefundInput {
  originalTxId: string;
  amountCents: number;
  reason: string;
  actorAccountId: string;
}

export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async topUp(input: TopUpInput): Promise<{ accountId: string; availableCents: number }> {
    if (input.amountCents <= 0) {
      throw new DomainError("INVALID_AMOUNT", 400, "Top-up amount must be positive");
    }

    const wallet = await this.walletRepository.getByAccountId(input.accountId);
    if (!wallet) {
      throw new DomainError("WALLET_NOT_FOUND", 404, `Wallet ${input.accountId} not found`);
    }

    wallet.availableCents += input.amountCents;
    wallet.version += 1;
    wallet.updatedAt = nowIso();
    await this.walletRepository.upsert(wallet);

    const entry: LedgerEntry = {
      entryId: uuidv7(),
      accountId: input.accountId,
      txId: `topup:${uuidv7()}`,
      type: "topup",
      deltaCents: input.amountCents,
      currency: input.currency,
      createdAt: nowIso(),
      metadata: { reference: input.reference },
    };
    await this.ledgerRepository.append(entry);

    await this.auditService.append(
      "wallet.topup",
      input.accountId,
      {
        amountCents: String(input.amountCents),
        reference: input.reference,
      },
      input.actorAccountId ? { accountId: input.actorAccountId } : undefined,
    );

    return {
      accountId: wallet.accountId,
      availableCents: wallet.availableCents,
    };
  }

  async refund(input: RefundInput): Promise<{ txId: string; payerBalance: number; merchantBalance: number }> {
    if (input.amountCents <= 0) {
      throw new DomainError("INVALID_AMOUNT", 400, "Refund amount must be positive");
    }

    const original = await this.transactionRepository.getByTxId(input.originalTxId);
    if (!original) {
      throw new DomainError("TX_NOT_FOUND", 404, `Transaction ${input.originalTxId} not found`);
    }
    if (!["accepted", "reconciled"].includes(original.status)) {
      throw new DomainError("TX_NOT_REFUNDABLE", 409, `Transaction ${input.originalTxId} is not refundable`);
    }
    if (input.amountCents > original.amountCents) {
      throw new DomainError("REFUND_TOO_LARGE", 400, "Refund amount exceeds original amount");
    }

    const payerWallet = await this.walletRepository.getByAccountId(original.payerAccountId);
    const merchantWallet = await this.walletRepository.getByAccountId(original.merchantAccountId);
    if (!payerWallet || !merchantWallet) {
      throw new DomainError("WALLET_NOT_FOUND", 404, "Wallet missing for refund");
    }
    if (merchantWallet.availableCents < input.amountCents) {
      throw new DomainError("MERCHANT_INSUFFICIENT_FUNDS", 409, "Merchant wallet cannot cover refund");
    }

    merchantWallet.availableCents -= input.amountCents;
    payerWallet.availableCents += input.amountCents;
    merchantWallet.version += 1;
    payerWallet.version += 1;
    merchantWallet.updatedAt = nowIso();
    payerWallet.updatedAt = nowIso();

    await this.walletRepository.upsert(merchantWallet);
    await this.walletRepository.upsert(payerWallet);

    const refundTxId = `refund:${uuidv7()}`;
    await this.ledgerRepository.append({
      entryId: uuidv7(),
      accountId: original.merchantAccountId,
      txId: refundTxId,
      type: "refund",
      deltaCents: -input.amountCents,
      currency: original.currency,
      createdAt: nowIso(),
      metadata: { originalTxId: original.txId, reason: input.reason },
    });

    await this.ledgerRepository.append({
      entryId: uuidv7(),
      accountId: original.payerAccountId,
      txId: refundTxId,
      type: "refund",
      deltaCents: input.amountCents,
      currency: original.currency,
      createdAt: nowIso(),
      metadata: { originalTxId: original.txId, reason: input.reason },
    });

    if (input.amountCents === original.amountCents) {
      original.status = "reversed";
      original.updatedAt = nowIso();
      original.failureReason = "refunded";
      await this.transactionRepository.save(original);
    }

    await this.auditService.append(
      "wallet.refund",
      original.txId,
      {
        amountCents: String(input.amountCents),
        reason: input.reason,
      },
      { accountId: input.actorAccountId },
    );

    return {
      txId: original.txId,
      payerBalance: payerWallet.availableCents,
      merchantBalance: merchantWallet.availableCents,
    };
  }

  async getBalance(accountId: string): Promise<{ accountId: string; availableCents: number; updatedAt: string; version: number }> {
    const wallet = await this.walletRepository.getByAccountId(accountId);
    if (!wallet) {
      throw new DomainError("WALLET_NOT_FOUND", 404, `Wallet ${accountId} not found`);
    }

    return {
      accountId,
      availableCents: wallet.availableCents,
      updatedAt: wallet.updatedAt,
      version: wallet.version,
    };
  }
}
