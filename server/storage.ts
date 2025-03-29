import { 
  User, InsertUser, 
  BotConfig, InsertBotConfig, 
  Trade, InsertTrade, 
  OrderBlock, InsertOrderBlock,
  BotLog, InsertBotLog
} from '@shared/schema';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Bot config operations
  getBotConfig(userId: number): Promise<BotConfig | undefined>;
  getBotConfigById(id: number): Promise<BotConfig | undefined>;
  saveBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(id: number, updates: Partial<BotConfig>): Promise<BotConfig>;

  // Trade operations
  getTradeHistory(userId: number, page: number, limit: number): Promise<{ trades: Trade[], total: number }>;
  addTrade(trade: InsertTrade): Promise<Trade>;

  // Performance stats
  getPerformanceStats(userId: number, timeframe: string): Promise<{ winRate: number, avgRR: number, totalTrades: number, totalProfit: number }>;

  // Order blocks
  getOrderBlocks(userId: number): Promise<OrderBlock[]>;
  addOrderBlock(orderBlock: InsertOrderBlock): Promise<OrderBlock>;

  // Bot logs
  getBotLogs(userId: number, limit: number): Promise<BotLog[]>;
  addBotLog(log: InsertBotLog): Promise<BotLog>;

  // Chart data
  getChartData(pair: string, timeframe: string): Promise<any[]>;
  getEMA(pair: string, timeframe: string, period: number): Promise<any[]>;
  getCurrentPrice(pair: string): Promise<{ price: string, change: string }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botConfigs: Map<number, BotConfig>;
  private trades: Map<number, Trade>;
  private orderBlocks: Map<number, OrderBlock>;
  private botLogs: Map<number, BotLog>;
  private chartData: Map<string, any[]>;

  private userIdCounter: number;
  private configIdCounter: number;
  private tradeIdCounter: number;
  private orderBlockIdCounter: number;
  private botLogIdCounter: number;

  constructor() {
    this.users = new Map();
    this.botConfigs = new Map();
    this.trades = new Map();
    this.orderBlocks = new Map();
    this.botLogs = new Map();
    this.chartData = new Map();

    this.userIdCounter = 1;
    this.configIdCounter = 1;
    this.tradeIdCounter = 1;
    this.orderBlockIdCounter = 1;
    this.botLogIdCounter = 1;

    this.initializeData();
  }

  private initializeData() {
    // Pre-populate chart data for common crypto pairs
    const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

    for (const pair of pairs) {
      for (const timeframe of timeframes) {
        const key = `${pair}-${timeframe}`;
        this.chartData.set(key, this.generateCandlestickData(pair, timeframe));
      }
    }
  }

  private generateCandlestickData(pair: string, timeframe: string): any[] {
    const data = [];
    const now = new Date();
    let time = now.getTime() - (3600 * 24 * 30 * 1000); // 30 days ago
    
    const timeMultiplier = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }[timeframe] || 60 * 60 * 1000;
    
    const basePrice = pair.startsWith('BTC') ? 45000 : pair.startsWith('ETH') ? 3000 : 300;
    let price = basePrice;
    
    while (time < now.getTime()) {
      const volatility = Math.random() * 0.03; // 3% max volatility
      const change = price * volatility * (Math.random() > 0.5 ? 1 : -1);
      
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
      const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
      
      data.push({
        time: time / 1000, // Convert to unix timestamp (seconds)
        open,
        high,
        low,
        close,
        volume: Math.random() * 100
      });
      
      price = close;
      time += timeMultiplier;
    }
    
    return data;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getBotConfig(userId: number): Promise<BotConfig | undefined> {
    return Array.from(this.botConfigs.values()).find(config => config.userId === userId);
  }

  async getBotConfigById(id: number): Promise<BotConfig | undefined> {
    return this.botConfigs.get(id);
  }

  async saveBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    // Check if a config for this userId already exists
    const existingConfig = await this.getBotConfig(config.userId);
    
    const now = new Date();
    
    if (existingConfig) {
      const updatedConfig: BotConfig = {
        ...existingConfig,
        ...config,
        updatedAt: now
      };
      this.botConfigs.set(existingConfig.id, updatedConfig);
      return updatedConfig;
    } else {
      const id = this.configIdCounter++;
      const newConfig: BotConfig = {
        ...config,
        id,
        createdAt: now,
        updatedAt: now
      };
      this.botConfigs.set(id, newConfig);
      return newConfig;
    }
  }

  async updateBotConfig(id: number, updates: Partial<BotConfig>): Promise<BotConfig> {
    const config = this.botConfigs.get(id);
    if (!config) {
      throw new Error(`Bot config with ID ${id} not found`);
    }
    
    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date()
    };
    
    this.botConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  async getTradeHistory(userId: number, page: number = 1, limit: number = 10): Promise<{ trades: Trade[], total: number }> {
    const userTrades = Array.from(this.trades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => {
        // Sort by created date if available, otherwise use ids (newer trades have higher ids)
        if (a.createdAt && b.createdAt) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return b.id - a.id;
      });
    
    const total = userTrades.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const trades = userTrades.slice(start, end);
    
    return { trades, total };
  }

  async addTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.tradeIdCounter++;
    const now = new Date();
    const trade: Trade = {
      ...insertTrade,
      id,
      status: insertTrade.status || 'open',
      pnl: 0,
      pnlPercentage: 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.trades.set(id, trade);
    return trade;
  }

  async getPerformanceStats(userId: number, timeframe: string = 'week'): Promise<{ winRate: number, avgRR: number, totalTrades: number, totalProfit: number }> {
    const userTrades = Array.from(this.trades.values())
      .filter(trade => trade.userId === userId && trade.status === 'closed');
    
    if (userTrades.length === 0) {
      return { winRate: 0, avgRR: 0, totalTrades: 0, totalProfit: 0 };
    }
    
    let cutoffDate: Date;
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        cutoffDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        cutoffDate = new Date(0); // Beginning of time
    }
    
    const filteredTrades = userTrades.filter(trade => {
      if (!trade.createdAt) return true; // Include trades without creation date
      return trade.createdAt >= cutoffDate;
    });
    
    const winningTrades = filteredTrades.filter(trade => (trade.pnl || 0) > 0);
    const winRate = filteredTrades.length > 0 ? (winningTrades.length / filteredTrades.length) * 100 : 0;
    
    const totalProfit = filteredTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // Calculate risk-reward ratio
    const winningRR = winningTrades.map(trade => {
      const profit = trade.pnl || 0;
      // Parse amount as number with fallback to 1 if parsing fails
      const amount = parseFloat(trade.amount) || 1;
      const risk = amount * 0.01; // Assuming 1% risk per trade as default
      return profit / risk;
    });
    
    const avgRR = winningRR.length > 0 
      ? winningRR.reduce((sum, rr) => sum + rr, 0) / winningRR.length 
      : 0;
    
    return {
      winRate,
      avgRR,
      totalTrades: filteredTrades.length,
      totalProfit
    };
  }

  async getOrderBlocks(userId: number): Promise<OrderBlock[]> {
    return Array.from(this.orderBlocks.values())
      .filter(block => block.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async addOrderBlock(insertOrderBlock: InsertOrderBlock): Promise<OrderBlock> {
    const id = this.orderBlockIdCounter++;
    const orderBlock: OrderBlock = {
      ...insertOrderBlock,
      id,
      status: 'ACTIVE'
    };
    
    this.orderBlocks.set(id, orderBlock);
    return orderBlock;
  }

  async getBotLogs(userId: number, limit: number = 20): Promise<BotLog[]> {
    return Array.from(this.botLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => {
        // Use timestamp if available, fallback to createdAt, then to id (newer logs have higher ids)
        if (a.timestamp && b.timestamp) {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }
        if (a.createdAt && b.createdAt) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return b.id - a.id;
      })
      .slice(0, limit);
  }

  async addBotLog(insertLog: InsertBotLog): Promise<BotLog> {
    const id = this.botLogIdCounter++;
    const timestamp = new Date();
    const log: BotLog = {
      ...insertLog,
      id,
      timestamp,
      createdAt: timestamp
    };
    
    this.botLogs.set(id, log);
    return log;
  }

  async getChartData(pair: string, timeframe: string): Promise<any[]> {
    const key = `${pair}-${timeframe}`;
    return this.chartData.get(key) || [];
  }

  async getEMA(pair: string, timeframe: string, period: number): Promise<any[]> {
    const candlesticks = await this.getChartData(pair, timeframe);
    if (candlesticks.length === 0) return [];
    
    const closePrices = candlesticks.map(candle => candle.close);
    
    // Simple EMA calculation
    const k = 2 / (period + 1);
    let ema = [closePrices[0]];
    
    for (let i = 1; i < closePrices.length; i++) {
      ema.push(closePrices[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema.map((value, index) => ({
      time: candlesticks[index].time,
      value
    }));
  }

  async getCurrentPrice(pair: string): Promise<{ price: string, change: string }> {
    const candlesticks = await this.getChartData(pair, '1h');
    if (candlesticks.length === 0) {
      return { price: '0', change: '0' };
    }
    
    const current = candlesticks[candlesticks.length - 1].close;
    const previous = candlesticks[candlesticks.length - 2]?.close || current;
    
    const changePercent = ((current - previous) / previous) * 100;
    
    return {
      price: current.toFixed(2),
      change: changePercent.toFixed(2)
    };
  }
}

export const storage = new MemStorage();