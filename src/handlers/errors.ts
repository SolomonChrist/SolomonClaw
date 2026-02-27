import { Context, BotError } from "grammy";
import { logger } from "../utils/logger.js";

export function setupErrorHandler(bot: any): void {
  bot.catch(async (err: BotError) => {
    const ctx = err.ctx;
    const error = err.error;

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
      },
      "Bot error"
    );

    // Try to notify user
    try {
      await ctx.reply(
        "❌ An error occurred. The administrators have been notified."
      );
    } catch {
      // Silently fail if we can't send error message
    }
  });
}
