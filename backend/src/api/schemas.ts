import { z } from "zod";

const roles = z.enum(["payer", "cashier", "admin"]);

export const createAccountSchema = z.object({
  externalIdentity: z.string().min(3),
  displayName: z.string().min(1),
  roles: z.array(roles).min(1),
});

export const registerDeviceSchema = z.object({
  accountId: z.string().uuid(),
  role: roles,
  publicKey: z.string().min(16),
  keyVersion: z.number().int().min(1),
});

export const topUpSchema = z.object({
  accountId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("CNY").or(z.literal("CNY")),
  reference: z.string().min(3),
  actorAccountId: z.string().uuid().optional(),
});

export const refundSchema = z.object({
  originalTxId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(3),
  actorAccountId: z.string().uuid(),
});

const isoDatetime = z.string().datetime({ offset: true });

export const offlineSyncSchema = z.object({
  merchantDeviceId: z.string().uuid(),
  submittedAt: isoDatetime,
  transactions: z.array(
    z.object({
      txId: z.string().uuid(),
      idempotencyKey: z.string().min(8),
      merchantIntentId: z.string().min(8),
      payerAuthorizationId: z.string().min(8),
      merchantAccountId: z.string().uuid(),
      payerAccountId: z.string().uuid(),
      merchantDeviceId: z.string().uuid(),
      payerDeviceId: z.string().uuid(),
      amountCents: z.number().int().positive(),
      currency: z.string().min(3),
      merchantNonce: z.string().min(8),
      payerNonce: z.string().min(8),
      merchantCounter: z.number().int().nonnegative(),
      payerCounter: z.number().int().nonnegative(),
      intentIssuedAt: isoDatetime,
      authorizationIssuedAt: isoDatetime,
      expiresAt: isoDatetime,
      merchantSignature: z.string().min(16),
      payerSignature: z.string().min(16),
    }),
  ),
});

export const reconcileSchema = z.object({
  merchantAccountId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actorAccountId: z.string().uuid().optional(),
});

export const freezeDeviceSchema = z.object({
  reason: z.string().min(3),
  actorAccountId: z.string().uuid(),
});

export const startCardTransferSchema = z.object({
  accountId: z.string().uuid(),
  fromDeviceId: z.string().uuid(),
  actorAccountId: z.string().uuid(),
});

export const completeCardTransferSchema = z.object({
  transferCode: z.string().min(8),
  newDevicePublicKey: z.string().min(16),
  keyVersion: z.number().int().min(1),
  actorAccountId: z.string().uuid(),
});

export const listLimitSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(50),
});
