import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { getOrderBlocks } from "@/lib/trading";
import { OrderBlock } from "@shared/schema";

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
  const { toast } = useToast();
  const [orderBlocks, setOrderBlocks] = useState<OBStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOrderBlocks();
  }, [userId]);

  const loadOrderBlocks = async () => {
    setIsLoading(true);
    try {
      const blocks = await getOrderBlocks(userId);
      
      // Transform the data for display
      // In a real application, this transformation might happen on the server side
      const obStats: OBStats[] = blocks.map((block, index) => {
        // Generate stats for demo purposes
        // In a real app, these stats would be calculated from actual trade data
        const winRate = Math.floor(Math.random() * 35) + 45; // 45-80%
        const tradeCount = Math.floor(Math.random() * 15) + 5; // 5-20 trades
        const avgRR = ((Math.random() * 3) + 0.5).toFixed(1); // 0.5-3.5 RR
        
        return {
          id: block.id,
          name: `${block.type === 'BULLISH' ? 'Bullish' : 'Bearish'} OB #${block.id}`,
          type: block.type,
          pair: block.pair,
          timeframe: block.timeframe,
          winRate,
          tradeCount,
          avgRR: parseFloat(avgRR)
        };
      });
      
      setOrderBlocks(obStats);
    } catch (error) {
      console.error("Error loading order blocks:", error);
      toast({
        variant: "destructive",
        title: "Failed to load OB zones",
        description: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">OB Zone Performance</h2>
        
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-3 py-1 animate-pulse">
                <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-32 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : orderBlocks.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No order blocks found. They will appear here when detected.
            </div>
          ) : (
            orderBlocks.map((ob) => (
              <div 
                key={ob.id} 
                className={`border-l-4 ${ob.type === 'BULLISH' ? 'border-green-500' : 'border-red-500'} pl-3 py-1`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-gray-800">{ob.name}</div>
                  <div className={ob.winRate > 50 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {ob.winRate}% Win
                  </div>
                </div>
                <div className="text-sm text-gray-600">{ob.pair} - {ob.timeframe}</div>
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <span>{ob.tradeCount} trades</span>
                  <span className="mx-2">•</span>
                  <span>{ob.avgRR > 0 ? '+' : ''}{ob.avgRR} RR avg</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OBZoneStats;
