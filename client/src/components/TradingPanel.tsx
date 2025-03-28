import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { apiRequest } from '@/lib/queryClient';

interface TradingPanelProps {
  userId: number;
  currentPair: string;
  currentPrice: number;
}

const TradingPanel = ({ userId, currentPair, currentPrice }: TradingPanelProps) => {
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<string>('market');
  const [side, setSide] = useState<string>('buy');
  const [amount, setAmount] = useState<string>('0.01');
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [total, setTotal] = useState<string>('0');
  const [usePercentage, setUsePercentage] = useState<boolean>(false);
  const [percentageAmount, setPercentageAmount] = useState<number[]>([25]);
  const [useTpSl, setUseTpSl] = useState<boolean>(false);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Update price when currentPrice changes
  useState(() => {
    setPrice(currentPrice.toString());
  });

  // When amount or price changes, calculate the total
  const updateTotal = (newAmount: string, newPrice: string) => {
    if (newAmount && newPrice) {
      const calculatedTotal = parseFloat(newAmount) * parseFloat(newPrice);
      setTotal(calculatedTotal.toFixed(2));
    } else {
      setTotal('0');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setAmount(newAmount);
    updateTotal(newAmount, price);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value;
    setPrice(newPrice);
    updateTotal(amount, newPrice);
  };

  const handlePercentageChange = (values: number[]) => {
    setPercentageAmount(values);
    // Calculate amount based on percentage of account balance
    // In a real app, this would use the user's actual balance
    const estimatedBalance = 1000; // USD
    const maxAmount = estimatedBalance / parseFloat(price);
    const newAmount = (maxAmount * values[0] / 100).toFixed(6);
    setAmount(newAmount);
    updateTotal(newAmount, price);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
      });
      return;
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Invalid price',
        description: 'Please enter a valid price',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare the order data
      const orderData = {
        userId,
        symbol: currentPair,
        side,
        amount: parseFloat(amount),
        price: orderType === 'market' ? null : parseFloat(price),
        takeProfit: useTpSl && takeProfit ? parseFloat(takeProfit) : null,
        stopLoss: useTpSl && stopLoss ? parseFloat(stopLoss) : null,
      };

      // In a real application, send the order to the API
      // const endpoint = orderType === 'market' 
      //   ? '/api/exchange/order/market' 
      //   : '/api/exchange/order/limit';
      // await apiRequest('POST', endpoint, orderData);
      
      // For development, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success toast
      toast({
        title: 'Order submitted',
        description: `${side.toUpperCase()} ${amount} ${currentPair.split('/')[0]} at ${orderType === 'market' ? 'market price' : `$${price}`}`,
      });
      
      // Reset form
      setAmount('0.01');
      if (orderType === 'limit') {
        setPrice(currentPrice.toString());
      }
      setTakeProfit('');
      setStopLoss('');
      setPercentageAmount([25]);
      updateTotal('0.01', currentPrice.toString());
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to place order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate take profit and stop loss based on current price
  const calculateTpSl = () => {
    if (side === 'buy') {
      // For buy orders, TP is above entry, SL is below
      const tpPrice = parseFloat(price) * 1.05; // 5% profit
      const slPrice = parseFloat(price) * 0.98; // 2% loss
      setTakeProfit(tpPrice.toFixed(2));
      setStopLoss(slPrice.toFixed(2));
    } else {
      // For sell orders, TP is below entry, SL is above
      const tpPrice = parseFloat(price) * 0.95; // 5% profit
      const slPrice = parseFloat(price) * 1.02; // 2% loss
      setTakeProfit(tpPrice.toFixed(2));
      setStopLoss(slPrice.toFixed(2));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Trade {currentPair}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="market" onValueChange={setOrderType}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="limit">Limit</TabsTrigger>
          </TabsList>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={side === 'buy' ? 'default' : 'outline'} 
                className={side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setSide('buy')}
              >
                Buy
              </Button>
              <Button 
                variant={side === 'sell' ? 'default' : 'outline'} 
                className={side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                onClick={() => setSide('sell')}
              >
                Sell
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount ({currentPair.split('/')[0]})</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Use %</span>
                  <Switch 
                    checked={usePercentage} 
                    onCheckedChange={setUsePercentage} 
                  />
                </div>
              </div>
              
              {usePercentage ? (
                <div className="space-y-2">
                  <Slider 
                    value={percentageAmount} 
                    onValueChange={handlePercentageChange}
                    max={100}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              ) : (
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={isSubmitting}
                />
              )}
            </div>
            
            {orderType === 'limit' && (
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={handlePriceChange}
                  disabled={isSubmitting}
                />
              </div>
            )}
            
            <div className="flex justify-between py-2 border-t border-b">
              <span>Total</span>
              <span className="font-medium">${total} USD</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tp-sl">Take Profit / Stop Loss</Label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="tp-sl"
                    checked={useTpSl} 
                    onCheckedChange={(checked) => {
                      setUseTpSl(checked);
                      if (checked) {
                        calculateTpSl();
                      }
                    }} 
                  />
                </div>
              </div>
              
              {useTpSl && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="takeProfit" className="text-xs text-green-500">Take Profit</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      disabled={isSubmitting}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss" className="text-xs text-red-500">Stop Loss</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      step="0.01"
                      min="0"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      disabled={isSubmitting}
                      className="h-8"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className={`w-full ${side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                `${side === 'buy' ? 'Buy' : 'Sell'} ${currentPair.split('/')[0]}`
              )}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;