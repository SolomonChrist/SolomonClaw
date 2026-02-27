# Solomon Claw: Data Privacy & Security Architecture

## Philosophy

**Your data is yours alone.** Solomon Claw is designed with the core principle that:

1. **Zero external data transmission** by default (local Ollama)
2. **All data encrypted at rest** (optional master key)
3. **Complete user control** over data export and deletion
4. **Access audit trail** for security monitoring
5. **No telemetry or analytics** — ever

---

## Data Flows

### Message Storage

```
User Input
    ↓
Sanitized (control chars stripped, length capped)
    ↓
Stored in SQLite (on your machine)
    ↓
Never sent externally (unless user explicitly requests external model)
    ↓
Retrieved only for user's conversation context
```

**Key: SQLite WAL mode ensures safe concurrent access; NORMAL synchronous for reliability**

### Privacy Mode (Default: ON)

```
Privacy Mode: ON
├─ Only ollama/llama3.2 can be used
├─ Model runs locally on your hardware
├─ Zero calls to external APIs
├─ No data leaves your machine
└─ Privacy status: 🔒 PROTECTED

External Model Request (with API key)
├─ User says "switch to Claude"
├─ Bot checks: API key configured? YES
├─ Bot shows: ⚠️ Privacy warning
├─ User confirms: "yes"
├─ Messages sent to Anthropic
└─ Privacy status: 🌐 EXTERNAL (user consented)
```

---

## Data Security Layers

### Layer 1: Access Control

**Allowlist Enforcement** (first middleware)
```typescript
if (!allowedUserIds.includes(userId)) {
  return; // Silent drop — no processing, no logs visible to user
}
```

- Only users in `config.json` `security.allowedUserIds` can interact
- Checked before ANY message processing
- Silent drop (no error message sent)

### Layer 2: Input Sanitization

**Control Character Removal**
- Strips bytes `0x00-0x08`, `0x0B-0x0C`, `0x0E-0x1F`, `0x7F`
- Removes zero-width characters (U+200B, U+200C, U+200D, etc.)
- Caps message length (default 4000 chars)

**Prevents:**
- Prompt injection via hidden characters
- Buffer overflow attacks
- Control character injection

### Layer 3: Database Encryption (Optional)

**At-Rest Encryption with User-Derived Keys**
```typescript
keyMaterial = `${userId}:${process.env.MASTER_KEY || "default"}`
derivedKey = scrypt(keyMaterial, salt, 32 bytes)
encrypted = AES-256-GCM(data, key, IV, auth-tag)
```

**Features:**
- Each user's data encrypted with unique key
- Scrypt key derivation (memory-hard, resistant to brute force)
- AES-256-GCM authenticated encryption
- Per-message IV and authentication tags

**Enable:** Set `MASTER_KEY` environment variable (optional)

### Layer 4: Access Logging

**Immutable Access Audit Trail**
```
/data/access-logs/
├─ access-2025-02-27.jsonl
├─ access-2025-02-28.jsonl
└─ ...
```

Each log entry records:
```json
{
  "timestamp": "2025-02-27T10:30:00Z",
  "userId": 12345,
  "action": "MESSAGE_RECEIVED",
  "success": true
}
```

**Actions logged:**
- `MESSAGE_RECEIVED` - User sent message
- `DATA_EXPORT` - User exported their data
- `DATA_DELETE` - User cleared history
- `AUTH_ATTEMPT` - Authentication event
- `SECURITY:UNAUTHORIZED_ACCESS` - Failed access attempts

**Access:**
- Logs stored locally on your server
- Never transmitted externally
- Only admin can review (human security audit)

### Layer 5: Data Isolation Contexts

**Temporary Contexts for Sensitive Operations**
```typescript
context = createDataContext(userId, ttlSeconds=3600)
// User performs action
validateDataContext(contextId, userId) // Must match
// Action completes
invalidateDataContext(contextId)        // Context expires
```

**Prevents:**
- Token replay attacks
- Cross-context data leaks
- Long-lived access tokens

---

## File System Security

### Workspace Isolation

**Tool File Operations Restricted to `/workspace/`**

```typescript
// User: "create a file called test.txt"
requestedPath = "test.txt"
canonicalPath = resolve("/data/workspace", "test.txt") // /data/workspace/test.txt
baseDir = normalize("/data/workspace")

if (!canonicalPath.startsWith(baseDir)) {
  reject("Access denied: Path must be within /workspace")
}
```

