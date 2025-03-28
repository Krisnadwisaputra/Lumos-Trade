import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveOrders();
    
    // Poll for active orders updates every 30 seconds
    const intervalId = setInterval(() => {
      fetchActiveOrders();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [currentPair]);

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exchange/orders?symbol=${encodeURIComponent(currentPair)}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching active orders:", error);
      toast({
        title: "Error",
        description: "Failed to load active orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancelling(orderId);
      
      const response = await apiRequest(
        "DELETE", 
        `/api/exchange/order/${orderId}?symbol=${encodeURIComponent(currentPair)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel order");
      }
      
      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully",
      });
      
      // Refresh orders list
      fetchActiveOrders();
      
      // Notify parent component if needed
      if (onOrderCancelled) {
        onOrderCancelled();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setCancelling(null);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center">
          <span>Active Orders</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchActiveOrders} 
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No active orders for {currentPair}
          </div>
        ) : (
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="p-3 border rounded-md flex flex-col"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`font-medium ${order.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground"> • {order.symbol}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancelling === order.id}
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    {cancelling === order.id ? "Cancelling..." : "Cancel"}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    {order.amount} {order.symbol.split('/')[0]}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>{" "}
                    {order.price} {order.symbol.split('/')[1]}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {formatTime(order.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveOrders;