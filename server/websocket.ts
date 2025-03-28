import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import { log } from './vite';

// Mapping of markets to their respective WebSocket connections
const marketConnections: Map<string, WebSocket> = new Map();

// Track connected clients and their subscriptions
interface ClientSubscription {
  markets: Set<string>;
}

const clients: Map<WebSocket, ClientSubscription> = new Map();

// Initialize WebSocket server
export function initializeWebSocket(server: http.Server) {
  console.log('Initializing WebSocket server...');
  const wss = new WebSocketServer({ server, path: '/ws' });
  console.log('WebSocket server created with path: /ws');
  log('WebSocket server initialized');

  wss.on('connection', (ws) => {
    log('New client connected to WebSocket');
    
    // Initialize client subscription
    clients.set(ws, { markets: new Set() });

    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(ws, data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      log('Client disconnected from WebSocket');
      const subscription = clients.get(ws);
      
      if (subscription) {
        // Clean up subscriptions
        clients.delete(ws);
      }
    });

    // Send initial connection success message
    ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));
  });

  return wss;
}

// Handle messages from clients
function handleClientMessage(client: WebSocket, message: any) {
  const { action, market, markets } = message;

  switch (action) {
    case 'subscribe':
      subscribeToMarket(client, market);
      break;
    
    case 'subscribe_multiple':
      if (Array.isArray(markets)) {
        markets.forEach(m => subscribeToMarket(client, m));
      }
      break;
    
    case 'unsubscribe':
      unsubscribeFromMarket(client, market);
      break;
    
    default:
      client.send(JSON.stringify({ type: 'error', message: 'Unknown action' }));
  }
}

// Subscribe a client to a specific market
function subscribeToMarket(client: WebSocket, market: string) {
  const subscription = clients.get(client);
  
  if (!subscription) {
    return;
  }

  // Add market to client's subscriptions
  subscription.markets.add(market);
  
  // If this is the first client subscribing to this market, create Binance connection
  if (!marketConnections.has(market)) {
    connectToBinanceWebSocket(market);
  }

  client.send(JSON.stringify({ 
    type: 'subscription', 
    status: 'subscribed', 
    market 
  }));
}

// Unsubscribe a client from a specific market
function unsubscribeFromMarket(client: WebSocket, market: string) {
  const subscription = clients.get(client);
  
  if (!subscription) {
    return;
  }

  // Remove market from client's subscriptions
  subscription.markets.delete(market);

  // Check if we need to close the Binance connection
  let isMarketStillNeeded = false;
  
  clients.forEach((sub) => {
    if (sub.markets.has(market)) {
      isMarketStillNeeded = true;
    }
  });

  if (!isMarketStillNeeded && marketConnections.has(market)) {
    const binanceWs = marketConnections.get(market);
    if (binanceWs) {
      binanceWs.close();
      marketConnections.delete(market);
      log(`Closed Binance WebSocket for market: ${market}`);
    }
  }

  client.send(JSON.stringify({ 
    type: 'subscription', 
    status: 'unsubscribed', 
    market 
  }));
}

// Track number of connection attempts
const connectionAttempts: Map<string, number> = new Map();
const MAX_ATTEMPTS = 1; // Reduced for quicker fallback to simulation mode during testing

