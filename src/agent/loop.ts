import { CoreMessage, generateText, streamText } from "ai";
import { resolveModel } from "../providers/registry.js";
import { streamWithFallback } from "../providers/fallback.js";
import { tools } from "./tools.js";
import { logger } from "../utils/logger.js";
import { getConfig } from "../config/loader.js";

export interface AgentOptions {
  systemPrompt: string;
  messages: CoreMessage[];
  primaryModel: string;
  fallbackModels?: string[];
  maxToolIterations?: number;
}

export async function runAgent(options: AgentOptions): Promise<string> {
  const config = getConfig();
  const maxIterations = options.maxToolIterations || 10;
  const fallbackChain = [
    options.primaryModel,
    ...(options.fallbackModels || config.ai.fallbackChain || ["ollama/llama3.2"]),
  ];

  try {
    logger.info(
      {
        primaryModel: options.primaryModel,
        fallbackChain,
        messageCount: options.messages.length,
      },
      "Running agent"
    );

    // Use the first non-primary model as fallback, then the rest
    const otherModels = fallbackChain.slice(1);

    // Try primary model with fallback chain
    let attempts = 0;
    let lastError: any;

    for (const model of fallbackChain) {
      attempts++;
      try {
        const result = await streamText({
          model: resolveModel(model) as any,
          system: options.systemPrompt,
          messages: options.messages,
          tools: config.ai.tools.webSearch.enabled ||
            config.ai.tools.fileSystem.enabled ||
            config.ai.tools.codeExecution.enabled
            ? tools
            : undefined,
          maxToolRoundtrips: options.maxToolIterations || 10,
        });

        // Collect all streamed text
        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
        }

        logger.info(
          { model, textLength: fullText.length },
          "Agent completed successfully"
        );
        return fullText;
      } catch (error) {
        lastError = error;
        logger.warn(
          { model, attempt: attempts, error },
          "Model attempt failed, trying next"
        );

        if (attempts < fallbackChain.length) {
          // Continue to next model
          continue;
        }
      }
    }

    // All models failed
    throw lastError || new Error("All models in chain failed");
  } catch (error) {
    logger.error({ error }, "Agent loop failed");
    throw error;
  }
}

export async function streamAgent(
  options: AgentOptions,
  onChunk: (chunk: string) => Promise<void>
): Promise<string> {
  const config = getConfig();
  const fallbackChain = [
    options.primaryModel,
    ...(options.fallbackModels || config.ai.fallbackChain || ["ollama/llama3.2"]),
  ];

  try {
    logger.info(
      {
        primaryModel: options.primaryModel,
        fallbackChain,
      },
      "Starting agent stream"
    );

    let lastError: any;

    for (const model of fallbackChain) {
      try {
        const modelObj = resolveModel(model);
        if (!modelObj) {
          logger.warn({ model }, "Could not resolve model");
          continue;
        }

        const result = await streamText({
          model: modelObj as any,
          system: options.systemPrompt,
          messages: options.messages,
          tools: config.ai.tools.webSearch.enabled ||
            config.ai.tools.fileSystem.enabled ||
            config.ai.tools.codeExecution.enabled
            ? tools
            : undefined,
          maxToolRoundtrips: options.maxToolIterations || 10,
        });

        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          await onChunk(chunk);
        }

        logger.info({ model }, "Agent stream completed");
        return fullText;
      } catch (error) {
        lastError = error;
        logger.warn({ model, error }, "Model stream failed, trying next");
      }
    }

    throw lastError || new Error("All models in chain failed");
  } catch (error) {
    logger.error({ error }, "Agent stream loop failed");
    throw error;
  }
}
