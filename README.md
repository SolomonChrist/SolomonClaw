# SecureClaw 🤖

A privacy-first, self-hosted AI assistant reachable via Telegram. Complete local control with optional cloud model support.

## Features

✅ **Privacy-First Architecture**
- Local Ollama models run on your hardware by default
- Zero data sent externally without explicit opt-in
- User API keys only, no server-side storage

✅ **Natural Language Model Switching**
- "switch to Claude" / "use gpt-4o" / "go back to local" — no slash commands needed
- Context-aware intent detection
- Privacy warnings when switching to external models

✅ **Powerful Tools**
- 🌐 Web search (DuckDuckGo, free, no API key)
- 📁 File I/O (restricted to `/workspace` directory)
- 💻 Sandboxed code execution (Docker-isolated)
- 🎙️ Voice transcription (local Whisper.cpp or Groq)

✅ **Flexible Deployment**
- 📱 **Polling mode**: Raspberry Pi, no domain needed
- 🌐 **Webhook mode**: Cloud servers with HTTPS
- 🐳 Docker Compose for easy deployment
- 🔧 systemd unit for bare-metal Linux

✅ **Multi-Provider Support**
- Ollama (local, free)
- Anthropic Claude
- OpenAI GPT-4
- Groq LLaMA
- Mistral
- OpenRouter (200+ models)

---

## Quick Start

### Prerequisites

