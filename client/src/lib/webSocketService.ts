type WebSocketCallback = (data: any) => void;
type WebSocketState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error' | 'simulated';

class WebSocketService {
  private socket: WebSocket | null = null;
  private subscriptions: Map<string, Set<WebSocketCallback>> = new Map();
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private state: WebSocketState = 'connecting';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 1; // Reduced for quicker fallback to simulation
  private reconnectDelay = 1000; // 1 second

  constructor() {
    // Immediately go to simulation mode instead of trying real WebSocket in Replit
    this.fallbackToSimulation();
  }

  private initializeSocket() {
    try {
      // Get the current host and port
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      this.setState('connecting');
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.fallbackToSimulation();
    }
  }
  
  private setState(newState: WebSocketState) {
    this.state = newState;
    
    // Dispatch event for UI components
    if (typeof window !== 'undefined') {
      let eventName: string;
      
      switch (newState) {
        case 'connected':
          eventName = 'ws:connected';
          break;
        case 'error':
          eventName = 'ws:error';
          break;
        case 'simulated':
          eventName = 'ws:simulated';
          break;
        default:
          return; // No event for other states
      }
      
      window.dispatchEvent(new CustomEvent(eventName));
    }
  }
  
  private handleOpen() {
    console.log('WebSocket connection established');
    this.setState('connected');
    this.reconnectAttempts = 0;
    
    // Subscribe to markets
    this.subscriptions.forEach((_, market) => {
      this.sendSubscription(market);
    });
  }
  
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle different message types
      if (message.type === 'kline' && message.market) {
        const market = message.market;
        const callbacks = this.subscriptions.get(market);
        
        if (callbacks) {
          callbacks.forEach(callback => callback(message.data));
        }
      } else if (message.type === 'simulation_started') {
        console.log(`Server switched to simulation mode for ${message.market}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  private handleClose(event: CloseEvent) {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    
    if (this.state !== 'simulated') {
      this.setState('disconnected');
      this.attemptReconnect();
    }
  }
  
  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    this.setState('error');
    
    // If still in error state, immediately fallback to simulation
    this.fallbackToSimulation();
  }
  
  private attemptReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, switching to simulation mode`);
      this.fallbackToSimulation();
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.state !== 'simulated') {
        this.initializeSocket();
      }
    }, delay);
  }
  
  private fallbackToSimulation() {
    console.log('Falling back to simulated data mode');
    
    // Close socket if it exists
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    this.setState('simulated');
    
    // Start simulations for all subscribed markets
    this.subscriptions.forEach((_, market) => {
      this.startSimulation(market);
    });
  }
  
  private sendSubscription(market: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'subscribe',
        market: market
      }));
    }
  }

  private startSimulation(market: string) {
    if (this.simulationIntervals.has(market)) return;
    
    console.log(`Starting simulation for ${market}`);
    
    // Parse the market to get the base currency for price simulation
    const [base] = market.split('/');
    let basePrice = 0;
    
    switch (base) {
      case 'BTC':
        basePrice = 43500;
        break;
      case 'ETH':
        basePrice = 2300;
        break;
      case 'SOL':
        basePrice = 110;
        break;
      case 'BNB':
        basePrice = 350;
        break;
      default:
        basePrice = 100;
    }
    
    const interval = setInterval(() => {
      // Generate random price movement within +/- 0.2%
      const priceChange = (Math.random() - 0.5) * 0.004; // -0.2% to +0.2%
      const newPrice = basePrice * (1 + priceChange);
      basePrice = newPrice;
      
      const simulatedData = {
        market,
        simulated: true,
        time: Date.now() / 1000, // Unix timestamp in seconds
        open: newPrice * (1 - Math.random() * 0.001),
        high: newPrice * (1 + Math.random() * 0.001),
        low: newPrice * (1 - Math.random() * 0.001),
        close: newPrice,
        volume: Math.random() * 10,
        complete: Math.random() > 0.8 // 80% chance of being complete
      };
      
      const callbacks = this.subscriptions.get(market);
      if (callbacks) {
        callbacks.forEach(callback => callback(simulatedData));
      }
    }, 2000); // Simulate data every 2 seconds
    
    this.simulationIntervals.set(market, interval);
  }

  private stopSimulation(market: string) {
    const interval = this.simulationIntervals.get(market);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(market);
    }
  }

  public subscribe(market: string, callback: WebSocketCallback) {
    if (!this.subscriptions.has(market)) {
      this.subscriptions.set(market, new Set());
      
      // If we have an active socket connection, send subscription
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendSubscription(market);
      } 
      // If we're in simulation mode, start simulating data
      else if (this.state === 'simulated') {
        this.startSimulation(market);
      }
    }
    
    this.subscriptions.get(market)?.add(callback);
    
    return () => {
      this.unsubscribe(market, callback);
    };
  }

  public unsubscribe(market: string, callback: WebSocketCallback) {
    const callbacks = this.subscriptions.get(market);
    if (!callbacks) return;
    
    callbacks.delete(callback);
    
    if (callbacks.size === 0) {
      this.subscriptions.delete(market);
      this.stopSimulation(market);
    }
  }

  public getState(): WebSocketState {
    return this.state;
  }

  public close() {
    // Stop all simulations
    this.simulationIntervals.forEach((interval) => clearInterval(interval));
    this.simulationIntervals.clear();
    this.subscriptions.clear();
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;