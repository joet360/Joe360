import { useState, useEffect, createContext, useContext } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  currency: string;
  plan: 'free' | 'pro';
  subscriptionStatus: string | null;
  updateCurrency: (currency: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false, 
  currency: 'USD',
  plan: 'free',
  subscriptionStatus: null,
  updateCurrency: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Initial check and creation
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            currency: 'USD',
            createdAt: new Date().toISOString(),
            role: 'user',
            plan: 'free',
            subscriptionStatus: null
          });
        }

        // Real-time listener for profile changes
        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setCurrency(data.currency || 'USD');
            setPlan(data.plan || 'free');
            setSubscriptionStatus(data.subscriptionStatus || null);
            setIsAdmin(data.role === 'admin' || user.email === 'joetoms.shil@gmail.com');
          }
        });
      } else {
        setIsAdmin(false);
        setCurrency('USD');
        setPlan('free');
        setSubscriptionStatus(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const updateCurrency = async (newCurrency: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { currency: newCurrency });
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, currency, plan, subscriptionStatus, updateCurrency }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
