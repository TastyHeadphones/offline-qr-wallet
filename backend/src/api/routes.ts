import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import { ZodError } from "zod";
import type { AppServices } from "../bootstrap.js";
import { DomainError } from "../domain/services/errors.js";
import {
  completeCardTransferSchema,
  createAccountSchema,
  freezeDeviceSchema,
  listLimitSchema,
  offlineSyncSchema,
  reconcileSchema,
  refundSchema,
  registerDeviceSchema,
  startCardTransferSchema,
  topUpSchema,
} from "./schemas.js";

const parseBody = <T>(schema: { parse: (input: unknown) => T }, req: Request): T => schema.parse(req.body);
const parseQuery = <T>(schema: { parse: (input: unknown) => T }, req: Request): T => schema.parse(req.query);

export const buildRouter = (services: AppServices): Router => {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  router.post("/v1/accounts", async (req, res, next) => {
    try {
      const body = parseBody(createAccountSchema, req);
      const account = await services.accountService.createAccount(body);
      const balance = await services.walletService.getBalance(account.id);
      res.status(201).json({ account, balance });
    } catch (error) {
      next(error);
    }
  });

  router.get("/v1/accounts/:accountId", async (req, res, next) => {
    try {
      const account = await services.accountService.getAccount(req.params.accountId);
      const balance = await services.walletService.getBalance(account.id);
      res.json({ account, balance });
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/devices/register", async (req, res, next) => {
    try {
      const body = parseBody(registerDeviceSchema, req);
      const device = await services.deviceProvisioningService.registerDevice(body);
      res.status(201).json({ device, riskPolicy: services.riskPolicyService.snapshot });
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/devices/:deviceId/freeze", async (req, res, next) => {
    try {
      const body = parseBody(freezeDeviceSchema, req);
      await services.deviceProvisioningService.freezeDevice(req.params.deviceId, body.reason, body.actorAccountId);
      res.status(202).json({ status: "frozen" });
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/cards/transfer/start", async (req, res, next) => {
    try {
      const body = parseBody(startCardTransferSchema, req);
      const result = await services.cardTransferService.startTransfer(body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/cards/transfer/complete", async (req, res, next) => {
    try {
      const body = parseBody(completeCardTransferSchema, req);
      const result = await services.cardTransferService.completeTransfer(body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/wallet/topup", async (req, res, next) => {
    try {
      const body = parseBody(topUpSchema, req);
      const result = await services.walletService.topUp(body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/wallet/refund", async (req, res, next) => {
    try {
      const body = parseBody(refundSchema, req);
      const result = await services.walletService.refund(body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/v1/wallet/:accountId/balance", async (req, res, next) => {
    try {
      const result = await services.walletService.getBalance(req.params.accountId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/offline-transactions/sync", async (req, res, next) => {
    try {
      const body = parseBody(offlineSyncSchema, req);
      const result = await services.offlineTransactionSyncService.sync(body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/settlements/reconcile", async (req, res, next) => {
    try {
      const body = parseBody(reconcileSchema, req);
      const result = await services.reconciliationService.reconcile(
        body.merchantAccountId,
        body.date,
        body.actorAccountId,
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/v1/history/:accountId", async (req, res, next) => {
    try {
      const query = parseQuery(listLimitSchema, req);
      const history = await services.historyService.getAccountHistory(req.params.accountId, query.limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  router.get("/v1/audit/:subjectId", async (req, res, next) => {
    try {
      const query = parseQuery(listLimitSchema, req);
      const rows = await services.auditService.listBySubject(req.params.subjectId, query.limit);
      res.json({ events: rows });
    } catch (error) {
      next(error);
    }
  });

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof DomainError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: "INVALID_INPUT", details: error.flatten() } });
      return;
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unexpected failure",
      },
    });
  });

  return router;
};
