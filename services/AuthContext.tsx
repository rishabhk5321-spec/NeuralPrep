
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

    let unsubDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous listener if it exists
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
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
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const saveUserData = React.useCallback(async (data: AppState) => {
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
  }, [user]);

  const signOut = React.useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
  }, []);

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
