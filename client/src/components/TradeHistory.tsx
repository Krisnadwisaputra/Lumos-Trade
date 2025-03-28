import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Trade {
  id: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  cost: number; // Total cost (amount * price)
  fee?: {
    cost: number;
    currency: string;
  };
  timestamp: number;
}

interface TradeHistoryProps {
  userId: number;
  currentPair: string;
}

const TradeHistory = ({ userId, currentPair }: TradeHistoryProps) => {
  const { 
    data: trades = [], 
    isLoading, 
    isError,
    refetch 
  } = useQuery({
    queryKey: ['/api/exchange/trades', currentPair],
    queryFn: async () => {
      try {
        // In production, return apiRequest('GET', `/api/exchange/trades?symbol=${currentPair}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample data for development
        return [
          {
            id: 'trade123',
            symbol: 'BTC/USDT',
            side: 'buy',
            amount: 0.02,
            price: 43100,
            cost: 862,
            fee: {
              cost: 0.863,
              currency: 'USDT'
            },
            timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000
          },
          {
            id: 'trade124',
            symbol: 'BTC/USDT',
            side: 'sell',
            amount: 0.02,
            price: 43700,
            cost: 874,
            fee: {
              cost: 0.874,
              currency: 'USDT'
            },
            timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000
          },
          {
            id: 'trade125',
            symbol: 'ETH/USDT',
            side: 'buy',
            amount: 0.3,
            price: 2450,
            cost: 735,
            fee: {
              cost: 0.735,
              currency: 'USDT'
            },
            timestamp: Date.now() - 12 * 60 * 60 * 1000
          }
        ].filter(trade => trade.symbol === currentPair) as Trade[];
      } catch (error) {
        console.error('Error fetching trade history:', error);
        return [];
      }
    }
  });

  // Refresh trades when pair changes
  useEffect(() => {
    refetch();
  }, [currentPair, refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-8">
            Error loading trade history. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No trade history for {currentPair}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Fee</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade.id} className="border-b last:border-0">
                    <td className={`py-3 ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.side.toUpperCase()}
                    </td>
                    <td className="py-3">${trade.price.toLocaleString()}</td>
                    <td className="py-3">{trade.amount.toFixed(6)}</td>
                    <td className="py-3">${trade.cost.toLocaleString()}</td>
                    <td className="py-3">
                      {trade.fee ? `${trade.fee.cost} ${trade.fee.currency}` : '-'}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(trade.timestamp, { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistory;