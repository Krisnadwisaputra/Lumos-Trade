import { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TradingChart as Chart } from "@/lib/charts";
import { webSocketService } from "@/lib/webSocketService";
import TradingPanel from "./TradingPanel";
import ActiveOrders from "./ActiveOrders";
import TradeHistory from "./TradeHistory";

interface TradingChartProps {
  pair?: string;
  timeframe?: string;
  userId?: number;
}

const TradingChart = ({ pair = "BTC/USDT", timeframe = "1h", userId }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<Chart | null>(null);
  const [currentPair, setCurrentPair] = useState(pair);
  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe);
  const [currentPrice, setCurrentPrice] = useState<string>("0.00");
  const [currentPriceValue, setCurrentPriceValue] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<string>("0.00%");
  const [priceChangePositive, setPriceChangePositive] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);

  useEffect(() => {
    console.log("TradingChart mounted, initializing chart...");
    let chart: Chart | null = null;
    
    if (chartContainerRef.current) {
      try {
        chart = new Chart(chartContainerRef.current);
        console.log("Chart instance created successfully");
        setChartInstance(chart);
        
        // Load initial data
        console.log(`Loading initial chart data for ${currentPair} - ${currentTimeframe}`);
        chart.loadData(currentPair, currentTimeframe)
          .then(() => {
            console.log("Initial chart data loaded successfully");
            // Get current price data
            updatePriceDisplay();
          })
          .catch(err => {
            console.error("Error loading initial chart data:", err);
          });
      } catch (error) {
        console.error("Error initializing chart:", error);
      }
    } else {
      console.error("Chart container reference is null");
    }
    
    return () => {
      if (chart) {
        console.log("Cleaning up chart instance");
        chart.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (chartInstance) {
      chartInstance.loadData(currentPair, currentTimeframe)
        .then(() => {
          updatePriceDisplay();
        });
    }
  }, [currentPair, currentTimeframe]);

  // Connect to real-time price updates
  useEffect(() => {
    // Listen for connection/disconnection events
    const handleConnected = () => {
      console.log("WebSocket connection established");
      setWsConnected(true);
    };
    
    const handleDisconnected = () => {
      console.log("WebSocket connection lost");
      setWsConnected(false);
    };
    
    // Check the current connection status
    if (typeof window !== 'undefined' && window.WebSocket) {
      // Set initial connected state based on WebSocket readyState
      if (webSocketService && webSocketService['socket']?.readyState === WebSocket.OPEN) {
        setWsConnected(true);
      } else {
        setWsConnected(false);
      }
    }
    
    // Add event listeners (this is a simplified example - in a real app you'd
    // want to implement event handling in the WebSocketService class)
    window.addEventListener('ws-connected', handleConnected);
    window.addEventListener('ws-disconnected', handleDisconnected);
    
    // Cleanup event listeners when component unmounts
    return () => {
      // Remove event listeners
      window.removeEventListener('ws-connected', handleConnected);
      window.removeEventListener('ws-disconnected', handleDisconnected);
    };
  }, []);
  
  // Set up a real-time price listener
  useEffect(() => {
    const handlePriceUpdate = (data: any) => {
      if (data && data.close) {
        // Update price display
        const price = parseFloat(data.close);
        setCurrentPriceValue(price); // Store the raw price value for trading panel
        setCurrentPrice(price.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }));
        
        // Calculate price change (this is simplified - in reality you would
        // calculate against previous close or daily open)
        const prevPrice = parseFloat(data.open);
        const changePercent = ((price - prevPrice) / prevPrice) * 100;
        
        setPriceChange(`${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`);
        setPriceChangePositive(changePercent >= 0);
      }
    };
    
    // Subscribe to price updates for the current pair
    webSocketService.subscribeToMarket(currentPair, handlePriceUpdate);
    
    // Initial price fetch
    updatePriceDisplay();
    
    // Cleanup subscription when currentPair changes or component unmounts
    return () => {
      webSocketService.unsubscribeFromMarket(currentPair, handlePriceUpdate);
    };
  }, [currentPair]);
  
  const updatePriceDisplay = async () => {
    try {
      const response = await fetch(`/api/current-price?pair=${currentPair}`);
      const data = await response.json();
      
      if (data.price) {
        const priceValue = parseFloat(data.price);
        setCurrentPriceValue(priceValue); // Store the raw price value
        setCurrentPrice(priceValue.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }));
        
        const changeValue = parseFloat(data.change);
        setPriceChange(`${changeValue > 0 ? '+' : ''}${changeValue.toFixed(2)}%`);
        setPriceChangePositive(changeValue >= 0);
      }
    } catch (error) {
      console.error("Error fetching current price:", error);
      
      // Default values when API fails
      setCurrentPrice("--");
      setPriceChange("--");
      setPriceChangePositive(true);
    }
  };

  const handlePairChange = (value: string) => {
    setCurrentPair(value);
  };

  const handleTimeframeChange = (value: string) => {
    setCurrentTimeframe(value);
  };

  const [activeEMAs, setActiveEMAs] = useState<{[key: number]: boolean}>({
    9: false,
    20: false,
    50: false
  });
  
  const toggleEMAIndicator = (period: number) => {
    if (chartInstance) {
      if (activeEMAs[period]) {
        // If EMA is active, remove it
        chartInstance.removeEMA(period);
      } else {
        // If EMA is not active, add it
        chartInstance.addEMA(period);
      }
      
      // Update state
      setActiveEMAs(prev => ({
        ...prev,
        [period]: !prev[period]
      }));
    }
  };

  const [smcZonesVisible, setSmcZonesVisible] = useState(false);
  
  const toggleSMCzones = () => {
    if (chartInstance) {
      const newVisibility = !smcZonesVisible;
      chartInstance.toggleSMCzones(newVisibility);
      setSmcZonesVisible(newVisibility);
    }
  };

  const handleOrderCancelled = () => {
    // Refresh active orders after cancellation
    console.log("Order cancelled, refreshing data");
  };

  const toggleOrdersPanel = () => {
    setOrdersPanelOpen(!ordersPanelOpen);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main chart panel */}
      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Price Analysis</h2>
            <div className="flex gap-2">
              <Select value={currentPair} onValueChange={handlePairChange}>
                <SelectTrigger id="chartPair" className="w-full">
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={currentTimeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger id="chartTimeframe" className="w-full">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="4h">4h</SelectItem>
                  <SelectItem value="1d">1d</SelectItem>
                </SelectContent>
              </Select>
              
              {userId && (
                <Button
                  variant="outline"
                  className="hidden sm:flex"
                  onClick={toggleOrdersPanel}
                >
                  {ordersPanelOpen ? "Hide Orders" : "Show Orders"}
                </Button>
              )}
            </div>
          </div>
          
          {/* Chart Display Area */}
          <div className="h-96 bg-gray-50 relative rounded-lg overflow-hidden">
            <div ref={chartContainerRef} className="h-full w-full"></div>
            
            {/* Chart overlay with current prices */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-75 rounded-lg p-3 text-white">
              <div className="flex items-center gap-2">
                <h4 className="font-bold">{currentPair}</h4>
                <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                     title={wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}>
                </div>
              </div>
              <div className={`text-2xl font-bold ${priceChangePositive ? 'text-green-400' : 'text-red-400'}`}>
                {currentPrice}
              </div>
              <div className={`text-sm ${priceChangePositive ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange}
              </div>
            </div>
          </div>
          
          {/* Chart Controls */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant={activeEMAs[9] ? "default" : "outline"}
              className={activeEMAs[9] 
                ? "bg-blue-500 text-white hover:bg-blue-600" 
                : "bg-primary-100 text-primary-800 hover:bg-primary-200"
              }
              onClick={() => toggleEMAIndicator(9)}
            >
              EMA 9
            </Button>
            
            <Button
              variant={activeEMAs[20] ? "default" : "outline"}
              className={activeEMAs[20] 
                ? "bg-orange-500 text-white hover:bg-orange-600" 
                : "bg-primary-100 text-primary-800 hover:bg-primary-200"
              }
              onClick={() => toggleEMAIndicator(20)}
            >
              EMA 20
            </Button>
            
            <Button
              variant={activeEMAs[50] ? "default" : "outline"}
              className={activeEMAs[50] 
                ? "bg-purple-500 text-white hover:bg-purple-600" 
                : "bg-primary-100 text-primary-800 hover:bg-primary-200"
              }
              onClick={() => toggleEMAIndicator(50)}
            >
              EMA 50
            </Button>
            
            <Button
              variant={smcZonesVisible ? "default" : "outline"}
              className={smcZonesVisible 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-primary-100 text-primary-800 hover:bg-primary-200"
              }
              onClick={toggleSMCzones}
            >
              OB Zones
            </Button>
          </div>
          
          {/* Mobile-only Orders Button */}
          {userId && (
            <Button
              variant="outline"
              className="w-full mt-4 sm:hidden"
              onClick={toggleOrdersPanel}
            >
              {ordersPanelOpen ? "Hide Orders" : "Show Orders"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Trading panel - Conditionally rendered based on userId */}
      {userId && (
        <div className={`space-y-6 ${ordersPanelOpen ? 'block' : 'hidden lg:block'}`}>
          <TradingPanel 
            userId={userId} 
            currentPair={currentPair} 
            currentPrice={currentPriceValue}
          />
          
          <ActiveOrders 
            userId={userId} 
            currentPair={currentPair} 
            onOrderCancelled={handleOrderCancelled}
          />
          
          <TradeHistory 
            userId={userId} 
            currentPair={currentPair}
          />
        </div>
      )}
    </div>
  );
};

export default TradingChart;
