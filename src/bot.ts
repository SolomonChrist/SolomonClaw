import { Bot, Context } from "grammy";
import { allowlistMiddleware } from "./middleware/allowlist.js";
import { sanitizeMiddleware } from "./middleware/sanitize.js";
import { simpleRateLimitMiddleware } from "./middleware/ratelimit.js";
import { getConfig } from "./config/loader.js";
import { logger } from "./utils/logger.js";

export interface SecureContext extends Context {
  userId: number;
}

export function createBot(): Bot<SecureContext> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
  }

  const config = getConfig();
  const bot = new Bot<SecureContext>(token);

  // Middleware stack (runs in order)

  // 1. Allowlist - silent drop if user not in whitelist
  bot.use(allowlistMiddleware(config.security.allowedUserIds));

  // 2. Rate limit - throttle per user
  bot.use(
    simpleRateLimitMiddleware(
      config.security.rateLimitPerUser.maxMessages,
      config.security.rateLimitPerUser.windowSeconds
    )
  );

  // 3. Sanitize - strip control chars, cap length
  bot.use(sanitizeMiddleware(config.security.maxMessageLength));

  // 4. Context enrichment - add userId
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId) {
      (ctx as SecureContext).userId = userId;
    }
    return await next();
  });

  // Error handler
  bot.catch((err) => {
    logger.error({ error: err }, "Bot error");
  });

  logger.info("Bot created and configured");
  return bot;
}
