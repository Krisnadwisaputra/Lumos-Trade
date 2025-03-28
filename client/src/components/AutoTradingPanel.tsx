import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { PlayCircle, PauseCircle, Settings } from 'lucide-react';

interface AutoTradingPanelProps {
  userId: number;
  onBotStatusChange: (isRunning: boolean) => void;
}

const AutoTradingPanel = ({ userId, onBotStatusChange }: AutoTradingPanelProps) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // This would be loaded from API in production
  const [botConfig, setBotConfig] = useState({
    pair: 'BTC/USDT',
    timeframe: '1h',
    emaPeriods: '9,21',
    riskPercent: '1',
    rrRatio: '2'
  });

  const handleToggleBot = async () => {
    setIsLoading(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real application, this would be an actual API call
      // const endpoint = isRunning ? `/api/bot/${configId}/stop` : `/api/bot/${configId}/start`;
      // await apiRequest('POST', endpoint, {});
      
      setIsRunning(!isRunning);
      onBotStatusChange(!isRunning);
      
      toast({
        title: isRunning ? 'Bot stopped' : 'Bot started',
        description: isRunning 
          ? 'Trading bot has been stopped successfully' 
          : 'Trading bot is now running and analyzing the market',
      });
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${isRunning ? 'stop' : 'start'} the trading bot.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real application, this would be an actual API call
      // await apiRequest('POST', '/api/bot-config', {
      //   userId,
      //   ...botConfig,
      //   exchange: 'Binance',
      // });
      
      setShowSettings(false);
      toast({
        title: 'Settings saved',
        description: 'Bot configuration has been updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save bot configuration.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Auto Trading</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSettings(!showSettings)}
            disabled={isRunning}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showSettings ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pair">Trading Pair</Label>
              <Select 
                value={botConfig.pair} 
                onValueChange={value => setBotConfig({...botConfig, pair: value})}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={botConfig.timeframe} 
                onValueChange={value => setBotConfig({...botConfig, timeframe: value})}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emaPeriods">EMA Periods (comma separated)</Label>
              <Input 
                id="emaPeriods" 
                value={botConfig.emaPeriods} 
                onChange={e => setBotConfig({...botConfig, emaPeriods: e.target.value})}
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskPercent">Risk (%)</Label>
                <Input 
                  id="riskPercent" 
                  value={botConfig.riskPercent} 
                  onChange={e => setBotConfig({...botConfig, riskPercent: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rrRatio">Risk/Reward Ratio</Label>
                <Input 
                  id="rrRatio" 
                  value={botConfig.rrRatio} 
                  onChange={e => setBotConfig({...botConfig, rrRatio: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSettings(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">
                <div className="text-sm text-muted-foreground">Trading Pair</div>
                <div>{botConfig.pair}</div>
              </div>
              <div className="font-medium">
                <div className="text-sm text-muted-foreground">Timeframe</div>
                <div>{botConfig.timeframe}</div>
              </div>
              <div className="font-medium">
                <div className="text-sm text-muted-foreground">EMA</div>
                <div>{botConfig.emaPeriods}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={isRunning}
                  onCheckedChange={handleToggleBot}
                  disabled={isLoading}
                />
                <Label>{isRunning ? 'Bot is running' : 'Bot is stopped'}</Label>
              </div>
              
              <Button
                onClick={handleToggleBot}
                disabled={isLoading}
                variant={isRunning ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  'Processing...'
                ) : isRunning ? (
                  <>
                    <PauseCircle className="h-4 w-4" />
                    Stop Bot
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Start Bot
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoTradingPanel;