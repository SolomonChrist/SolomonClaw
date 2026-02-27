import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function webhookVerifyMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["x-telegram-bot-api-secret-token"];

    if (!token || typeof token !== "string") {
      logger.warn("Webhook request missing secret token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!constantTimeCompare(token, secret)) {
      logger.warn("Webhook request with invalid secret token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
  };
}
