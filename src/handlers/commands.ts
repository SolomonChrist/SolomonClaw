import { Context } from "grammy";
import { getConfig } from "../config/loader.js";
import { getUserModel, setUserModel, clearHistory, getLastNMessages } from "../db/queries.js";
import { listAvailableModels } from "../providers/registry.js";
import { getMessageCount, getActiveUserCount } from "../db/queries.js";
import { logger } from "../utils/logger.js";

export function registerCommands(bot: any): void {
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("models", handleModels);
  bot.command("clear", handleClear);
  bot.command("history", handleHistory);
  bot.command("status", handleStatus);
  bot.command("privacy", handlePrivacy);
}

async function handleStart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const config = getConfig();

  try {
    const currentModel = await getUserModel(userId || 0) || config.ai.defaultModel;
    const privacyStatus = config.ai.privacyMode ? "🔒 Privacy mode: ON" : "🌐 External models: Enabled";

    await ctx.reply(
      `👋 Welcome to SecureClaw!\n\n` +
        `🤖 Current AI Model: \`${currentModel}\`\n` +
        `${privacyStatus}\n\n` +
        `💬 Chat naturally - I'll understand commands like:\n` +
        `  • "switch to Claude" or "use gpt-4o"\n` +
        `  • "what model are you using?"\n` +
        `  • "go back to local" or "enable privacy"\n\n` +
        `📚 Commands:\n` +
        `  /help - Show all commands\n` +
        `  /models - List available models\n` +
        `  /clear - Clear conversation history\n` +
        `  /history - Show last 5 messages\n` +
        `  /status - Bot health status\n` +
        `  /privacy - Toggle privacy mode`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    logger.error({ error }, "Error in /start");
    await ctx.reply("❌ Error processing command");
  }
}

async function handleHelp(ctx: Context): Promise<void> {
  try {
    await ctx.reply(
      `📖 SecureClaw Help\n\n` +
        `🤖 **Natural Language Commands** (no slash needed):\n` +
        `  • "switch to Claude" / "use gpt-4o" / "try Groq"\n` +
        `  • "what model are you using?"\n` +
        `  • "go back to local" / "enable privacy"\n` +
        `  • "search for news" / "create a file" / "run python"\n\n` +
        `⚙️ **Slash Commands**:\n` +
        `  /start - Welcome message\n` +
        `  /help - This message\n` +
        `  /models - List available models\n` +
        `  /clear - Clear conversation history\n` +
        `  /history - Show last 5 messages\n` +
        `  /status - Bot health & uptime\n` +
        `  /privacy - Toggle privacy mode\n\n` +
        `🔒 **Privacy**: Local model (Ollama) runs on your machine - no data sent externally by default\n` +
        `🔓 **External Models**: Opt-in with API keys. You'll see a warning when switching.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    logger.error({ error }, "Error in /help");
    await ctx.reply("❌ Error processing command");
  }
}

async function handleModels(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const config = getConfig();

  try {
    const currentModel = await getUserModel(userId || 0) || config.ai.defaultModel;
    const available = listAvailableModels(
      config.ai.privacyMode,
      config.ai.externalModelsEnabled,
      config.ai.externalModels
    );

    const modelsList = available
      .map((m) => (m === currentModel ? `✅ ${m}` : `  ${m}`))
      .join("\n");

    await ctx.reply(
      `📊 **Available Models**:\n\`\`\`\n${modelsList}\n\`\`\`\n\n` +
        `Say "switch to [model name]" to change models.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    logger.error({ error }, "Error in /models");
    await ctx.reply("❌ Error processing command");
  }
}

async function handleClear(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!userId || !chatId) {
    return;
  }

  try {
    const cleared = await clearHistory(userId, chatId);
    await ctx.reply(`🗑️ Cleared ${cleared} messages from history`);
  } catch (error) {
    logger.error({ error }, "Error in /clear");
    await ctx.reply("❌ Error clearing history");
  }
}

async function handleHistory(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!userId || !chatId) {
    return;
  }

  try {
    const messages = await getLastNMessages(userId, chatId, 5);

    if (messages.length === 0) {
      await ctx.reply("📭 No messages in history yet");
      return;
    }

    let historyText = "📜 **Last 5 Messages**:\n\n";
    for (const msg of messages) {
      const prefix = msg.role === "user" ? "👤" : "🤖";
      historyText += `${prefix} ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}...\n\n`;
    }

    await ctx.reply(historyText, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error({ error }, "Error in /history");
    await ctx.reply("❌ Error retrieving history");
  }
}

async function handleStatus(ctx: Context): Promise<void> {
  try {
    const messageCount = await getMessageCount(undefined, 24);
    const activeUsers = await getActiveUserCount(24);
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const config = getConfig();
    const currentModel = await getUserModel(ctx.from?.id || 0) || config.ai.defaultModel;

    await ctx.reply(
      `🔧 **Bot Status**:\n\n` +
        `✅ Status: Online\n` +
        `⏱️ Uptime: ${hours}h ${minutes}m\n` +
        `📊 Messages (24h): ${messageCount}\n` +
        `👥 Active Users (24h): ${activeUsers}\n` +
        `🤖 Default Model: \`${currentModel}\`\n` +
        `🔒 Privacy Mode: ${config.ai.privacyMode ? "Enabled" : "Disabled"}`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    logger.error({ error }, "Error in /status");
    await ctx.reply("❌ Error retrieving status");
  }
}

async function handlePrivacy(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  try {
    const config = getConfig();
    const currentPrivacy = config.ai.privacyMode;

    await ctx.reply(
      `🔒 **Privacy Mode**: ${currentPrivacy ? "ON (Enabled)" : "OFF (Disabled)"}\n\n` +
        `When **ON**: Only local Ollama model is used. No data sent externally.\n` +
        `When **OFF**: External models (Claude, GPT-4, etc.) can be used if configured.\n\n` +
        `Current: \`${currentPrivacy ? "Privacy-First" : "External Models Available"}\``,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    logger.error({ error }, "Error in /privacy");
    await ctx.reply("❌ Error processing command");
  }
}

async function getLastNMessages(
  userId: number,
  chatId: number,
  n: number
): Promise<any[]> {
  // Use the same implementation as in queries.ts
  const { getLastNMessages: getMessages } = await import("../db/queries.js");
  return getMessages(userId, chatId, n);
}
