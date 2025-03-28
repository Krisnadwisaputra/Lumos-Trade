import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20); // Default limit

  useEffect(() => {
    fetchTradeHistory();
  }, [currentPair, limit]);

  const fetchTradeHistory = async () => {
    try {
      setLoading(true);
      
      // Calculate timestamp for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const since = sevenDaysAgo.getTime();
      
      const response = await fetch(
        `/api/exchange/trades?symbol=${encodeURIComponent(currentPair)}&since=${since}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }
      
      const data = await response.json();
      setTrades(data);
    } catch (error) {
      console.error("Error fetching trade history:", error);
      toast({
        title: "Error",
        description: "Failed to load trade history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const loadMore = () => {
    setLimit(prevLimit => prevLimit + 20);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center">
          <span>Recent Trades</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTradeHistory} 
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && trades.length === 0 ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No recent trades for {currentPair}
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
              {trades.map((trade) => (
                <div 
                  key={trade.id} 
                  className="p-3 border rounded-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`font-medium ${trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground"> • {trade.symbol}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(trade.timestamp)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>{" "}
                      {trade.amount} {trade.symbol.split('/')[0]}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>{" "}
                      {trade.price} {trade.symbol.split('/')[1]}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{" "}
                      {trade.cost.toFixed(2)} {trade.symbol.split('/')[1]}
                    </div>
                    {trade.fee && (
                      <div>
                        <span className="text-muted-foreground">Fee:</span>{" "}
                        {trade.fee.cost} {trade.fee.currency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {trades.length >= limit && (
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadMore}
                  disabled={loading}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistory;