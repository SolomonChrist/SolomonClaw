import { Context, NextFunction } from "grammy";
import { logger } from "../utils/logger.js";

export function allowlistMiddleware(allowedUserIds: number[]) {
  return async (ctx: Context, next: NextFunction) => {
    const userId = ctx.from?.id;

    if (!userId) {
      logger.warn("Message without user ID, skipping");
      return;
    }

    if (!allowedUserIds.includes(userId)) {
      logger.warn(
        { userId, allowedCount: allowedUserIds.length },
        "User not in allowlist"
      );
      return; // Silent drop
    }

    return await next();
  };
}
