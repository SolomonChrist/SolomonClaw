# Solomon Claw: Deployment Guide

Quick reference for deploying Solomon Claw on different platforms.

## Prerequisites

- Node.js 22+ (for development)
- Docker + Docker Compose (for containerized deployment)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- Ollama installed locally OR accessible at localhost:11434

## Quick Start (5 minutes)

### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/solomon-claw.git
cd solomon-claw

# Run interactive setup
npm install
npm run onboard
```

### 2. Development (Polling Mode)
```bash
# Set USE_POLLING=true in .env
npm run dev
```

Bot will start polling Telegram for messages. No domain needed.

### 3. Production (Docker)
```bash
cd docker
docker compose up -d

# View logs
docker compose logs -f

# Health check
curl http://localhost:3000/health
```

---

## Installation Methods

### Method 1: Local Development (Polling)

**Requirements:**
- Node.js 22+
- npm/pnpm
- Ollama running (localhost:11434)

**Steps:**

```bash
# Clone
git clone https://github.com/yourusername/solomon-claw.git
cd solomon-claw

# Setup
npm install
npm run onboard

# Configure
cat .env          # Verify TELEGRAM_BOT_TOKEN is set
cat config.json   # Verify allowedUserIds has your Telegram ID

# Run
npm run dev       # Watch mode with hot reload
```

**Logs:**
```bash
tail -f /tmp/solomon-claw.log
```

---

### Method 2: Docker (Development or Production)

**Requirements:**
- Docker
- Docker Compose
- Ollama accessible (host machine or separate container)

**Steps:**

```bash
cd docker

# Copy .env and config.json
cp ../.env ./data/
cp ../config.json ./data/

# Start
docker compose up -d

# Logs
docker compose logs -f

# Stop
docker compose down
```

**Accessing the bot:**
- Telegram: Invite bot and start chatting
- Health check: `curl http://localhost:3000/health`
- Logs: `docker compose logs --tail 100 -f`
- Database: `docker exec solomon-claw sqlite3 /data/solomon-claw.db`

---

### Method 3: systemd (Linux Server)

**Requirements:**
- Linux server (Ubuntu 20.04+, Debian 11+)
- Node.js 22+
- Ollama service running

**Steps:**

```bash
# Copy to /opt/
sudo cp -r . /opt/solomon-claw
cd /opt/solomon-claw

# Create service user
sudo useradd -r -s /bin/false solomon-claw

# Set permissions
sudo chown -R solomon-claw:solomon-claw /opt/solomon-claw
sudo chmod -R 750 /opt/solomon-claw
sudo chmod 600 .env

# Install dependencies
cd /opt/solomon-claw
sudo -u solomon-claw npm ci --production

# Build TypeScript
sudo -u solomon-claw npm run build

# Copy systemd unit
sudo cp systemd/solomon-claw.service /etc/systemd/system/

# Enable & start
sudo systemctl daemon-reload
sudo systemctl enable solomon-claw
sudo systemctl start solomon-claw

# Check status
sudo systemctl status solomon-claw

# View logs
journalctl -u solomon-claw -f
```

**Managing the service:**
```bash
# Start
sudo systemctl start solomon-claw

# Stop
sudo systemctl stop solomon-claw

# Restart
sudo systemctl restart solomon-claw

# Status
sudo systemctl status solomon-claw

# Logs (last 50 lines)
journalctl -u solomon-claw -n 50

# Logs (follow in real-time)
journalctl -u solomon-claw -f
```

---

### Method 4: Cloud (DigitalOcean / AWS / Heroku)

#### DigitalOcean App Platform

1. Create account at digitalocean.com
2. Create new App
3. Connect GitHub repository (fork first)
4. Select `docker-compose.yml` for deployment
5. Set environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `CONFIG_PATH=/data/config.json`
   - `USE_POLLING=false`

6. Deploy
7. Update webhook in Telegram via bot API

#### AWS (ECS + Fargate)

1. Create ECR repository
2. Build and push Docker image:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

   docker build -f docker/Dockerfile -t <REPO_URI>:latest .
   docker push <REPO_URI>:latest
   ```

3. Create ECS task definition with:
   - Container image: Your ECR image
   - Port: 3000
   - Environment variables: See above
   - Volume: EFS for `/data`

4. Create ECS service
5. Set up Application Load Balancer
6. Configure HTTPS via ACM
7. Update webhook URL in Telegram

---

## Webhook Mode (HTTPS Required)

### Prerequisites
- Domain name (e.g., `botapi.example.com`)
- HTTPS certificate (Let's Encrypt recommended)
- Reverse proxy (nginx, Caddy, or ALB)

### nginx Configuration

```nginx
upstream solomon_claw {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl http2;
    server_name botapi.example.com;

    ssl_certificate /etc/letsencrypt/live/botapi.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/botapi.example.com/privkey.pem;

    location /webhook {
        proxy_pass http://solomon_claw;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://solomon_claw;
    }
}

