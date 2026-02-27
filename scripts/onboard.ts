import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════╗
║       🤖 SecureClaw Setup Wizard                   ║
╚════════════════════════════════════════════════════╝
`);

  // Check .env
  if (!existsSync(".env")) {
    console.log("📝 Creating .env file...");
    const exampleEnv = readFileSync(".env.example", "utf-8");
    writeFileSync(".env", exampleEnv);
    console.log("✅ .env created (please edit with your values)");
  }

  const telegramBotToken = await question(
    "\n🤖 Enter TELEGRAM_BOT_TOKEN (from @BotFather): "
  );
  const userId = await question("👤 Enter your Telegram User ID: ");

  // Generate webhook secret
  const webhookSecret = randomBytes(32).toString("hex");
  console.log(`\n🔐 Generated webhook secret: ${webhookSecret}`);

  // Check config.json
  if (!existsSync("config.json")) {
    console.log("\n📝 Creating config.json...");
    const exampleConfig = readFileSync("config.example.json", "utf-8");
    let config = JSON.parse(exampleConfig);

    // Update with user values
    config.bot.adminUserIds = [parseInt(userId)];
    config.security.allowedUserIds = [parseInt(userId)];

    writeFileSync("config.json", JSON.stringify(config, null, 2));
    console.log("✅ config.json created");
  }

  // Update .env
  let envContent = readFileSync(".env", "utf-8");
  envContent = envContent
    .replace(/TELEGRAM_BOT_TOKEN=.*/, `TELEGRAM_BOT_TOKEN=${telegramBotToken}`)
    .replace(
      /TELEGRAM_WEBHOOK_SECRET=.*/,
      `TELEGRAM_WEBHOOK_SECRET=${webhookSecret}`
    );
  writeFileSync(".env", envContent);
  console.log("✅ .env updated");

  console.log(`
╔════════════════════════════════════════════════════╗
║           ✅ Setup Complete!                       ║
╚════════════════════════════════════════════════════╝

Next steps:

1. Edit .env with API keys (optional):
   - ANTHROPIC_API_KEY (for Claude)
   - OPENAI_API_KEY (for GPT-4)
   - GROQ_API_KEY (for Groq LLaMA)

2. Install dependencies:
   npm install

3. Run in development:
   npm run dev

4. Or use Docker:
   cd docker
   docker compose up -d

ℹ️  Default model: ollama/llama3.2 (local, zero privacy concerns)
🔒 Privacy mode: ENABLED (no external calls by default)
`);

  rl.close();
}

main().catch((error) => {
  console.error("❌ Setup error:", error);
  process.exit(1);
});
