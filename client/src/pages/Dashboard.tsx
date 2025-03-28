import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import AutoTradingPanel from "@/components/AutoTradingPanel";
import TradingChart from "@/components/TradingChart";
import TradingJournal from "@/components/TradingJournal";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import OBZoneStats from "@/components/OBZoneStats";
import AutoTradeLogs from "@/components/AutoTradeLogs";
import ConnectionStatus from "@/components/ConnectionStatus";
import { apiRequest } from "@/lib/queryClient";

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<number | null>(null);
  const [balance, setBalance] = useState("0.00 USDT");
  const [isBotRunning, setIsBotRunning] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user data from our backend
        const response = await fetch(`/api/users/by-email/${encodeURIComponent(user.email || '')}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            // Create user in our backend if not found
            await createUser();
            return;
          }
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await response.json();
        setUserId(userData.id);
        setBalance(`${parseFloat(userData.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          variant: "destructive",
          title: "Error loading user data",
          description: "Please try refreshing the page.",
        });
      }
    };

    fetchUserData();
  }, [user, toast]);

  const createUser = async () => {
    try {
      const response = await apiRequest("POST", "/api/users", {
        username: user.email?.split('@')[0] || 'user',
        email: user.email,
        password: "firebase-auth" // Placeholder since we use Firebase auth
      });
      
      if (!response.ok) {
        throw new Error("Failed to create user");
      }
      
      const userData = await response.json();
      setUserId(userData.id);
      setBalance(`${parseFloat(userData.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`);
      
      toast({
        title: "Account created",
        description: "Your trading account has been set up successfully.",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Error creating account",
        description: "Please try refreshing the page.",
      });
    }
  };

  const handleBotStatusChange = (isRunning: boolean) => {
    setIsBotRunning(isRunning);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <Header user={user} balance={balance} />
      
      {userId ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <AutoTradingPanel 
              userId={userId} 
              onBotStatusChange={handleBotStatusChange} 
            />
            <ConnectionStatus className="ml-auto" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content - left 2/3 */}
            <div className="lg:col-span-2 space-y-8">
              <TradingChart />
              <TradingJournal userId={userId} />
            </div>
            
            {/* Sidebar - right 1/3 */}
            <div className="space-y-8">
              <PerformanceMetrics userId={userId} />
              <OBZoneStats userId={userId} />
              <AutoTradeLogs userId={userId} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
