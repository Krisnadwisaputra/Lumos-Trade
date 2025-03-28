import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface AutoTradeLogsProps {
  userId: number;
}

interface LogEntry {
  id: number;
  userId: number;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
  timestamp: string;
}

const AutoTradeLogs = ({ userId }: AutoTradeLogsProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { 
    data: logs = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/bot-logs', userId],
    queryFn: async () => {
      try {
        // For development we're using sample data
        // Return apiRequest('GET', `/api/bot-logs/${userId}`) in production
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample data
        return [
          {
            id: 1,
            userId,
            message: 'Bot started watching BTC/USDT on 1h timeframe',
            type: 'info',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 2,
            userId,
            message: 'EMA crossover detected (9 EMA crossed above 21 EMA)',
            type: 'info',
            timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            userId,
            message: 'Bullish SMC pattern detected at 43,250 USDT',
            type: 'success',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 4,
            userId,
            message: 'Market order placed: Buy 0.01 BTC at 43,250 USDT',
            type: 'success',
            timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString()
          },
          {
            id: 5,
            userId,
            message: 'Stop loss set at 42,800 USDT',
            type: 'info',
            timestamp: new Date(Date.now() - 54 * 60 * 1000).toISOString()
          },
          {
            id: 6,
            userId,
            message: 'Take profit set at 44,150 USDT',
            type: 'info',
            timestamp: new Date(Date.now() - 53 * 60 * 1000).toISOString()
          },
          {
            id: 7,
            userId,
            message: 'Price approaching take profit target',
            type: 'info',
            timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString()
          },
          {
            id: 8,
            userId,
            message: 'Take profit executed: Sell 0.01 BTC at 44,120 USDT',
            type: 'success',
            timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
          },
          {
            id: 9,
            userId,
            message: 'Profit: +87 USDT (2.01%)',
            type: 'success',
            timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString()
          },
          {
            id: 10,
            userId,
            message: 'Bot scanning for new trade setups',
            type: 'info',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          }
        ] as LogEntry[];
      } catch (error) {
        console.error('Error fetching bot logs:', error);
        return [];
      }
    }
  });

  // Auto-refresh logs every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  const filteredLogs = activeTab === 'all' 
    ? logs 
    : logs.filter(log => log.type === activeTab);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bot Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="text-center">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <div>Loading logs...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bot Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center p-4">
            Error loading bot logs. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Bot Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="all" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="success">Trades</TabsTrigger>
            <TabsTrigger value="error">Errors</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs available in this category
                  </div>
                ) : (
                  filteredLogs
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(log => (
                      <div key={log.id} className="flex gap-2 border-b pb-2 last:border-0">
                        <div className="flex-shrink-0 pt-0.5">
                          {getTypeIcon(log.type)}
                        </div>
                        <div className="flex-grow">
                          <p className={`${getTypeColor(log.type)} font-medium`}>
                            {log.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AutoTradeLogs;