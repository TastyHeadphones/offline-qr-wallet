import { defaultRiskPolicy } from "./domain/policies/default-risk-policy.js";
import { AccountService } from "./domain/services/account-service.js";
import { AuditService } from "./domain/services/audit-service.js";
import { CardTransferService } from "./domain/services/card-transfer-service.js";
import { DeviceProvisioningService } from "./domain/services/device-provisioning-service.js";
import { HistoryService } from "./domain/services/history-service.js";
import { OfflineTransactionSyncService } from "./domain/services/offline-transaction-sync-service.js";
import { ReconciliationService } from "./domain/services/reconciliation-service.js";
import { RiskPolicyService } from "./domain/services/risk-policy-service.js";
import { WalletService } from "./domain/services/wallet-service.js";
import { BasicSignatureVerifier } from "./infra/crypto/basic-signature-verifier.js";
import {
  InMemoryAccountRepository,
  InMemoryAuditRepository,
  InMemoryCardTransferRepository,
  InMemoryDeviceRepository,
  InMemoryLedgerRepository,
  InMemoryTransactionRepository,
  InMemoryWalletRepository,
} from "./infra/store/in-memory-store.js";

export const buildServices = () => {
  const accountRepository = new InMemoryAccountRepository();
  const walletRepository = new InMemoryWalletRepository();
  const deviceRepository = new InMemoryDeviceRepository();
  const transactionRepository = new InMemoryTransactionRepository();
  const ledgerRepository = new InMemoryLedgerRepository();
  const auditRepository = new InMemoryAuditRepository();
  const cardTransferRepository = new InMemoryCardTransferRepository();

  const auditService = new AuditService(auditRepository);
  const accountService = new AccountService(accountRepository, walletRepository, auditService);
  const deviceProvisioningService = new DeviceProvisioningService(accountRepository, deviceRepository, auditService);
  const riskPolicyService = new RiskPolicyService(defaultRiskPolicy);
  const signatureVerifier = new BasicSignatureVerifier();

  const walletService = new WalletService(walletRepository, ledgerRepository, transactionRepository, auditService);
  const cardTransferService = new CardTransferService(
    accountRepository,
    deviceRepository,
    cardTransferRepository,
    auditService,
  );
  const offlineTransactionSyncService = new OfflineTransactionSyncService(
    accountRepository,
    walletRepository,
    deviceRepository,
    transactionRepository,
    ledgerRepository,
    auditService,
    riskPolicyService,
    signatureVerifier,
  );
  const reconciliationService = new ReconciliationService(transactionRepository, ledgerRepository, auditService);
  const historyService = new HistoryService(transactionRepository, ledgerRepository);

  return {
    accountService,
    deviceProvisioningService,
    walletService,
    cardTransferService,
    offlineTransactionSyncService,
    reconciliationService,
    historyService,
    auditService,
    riskPolicyService,
  };
};

export type AppServices = ReturnType<typeof buildServices>;
