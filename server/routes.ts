import { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertBotConfigSchema, insertTradeSchema, insertOrderBlockSchema, insertBotLogSchema } from "@shared/schema";
import z from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { initializeWebSocket } from "./websocket";

export async function registerRoutes(app: Express, httpServer: Server): Promise<Server> {
  // WebSocket is initialized in server/index.ts, we don't need to initialize it here
  // Error handler middleware
  app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err);
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ error: validationError.message });
    }
    res.status(500).json({ error: "Internal server error" });
  });

  // Users routes
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/by-email/:email", async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  app.get("/api/users/by-firebase/:firebaseUid", async (req: Request, res: Response) => {
    try {
      const firebaseUid = req.params.firebaseUid;
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Bot configuration routes
  app.get("/api/bot-config/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const config = await storage.getBotConfig(userId);
      if (!config) {
        return res.status(404).json({ error: "Bot configuration not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot configuration" });
    }
  });

  app.post("/api/bot-config", async (req: Request, res: Response) => {
    try {
      const configData = insertBotConfigSchema.parse(req.body);
      const config = await storage.saveBotConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: "Failed to save bot configuration" });
    }
  });

  // Bot control routes
  app.post("/api/bot/:configId/start", async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId);
      const config = await storage.getBotConfigById(configId);
      
      if (!config) {
        return res.status(404).json({ error: "Bot configuration not found" });
      }
      
      // Update bot status to active
      await storage.updateBotConfig(configId, { isActive: true });
      
      // Add a log entry
      await storage.addBotLog({
        userId: config.userId,
        botConfigId: configId,
        message: "Bot started - Connecting to exchange...",
        level: "info"
      });
      
      // Simulate additional logs
      setTimeout(async () => {
        await storage.addBotLog({
          userId: config.userId,
          botConfigId: configId,
          message: `Successfully connected to ${config.exchange} API`,
          level: "info"
        });
      }, 2000);
      
      setTimeout(async () => {
        await storage.addBotLog({
          userId: config.userId,
          botConfigId: configId,
          message: `Analyzing EMA crossovers on ${config.tradingPair} ${config.timeframe}`,
          level: "info"
        });
      }, 4000);
      
      setTimeout(async () => {
        await storage.addBotLog({
          userId: config.userId,
          botConfigId: configId,
          message: "Scanning for SMC order blocks...",
          level: "info"
        });
      }, 6000);
      
      res.json({ success: true, message: "Bot started successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to start bot" });
    }
  });

  app.post("/api/bot/:configId/stop", async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.configId);
      const config = await storage.getBotConfigById(configId);
      
      if (!config) {
        return res.status(404).json({ error: "Bot configuration not found" });
      }
      
      // Update bot status to inactive
      await storage.updateBotConfig(configId, { isActive: false });
      
      // Add a log entry
      await storage.addBotLog({
        userId: config.userId,
        botConfigId: configId,
        message: "Bot stopped by user",
        level: "info"
      });
      
      res.json({ success: true, message: "Bot stopped successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop bot" });
    }
  });

  // Trades routes
  app.get("/api/trades/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const { trades, total } = await storage.getTradeHistory(userId, page, limit);
      res.json({ trades, total });
    } catch (error) {
      res.status(500).json({ error: "Failed to get trade history" });
    }
  });

  app.post("/api/trades", async (req: Request, res: Response) => {
    try {
      const tradeData = insertTradeSchema.parse(req.body);
      const trade = await storage.addTrade(tradeData);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: "Failed to add trade" });
    }
  });

  // Performance stats routes
  app.get("/api/stats/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const timeframe = req.query.timeframe as string || 'week';
      
      const stats = await storage.getPerformanceStats(userId, timeframe);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get performance stats" });
    }
  });

  // Order blocks routes
  app.get("/api/order-blocks/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const orderBlocks = await storage.getOrderBlocks(userId);
      res.json(orderBlocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to get order blocks" });
    }
  });

  // Bot logs routes
  app.get("/api/bot-logs/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 20;
      
      const logs = await storage.getBotLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot logs" });
    }
  });

  // Chart data routes
  app.get("/api/chart-data", async (req: Request, res: Response) => {
    try {
      const pair = req.query.pair as string || 'BTC/USDT';
      const timeframe = req.query.timeframe as string || '1h';
      
      const data = await storage.getChartData(pair, timeframe);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get chart data" });
    }
  });

  app.get("/api/ema", async (req: Request, res: Response) => {
    try {
      const pair = req.query.pair as string || 'BTC/USDT';
      const timeframe = req.query.timeframe as string || '1h';
      const period = parseInt(req.query.period as string) || 9;
      
      const data = await storage.getEMA(pair, timeframe, period);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get EMA data" });
    }
  });

  app.get("/api/current-price", async (req: Request, res: Response) => {
    try {
      const pair = req.query.pair as string || 'BTC/USDT';
      const price = await storage.getCurrentPrice(pair);
      res.json(price);
    } catch (error) {
      res.status(500).json({ error: "Failed to get current price" });
    }
  });

  return httpServer;
}
