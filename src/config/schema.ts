import { z } from "zod";

export const RateLimitSchema = z.object({
  maxMessages: z.number().int().positive(),
  windowSeconds: z.number().int().positive(),
});

export const SecuritySchema = z.object({
  allowedUserIds: z.array(z.number().int()),
  allowedGroupIds: z.array(z.number().int()),
  maxMessageLength: z.number().int().positive().default(4000),
  rateLimitPerUser: RateLimitSchema,
});

export const ToolsSchema = z.object({
  webSearch: z.object({
    enabled: z.boolean().default(true),
    maxResults: z.number().int().positive().default(5),
  }),
  fileSystem: z.object({
    enabled: z.boolean().default(true),
    workspace: z.string(),
  }),
  codeExecution: z.object({
    enabled: z.boolean().default(true),
    timeoutSeconds: z.number().int().positive().default(30),
  }),
});

export const AISchema = z.object({
  defaultModel: z.string().default("ollama/llama3.2"),
  privacyMode: z.boolean().default(true),
  externalModelsEnabled: z.boolean().default(false),
  fallbackChain: z.array(z.string()).default(["ollama/llama3.2"]),
  externalModels: z.record(z.string()).optional(),
  maxHistoryMessages: z.number().int().positive().default(50),
  maxContextTokens: z.number().int().positive().default(100000),
  systemPrompt: z.string().default(
    "You are a helpful private AI assistant. Be concise and accurate."
  ),
  tools: ToolsSchema,
});

export const BotSchema = z.object({
  webhookDomain: z.string().url().optional(),
  webhookPath: z.string().default("/webhook"),
  adminUserIds: z.array(z.number().int()),
});

export const VoiceSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(["local", "groq"]).default("local"),
  localWhisperModel: z.enum(["tiny", "base", "small"]).default("base"),
  groqFallback: z.boolean().default(false),
});

export const ProvidersSchema = z.object({
  ollama: z.object({
    baseUrl: z.string().url().default("http://localhost:11434"),
  }),
});

export const DBSchema = z.object({
  path: z.string().default("/data/secureclaw.db"),
});

export const ConfigSchema = z.object({
  bot: BotSchema,
  security: SecuritySchema,
  ai: AISchema,
  voice: VoiceSchema,
  providers: ProvidersSchema,
  db: DBSchema,
});

export type Config = z.infer<typeof ConfigSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
export type Security = z.infer<typeof SecuritySchema>;
export type AI = z.infer<typeof AISchema>;
export type Bot = z.infer<typeof BotSchema>;
export type Voice = z.infer<typeof VoiceSchema>;
export type Providers = z.infer<typeof ProvidersSchema>;
export type DB = z.infer<typeof DBSchema>;
