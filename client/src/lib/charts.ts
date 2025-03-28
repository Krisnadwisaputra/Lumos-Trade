import * as LightweightCharts from 'lightweight-charts';

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
      // Convert timestamps to proper format for lightweight-charts
      const formattedData = rawData.map(item => ({
        time: this.convertTime(item.time),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close
      }));
      
      this.candleSeries.setData(formattedData);
      this.chart.timeScale().fitContent();
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
        // Convert timestamps to format compatible with the chart library
        const formattedData = rawData.map((item: any) => ({
          time: this.convertTime(item.time),
          value: item.value
        }));
        
        this.emaSeries[period].setData(formattedData);
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

  toggleSMCzones(visible: boolean) {
    // Implementation for showing/hiding SMC order blocks
    // This would add/remove rectangle markers or series for OB zones
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    this.chart.remove();
  }
}

// Helper function to calculate EMA
export const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  let emaArray = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  
  return emaArray;
};
