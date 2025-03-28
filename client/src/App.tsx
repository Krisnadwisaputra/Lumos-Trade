import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LoginModal from "@/components/LoginModal";
import { initializeFirebase, auth, handleGoogleRedirect } from "./lib/firebase";
import { User } from "firebase/auth";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase first
    const app = initializeFirebase();
    
    // Check for Google redirect result
    async function checkGoogleRedirect() {
      if (auth) {
        try {
          const redirectUser = await handleGoogleRedirect();
          // User will be set by the auth state listener below if redirect was successful
        } catch (error) {
          console.error("Error handling Google redirect:", error);
        }
      }
    }
    
    checkGoogleRedirect();
    
    // Listen for auth state changes
    let unsubscribe: () => void;
    if (auth) {
      unsubscribe = auth.onAuthStateChanged((authUser: any) => {
        if (authUser) {
          // When user is authenticated, automatically create or get user from API
          // This will sync Firebase auth user with backend user data
          fetch(`/api/users/by-email/${encodeURIComponent(authUser.email)}`)
            .then(response => {
              if (response.status === 404) {
                // User doesn't exist in backend, create user
                return fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: authUser.email,
                    username: authUser.displayName || authUser.email.split('@')[0],
                    firebaseUid: authUser.uid
                  })
                });
              }
              return response;
            })
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to get or create user');
              }
              return response.json();
            })
            .then(userData => {
              console.log('User data synchronized with backend:', userData);
              // We keep the Firebase user object, backend sync is just for data consistency
            })
            .catch(error => {
              console.error('Error syncing user data with backend:', error);
            })
            .finally(() => {
              setUser(authUser);
              setLoading(false);
            });
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {!user && <LoginModal />}
      <Switch>
        <Route path="/" component={() => user ? <Dashboard user={user} /> : <div className="hidden"></div>} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
