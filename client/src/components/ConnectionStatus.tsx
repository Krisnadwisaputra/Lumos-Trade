import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { checkApiHealth } from '@/lib/apiService';

interface ConnectionStatusProps {
  className?: string;
}

type ConnectionState = 'connected' | 'connecting' | 'error' | 'simulated';

const ConnectionStatus = ({ className }: ConnectionStatusProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [tooltipText, setTooltipText] = useState<string>('Connecting to exchange...');

  useEffect(() => {
    // Check API health
    const checkConnection = async () => {
      try {
        // Start in connecting state
        setConnectionState('connecting');
        setTooltipText('Connecting to exchange...');
        
        // Check for custom events that will be dispatched from websocket service
        window.addEventListener('ws:connected', handleConnection);
        window.addEventListener('ws:error', handleError);
        window.addEventListener('ws:simulation', handleSimulation);
        
        // Check the API health endpoint
        const healthStatus = await checkApiHealth();
        
        if (healthStatus?.status === 'connected_to_binance') {
          setConnectionState('connected');
          setTooltipText('Connected to Binance API');
          
          // Dispatch a connected event for other components
          window.dispatchEvent(new CustomEvent('ws:connected'));
        } else if (healthStatus?.status === 'simulation') {
          setConnectionState('simulated');
          setTooltipText('Using simulated data - No live connection established');
          
          // Dispatch a simulation event for other components
          window.dispatchEvent(new CustomEvent('ws:simulation'));
        } else {
          throw new Error('Unknown connection status');
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setConnectionState('error');
        setTooltipText('Connection error. Check console for details.');
        
        // Dispatch an error event for other components
        window.dispatchEvent(new CustomEvent('ws:error'));
      }
    };

    const handleConnection = (event: Event) => {
      setConnectionState('connected');
      setTooltipText('Connected to exchange API');
    };
    
    const handleError = (event: Event) => {
      setConnectionState('error');
      setTooltipText('Connection error. Check console for details.');
    };
    
    const handleSimulation = (event: Event) => {
      setConnectionState('simulated');
      setTooltipText('Using simulated data - No live connection established');
    };

    checkConnection();

    // Check connection status every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('ws:connected', handleConnection);
      window.removeEventListener('ws:error', handleError);
      window.removeEventListener('ws:simulation', handleSimulation);
      clearInterval(intervalId);
    };
  }, []);

  // Determine the icon and badge based on connection state
  const getConnectionUI = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          badgeVariant: 'outline',
          badgeText: 'Connected',
          badgeClass: 'bg-green-500/20 text-green-500 border-green-500/50',
        };
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          badgeVariant: 'outline',
          badgeText: 'Connecting',
          badgeClass: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          badgeVariant: 'outline',
          badgeText: 'Error',
          badgeClass: 'bg-red-500/20 text-red-500 border-red-500/50',
        };
      case 'simulated':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          badgeVariant: 'outline',
          badgeText: 'Simulated',
          badgeClass: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          badgeVariant: 'outline',
          badgeText: 'Disconnected',
          badgeClass: 'bg-gray-500/20 text-gray-500 border-gray-500/50',
        };
    }
  };

  const { icon, badgeText, badgeClass } = getConnectionUI();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1.5 px-2 py-1 ${badgeClass}`}
            >
              {icon}
              <span>{badgeText}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConnectionStatus;