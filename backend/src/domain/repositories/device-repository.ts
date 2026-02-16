import type { Device } from "../entities/device.js";

export interface DeviceRepository {
  create(device: Device): Promise<void>;
  getById(deviceId: string): Promise<Device | undefined>;
  listByAccount(accountId: string): Promise<Device[]>;
  update(device: Device): Promise<void>;
}
