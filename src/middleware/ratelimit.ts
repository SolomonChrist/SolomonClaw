import { Context, NextFunction } from "grammy";
import { rateLimit } from "@grammyjs/ratelimiter";
import { logger } from "../utils/logger.js";

export function rateLimitMiddleware(
  maxMessages: number = 10,
  windowSeconds: number = 60
) {
  return rateLimit({
    in: windowSeconds * 1000,
    maxConcurrentRequests: 1,
  });
}

// Alternative simple implementation using a Map (if @grammyjs/ratelimiter doesn't work as expected)
export function simpleRateLimitMiddleware(
  maxMessages: number = 10,
  windowSeconds: number = 60
) {
  const userRequests: Map<number, number[]> = new Map();

  return async (ctx: Context, next: NextFunction) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return await next();
    }

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    let requests = userRequests.get(userId) || [];
    requests = requests.filter((t) => t > windowStart);

    if (requests.length >= maxMessages) {
      logger.warn(
        { userId, maxMessages, windowSeconds },
        "Rate limit exceeded"
      );
      await ctx.reply(
        `⏱️ Too many messages. Please wait ${windowSeconds}s before sending another message.`
      );
      return;
    }

    requests.push(now);
    userRequests.set(userId, requests);

    return await next();
  };
}