server {
    listen 80;
    server_name botapi.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Caddy Configuration

```caddyfile
botapi.example.com {
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
    }
}
```

### Environment Setup

```bash
# .env
USE_POLLING=false
TELEGRAM_WEBHOOK_SECRET=<32-char random hex>
PORT=3000
```

```json
{
  "bot": {
    "webhookDomain": "https://botapi.example.com",
    "webhookPath": "/webhook"
  }
}
```

### Start Bot

```bash
npm run dev
# OR
docker compose up -d
# OR
systemctl start solomon-claw
```

Bot automatically sets webhook with Telegram.

---

## Configuration

### Environment Variables (`.env`)

```bash
# Required
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_WEBHOOK_SECRET=<32+ char random>

# Optional
ANTHROPIC_API_KEY=<for Claude>
OPENAI_API_KEY=<for GPT-4>
GROQ_API_KEY=<for Groq>
MISTRAL_API_KEY=<for Mistral>
OPENROUTER_API_KEY=<for OpenRouter>
MASTER_KEY=<for at-rest encryption>

# Application
NODE_ENV=production
PORT=3000
USE_POLLING=false
CONFIG_PATH=/data/config.json
LOG_LEVEL=info
```

### Configuration File (`config.json`)

```json
{
  "bot": {
    "webhookDomain": "https://botapi.example.com",
    "webhookPath": "/webhook",
    "adminUserIds": [YOUR_TELEGRAM_ID]
  },
  "security": {
    "allowedUserIds": [YOUR_TELEGRAM_ID],
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
    "tools": {
      "webSearch": { "enabled": true },
      "fileSystem": { "enabled": true, "workspace": "/data/workspace" },
      "codeExecution": { "enabled": true }
    }
  },
  "voice": {
    "enabled": true,
    "provider": "local",
    "localWhisperModel": "base"
  },
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434"
    }
  }
}
```

---

## Health Checks

### HTTP Health Endpoint
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "messageCount": 42,
  "activeUsers": 3,
  "uptime": 3600,
  "timestamp": "2025-02-27T10:00:00Z"
}
```

### Telegram Bot Check
```bash
# Send message to bot
# Should receive response
```

### Database Check
```bash
# Local
sqlite3 data/solomon-claw.db "SELECT COUNT(*) FROM messages;"

# Docker
docker exec solomon-claw sqlite3 /data/solomon-claw.db "SELECT COUNT(*) FROM messages;"
```

### Logs Check
```bash
# Development
npm run dev    # Will show logs in console

# Docker
docker compose logs -f

# systemd
journalctl -u solomon-claw -f
```

---

## Troubleshooting

### Bot Not Responding

1. Check `.env`:
   ```bash
   cat .env | grep TELEGRAM_BOT_TOKEN
   ```

2. Check `config.json` allowlist:
   ```bash
   cat config.json | grep allowedUserIds
   # Your Telegram ID should be in the list
   ```

3. Check logs:
   ```bash
   npm run dev       # Development
   docker compose logs -f  # Docker
   journalctl -u solomon-claw -f  # systemd
   ```

4. Verify Telegram credentials:
   ```bash
   curl -s https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe | jq
   ```

### Models Not Available

1. Check Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Pull model if missing:
   ```bash
   ollama pull llama3.2
   ```

3. Check API keys for external models:
   ```bash
   cat .env | grep _API_KEY
   ```

### High Memory Usage

1. Reduce context size in `config.json`:
   ```json
   {
     "ai": {
       "maxContextTokens": 50000,
       "maxHistoryMessages": 25
     }
   }
   ```

2. Use smaller model:
   ```json
   {
     "ai": {
       "defaultModel": "ollama/tinyllama"
     }
   }
   ```

### Database Locked

```bash
# Remove lock files
rm -f data/solomon-claw.db-shm data/solomon-claw.db-wal

# Restart
systemctl restart solomon-claw
# OR
docker compose restart
```

---

## Backup & Recovery

### Backup User Data

```bash
# Export all data
npm run onboard

# Or via Telegram:
# User says: "end of session"
# Bot sends: JSON export file
```

### Backup Database

```bash
# Make backup
cp data/solomon-claw.db data/solomon-claw.db.backup

# Or with Docker:
docker exec solomon-claw cp /data/solomon-claw.db /data/solomon-claw.db.backup
```

### Restore from Backup

```bash
# Stop bot
systemctl stop solomon-claw

# Restore
cp data/solomon-claw.db.backup data/solomon-claw.db

# Start
systemctl start solomon-claw
```

---

## Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `config.json` has correct `allowedUserIds`
- [ ] `TELEGRAM_BOT_TOKEN` is strong (from @BotFather)
- [ ] `TELEGRAM_WEBHOOK_SECRET` is 32+ random chars
- [ ] `MASTER_KEY` set if using at-rest encryption
- [ ] HTTPS enabled for webhook mode
- [ ] Firewall blocks port 3000 from public (use reverse proxy)
- [ ] Regular backups configured
- [ ] Access logs monitored
- [ ] Dependencies updated (`npm audit fix`)

---

## Monitoring

### Log Monitoring
```bash
# Check for errors
journalctl -u solomon-claw | grep ERROR

# Check access logs
cat /data/access-logs/access-*.jsonl | grep SECURITY
```

### Uptime Monitoring
```bash
# Keep health check running
watch -n 60 'curl -s http://localhost:3000/health | jq'
```

### Disk Usage
```bash
du -sh data/
du -sh data/solomon-claw.db

# If database grows too large, export and clear:
# User sends: "end of session"
# User sends: "yes" to clear
```

---

## Next Steps

1. Read [README.md](README.md) for quick start
2. Read [docs/DATA_PRIVACY.md](docs/DATA_PRIVACY.md) for security details
3. Deploy using your preferred method above
4. Monitor first 24 hours of operation
5. Invite users and start using!

---

**Need help?** Open an issue on GitHub or check the documentation folder.
