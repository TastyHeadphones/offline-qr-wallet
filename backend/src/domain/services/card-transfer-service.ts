import { randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { nowIso } from "../entities/common.js";
import type { Device } from "../entities/device.js";
import type { CardTransferSession } from "../entities/card-transfer.js";
import type { AccountRepository } from "../repositories/account-repository.js";
import type { CardTransferRepository } from "../repositories/card-transfer-repository.js";
import type { DeviceRepository } from "../repositories/device-repository.js";
import type { AuditService } from "./audit-service.js";
import { DomainError } from "./errors.js";

const TRANSFER_TTL_MINUTES = 15;

export interface StartCardTransferInput {
  accountId: string;
  fromDeviceId: string;
  actorAccountId: string;
}

export interface StartCardTransferResult {
  transferId: string;
  transferCode: string;
  accountId: string;
  fromDeviceId: string;
  role: Device["role"];
  expiresAt: string;
}

export interface CompleteCardTransferInput {
  transferCode: string;
  newDevicePublicKey: string;
  keyVersion: number;
  actorAccountId: string;
}

export interface CompleteCardTransferResult {
  transferId: string;
  revokedDeviceId: string;
  newDevice: Device;
}

export class CardTransferService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly transferRepository: CardTransferRepository,
    private readonly auditService: AuditService,
  ) {}

  private async assertActorCanOperate(actorAccountId: string, ownerAccountId: string): Promise<void> {
    const actor = await this.accountRepository.getById(actorAccountId);
    if (!actor || actor.status !== "active") {
      throw new DomainError("ACTOR_NOT_ALLOWED", 403, "Actor account is not active");
    }

    if (actor.id !== ownerAccountId && !actor.roles.includes("admin")) {
      throw new DomainError("ACTOR_NOT_ALLOWED", 403, "Actor is not authorized for card transfer");
    }
  }

  async startTransfer(input: StartCardTransferInput): Promise<StartCardTransferResult> {
    const account = await this.accountRepository.getById(input.accountId);
    if (!account || account.status !== "active") {
      throw new DomainError("ACCOUNT_NOT_FOUND", 404, `Account ${input.accountId} not found or inactive`);
    }

    await this.assertActorCanOperate(input.actorAccountId, input.accountId);

    const sourceDevice = await this.deviceRepository.getById(input.fromDeviceId);
    if (!sourceDevice || sourceDevice.accountId !== input.accountId) {
      throw new DomainError("DEVICE_NOT_FOUND", 404, `Device ${input.fromDeviceId} not found on this account`);
    }

    if (sourceDevice.status !== "active") {
      throw new DomainError("DEVICE_NOT_ACTIVE", 409, "Only active devices can initiate transfer");
    }

    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + TRANSFER_TTL_MINUTES * 60_000).toISOString();
    const transferCode = randomBytes(8).toString("hex");
    const session: CardTransferSession = {
      transferId: uuidv7(),
      transferCode,
      accountId: input.accountId,
      fromDeviceId: sourceDevice.id,
      role: sourceDevice.role,
      status: "pending",
      createdAt,
      expiresAt,
    };

    await this.transferRepository.create(session);
    await this.auditService.append(
      "card_transfer.started",
      session.transferId,
      {
        accountId: session.accountId,
        fromDeviceId: session.fromDeviceId,
        role: session.role,
      },
      { accountId: input.actorAccountId, deviceId: input.fromDeviceId },
    );

    return {
      transferId: session.transferId,
      transferCode: session.transferCode,
      accountId: session.accountId,
      fromDeviceId: session.fromDeviceId,
      role: session.role,
      expiresAt: session.expiresAt,
    };
  }

  async completeTransfer(input: CompleteCardTransferInput): Promise<CompleteCardTransferResult> {
    const session = await this.transferRepository.getByTransferCode(input.transferCode);
    if (!session) {
      throw new DomainError("TRANSFER_NOT_FOUND", 404, "Transfer code is invalid");
    }

    await this.assertActorCanOperate(input.actorAccountId, session.accountId);

    if (session.status !== "pending") {
      throw new DomainError("TRANSFER_NOT_PENDING", 409, `Transfer ${session.transferId} is ${session.status}`);
    }

    const now = nowIso();
    if (new Date(now).getTime() > new Date(session.expiresAt).getTime()) {
      session.status = "expired";
      await this.transferRepository.update(session);
      throw new DomainError("TRANSFER_EXPIRED", 409, "Transfer code expired");
    }

    const sourceDevice = await this.deviceRepository.getById(session.fromDeviceId);
    if (!sourceDevice || sourceDevice.accountId !== session.accountId) {
      throw new DomainError("SOURCE_DEVICE_MISSING", 404, "Source device unavailable for transfer");
    }

    if (sourceDevice.status !== "active") {
      throw new DomainError("SOURCE_DEVICE_INACTIVE", 409, "Source device must remain active until transfer completes");
    }

    sourceDevice.status = "revoked";
    sourceDevice.freezeReason = `card_transferred:${session.transferId}`;
    await this.deviceRepository.update(sourceDevice);

    const newDevice: Device = {
      id: uuidv7(),
      accountId: session.accountId,
      role: session.role,
      publicKey: input.newDevicePublicKey,
      keyVersion: input.keyVersion,
      status: "active",
      registeredAt: now,
      lastSyncAt: now,
    };

    await this.deviceRepository.create(newDevice);

    session.status = "completed";
    session.completedAt = now;
    session.newDeviceId = newDevice.id;
    await this.transferRepository.update(session);

    await this.auditService.append(
      "card_transfer.completed",
      session.transferId,
      {
        accountId: session.accountId,
        fromDeviceId: sourceDevice.id,
        toDeviceId: newDevice.id,
        role: session.role,
      },
      { accountId: input.actorAccountId, deviceId: newDevice.id },
    );

    return {
      transferId: session.transferId,
      revokedDeviceId: sourceDevice.id,
      newDevice,
    };
  }
}
