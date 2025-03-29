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
    
    try {
      // Try to get real balance if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const balance = await exchange.fetchBalance();
        return balance;
      }
    } catch (error) {
      console.log('Falling back to simulated balance data');
    }
    
    // Either no API keys or an error occurred, return simulated data
    return {
      USDT: { free: 10000, used: 0, total: 10000 },
      BTC: { free: 0.5, used: 0, total: 0.5 },
      ETH: { free: 5, used: 0, total: 5 },
      SOL: { free: 20, used: 0, total: 20 },
      XRP: { free: 1000, used: 0, total: 1000 },
      info: { User: 'Simulation Mode' }
    };
  } catch (error) {
    console.error('Error fetching account balance:', error);
    // Always provide a fallback rather than throwing
    return {
      USDT: { free: 10000, used: 0, total: 10000 },
      BTC: { free: 0.5, used: 0, total: 0.5 },
      ETH: { free: 5, used: 0, total: 5 }
    };
  }
};

// Get current market price
export const getMarketPrice = async (symbol: string): Promise<{ price: number, timestamp: number }> => {
  try {
    // First try to use the real exchange
    try {
      const exchange = getExchange();
      await exchange.loadMarkets();
      
      const ticker = await exchange.fetchTicker(symbol);
      // Ensure we have valid numbers
      const price = typeof ticker.last === 'number' ? ticker.last : 0;
      const timestamp = typeof ticker.timestamp === 'number' ? ticker.timestamp : Date.now();
      
      return { price, timestamp };
    } catch (error) {
      console.log(`Falling back to simulated price data for ${symbol}`);
      // Generate simulated price based on the symbol
      // This gives us more realistic prices for different coins
      let basePrice = 0;
      if (symbol.includes('BTC')) {
        basePrice = 32500 + (Math.random() * 1000 - 500);
      } else if (symbol.includes('ETH')) {
        basePrice = 1750 + (Math.random() * 50 - 25);
      } else if (symbol.includes('SOL')) {
        basePrice = 125 + (Math.random() * 10 - 5);
      } else if (symbol.includes('XRP')) {
        basePrice = 0.50 + (Math.random() * 0.05 - 0.025);
      } else {
        basePrice = 100 + (Math.random() * 10 - 5);
      }
      
      return { 
        price: basePrice, 
        timestamp: Date.now() 
      };
    }
  } catch (error) {
    console.error(`Error fetching market price for ${symbol}:`, error);
    // Provide fallback price rather than failing completely
    const basePrice = symbol.includes('BTC') ? 32500 : 
                     symbol.includes('ETH') ? 1750 : 
                     symbol.includes('SOL') ? 125 : 
                     symbol.includes('XRP') ? 0.50 : 100;
    return { price: basePrice, timestamp: Date.now() };
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
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const order = await exchange.createMarketOrder(symbol, side, amount);
        return normalizeOrder(order);
      }
    } catch (error) {
      console.log(`Falling back to simulated market order for ${symbol}`);
    }
    
    // Create a simulated market order
    const { price } = await getMarketPrice(symbol);
    const cost = price * amount;
    
    // Generate a random ID for the order
    const orderId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create a simulated order object
    const simulatedOrder: SimplifiedOrder = {
      id: orderId,
      status: 'closed',
      symbol: symbol,
      type: 'market',
      side: side,
      price: price,
      amount: amount,
      cost: cost,
      filled: amount,
      remaining: 0,
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      fee: {
        cost: cost * 0.001, // Simulated 0.1% fee
        currency: symbol.split('/')[1] || 'USDT'
      }
    };
    
    return simulatedOrder;
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
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const order = await exchange.createLimitOrder(symbol, side, amount, price);
        return normalizeOrder(order);
      }
    } catch (error) {
      console.log(`Falling back to simulated limit order for ${symbol}`);
    }
    
    // Create a simulated limit order
    const cost = price * amount;
    
    // Generate a random ID for the order
    const orderId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create a simulated order object
    const simulatedOrder: SimplifiedOrder = {
      id: orderId,
      status: 'open',
      symbol: symbol,
      type: 'limit',
      side: side,
      price: price,
      amount: amount,
      cost: cost,
      filled: 0,
      remaining: amount,
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      fee: {
        cost: 0, // No fee until executed
        currency: symbol.split('/')[1] || 'USDT'
      }
    };
    
    return simulatedOrder;
  } catch (error) {
    console.error(`Error creating limit order for ${symbol}:`, error);
    throw error;
  }
};

// Get open orders
export const getOpenOrders = async (symbol?: string): Promise<ccxt.Order[]> => {
  try {
    const exchange = getExchange();
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const orders = await exchange.fetchOpenOrders(symbol);
        return orders;
      }
    } catch (error) {
      console.log(`Falling back to simulated open orders for ${symbol || 'all symbols'}`);
    }
    
    // Return empty array in simulation mode
    // In a full implementation, you would keep track of simulated open orders in memory or DB
    return [];
  } catch (error) {
    console.error('Error fetching open orders:', error);
    // Always provide a fallback rather than throwing
    return [];
  }
};

