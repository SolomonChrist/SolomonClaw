import { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import { mistral } from "@ai-sdk/mistral";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ollama } from "ollama";
import { logger } from "../utils/logger.js";

type ModelResolver = (model: string) => LanguageModel | undefined;

const providers: Record<string, ModelResolver> = {
  anthropic: (model: string) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      logger.warn("Anthropic API key not configured");
      return undefined;
    }
    return anthropic(model.split("/")[1] || "claude-opus-4-6");
  },

  openai: (model: string) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      logger.warn("OpenAI API key not configured");
      return undefined;
    }
    return openai(model.split("/")[1] || "gpt-4o");
  },

  groq: (model: string) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      logger.warn("Groq API key not configured");
      return undefined;
    }
    return groq(model.split("/")[1] || "llama-3.3-70b-versatile");
  },

  mistral: (model: string) => {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) {
      logger.warn("Mistral API key not configured");
      return undefined;
    }
    return mistral(model.split("/")[1] || "mistral-large-latest");
  },

  openrouter: (model: string) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      logger.warn("OpenRouter API key not configured");
      return undefined;
    }
    const client = createOpenRouter({ apiKey: key });
    return client(model.split("/")[1] || "google/gemini-2.0-flash-001");
  },

  ollama: (model: string) => {
    const modelName = model.split("/")[1] || "llama3.2";
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    return ollama(modelName, { baseURL: baseUrl });
  },
};

const modelCache: Map<string, LanguageModel | null> = new Map();

export function resolveModel(modelString: string): LanguageModel | undefined {
  if (modelCache.has(modelString)) {
    const cached = modelCache.get(modelString);
    return cached || undefined;
  }

  const [vendor, ...rest] = modelString.split("/");
  const resolver = providers[vendor];

  if (!resolver) {
    logger.warn({ model: modelString }, "Unknown provider, trying OpenRouter");
    const openrouterModel = providers.openrouter?.(modelString);
    if (openrouterModel) {
      modelCache.set(modelString, openrouterModel);
      return openrouterModel;
    }
    modelCache.set(modelString, null);
    return undefined;
  }

  const model = resolver(modelString);
  modelCache.set(modelString, model || null);
  return model;
}

export function listAvailableModels(
  privacyMode: boolean,
  externalModelsEnabled: boolean,
  externalModels?: Record<string, string>
): string[] {
  const models: string[] = ["ollama/llama3.2"];

  if (!privacyMode || externalModelsEnabled) {
    if (externalModels) {
      models.push(...Object.values(externalModels).filter(Boolean));
    } else {
      if (process.env.ANTHROPIC_API_KEY) {
        models.push("anthropic/claude-opus-4-6");
      }
      if (process.env.OPENAI_API_KEY) {
        models.push("openai/gpt-4o");
      }
      if (process.env.GROQ_API_KEY) {
        models.push("groq/llama-3.3-70b-versatile");
      }
      if (process.env.MISTRAL_API_KEY) {
        models.push("mistral/mistral-large-latest");
      }
      if (process.env.OPENROUTER_API_KEY) {
        models.push("openrouter/google/gemini-2.0-flash-001");
      }
    }
  }

  return models;
}
