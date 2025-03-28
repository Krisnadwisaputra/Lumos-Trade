import { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TradingChart as Chart } from "@/lib/charts";

interface TradingChartProps {
  pair?: string;
  timeframe?: string;
}

const TradingChart = ({ pair = "BTC/USDT", timeframe = "1h" }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<Chart | null>(null);
  const [currentPair, setCurrentPair] = useState(pair);
  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe);
  const [currentPrice, setCurrentPrice] = useState<string>("0.00");
  const [priceChange, setPriceChange] = useState<string>("0.00%");
  const [priceChangePositive, setPriceChangePositive] = useState(true);

  useEffect(() => {
    let chart: Chart | null = null;
    
    if (chartContainerRef.current) {
      chart = new Chart(chartContainerRef.current);
      setChartInstance(chart);
      
      // Load initial data
      chart.loadData(currentPair, currentTimeframe)
        .then(() => {
          // Simulate current price data
          updatePriceDisplay();
        });
    }
    
    return () => {
      if (chart) {
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

  const updatePriceDisplay = async () => {
    try {
      const response = await fetch(`/api/current-price?pair=${currentPair}`);
      const data = await response.json();
      
      if (data.price) {
        setCurrentPrice(parseFloat(data.price).toLocaleString('en-US', {
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
      
      // Fallback to simulated data for demo purposes
      const simulatedPrice = 42000 + Math.random() * 3000;
      const simulatedChange = (Math.random() * 6) - 3;
      
      setCurrentPrice(simulatedPrice.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }));
      
      setPriceChange(`${simulatedChange > 0 ? '+' : ''}${simulatedChange.toFixed(2)}%`);
      setPriceChangePositive(simulatedChange >= 0);
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

  return (
    <Card>
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
          </div>
        </div>
        
        {/* Chart Display Area */}
        <div className="h-96 bg-gray-50 relative rounded-lg overflow-hidden">
          <div ref={chartContainerRef} className="h-full w-full"></div>
          
          {/* Chart overlay with current prices */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 rounded-lg p-3 text-white">
            <h4 className="font-bold">{currentPair}</h4>
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
            <i className="fas fa-chart-line mr-1"></i> EMA 9
          </Button>
          
          <Button
            variant={activeEMAs[20] ? "default" : "outline"}
            className={activeEMAs[20] 
              ? "bg-orange-500 text-white hover:bg-orange-600" 
              : "bg-primary-100 text-primary-800 hover:bg-primary-200"
            }
            onClick={() => toggleEMAIndicator(20)}
          >
            <i className="fas fa-chart-line mr-1"></i> EMA 20
          </Button>
          
          <Button
            variant={activeEMAs[50] ? "default" : "outline"}
            className={activeEMAs[50] 
              ? "bg-purple-500 text-white hover:bg-purple-600" 
              : "bg-primary-100 text-primary-800 hover:bg-primary-200"
            }
            onClick={() => toggleEMAIndicator(50)}
          >
            <i className="fas fa-chart-line mr-1"></i> EMA 50
          </Button>
          
          <Button
            variant={smcZonesVisible ? "default" : "outline"}
            className={smcZonesVisible 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "bg-primary-100 text-primary-800 hover:bg-primary-200"
            }
            onClick={toggleSMCzones}
          >
            <i className={`fas fa-${smcZonesVisible ? 'check-square' : 'square'} mr-1`}></i> OB Zones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingChart;
