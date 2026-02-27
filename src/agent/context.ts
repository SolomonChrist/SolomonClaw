import { CoreMessage } from "ai";
import { Message } from "../db/schema.js";
import { logger } from "../utils/logger.js";

// Rough token estimation: 1 token ≈ 4 characters
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function messagesToCoreMessages(messages: Message[]): CoreMessage[] {
  return messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));
}

export function trimContextToTokenBudget(
  messages: CoreMessage[],
  maxTokens: number,
  systemPrompt: string
): CoreMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  const availableTokens = maxTokens - systemTokens;

  let totalTokens = 0;
  const selectedMessages: CoreMessage[] = [];

  // Add messages from the end, moving backwards (most recent first)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens > availableTokens) {
      logger.warn(
        { tokenBudget: maxTokens, usedTokens: totalTokens, droppedFromStart: i + 1 },
        "Context trimmed to fit token budget"
      );
      break;
    }

    selectedMessages.unshift(msg);
    totalTokens += msgTokens;
  }

  return selectedMessages;
}
