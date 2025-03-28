import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';

interface Order {
  id: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  status: string;
  timestamp: number;
}

interface ActiveOrdersProps {
  userId: number;
  currentPair: string;
  onOrderCancelled?: () => void;
}

const ActiveOrders = ({ userId, currentPair, onOrderCancelled }: ActiveOrdersProps) => {
  const { toast } = useToast();
  
  const { 
    data: orders = [], 
    isLoading, 
    isError,
    refetch 
  } = useQuery({
    queryKey: ['/api/exchange/orders', currentPair],
    queryFn: async () => {
      try {
        // In production, return apiRequest('GET', `/api/exchange/orders?symbol=${currentPair}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return [
          {
            id: '12345',
            symbol: 'BTC/USDT',
            side: 'buy',
            amount: 0.05,
            price: 42500,
            status: 'open',
            timestamp: Date.now() - 45 * 60 * 1000
          },
          {
            id: '12346',
            symbol: 'BTC/USDT',
            side: 'sell',
            amount: 0.03,
            price: 44300,
            status: 'open',
            timestamp: Date.now() - 2 * 60 * 60 * 1000
          }
        ].filter(order => order.symbol === currentPair) as Order[];
      } catch (error) {
        console.error('Error fetching active orders:', error);
        return [];
      }
    }
  });

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  const handleCancelOrder = async (orderId: string, symbol: string) => {
    try {
      // In production use apiRequest:
      // await apiRequest('DELETE', `/api/exchange/order/${orderId}?symbol=${encodeURIComponent(symbol)}`);
      
      toast({
        title: 'Order cancelled',
        description: `Order ${orderId.slice(0, 8)}... has been cancelled`,
      });
      
      if (onOrderCancelled) {
        onOrderCancelled();
      }
      
      refetch();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel order. Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
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
          <CardTitle>Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-8">
            Error loading orders. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Active Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No active orders for {currentPair}
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
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className={`py-3 ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                      {order.side.toUpperCase()}
                    </td>
                    <td className="py-3">${order.price.toLocaleString()}</td>
                    <td className="py-3">{order.amount.toFixed(6)}</td>
                    <td className="py-3">${(order.amount * order.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(order.timestamp, { addSuffix: true })}
                    </td>
                    <td className="py-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCancelOrder(order.id, order.symbol)}
                        title="Cancel order"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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

export default ActiveOrders;