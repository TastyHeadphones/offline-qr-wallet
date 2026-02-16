import type { Account } from "../entities/account.js";

export interface AccountRepository {
  create(account: Account): Promise<void>;
  getById(accountId: string): Promise<Account | undefined>;
  getByExternalIdentity(externalIdentity: string): Promise<Account | undefined>;
  update(account: Account): Promise<void>;
}
