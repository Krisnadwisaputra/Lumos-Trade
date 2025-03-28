import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  loginUser, 
  registerUser, 
  signInWithGoogle,
  signInWithGoogleRedirect
} from "@/lib/firebase";
import { FaGoogle } from 'react-icons/fa';

interface LoginModalProps {
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAuthenticated: (user: any) => void;
}

const LoginModal = ({ open = true, onOpenChange, onUserAuthenticated }: LoginModalProps) => {
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter both email and password",
      });
      return;
    }

    setLoading(true);
    try {
      const user = isLogin 
        ? await loginUser(email, password) 
        : await registerUser(email, password);
      
      onUserAuthenticated(user);
      toast({
        title: isLogin ? "Login successful" : "Account created",
        description: isLogin 
          ? "Welcome back!" 
          : "Your account has been created successfully!",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message || "Failed to authenticate",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onUserAuthenticated(user);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message || "Failed to authenticate with Google",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    try {
      await signInWithGoogleRedirect();
      // The page will redirect to Google's auth page
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message || "Failed to authenticate with Google",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLogin ? "Login" : "Register"}</DialogTitle>
          <DialogDescription>
            {isLogin
              ? "Log in to your trading account"
              : "Create a new trading account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col space-y-4">
            <Button type="submit" disabled={loading}>
              {loading 
                ? "Processing..." 
                : isLogin ? "Login" : "Register"}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2"
            >
              <FaGoogle className="h-4 w-4" />
              Google
            </Button>
          </div>
        </form>

        <div className="flex justify-center mt-2">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-xs"
          >
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;