**Prevents:**
- Directory traversal (`../../../etc/passwd`)
- Symlink escapes
- Absolute path access

### Code Execution Sandbox

**Isolated Docker Container**
```dockerfile
# Sandbox container
├─ Network: None (no internet access)
├─ Filesystem: Read-only (except /tmp)
├─ User: nobody (UID 65534, no privileges)
├─ Memory: 256MB limit
├─ Timeout: 30 seconds
└─ Result: Returned to user only
```

**Prevents:**
- Network exfiltration
- Persistent file access
- Privilege escalation
- Resource exhaustion

---

## Data Export (Session End)

### Export Your Data

User types: **"end of session"** or `/export`

Bot generates JSON file with:

```json
{
  "exportedAt": "2025-02-27T10:30:00Z",
  "userId": 12345,
  "userData": {
    "username": "user",
    "activeModel": "ollama/llama3.2",
    "createdAt": 1751000000,
    "lastSeenAt": 1751010000
  },
  "conversations": [
    {
      "chatId": -1001234567890,
      "messages": [
        {
          "timestamp": 1751000001,
          "role": "user",
          "content": "Hello",
          "model": null
        },
        {
          "timestamp": 1751000002,
          "role": "assistant",
          "content": "Hi there!",
          "model": "ollama/llama3.2"
        }
      ]
    }
  ],
  "statistics": {
    "totalMessages": 42,
    "conversationCount": 3,
    "oldestMessage": "2025-02-20T10:00:00Z",
    "newestMessage": "2025-02-27T10:30:00Z"
  }
}
```

**What's included:**
- ✅ All conversations (every user message + bot response)
- ✅ Model used for each response
- ✅ Timestamps (ISO 8601)
- ✅ User settings and metadata
- ✅ Statistics

