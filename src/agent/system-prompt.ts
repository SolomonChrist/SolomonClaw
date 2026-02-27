import { getConfig } from "../config/loader.js";

export function buildSystemPrompt(userOverride?: string): string {
  const config = getConfig();

  if (userOverride) {
    return userOverride;
  }

  const basePrompt = config.ai.systemPrompt;

  // Add tool descriptions if enabled
  const toolDescriptions: string[] = [];

  if (config.ai.tools.webSearch.enabled) {
    toolDescriptions.push(
      "- 'web_search': Search the internet for current information (free, powered by DuckDuckGo)"
    );
  }

  if (config.ai.tools.fileSystem.enabled) {
    toolDescriptions.push(
      "- 'read_file': Read files from the workspace directory"
    );
    toolDescriptions.push(
      "- 'write_file': Write or create files in the workspace directory"
    );
  }

  if (config.ai.tools.codeExecution.enabled) {
    toolDescriptions.push(
      "- 'exec': Execute code in a sandboxed environment (timeouts after " +
        config.ai.tools.codeExecution.timeoutSeconds +
        "s)"
    );
  }

  if (toolDescriptions.length > 0) {
    return (
      basePrompt +
      "\n\nYou have access to the following tools:\n" +
      toolDescriptions.join("\n")
    );
  }

  return basePrompt;
}