- Node.js 22+
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Ollama installed (if using local models) — see [ollama.ai](https://ollama.ai)

### Installation

```bash
cd secureclaw

# Run interactive setup
npm run onboard

# Install dependencies
npm install

# Start in development (polling mode)
npm run dev
```

The bot will respond to messages using your local Ollama model (zero external calls).

---

## Configuration

### Environment Variables (`.env`)

```bash
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_WEBHOOK_SECRET=32-char-random-hex-secret
CONFIG_PATH=/data/config.json
USE_POLLING=true              # Set to false for webhook mode
PORT=3000                      # Express server port
LOG_LEVEL=info                 # debug, info, warn, error

# Optional API keys (only used if user adds them + requests external models)
ANTHROPIC_API_KEY=             # Claude
OPENAI_API_KEY=                # GPT-4
GROQ_API_KEY=                  # LLaMA + Whisper
MISTRAL_API_KEY=               # Mistral
OPENROUTER_API_KEY=            # 200+ models
```

### Configuration File (`config.json`)

```json
{
  "bot": {
    "webhookDomain": "https://yourbot.example.com",
    "webhookPath": "/webhook",
    "adminUserIds": [YOUR_TELEGRAM_USER_ID]
  },
  "security": {
    "allowedUserIds": [YOUR_TELEGRAM_USER_ID],
    "allowedGroupIds": [],
    "maxMessageLength": 4000,
    "rateLimitPerUser": {
      "maxMessages": 10,
      "windowSeconds": 60
    }
  },
  "ai": {
    "defaultModel": "ollama/llama3.2",
    "privacyMode": true,
    "externalModelsEnabled": false,
    "maxHistoryMessages": 50,
    "maxContextTokens": 100000,
    "systemPrompt": "You are a helpful AI assistant...",
    "tools": {
      "webSearch": { "enabled": true, "maxResults": 5 },
      "fileSystem": { "enabled": true, "workspace": "/data/workspace" },
      "codeExecution": { "enabled": true, "timeoutSeconds": 30 }
    }
  },
  "voice": {
    "enabled": true,
    "provider": "local",
    "localWhisperModel": "base",
    "groqFallback": false
  },
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434"
    }
  }
}
```

---

## Usage

### Natural Language Commands

Just chat naturally — the bot understands intent:

```
User: "What model are you using?"
Bot: "📊 Current model: ollama/llama3.2 🔒 Private"

User: "switch to Claude"
Bot: "⚠️ Switching to anthropic/claude-opus-4-6. Your messages will be sent to external servers. Privacy mode is being toggled."

User: "go back to local"
Bot: "✅ Switched to model: ollama/llama3.2"

User: "search for today's news"
Bot: [Uses web_search tool with DuckDuckGo]

User: "create a file called test.txt with hello"
Bot: [Creates /data/workspace/test.txt]

User: "run echo hello in bash"
Bot: [Executes in sandboxed Docker container]
```

### Slash Commands

```
/start             Welcome message, shows current model
/help              List all commands + natural language examples
/models            List available models
/clear             Clear conversation history
/history           Show last 5 messages
/status            Bot health: uptime, message count, active users
/privacy           Show privacy mode status
```

---

## Deployment

### Docker (Recommended)

```bash
cd docker

# Copy .env and config.json to docker/data/
cp ../.env ./data/
cp ../config.json ./data/

# Start the service
docker compose up -d

# Check logs
docker compose logs -f

# Stop
docker compose down
```

Access health check: `curl http://localhost:3000/health`

### Systemd (Bare Metal)

```bash
# Copy project to /opt/secureclaw
sudo cp -r . /opt/secureclaw
cd /opt/secureclaw

# Copy systemd unit
sudo cp systemd/secureclaw.service /etc/systemd/system/

# Create user
sudo useradd -r -s /bin/false secureclaw
sudo chown -R secureclaw:secureclaw /opt/secureclaw

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable secureclaw
sudo systemctl start secureclaw

# Check status
sudo systemctl status secureclaw
```

### Webhook Mode (Cloud Deployment)

**Requirements:**
- HTTPS domain (e.g., `https://yourbot.example.com`)
- Reverse proxy (nginx/Caddy) mapping port 443 → 127.0.0.1:3000

**Setup:**

1. Update `.env`:
   ```bash
   USE_POLLING=false
   ```

2. Update `config.json`:
   ```json
   {
     "bot": {
       "webhookDomain": "https://yourbot.example.com",
       "webhookPath": "/webhook"
     }
   }
   ```

3. Start the bot — it automatically sets the webhook with Telegram

---

## Project Structure

```
secureclaw/
├── src/
│   ├── index.ts               # Boot sequence, graceful shutdown
│   ├── bot.ts                 # grammY Bot with middleware
│   ├── server.ts              # Express server (webhook + polling)
│   │
│   ├── config/
│   │   ├── schema.ts          # Zod validation for config
│   │   └── loader.ts          # Load .env + config.json
│   │
│   ├── db/
│   │   ├── schema.ts          # Drizzle ORM tables
│   │   ├── client.ts          # better-sqlite3 + WAL mode
│   │   └── queries.ts         # CRUD operations
│   │
│   ├── providers/
│   │   ├── registry.ts        # Model resolver (vendor/model → LanguageModel)
│   │   ├── fallback.ts        # Fallback chain with error classification
│   │   └── voice.ts           # Whisper transcription
│   │
│   ├── middleware/
│   │   ├── allowlist.ts       # User whitelist
│   │   ├── sanitize.ts        # Clean user input
│   │   ├── ratelimit.ts       # Rate limiting per user
│   │   └── webhook-verify.ts  # Constant-time token check
│   │
│   ├── handlers/
│   │   ├── message.ts         # Text message + intent detection
│   │   ├── voice.ts           # Voice transcription
│   │   ├── commands.ts        # /start /help /models etc.
│   │   └── errors.ts          # Error handling
│   │
│   ├── agent/
│   │   ├── loop.ts            # streamText with tools
│   │   ├── tools.ts           # Tool definitions (web_search, read_file, exec)
│   │   ├── intent.ts          # NL model-switch detection
│   │   ├── context.ts         # History trimming to token budget
│   │   ├── system-prompt.ts   # Static prompt builder
│   │   └── sandbox.ts         # Docker code execution
│   │
│   └── utils/
│       ├── logger.ts          # Pino logger
│       ├── typing.ts          # Telegram typing indicator
│       └── retry.ts           # Sleep + exponential backoff
│
├── docker/
│   ├── Dockerfile             # Multi-stage, non-root
│   └── docker-compose.yml     # Service + health checks
│
├── systemd/
│   └── secureclaw.service     # systemd unit
│
├── scripts/
│   └── onboard.ts             # Interactive setup wizard
│
├── .env.example               # Environment variables
├── config.example.json        # Config template
├── package.json
├── tsconfig.json
└── README.md
```

---

## Architecture Highlights

### Security

- **Allowlist middleware**: Silent drop for non-whitelisted users (first check)
- **Sanitization**: Remove control chars, cap message length
- **Rate limiting**: Sliding window per user (configurable)
- **Webhook verification**: Constant-time token comparison (Telegram secret)
- **File operations**: Canonical path check, restricted to `/workspace/`
- **Code execution**: Isolated Docker container (no network, read-only FS except `/tmp`)
- **No secret interpolation**: User input never goes into system prompt

### Privacy

- **Privacy mode ON by default**: Only Ollama (local) model used
- **External models opt-in**: Require both API key AND user request
- **Privacy warnings**: Show ⚠️ when switching to external models
- **No telemetry**: No calls home, no analytics
- **Persistent storage**: SQLite on your machine (WAL mode for reliability)

### Fallback Chain

Error classification with automatic recovery:
- **Retriable** (503, timeout): 2s delay, try next model
- **Billing** (402 quota): 24h cooldown on that model
- **Fatal** (401 auth, 400 bad request): Skip to next model
- Attempts logged for debugging

### Streaming

- Messages stream to user in real-time
- Edit placeholder as text arrives
- Tool results fed back into loop (max 10 iterations)
- Context trimmed to token budget before each call

---

## Database Schema

```sql
users
  id (PK AI)
  user_id (UNIQUE)
  username
  first_name
  active_model
  created_at
  last_seen_at

messages
  id (PK AI)
  user_id (FK)
  chat_id
  role ('user' | 'assistant')
  content
  model_used
  tokens_used
  created_at
  INDEX: (user_id, chat_id), (created_at)

user_settings
  user_id (PK FK)
  preferred_model
  system_prompt_override
  max_history
  updated_at
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "messageCount": 150,
  "activeUsers": 3,
  "uptime": 3600,
  "timestamp": "2025-02-27T10:00:00Z"
}
```

### Webhook (webhook mode only)

```bash
POST /webhook
Header: X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>
Body: <Telegram update JSON>
```

---

## Troubleshooting

### Bot not responding

1. Check `.env` has `TELEGRAM_BOT_TOKEN`
2. Check `config.json` has your `allowedUserIds`
3. Check logs: `docker compose logs -f` or `journalctl -u secureclaw -f`
4. In polling mode: verify Ollama running on localhost:11434

### Models not available

1. Check API keys in `.env` if using external models
2. List available models: `/models` command
3. Check privacy mode status: `/status`
4. Pull Ollama model: `ollama pull llama3.2`

### High latency

1. Check model is appropriate for your hardware
2. Smaller models faster: `ollama/tinyllama` (tiny) vs `ollama/llama3.2` (7B)
3. Reduce context: lower `maxHistoryMessages` in config

### Database locked

- SQLite WAL mode handles concurrent reads safely
- If lock persists, `rm data/secureclaw.db-shm` and restart

---

## Contributing

To extend SecureClaw:

1. Add new tools: Edit `src/agent/tools.ts`
2. Add new commands: Edit `src/handlers/commands.ts`
3. Add middleware: Create in `src/middleware/` and register in `src/bot.ts`
4. Add providers: Edit `src/providers/registry.ts`

---

## License

MIT

---

## Support

- Issues: [Report on GitHub](https://github.com/yourusername/secureclaw)
- Telegram Help: `/help` command in bot
- Documentation: See `docs/` folder

---

**Made with ❤️ for privacy-conscious AI enthusiasts.**