**What's NOT included:**
- ❌ External API responses (unless you ask)
- ❌ System prompt (it's static, not learned data)
- ❌ Logs or audit trails (separate, for admin only)

### Delete Local Data

After export, user chooses:

**"yes"** → Clears conversation history locally
```sql
DELETE FROM messages WHERE userId = ? AND chatId = ?
```

**"no"** → Keeps data on server (user can continue chatting)

---

## Defense Against Attacks

### Scenario 1: Bot Gets Compromised

**If attacker gains shell access:**

```
Attacker gains RCE
    ↓
SQLite database is encrypted (if MASTER_KEY set)
    ↓
User's API keys are in .env (must be separately protected)
    ↓
Messages are encrypted with user-derived key
    ↓
Attacker cannot read without master key
    ↓
Access logs show breach occurred
```

**Mitigation:**
- Keep `MASTER_KEY` as separate secret (don't commit to Git)
- Use strong master key (32+ random characters)
- Regularly rotate access logs
- Docker read-only filesystem + tmpfs for runtime data

### Scenario 2: Network Interception

**Data in transit (between server and Telegram):**
- Telegram uses TLS 1.3 (encrypted)
- Webhook verification: Constant-time token comparison
- Messages signed with Telegram Bot API

**Mitigation:**
- Only use HTTPS for webhooks
- Verify `X-Telegram-Bot-Api-Secret-Token` header
- Use strong webhook secret (32+ chars, random)

### Scenario 3: Data Exfiltration via Logs

**Attacker tries to steal data from logs:**

```
Logs location: /data/access-logs/access-YYYY-MM-DD.jsonl
Log content: Actions + metadata ONLY, not message content
Example: { "userId": 12345, "action": "MESSAGE_RECEIVED", "success": true }
Message content: NOT in logs (stored in encrypted database)
```

**Mitigation:**
- Log only metadata (user ID, action, timestamp)
- Never log message content in audit logs
- Access logs protected by filesystem permissions

### Scenario 4: Supply Chain / Dependencies

**Scenario: A dependency is compromised**

Solomon Claw's security model:
- No telemetry code (no "phone home")
- No external service calls by default
- All network access is explicit (user-initiated)
- Data never flows to unknown services

**Code review checklist:**
- No `fetch()` to unknown URLs
- No environment variable leaks in logs
- No hidden analytics calls
- No backup services

---

## Compliance & Standards

### GDPR-Ready
- ✅ Right to access data: `/export` command
- ✅ Right to deletion: `clear history` command
- ✅ Data minimization: Only store what's needed
- ✅ Encryption: Optional at-rest encryption
- ✅ Access logs: Audit trail for data access

### HIPAA-Compatible (with configuration)
- ✅ Audit trails (access logs)
- ✅ Encryption at rest (AES-256-GCM)
- ✅ Data isolation (per-user encryption keys)
- ✅ Access controls (allowlist)
- ✅ No external transmission (unless user opts in)

**Note:** This is not a HIPAA Business Associate Agreement (BAA). For healthcare use, work with your legal team.

---

## Configuration for Maximum Security

### `.env` (Secrets Management)

```bash
# Use strong, random values
TELEGRAM_BOT_TOKEN=<32+ random chars>
TELEGRAM_WEBHOOK_SECRET=<32+ random hex chars via: openssl rand -hex 32>
MASTER_KEY=<32+ random chars for at-rest encryption>

# Never commit .env — use `.env.example` template
# In production: Use secrets management (Docker Secrets, HashiCorp Vault, etc.)
```

### `config.json` (Security Settings)

```json
{
  "security": {
    "allowedUserIds": [YOUR_ID],
    "maxMessageLength": 4000,
    "rateLimitPerUser": {
      "maxMessages": 10,
      "windowSeconds": 60
    }
  },
  "ai": {
    "privacyMode": true,
    "externalModelsEnabled": false
  }
}
```

### Docker (Container Security)

```dockerfile
FROM node:22-slim
USER 1001              # Non-root user
WORKDIR /app
# Multi-stage build
RUN mkdir -p /data/workspace && chown -R 1001:1001 /data
```

### systemd (Process Hardening)

```ini
[Service]
ProtectSystem=strict
PrivateTmp=true
NoNewPrivileges=true
ProtectHome=yes
ProtectClock=yes
ProtectKernelLogs=yes
SystemCallFilter=@system-service
```

---

## Data Retention Policy

### What Gets Stored

| Data | Storage | Lifetime | Encryption |
|------|---------|----------|------------|
| Messages | SQLite | Until user `/clear` | Optional (MASTER_KEY) |
| User settings | SQLite | Until user `/clear` | Optional |
| Access logs | JSON lines | 90 days | Recommended: Encrypt at filesystem level |
| API keys (.env) | Filesystem | Until user changes | Must: Use OS-level encryption |

### Auto-Cleanup (Recommended)

```bash
# Cron job to archive & delete old access logs
0 2 * * * find /data/access-logs -mtime +90 -delete

# Cron job to export old conversations
0 1 * * 0 find /data/exports -mtime +180 -type f -exec gzip {} \;
```

---

## Breach Response Procedure

If you suspect a breach:

1. **Stop the bot immediately**
   ```bash
   docker compose down
   systemctl stop solomon-claw
   ```

2. **Export all your data** (before wiping)
   ```bash
   # If still running:
   # Send /export command via Telegram

   # If offline, manually query:
   sqlite3 data/secureclaw.db "SELECT * FROM messages;" > backup.sql
   ```

3. **Check access logs** for suspicious activity
   ```bash
   cat /data/access-logs/access-*.jsonl | grep UNAUTHORIZED
   ```

4. **Isolate the server**
   - Take it offline from the internet
   - Preserve database for forensics
   - Don't delete anything yet

5. **Rotate secrets**
   - Generate new TELEGRAM_BOT_TOKEN from @BotFather
   - Generate new TELEGRAM_WEBHOOK_SECRET
   - Change MASTER_KEY (if using encryption)

6. **Rebuild & redeploy**
   - Use fresh OS image
   - Pull latest Solomon Claw code
   - Review all commits since last update
   - Deploy with new secrets

---

## Transparency & Trust

Solomon Claw is:
- ✅ **Open source** — All code visible for audit
- ✅ **Privacy-focused** — No external calls by default
- ✅ **User-owned** — Export any time, keep backups
- ✅ **Auditable** — Access logs, all operations logged
- ✅ **Secure** — Industry-standard crypto (AES-256, Scrypt)

**Trust, but verify:**
- Review source code for security
- Audit dependencies with `npm audit`
- Check for telemetry or hidden networks
- Test in isolated environment first

---

## Questions?

- **Data export:** Type "end of session"
- **Delete history:** `/clear` command
- **Check status:** `/status` command
- **Review logs:** `tail -f /data/access-logs/access-$(date +%Y-%m-%d).jsonl`

**Remember:** Your data is in your hands. Always keep backups. 🔒
