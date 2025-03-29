import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firebaseUid: z.string().optional(),
  createdAt: z.date()
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });

// Bot configuration schema
export const botConfigSchema = z.object({
  id: z.number(),
  userId: z.number(),
  isActive: z.boolean(),
  pair: z.string(),
  timeframe: z.string(),
  strategy: z.enum(['EMA_CROSS', 'SMART_MONEY', 'COMBINED']),
  emaFast: z.number().optional(),
  emaSlow: z.number().optional(),
  riskPerTrade: z.number(), // percentage
  stopLoss: z.number(), // percentage
  takeProfit: z.number(), // percentage
  maxOpenPositions: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const insertBotConfigSchema = botConfigSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Trade schema
export const tradeSchema = z.object({
  id: z.number(),
  userId: z.number(),
  pair: z.string(),
  type: z.string(), // e.g. 'market_buy', 'limit_sell', etc.
  entryPrice: z.string(),
  exitPrice: z.string().optional(),
  amount: z.string(),
  result: z.string().optional(), // profit/loss as string
  status: z.string(), // 'open', 'closed', 'cancelled', etc.
  pnl: z.number().optional(),
  pnlPercentage: z.number().optional(),
  botConfigId: z.number().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertTradeSchema = tradeSchema.omit({ 
  id: true, 
  pnl: true, 
  pnlPercentage: true,
  createdAt: true,
  updatedAt: true
});

// Order block schema
export const orderBlockSchema = z.object({
  id: z.number(),
  userId: z.number(),
  pair: z.string(),
  timeframe: z.string(),
  type: z.enum(['BULLISH', 'BEARISH']),
  price: z.number(),
  volume: z.number(),
  createdAt: z.date(),
  validUntil: z.date(),
  status: z.enum(['ACTIVE', 'TRIGGERED', 'EXPIRED'])
});

export const insertOrderBlockSchema = orderBlockSchema.omit({ 
  id: true, 
  status: true 
});

// Bot log schema
export const botLogSchema = z.object({
  id: z.number(),
  userId: z.number(),
  botConfigId: z.number().nullable().optional(),
  message: z.string(),
  level: z.string(), // 'info', 'error', 'warning', 'success'
  timestamp: z.date().optional(),
  createdAt: z.date().optional()
});

export const insertBotLogSchema = botLogSchema.omit({ 
  id: true,
  timestamp: true,
  createdAt: true
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type BotConfig = z.infer<typeof botConfigSchema>;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;

export type Trade = z.infer<typeof tradeSchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type OrderBlock = z.infer<typeof orderBlockSchema>;
export type InsertOrderBlock = z.infer<typeof insertOrderBlockSchema>;

export type BotLog = z.infer<typeof botLogSchema>;
export type InsertBotLog = z.infer<typeof insertBotLogSchema>;