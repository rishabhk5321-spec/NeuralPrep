
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  History, 
  Brain, 
  Bot, 
  Activity,
  Wifi,
  WifiOff,
  Zap,
  Heart,
  CloudOff,
  Loader2
} from 'lucide-react';
import { AppState, ThemeId } from './types';
import { INITIAL_USER, THEMES } from './constants';
import { AuthProvider, useAuth } from './services/AuthContext';
import AuthView from './views/AuthView';
import Dashboard from './views/Dashboard';
import QuizEngine from './views/QuizEngine';
import FlashcardDeck from './views/FlashcardDeck';
import SettingsPage from './views/SettingsPage';
import RecentItems from './views/RecentItems';
import SummaryView from './views/SummaryView';
import PerformanceAnalysis from './views/PerformanceAnalysis';
import ChatBuddy from './components/ChatBuddy';
import DebugPanel from './components/DebugPanel';
import { 
  loadProfileFromLocalStorage, 
  loadVaultFromIndexedDB, 
  saveProfileToLocalStorage, 
  saveVaultToIndexedDB 
} from './services/persistenceService';

/**
 * Glassmorphism 2.0 Dynamic Background System
 */
const DynamicBackground: React.FC<{ themeId: ThemeId }> = ({ themeId }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Deep Space: Drifting Particle Field */}
      {themeId === ThemeId.DeepSpace && (
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i} 
              className="particle" 
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                left: `${Math.random() * 100}%`,
                bottom: `-10px`,
                animationDuration: `${Math.random() * 20 + 10}s`,
                animationDelay: `${Math.random() * 10}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Crimson Flash: Heat Distortion & Ripples */}
      {themeId === ThemeId.CrimsonFlash && (
        <div className="absolute inset-0 distort-filter">
          <div className="heat-haze" />
          <div className="heat-haze" style={{ animationDelay: '-5s', opacity: 0.1 }} />
        </div>
      )}

      {/* Emerald Light: Bio-luminescent Pulses */}
      {themeId === ThemeId.EmeraldLight && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="bio-orb" 
              style={{
                width: `${Math.random() * 400 + 200}px`,
                height: `${Math.random() * 400 + 200}px`,
                left: `${Math.random() * 80 - 10}%`,
                top: `${Math.random() * 80 - 10}%`,
                animationDuration: `${Math.random() * 10 + 10}s`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ConnectivityIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/5 transition-all duration-500 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
      {isOnline ? (
        <Wifi className="w-3.5 h-3.5" />
      ) : (
        <CloudOff className="w-3.5 h-3.5 animate-pulse" />
      )}
      <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
        {isOnline ? 'Neural Link Active' : 'Vault Mode: Offline'}
      </span>
      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
    </div>
  );
};

const AppContent: React.FC<{ 
  state: AppState; 
  updateState: (updater: any) => void;
  openChatWithContext: (msg: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  initialChatMessage: string | null;
  setInitialChatMessage: (msg: string | null) => void;
}> = ({ state, updateState, openChatWithContext, isChatOpen, setIsChatOpen, initialChatMessage, setInitialChatMessage }) => {
  const { user, loading: authLoading, signOut, isConfigured } = useAuth();
  const [bypassAuth, setBypassAuth] = useState(() => {
    // Persist bypass state in session storage to prevent reset on refresh
    return sessionStorage.getItem('neural_bypass') === 'true';
  });
  const location = useLocation();
  const theme = THEMES[state.theme];
  const isQuizMode = location.pathname === '/quiz';

  const handleBypass = () => {
    sessionStorage.setItem('neural_bypass', 'true');
    setBypassAuth(true);
  };

  useEffect(() => {
    console.log("Auth State Debug:", { 
      user: user?.email, 
      authLoading, 
      bypassAuth, 
      isConfigured,
      path: location.pathname 
    });
  }, [user, authLoading, bypassAuth, isConfigured, location]);

  const handleSignOut = async () => {
    sessionStorage.removeItem('neural_bypass');
    setBypassAuth(false);
    await signOut();
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <Brain className="absolute inset-0 m-auto w-5 h-5 text-white animate-pulse" />
        </div>
        <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Authenticating Neural Link...</p>
      </div>
    );
  }

  // If not logged in AND not bypassed, show AuthView
  if (!user && !bypassAuth) {
    return <AuthView onSuccess={handleBypass} />;
  }

  return (
    <div className={`min-h-screen transition-all duration-500 bg-gradient-to-br ${theme.bgGradient} ${theme.textColor} animate-gradient relative overflow-x-hidden`}>
      <DynamicBackground themeId={state.theme} />

      {!isQuizMode && (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className={`relative p-2.5 rounded-xl bg-gradient-to-br from-${theme.accentColor} to-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg shadow-${theme.accentColor}/20`}>
                <Brain className="w-6 h-6 text-white" />
                <Zap className="absolute -top-1 -right-1 w-3.5 h-3.5 text-white fill-white animate-pulse" />
              </div>
              <span className="font-brand font-black text-2xl tracking-tighter hidden sm:block">
                Neural<span className={`text-${theme.accentColor}`}>Prep</span>
              </span>
            </Link>
            <ConnectivityIndicator />
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <NavLinks theme={theme} />
            <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2.5 hover:bg-white/10 rounded-full transition-colors relative group"
              title="Summon Assistant"
            >
              <Bot className={`w-6 h-6 group-hover:text-${theme.accentColor} transition-colors`} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <div className="group relative">
              <Link to="/settings" className="flex items-center gap-3 glass px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                <img src={state.user.avatar} className="w-7 h-7 rounded-full border border-white/20" alt="Profile" />
                <div className="hidden md:block text-left">
                   <p className="text-[11px] font-bold uppercase tracking-widest opacity-40 leading-none">Level {state.user.level}</p>
                   <span className="text-sm font-bold truncate max-w-[80px] block">{user?.displayName || state.user.name}</span>
                </div>
              </Link>
              <div className="absolute top-full right-0 mt-2 w-48 glass rounded-2xl border border-white/10 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 text-rose-400 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  <CloudOff className="w-4 h-4" /> Terminate Link
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={`${isQuizMode ? 'pt-0' : 'pt-28'} pb-12 px-4 sm:px-6 max-w-7xl mx-auto min-h-screen`}>
        <Routes>
          <Route path="/" element={<Dashboard state={state} updateState={updateState} />} />
          <Route path="/quiz" element={<QuizEngine state={state} updateState={updateState} onDiscuss={openChatWithContext} />} />
          <Route path="/flashcards" element={<FlashcardDeck state={state} updateState={updateState} />} />
          <Route path="/summary" element={<SummaryView state={state} updateState={updateState} />} />
          <Route path="/analysis" element={<PerformanceAnalysis state={state} updateState={updateState} />} />
          <Route path="/recent" element={<RecentItems state={state} updateState={updateState} />} />
          <Route path="/settings" element={<SettingsPage state={state} updateState={updateState} />} />
        </Routes>
        
        {!isQuizMode && (
          <footer className="mt-20 py-10 flex flex-col items-center justify-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-700">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-2"></div>
            <div className="flex items-center gap-1.5 font-brand text-sm font-black text-white/60">
              Made with <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse mx-0.5" /> by 
              <span className="font-signature text-3xl text-white ml-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-normal leading-none relative -top-0.5">Rishabh</span>
            </div>
          </footer>
        )}
      </main>

      <ChatBuddy 
        isOpen={isChatOpen} 
        onClose={() => {
          setIsChatOpen(false);
          setInitialChatMessage(null);
        }} 
        theme={theme} 
        initialMessage={initialChatMessage}
        onInitialMessageProcessed={() => setInitialChatMessage(null)}
      />
      {state.devMode && <DebugPanel state={state} updateState={updateState} />}
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | null>(null);

  return (
    <AuthProvider>
      <HashRouter>
        <AppWithAuth 
          state={state} 
          setState={setState}
          isInitializing={isInitializing}
          setIsInitializing={setIsInitializing}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          initialChatMessage={initialChatMessage}
          setInitialChatMessage={setInitialChatMessage}
        />
      </HashRouter>
    </AuthProvider>
  );
};

const AppWithAuth: React.FC<{
  state: AppState | null;
  setState: React.Dispatch<React.SetStateAction<AppState | null>>;
  isInitializing: boolean;
  setIsInitializing: React.Dispatch<React.SetStateAction<boolean>>;
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialChatMessage: string | null;
  setInitialChatMessage: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ state, setState, isInitializing, setIsInitializing, isChatOpen, setIsChatOpen, initialChatMessage, setInitialChatMessage }) => {
  const { user, userData, saveUserData } = useAuth();

  const [prevUser, setPrevUser] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when user changes from logged out to logged in
    // to ensure we don't show stale local data while waiting for cloud data.
    if (user && !prevUser) {
      setState(null);
      setIsInitializing(true);
    }
    setPrevUser(user?.uid || null);
  }, [user, prevUser]);

  useEffect(() => {
    async function init() {
      console.log("Neural Initialization: Starting...", { user: user?.uid, hasUserData: !!userData });
      try {
        if (user) {
          if (userData) {
            console.log("Neural Initialization: Using Cloud Data");
            setState(userData);
          } else {
            console.log("Neural Initialization: Waiting for Cloud Data...");
            // Optionally keep the local state if it's already there, 
            // but we want to ensure we don't show stale data if possible.
          }
        } else {
          console.log("Neural Initialization: Using Local Data (Not Logged In)");
          const profile = loadProfileFromLocalStorage();
          const vault = await loadVaultFromIndexedDB();

          const defaultState: AppState = {
            user: { ...INITIAL_USER, streak: 1, lastVisit: new Date().toISOString() },
            theme: ThemeId.DeepSpace,
            quizzes: [],
            flashcards: [],
            summaries: [],
            memory: { attempts: [], mistakeStats: {}, topicStats: {} },
            devMode: false
          };

          setState({
            ...defaultState,
            ...profile,
            ...vault
          });
        }
      } catch (e) {
        console.error("Neural Initialization Critical Failure", e);
      } finally {
        console.log("Neural Initialization: Complete");
        setIsInitializing(false);
      }
    }
    init();
  }, [user, userData]);

  useEffect(() => {
    if (!state) return;
    saveProfileToLocalStorage(state);
    saveVaultToIndexedDB(state);
    
    // Sync to cloud if logged in
    if (user) {
      saveUserData(state);
    }
  }, [state, user, saveUserData]);

  const updateState = (updater: Partial<AppState> | ((prev: AppState) => AppState)) => {
    if (!state) return;
    if (typeof updater === 'function') setState(prev => updater(prev!));
    else setState(prev => ({ ...prev!, ...updater }));
  };

  const openChatWithContext = (message: string) => {
    setInitialChatMessage(message);
    setIsChatOpen(true);
  };

  if (isInitializing || !state) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <Brain className="absolute inset-0 m-auto w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Synchronizing Neural Vault</p>
          <p className="text-white/20 text-[9px] font-medium uppercase tracking-widest">Decompressing Cognitive Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContent 
      state={state} 
      updateState={updateState} 
      openChatWithContext={openChatWithContext}
      isChatOpen={isChatOpen}
      setIsChatOpen={setIsChatOpen}
      initialChatMessage={initialChatMessage}
      setInitialChatMessage={setInitialChatMessage}
    />
  );
};

const NavLinks: React.FC<{ theme: any }> = ({ theme }) => {
  const location = useLocation();
  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/analysis', icon: Activity, label: 'Analysis' },
    { to: '/recent', icon: History, label: 'Vault' },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            location.pathname === link.to 
              ? `bg-${theme.accentColor}/20 text-${theme.accentColor}` 
              : 'hover:bg-white/5 opacity-70 hover:opacity-100'
          }`}
        >
          <link.icon className="w-5 h-5" />
          <span className="text-sm font-semibold hidden lg:block">{link.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default App;
