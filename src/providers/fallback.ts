import { LanguageModel, streamText, StreamTextResult } from "ai";
import { resolveModel } from "./registry.js";
import { logger } from "../utils/logger.js";
import { sleep } from "../utils/retry.js";

export type ErrorClassification = "retriable" | "billing" | "fatal";

export interface AttemptRecord {
  model: string;
  success: boolean;
  error?: string;
  classification?: ErrorClassification;
}

interface CooldownEntry {
  until: number;
  reason: string;
}

const billingCooldowns: Map<string, CooldownEntry> = new Map();

export class FallbackExhaustedError extends Error {
  constructor(
    message: string,
    public attempts: AttemptRecord[]
  ) {
    super(message);
    this.name = "FallbackExhaustedError";
  }
}

function classifyError(error: any): ErrorClassification {
  const errorMsg = error?.message?.toLowerCase() || "";
  const status = error?.status || error?.code;

  // Billing/quota errors
  if (status === 402 || status === 429 || errorMsg.includes("quota")) {
    return "billing";
  }

  // Fatal auth errors
  if (status === 401 || status === 403 || errorMsg.includes("unauthorized")) {
    return "fatal";
  }

  // Retriable errors
  if (
    status === 503 ||
    status === 502 ||
    status === 500 ||
    errorMsg.includes("timeout") ||
    errorMsg.includes("ECONNREFUSED") ||
    errorMsg.includes("ECONNRESET")
  ) {
    return "retriable";
  }

  // Default to fatal for unknown errors
  return "fatal";
}

function isCooledDown(model: string): boolean {
  const cooldown = billingCooldowns.get(model);
  if (!cooldown) return true;
  return Date.now() >= cooldown.until;
}

function setCooldown(model: string, reason: string, hours: number = 24): void {
  const until = Date.now() + hours * 3600 * 1000;
  billingCooldowns.set(model, { until, reason });
  logger.info(
    { model, cooldownHours: hours, reason },
    "Model added to cooldown"
  );
}

export async function streamWithFallback(
  modelStrings: string[],
  prompt: string,
  systemPrompt: string,
  maxRetries: number = 2
): Promise<StreamTextResult<any>> {
  const attempts: AttemptRecord[] = [];

  for (const modelString of modelStrings) {
    // Check if model is on cooldown
    if (!isCooledDown(modelString)) {
      const cooldown = billingCooldowns.get(modelString);
      logger.warn(
        { model: modelString, cooldownReason: cooldown?.reason },
        "Model on cooldown, skipping"
      );
      attempts.push({
        model: modelString,
        success: false,
        error: "On cooldown",
        classification: "billing",
      });
      continue;
    }

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = resolveModel(modelString);

        if (!model) {
          attempts.push({
            model: modelString,
            success: false,
            error: "Model not resolved",
            classification: "fatal",
          });
          break;
        }

        logger.info(
          { model: modelString, attempt },
          "Attempting to stream with model"
        );

        const result = await streamText({
          model,
          system: systemPrompt,
          prompt,
        });

        logger.info({ model: modelString }, "Model succeeded");
        return result;
      } catch (error) {
        lastError = error;
        const classification = classifyError(error);

        logger.warn(
          { model: modelString, attempt, classification, error },
          "Model failed"
        );

        if (classification === "billing") {
          setCooldown(modelString, String(error));
          attempts.push({
            model: modelString,
            success: false,
            error: String(error),
            classification,
          });
          break; // Don't retry billing errors
        }

        if (classification === "fatal") {
          attempts.push({
            model: modelString,
            success: false,
            error: String(error),
            classification,
          });
          break; // Don't retry fatal errors
        }

        // Retriable: wait before next attempt
        if (attempt < maxRetries) {
          await sleep(2000);
        }
      }
    }

    // If we got here for a retriable error after all retries, record it
    if (lastError) {
      const classification = classifyError(lastError);
      if (classification === "retriable" && !attempts.find((a) => a.model === modelString)) {
        attempts.push({
          model: modelString,
          success: false,
          error: String(lastError),
          classification,
        });
      }
    }
  }

  // Fallback chain exhausted
  throw new FallbackExhaustedError(
    "All models in fallback chain failed",
    attempts
  );
}