// Connect to Binance WebSocket for market data
function connectToBinanceWebSocket(market: string) {
  // Count connection attempts
  const attempts = connectionAttempts.get(market) || 0;
  connectionAttempts.set(market, attempts + 1);
  
  // If we've exceeded max attempts, switch to simulation mode
  if (attempts >= MAX_ATTEMPTS) {
    log(`Max connection attempts (${MAX_ATTEMPTS}) reached for ${market}, switching to simulation mode`);
    startSimulationForMarket(market);
    return;
  }
  
  const formattedMarket = market.replace('/', '').toLowerCase();
  const wsEndpoint = `wss://stream.binance.com:9443/ws/${formattedMarket}@kline_1m`;
  
  log(`Connecting to Binance WebSocket for market: ${market} (attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
  
  const ws = new WebSocket(wsEndpoint);
  
  ws.on('open', () => {
    log(`Connected to Binance WebSocket for market: ${market}`);
    marketConnections.set(market, ws);
    // Reset connection attempts on successful connection
    connectionAttempts.set(market, 0);
  });
  
  ws.on('message', (data) => {
    try {
      const marketData = JSON.parse(data.toString());
      broadcastToSubscribers(market, marketData);
    } catch (error) {
      console.error(`Error parsing data from Binance for ${market}:`, error);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`Binance WebSocket error for ${market}:`, error);
    
    // Check if this is a 451 error (geo-blocking)
    if (error.message && error.message.includes('451')) {
      log(`Detected geo-blocking for ${market}, switching to simulation mode`);
      startSimulationForMarket(market);
      return;
    }
  });
  
  ws.on('close', () => {
    log(`Binance WebSocket connection closed for ${market}`);
    marketConnections.delete(market);
    
    // Attempt to reconnect after delay if we still have subscribers
    setTimeout(() => {
      let hasSubscribers = false;
      
      clients.forEach((subscription) => {
        if (subscription.markets.has(market)) {
          hasSubscribers = true;
        }
      });
      
      if (hasSubscribers) {
        // Only try to reconnect if we haven't reached the max attempts
        const attempts = connectionAttempts.get(market) || 0;
        if (attempts < MAX_ATTEMPTS) {
          log(`Attempting to reconnect to Binance WebSocket for ${market}`);
          connectToBinanceWebSocket(market);
        }
      }
    }, 5000);
  });
}

// Simulate market data when connection to real service fails
let simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

function startSimulationForMarket(market: string) {
  // Don't start multiple simulations for the same market
  if (simulationIntervals.has(market)) {
    console.log(`Simulation already running for market: ${market}`);
    return;
  }
  
  console.log(`Starting market data simulation for market: ${market}`);
  log(`Starting market data simulation for ${market}`);
  
  // Notify all clients that we're switching to simulation mode
  clients.forEach((subscription, client) => {
    if (subscription.markets.has(market) && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'simulation_started',
        market: market,
        message: 'Live data connection failed, using simulated data'
      }));
    }
  });
  
  // Get the initial price for this market to use as a baseline
  let basePrice = market.includes('BTC') ? 45000 : market.includes('ETH') ? 2800 : 100;
  let lastCandle = {
    time: Math.floor(Date.now() / 1000),
    open: basePrice,
    high: basePrice * 1.005,
    low: basePrice * 0.995,
    close: basePrice,
    volume: 100 + Math.random() * 900,
    complete: false
  };
  
  // Broadcast initial candle
  broadcastSimulatedData(market, lastCandle);
  
  // Set up interval for continuous updates
  const interval = setInterval(() => {
    // Generate realistic price movements
    const now = Math.floor(Date.now() / 1000);
    const minElapsed = new Date().getMinutes();
    const secondsElapsed = new Date().getSeconds();
    const complete = secondsElapsed === 0;
    
    // For a new minute, create a new candle based on previous close
    if (complete) {
      const prevClose = lastCandle.close;
      lastCandle = {
        time: now,
        open: prevClose,
        high: prevClose,
        low: prevClose,
        close: prevClose,
        volume: 10,
        complete: false
      };
    } else {
      // Update the current candle
      const priceChange = (Math.random() - 0.5) * lastCandle.open * 0.002; // Max 0.2% change
      lastCandle.close = lastCandle.close + priceChange;
      lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
      lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
      lastCandle.volume += 10 + Math.random() * 90;
      lastCandle.time = now;
    }
    
    // Broadcast update
    broadcastSimulatedData(market, lastCandle);
    
    // Check if we need to continue simulation
    let hasSubscribers = false;
    clients.forEach((subscription) => {
      if (subscription.markets.has(market)) {
        hasSubscribers = true;
      }
    });
    
    if (!hasSubscribers) {
      clearInterval(interval);
      simulationIntervals.delete(market);
      log(`Stopped simulation for ${market} (no subscribers)`);
    }
  }, 1000); // Update every second
  
  simulationIntervals.set(market, interval);
}

function broadcastSimulatedData(market: string, candleData: any) {
  // Format data similar to Binance format
  const formattedData = {
    type: 'kline',
    market: market,
    data: candleData,
    source: 'simulation' // Mark this as simulated data
  };
  
  // Send to all clients subscribed to this market
  clients.forEach((subscription, client) => {
    if (subscription.markets.has(market) && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(formattedData));
    }
  });
}

// Broadcast market data to all subscribed clients
function broadcastToSubscribers(market: string, data: any) {
  // Format the data for our clients
  const formattedData = formatBinanceData(market, data);
  
  // Send to all clients subscribed to this market
  clients.forEach((subscription, client) => {
    if (subscription.markets.has(market) && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(formattedData));
    }
  });
}

// Convert Binance data format to our application format
function formatBinanceData(market: string, data: any): any {
  // Format for kline/candlestick data
  if (data.k) {
    const kline = data.k;
    
    return {
      type: 'kline',
      market: market,
      data: {
        time: Math.floor(kline.t / 1000), // Convert to seconds
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
        complete: kline.x
      }
    };
  }
  
  // For other data types, pass through with minimal formatting
  return {
    type: 'market_data',
    market: market,
    data: data
  };
}