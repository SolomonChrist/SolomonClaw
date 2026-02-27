import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").unique().notNull(),
    username: text("username"),
    firstName: text("first_name"),
    activeModel: text("active_model").default("ollama/llama3.2"),
    createdAt: integer("created_at")
      .default(sql`CAST(unixepoch() AS INTEGER)`)
      .notNull(),
    lastSeenAt: integer("last_seen_at")
      .default(sql`CAST(unixepoch() AS INTEGER)`)
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("users_user_id_idx").on(table.userId),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    chatId: integer("chat_id").notNull(),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    modelUsed: text("model_used"),
    tokensUsed: integer("tokens_used"),
    createdAt: integer("created_at")
      .default(sql`CAST(unixepoch() AS INTEGER)`)
      .notNull(),
  },
  (table) => ({
    userChatIdx: index("messages_user_chat_idx").on(
      table.userId,
      table.chatId
    ),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

export const userSettings = sqliteTable(
  "user_settings",
  {
    userId: integer("user_id").primaryKey().notNull(),
    preferredModel: text("preferred_model").default("ollama/llama3.2"),
    systemPromptOverride: text("system_prompt_override"),
    maxHistory: integer("max_history").default(50),
    updatedAt: integer("updated_at")
      .default(sql`CAST(unixepoch() AS INTEGER)`)
      .notNull(),
  }
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
