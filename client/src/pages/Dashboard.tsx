import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import TradingChart from '@/components/TradingChart';
import TradingPanel from '@/components/TradingPanel';
import ConnectionStatus from '@/components/ConnectionStatus';
import AutoTradingPanel from '@/components/AutoTradingPanel';
import AutoTradeLogs from '@/components/AutoTradeLogs';
import ActiveOrders from '@/components/ActiveOrders';
import TradeHistory from '@/components/TradeHistory';
import OBZoneStats from '@/components/OBZoneStats';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const { toast } = useToast();
  const [currentPair, setCurrentPair] = useState<string>("BTC/USDT");
  const [currentTimeframe, setCurrentTimeframe] = useState<string>("1h");
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [userId, setUserId] = useState<number>(1); // This would come from the API in production
  
  const { data: currentPrice = 0 } = useQuery({
    queryKey: ['/api/current-price', currentPair],
    queryFn: async () => {
      try {
        // In production, return apiRequest('GET', `/api/current-price?pair=${currentPair}`)
        return 43500.25;
      } catch (error) {
        console.error('Error fetching current price:', error);
        return 0;
      }
    },
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const { data: balance = "0.00" } = useQuery({
    queryKey: ['/api/exchange/balance'],
    queryFn: async () => {
      try {
        // In production, return apiRequest('GET', '/api/exchange/balance')
        return "10,250.50";
      } catch (error) {
        console.error('Error fetching account balance:', error);
        return "0.00";
      }
    },
    refetchInterval: 60000 // Refetch every minute
  });
  
  useEffect(() => {
    // When user logs in, check if they exist in our database
    // If not, create them
    const createUserIfNeeded = async () => {
      try {
        // Check if the user exists in our database
        // const existingUser = await apiRequest('GET', `/api/users/by-firebase/${user.uid}`);
        
        // If the user doesn't exist, create them
        // if (!existingUser) {
        //   const newUser = await apiRequest('POST', '/api/users', {
        //     firebaseUid: user.uid,
        //     email: user.email,
        //     name: user.displayName || user.email?.split('@')[0] || 'User'
        //   });
        //   setUserId(newUser.id);
        // } else {
        //   setUserId(existingUser.id);
        // }
      } catch (error) {
        console.error('Error creating user:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to set up your user account. Please try again.',
        });
      }
    };
    
    createUserIfNeeded();
  }, [user, toast]);

  const handlePairChange = (pair: string) => {
    setCurrentPair(pair);
  };

  const handleTimeframeChange = (timeframe: string) => {
    setCurrentTimeframe(timeframe);
  };

  const handleBotStatusChange = (isRunning: boolean) => {
    setIsBotRunning(isRunning);
    
    // Show a toast notification when the bot status changes
    toast({
      title: isRunning ? 'Bot Started' : 'Bot Stopped',
      description: isRunning 
        ? 'Auto trading bot is now active' 
        : 'Auto trading bot has been deactivated',
    });
  };
  
  const handleOrderPlaced = () => {
    // Refetch active orders
    // activeOrdersRefetch();
  };

  const handleOrderCancelled = () => {
    // Refetch active orders
    // activeOrdersRefetch();
  };
  
  const availablePairs = [
    { value: "BTC/USDT", label: "BTC/USDT" },
    { value: "ETH/USDT", label: "ETH/USDT" },
    { value: "BNB/USDT", label: "BNB/USDT" },
    { value: "SOL/USDT", label: "SOL/USDT" }
  ];
  
  const availableTimeframes = [
    { value: "15m", label: "15m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" }
  ];

  const getSymbolPriceFormatted = () => {
    // Format the price with commas and with appropriate decimal places
    const hasCryptoDecimals = currentPair.startsWith('BTC/') || currentPair.startsWith('ETH/');
    const decimalPlaces = hasCryptoDecimals ? 2 : 4;
    return currentPrice.toLocaleString(undefined, { 
      minimumFractionDigits: decimalPlaces, 
      maximumFractionDigits: decimalPlaces 
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Header user={user} balance={balance} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">{currentPair}</h2>
            <div className="text-2xl font-semibold text-primary">
              ${getSymbolPriceFormatted()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pair:</span>
            <select 
              value={currentPair}
              onChange={(e) => handlePairChange(e.target.value)}
              className="bg-background border rounded p-1 text-sm"
            >
              {availablePairs.map(pair => (
                <option key={pair.value} value={pair.value}>{pair.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeframe:</span>
            <select 
              value={currentTimeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="bg-background border rounded p-1 text-sm"
            >
              {availableTimeframes.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
          
          <ConnectionStatus />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Trading Chart - 9 columns */}
        <div className="col-span-12 lg:col-span-9">
          <Card className="h-[500px]">
            <CardContent className="p-0 h-full">
              <TradingChart 
                pair={currentPair} 
                timeframe={currentTimeframe} 
                userId={userId} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Trading Panel - 3 columns */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <TradingPanel 
            userId={userId} 
            currentPair={currentPair} 
            currentPrice={currentPrice} 
          />
          
          <AutoTradingPanel 
            userId={userId} 
            onBotStatusChange={handleBotStatusChange} 
          />
        </div>

        {/* Trading Activity - 6 columns */}
        <div className="col-span-12 lg:col-span-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="active">Active Orders</TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <ActiveOrders 
                userId={userId} 
                currentPair={currentPair} 
                onOrderCancelled={handleOrderCancelled} 
              />
            </TabsContent>
            <TabsContent value="history">
              <TradeHistory 
                userId={userId} 
                currentPair={currentPair} 
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Bot Logs - 6 columns */}
        <div className="col-span-12 lg:col-span-6">
          <AutoTradeLogs userId={userId} />
        </div>

        {/* Performance Metrics - 6 columns */}
        <div className="col-span-12 lg:col-span-6">
          <PerformanceMetrics userId={userId} />
        </div>

        {/* Order Block Stats - 6 columns */}
        <div className="col-span-12 lg:col-span-6">
          <OBZoneStats userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;