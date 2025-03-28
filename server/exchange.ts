import * as ccxt from 'ccxt';
import { log } from './vite';

// Initialize the Binance exchange with API credentials
const initializeBinance = () => {
  try {
    const binance = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      }
    });

    log('Binance exchange initialized successfully', 'exchange');
    return binance;
  } catch (error) {
    log(`Error initializing Binance: ${error}`, 'exchange');
    throw new Error(`Failed to initialize Binance exchange: ${error}`);
  }
};

// Singleton instance of the exchange
let exchange: ccxt.Exchange | null = null;

// Get exchange instance (create if doesn't exist)
export const getExchange = (): ccxt.Exchange => {
  if (!exchange) {
    exchange = initializeBinance();
  }
  return exchange;
};

// Fetch account balance
export const getAccountBalance = async (): Promise<any> => {
  try {
    const exchange = getExchange();
    const balance = await exchange.fetchBalance();
    
    // Process the balance data to ensure consistent format
    const processedBalance: { [key: string]: { free: number, used: number, total: number } } = {};
    
    // Extract only the relevant currency balances (non-zero)
    for (const [currency, data] of Object.entries(balance)) {
      if (currency !== 'info' && currency !== 'timestamp' && currency !== 'datetime' && currency !== 'free' && currency !== 'used' && currency !== 'total') {
        processedBalance[currency] = {
          free: Number(data.free) || 0,
          used: Number(data.used) || 0,
          total: Number(data.total) || 0
        };
      }
    }
    
    return processedBalance;
  } catch (error) {
    log(`Error fetching balance: ${error}`, 'exchange');
    throw new Error(`Failed to fetch account balance: ${error}`);
  }
};

// Fetch market price for a symbol
export const getMarketPrice = async (symbol: string): Promise<{ price: number, timestamp: number }> => {
  try {
    const exchange = getExchange();
    const ticker = await exchange.fetchTicker(symbol);
    return {
      price: ticker.last || 0,
      timestamp: ticker.timestamp || Date.now()
    };
  } catch (error) {
    log(`Error fetching market price for ${symbol}: ${error}`, 'exchange');
    throw new Error(`Failed to fetch market price for ${symbol}: ${error}`);
  }
};

// Create a market order
export const createMarketOrder = async (
  symbol: string,
  side: 'buy' | 'sell',
  amount: number
): Promise<ccxt.Order> => {
  try {
    const exchange = getExchange();
    const order = await exchange.createOrder(symbol, 'market', side, amount);
    log(`Created ${side} market order for ${amount} ${symbol}`, 'exchange');
    return order;
  } catch (error) {
    log(`Error creating market order: ${error}`, 'exchange');
    throw new Error(`Failed to create market order: ${error}`);
  }
};

// Create a limit order
export const createLimitOrder = async (
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number
): Promise<ccxt.Order> => {
  try {
    const exchange = getExchange();
    const order = await exchange.createOrder(symbol, 'limit', side, amount, price);
    log(`Created ${side} limit order for ${amount} ${symbol} at ${price}`, 'exchange');
    return order;
  } catch (error) {
    log(`Error creating limit order: ${error}`, 'exchange');
    throw new Error(`Failed to create limit order: ${error}`);
  }
};

// Fetch open orders
export const getOpenOrders = async (symbol?: string): Promise<ccxt.Order[]> => {
  try {
    const exchange = getExchange();
    const orders = await exchange.fetchOpenOrders(symbol);
    return orders;
  } catch (error) {
    log(`Error fetching open orders: ${error}`, 'exchange');
    throw new Error(`Failed to fetch open orders: ${error}`);
  }
};

// Cancel an order
export const cancelOrder = async (orderId: string, symbol: string): Promise<any> => {
  try {
    const exchange = getExchange();
    const result = await exchange.cancelOrder(orderId, symbol);
    log(`Cancelled order ${orderId} for ${symbol}`, 'exchange');
    return result;
  } catch (error) {
    log(`Error cancelling order: ${error}`, 'exchange');
    throw new Error(`Failed to cancel order: ${error}`);
  }
};

// Get order status
export const getOrderStatus = async (orderId: string, symbol: string): Promise<ccxt.Order> => {
  try {
    const exchange = getExchange();
    const order = await exchange.fetchOrder(orderId, symbol);
    return order;
  } catch (error) {
    log(`Error fetching order status: ${error}`, 'exchange');
    throw new Error(`Failed to fetch order status: ${error}`);
  }
};

// Fetch historical trades
export const getTradeHistory = async (symbol: string, since?: number, limit?: number): Promise<ccxt.Trade[]> => {
  try {
    const exchange = getExchange();
    const trades = await exchange.fetchMyTrades(symbol, since, limit);
    return trades;
  } catch (error) {
    log(`Error fetching trade history: ${error}`, 'exchange');
    throw new Error(`Failed to fetch trade history: ${error}`);
  }
};

// Support for handling trade signals and automated order execution
export const executeTradeSignal = async (
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  orderType: 'market' | 'limit',
  price?: number
): Promise<ccxt.Order> => {
  try {
    if (orderType === 'market') {
      return await createMarketOrder(symbol, side, amount);
    } else if (orderType === 'limit' && price) {
      return await createLimitOrder(symbol, side, amount, price);
    } else {
      throw new Error('Invalid order parameters');
    }
  } catch (error) {
    log(`Error executing trade signal: ${error}`, 'exchange');
    throw new Error(`Failed to execute trade signal: ${error}`);
  }
};

// Format pair to correct exchange format
export const formatPair = (pair: string): string => {
  // Convert format like 'BTC/USDT' to 'BTCUSDT' for Binance
  return pair.replace('/', '');
};

// Initialize the exchange when the server starts
export const initializeExchange = (): void => {
  try {
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
      log('Binance API credentials not found. Live trading will not be available.', 'exchange');
      return;
    }
    
    getExchange();
    log('Exchange integration ready for live trading', 'exchange');
  } catch (error) {
    log(`Failed to initialize exchange: ${error}`, 'exchange');
  }
};