import { describe, expect, it } from "vitest";
import { buildServices } from "../src/bootstrap.js";

describe("offline transaction sync", () => {
  it("accepts a transaction and rejects duplicates", async () => {
    const services = buildServices();

    const payer = await services.accountService.createAccount({
      externalIdentity: "u123",
      displayName: "Payer User",
      roles: ["payer"],
    });
    const merchant = await services.accountService.createAccount({
      externalIdentity: "m456",
      displayName: "Cashier User",
      roles: ["cashier"],
    });

    const payerDevice = await services.deviceProvisioningService.registerDevice({
      accountId: payer.id,
      role: "payer",
      publicKey: "payer-public-key-1234567890",
      keyVersion: 1,
    });
    const merchantDevice = await services.deviceProvisioningService.registerDevice({
      accountId: merchant.id,
      role: "cashier",
      publicKey: "merchant-public-key-1234567890",
      keyVersion: 1,
    });

    await services.walletService.topUp({
      accountId: payer.id,
      amountCents: 1_000,
      currency: "CNY",
      reference: "seed-funds",
    });

    const now = new Date();
    const payload = {
      merchantDeviceId: merchantDevice.id,
      submittedAt: now.toISOString(),
      transactions: [
        {
          txId: "4b724ba0-4564-4a30-a444-c4ff8a40e52b",
          idempotencyKey: "merchant:4b724ba0-4564-4a30-a444-c4ff8a40e52b",
          merchantIntentId: "intent-001-abcdefghijklmn",
          payerAuthorizationId: "auth-001-abcdefghijklmnop",
          merchantAccountId: merchant.id,
          payerAccountId: payer.id,
          merchantDeviceId: merchantDevice.id,
          payerDeviceId: payerDevice.id,
          amountCents: 350,
          currency: "CNY",
          merchantNonce: "merchantnonce0001",
          payerNonce: "payernonce000001",
          merchantCounter: 1,
          payerCounter: 1,
          intentIssuedAt: now.toISOString(),
          authorizationIssuedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 10_000).toISOString(),
          merchantSignature: "merchant-signature-abcdefghijklmnopqrstuvwxyz",
          payerSignature: "payer-signature-abcdefghijklmnopqrstuvwxyz",
        },
      ],
    };

    const first = await services.offlineTransactionSyncService.sync(payload);
    expect(first.results[0].status).toBe("accepted");

    const duplicate = await services.offlineTransactionSyncService.sync(payload);
    expect(duplicate.results[0].status).toBe("duplicate");

    const payerBalance = await services.walletService.getBalance(payer.id);
    const merchantBalance = await services.walletService.getBalance(merchant.id);
    expect(payerBalance.availableCents).toBe(650);
    expect(merchantBalance.availableCents).toBe(350);
  });
});
