import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { webSocketService } from '@/lib/webSocketService';

interface ConnectionStatusProps {
  className?: string;
}

type ConnectionState = 'connected' | 'connecting' | 'error' | 'simulated';

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [dataSource, setDataSource] = useState<'live' | 'simulation'>('live');

  useEffect(() => {
    const handleConnected = () => {
      setConnectionState('connected');
    };

    const handleDisconnected = () => {
      setConnectionState('connecting');
    };

    const handleError = () => {
      setConnectionState('error');
    };
    
    // Custom event for when we switch to simulation mode
    const handleSimulation = (event: Event) => {
      setConnectionState('connected');
      setDataSource('simulation');
      
      // Log the market that's in simulation mode if available
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.market) {
        console.log(`Simulation active for market: ${customEvent.detail.market}`);
      }
    };

    // Add event listeners
    window.addEventListener('ws-connected', handleConnected);
    window.addEventListener('ws-disconnected', handleDisconnected);
    window.addEventListener('ws-error', handleError);
    window.addEventListener('ws-simulation', handleSimulation);

    // Try to connect initially
    webSocketService.connect().catch(() => {
      setConnectionState('error');
    });

    // Cleanup
    return () => {
      window.removeEventListener('ws-connected', handleConnected);
      window.removeEventListener('ws-disconnected', handleDisconnected);
      window.removeEventListener('ws-error', handleError);
      window.removeEventListener('ws-simulation', handleSimulation);
    };
  }, []);

  // Determine badge styles
  const getBadgeStyle = () => {
    // Special styling for simulation mode
    if (connectionState === 'connected' && dataSource === 'simulation') {
      return 'bg-purple-500';
    }
    
    switch (connectionState) {
      case 'connected':
        return 'bg-green-600';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'simulated':
        return 'bg-purple-500';
      default:
        return 'bg-secondary';
    }
  };

  // Determine badge text
  const getBadgeText = () => {
    if (connectionState === 'connected' && dataSource === 'simulation') {
      return 'Simulation Mode';
    }
    
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  // Determine status message
  const getStatusMessage = () => {
    if (connectionState === 'connected' && dataSource === 'simulation') {
      return 'Using generated data for demonstration';
    }
    
    switch (connectionState) {
      case 'connected':
        return 'Real-time data active';
      case 'connecting':
        return 'Establishing connection...';
      case 'error':
        return 'Check your network connection';
      default:
        return '';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={connectionState === 'error' ? "destructive" : "default"}
        className={`text-xs font-medium ${getBadgeStyle()}`}
      >
        {getBadgeText()}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {getStatusMessage()}
      </span>
    </div>
  );
};

export default ConnectionStatus;