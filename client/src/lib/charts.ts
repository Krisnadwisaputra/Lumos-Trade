import * as LightweightCharts from 'lightweight-charts';
import { getTimeAsNumber, calculateEMA as calculateEMAHelper } from './chartHelpers';
import webSocketService from './webSocketService';

// Import series types for v5
const { CandlestickSeries, LineSeries } = LightweightCharts;

// Use LightweightCharts.Time type for proper type checking
type ChartTime = LightweightCharts.Time;

interface ChartData {
  time: ChartTime;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Custom interface for our data structure
interface CustomChartData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Type for real-time updates from WebSocket
interface RealtimeUpdate {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  complete: boolean;
}

interface EMASeries {
  [period: number]: LightweightCharts.ISeriesApi<"Line">;
}

export class TradingChart {
  private chart: LightweightCharts.IChartApi;
  private candleSeries: LightweightCharts.ISeriesApi<"Candlestick">;
  private emaSeries: EMASeries = {};
  private container: HTMLElement;
  private currentTimeframe: string = '1h';
  private currentPair: string = 'BTC/USDT';

  constructor(container: HTMLElement) {
    this.container = container;

    // Create chart
    this.chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: {
          color: 'rgba(197, 203, 206, 0.3)',
        },
        horzLines: {
          color: 'rgba(197, 203, 206, 0.3)',
        },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    });

