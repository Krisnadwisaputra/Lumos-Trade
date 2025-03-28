import { logoutUser } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: User;
  balance: string;
}

const Header = ({ user, balance }: HeaderProps) => {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message || "Failed to logout. Please try again.",
      });
    }
  };

  return (
    <header className="bg-gradient-to-r from-primary-700 to-primary-500 text-white p-4 sm:p-5 rounded-lg shadow-md mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            <i className="fas fa-chart-line mr-2"></i>
            EMA + SMC Auto Trading
          </h1>
          <p className="mt-1 text-sm sm:text-base opacity-90">
            Logged in as: <span id="userEmail">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white bg-opacity-20 text-sm px-3 py-1.5 rounded font-medium">
            <i className="fas fa-dollar-sign mr-1"></i>
            <span>{balance}</span>
          </div>
          <Button
            className="bg-white text-primary-700 hover:bg-gray-100"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt mr-2"></i>Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
