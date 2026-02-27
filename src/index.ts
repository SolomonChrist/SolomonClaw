import { createBot } from "./bot.js";
import { createServer, setupWebhookMode, setupPollingMode, startServer } from "./server.js";
import { initDB, closeDB } from "./db/client.js";
import { getConfig, validateEnv } from "./config/loader.js";
import { logger } from "./utils/logger.js";
import { handleMessage } from "./handlers/message.js";
import { handleVoiceMessage } from "./handlers/voice.js";
import { registerCommands } from "./handlers/commands.js";
import { setupErrorHandler } from "./handlers/errors.js";

let isShuttingDown = false;

async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Shutting down gracefully...");

  try {
    await closeDB();
    logger.info("Database closed");
  } catch (error) {
    logger.error({ error }, "Error closing database");
  }

  process.exit(0);
}

async function main(): Promise<void> {
  try {
    // Validate environment
    validateEnv();
    logger.info("Environment validated");

    // Load config
    const config = getConfig();
    logger.info("Config loaded successfully");

    // Initialize database
    initDB(config.db.path);

    // Create bot
    const bot = createBot();

    // Register error handler
    setupErrorHandler(bot);

    // Register message and command handlers
    bot.on("message:text", handleMessage);
    bot.on("message:voice", handleVoiceMessage);
    registerCommands(bot);

    // Create server
    const app = createServer(bot);

    // Start in polling or webhook mode
    const usePolling = process.env.USE_POLLING === "true";

    if (usePolling) {
      logger.info("Starting in polling mode");
      await setupPollingMode(bot);
    } else {
      logger.info("Starting in webhook mode");
      await setupWebhookMode(app, bot);
      const port = parseInt(process.env.PORT || "3000", 10);
      await startServer(app, port);
    }

    logger.info("✅ Bot started successfully");
  } catch (error) {
    logger.error({ error }, "Fatal error during startup");
    process.exit(1);
  }
}

// Handle signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  process.exit(1);
});

main().catch((error) => {
  logger.error({ error }, "Failed to start bot");
  process.exit(1);
});
