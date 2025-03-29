const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');

// Initialize Express application
const app = express();
app.use(express.json());
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));
  
  // Start sending simulated market data
  const marketSymbol = 'BTC/USDT';
  let lastPrice = 60000 + Math.random() * 2000;
  
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      // Simulate price movements
      const change = (Math.random() - 0.5) * 100;
      lastPrice += change;
      
      const data = {
        type: 'marketData',
        symbol: marketSymbol,
        price: lastPrice.toFixed(2),
        change: change.toFixed(2),
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(data));
    }
  }, 2000);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      // Handle subscription requests
      if (data.type === 'subscribe' && data.symbol) {
        console.log(`Client subscribed to ${data.symbol}`);
        ws.send(JSON.stringify({
          type: 'subscriptionStatus',
          symbol: data.symbol,
          status: 'subscribed',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Current price endpoint
app.get('/api/current-price', (req, res) => {
  const symbol = req.query.symbol || 'BTC/USDT';
  const price = (60000 + Math.random() * 2000).toFixed(2);
  const change = (Math.random() * 2 - 1).toFixed(2) + '%';
  
  res.json({
    symbol,
    price,
    change,
    timestamp: new Date().toISOString()
  });
});

// Exchange balance endpoint
app.get('/api/exchange/balance', (req, res) => {
  res.json({
    status: 'success',
    balance: {
      'USDT': 10000.00,
      'BTC': 0.5,
      'ETH': 5.0
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Trading Platform API is running');
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

// Start server
const port = process.env.PORT || 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});