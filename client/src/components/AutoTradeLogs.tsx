import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBotLogs } from "@/lib/trading";
import { BotLog } from "@shared/schema";

interface AutoTradeLogsProps {
  userId: number;
}

const AutoTradeLogs = ({ userId }: AutoTradeLogsProps) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogs();
    
    // Poll for new logs every 5 seconds when the component is mounted
    const interval = setInterval(() => {
      loadLogs();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    // Scroll to bottom when logs update
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const botLogs = await getBotLogs(userId);
      setLogs(botLogs);
    } catch (error) {
      console.error("Error loading bot logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportLogs = () => {
    try {
      const logText = logs.map(log => {
        const date = new Date(log.createdAt);
        const timeStr = date.toLocaleTimeString();
        return `[${timeStr}] ${log.level.toUpperCase()}: ${log.message}`;
      }).join('\n');
      
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_bot_logs_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Logs exported",
        description: "Bot logs have been exported successfully.",
      });
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export logs. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Auto Trade Logs</h2>
          <Button
            onClick={exportLogs}
            variant="ghost"
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
            disabled={logs.length === 0}
          >
            <i className="fas fa-download mr-1"></i> Export
          </Button>
        </div>
        
        <div
          ref={logsRef}
          className="h-48 overflow-y-auto bg-gray-50 p-3 rounded text-sm font-mono space-y-1 text-gray-700"
        >
          {isLoading && logs.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-xs text-gray-500">
              No logs available. Start the bot to see activity logs.
            </div>
          ) : (
            logs.map((log, index) => {
              const date = new Date(log.createdAt);
              const timeStr = date.toLocaleTimeString();
              let logClass = "text-gray-600";
              
              // Colorize log based on level
              if (log.level === "error") {
                logClass = "text-red-600";
              } else if (log.level === "warning") {
                logClass = "text-yellow-600";
              } else if (log.message.includes("Signal detected") || log.message.includes("Order placed")) {
                logClass = "text-green-600";
              } else if (log.message.includes("Successfully connected")) {
                logClass = "text-blue-600";
              }
              
              return (
                <div key={index} className={`text-xs ${logClass}`}>
                  [{timeStr}] {log.message}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoTradeLogs;
