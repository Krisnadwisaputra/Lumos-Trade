import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';

interface ChartData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface EMASeries {
  [period: number]: ISeriesApi<"Line">;
}

export class TradingChart {
  private chart: IChartApi;
  private candleSeries: ISeriesApi<"Candlestick">;
  private emaSeries: EMASeries = {};
  private container: HTMLElement;
  private currentTimeframe: string = '1h';
  private currentPair: string = 'BTC/USDT';

  constructor(container: HTMLElement) {
    this.container = container;

    // Create chart
    this.chart = createChart(container, {
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
        mode: 0, // Normal mode
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    });

    // Add candlestick series
    this.candleSeries = this.chart.addCandlestickSeries({
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

  updateChart(data: ChartData[]) {
    if (this.candleSeries) {
      this.candleSeries.setData(data);
      this.chart.timeScale().fitContent();
    }
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

    // Add EMA series
    this.emaSeries[period] = this.chart.addLineSeries({
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
      
      const data = await response.json();
      
      if (this.emaSeries[period]) {
        this.emaSeries[period].setData(data);
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
