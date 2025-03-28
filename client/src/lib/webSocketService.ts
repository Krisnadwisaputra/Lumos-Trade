type WebSocketCallback = (data: any) => void;
type WebSocketState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error' | 'simulated';

class WebSocketService {
  private subscriptions: Map<string, Set<WebSocketCallback>> = new Map();
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private state: WebSocketState = 'simulated';

  constructor() {
    console.log('WebSocket Service initialized in simulation mode');
    // Only dispatch event if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Dispatch a custom event for simulation mode
      const event = new CustomEvent('ws:simulated');
      window.dispatchEvent(event);
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
      this.startSimulation(market);
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