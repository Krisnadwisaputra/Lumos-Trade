import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBotConfig, saveBotConfig, startBot, stopBot } from "@/lib/trading";
import { BotConfig } from "@shared/schema";

interface AutoTradingPanelProps {
  userId: number;
  onBotStatusChange: (isRunning: boolean) => void;
}

const AutoTradingPanel = ({ userId, onBotStatusChange }: AutoTradingPanelProps) => {
  const { toast } = useToast();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Form state
  const [exchange, setExchange] = useState("binance");
  const [tradingPair, setTradingPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [emaPeriods, setEmaPeriods] = useState("9,20,50");
  const [riskPercent, setRiskPercent] = useState(2);
  const [rrRatio, setRrRatio] = useState(2);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  useEffect(() => {
    const loadBotConfig = async () => {
      try {
        const config = await getBotConfig(userId);
        if (config) {
          setBotConfig(config);
          setExchange(config.exchange);
          setTradingPair(config.tradingPair);
          setTimeframe(config.timeframe);
          setEmaPeriods(config.emaPeriods);
          setRiskPercent(Number(config.riskPercent));
          setRrRatio(Number(config.rrRatio));
          setApiKey(config.apiKey || "");
          setApiSecret(config.apiSecret || "");
          setIsBotRunning(config.isActive);
          onBotStatusChange(config.isActive);
        }
      } catch (error) {
        console.error("Error loading bot config:", error);
        toast({
          variant: "destructive",
          title: "Failed to load bot configuration",
          description: "Please try refreshing the page.",
        });
      }
    };

    loadBotConfig();
  }, [userId, toast, onBotStatusChange]);

  const addBotLog = (message: string) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const logMessage = `[${timeStr}] ${message}`;
    setLogs((prevLogs) => [logMessage, ...prevLogs].slice(0, 20));
  };

  const handleStartBot = async () => {
    if (!apiKey || !apiSecret) {
      toast({
        variant: "destructive",
        title: "API Keys Required",
        description: "Please enter both API Key and API Secret to start the bot.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save current configuration
      const configData: Partial<BotConfig> = {
        userId,
        exchange,
        tradingPair,
        timeframe,
        emaPeriods,
        riskPercent: riskPercent.toString(),
        rrRatio: rrRatio.toString(),
        apiKey,
        apiSecret,
        isActive: true
      };

      const savedConfig = await saveBotConfig(configData);
      setBotConfig(savedConfig);

      // Start the bot
      await startBot(savedConfig.id);
      
      setIsBotRunning(true);
      onBotStatusChange(true);
      addBotLog("Bot started - Connecting to exchange...");
      
      toast({
        title: "Bot Started",
        description: "The trading bot has been started successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to start bot",
        description: error.message || "Please check your configuration and try again.",
      });
      addBotLog(`Error: ${error.message || "Failed to start bot"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopBot = async () => {
    setIsLoading(true);
    try {
      if (botConfig) {
        await stopBot(botConfig.id);
        
        // Update bot config
        const updatedConfig = { ...botConfig, isActive: false };
        await saveBotConfig(updatedConfig);
        
        setBotConfig(updatedConfig);
        setIsBotRunning(false);
        onBotStatusChange(false);
        addBotLog("Bot stopped");
        
        toast({
          title: "Bot Stopped",
          description: "The trading bot has been stopped successfully.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to stop bot",
        description: error.message || "Please try again.",
      });
      addBotLog(`Error: ${error.message || "Failed to stop bot"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800">
        <i className="fas fa-robot mr-2 text-primary-600"></i> Auto Trading Bot
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bot Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3 text-gray-800">Bot Configuration</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exchange" className="text-sm font-medium text-gray-700">Exchange</Label>
              <Select
                value={exchange}
                onValueChange={setExchange}
                disabled={isBotRunning}
              >
                <SelectTrigger id="exchange" className="w-full mt-1">
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="kucoin">KuCoin</SelectItem>
                  <SelectItem value="ftx">FTX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tradingPair" className="text-sm font-medium text-gray-700">Trading Pair</Label>
              <Select
                value={tradingPair}
                onValueChange={setTradingPair}
                disabled={isBotRunning}
              >
                <SelectTrigger id="tradingPair" className="w-full mt-1">
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                  <SelectItem value="ADA/USDT">ADA/USDT</SelectItem>
                  <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="timeframe" className="text-sm font-medium text-gray-700">Timeframe</Label>
              <Select
                value={timeframe}
                onValueChange={setTimeframe}
                disabled={isBotRunning}
              >
                <SelectTrigger id="timeframe" className="w-full mt-1">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="4h">4h</SelectItem>
                  <SelectItem value="1d">1d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Strategy Settings */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3 text-gray-800">EMA + SMC Strategy</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emaPeriods" className="text-sm font-medium text-gray-700">EMA Periods</Label>
              <Input
                id="emaPeriods"
                type="text"
                value={emaPeriods}
                onChange={(e) => setEmaPeriods(e.target.value)}
                disabled={isBotRunning}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">Separate values with commas</p>
            </div>
            
            <div>
              <Label htmlFor="riskPercent" className="text-sm font-medium text-gray-700">Risk per Trade (%)</Label>
              <Input
                id="riskPercent"
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                disabled={isBotRunning}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="rrRatio" className="text-sm font-medium text-gray-700">Risk:Reward Ratio</Label>
              <Input
                id="rrRatio"
                type="number"
                min={1}
                step={0.5}
                value={rrRatio}
                onChange={(e) => setRrRatio(parseFloat(e.target.value))}
                disabled={isBotRunning}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        
        {/* Bot Controls */}
        <div className="bg-gray-50 p-4 rounded-lg flex flex-col">
          <h3 className="font-semibold mb-3 text-gray-800">Controls</h3>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-3">Connect your exchange API keys (read-only):</p>
              <div className="relative mb-2">
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isBotRunning}
                  className="pl-9"
                />
                <i className="fas fa-key absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
              
              <div className="relative">
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="API Secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  disabled={isBotRunning}
                  className="pl-9"
                />
                <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <Button
                onClick={handleStartBot}
                disabled={isBotRunning || isLoading}
                className={`w-full ${isBotRunning ? 'opacity-60 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isLoading && !isBotRunning ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <i className="fas fa-play mr-2"></i>
                )}
                Start Bot
              </Button>
              
              <Button
                onClick={handleStopBot}
                disabled={!isBotRunning || isLoading}
                variant="destructive"
                className={`w-full ${!isBotRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isLoading && isBotRunning ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <i className="fas fa-stop mr-2"></i>
                )}
                Stop Bot
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Status */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${isBotRunning ? 'bg-green-400' : 'bg-gray-400'} mr-2`}></div>
          <span className="font-medium text-gray-800">
            Bot Status: {isBotRunning ? 'Running' : 'Disconnected'}
          </span>
        </div>
        
        <div className="mt-2 text-sm text-gray-600 h-16 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-500 font-mono">
              [System] Ready, waiting for commands...
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-xs text-gray-500 font-mono">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoTradingPanel;
