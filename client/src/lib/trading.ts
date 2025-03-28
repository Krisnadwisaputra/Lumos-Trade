import { apiRequest } from './queryClient';

// Types for trading functions
export interface MarketOrder {
  userId: number;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
}

export interface LimitOrder {
  userId: number;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
}

export interface OrderStatus {
  id: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  status: string;
  timestamp: number;
}

export interface TradeSignal {
  userId: number;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  orderType: 'market' | 'limit';
  strategy: string;
  notes?: string;
}

// Trading functions
export const createMarketOrder = async (order: MarketOrder): Promise<OrderStatus> => {
  try {
    return await apiRequest('POST', '/api/exchange/order/market', order);
  } catch (error) {
    console.error('Error creating market order:', error);
    throw error;
  }
};

export const createLimitOrder = async (order: LimitOrder): Promise<OrderStatus> => {
  try {
    return await apiRequest('POST', '/api/exchange/order/limit', order);
  } catch (error) {
    console.error('Error creating limit order:', error);
    throw error;
  }
};

export const getOpenOrders = async (userId: number, symbol?: string): Promise<OrderStatus[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (symbol) queryParams.append('symbol', symbol);
    if (userId) queryParams.append('userId', userId.toString());
    
    return await apiRequest('GET', `/api/exchange/orders?${queryParams.toString()}`);
  } catch (error) {
    console.error('Error fetching open orders:', error);
    throw error;
  }
};

export const cancelOrder = async (orderId: string, symbol: string): Promise<boolean> => {
  try {
    await apiRequest('DELETE', `/api/exchange/order/${orderId}?symbol=${encodeURIComponent(symbol)}`);
    return true;
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

export const getOrderStatus = async (orderId: string, symbol: string): Promise<OrderStatus> => {
  try {
    return await apiRequest('GET', `/api/exchange/order/${orderId}?symbol=${encodeURIComponent(symbol)}`);
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
};

export const getTradeHistory = async (userId: number, symbol?: string): Promise<any[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (symbol) queryParams.append('symbol', symbol);
    if (userId) queryParams.append('userId', userId.toString());
    
    return await apiRequest('GET', `/api/exchange/trades?${queryParams.toString()}`);
  } catch (error) {
    console.error('Error fetching trade history:', error);
    throw error;
  }
};

export const executeTradeSignal = async (signal: TradeSignal): Promise<OrderStatus> => {
  try {
    return await apiRequest('POST', '/api/exchange/execute-signal', signal);
  } catch (error) {
    console.error('Error executing trade signal:', error);
    throw error;
  }
};

export const getCurrentPrice = async (symbol: string): Promise<{ price: number, timestamp: number }> => {
  try {
    return await apiRequest('GET', `/api/exchange/price?symbol=${encodeURIComponent(symbol)}`);
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw error;
  }
};