    // Add candlestick series using the v5 approach
    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Handle resizing
    window.addEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    if (this.chart) {
      this.chart.applyOptions({
        width: this.container.clientWidth,
      });
    }
  };

  async loadData(pair: string, timeframe: string) {
    this.currentPair = pair;
    this.currentTimeframe = timeframe;
    
    // Unsubscribe from previous WebSocket connection if different pair
    this.unsubscribeFromRealTimeUpdates();
    
    try {
      const response = await fetch(`/api/chart-data?pair=${pair}&timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      
      const data = await response.json();
      this.updateChart(data);
      
      // Connect to WebSocket and subscribe to real-time updates
      this.subscribeToRealTimeUpdates();
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }
  
  // Subscribe to real-time updates via WebSocket
  private subscribeToRealTimeUpdates() {
    try {
      // Use the webSocketService to subscribe to market updates
      webSocketService.subscribe(this.currentPair, this.handleRealTimeUpdate);
      console.log(`Subscribed to real-time updates for ${this.currentPair}`);
    } catch (error) {
      console.error('Error subscribing to real-time updates:', error);
    }
  }
  
  // Unsubscribe from real-time updates
  private unsubscribeFromRealTimeUpdates() {
    try {
      webSocketService.unsubscribe(this.currentPair, this.handleRealTimeUpdate);
      console.log(`Unsubscribed from real-time updates for ${this.currentPair}`);
    } catch (error) {
      console.error('Error unsubscribing from real-time updates:', error);
    }
  }
  
  // Handle incoming real-time data
  private handleRealTimeUpdate = (update: any) => {
    try {
      if (!update || !update.time) {
        console.error('Invalid real-time update received:', update);
        return;
      }
      
      // Format the timestamp to match our date format
      let timestamp = update.time;
      // Make sure timestamp is a number
      if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);
      }
      
      // Ensure we have a valid timestamp
      if (isNaN(timestamp)) {
        console.error('Invalid timestamp in real-time update:', update);
        return;
      }
      
      // Check if timestamp is in milliseconds (13 digits) or seconds (10 digits)
      // If it's in milliseconds, convert to seconds
      if (timestamp > 10000000000) {
        timestamp = Math.floor(timestamp / 1000);
      }
      
      const date = new Date(timestamp * 1000);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hour = String(date.getUTCHours()).padStart(2, '0');
      const minute = String(date.getUTCMinutes()).padStart(2, '0');
      
      // For minute timeframes, use a more detailed time format
      let formattedTime: string;
      if (this.currentTimeframe.includes('m')) {
        formattedTime = `${year}-${month}-${day} ${hour}:${minute}`;
      } else {
        formattedTime = `${year}-${month}-${day}`;
      }
      
      // Validate price data
      if (typeof update.open !== 'number' || typeof update.high !== 'number' || 
          typeof update.low !== 'number' || typeof update.close !== 'number') {
        console.error('Invalid price data in real-time update:', update);
        return;
      }
      
      // Update the candlestick
      const candleData = {
        time: formattedTime,
        open: update.open,
        high: update.high,
        low: update.low,
        close: update.close
      };
      
      console.log(`Real-time update for ${this.currentPair}: ${JSON.stringify(candleData)}`);
      
      // Make sure candleSeries exists before updating
      if (this.candleSeries) {
        // Update the chart with the latest candle
        this.candleSeries.update(candleData);
      } else {
        console.error('Cannot update chart: candleSeries is not initialized');
      }
      
      // Recalculate EMA values if any are active
      // Note: In a production app, you'd want to calculate this on the server side
      // and send updates via WebSocket for better performance
      for (const period in this.emaSeries) {
        if (this.emaSeries.hasOwnProperty(period)) {
          // Placeholder for EMA update - in real implementation, you would
          // recalculate EMA or subscribe to EMA updates from the server
          console.log(`Would update EMA ${period} with latest candle`);
        }
      }
    } catch (error) {
      console.error('Error handling real-time update:', error);
    }
  }

  updateChart(rawData: any[]) {
    if (this.candleSeries) {
      try {
        if (!Array.isArray(rawData) || rawData.length === 0) {
          console.log('No data to display in the chart');
          return;
        }
        
        // Make a copy of the data and sort by time before processing
        const sortedRawData = [...rawData].sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : parseFloat(a.time);
          const timeB = typeof b.time === 'number' ? b.time : parseFloat(b.time);
          return timeA - timeB;
        });
        
        // Create standardized data for the chart library
        const standardizedData = sortedRawData.map((item, index) => {
          // Ensure consecutive times are properly ordered
          const timestamp = typeof item.time === 'number' ? item.time : parseFloat(item.time);
          
          // Create proper date string in YYYY-MM-DD format using UTC to avoid timezone issues
          const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          
          // Use strict ISO date format (YYYY-MM-DD) which is best supported by the chart library
          const dateString = `${year}-${month}-${day}`;
          
          return {
            // Use string date format which is most reliable with lightweight-charts
            time: dateString,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close)
          };
        });
          
        console.log(`Setting chart data with ${standardizedData.length} candles, first date: ${standardizedData[0]?.time}, last date: ${standardizedData[standardizedData.length-1]?.time}`);
        
        // Set the data to the chart
        this.candleSeries.setData(standardizedData);
        this.chart.timeScale().fitContent();
      } catch (error) {
        console.error('Error updating chart:', error);
      }
    }
  }
  
  // Convert time to proper format for the chart library (YYYY-MM-DD)
  private convertTime(time: number | string): string {
    let timestamp: number;
    
    if (typeof time === 'number') {
      timestamp = time;
    } else if (typeof time === 'string') {
      // Try to parse the string as a number first
      const parsed = parseFloat(time);
      if (!isNaN(parsed)) {
        timestamp = parsed;
      } else {
        // If it's a date string, parse it with Date
        return new Date(time).toISOString().split('T')[0];
      }
    } else {
      // For any other case, return a safe default
      return new Date().toISOString().split('T')[0];
    }
    
    // Convert UNIX timestamp to date string in YYYY-MM-DD format
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  addEMA(period: number) {
    if (this.emaSeries[period]) {
      // EMA already exists
      return;
    }

    const colors: { [key: number]: string } = {
      9: '#2196F3',  // Blue
      20: '#FF9800', // Orange
      50: '#9C27B0'  // Purple
    };

    const color = colors[period] || '#000000';

    // Add EMA series using v5 approach
    this.emaSeries[period] = this.chart.addSeries(LineSeries, {
      color: color,
      lineWidth: 2,
      title: `EMA ${period}`,
    });

    // Load EMA data
    this.loadEMA(period);
  }

  async loadEMA(period: number) {
    try {
      const response = await fetch(`/api/ema?pair=${this.currentPair}&timeframe=${this.currentTimeframe}&period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch EMA data');
      
      const rawData = await response.json();
      
      if (this.emaSeries[period] && Array.isArray(rawData) && rawData.length > 0) {
        try {
          // Make a copy of the data and sort by time before processing
          const sortedRawData = [...rawData].sort((a, b) => {
            const timeA = typeof a.time === 'number' ? a.time : parseFloat(a.time);
            const timeB = typeof b.time === 'number' ? b.time : parseFloat(b.time);
            return timeA - timeB;
          });
          
          // Standardize the EMA data format to match our candlestick format
          const standardizedData = sortedRawData.map((item: any) => {
            // Ensure time is a number for processing
            const timestamp = typeof item.time === 'number' ? item.time : parseFloat(item.time);
            
            // Create proper date string in YYYY-MM-DD format using UTC to avoid timezone issues
            const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            
            // Use strict ISO date format (YYYY-MM-DD) which is best supported
            const dateString = `${year}-${month}-${day}`;
            
            return {
              time: dateString,
              value: parseFloat(item.value)
            };
          });
          
          console.log(`Setting EMA ${period} data with ${standardizedData.length} points, first date: ${standardizedData[0]?.time}, last date: ${standardizedData[standardizedData.length-1]?.time}`);
          
          this.emaSeries[period].setData(standardizedData);
        } catch (error) {
          console.error(`Error setting EMA ${period} data:`, error);
        }
      } else {
        console.log(`No data available for EMA ${period} or series not initialized`);
      }
    } catch (error) {
      console.error(`Error loading EMA ${period} data:`, error);
    }
  }

  removeEMA(period: number) {
    if (this.emaSeries[period]) {
      this.chart.removeSeries(this.emaSeries[period]);
      delete this.emaSeries[period];
    }
  }

  async toggleSMCzones(visible: boolean) {
    try {
      if (visible) {
        // Fetch order blocks from API
        const response = await fetch(`/api/order-blocks?pair=${this.currentPair}&timeframe=${this.currentTimeframe}`);
        if (!response.ok) throw new Error('Failed to fetch order blocks');
        
        const orderBlocks = await response.json();
        
        // Add order blocks as rectangle markers
        orderBlocks.forEach((block: any) => {
          // Create rectangle or marker for order block
          // The implementation depends on the format of order blocks data
          // and the chart library's API for adding shapes
          
          // Example (pseudocode - actual implementation depends on the library):
          // this.chart.createShape({
          //   type: 'rectangle',
          //   points: [...],
          //   color: block.type === 'bullish' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
          //   text: `OB ${block.id}`
          // });
          
          console.log("Would render order block:", block);
        });
      } else {
        // Remove all order block markers
        // Again, implementation depends on the library
        
        // Example (pseudocode):
        // this.chart.removeAllShapes();
        
        console.log("Would remove all order blocks");
      }
    } catch (error) {
      console.error("Error toggling SMC zones:", error);
    }
  }

  destroy() {
    // Clean up WebSocket subscriptions
    this.unsubscribeFromRealTimeUpdates();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Clean up chart
    this.chart.remove();
  }
}

// Export the EMA calculator from helpers
export const calculateEMA = calculateEMAHelper;
