import { v7 as uuidv7 } from "uuid";
import { nowIso } from "../entities/common.js";
import type { Account, AccountRole } from "../entities/account.js";
import type { AccountRepository } from "../repositories/account-repository.js";
import type { WalletRepository } from "../repositories/wallet-repository.js";
import type { AuditService } from "./audit-service.js";
import { DomainError } from "./errors.js";

export interface CreateAccountInput {
  externalIdentity: string;
  displayName: string;
  roles: AccountRole[];
}

export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly walletRepository: WalletRepository,
    private readonly auditService: AuditService,
  ) {}

  async createAccount(input: CreateAccountInput): Promise<Account> {
    const existing = await this.accountRepository.getByExternalIdentity(input.externalIdentity);
    if (existing) {
      throw new DomainError("ACCOUNT_EXISTS", 409, `Account for identity ${input.externalIdentity} already exists`);
    }

    const now = nowIso();
    const account: Account = {
      id: uuidv7(),
      externalIdentity: input.externalIdentity,
      displayName: input.displayName,
      roles: [...new Set(input.roles)],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await this.accountRepository.create(account);
    await this.walletRepository.upsert({
      accountId: account.id,
      availableCents: 0,
      updatedAt: now,
      version: 1,
    });

    await this.auditService.append("account.created", account.id, {
      externalIdentity: input.externalIdentity,
      roles: account.roles.join(","),
    });

    return account;
  }

  async getAccount(accountId: string): Promise<Account> {
    const account = await this.accountRepository.getById(accountId);
    if (!account) {
      throw new DomainError("ACCOUNT_NOT_FOUND", 404, `Account ${accountId} not found`);
    }

    return account;
  }
}
