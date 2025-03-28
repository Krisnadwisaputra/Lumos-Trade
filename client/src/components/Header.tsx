import { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutUser } from '@/lib/firebase';
import { CandlestickChart, Settings, LogOut } from 'lucide-react';

interface HeaderProps {
  user: User;
  balance: string;
}

const Header = ({ user, balance }: HeaderProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutUser();
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CandlestickChart className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">EMA + SMC Auto Trading</h1>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-lg font-medium">
            Balance: <span className="text-primary">{balance}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 outline-none">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="font-medium">{user.displayName || user.email?.split('@')[0] || 'User'}</span>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="flex items-center gap-2 text-destructive focus:text-destructive" 
                onClick={handleLogout} 
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;