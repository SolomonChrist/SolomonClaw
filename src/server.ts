import express, { Application, Request, Response } from "express";
import { Bot } from "grammy";
import { webhookCallback } from "grammy";
import { webhookVerifyMiddleware } from "./middleware/webhook-verify.js";
import { getConfig } from "./config/loader.js";
import { logger } from "./utils/logger.js";
import { getMessageCount, getActiveUserCount } from "./db/queries.js";

export function createServer(bot: Bot): Application {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get("/health", async (req: Request, res: Response) => {
    try {
      const messageCount = await getMessageCount(undefined, 24);
      const activeUsers = await getActiveUserCount(24);

      res.json({
        status: "ok",
        messageCount,
        activeUsers,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error }, "Health check failed");
      res.status(500).json({ status: "error" });
    }
  });

  return app;
}

export async function setupWebhookMode(
  app: Application,
  bot: Bot
): Promise<void> {
  const config = getConfig();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is required for webhook mode");
  }

  if (!config.bot.webhookDomain) {
    throw new Error("webhookDomain must be set in config for webhook mode");
  }

  // Add webhook verification middleware
  app.post(
    config.bot.webhookPath,
    webhookVerifyMiddleware(secret),
    webhookCallback(bot, "express")
  );

  // Set webhook on Telegram
  try {
    const webhookUrl = new URL(
      config.bot.webhookPath,
      config.bot.webhookDomain
    ).toString();

    await bot.api.setWebhook(webhookUrl, {
      secret_token: secret,
    });

    logger.info({ webhookUrl }, "Webhook configured");
  } catch (error) {
    logger.error({ error }, "Failed to set webhook");
    throw error;
  }
}

export async function setupPollingMode(bot: Bot): Promise<void> {
  logger.info("Starting bot in polling mode");
  await bot.start();
}

export async function startServer(
  app: Application,
  port: number
): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, "127.0.0.1", () => {
      logger.info({ port }, "Server listening on localhost");
      resolve();
    });
  });
}
