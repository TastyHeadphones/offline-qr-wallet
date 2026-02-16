import { createHash } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { nowIso } from "../entities/common.js";
import type { OfflineTransaction, OfflineTransactionResult } from "../entities/transaction.js";
import type { AccountRepository } from "../repositories/account-repository.js";
import type { DeviceRepository } from "../repositories/device-repository.js";
import type { LedgerRepository } from "../repositories/ledger-repository.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";
import type { WalletRepository } from "../repositories/wallet-repository.js";
import type { AuditService } from "./audit-service.js";
import type { RiskPolicyService } from "./risk-policy-service.js";
import type { SignatureVerifier } from "./signature-verifier.js";

export interface OfflineTransactionInput {
  txId: string;
  idempotencyKey: string;
  merchantIntentId: string;
  payerAuthorizationId: string;
  merchantAccountId: string;
  payerAccountId: string;
  merchantDeviceId: string;
  payerDeviceId: string;
  amountCents: number;
  currency: string;
  merchantNonce: string;
  payerNonce: string;
  merchantCounter: number;
  payerCounter: number;
  intentIssuedAt: string;
  authorizationIssuedAt: string;
  expiresAt: string;
  merchantSignature: string;
  payerSignature: string;
}

export interface OfflineSyncInput {
  merchantDeviceId: string;
  submittedAt: string;
  transactions: OfflineTransactionInput[];
}

export interface OfflineSyncResult {
  syncedAt: string;
  riskPolicy: {
    maxPerTransactionCents: number;
    maxPerDayPerPayerCents: number;
    maxUnsyncedPerMerchant: number;
    maxSyncAgeHours: number;
    maxClockSkewSeconds: number;
  };
  results: OfflineTransactionResult[];
}

