import { describe, expect, it } from "vitest";
import { buildServices } from "../src/bootstrap.js";

describe("card transfer", () => {
  it("moves card authority to a new device and revokes old device", async () => {
    const services = buildServices();

    const account = await services.accountService.createAccount({
      externalIdentity: "u-transfer-01",
      displayName: "Transfer User",
      roles: ["payer"],
    });

    const oldDevice = await services.deviceProvisioningService.registerDevice({
      accountId: account.id,
      role: "payer",
      publicKey: "old-device-public-key-abcdefghijk",
      keyVersion: 1,
    });

    const started = await services.cardTransferService.startTransfer({
      accountId: account.id,
      fromDeviceId: oldDevice.id,
      actorAccountId: account.id,
    });

    const completed = await services.cardTransferService.completeTransfer({
      transferCode: started.transferCode,
      newDevicePublicKey: "new-device-public-key-lmnopqrstuv",
      keyVersion: 1,
      actorAccountId: account.id,
    });

    expect(completed.revokedDeviceId).toBe(oldDevice.id);
    expect(completed.newDevice.accountId).toBe(account.id);
    expect(completed.newDevice.status).toBe("active");

    const oldDeviceAfter = await services.deviceProvisioningService.getDevice(oldDevice.id);
    expect(oldDeviceAfter.status).toBe("revoked");
  });
});
