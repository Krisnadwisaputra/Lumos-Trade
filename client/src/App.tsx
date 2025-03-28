import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LoginModal from "@/components/LoginModal";
import { initializeFirebase, auth } from "./lib/firebase";
import { User } from "firebase/auth";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase first
    const app = initializeFirebase();
    
    // Listen for auth state changes
    let unsubscribe: () => void;
    if (auth) {
      unsubscribe = auth.onAuthStateChanged((authUser) => {
        setUser(authUser);
        setLoading(false);
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
