import type { AuditEvent } from "../../domain/entities/audit.js";
import type { CardTransferSession } from "../../domain/entities/card-transfer.js";
import type { LedgerEntry } from "../../domain/entities/ledger.js";
import type { Account } from "../../domain/entities/account.js";
import type { Device } from "../../domain/entities/device.js";
import type { OfflineTransaction } from "../../domain/entities/transaction.js";
import type { Wallet } from "../../domain/entities/wallet.js";
import type { AccountRepository } from "../../domain/repositories/account-repository.js";
import type { AuditRepository } from "../../domain/repositories/audit-repository.js";
import type { CardTransferRepository } from "../../domain/repositories/card-transfer-repository.js";
import type { DeviceRepository } from "../../domain/repositories/device-repository.js";
import type { LedgerRepository } from "../../domain/repositories/ledger-repository.js";
import type { TransactionRepository } from "../../domain/repositories/transaction-repository.js";
import type { WalletRepository } from "../../domain/repositories/wallet-repository.js";

const isOnDate = (isoTimestamp: string, date: string): boolean => isoTimestamp.startsWith(date);

export class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();
  private readonly byExternalIdentity = new Map<string, string>();

  async create(account: Account): Promise<void> {
    this.byId.set(account.id, account);
    this.byExternalIdentity.set(account.externalIdentity, account.id);
  }

  async getById(accountId: string): Promise<Account | undefined> {
    return this.byId.get(accountId);
  }

  async getByExternalIdentity(externalIdentity: string): Promise<Account | undefined> {
    const accountId = this.byExternalIdentity.get(externalIdentity);
    if (!accountId) {
      return undefined;
    }

    return this.byId.get(accountId);
  }

  async update(account: Account): Promise<void> {
    this.byId.set(account.id, account);
    this.byExternalIdentity.set(account.externalIdentity, account.id);
  }
}

export class InMemoryWalletRepository implements WalletRepository {
  private readonly byAccount = new Map<string, Wallet>();

  async getByAccountId(accountId: string): Promise<Wallet | undefined> {
    return this.byAccount.get(accountId);
  }

  async upsert(wallet: Wallet): Promise<void> {
    this.byAccount.set(wallet.accountId, wallet);
  }
}

export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly byId = new Map<string, Device>();
  private readonly byAccount = new Map<string, Set<string>>();

  async create(device: Device): Promise<void> {
    this.byId.set(device.id, device);
    const existing = this.byAccount.get(device.accountId) ?? new Set<string>();
    existing.add(device.id);
    this.byAccount.set(device.accountId, existing);
  }

  async getById(deviceId: string): Promise<Device | undefined> {
    return this.byId.get(deviceId);
  }

  async listByAccount(accountId: string): Promise<Device[]> {
    const ids = this.byAccount.get(accountId) ?? new Set<string>();
    return [...ids].map((deviceId) => this.byId.get(deviceId)).filter((d): d is Device => !!d);
  }

  async update(device: Device): Promise<void> {
    this.byId.set(device.id, device);
  }
}

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly byTxId = new Map<string, OfflineTransaction>();
  private readonly byIdempotency = new Map<string, string>();

  async getByTxId(txId: string): Promise<OfflineTransaction | undefined> {
    return this.byTxId.get(txId);
  }

  async getByIdempotencyKey(idempotencyKey: string): Promise<OfflineTransaction | undefined> {
    const txId = this.byIdempotency.get(idempotencyKey);
    if (!txId) {
      return undefined;
    }

    return this.byTxId.get(txId);
  }

  async save(transaction: OfflineTransaction): Promise<void> {
    this.byTxId.set(transaction.txId, transaction);
    this.byIdempotency.set(transaction.idempotencyKey, transaction.txId);
  }

  async listByAccount(accountId: string, limit: number): Promise<OfflineTransaction[]> {
    const rows = [...this.byTxId.values()].filter(
      (row) => row.payerAccountId === accountId || row.merchantAccountId === accountId,
    );

    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async listByMerchantAndDate(merchantAccountId: string, date: string): Promise<OfflineTransaction[]> {
    return [...this.byTxId.values()].filter(
      (row) => row.merchantAccountId === merchantAccountId && isOnDate(row.createdAt, date),
    );
  }
}

export class InMemoryLedgerRepository implements LedgerRepository {
  private readonly rows: LedgerEntry[] = [];

  async append(entry: LedgerEntry): Promise<void> {
    this.rows.push(entry);
  }

  async listByAccount(accountId: string, limit: number): Promise<LedgerEntry[]> {
    return this.rows
      .filter((row) => row.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listByMerchantAndDate(merchantAccountId: string, date: string): Promise<LedgerEntry[]> {
    return this.rows.filter(
      (row) => row.accountId === merchantAccountId && isOnDate(row.createdAt, date),
    );
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly rows: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.rows.push(event);
  }

  async listBySubject(subjectId: string, limit: number): Promise<AuditEvent[]> {
    return this.rows
      .filter((row) => row.subjectId === subjectId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  }
}

export class InMemoryCardTransferRepository implements CardTransferRepository {
  private readonly byId = new Map<string, CardTransferSession>();
  private readonly byCode = new Map<string, string>();

  async create(session: CardTransferSession): Promise<void> {
    this.byId.set(session.transferId, session);
    this.byCode.set(session.transferCode, session.transferId);
  }

  async getByTransferId(transferId: string): Promise<CardTransferSession | undefined> {
    return this.byId.get(transferId);
  }

  async getByTransferCode(transferCode: string): Promise<CardTransferSession | undefined> {
    const transferId = this.byCode.get(transferCode);
    if (!transferId) {
      return undefined;
    }

    return this.byId.get(transferId);
  }

  async update(session: CardTransferSession): Promise<void> {
    this.byId.set(session.transferId, session);
    this.byCode.set(session.transferCode, session.transferId);
  }
}
