import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { webSocketService } from '@/lib/webSocketService';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setIsError(false);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = () => {
      setIsError(true);
      setIsConnected(false);
    };

    // Add event listeners
    window.addEventListener('ws-connected', handleConnected);
    window.addEventListener('ws-disconnected', handleDisconnected);
    window.addEventListener('ws-error', handleError);

    // Try to connect initially
    webSocketService.connect().catch(() => {
      setIsError(true);
    });

    // Cleanup
    return () => {
      window.removeEventListener('ws-connected', handleConnected);
      window.removeEventListener('ws-disconnected', handleDisconnected);
      window.removeEventListener('ws-error', handleError);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isConnected ? "default" : isError ? "destructive" : "secondary"}
        className={`text-xs font-medium ${isConnected ? 'bg-green-600' : isError ? 'bg-red-500' : 'bg-yellow-500'}`}
      >
        {isConnected ? 'Connected' : isError ? 'Connection Error' : 'Connecting...'}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {isConnected ? 'Real-time data active' : isError ? 'Check your connection' : 'Establishing connection...'}
      </span>
    </div>
  );
};

export default ConnectionStatus;