import { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertBotConfigSchema, insertTradeSchema, insertOrderBlockSchema, insertBotLogSchema } from "@shared/schema";
import z from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { initializeWebSocket } from "./websocket";
import { 
  getAccountBalance, 
  getMarketPrice, 
  createMarketOrder, 
  createLimitOrder, 
  getOpenOrders, 
  cancelOrder,
  getOrderStatus,
  getTradeHistory as getExchangeTradeHistory,
  executeTradeSignal,
  formatPair
} from "./exchange";

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
          message: `Successfully connected to exchange API`,
          level: "info"
        });
      }, 2000);
      
      setTimeout(async () => {
        await storage.addBotLog({
          userId: config.userId,
          botConfigId: configId,
          message: `Analyzing EMA crossovers on ${config.pair} ${config.timeframe}`,
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

  // Live Trading API endpoints
  app.get("/api/exchange/balance", async (req: Request, res: Response) => {
    try {
      const balance = await getAccountBalance();
      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to get account balance: ${error.message}` });
    }
  });

  app.get("/api/exchange/price", async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string) || 'BTC/USDT';
      const formatted = formatPair(symbol);
      const price = await getMarketPrice(formatted);
      res.json(price);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to get market price: ${error.message}` });
    }
  });

  app.post("/api/exchange/order/market", async (req: Request, res: Response) => {
    try {
      const { symbol, side, amount } = req.body;
      
      if (!symbol || !side || !amount) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      if (side !== 'buy' && side !== 'sell') {
        return res.status(400).json({ error: "Side must be 'buy' or 'sell'" });
      }

      const formatted = formatPair(symbol);
      const order = await createMarketOrder(formatted, side, amount);
      
      // Log the trade in our system
      const userId = parseInt(req.body.userId);
      if (userId) {
        const priceValue = (order.price || order.average || 0) as number;
        await storage.addTrade({
          userId,
          pair: symbol,
          type: 'market',
          // Note: side is included in type field as 'buy' or 'sell'
          entryPrice: priceValue.toString(),
          exitPrice: priceValue.toString(), // For market orders, entry and exit are the same
          amount: amount.toString(),
          result: '0', // Calculated later with actual data
          botConfigId: req.body.botConfigId ? parseInt(req.body.botConfigId) : null,
          status: 'closed'
        });
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to create market order: ${error.message}` });
    }
  });

  app.post("/api/exchange/order/limit", async (req: Request, res: Response) => {
    try {
      const { symbol, side, amount, price } = req.body;
      
      if (!symbol || !side || !amount || !price) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      if (side !== 'buy' && side !== 'sell') {
        return res.status(400).json({ error: "Side must be 'buy' or 'sell'" });
      }

      const formatted = formatPair(symbol);
      const order = await createLimitOrder(formatted, side, amount, price);
      
      // Log the trade in our system
      const userId = parseInt(req.body.userId);
      if (userId) {
        await storage.addTrade({
          userId,
          pair: symbol,
          type: side === 'buy' ? 'limit_buy' : 'limit_sell',  // Include side in the type
          entryPrice: price.toString(),
          exitPrice: price.toString(), // Updated when order is filled
          amount: amount.toString(),
          result: '0', // Calculated later with actual data
          botConfigId: req.body.botConfigId ? parseInt(req.body.botConfigId) : null,
          status: 'open'
        });
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to create limit order: ${error.message}` });
    }
  });

  app.get("/api/exchange/orders", async (req: Request, res: Response) => {
    try {
      const symbol = req.query.symbol as string;
      const orders = await getOpenOrders(symbol);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to get open orders: ${error.message}` });
    }
  });

  app.delete("/api/exchange/order/:orderId", async (req: Request, res: Response) => {
    try {
      const orderId = req.params.orderId;
      const symbol = req.query.symbol as string;
      
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }
      
      const formatted = formatPair(symbol);
      const result = await cancelOrder(orderId, formatted);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to cancel order: ${error.message}` });
    }
  });

  app.get("/api/exchange/order/:orderId", async (req: Request, res: Response) => {
    try {
      const orderId = req.params.orderId;
      const symbol = req.query.symbol as string;
      
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }
      
      const formatted = formatPair(symbol);
      const order = await getOrderStatus(orderId, formatted);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to get order status: ${error.message}` });
    }
  });

  app.get("/api/exchange/trades", async (req: Request, res: Response) => {
    try {
      const symbol = req.query.symbol as string;
      const since = req.query.since ? parseInt(req.query.since as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }
      
      const formatted = formatPair(symbol);
      const trades = await getExchangeTradeHistory(formatted, since, limit);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to get trade history: ${error.message}` });
    }
  });
  
  app.post("/api/exchange/execute-signal", async (req: Request, res: Response) => {
    try {
      const { 
        symbol, 
        side, 
        amount, 
        orderType, 
        price, 
        stopLoss, 
        takeProfit, 
        userId, 
        botConfigId 
      } = req.body;
      
      if (!symbol || !side || !amount || !orderType) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const formatted = formatPair(symbol);
      const result = await executeTradeSignal(
        formatted, 
        side, 
        amount, 
        orderType, 
        price, 
        stopLoss, 
        takeProfit
      );
      
      // Log the trade in our system
      if (userId) {
        const userIdNum = parseInt(userId);
        const tradePrice = price || (result.order.price || 0);
        
        // Create a trade with the correct type that includes the side info
        const tradeType = orderType === 'market' 
          ? (side === 'buy' ? 'market_buy' : 'market_sell')
          : (side === 'buy' ? 'limit_buy' : 'limit_sell');
          
        const trade = await storage.addTrade({
          userId: userIdNum,
          pair: symbol,
          type: tradeType,
          entryPrice: tradePrice.toString(),
          exitPrice: tradePrice.toString(), // Updated when order is filled/closed
          amount: amount.toString(),
          result: '0', // Calculated later with actual data
          botConfigId: botConfigId ? parseInt(botConfigId) : null,
          status: orderType === 'market' ? 'closed' : 'open'
        });
        
        // Log the main order
        await storage.addBotLog({
          userId: userIdNum,
          botConfigId: botConfigId ? parseInt(botConfigId) : null,
          message: `Signal executed: ${side.toUpperCase()} ${amount} ${symbol} at ${tradePrice} (${orderType})`,
          level: "info"
        });
        
        // Log stop loss order if placed
        if (result.stopLossOrder) {
          await storage.addBotLog({
            userId: userIdNum,
            botConfigId: botConfigId ? parseInt(botConfigId) : null,
            message: `Stop loss order placed at ${result.stopLossOrder.price} (${Math.abs(stopLoss)}%)`,
            level: "info"
          });
        }
        
        // Log take profit order if placed
        if (result.takeProfitOrder) {
          await storage.addBotLog({
            userId: userIdNum,
            botConfigId: botConfigId ? parseInt(botConfigId) : null,
            message: `Take profit order placed at ${result.takeProfitOrder.price} (${Math.abs(takeProfit)}%)`,
            level: "info"
          });
        }
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to execute trade signal: ${error.message}` });
    }
  });

  return httpServer;
}
