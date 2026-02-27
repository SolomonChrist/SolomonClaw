import { Context } from "grammy";
import { logger } from "../utils/logger.js";
import { transcribeAudio } from "../providers/voice.js";
import { getConfig } from "../config/loader.js";
import { handleMessage } from "./message.js";

export async function handleVoiceMessage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const voiceMessage = ctx.message?.voice;

  if (!userId || !voiceMessage) {
    return;
  }

  try {
    const config = getConfig();

    if (!config.voice.enabled) {
      await ctx.reply("🎙️ Voice messages are disabled");
      return;
    }

    await ctx.reply("🎙️ Transcribing voice message...");

    // TODO: Download voice file from Telegram
    // const voiceFile = await ctx.getFile();
    // const audioBuffer = await downloadFile(voiceFile);

    const provider = config.voice.provider === "groq" ? "groq" : "local";
    // const transcript = await transcribeAudio(audioBuffer, provider);

    // Placeholder
    const transcript = "[Voice transcription coming soon]";

    logger.info(
      { userId, transcriptLength: transcript.length },
      "Voice transcribed"
    );

    // Create a new context with the transcribed text
    const textMessage = {
      ...ctx.message,
      text: transcript,
    };

    // Re-use message handler
    const newCtx = { ...ctx, message: textMessage } as Context;
    await handleMessage(newCtx);
  } catch (error) {
    logger.error({ error, userId }, "Error handling voice message");
    try {
      await ctx.reply("❌ Error transcribing voice. Please try again.");
    } catch {
      // Silently fail
    }
  }
}
