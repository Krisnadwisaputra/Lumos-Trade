import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/lib/queryClient';
import { onAuthChange, handleAuthRedirect } from '@/lib/firebase';
import { User } from 'firebase/auth';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/not-found';
import LoginModal from '@/components/LoginModal';
import { useToast } from '@/hooks/use-toast';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for redirect result first
    const checkRedirectResult = async () => {
      try {
        const redirectUser = await handleAuthRedirect();
        if (redirectUser) {
          console.log("User authenticated via redirect:", redirectUser.displayName);
          toast({
            title: "Login successful",
            description: `Welcome ${redirectUser.displayName || redirectUser.email}!`,
          });
        }
      } catch (error: any) {
        console.error("Redirect authentication error:", error);
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: error.message || "Failed to complete Google authentication",
        });
      }
    };

    checkRedirectResult();

    // Listen for authentication state changes
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    // If user is not logged in after initialization, show login modal
    if (!loading && !user) {
      setShowLoginModal(true);
    } else if (user) {
      setShowLoginModal(false);
    }
  }, [loading, user]);

  const handleUserAuthenticated = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    setShowLoginModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <LoginModal 
          open={showLoginModal} 
          onOpenChange={setShowLoginModal}
          onUserAuthenticated={handleUserAuthenticated}
        />
        
        <Switch>
          <Route path="/">
            {user ? (
              <Dashboard user={user} />
            ) : (
              <div className="flex justify-center items-center h-screen">
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                  onClick={() => setShowLoginModal(true)}
                >
                  Login to continue
                </button>
              </div>
            )}
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
        
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
