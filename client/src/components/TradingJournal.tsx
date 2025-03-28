import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTradeHistory } from "@/lib/trading";
import { Trade } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addManualTrade } from "@/lib/trading";

interface TradingJournalProps {
  userId: number;
}

const TradingJournal = ({ userId }: TradingJournalProps) => {
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 5;

  // Form state for manual trade entry
  const [manualTrade, setManualTrade] = useState({
    pair: "BTC/USDT",
    type: "BUY",
    entryPrice: "",
    exitPrice: "",
    amount: "",
    result: "",
    notes: ""
  });

  useEffect(() => {
    loadTrades();
  }, [userId, currentPage]);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      const data = await getTradeHistory(userId, currentPage, itemsPerPage);
      setTrades(data.trades);
      setTotalTrades(data.total);
    } catch (error) {
      console.error("Error loading trade history:", error);
      toast({
        variant: "destructive",
        title: "Failed to load trades",
        description: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTradeSubmit = async () => {
    try {
      if (!manualTrade.entryPrice || !manualTrade.amount) {
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: "Please fill in all required fields.",
        });
        return;
      }

      const tradeData: Partial<Trade> = {
        userId,
        pair: manualTrade.pair,
        type: manualTrade.type,
        entryPrice: manualTrade.entryPrice as any,
        amount: manualTrade.amount as any,
        status: manualTrade.exitPrice ? "CLOSED" : "OPEN",
        notes: manualTrade.notes,
      };

      if (manualTrade.exitPrice) {
        tradeData.exitPrice = manualTrade.exitPrice as any;
        tradeData.result = manualTrade.result as any;
        tradeData.closedAt = new Date() as any;
      }

      await addManualTrade(tradeData);
      
      toast({
        title: "Trade added",
        description: "Your trade has been added to the journal.",
      });
      
      // Reset form and reload trades
      setManualTrade({
        pair: "BTC/USDT",
        type: "BUY",
        entryPrice: "",
        exitPrice: "",
        amount: "",
        result: "",
        notes: ""
      });
      
      loadTrades();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add trade",
        description: error.message || "Please try again.",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateResult = (trade: Trade) => {
    if (!trade.result) return null;
    
    const result = parseFloat(trade.result.toString());
    const isPositive = result >= 0;
    
    return (
      <span className={isPositive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {isPositive ? '+' : ''}{result.toFixed(2)}%
      </span>
    );
  };

  const totalPages = Math.ceil(totalTrades / itemsPerPage);
  const showingStart = ((currentPage - 1) * itemsPerPage) + 1;
  const showingEnd = Math.min(currentPage * itemsPerPage, totalTrades);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Trading Journal</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary-600 hover:bg-primary-700">
                <i className="fas fa-plus mr-1"></i> Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Trade</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tradePair">Trading Pair</Label>
                    <Select 
                      value={manualTrade.pair}
                      onValueChange={(value) => setManualTrade({...manualTrade, pair: value})}
                    >
                      <SelectTrigger id="tradePair">
                        <SelectValue placeholder="Select pair" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                        <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                        <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tradeType">Type</Label>
                    <Select 
                      value={manualTrade.type}
                      onValueChange={(value) => setManualTrade({...manualTrade, type: value})}
                    >
                      <SelectTrigger id="tradeType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">BUY</SelectItem>
                        <SelectItem value="SELL">SELL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="entryPrice">Entry Price</Label>
                  <Input 
                    id="entryPrice" 
                    value={manualTrade.entryPrice}
                    onChange={(e) => setManualTrade({...manualTrade, entryPrice: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="exitPrice">Exit Price (leave blank for open trades)</Label>
                  <Input 
                    id="exitPrice" 
                    value={manualTrade.exitPrice}
                    onChange={(e) => setManualTrade({...manualTrade, exitPrice: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    value={manualTrade.amount}
                    onChange={(e) => setManualTrade({...manualTrade, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="result">Result % (if closed)</Label>
                  <Input 
                    id="result" 
                    value={manualTrade.result}
                    onChange={(e) => setManualTrade({...manualTrade, result: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input 
                    id="notes" 
                    value={manualTrade.notes}
                    onChange={(e) => setManualTrade({...manualTrade, notes: e.target.value})}
                    placeholder="Trade notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleManualTradeSubmit}>Add Trade</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Pair</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Entry</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Exit</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Result</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-4">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-gray-500">
                    No trades found. Add a manual trade to get started.
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-700">{formatDate(trade.createdAt.toString())}</td>
                    <td className="p-3 text-sm text-gray-700">{trade.pair}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-medium ${
                        trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      } rounded-full`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700">${parseFloat(trade.entryPrice.toString()).toFixed(2)}</td>
                    <td className="p-3 text-sm text-gray-700">
                      {trade.exitPrice ? `$${parseFloat(trade.exitPrice.toString()).toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3">
                      {calculateResult(trade) || '-'}
                    </td>
                    <td className="p-3">
                      <button className="text-primary-600 hover:text-primary-800">
                        <i className="fas fa-info-circle"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalTrades > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {showingStart}-{showingEnd} of {totalTrades} trades
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
              </Button>
              
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                const pageNumber = currentPage > 2 ? currentPage - 1 + i : i + 1;
                if (pageNumber <= totalPages) {
                  return (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                }
                return null;
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-chevron-right"></i>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingJournal;
