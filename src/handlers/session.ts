import { Context } from "grammy";
import { exportUserDataToFile } from "../data/export.js";
import { logDataExport } from "../data/access-log.js";
import { clearHistory } from "../db/queries.js";
import { logger } from "../utils/logger.js";

export async function handleSessionEnd(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!userId) {
    return;
  }

  try {
    await ctx.reply("📦 Preparing to export your data and end session...");

    // Export all user data
    const filePath = await exportUserDataToFile(userId);
    logDataExport(userId, filePath);

    // Send the export file
    await ctx.replyWithDocument(
      { source: filePath },
      {
        caption:
          "📦 Your complete session data export\n\n" +
          "This file contains:\n" +
          "✓ All conversations\n" +
          "✓ User settings\n" +
          "✓ Metadata\n\n" +
          "Keep this file safe. It's only available to you.",
        parse_mode: "Markdown",
      }
    );

    // Ask if user wants to clear local data
    await ctx.reply(
      "🗑️ **Clear Local Data?**\n\n" +
        "Your data has been exported. Do you want to clear it from the server?\n\n" +
        "Send 'yes' to delete all local data, or 'no' to keep it.",
      {
        parse_mode: "Markdown",
      }
    );

    logger.info({ userId }, "Session end initiated");
  } catch (error) {
    logger.error({ error, userId }, "Error ending session");
    await ctx.reply("❌ Error exporting data. Please try again.");
  }
}

export async function handleDataClear(ctx: Context, confirm: boolean = false): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!userId || !chatId || !confirm) {
    return;
  }

  try {
    const deletedCount = await clearHistory(userId, chatId);

    await ctx.reply(
      `✅ **Session Cleared**\n\n` +
        `Deleted ${deletedCount} messages from your local history.\n\n` +
        `Your exported data backup is safe in the file we sent.\n` +
        `Thank you for using Solomon Claw! 🤖`,
      { parse_mode: "Markdown" }
    );

    logger.info({ userId, chatId, deletedCount }, "Session data cleared");
  } catch (error) {
    logger.error({ error, userId }, "Error clearing data");
    await ctx.reply(
      "❌ Error clearing data. Your data is safe. Please contact support."
    );
  }
}

/**
 * Detect "end of session" intent in natural language
 */
export function detectSessionEndIntent(message: string): boolean {
  const patterns = [
    /end (of )?session/i,
    /end session/i,
    /export my data/i,
    /download my data/i,
    /give me my data/i,
    /session complete/i,
    /session end/i,
  ];

  return patterns.some((p) => p.test(message));
}

/**
 * Detect clear data confirmation
 */
export function detectClearConfirmation(message: string): boolean {
  const confirmPatterns = [/^yes$/i, /^ok$/i, /^okay$/i, /^confirm$/i];
  return confirmPatterns.some((p) => p.test(message));
}

export function detectClearDenial(message: string): boolean {
  const denyPatterns = [/^no$/i, /^cancel$/i, /^dont$/i, /^don't$/i];
  return denyPatterns.some((p) => p.test(message));
}
