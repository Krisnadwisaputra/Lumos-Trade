import axios from 'axios';

// Base configuration for axios
const API = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling interceptor
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Health check
export const checkApiHealth = async () => {
  try {
    const response = await API.get('/health');
    return response;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

// Price data
export const getCurrentPrice = async (symbol: string = 'BTC/USDT') => {
  try {
    const response = await API.get(`/current-price?symbol=${encodeURIComponent(symbol)}`);
    return response;
  } catch (error) {
    console.error('Failed to get current price:', error);
    throw error;
  }
};

// Exchange endpoints
export const getAccountBalance = async () => {
  try {
    const response = await API.get('/exchange/balance');
    return response;
  } catch (error) {
    console.error('Failed to get account balance:', error);
    throw error;
  }
};

export const getOpenOrders = async (symbol?: string) => {
  try {
    const url = symbol 
      ? `/exchange/orders?symbol=${encodeURIComponent(symbol)}` 
      : '/exchange/orders';
    const response = await API.get(url);
    return response;
  } catch (error) {
    console.error('Failed to get open orders:', error);
    throw error;
  }
};

export const createMarketOrder = async (data: {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
}) => {
  try {
    const response = await API.post('/exchange/create-order', {
      ...data,
      type: 'MARKET'
    });
    return response;
  } catch (error) {
    console.error('Failed to create market order:', error);
    throw error;
  }
};

export const createLimitOrder = async (data: {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
}) => {
  try {
    const response = await API.post('/exchange/create-order', {
      ...data,
      type: 'LIMIT'
    });
    return response;
  } catch (error) {
    console.error('Failed to create limit order:', error);
    throw error;
  }
};

export const cancelOrder = async (orderId: string, symbol: string) => {
  try {
    const response = await API.delete(`/exchange/order/${orderId}?symbol=${encodeURIComponent(symbol)}`);
    return response;
  } catch (error) {
    console.error('Failed to cancel order:', error);
    throw error;
  }
};

export const getTradeHistory = async (symbol: string = 'BTC/USDT', limit: number = 10) => {
  try {
    const response = await API.get(`/exchange/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Failed to get trade history:', error);
    throw error;
  }
};

export default API;