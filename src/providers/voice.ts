import axios from "axios";
import { logger } from "../utils/logger.js";

/**
 * Transcribe audio using local whisper.cpp or Groq API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  provider: "local" | "groq" = "local"
): Promise<string> {
  if (provider === "local") {
    return transcribeLocal(audioBuffer);
  } else {
    return transcribeGroq(audioBuffer);
  }
}

async function transcribeLocal(audioBuffer: Buffer): Promise<string> {
  // TODO: Implement whisper.cpp integration
  // For now, return placeholder
  logger.info({ bufferSize: audioBuffer.length }, "Local whisper transcription");
  return "Local voice transcription coming soon";
}

async function transcribeGroq(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  try {
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }));
    formData.append("model", "whisper-large-v3-turbo");

    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    return response.data.text || "";
  } catch (error) {
    logger.error({ error }, "Groq transcription failed");
    throw error;
  }
}
