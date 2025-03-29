import * as ccxt from 'ccxt';

// Define a simplified order type to avoid TS issues with ccxt
interface SimplifiedOrder {
  id: string;
  status: string;
  symbol: string;
  type: string;
  side: string;
  price: number;
  amount: number;
  cost: number;
  filled: number;
  remaining: number;
  timestamp: number;
  datetime: string;
  [key: string]: any;
}

// Initialize exchange with API keys
let exchange: ccxt.Exchange;

// Get the initialized exchange instance
export const getExchange = (): ccxt.Exchange => {
  if (!exchange) {
    initializeExchange();
  }
  return exchange;
};

// Initialize the exchange with API keys
export const initializeExchange = (): void => {
  // Check if API keys are available
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn('Binance API keys not found. Running in simulation mode.');
    // Initialize with empty config for public endpoints only
    exchange = new ccxt.binance();
  } else {
    // Initialize with API keys
    exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true
    });
  }
};

// Get account balance
export const getAccountBalance = async (): Promise<any> => {
  try {
    const exchange = getExchange();
    
    if (!exchange.apiKey) {
      return {
        USDT: { free: 10000, used: 0, total: 10000 },
        BTC: { free: 0.5, used: 0, total: 0.5 },
        ETH: { free: 5, used: 0, total: 5 }
      };
    }
    
    await exchange.loadMarkets();
    const balance = await exchange.fetchBalance();
    return balance;
  } catch (error) {
    console.error('Error fetching account balance:', error);
    throw error;
  }
};

// Get current market price
export const getMarketPrice = async (symbol: string): Promise<{ price: number, timestamp: number }> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    const ticker = await exchange.fetchTicker(symbol);
    // Ensure we have valid numbers
    const price = typeof ticker.last === 'number' ? ticker.last : 0;
    const timestamp = typeof ticker.timestamp === 'number' ? ticker.timestamp : Date.now();
    
    return { price, timestamp };
  } catch (error) {
    console.error(`Error fetching market price for ${symbol}:`, error);
    throw error;
  }
};

// Create market order
export const createMarketOrder = async (
  symbol: string,
  side: 'buy' | 'sell',
  amount: number
): Promise<SimplifiedOrder> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      throw new Error('API keys required for creating orders');
    }
    
    const order = await exchange.createMarketOrder(symbol, side, amount);
    return normalizeOrder(order);
  } catch (error) {
    console.error(`Error creating market order for ${symbol}:`, error);
    throw error;
  }
};

// Create limit order
export const createLimitOrder = async (
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number
): Promise<SimplifiedOrder> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      throw new Error('API keys required for creating orders');
    }
    
    const order = await exchange.createLimitOrder(symbol, side, amount, price);
    return normalizeOrder(order);
  } catch (error) {
    console.error(`Error creating limit order for ${symbol}:`, error);
    throw error;
  }
};

// Get open orders
export const getOpenOrders = async (symbol?: string): Promise<ccxt.Order[]> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      return []; // Return empty array in simulation mode
    }
    
    const orders = await exchange.fetchOpenOrders(symbol);
    return orders;
  } catch (error) {
    console.error('Error fetching open orders:', error);
    throw error;
  }
};

// Cancel order
export const cancelOrder = async (orderId: string, symbol: string): Promise<any> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      throw new Error('API keys required for cancelling orders');
    }
    
    const result = await exchange.cancelOrder(orderId, symbol);
    return result;
  } catch (error) {
    console.error(`Error cancelling order ${orderId}:`, error);
    throw error;
  }
};

// Get order status
export const getOrderStatus = async (orderId: string, symbol: string): Promise<ccxt.Order> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      throw new Error('API keys required for fetching order status');
    }
    
    const order = await exchange.fetchOrder(orderId, symbol);
    return order;
  } catch (error) {
    console.error(`Error fetching order status for ${orderId}:`, error);
    throw error;
  }
};

