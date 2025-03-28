import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

interface OBStats {
  id: number;
  name: string;
  type: string;
  pair: string;
  timeframe: string;
  winRate: number;
  tradeCount: number;
  avgRR: number;
}

interface OBZoneStatsProps {
  userId: number;
}

const OBZoneStats = ({ userId }: OBZoneStatsProps) => {
  const [filter, setFilter] = useState<string>('all');
  
  const { 
    data: orderBlocks = [], 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/order-blocks', userId],
    queryFn: async () => {
      try {
        // In production, return apiRequest('GET', `/api/order-blocks/${userId}`);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        return [
          {
            id: 1,
            name: 'BTC Daily OB',
            type: 'bullish',
            pair: 'BTC/USDT',
            timeframe: '1d',
            winRate: 75,
            tradeCount: 12,
            avgRR: 2.1
          },
          {
            id: 2,
            name: 'ETH Support Zone',
            type: 'bullish',
            pair: 'ETH/USDT',
            timeframe: '4h',
            winRate: 68,
            tradeCount: 9,
            avgRR: 1.8
          },
          {
            id: 3,
            name: 'BTC Resistance',
            type: 'bearish',
            pair: 'BTC/USDT',
            timeframe: '1h',
            winRate: 62,
            tradeCount: 15,
            avgRR: 1.5
          },
          {
            id: 4,
            name: 'SOL Breakout Level',
            type: 'bullish',
            pair: 'SOL/USDT',
            timeframe: '4h',
            winRate: 80,
            tradeCount: 5,
            avgRR: 2.5
          },
          {
            id: 5,
            name: 'BTC Distribution',
            type: 'bearish',
            pair: 'BTC/USDT',
            timeframe: '1d',
            winRate: 70,
            tradeCount: 7,
            avgRR: 1.9
          }
        ] as OBStats[];
      } catch (error) {
        console.error('Error fetching order block stats:', error);
        return [];
      }
    }
  });

  const filteredOBs = filter === 'all' 
    ? orderBlocks 
    : orderBlocks.filter(ob => ob.type === filter);

  const getTypeColor = (type: string) => {
    return type === 'bullish' ? 'text-green-500' : 'text-red-500';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'bg-green-500/20 text-green-500 border-green-500/50';
    if (winRate >= 50) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
    return 'bg-red-500/20 text-red-500 border-red-500/50';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Block & SMC Zone Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Block & SMC Zone Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-8">
            Error loading order block stats. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Order Block & SMC Zone Stats</span>
          <div className="flex space-x-2">
            <Badge 
              variant="outline" 
              className={`cursor-pointer ${filter === 'all' ? 'bg-primary/20 text-primary border-primary/50' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </Badge>
            <Badge 
              variant="outline" 
              className={`cursor-pointer ${filter === 'bullish' ? 'bg-green-500/20 text-green-500 border-green-500/50' : ''}`}
              onClick={() => setFilter('bullish')}
            >
              Bullish
            </Badge>
            <Badge 
              variant="outline" 
              className={`cursor-pointer ${filter === 'bearish' ? 'bg-red-500/20 text-red-500 border-red-500/50' : ''}`}
              onClick={() => setFilter('bearish')}
            >
              Bearish
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredOBs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No order blocks found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Trades</TableHead>
                <TableHead>Avg R:R</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOBs.map(ob => (
                <TableRow key={ob.id}>
                  <TableCell className="font-medium">{ob.name}</TableCell>
                  <TableCell className={getTypeColor(ob.type)}>
                    {ob.type.charAt(0).toUpperCase() + ob.type.slice(1)}
                  </TableCell>
                  <TableCell>
                    {ob.pair}
                    <span className="text-xs text-muted-foreground ml-1">({ob.timeframe})</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getWinRateColor(ob.winRate)}
                    >
                      {ob.winRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>{ob.tradeCount}</TableCell>
                  <TableCell>{ob.avgRR.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default OBZoneStats;