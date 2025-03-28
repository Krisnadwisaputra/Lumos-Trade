import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from '@/lib/queryClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceMetricsProps {
  userId: number;
}

interface PerformanceData {
  winRate: number;
  avgRR: number;
  totalTrades: number;
  totalProfit: number;
  profitHistory: {
    date: string;
    profit: number;
  }[];
}

const PerformanceMetrics = ({ userId }: PerformanceMetricsProps) => {
  const [timeframe, setTimeframe] = useState<string>('week');
  
  const { 
    data: performanceData, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/stats', userId, timeframe],
    queryFn: async () => {
      try {
        // In production, return apiRequest('GET', `/api/stats/${userId}?timeframe=${timeframe}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample data for development
        const data: Record<string, PerformanceData> = {
          day: {
            winRate: 65,
            avgRR: 1.8,
            totalTrades: 5,
            totalProfit: 87.5,
            profitHistory: [
              { date: '09:00', profit: 0 },
              { date: '12:00', profit: 35 },
              { date: '15:00', profit: 42 },
              { date: '18:00', profit: 42 },
              { date: '21:00', profit: 87.5 }
            ]
          },
          week: {
            winRate: 58,
            avgRR: 1.65,
            totalTrades: 12,
            totalProfit: 215.75,
            profitHistory: [
              { date: 'Mon', profit: 0 },
              { date: 'Tue', profit: 35 },
              { date: 'Wed', profit: 75 },
              { date: 'Thu', profit: 120 },
              { date: 'Fri', profit: 165 },
              { date: 'Sat', profit: 190 },
              { date: 'Sun', profit: 215.75 }
            ]
          },
          month: {
            winRate: 62,
            avgRR: 1.72,
            totalTrades: 35,
            totalProfit: 523.25,
            profitHistory: [
              { date: 'Week 1', profit: 0 },
              { date: 'Week 2', profit: 150 },
              { date: 'Week 3', profit: 320 },
              { date: 'Week 4', profit: 523.25 }
            ]
          },
          year: {
            winRate: 59,
            avgRR: 1.68,
            totalTrades: 230,
            totalProfit: 3275.5,
            profitHistory: [
              { date: 'Jan', profit: 0 },
              { date: 'Feb', profit: 250 },
              { date: 'Mar', profit: 520 },
              { date: 'Apr', profit: 850 },
              { date: 'May', profit: 1120 },
              { date: 'Jun', profit: 1350 },
              { date: 'Jul', profit: 1650 },
              { date: 'Aug', profit: 1950 },
              { date: 'Sep', profit: 2300 },
              { date: 'Oct', profit: 2650 },
              { date: 'Nov', profit: 2900 },
              { date: 'Dec', profit: 3275.5 }
            ]
          }
        };
        
        return data[timeframe];
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
        throw error;
      }
    }
  });

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !performanceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-8">
            Error loading performance metrics. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Performance Metrics</span>
          <Tabs defaultValue={timeframe} onValueChange={handleTimeframeChange}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-secondary/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-2xl font-bold">{performanceData.winRate}%</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Avg. Risk/Reward</div>
            <div className="text-2xl font-bold">{performanceData.avgRR}</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-2xl font-bold">{performanceData.totalTrades}</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Profit</div>
            <div className="text-2xl font-bold text-green-500">
              ${formatNumber(performanceData.totalProfit)}
            </div>
          </div>
        </div>
        
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={performanceData.profitHistory}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                formatter={(value) => [`$${formatNumber(Number(value))}`, 'Profit']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                name="Profit"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetrics;