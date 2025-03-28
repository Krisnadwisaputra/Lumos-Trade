import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPerformanceStats, TradeStats } from "@/lib/trading";
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface PerformanceMetricsProps {
  userId: number;
}

const PerformanceMetrics = ({ userId }: PerformanceMetricsProps) => {
  const { toast } = useToast();
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<TradeStats>({
    winRate: 0,
    avgRR: 0,
    totalTrades: 0,
    totalProfit: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, [userId, timeframe]);

  useEffect(() => {
    if (chartRef.current) {
      initChart();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [stats]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await getPerformanceStats(userId, timeframe);
      setStats(data);
    } catch (error) {
      console.error("Error loading performance stats:", error);
      toast({
        variant: "destructive",
        title: "Failed to load performance metrics",
        description: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initChart = () => {
    const ctx = chartRef.current?.getContext('2d');
    
    if (!ctx) return;
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Calculate win/loss count based on win rate and total trades
    const winCount = Math.round(stats.totalTrades * (stats.winRate / 100));
    const lossCount = stats.totalTrades - winCount;
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [{
          label: 'Trade Performance',
          data: [winCount, lossCount],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0 // Only show whole numbers
            }
          }
        }
      }
    });
  };

  const formatProfit = (profit: number) => {
    return profit >= 0 
      ? `+$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `-$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Performance Metrics</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500">Win Rate</div>
            <div className="text-2xl font-bold text-gray-800">
              {isLoading ? (
                <div className="animate-pulse h-7 w-16 bg-gray-200 rounded"></div>
              ) : (
                `${stats.winRate}%`
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500">Avg R:R</div>
            <div className="text-2xl font-bold text-gray-800">
              {isLoading ? (
                <div className="animate-pulse h-7 w-16 bg-gray-200 rounded"></div>
              ) : (
                stats.avgRR.toFixed(2)
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500">Total Trades</div>
            <div className="text-2xl font-bold text-gray-800">
              {isLoading ? (
                <div className="animate-pulse h-7 w-16 bg-gray-200 rounded"></div>
              ) : (
                stats.totalTrades
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500">Profit</div>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? (
                <div className="animate-pulse h-7 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatProfit(stats.totalProfit)
              )}
            </div>
          </div>
        </div>
        
        {/* Performance Chart */}
        <div className="h-48 rounded-lg">
          <canvas ref={chartRef} height={200}></canvas>
        </div>
        
        {/* Time period selector */}
        <div className="mt-4 flex justify-center">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <Button
              type="button"
              variant={timeframe === 'day' ? 'default' : 'outline'}
              onClick={() => setTimeframe('day')}
              className={timeframe === 'day' ? 'bg-primary-600 text-white' : 'text-primary-700 bg-white'}
              size="sm"
            >
              Day
            </Button>
            <Button
              type="button"
              variant={timeframe === 'week' ? 'default' : 'outline'}
              onClick={() => setTimeframe('week')}
              className={timeframe === 'week' ? 'bg-primary-600 text-white' : 'text-primary-700 bg-white'}
              size="sm"
            >
              Week
            </Button>
            <Button
              type="button"
              variant={timeframe === 'month' ? 'default' : 'outline'}
              onClick={() => setTimeframe('month')}
              className={timeframe === 'month' ? 'bg-primary-600 text-white' : 'text-primary-700 bg-white'}
              size="sm"
            >
              Month
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetrics;
