import { apiRequest } from "./queryClient";
import { BotConfig, Trade, OrderBlock, BotLog } from "@shared/schema";

export interface TradeStats {
  winRate: number;
  avgRR: number;
  totalTrades: number;
  totalProfit: number;
}

export interface TradeHistory {
  trades: Trade[];
  stats: TradeStats;
}

// Get user's bot configuration
export const getBotConfig = async (userId: number): Promise<BotConfig | null> => {
  try {
    const response = await fetch(`/api/bot-config/${userId}`, {
      credentials: 'include'
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get bot config: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching bot config:", error);
    throw error;
  }
};

// Save bot configuration
export const saveBotConfig = async (config: Partial<BotConfig>): Promise<BotConfig> => {
  try {
    const response = await apiRequest("POST", "/api/bot-config", config);
    return await response.json();
  } catch (error) {
    console.error("Error saving bot config:", error);
    throw error;
  }
};

// Start bot
export const startBot = async (configId: number): Promise<void> => {
  try {
    await apiRequest("POST", `/api/bot/${configId}/start`, {});
  } catch (error) {
    console.error("Error starting bot:", error);
    throw error;
  }
};

// Stop bot
export const stopBot = async (configId: number): Promise<void> => {
  try {
    await apiRequest("POST", `/api/bot/${configId}/stop`, {});
  } catch (error) {
    console.error("Error stopping bot:", error);
    throw error;
  }
};

// Get trade history
export const getTradeHistory = async (userId: number, page: number = 1, limit: number = 10): Promise<{trades: Trade[], total: number}> => {
  try {
    const response = await fetch(`/api/trades/${userId}?page=${page}&limit=${limit}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get trade history: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching trade history:", error);
    throw error;
  }
};

// Get trading performance stats
export const getPerformanceStats = async (userId: number, timeframe: string = 'week'): Promise<TradeStats> => {
  try {
    const response = await fetch(`/api/stats/${userId}?timeframe=${timeframe}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get performance stats: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching performance stats:", error);
    throw error;
  }
};

// Get order block zones
export const getOrderBlocks = async (userId: number): Promise<OrderBlock[]> => {
  try {
    const response = await fetch(`/api/order-blocks/${userId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get order blocks: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching order blocks:", error);
    throw error;
  }
};

// Get bot logs
export const getBotLogs = async (userId: number, limit: number = 20): Promise<BotLog[]> => {
  try {
    const response = await fetch(`/api/bot-logs/${userId}?limit=${limit}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get bot logs: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching bot logs:", error);
    throw error;
  }
};

// Add manual trade entry
export const addManualTrade = async (trade: Partial<Trade>): Promise<Trade> => {
  try {
    const response = await apiRequest("POST", "/api/trades", trade);
    return await response.json();
  } catch (error) {
    console.error("Error adding manual trade:", error);
    throw error;
  }
};
