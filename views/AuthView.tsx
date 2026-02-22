
import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Zap, 
  ArrowRight, 
  Loader2,
  ShieldCheck,
  Dna,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronLeft
} from 'lucide-react';
import { ThemeId } from '../types';

interface AuthViewProps {
  onSuccess: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getErrorMessage = (err: any) => {
    const code = err.code;
    switch (code) {
      case 'auth/user-not-found': return 'Neural profile not found.';
      case 'auth/wrong-password': return 'Invalid security key.';
      case 'auth/email-already-in-use': return 'Email already linked to a profile.';
      case 'auth/weak-password': return 'Security key is too weak (min 6 chars).';
      case 'auth/invalid-email': return 'Invalid email format.';
      default: return err.message || 'Authentication failed';
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage("Reset link sent to your email.");
        setTimeout(() => setIsForgotMode(false), 3000);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotMode) return handleResetPassword(e);

    if (!isFirebaseConfigured || !auth || !db) {
      setError("Firebase is not configured. Please add environment variables.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        // Initialize user data in Firestore
        const initialData = {
          user: {
            name: name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            streak: 0,
            accuracy: 0,
            completedTests: 0,
            avgScore: 0,
            lastVisit: new Date().toISOString(),
            xp: 0,
            level: 1
          },
          theme: ThemeId.DeepSpace,
          quizzes: [],
          flashcards: [],
          summaries: [],
          memory: {
            attempts: [],
            mistakeStats: {},
            topicStats: {}
          },
          devMode: false
        };
        
        await setDoc(doc(db, 'users', user.uid), initialData);
      }
      onSuccess();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass p-10 rounded-[3rem] border border-rose-500/20 shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Vault Link Required</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              To enable personalized profiles and cloud synchronization, you must configure your Firebase environment variables.
            </p>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left space-y-3 mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Required Variables:</p>
              <code className="block text-[10px] text-white/40 font-mono">VITE_FIREBASE_API_KEY</code>
              <code className="block text-[10px] text-white/40 font-mono">VITE_FIREBASE_PROJECT_ID</code>
              <code className="block text-[10px] text-white/40 font-mono">...and others in .env.example</code>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                Check documentation for setup instructions
              </p>
              <button 
                onClick={onSuccess}
                className="text-indigo-400 hover:text-indigo-300 text-[10px] font-black uppercase tracking-widest transition-all underline underline-offset-4"
              >
                Continue in Local Vault Mode
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass p-8 sm:p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-rose-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(225,29,72,0.3)]">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
              Neural<span className="text-rose-500">Prep</span>
            </h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
              {isForgotMode ? 'Restore Neural Access' : isLogin ? 'Establish Synaptic Link' : 'Initialize Neural Pathway'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isForgotMode ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <p className="text-white/60 text-xs text-center mb-6">
                    Enter your email to receive a restoration link for your neural profile.
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="email"
                      placeholder="EMAIL ADDRESS"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-white font-bold focus:outline-none focus:border-rose-500 transition-all"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={isLogin ? "login" : "signup"}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {!isLogin && (
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        type="text"
                        placeholder="FULL NAME"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-white font-bold focus:outline-none focus:border-rose-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="email"
                      placeholder="EMAIL ADDRESS"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-white font-bold focus:outline-none focus:border-rose-500 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="SECURITY KEY"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 pl-12 pr-12 rounded-2xl text-white font-bold focus:outline-none focus:border-rose-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-bold text-center"
              >
                {successMessage}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-sm tracking-[0.4em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isForgotMode ? 'Send Link' : isLogin ? 'Connect' : 'Initialize'} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            {isForgotMode ? (
              <button
                onClick={() => setIsForgotMode(false)}
                className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <ChevronLeft className="w-3 h-3" /> Back to Connection
              </button>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    {isLogin ? "Don't have a neural profile? Create one" : "Already have a profile? Link here"}
                  </button>
                  {isLogin && (
                    <button
                      onClick={() => setIsForgotMode(true)}
                      className="text-white/20 hover:text-white/40 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Forgot Security Key?
                    </button>
                  )}
                </div>
              </>
            )}
            
            <div className="flex items-center gap-6 opacity-20">
              <ShieldCheck className="w-4 h-4 text-white" />
              <Dna className="w-4 h-4 text-white" />
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;
