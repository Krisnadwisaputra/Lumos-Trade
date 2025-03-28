import { 
  users, 
  User, 
  InsertUser, 
  BotConfig, 
  InsertBotConfig, 
  Trade, 
  InsertTrade, 
  OrderBlock, 
  InsertOrderBlock, 
  BotLog, 
  InsertBotLog 
} from "@shared/schema";
import { calculateEMA } from "@/lib/charts";

// Interface for all storage operations
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
    // Generate mock chart data for different pairs and timeframes
    const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
    const timeframes = ['5m', '15m', '1h', '4h', '1d'];

    pairs.forEach(pair => {
      timeframes.forEach(timeframe => {
        const key = `${pair}_${timeframe}`;
        this.chartData.set(key, this.generateCandlestickData(pair, timeframe));
      });
    });

    // Generate sample order blocks
    const sampleOrderBlocks: InsertOrderBlock[] = [
      {
        userId: 1,
        pair: 'BTC/USDT',
        timeframe: '4h',
        type: 'BULLISH',
        priceHigh: '45000',
        priceLow: '44000',
        startTime: new Date('2023-05-01'),
        active: true
      },
      {
        userId: 1,
        pair: 'ETH/USDT',
        timeframe: '1h',
        type: 'BEARISH',
        priceHigh: '3200',
        priceLow: '3100',
        startTime: new Date('2023-05-02'),
        active: true
      },
      {
        userId: 1,
        pair: 'SOL/USDT',
        timeframe: '4h',
        type: 'BULLISH',
        priceHigh: '90',
        priceLow: '85',
        startTime: new Date('2023-05-03'),
        active: true
      }
    ];

    sampleOrderBlocks.forEach(ob => {
      this.addOrderBlock(ob);
    });
  }

  private generateCandlestickData(pair: string, timeframe: string): any[] {
    const basePrice = pair.startsWith('BTC') ? 45000 : pair.startsWith('ETH') ? 3000 : 80;
    const volatility = pair.startsWith('BTC') ? 500 : pair.startsWith('ETH') ? 50 : 5;
    const candleCount = 200;
    
    const now = new Date();
    const timeIncrement = 
      timeframe === '5m' ? 5 * 60 * 1000 :
      timeframe === '15m' ? 15 * 60 * 1000 :
      timeframe === '1h' ? 60 * 60 * 1000 :
      timeframe === '4h' ? 4 * 60 * 60 * 1000 :
      24 * 60 * 60 * 1000; // 1d
    
    let price = basePrice;
    let time = new Date(now.getTime() - (candleCount * timeIncrement));
    
    const data = [];
    
    for (let i = 0; i < candleCount; i++) {
      const change = (Math.random() - 0.5) * 2 * volatility;
      const open = price;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * volatility / 2;
      const low = Math.min(open, close) - Math.random() * volatility / 2;
      
      data.push({
        time: time.getTime() / 1000,
        open: open,
        high: high,
        low: low,
        close: close
      });
      
      price = close;
      time = new Date(time.getTime() + timeIncrement);
    }
    
    return data;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUid
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    
    // Create a properly typed User object with all required fields
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      balance: "10000.00",
      createdAt,
      
      // Optional fields with proper null handling
      firebaseUid: insertUser.firebaseUid ?? null
    };
    
    this.users.set(id, user);
    return user;
  }

  async getBotConfig(userId: number): Promise<BotConfig | undefined> {
    return Array.from(this.botConfigs.values()).find(
      (config) => config.userId === userId
    );
  }

  async getBotConfigById(id: number): Promise<BotConfig | undefined> {
    return this.botConfigs.get(id);
  }

  async saveBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    // Check if config already exists for this user
    const existingConfig = await this.getBotConfig(config.userId);
    
    if (existingConfig) {
      // Update existing config with proper null handling
      const updatedConfig: BotConfig = {
        id: existingConfig.id,
        userId: config.userId,
        exchange: config.exchange,
        tradingPair: config.tradingPair,
        timeframe: config.timeframe,
        emaPeriods: config.emaPeriods,
        riskPercent: config.riskPercent,
        rrRatio: config.rrRatio,
        isActive: config.isActive ?? existingConfig.isActive,
        createdAt: existingConfig.createdAt,
        updatedAt: new Date(),
        apiKey: config.apiKey ?? existingConfig.apiKey,
        apiSecret: config.apiSecret ?? existingConfig.apiSecret
      };
      
      this.botConfigs.set(existingConfig.id, updatedConfig);
      return updatedConfig;
    } else {
      // Create new config with proper null handling
      const id = this.configIdCounter++;
      const now = new Date();
      const newConfig: BotConfig = {
        id,
        userId: config.userId,
        exchange: config.exchange,
        tradingPair: config.tradingPair,
        timeframe: config.timeframe,
        emaPeriods: config.emaPeriods,
        riskPercent: config.riskPercent,
        rrRatio: config.rrRatio,
        isActive: config.isActive ?? false,
        createdAt: now,
        updatedAt: now,
        apiKey: config.apiKey ?? null,
        apiSecret: config.apiSecret ?? null
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const total = userTrades.length;
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedTrades = userTrades.slice(startIdx, endIdx);
    
    return { trades: paginatedTrades, total };
  }

  async addTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.tradeIdCounter++;
    const createdAt = new Date();
    
    // Create a properly typed Trade object with all required fields
    const trade: Trade = {
      id, 
      userId: insertTrade.userId,
      pair: insertTrade.pair,
      type: insertTrade.type,
      entryPrice: insertTrade.entryPrice,
      amount: insertTrade.amount,
      status: insertTrade.status,
      createdAt,
      
      // Optional fields with proper null handling
      botConfigId: insertTrade.botConfigId ?? null,
      exitPrice: insertTrade.exitPrice ?? null,
      stopLoss: insertTrade.stopLoss ?? null,
      takeProfit: insertTrade.takeProfit ?? null,
      result: insertTrade.result ?? null,
      notes: insertTrade.notes ?? null,
      closedAt: insertTrade.status === 'CLOSED' ? new Date() : null
    };
    
    this.trades.set(id, trade);
    return trade;
  }

  async getPerformanceStats(userId: number, timeframe: string = 'week'): Promise<{ winRate: number, avgRR: number, totalTrades: number, totalProfit: number }> {
    // Get all user trades
    const userTrades = Array.from(this.trades.values())
      .filter(trade => trade.userId === userId && trade.status === 'CLOSED');
    
    // Filter by timeframe
    const now = new Date();
    let cutoffDate: Date;
    
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
      default:
        cutoffDate = new Date(now.setDate(now.getDate() - 7)); // Default to week
    }
    
    const filteredTrades = userTrades.filter(
      trade => new Date(trade.createdAt) >= cutoffDate
    );
    
    // Calculate stats
    const totalTrades = filteredTrades.length;
    
    if (totalTrades === 0) {
      return { winRate: 0, avgRR: 0, totalTrades: 0, totalProfit: 0 };
    }
    
    const winningTrades = filteredTrades.filter(
      trade => trade.result && parseFloat(trade.result.toString()) > 0
    );
    
    const winRate = (winningTrades.length / totalTrades) * 100;
    
    // Calculate total profit
    const totalProfit = filteredTrades.reduce(
      (sum, trade) => sum + (trade.result ? parseFloat(trade.result.toString()) : 0),
      0
    );
    
    // Simulate RR calculation - in a real app this would use stop loss and take profit levels
    const avgRR = parseFloat((Math.random() * 1.5 + 1).toFixed(2));
    
    return {
      winRate: parseFloat(winRate.toFixed(2)),
      avgRR,
      totalTrades,
      totalProfit: parseFloat(totalProfit.toFixed(2))
    };
  }

  async getOrderBlocks(userId: number): Promise<OrderBlock[]> {
    return Array.from(this.orderBlocks.values())
      .filter(ob => ob.userId === userId && ob.active)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addOrderBlock(insertOrderBlock: InsertOrderBlock): Promise<OrderBlock> {
    const id = this.orderBlockIdCounter++;
    const createdAt = new Date();
    
    // Create a properly typed OrderBlock object with all required fields
    const orderBlock: OrderBlock = {
      id,
      userId: insertOrderBlock.userId,
      pair: insertOrderBlock.pair,
      timeframe: insertOrderBlock.timeframe,
      type: insertOrderBlock.type,
      priceHigh: insertOrderBlock.priceHigh,
      priceLow: insertOrderBlock.priceLow,
      startTime: insertOrderBlock.startTime,
      createdAt,
      
      // Optional fields with proper null handling
      endTime: insertOrderBlock.endTime ?? null,
      active: insertOrderBlock.active ?? true
    };
    
    this.orderBlocks.set(id, orderBlock);
    return orderBlock;
  }

  async getBotLogs(userId: number, limit: number = 20): Promise<BotLog[]> {
    return Array.from(this.botLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async addBotLog(insertLog: InsertBotLog): Promise<BotLog> {
    const id = this.botLogIdCounter++;
    const createdAt = new Date();
    
    // Create a properly typed BotLog object with all required fields
    const log: BotLog = {
      id,
      userId: insertLog.userId,
      message: insertLog.message,
      createdAt,
      
      // Optional fields with proper null handling
      botConfigId: insertLog.botConfigId ?? null,
      level: insertLog.level ?? "info"
    };
    
    this.botLogs.set(id, log);
    return log;
  }

  async getChartData(pair: string, timeframe: string): Promise<any[]> {
    const key = `${pair}_${timeframe}`;
    return this.chartData.get(key) || [];
  }

  async getEMA(pair: string, timeframe: string, period: number): Promise<any[]> {
    const candlesticks = await this.getChartData(pair, timeframe);
    
    if (candlesticks.length === 0) {
      return [];
    }
    
    // Extract close prices
    const prices = candlesticks.map(candle => candle.close);
    
    // Calculate EMA
    const emaValues = calculateEMA(prices, period);
    
    // Format data for chart
    return candlesticks.map((candle, index) => ({
      time: candle.time,
      value: emaValues[index]
    }));
  }

  async getCurrentPrice(pair: string): Promise<{ price: string, change: string }> {
    const key = `${pair}_1h`;
    const candles = this.chartData.get(key) || [];
    
    if (candles.length === 0) {
      return { price: "0.00", change: "0.00" };
    }
    
    const latestCandle = candles[candles.length - 1];
    const previousCandle = candles[candles.length - 2];
    
    const price = latestCandle.close.toString();
    
    let change = "0.00";
    if (previousCandle) {
      const priceChange = ((latestCandle.close - previousCandle.close) / previousCandle.close) * 100;
      change = priceChange.toFixed(2);
    }
    
    return { price, change };
  }
}

export const storage = new MemStorage();
