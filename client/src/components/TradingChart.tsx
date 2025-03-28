import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { TradingChart as ChartCore } from '@/lib/charts';
import { apiRequest } from '@/lib/queryClient';

interface TradingChartProps {
  pair?: string;
  timeframe?: string;
  userId?: number;
}

const TradingChart = ({ pair = "BTC/USDT", timeframe = "1h", userId }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chart, setChart] = useState<ChartCore | null>(null);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showSMC, setShowSMC] = useState(false);
  
  // Fetch chart data from API
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['/api/chart-data', pair, timeframe],
    queryFn: async () => {
      try {
        return apiRequest('GET', `/api/chart-data?pair=${pair}&timeframe=${timeframe}`);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        return null;
      }
    },
    // Refetch every minute
    refetchInterval: 60000
  });
  
  // Initialize chart when component mounts
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Create chart instance
    const newChart = new ChartCore(chartContainerRef.current);
    setChart(newChart);
    
    // Add EMA indicators
    if (showEMA9) newChart.addEMA(9);
    if (showEMA21) newChart.addEMA(21);
    
    // Load chart data
    newChart.loadData(pair, timeframe);
    
    // Destroy chart on component unmount
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, []);

  // Update chart when pair or timeframe changes
  useEffect(() => {
    if (chart) {
      chart.loadData(pair, timeframe);
    }
  }, [chart, pair, timeframe]);

  // Update EMA indicators
  useEffect(() => {
    if (!chart) return;
    
    if (showEMA9) {
      chart.addEMA(9);
    } else {
      chart.removeEMA(9);
    }
    
    if (showEMA21) {
      chart.addEMA(21);
    } else {
      chart.removeEMA(21);
    }
  }, [chart, showEMA9, showEMA21]);

  // Update SMC zones
  useEffect(() => {
    if (!chart) return;
    chart.toggleSMCzones(showSMC);
  }, [chart, showSMC]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end px-4 py-2 border-b">
        <div className="flex items-center space-x-2">
          <Toggle
            pressed={showEMA9}
            onPressedChange={setShowEMA9}
            aria-label="Toggle EMA 9"
            className="data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
          >
            EMA 9
          </Toggle>
          <Toggle
            pressed={showEMA21}
            onPressedChange={setShowEMA21}
            aria-label="Toggle EMA 21"
            className="data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
          >
            EMA 21
          </Toggle>
          <Toggle
            pressed={showSMC}
            onPressedChange={setShowSMC}
            aria-label="Toggle SMC Zones"
            className="data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
          >
            SMC Zones
          </Toggle>
        </div>
      </div>
      
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
        <div 
          ref={chartContainerRef} 
          className="w-full h-full"
        ></div>
      </div>
    </div>
  );
};

export default TradingChart;