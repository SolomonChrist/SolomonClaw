import { readFileSync } from "fs";
import { resolve } from "path";
import { config as dotenv } from "dotenv";
import { Config, ConfigSchema } from "./schema.js";
import { logger } from "../utils/logger.js";

dotenv({ path: resolve(process.cwd(), ".env") });

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = process.env.CONFIG_PATH || "config.json";

  try {
    const configFile = readFileSync(resolve(process.cwd(), configPath), "utf-8");
    const rawConfig = JSON.parse(configFile);
    const config = ConfigSchema.parse(rawConfig);
    cachedConfig = config;
    logger.info({ path: configPath }, "Config loaded successfully");
    return config;
  } catch (error) {
    logger.error(
      { error, path: configPath },
      "Failed to load config. Please check config.json"
    );
    throw error;
  }
}

export function getConfig(): Config {
  return loadConfig();
}

export function validateEnv(): void {
  const required = [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_WEBHOOK_SECRET",
    "CONFIG_PATH",
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error(
      { missing },
      "Missing required environment variables. Check .env file."
    );
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  logger.info("Environment validation passed");
}
