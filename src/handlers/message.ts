import { Context } from "grammy";
import { getOrCreateUser, updateUserLastSeen, getUserModel, setUserModel, getRecentHistory, appendMessage } from "../db/queries.js";
import { getConfig } from "../config/loader.js";
import { detectModelSwitch, isModelQuestion } from "../agent/intent.js";
import { buildSystemPrompt } from "../agent/system-prompt.js";
import { messagesToCoreMessages, trimContextToTokenBudget } from "../agent/context.js";
import { listAvailableModels, resolveModel } from "../providers/registry.js";
import { logger } from "../utils/logger.js";
import { showTyping } from "../utils/typing.js";
import { detectSessionEndIntent, handleSessionEnd } from "./session.js";

export async function handleMessage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text;

  if (!userId || !chatId || !text) {
    return;
  }

  try {
    // Show typing indicator
    await showTyping(ctx);

    // Get or create user
    const user = await getOrCreateUser(
      userId,
      ctx.from?.username,
      ctx.from?.first_name
    );
    await updateUserLastSeen(userId);

    const config = getConfig();

    // Check for model switch intent
    const switchIntent = detectModelSwitch(text);
    if (switchIntent.detected && switchIntent.model) {
      const model = switchIntent.model;
      const [vendor] = model.split("/");

      // Check if external model and privacy mode
      if (vendor !== "ollama" && config.ai.privacyMode && !config.ai.externalModelsEnabled) {
        const apiKey = process.env[vendor.toUpperCase() + "_API_KEY"];
        if (!apiKey) {
          await ctx.reply(
            `❌ No ${vendor} API key configured. Please set ${vendor.toUpperCase()}_API_KEY in .env`
          );
          return;
        }
        // Warn about privacy
        await ctx.reply(
          `⚠️ Switching to ${vendor} model. Your messages will be sent to external servers. Privacy mode is being toggled.\n\nUse "go back to local" to return to privacy mode.`
        );
      }

      await setUserModel(userId, model);
      await ctx.reply(`✅ Switched to model: ${model}`);
      return;
    }

    // Check if user is asking what model is in use
    if (isModelQuestion(text)) {
      const currentModel = await getUserModel(userId) || config.ai.defaultModel;
      const privacyStatus = config.ai.privacyMode ? "🔒 Private" : "🌐 External models enabled";
      await ctx.reply(
        `📊 Current model: \`${currentModel}\`\n${privacyStatus}\n\nYou can say "switch to Claude" or "use GPT-4" to change models.`
      );
      return;
    }

    // Check for session end intent
    if (detectSessionEndIntent(text)) {
      await handleSessionEnd(ctx);
      return;
    }

    // Store user message
    await appendMessage(userId, chatId, "user", text);

    // Get conversation history
    const dbMessages = await getRecentHistory(userId, chatId, config.ai.maxHistoryMessages);
    const history = messagesToCoreMessages(dbMessages);
    const systemPrompt = buildSystemPrompt();

    // Trim context to token budget
    const trimmedHistory = trimContextToTokenBudget(
      history,
      config.ai.maxContextTokens,
      systemPrompt
    );

    // Get user's current model
    const userModel = await getUserModel(userId) || config.ai.defaultModel;

    // Build messages for AI
    const messages = [...trimmedHistory, { role: "user" as const, content: text }];

    // Placeholder response (agent loop will be implemented in task #11)
    const placeholderResponse = `Processing with model ${userModel}...`;

    const sentMsg = await ctx.reply(placeholderResponse, {
      parse_mode: "Markdown",
    });

    // Store assistant message
    await appendMessage(userId, chatId, "assistant", placeholderResponse, userModel);

    logger.info(
      { userId, chatId, model: userModel, messageLength: text.length },
      "Message processed"
    );
  } catch (error) {
    logger.error({ error, userId, chatId }, "Error handling message");
    try {
      await ctx.reply(
        "❌ Error processing message. Please try again or contact support."
      );
    } catch {
      // Silently fail if we can't send error message
    }
  }
}
