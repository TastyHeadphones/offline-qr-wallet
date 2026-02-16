import express from "express";
import pino from "pino";
import { buildServices } from "./bootstrap.js";
import { buildRouter } from "./api/routes.js";

const port = Number(process.env.PORT ?? 8080);
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        elapsedMs: Date.now() - started,
      },
      "request",
    );
  });
  next();
});

const services = buildServices();
app.use(buildRouter(services));

app.listen(port, () => {
  logger.info({ port }, "offline-qr-wallet backend listening");
});
