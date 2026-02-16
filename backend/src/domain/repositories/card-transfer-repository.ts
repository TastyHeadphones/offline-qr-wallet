import type { CardTransferSession } from "../entities/card-transfer.js";

export interface CardTransferRepository {
  create(session: CardTransferSession): Promise<void>;
  getByTransferId(transferId: string): Promise<CardTransferSession | undefined>;
  getByTransferCode(transferCode: string): Promise<CardTransferSession | undefined>;
  update(session: CardTransferSession): Promise<void>;
}
