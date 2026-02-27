# Solomon Claw: Getting Started Guide

Welcome to **Solomon Claw** — your privacy-first, self-hosted AI assistant. This guide walks you through everything you need to know.

---

## What is Solomon Claw?

Solomon Claw is a Telegram bot that:

✅ **Puts YOU in control** — Your data belongs to you, encrypted and isolated
✅ **Runs locally by default** — Uses Ollama (free LLM) on your hardware
✅ **Stays private** — Zero external calls unless you explicitly opt-in
✅ **Exports on demand** — "End of session" → get complete JSON backup
✅ **Supports multiple AI models** — Claude, GPT-4, Groq, Mistral, and more
✅ **Provides powerful tools** — Web search, file I/O, sandboxed code execution

**Key difference from other systems:** You export your data, own it completely, and nobody else can access it.

---

## Quick Start (10 minutes)

### Step 1: Prerequisites

**Required:**
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
  ```bash
  # Message @BotFather on Telegram:
  /newbot
  # Follow prompts, get token
  ```

- Ollama installed on your machine
  ```bash
  # macOS:
  brew install ollama
  ollama serve &  # Run in background

  # Linux:
  curl https://ollama.ai/install.sh | sh
  systemctl start ollama

  # Windows:
  # Download from https://ollama.ai
  ```

- Node.js 22+ (for development only)

### Step 2: Clone & Install

```bash
git clone https://github.com/yourusername/solomon-claw.git
cd solomon-claw

npm install
```

### Step 3: Run Setup Wizard

```bash
npm run onboard
```

