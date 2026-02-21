
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { AppState } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: AppState | null;
  saveUserData: (data: AppState) => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<AppState | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Listen for real-time updates to user data
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as AppState);
          }
        }, (error) => {
          if (error.code === 'permission-denied') {
            console.warn("Firestore access denied. Check Security Rules.");
          } else {
            console.error("Firestore Snapshot Error:", error);
          }
        });
        
        setLoading(false);
        return () => unsubDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const saveUserData = async (data: AppState) => {
    if (!user || !db) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, data, { merge: true });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        // Silent fail for permissions to avoid console spam during rule updates
        return;
      }
      console.error("Error saving user data:", error);
    }
  };

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, userData, saveUserData, signOut, isConfigured: isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
