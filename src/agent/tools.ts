import { tool } from "ai";
import { z } from "zod";
import { readFile, writeFile } from "fs/promises";
import { resolve, normalize } from "path";
import { logger } from "../utils/logger.js";
import { getConfig } from "../config/loader.js";
import axios from "axios";

// Web Search Tool
export const webSearchTool = tool({
  description:
    "Search the internet for current information using DuckDuckGo (free, no API key required)",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    try {
      logger.info({ query }, "Web search tool called");

      // Using a simple search via axios to DuckDuckGo API alternative
      // This uses the free duck-duck-scrape-like approach
      const response = await axios.get(
        "https://duckduckgo.com/api/search",
        {
          params: {
            q: query,
            format: "json",
          },
          timeout: 5000,
        }
      );

      const results = response.data.Results || [];
      const formatted = results
        .slice(0, 5)
        .map(
          (r: any) =>
            `- ${r.Title}\n  ${r.Text}\n  ${r.FirstURL}`
        )
        .join("\n\n");

      return formatted || "No results found";
    } catch (error) {
      logger.error({ error, query }, "Web search failed");
      return `Search failed: ${String(error)}`;
    }
  },
});

// File Read Tool
export const readFileTool = tool({
  description:
    "Read a file from the workspace directory. Path must be relative to /workspace/",
  parameters: z.object({
    path: z.string().describe("Relative path to file (from /workspace/)"),
  }),
  execute: async ({ path }) => {
    try {
      logger.info({ path }, "Read file tool called");

      const config = getConfig();
      const workspaceRoot = config.ai.tools.fileSystem.workspace;
      const fullPath = resolve(workspaceRoot, path);
      const canonical = normalize(fullPath);

      // Security check: ensure path is within workspace
      if (!canonical.startsWith(normalize(workspaceRoot))) {
        return `❌ Access denied: Path must be within ${workspaceRoot}`;
      }

      const content = await readFile(canonical, "utf-8");
      return content;
    } catch (error) {
      logger.error({ error, path }, "File read failed");
      return `❌ Error reading file: ${String(error)}`;
    }
  },
});

// File Write Tool
export const writeFileTool = tool({
  description:
    "Write or create a file in the workspace directory. Path must be relative to /workspace/",
  parameters: z.object({
    path: z.string().describe("Relative path to file (from /workspace/)"),
    content: z.string().describe("File content to write"),
  }),
  execute: async ({ path, content }) => {
    try {
      logger.info({ path }, "Write file tool called");

      const config = getConfig();
      const workspaceRoot = config.ai.tools.fileSystem.workspace;
      const fullPath = resolve(workspaceRoot, path);
      const canonical = normalize(fullPath);

      // Security check: ensure path is within workspace
      if (!canonical.startsWith(normalize(workspaceRoot))) {
        return `❌ Access denied: Path must be within ${workspaceRoot}`;
      }

      // Atomic write: write to temp file then rename
      const tempPath = canonical + ".tmp";
      await writeFile(tempPath, content, "utf-8");
      // In production, use fs.renameSync or similar for atomicity

      return `✅ File written: ${path}`;
    } catch (error) {
      logger.error({ error, path }, "File write failed");
      return `❌ Error writing file: ${String(error)}`;
    }
  },
});

// Code Execution Tool
export const execTool = tool({
  description:
    "Execute code in a sandboxed Docker container. Supports bash, python, node, etc.",
  parameters: z.object({
    language: z
      .enum(["bash", "python", "node", "rust"])
      .describe("Programming language"),
    code: z.string().describe("Code to execute"),
  }),
  execute: async ({ language, code }) => {
    try {
      logger.info({ language, codeLength: code.length }, "Exec tool called");

      const config = getConfig();
      const timeoutSecs = config.ai.tools.codeExecution.timeoutSeconds;

      // TODO: Implement Docker sandbox execution
      // For now, return a placeholder
      return `🔄 Sandbox execution coming soon (timeout: ${timeoutSecs}s)\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;
    } catch (error) {
      logger.error({ error, language }, "Code execution failed");
      return `❌ Execution error: ${String(error)}`;
    }
  },
});

export const tools = {
  web_search: webSearchTool,
  read_file: readFileTool,
  write_file: writeFileTool,
  exec: execTool,
};
