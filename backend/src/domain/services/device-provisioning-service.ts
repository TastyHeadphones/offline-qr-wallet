import { v7 as uuidv7 } from "uuid";
import { nowIso } from "../entities/common.js";
import type { AccountRole } from "../entities/account.js";
import type { Device } from "../entities/device.js";
import type { AccountRepository } from "../repositories/account-repository.js";
import type { DeviceRepository } from "../repositories/device-repository.js";
import type { AuditService } from "./audit-service.js";
import { DomainError } from "./errors.js";

export interface RegisterDeviceInput {
  accountId: string;
  role: AccountRole;
  publicKey: string;
  keyVersion: number;
}

const MAX_ACTIVE_DEVICES_PER_ROLE = 2;

export class DeviceProvisioningService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly auditService: AuditService,
  ) {}

  async registerDevice(input: RegisterDeviceInput): Promise<Device> {
    const account = await this.accountRepository.getById(input.accountId);
    if (!account) {
      throw new DomainError("ACCOUNT_NOT_FOUND", 404, `Account ${input.accountId} not found`);
    }
    if (account.status !== "active") {
      throw new DomainError("ACCOUNT_FROZEN", 403, `Account ${input.accountId} is not active`);
    }
    if (!account.roles.includes(input.role)) {
      throw new DomainError("ROLE_NOT_ALLOWED", 403, `Account ${input.accountId} lacks role ${input.role}`);
    }

    const devices = await this.deviceRepository.listByAccount(input.accountId);
    const activeByRole = devices.filter((device) => device.role === input.role && device.status === "active");
    if (activeByRole.length >= MAX_ACTIVE_DEVICES_PER_ROLE) {
      throw new DomainError(
        "TOO_MANY_DEVICES",
        409,
        `Account ${input.accountId} already has ${MAX_ACTIVE_DEVICES_PER_ROLE} active ${input.role} devices`,
      );
    }

    const now = nowIso();
    const device: Device = {
      id: uuidv7(),
      accountId: input.accountId,
      role: input.role,
      publicKey: input.publicKey,
      keyVersion: input.keyVersion,
      status: "active",
      registeredAt: now,
      lastSyncAt: now,
    };

    await this.deviceRepository.create(device);
    await this.auditService.append(
      "device.registered",
      device.id,
      {
        accountId: device.accountId,
        role: device.role,
        keyVersion: String(device.keyVersion),
      },
      { accountId: device.accountId },
    );

    return device;
  }

  async markDeviceSynced(deviceId: string, syncedAt: string): Promise<void> {
    const device = await this.deviceRepository.getById(deviceId);
    if (!device) {
      return;
    }

    device.lastSyncAt = syncedAt;
    await this.deviceRepository.update(device);
  }

  async getDevice(deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.getById(deviceId);
    if (!device) {
      throw new DomainError("DEVICE_NOT_FOUND", 404, `Device ${deviceId} not found`);
    }

    return device;
  }

  async freezeDevice(deviceId: string, reason: string, actorAccountId: string): Promise<void> {
    const device = await this.deviceRepository.getById(deviceId);
    if (!device) {
      throw new DomainError("DEVICE_NOT_FOUND", 404, `Device ${deviceId} not found`);
    }

    device.status = "frozen";
    device.freezeReason = reason;
    await this.deviceRepository.update(device);
    await this.auditService.append(
      "device.frozen",
      device.id,
      { reason, accountId: device.accountId },
      { accountId: actorAccountId },
    );
  }

  async revokeDevice(deviceId: string, reason: string, actorAccountId: string): Promise<void> {
    const device = await this.deviceRepository.getById(deviceId);
    if (!device) {
      throw new DomainError("DEVICE_NOT_FOUND", 404, `Device ${deviceId} not found`);
    }

    device.status = "revoked";
    device.freezeReason = reason;
    await this.deviceRepository.update(device);
    await this.auditService.append(
      "device.revoked",
      device.id,
      { reason, accountId: device.accountId },
      { accountId: actorAccountId },
    );
  }
}