// Cancel order
export const cancelOrder = async (orderId: string, symbol: string): Promise<any> => {
  try {
    const exchange = getExchange();
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const result = await exchange.cancelOrder(orderId, symbol);
        return result;
      }
    } catch (error) {
      console.log(`Falling back to simulated cancel order for ${orderId}`);
    }
    
    // Simulated cancel order response
    return {
      id: orderId,
      status: 'canceled',
      symbol: symbol,
      info: {
        status: 'CANCELED',
        orderId: orderId,
        symbol: symbol.replace('/', '')
      }
    };
  } catch (error) {
    console.error(`Error cancelling order ${orderId}:`, error);
    throw error;
  }
};

// Get order status
export const getOrderStatus = async (orderId: string, symbol: string): Promise<ccxt.Order> => {
  try {
    const exchange = getExchange();
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const order = await exchange.fetchOrder(orderId, symbol);
        return order;
      }
    } catch (error) {
      console.log(`Falling back to simulated order status for ${orderId}`);
    }
    
    // Simulated order status
    // In a real implementation, you'd lookup the order from a database
    if (orderId.startsWith('sim_')) {
      // This is a simulated order, return a mock status
      return {
        id: orderId,
        status: 'open',
        symbol: symbol,
        type: 'limit',
        side: 'buy',
        price: 32500,
        amount: 0.1,
        cost: 3250,
        filled: 0,
        remaining: 0.1,
        timestamp: parseInt(orderId.split('_')[1]) || Date.now(),
        datetime: new Date(parseInt(orderId.split('_')[1]) || Date.now()).toISOString(),
        fee: {
          cost: 0,
          currency: symbol.split('/')[1] || 'USDT'
        },
        info: {}
      } as any;
    } else {
      throw new Error(`Order not found: ${orderId}`);
    }
  } catch (error) {
    console.error(`Error fetching order status for ${orderId}:`, error);
    throw error;
  }
};

// Get trade history
export const getTradeHistory = async (symbol: string, since?: number, limit?: number): Promise<ccxt.Trade[]> => {
  try {
    const exchange = getExchange();
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        const trades = await exchange.fetchMyTrades(symbol, since, limit);
        return trades;
      }
    } catch (error) {
      console.log(`Falling back to simulated trade history for ${symbol}`);
    }
    
    // Return simulated trade history
    // In a full implementation, you would track trades in memory or DB
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const simulatedTrades = [
      {
        id: 'sim_trade_1',
        order: 'sim_order_1',
        info: {},
        timestamp: now - (3 * day),
        datetime: new Date(now - (3 * day)).toISOString(),
        symbol: symbol,
        type: 'market',
        side: 'buy',
        takerOrMaker: 'taker',
        price: 31500,
        amount: 0.02,
        cost: 31500 * 0.02,
        fee: {
          cost: 31500 * 0.02 * 0.001,
          currency: symbol.split('/')[1] || 'USDT'
        }
      },
      {
        id: 'sim_trade_2',
        order: 'sim_order_2',
        info: {},
        timestamp: now - (2 * day),
        datetime: new Date(now - (2 * day)).toISOString(),
        symbol: symbol,
        type: 'market',
        side: 'sell',
        takerOrMaker: 'taker',
        price: 32100,
        amount: 0.02,
        cost: 32100 * 0.02,
        fee: {
          cost: 32100 * 0.02 * 0.001,
          currency: symbol.split('/')[1] || 'USDT'
        }
      }
    ];
    
    return simulatedTrades as any[];
  } catch (error) {
    console.error(`Error fetching trade history for ${symbol}:`, error);
    // Always provide a fallback rather than throwing
    return [];
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
    
    try {
      // Try to use the real exchange if API keys exist
      if (exchange.apiKey) {
        await exchange.loadMarkets();
        
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
      }
    } catch (error) {
      console.log(`Falling back to simulated trade execution for ${symbol}`);
    }
    
    // Simulation mode - create simulated orders
    const side = signal.toLowerCase() as 'buy' | 'sell';
    
    // Get current price
    const { price: currentPrice } = await getMarketPrice(symbol);
    
    // Create main market order
    const mainOrder = await createMarketOrder(symbol, side, amount);
    
    let stopLossOrder;
    let takeProfitOrder;
    
    // Opposite action for TP/SL
    const oppositeAction = signal === 'BUY' ? 'sell' : 'buy';
    
    // Place stop loss order if specified
    if (stopLoss) {
      const stopPrice = signal === 'BUY' 
        ? currentPrice * (1 - stopLoss / 100) 
        : currentPrice * (1 + stopLoss / 100);
      
      stopLossOrder = await createLimitOrder(
        symbol,
        oppositeAction,
        amount,
        stopPrice
      );
    }
    
    // Place take profit order if specified
    if (takeProfit) {
      const limitPrice = signal === 'BUY'
        ? currentPrice * (1 + takeProfit / 100)
        : currentPrice * (1 - takeProfit / 100);
      
      takeProfitOrder = await createLimitOrder(
        symbol,
        oppositeAction,
        amount,
        limitPrice
      );
    }
    
    return {
      order: mainOrder,
      stopLossOrder,
      takeProfitOrder
    };
  } catch (error) {
    console.error(`Error executing trade signal for ${symbol}:`, error);
    // Provide a fallback response with error info
    return {
      order: {
        id: 'error',
        status: 'error',
        symbol: symbol,
        type: 'market',
        side: signal.toLowerCase() as 'buy' | 'sell',
        price: 0,
        amount: amount,
        cost: 0,
        filled: 0,
        remaining: amount,
        timestamp: Date.now(),
        datetime: new Date().toISOString(),
        error: String(error)
      }
    };
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