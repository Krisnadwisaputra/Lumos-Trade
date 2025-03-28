import * as LightweightCharts from 'lightweight-charts';
import { getTimeAsNumber, calculateEMA as calculateEMAHelper } from './chartHelpers';

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
}

// Custom interface for our data structure
interface CustomChartData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
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
    
    try {
      const response = await fetch(`/api/chart-data?pair=${pair}&timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      
      const data = await response.json();
      this.updateChart(data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }

  updateChart(rawData: any[]) {
    if (this.candleSeries) {
      try {
        // Convert timestamps to proper format for lightweight-charts
        const formattedData = rawData.map(item => ({
          time: this.convertTime(item.time),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close)
        }));
        
        // Sort data in ascending order by time - cast to the right type
        formattedData.sort((a: ChartData, b: ChartData) => {
          // Convert time strings to comparable values if needed
          const timeA = getTimeAsNumber(a.time);
          const timeB = getTimeAsNumber(b.time);
          return timeA - timeB;
        });
        
        console.log('Setting chart data with timestamps in this order:', 
          formattedData.map(d => typeof d.time === 'object' ? 
            `${d.time.year}-${d.time.month}-${d.time.day}` : d.time).join(', '));
        
        this.candleSeries.setData(formattedData);
        this.chart.timeScale().fitContent();
      } catch (error) {
        console.error('Error updating chart:', error);
        // Try alternate time format approach if the first one fails
        try {
          // Convert all times to a standard format compatible with the chart library
          const standardizedData = rawData.map(item => {
            // Convert timestamp to ISO string date format (YYYY-MM-DD)
            const date = new Date(getTimeAsNumber(item.time));
            const formattedDate = date.toISOString().split('T')[0];
            
            return {
              time: formattedDate as ChartTime,
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close)
            };
          });
          
          // Sort by timestamp (for our own verification)
          standardizedData.sort((a, b) => {
            const timeA = getTimeAsNumber(a.time);
            const timeB = getTimeAsNumber(b.time);
            return timeA - timeB;
          });
          
          this.candleSeries.setData(standardizedData);
          this.chart.timeScale().fitContent();
          console.log('Chart updated using timestamp-based fallback approach');
        } catch (fallbackError) {
          console.error('Failed to update chart even with fallback approach:', fallbackError);
        }
      }
    }
  }
  
  // Convert time to proper format for the chart library
  private convertTime(time: number | string): ChartTime {
    if (typeof time === 'number') {
      // Convert UNIX timestamp to date string in yyyy-MM-dd format
      const date = new Date(time * 1000);
      return date.toISOString().split('T')[0];
    }
    return time as ChartTime;
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
      
      if (this.emaSeries[period]) {
        try {
          // Convert timestamps to format compatible with the chart library
          const formattedData = rawData.map((item: any) => ({
            time: this.convertTime(item.time),
            value: parseFloat(item.value)
          }));
          
          // Sort data in ascending order by time
          formattedData.sort((a: {time: any, value: number}, b: {time: any, value: number}) => {
            // Convert time values to comparable numbers
            const timeA = getTimeAsNumber(a.time);
            const timeB = getTimeAsNumber(b.time);
            return timeA - timeB;
          });
          
          console.log(`Setting EMA ${period} data with ${formattedData.length} points`);
          this.emaSeries[period].setData(formattedData);
        } catch (formatError) {
          console.error(`Error formatting EMA data:`, formatError);
          
          // Fallback approach with standardized timestamp format
          try {
            const standardizedData = rawData.map((item: any) => {
              // Convert timestamp to ISO string date format (YYYY-MM-DD)
              const date = new Date(getTimeAsNumber(item.time));
              const formattedDate = date.toISOString().split('T')[0];
              
              return {
                time: formattedDate as ChartTime,
                value: parseFloat(item.value)
              };
            });
            
            standardizedData.sort((a: {time: ChartTime, value: number}, b: {time: ChartTime, value: number}) => {
              const timeA = getTimeAsNumber(a.time);
              const timeB = getTimeAsNumber(b.time);
              return timeA - timeB;
            });
            
            this.emaSeries[period].setData(standardizedData);
            console.log(`EMA ${period} updated using timestamp-based fallback approach`);
          } catch (fallbackError) {
            console.error(`Failed to update EMA ${period} even with fallback approach:`, fallbackError);
          }
        }
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
    window.removeEventListener('resize', this.handleResize);
    this.chart.remove();
  }
}

// Export the EMA calculator from helpers
export const calculateEMA = calculateEMAHelper;
