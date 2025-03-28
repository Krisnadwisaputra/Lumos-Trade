import { useState } from "react";
import { registerUser, loginUser, signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";

const LoginModal = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await loginUser(email, password);
      // Successful login is handled by the onAuthStateChanged listener in App.tsx
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to login. Please try again.");
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const user = await registerUser(email, password);
      
      // Create user in our backend
      await apiRequest("POST", "/api/users", {
        username: email.split('@')[0],  // Use part of email as username
        email: email,
        password: "firebase-auth" // Placeholder as we use Firebase for auth
      });
      
      toast({
        title: "Registration successful",
        description: "Your account has been created. You are now logged in.",
      });
      
      // Successful registration is handled by the onAuthStateChanged listener in App.tsx
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to register. Please try again.");
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Please try again with a different email.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const user = await signInWithGoogle();
      
      // Check if user already exists in our backend
      const response = await fetch(`/api/users/by-email/${user.email}`);
      
      if (!response.ok && response.status !== 404) {
        throw new Error("Failed to check user");
      }
      
      // If user doesn't exist, create them
      if (response.status === 404) {
        await apiRequest("POST", "/api/users", {
          username: user.displayName || user.email?.split('@')[0] || "user",
          email: user.email || "",
          password: "firebase-auth" // Placeholder as we use Firebase for auth
        });
      }
      
      toast({
        title: "Login successful",
        description: "You are now logged in with Google.",
      });
      
      // Successful login is handled by the onAuthStateChanged listener in App.tsx
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to login with Google. Please try again.");
      toast({
        variant: "destructive",
        title: "Google login failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 shadow-lg">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login to Trading Platform</h2>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {errorMessage && (
              <p className="text-red-500 text-center text-sm">{errorMessage}</p>
            )}
            
            <Button 
              className="w-full bg-primary-600 hover:bg-primary-700"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> : null}
              Login
            </Button>
            
            <Button 
              className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
              onClick={handleRegister}
              disabled={isLoading}
              variant="outline"
            >
              Create Account
            </Button>
            
            <div className="relative my-4">
              <Separator className="absolute inset-0 flex items-center" />
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button 
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              variant="outline"
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginModal;
