import { Context, NextFunction } from "grammy";
import { logger } from "../utils/logger.js";

export function sanitizeMiddleware(maxMessageLength: number = 4000) {
  return async (ctx: Context, next: NextFunction) => {
    if (ctx.message?.text) {
      let text = ctx.message.text;

      // Remove control characters and zero-width characters
      text = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Control chars
        .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, ""); // Zero-width chars

      // Cap to max length
      if (text.length > maxMessageLength) {
        logger.warn(
          { originalLength: text.length, maxLength: maxMessageLength },
          "Message truncated"
        );
        text = text.substring(0, maxMessageLength);
      }

      ctx.message.text = text;
    }

    return await next();
  };
}
