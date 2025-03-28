import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithRedirect, 
  signInWithPopup,
  GoogleAuthProvider, 
  getRedirectResult, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Functions for authentication
export const signInWithGoogle = async () => {
  try {
    // In development or in environments where redirects are problematic (like iframes),
    // use popup authentication instead
    if (import.meta.env.DEV || window.location.hostname === 'replit.app' || window.location.hostname.includes('.repl.co')) {
      console.log('Using popup authentication for Google sign-in');
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } else {
      // For production, use redirect auth
      console.log('Using redirect authentication for Google sign-in');
      await signInWithRedirect(auth, googleProvider);
      return null; // Redirect will happen, no return value
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// For backward compatibility with existing codebase
export const signInWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);

export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // User successfully authenticated
      console.log('Successfully authenticated via redirect');
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Error during authentication redirect:", error);
    throw error;
  }
};

// Login with email/password
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

// Register new user with email/password
export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

// Sign out
export const logoutUser = () => {
  return firebaseSignOut(auth);
};

// Auth state change listener
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { auth };
export default app;