export class OfflineTransactionSyncService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly walletRepository: WalletRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly auditService: AuditService,
    private readonly riskPolicyService: RiskPolicyService,
    private readonly signatureVerifier: SignatureVerifier,
  ) {}

  private digest(input: OfflineTransactionInput): string {
    return createHash("sha256")
      .update(
        [
          input.txId,
          input.merchantIntentId,
          input.payerAuthorizationId,
          input.amountCents,
          input.currency,
          input.merchantNonce,
          input.payerNonce,
          input.intentIssuedAt,
          input.authorizationIssuedAt,
          input.expiresAt,
        ].join("|"),
      )
      .digest("hex");
  }

  async sync(input: OfflineSyncInput): Promise<OfflineSyncResult> {
    const now = nowIso();
    const merchantDevice = await this.deviceRepository.getById(input.merchantDeviceId);
    if (!merchantDevice || merchantDevice.status !== "active") {
      return {
        syncedAt: now,
        riskPolicy: this.riskPolicyService.snapshot,
        results: input.transactions.map((transaction) => ({
          txId: transaction.txId,
          status: "rejected",
          reason: "merchant_device_inactive",
        })),
      };
    }

    const currentUnsynced = input.transactions.length;
    if (!this.riskPolicyService.withinUnsyncedLimit(currentUnsynced)) {
      return {
        syncedAt: now,
        riskPolicy: this.riskPolicyService.snapshot,
        results: input.transactions.map((transaction) => ({
          txId: transaction.txId,
          status: "rejected",
          reason: "unsynced_limit_exceeded",
        })),
      };
    }

    const results: OfflineTransactionResult[] = [];
    for (const tx of input.transactions) {
      const existingByTx = await this.transactionRepository.getByTxId(tx.txId);
      if (existingByTx) {
        results.push({ txId: tx.txId, status: "duplicate", reason: "tx_id_seen" });
        continue;
      }

      const existingByIdempotency = await this.transactionRepository.getByIdempotencyKey(tx.idempotencyKey);
      if (existingByIdempotency) {
        results.push({ txId: tx.txId, status: "duplicate", reason: "idempotency_key_seen" });
        continue;
      }

      const merchantAccount = await this.accountRepository.getById(tx.merchantAccountId);
      const payerAccount = await this.accountRepository.getById(tx.payerAccountId);
      const payerDevice = await this.deviceRepository.getById(tx.payerDeviceId);
      if (!merchantAccount || !payerAccount || !payerDevice) {
        results.push({ txId: tx.txId, status: "rejected", reason: "unknown_identity" });
        continue;
      }

      if (merchantAccount.status !== "active" || payerAccount.status !== "active") {
        results.push({ txId: tx.txId, status: "rejected", reason: "account_frozen" });
        continue;
      }
      if (payerDevice.status !== "active") {
        results.push({ txId: tx.txId, status: "rejected", reason: "payer_device_inactive" });
        continue;
      }
      if (tx.merchantDeviceId !== merchantDevice.id || tx.merchantAccountId !== merchantDevice.accountId) {
        results.push({ txId: tx.txId, status: "rejected", reason: "merchant_device_mismatch" });
        continue;
      }

      if (!this.riskPolicyService.isWithinTransactionLimit(tx.amountCents)) {
        results.push({ txId: tx.txId, status: "rejected", reason: "tx_amount_out_of_policy" });
        continue;
      }
      if (!this.riskPolicyService.hasFreshSync(merchantDevice, now)) {
        results.push({ txId: tx.txId, status: "rejected", reason: "merchant_sync_stale" });
        continue;
      }
      if (!this.riskPolicyService.isClockSkewAcceptable(tx.authorizationIssuedAt, input.submittedAt)) {
        results.push({ txId: tx.txId, status: "rejected", reason: "clock_skew_exceeded" });
        continue;
      }
      if (new Date(tx.expiresAt).getTime() < new Date(input.submittedAt).getTime()) {
        results.push({ txId: tx.txId, status: "rejected", reason: "intent_expired" });
        continue;
      }

      const digest = this.digest(tx);
      const merchantSignatureOk = await this.signatureVerifier.verify({
        publicKey: merchantDevice.publicKey,
        signature: tx.merchantSignature,
        messageDigest: digest,
      });
      const payerSignatureOk = await this.signatureVerifier.verify({
        publicKey: payerDevice.publicKey,
        signature: tx.payerSignature,
        messageDigest: digest,
      });
      if (!merchantSignatureOk || !payerSignatureOk) {
        results.push({ txId: tx.txId, status: "rejected", reason: "signature_invalid" });
        continue;
      }

      const payerToday = await this.transactionRepository.listByAccount(tx.payerAccountId, 10_000);
      const thisDate = tx.authorizationIssuedAt.slice(0, 10);
      const spentTodayCents = payerToday
        .filter(
          (row) =>
            row.payerAccountId === tx.payerAccountId &&
            row.status !== "rejected" &&
            row.authorizationIssuedAt.startsWith(thisDate),
        )
        .reduce((sum, row) => sum + row.amountCents, 0);

      if (!this.riskPolicyService.withinDailyLimit(spentTodayCents, tx.amountCents)) {
        results.push({ txId: tx.txId, status: "rejected", reason: "daily_limit_exceeded" });
        continue;
      }

      const payerWallet = await this.walletRepository.getByAccountId(tx.payerAccountId);
      const merchantWallet = await this.walletRepository.getByAccountId(tx.merchantAccountId);
      if (!payerWallet || !merchantWallet) {
        results.push({ txId: tx.txId, status: "rejected", reason: "wallet_missing" });
        continue;
      }

      if (payerWallet.availableCents < tx.amountCents) {
        const rejectedRecord = this.toRecord(tx, input.submittedAt, "rejected", "insufficient_funds");
        await this.transactionRepository.save(rejectedRecord);
        await this.auditService.append(
          "offline_tx.rejected",
          tx.txId,
          {
            reason: "insufficient_funds",
            payerAccountId: tx.payerAccountId,
            merchantAccountId: tx.merchantAccountId,
          },
          { accountId: tx.merchantAccountId, deviceId: tx.merchantDeviceId },
        );

        results.push({ txId: tx.txId, status: "rejected", reason: "insufficient_funds" });
        continue;
      }

      payerWallet.availableCents -= tx.amountCents;
      merchantWallet.availableCents += tx.amountCents;
      payerWallet.version += 1;
      merchantWallet.version += 1;
      payerWallet.updatedAt = now;
      merchantWallet.updatedAt = now;

      await this.walletRepository.upsert(payerWallet);
      await this.walletRepository.upsert(merchantWallet);

      await this.ledgerRepository.append({
        entryId: uuidv7(),
        accountId: tx.payerAccountId,
        txId: tx.txId,
        type: "offline_debit",
        deltaCents: -tx.amountCents,
        currency: tx.currency,
        createdAt: now,
      });
      await this.ledgerRepository.append({
        entryId: uuidv7(),
        accountId: tx.merchantAccountId,
        txId: tx.txId,
        type: "offline_credit",
        deltaCents: tx.amountCents,
        currency: tx.currency,
        createdAt: now,
      });

      const acceptedRecord = this.toRecord(tx, input.submittedAt, "accepted");
      await this.transactionRepository.save(acceptedRecord);
      await this.auditService.append(
        "offline_tx.accepted",
        tx.txId,
        {
          amountCents: String(tx.amountCents),
          payerAccountId: tx.payerAccountId,
          merchantAccountId: tx.merchantAccountId,
        },
        { accountId: tx.merchantAccountId, deviceId: tx.merchantDeviceId },
      );

      results.push({
        txId: tx.txId,
        status: "accepted",
        walletAfter: {
          payerAvailableCents: payerWallet.availableCents,
          merchantAvailableCents: merchantWallet.availableCents,
        },
      });
    }

    merchantDevice.lastSyncAt = input.submittedAt;
    await this.deviceRepository.update(merchantDevice);

    return {
      syncedAt: now,
      riskPolicy: this.riskPolicyService.snapshot,
      results,
    };
  }

  private toRecord(
    input: OfflineTransactionInput,
    merchantClientSubmittedAt: string,
    status: OfflineTransaction["status"],
    failureReason?: string,
  ): OfflineTransaction {
    const now = nowIso();
    return {
      ...input,
      status,
      failureReason,
      merchantClientSubmittedAt,
      createdAt: now,
      updatedAt: now,
    };
  }
}
