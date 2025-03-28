import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TradingPanelProps {
  userId: number;
  currentPair: string;
  currentPrice: number;
}

const TradingPanel = ({ userId, currentPair, currentPrice }: TradingPanelProps) => {
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal points
    const value = e.target.value;
    if (/^(\d*\.?\d*)$/.test(value) || value === "") {
      setAmount(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal points
    const value = e.target.value;
    if (/^(\d*\.?\d*)$/.test(value) || value === "") {
      setLimitPrice(value);
    }
  };

  // Helper function to calculate total value
  const calculateTotal = () => {
    const amountValue = parseFloat(amount) || 0;
    const priceValue = orderType === "market" 
      ? currentPrice 
      : (parseFloat(limitPrice) || currentPrice);
    return (amountValue * priceValue).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "limit" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid limit price greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = orderType === "market" 
        ? "/api/exchange/order/market" 
        : "/api/exchange/order/limit";

      const payload: any = {
        symbol: currentPair,
        side,
        amount: parseFloat(amount),
        userId,
      };

      if (orderType === "limit") {
        payload.price = parseFloat(limitPrice);
      }

      const response = await apiRequest("POST", endpoint, payload);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to place order");
      }

      const data = await response.json();
      
      toast({
        title: "Order placed successfully",
        description: `${side.toUpperCase()} ${amount} ${currentPair} at ${orderType === "market" ? "market price" : limitPrice}`,
      });

      // Reset form after successful submission
      setAmount("");
      if (orderType === "limit") {
        setLimitPrice("");
      }
    } catch (error: any) {
      toast({
        title: "Failed to place order",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="limit">Limit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={side === "buy" ? "default" : "outline"} 
                className={side === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setSide("buy")}
              >
                Buy
              </Button>
              <Button 
                variant={side === "sell" ? "default" : "outline"} 
                className={side === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setSide("sell")}
              >
                Sell
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketAmount">Amount ({currentPair.split('/')[0]})</Label>
              <Input 
                id="marketAmount" 
                type="text" 
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Current Price</Label>
              <div className="p-2 bg-muted rounded-md">
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Value ({currentPair.split('/')[1]})</Label>
              <div className="p-2 bg-muted rounded-md">
                ${calculateTotal()}
              </div>
            </div>

            <Button 
              className="w-full" 
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Processing..." : `${side === "buy" ? "Buy" : "Sell"} ${currentPair.split('/')[0]}`}
            </Button>
          </TabsContent>
          
          <TabsContent value="limit" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={side === "buy" ? "default" : "outline"} 
                className={side === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setSide("buy")}
              >
                Buy
              </Button>
              <Button 
                variant={side === "sell" ? "default" : "outline"} 
                className={side === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setSide("sell")}
              >
                Sell
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limitAmount">Amount ({currentPair.split('/')[0]})</Label>
              <Input 
                id="limitAmount" 
                type="text" 
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limitPrice">Limit Price ({currentPair.split('/')[1]})</Label>
              <Input 
                id="limitPrice" 
                type="text" 
                value={limitPrice}
                onChange={handleLimitPriceChange}
                placeholder={currentPrice.toString()}
              />
              <div className="text-xs text-muted-foreground">
                Current price: ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Value ({currentPair.split('/')[1]})</Label>
              <div className="p-2 bg-muted rounded-md">
                ${calculateTotal()}
              </div>
            </div>

            <Button 
              className="w-full" 
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || !limitPrice || parseFloat(limitPrice) <= 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Processing..." : `${side === "buy" ? "Buy" : "Sell"} ${currentPair.split('/')[0]} at Limit`}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;