You'll be asked:
1. Telegram Bot Token (from @BotFather)
2. Your Telegram User ID (get it from [@userinfobot](https://t.me/userinfobot))

The wizard will:
- Create `.env` with your secrets
- Create `config.json` with your ID in allowlist
- Generate webhook secret (if needed)

### Step 4: Start the Bot

**Option A: Development (No domain needed)**
```bash
npm run dev
```

**Option B: Docker**
```bash
cd docker
docker compose up -d
```

### Step 5: Test It

1. Open Telegram
2. Find your bot (search for it by name)
3. Send: `hello`
4. Bot responds with Ollama (local model)

**Try these:**
```
User: "What model are you using?"
Bot: "📊 Current model: ollama/llama3.2 🔒 Private"

User: "search for AI news"
Bot: [Returns DuckDuckGo results]

User: "create a file called test.txt with hello"
Bot: [Creates file in /data/workspace/]

User: "end of session"
Bot: [Exports complete JSON backup of all conversations]
```

---

## Core Concepts

### Privacy Mode (Default: ON)

When **privacy mode is ON:**
- ✅ Only local Ollama model used
- ✅ NO external API calls
- ✅ NO data leaves your machine
- ✅ Status: 🔒 **PROTECTED**

### Privacy Mode (User Switches)

User says: **"switch to Claude"**

Bot checks:
1. Is `ANTHROPIC_API_KEY` in `.env`?
   - **No:** "No Anthropic key configured"
   - **Yes:** Continue...

2. Shows warning: **⚠️ "Your messages will be sent to Anthropic"**

3. User confirms

4. Messages now sent to Claude API

5. Privacy status: 🌐 **EXTERNAL (user consented)**

User can switch back: **"go back to local"** → back to Ollama

### Data Export

User says: **"end of session"**

Bot:
1. Exports complete JSON file with:
   - All conversations
   - Timestamps
   - Models used
   - Statistics
   - Settings

2. Sends file to user (Telegram)

3. Asks: "Clear local data?"
   - **Yes** → Deletes from database (user has backup)
   - **No** → Keeps on server (user can continue chatting)

---

## File Organization

**After setup, you'll have:**

```
solomon-claw/
├── .env                    # Your secrets (NEVER commit!)
├── config.json             # Your settings (can commit, edit carefully)
│
├── src/                    # Application code (ready to run)
├── data/
│   ├── solomon-claw.db       # SQLite database (your conversations)
│   ├── workspace/          # File I/O sandbox
│   ├── exports/            # Session exports go here
│   └── access-logs/        # Security audit trail
│
├── docker/                 # Docker deployment
├── systemd/                # Linux systemd unit
├── docs/                   # Full documentation
└── README.md               # Quick reference
```

---

## Configuration

### `.env` (Secrets - Keep Private!)

Create `.env` in project root (or run `npm run onboard`):

```bash
# Required
TELEGRAM_BOT_TOKEN=<your-token-from-@BotFather>
TELEGRAM_WEBHOOK_SECRET=<32-char-random-hex>

# Optional (for external models)
ANTHROPIC_API_KEY=<if-you-want-Claude>
OPENAI_API_KEY=<if-you-want-GPT-4>
GROQ_API_KEY=<if-you-want-Groq>

# Optional (encryption at rest)
MASTER_KEY=<32-char-random-key>

# Application
NODE_ENV=production
USE_POLLING=true          # Set false for webhook mode
PORT=3000
LOG_LEVEL=info
```

### `config.json` (Settings)

Edit after setup:

```json
{
  "security": {
    "allowedUserIds": [YOUR_TELEGRAM_ID],
    "maxMessageLength": 4000
  },
  "ai": {
    "defaultModel": "ollama/llama3.2",
    "privacyMode": true,
    "externalModelsEnabled": false
  }
}
```

---

## Commands (Slash Commands)

Send any of these in Telegram to your bot:

| Command | What It Does |
|---------|-------------|
| `/start` | Welcome message, shows current model |
| `/help` | All commands + natural language examples |
| `/models` | List available AI models |
| `/clear` | Delete conversation history |
| `/history` | Show last 5 messages |
| `/status` | Bot health: uptime, message count |
| `/privacy` | Show privacy mode status |

---

## Natural Language (No Slash Needed)

Just chat naturally — bot understands:

### Model Switching
```
"switch to Claude"          → Switches to Claude (if key set)
"use GPT-4"                 → Switches to GPT-4 (if key set)
"try Groq"                  → Switches to Groq (if key set)
"go back to local"          → Back to Ollama (private)
```

### Status Queries
```
"what model are you using?"
"which AI are you?"
"what's your current model?"
```

### Tools
```
"search for latest AI news"         → Uses web_search tool
"create a file called notes.txt"    → Uses file_write tool
"run python to count to 10"         → Uses exec tool (sandboxed)
```

### Session Management
```
"end of session"            → Export all your data
"export my data"            → Export all your data
"give me my data"           → Export all your data
```

---

## Tools Available

### 1. Web Search (Free - No API Key)
```
User: "latest news about AI"
Bot: [Searches DuckDuckGo, returns results]
```
- Uses: DuckDuckGo (completely free, no API key needed)
- Privacy: Results not stored, just shown to user

### 2. File I/O (Restricted to /workspace/)
```
User: "create a file called myfile.txt with Hello World"
Bot: [Creates /data/workspace/myfile.txt]

User: "read the file myfile.txt"
Bot: [Returns file contents]
```
- Safety: Can only read/write in `/data/workspace/`
- Prevents: Directory traversal, access outside workspace

### 3. Code Execution (Sandboxed Docker)
```
User: "write a Python script that counts 1 to 10"
Bot: [Executes in isolated Docker container]
Bot: [Returns output]
```
- Isolation: No network access, read-only filesystem, memory limit
- Timeout: 30 seconds (configurable)

### 4. Voice Input (Optional)
- Default: Local Whisper (free, no API key)
- Fallback: Groq Whisper (if `GROQ_API_KEY` set)
- Send voice message → bot transcribes → processes as text

---

## Deployment Options

### For Development (Polling - No Domain Needed)
```bash
npm run dev
```
- Best for: Testing, learning, personal use
- Polling: Bot asks Telegram "any new messages?" every second
- Works from: Laptop, Raspberry Pi, anywhere

### For Production (Docker)
```bash
cd docker
docker compose up -d
```
- Best for: Always-on server
- Polling or Webhook: Both supported
- Easy restart, health checks built-in

### For Cloud (Webhook - Domain Required)
```bash
# Set in .env
USE_POLLING=false

# Set in config.json
"webhookDomain": "https://yourbot.example.com"

# Use nginx/Caddy reverse proxy for HTTPS
npm run dev  # or docker compose up -d
```
- Best for: Dedicated servers, DigitalOcean, AWS
- Webhook: Telegram sends updates directly (faster)
- Requires: HTTPS certificate, domain name

### For Linux Server (systemd)
```bash
sudo cp -r . /opt/solomon-claw
sudo cp systemd/solomon-claw.service /etc/systemd/system/
sudo systemctl enable --now solomon-claw
```
- Best for: Always-on Linux servers
- Service: Runs as system service, auto-restart
- Logs: `journalctl -u solomon-claw -f`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on each method.

---

## Data Privacy & Security

### What's Protected?

✅ **Conversations** → Stored in encrypted SQLite
✅ **User ID** → Used for access control only
✅ **API Keys** → Never logged, kept in `.env` only
✅ **File I/O** → Restricted to `/data/workspace/`
✅ **Code Execution** → Isolated Docker container
✅ **Access Logs** → Only metadata logged, never message content

### What About External Models?

When you use Claude/GPT-4/etc.:
- ✅ Messages ARE sent to their servers (you consent)
- ✅ They have their own privacy policies
- ✅ Bot shows ⚠️ warning first
- ✅ You can always switch back to local

### How to Stay Private

1. Keep `privacyMode: true` in `config.json` (default)
2. Don't set external API keys (can't use them)
3. Use local Ollama only
4. Result: **Zero external data transmission**

### Your Data Export

Command: **"end of session"**

Bot exports:
```json
{
  "exportedAt": "2025-02-27T10:30:00Z",
  "conversations": [
    { "messages": [...] }
  ],
  "statistics": { ... }
}
```

You get: **Complete backup of all your data**
Bot gets: **Option to delete local copy**

See [docs/DATA_PRIVACY.md](docs/DATA_PRIVACY.md) for complete security architecture.

---

## Troubleshooting

### Bot Not Responding

**Check 1: Is Ollama running?**
```bash
curl http://localhost:11434/api/tags
# Should return list of models
```

**Check 2: Is bot token correct?**
```bash
echo $TELEGRAM_BOT_TOKEN
# Should show your token (not blank)
```

**Check 3: Are you whitelisted?**
```bash
cat config.json | grep allowedUserIds
# Your Telegram ID should be in list
```

**Check 4: View logs**
```bash
npm run dev  # Shows logs in console
```

### Model Not Available

**Pull model from Ollama:**
```bash
ollama pull llama3.2
```

**Or use different model:**
```json
{
  "ai": {
    "defaultModel": "ollama/tinyllama"
  }
}
```

### High Latency/Slow Responses

**Try smaller model:**
- `ollama/tinyllama` (1.1B - fastest)
- `ollama/mistral` (7B - balanced)
- `ollama/llama3.2` (7B - default)

**Or reduce context:**
```json
{
  "ai": {
    "maxContextTokens": 50000,
    "maxHistoryMessages": 25
  }
}
```

### Memory Issues

Check usage:
```bash
docker stats               # Docker
top -p $(pgrep node)      # Local

# Reduce if high:
ollama pull tinyllama     # Smaller model
```

---

## Next Steps

1. **Read the docs:**
   - [README.md](README.md) — Feature overview
   - [docs/DATA_PRIVACY.md](docs/DATA_PRIVACY.md) — Security details
   - [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md) — Technical deep dive
   - [DEPLOYMENT.md](DEPLOYMENT.md) — How to deploy

2. **Customize:**
   - Add API keys to `.env` for external models (optional)
   - Adjust `config.json` settings
   - Create workspace files for bot to work with

3. **Deploy:**
   - Development: `npm run dev` (polling)
   - Production: Docker or systemd
   - Cloud: Webhook mode with reverse proxy

4. **Backup:**
   - Send "end of session" regularly
   - Keep exported JSON files safe
   - They're your data!

5. **Monitor:**
   - Check `/status` periodically
   - Review access logs
   - Update dependencies

---

## Support & Resources

### In Telegram
- `/help` — Full command list
- `/status` — System health
- "what model are you using?" — Current status

### In Documentation
- `README.md` — Quick reference
- `docs/DATA_PRIVACY.md` — Security & privacy
- `DEPLOYMENT.md` — Deployment guide
- `docs/IMPLEMENTATION_SUMMARY.md` — Architecture details

### In Code
- `src/handlers/commands.ts` — All commands
- `src/handlers/message.ts` — Message processing
- `src/data/export.ts` — Data export logic
- Inline comments throughout

---

## Important Reminders

🔐 **Your data is yours:**
- Export regularly with "end of session"
- Keep backups in safe place
- Nobody can access without .env secrets

🛡️ **Keep secrets safe:**
- Never commit `.env` to Git
- Use strong random passwords for webhook secret
- Rotate API keys periodically

📱 **Privacy by default:**
- Privacy mode ON by default
- External models require explicit opt-in
- Full control over data at all times

🚀 **You control everything:**
- When to use external models
- What data to keep/delete
- When/how to export
- Full access to source code

---

**Welcome to Solomon Claw. Your AI, your data, your rules.** 🎯

Questions? Check the docs or review the code. Everything is open source and transparent.