// Get trade history
export const getTradeHistory = async (symbol: string, since?: number, limit?: number): Promise<ccxt.Trade[]> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      return []; // Return empty array in simulation mode
    }
    
    const trades = await exchange.fetchMyTrades(symbol, since, limit);
    return trades;
  } catch (error) {
    console.error(`Error fetching trade history for ${symbol}:`, error);
    throw error;
  }
};

// Execute trade based on signal
export const executeTradeSignal = async (
  symbol: string,
  signal: 'BUY' | 'SELL',
  amount: number,
  stopLoss?: number,
  takeProfit?: number
): Promise<{ order: SimplifiedOrder, stopLossOrder?: SimplifiedOrder, takeProfitOrder?: SimplifiedOrder }> => {
  try {
    const exchange = getExchange();
    await exchange.loadMarkets();
    
    if (!exchange.apiKey) {
      throw new Error('API keys required for executing trade signals');
    }
    
    // Execute main order
    const side = signal.toLowerCase() as 'buy' | 'sell';
    const orderResponse = await exchange.createMarketOrder(symbol, side, amount);
    const mainOrder = normalizeOrder(orderResponse);
    
    let stopLossOrder;
    let takeProfitOrder;
    
    // If trade was successful and stopLoss/takeProfit are specified
    if (mainOrder && mainOrder.status === 'closed') {
      const oppositeAction = signal === 'BUY' ? 'sell' : 'buy';
      const currentPrice = mainOrder.price || (await getMarketPrice(symbol)).price;
      
      // Place stop loss order if specified
      if (stopLoss) {
        const stopPrice = signal === 'BUY' 
          ? currentPrice * (1 - stopLoss / 100) 
          : currentPrice * (1 + stopLoss / 100);
        
        // Not all exchanges support stop loss orders directly
        // Using limit orders instead as a fallback
        const slOrderResponse = await exchange.createLimitOrder(
          symbol,
          oppositeAction,
          amount,
          stopPrice
        );
        stopLossOrder = normalizeOrder(slOrderResponse);
      }
      
      // Place take profit order if specified
      if (takeProfit) {
        const limitPrice = signal === 'BUY'
          ? currentPrice * (1 + takeProfit / 100)
          : currentPrice * (1 - takeProfit / 100);
        
        const tpOrderResponse = await exchange.createLimitOrder(
          symbol,
          oppositeAction,
          amount,
          limitPrice
        );
        takeProfitOrder = normalizeOrder(tpOrderResponse);
      }
    }
    
    return {
      order: mainOrder,
      stopLossOrder,
      takeProfitOrder
    };
  } catch (error) {
    console.error(`Error executing trade signal for ${symbol}:`, error);
    throw error;
  }
};

// Helper to format pair symbols
export const formatPair = (pair: string): string => {
  return pair.replace('/', '')
}

// Helper to normalize order response to SimplifiedOrder
const normalizeOrder = (order: any): SimplifiedOrder => {
  // Handle null or undefined order object
  if (!order) {
    return {
      id: '',
      status: 'undefined',
      symbol: '',
      type: '',
      side: '',
      price: 0,
      amount: 0,
      cost: 0,
      filled: 0,
      remaining: 0,
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
    };
  }

  return {
    id: order.id || '',
    status: order.status || 'undefined',
    symbol: order.symbol || '',
    type: order.type || '',
    side: order.side || '',
    price: typeof order.price === 'number' ? order.price : 0,
    amount: typeof order.amount === 'number' ? order.amount : 0,
    cost: typeof order.cost === 'number' ? order.cost : 0,
    filled: typeof order.filled === 'number' ? order.filled : 0,
    remaining: typeof order.remaining === 'number' ? order.remaining : 0,
    timestamp: typeof order.timestamp === 'number' ? order.timestamp : Date.now(),
    datetime: order.datetime || new Date().toISOString(),
    ...order
  };
}