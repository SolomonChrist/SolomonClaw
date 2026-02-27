import { eq, desc, and, gte } from "drizzle-orm";
import { getDB } from "./client.js";
import {
  users,
  messages,
  userSettings,
  type User,
  type NewUser,
  type Message,
  type NewMessage,
  type UserSettings,
} from "./schema.js";
import { logger } from "../utils/logger.js";

// Users

export async function getOrCreateUser(
  userId: number,
  username?: string,
  firstName?: string
): Promise<User> {
  const db = getDB();
  const existing = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (existing) {
    return existing;
  }

  const newUser: NewUser = {
    userId,
    username,
    firstName,
  };

  const inserted = await db.insert(users).values(newUser).returning();
  return inserted[0];
}

export async function getUserById(userId: number): Promise<User | undefined> {
  const db = getDB();
  return await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });
}

export async function updateUserLastSeen(userId: number): Promise<void> {
  const db = getDB();
  await db
    .update(users)
    .set({ lastSeenAt: Math.floor(Date.now() / 1000) })
    .where(eq(users.userId, userId));
}

// Messages

export async function getRecentHistory(
  userId: number,
  chatId: number,
  limit: number = 50
): Promise<Message[]> {
  const db = getDB();
  return await db.query.messages.findMany({
    where: and(eq(messages.userId, userId), eq(messages.chatId, chatId)),
    orderBy: desc(messages.createdAt),
    limit,
  });
}

export async function appendMessage(
  userId: number,
  chatId: number,
  role: "user" | "assistant",
  content: string,
  modelUsed?: string,
  tokensUsed?: number
): Promise<Message> {
  const db = getDB();
  const newMessage: NewMessage = {
    userId,
    chatId,
    role,
    content,
    modelUsed,
    tokensUsed,
  };

  const inserted = await db
    .insert(messages)
    .values(newMessage)
    .returning();
  return inserted[0];
}

export async function clearHistory(userId: number, chatId: number): Promise<number> {
  const db = getDB();
  const result = await db
    .delete(messages)
    .where(and(eq(messages.userId, userId), eq(messages.chatId, chatId)));
  return result.changes;
}

export async function getLastNMessages(
  userId: number,
  chatId: number,
  n: number = 5
): Promise<Message[]> {
  const db = getDB();
  const allMessages = await db.query.messages.findMany({
    where: and(eq(messages.userId, userId), eq(messages.chatId, chatId)),
    orderBy: desc(messages.createdAt),
    limit: n,
  });
  // Reverse to get chronological order
  return allMessages.reverse();
}

// User Settings

export async function getUserSettings(userId: number): Promise<UserSettings | undefined> {
  const db = getDB();
  return await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
}

export async function setUserModel(userId: number, model: string): Promise<void> {
  const db = getDB();

  const existing = await getUserSettings(userId);

  if (existing) {
    await db
      .update(userSettings)
      .set({ preferredModel: model })
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      userId,
      preferredModel: model,
    });
  }

  // Also update the users table for quick access
  await db
    .update(users)
    .set({ activeModel: model })
    .where(eq(users.userId, userId));
}

export async function getUserModel(userId: number): Promise<string | undefined> {
  const db = getDB();
  const settings = await getUserSettings(userId);
  return settings?.preferredModel;
}

// Analytics / Health

export async function getMessageCount(
  userId?: number,
  sinceHoursAgo?: number
): Promise<number> {
  const db = getDB();
  const conditions: any[] = [];

  if (userId) {
    conditions.push(eq(messages.userId, userId));
  }

  if (sinceHoursAgo) {
    const cutoffTime = Math.floor(Date.now() / 1000) - sinceHoursAgo * 3600;
    conditions.push(gte(messages.createdAt, cutoffTime));
  }

  const result = await db.query.messages.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
  });

  return result.length;
}

export async function getActiveUserCount(hoursAgo: number = 24): Promise<number> {
  const db = getDB();
  const cutoffTime = Math.floor(Date.now() / 1000) - hoursAgo * 3600;

  const result = await db.query.users.findMany({
    where: gte(users.lastSeenAt, cutoffTime),
  });

  return result.length;
}
