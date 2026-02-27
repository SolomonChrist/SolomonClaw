export interface ModelSwitchIntent {
  detected: boolean;
  model?: string;
  confidence: number;
}

const modelPatterns: Record<string, RegExp[]> = {
  "anthropic/claude-opus-4-6": [
    /switch to (claude|anthropic)/i,
    /use (claude|anthropic)/i,
    /i want (to use )?(claude|anthropic)/i,
    /go (back )?to (claude|anthropic)/i,
  ],
  "openai/gpt-4o": [
    /switch to (gpt|openai)/i,
    /use (gpt|openai|chatgpt)/i,
    /try (gpt|openai)/i,
    /i want (to use )?(gpt|openai)/i,
  ],
  "groq/llama-3.3-70b-versatile": [
    /switch to groq/i,
    /use groq/i,
    /try groq/i,
    /try llama/i,
  ],
  "ollama/llama3.2": [
    /go back to local/i,
    /switch to local/i,
    /use (ollama|local)/i,
    /i want privacy/i,
    /use private/i,
    /(enable|activate) privacy/i,
  ],
};

const questionPatterns: RegExp[] = [
  /what (model|ai|llm) (are|is) you (using|on)?/i,
  /which (model|ai) (are|is) you/i,
  /what's your (model|ai)?/i,
  /tell me about your (model|ai)/i,
];

export function detectModelSwitch(message: string): ModelSwitchIntent {
  const lowerMessage = message.toLowerCase();

  for (const [model, patterns] of Object.entries(modelPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          detected: true,
          model,
          confidence: 0.9,
        };
      }
    }
  }

  return {
    detected: false,
    confidence: 0,
  };
}

export function isModelQuestion(message: string): boolean {
  return questionPatterns.some((pattern) => pattern.test(message));
}
