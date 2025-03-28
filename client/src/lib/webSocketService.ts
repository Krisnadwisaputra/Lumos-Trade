// WebSocket types
export type WebSocketMessage = {
  type: string;
  market?: string;
  status?: string;
  data?: any;
  source?: 'simulation' | 'live';
  message?: string;
};

type WebSocketCallback = (data: any) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectInterval: number = 5000;
  private url: string = '';
  private marketSubscriptions: Map<string, Set<WebSocketCallback>> = new Map();
  
  constructor() {
    // Don't try to access window during SSR
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Ensure we're using the same path as server-side (/ws)
      this.url = `${protocol}//${window.location.host}/ws`;
    }
  }
  
  // Connect to WebSocket server
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        // Skip WebSocket connection in non-browser environment
        resolve();
        return;
      }
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      // Check if URL is set (should be set in browser environment)
      if (!this.url) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.url = `${protocol}//${window.location.host}/ws`;
      }
      
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnected = true;
        this.reconnectSubscriptions();
        
        // Dispatch a custom event for connected state
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ws-connected'));
        }
        
        resolve();
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        
        // Dispatch a custom event for disconnected state
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ws-disconnected'));
        }
        
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Dispatch a custom event for error state
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ws-error', { detail: error }));
        }
        
        reject(error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }
  
  // Subscribe to real-time updates for a specific market
  public subscribeToMarket(market: string, callback: WebSocketCallback): void {
    if (!this.marketSubscriptions.has(market)) {
      this.marketSubscriptions.set(market, new Set());
      
      // Send subscription request to server if connected
      if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
        const message = {
          action: 'subscribe',
          market
        };
        this.socket.send(JSON.stringify(message));
      }
    }
    
    // Add callback to subscribers
    const callbacks = this.marketSubscriptions.get(market);
    callbacks?.add(callback);
  }
  
  // Unsubscribe from market updates
  public unsubscribeFromMarket(market: string, callback: WebSocketCallback): void {
    const callbacks = this.marketSubscriptions.get(market);
    
    if (callbacks) {
      callbacks.delete(callback);
      
      // If no more callbacks, unsubscribe from server
      if (callbacks.size === 0) {
        this.marketSubscriptions.delete(market);
        
        if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
          const message = {
            action: 'unsubscribe',
            market
          };
          this.socket.send(JSON.stringify(message));
        }
      }
    }
  }
  
  // Close the WebSocket connection
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }
  
  // Handle incoming WebSocket messages
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connection':
        console.log(`WebSocket connection status: ${message.status}`);
        break;
        
      case 'subscription':
        console.log(`Market ${message.market} subscription status: ${message.status}`);
        break;
        
      case 'simulation_started':
        console.log(`Switching to simulation mode for ${message.market}: ${message.message}`);
        
        // Dispatch a custom event for simulation mode
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ws-simulation', { 
            detail: { market: message.market } 
          }));
        }
        break;
        
      case 'kline':
        // Notify subscribers for this market
        const market = message.market || '';
        const callbacks = this.marketSubscriptions.get(market);
        
        // Check if this is simulated data
        if (message.source === 'simulation' && typeof window !== 'undefined') {
          // Ensure we're showing simulation status
          window.dispatchEvent(new CustomEvent('ws-simulation', { 
            detail: { market }
          }));
        }
        
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(message.data);
            } catch (error) {
              console.error('Error in market data callback:', error);
            }
          });
        }
        break;
        
      case 'error':
        console.error('WebSocket error from server:', message.data);
        break;
        
      default:
        console.log('Unhandled WebSocket message type:', message.type, message);
    }
  }
  
  // Schedule reconnection
  private scheduleReconnect(): void {
    if (!this.reconnectTimer) {
      console.log(`Scheduling WebSocket reconnect in ${this.reconnectInterval / 1000}s`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect().catch(error => {
          console.error('Failed to reconnect WebSocket:', error);
          this.scheduleReconnect();
        });
      }, this.reconnectInterval);
    }
  }
  
  // Resubscribe to all markets after reconnection
  private reconnectSubscriptions(): void {
    if (this.marketSubscriptions.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const markets = Array.from(this.marketSubscriptions.keys());
      
      if (markets.length > 0) {
        const message = {
          action: 'subscribe_multiple',
          markets
        };
        
        this.socket.send(JSON.stringify(message));
        console.log('Resubscribed to markets:', markets);
      }
    }
  }
}

// Singleton instance of WebSocketService
export const webSocketService = new WebSocketService();