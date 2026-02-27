import { Context } from "grammy";

export async function showTyping(ctx: Context): Promise<void> {
  try {
    await ctx.replyWithChatAction("typing");
  } catch (error) {
    // Silently ignore if chat action fails (some bots/configs don't support it)
  }
}
