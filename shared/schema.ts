import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  balance: numeric("balance").notNull().default("10000.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Bot configuration model
export const botConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  exchange: text("exchange").notNull(),
  tradingPair: text("trading_pair").notNull(),
  timeframe: text("timeframe").notNull(),
  emaPeriods: text("ema_periods").notNull(),
  riskPercent: numeric("risk_percent").notNull(),
  rrRatio: numeric("rr_ratio").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).pick({
  userId: true,
  exchange: true,
  tradingPair: true,
  timeframe: true,
  emaPeriods: true,
  riskPercent: true,
  rrRatio: true,
  isActive: true,
  apiKey: true,
  apiSecret: true,
});

// Trade model
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  botConfigId: integer("bot_config_id").references(() => botConfigs.id),
  pair: text("pair").notNull(),
  type: text("type").notNull(), // BUY or SELL
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  amount: numeric("amount").notNull(),
  stopLoss: numeric("stop_loss"),
  takeProfit: numeric("take_profit"),
  result: numeric("result"),
  status: text("status").notNull(), // OPEN, CLOSED, CANCELLED
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
});

export const insertTradeSchema = createInsertSchema(trades).pick({
  userId: true,
  botConfigId: true,
  pair: true,
  type: true,
  entryPrice: true,
  exitPrice: true,
  amount: true,
  stopLoss: true,
  takeProfit: true,
  result: true,
  status: true,
  notes: true,
});

// Order block (OB) zone model for Smart Money Concepts
export const orderBlocks = pgTable("order_blocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  pair: text("pair").notNull(),
  timeframe: text("timeframe").notNull(),
  type: text("type").notNull(), // BULLISH or BEARISH
  priceHigh: numeric("price_high").notNull(),
  priceLow: numeric("price_low").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderBlockSchema = createInsertSchema(orderBlocks).pick({
  userId: true,
  pair: true,
  timeframe: true,
  type: true,
  priceHigh: true,
  priceLow: true,
  startTime: true,
  endTime: true,
  active: true,
});

// Bot activity logs
export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  botConfigId: integer("bot_config_id").references(() => botConfigs.id),
  message: text("message").notNull(),
  level: text("level").notNull().default("info"), // info, warning, error
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotLogSchema = createInsertSchema(botLogs).pick({
  userId: true,
  botConfigId: true,
  message: true,
  level: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type BotConfig = typeof botConfigs.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type OrderBlock = typeof orderBlocks.$inferSelect;
export type InsertOrderBlock = z.infer<typeof insertOrderBlockSchema>;

export type BotLog = typeof botLogs.$inferSelect;
export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
