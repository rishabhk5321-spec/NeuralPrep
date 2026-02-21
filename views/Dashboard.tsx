import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Trophy, 
  Target, 
  Brain,
  Clock,
  ArrowRight,
  Sparkles,
  Heart,
  History,
  AlertCircle,
  BookOpen,
  Activity,
  Lightbulb,
  ShieldAlert,
  AlertTriangle,
  X,
  FileText,
  Ban,
  Info,
  ExternalLink,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, Quiz, Summary } from '../types';
import { THEMES } from '../constants';
import { extractTextFromPDF } from '../services/pdfService';
import { processPDFExtraction } from '../aiBrain/questionAnalyzer';
import { generateAdaptiveSession, createRevisionFlashcards } from '../aiBrain/smartGenerator';
import { generateSummaryFromText } from '../services/geminiService';
import { getPracticeMistakes, getBrainRecommendation } from '../services/memoryService';
import { useNavigate } from 'react-router-dom';

// aistudio is assumed to be globally available as per instructions.
// Removed local declaration to resolve "identical modifiers" and type mismatch errors.

interface DashboardProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, updateState }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [time, setTime] = useState(new Date());
  const [errorModal, setErrorModal] = useState<{title: string, msg: string, technical?: string, isQuota?: boolean} | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const theme = THEMES[state.theme];

  const prescription = useMemo(() => getBrainRecommendation(state), [state]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const completedQuizzes = state.quizzes.filter(q => q.score !== undefined);
  const testsCompleted = completedQuizzes.length;
  const averageScore = testsCompleted > 0 
    ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / testsCompleted) 
    : 0;
  const accuracy = averageScore;
  const currentStreak = state.user.streak || 1;
  const totalMistakes = Object.keys(state.memory.mistakeStats).length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'quiz' | 'flash' | 'neet' | 'summary') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorModal(null);
      setLoadingMsg('Scanning Knowledge Nodes...');
      const text = await extractTextFromPDF(file);
      await processTextForQuiz(text, file.name.replace('.pdf', ''), mode === 'neet' ? 'timed' : 'practice');
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      handleProcessingError(error);
    } finally {
      setIsProcessing(false);
      setLoadingMsg('');
    }
  };

  const processTextForQuiz = async (text: string, title: string, mode: 'practice' | 'timed') => {
    setLoadingMsg('Neural AI: Parsing Concepts...');
    const questions = await processPDFExtraction(text);
    if (!questions || questions.length === 0) {
      throw new Error("AI core failed to identify structured questions. The source text may be too complex or restricted.");
    }
    const newQuiz: Quiz = {
      id: crypto.randomUUID(),
      title: title || 'Pasted Content Session',
      questions,
      timestamp: Date.now(),
      duration: 0
    };
    updateState((prev: AppState) => ({
      ...prev,
      quizzes: [newQuiz, ...prev.quizzes]
    }));
    navigate('/quiz', { state: { quizId: newQuiz.id, mode } });
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    try {
      setShowPasteModal(false);
      setIsProcessing(true);
      setErrorModal(null);
      setLoadingMsg('Neural Pulse: Injecting Questions...');
      await processTextForQuiz(pastedText, 'Instant Paste Session', 'practice');
    } catch (error: any) {
      handleProcessingError(error);
    } finally {
      setIsProcessing(false);
      setPastedText('');
    }
  };

  const handleProcessingError = (error: any) => {
    console.error("Diagnostic Log:", error);
    
    const message = error?.message || "An unknown fault occurred in the neural architecture.";
    const technical = error?.stack || JSON.stringify(error);
    const lowerMsg = message.toLowerCase();
    const status = error?.status;

    let title = "Neural Core Fault";
    let isQuota = false;

    if (lowerMsg.includes("api_key") || lowerMsg.includes("unauthorized") || lowerMsg.includes("403")) {
      title = "Neural Link Offline";
    } else if (lowerMsg.includes("quota") || lowerMsg.includes("429") || lowerMsg.includes("limit") || lowerMsg.includes("exhausted")) {
      title = "Neural Quota Exceeded";
      isQuota = true;
    } else if (lowerMsg.includes("location") || lowerMsg.includes("supported") || lowerMsg.includes("not found")) {
      title = "Model Restriction";
      isQuota = true; // Also suggest linking project for restricted models
    }

    setErrorModal({
      title: title.toUpperCase(),
      msg: message,
      technical: technical,
      isQuota: isQuota
    });
  };

  const handleLinkProject = async () => {
    try {
      // Use any cast to satisfy compiler while relying on global definition
      await (window as any).aistudio.openSelectKey();
      setErrorModal(null);
      // Proceed assuming the key selection was successful as per instructions
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const triggerUpload = (mode: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-mode', mode);
      fileInputRef.current.click();
    }
  };

  const startAdaptiveSession = async () => {
    try {
      setIsProcessing(true);
      setErrorModal(null);
      setLoadingMsg(`Generating Adaptive Sync...`);
      const smartQuestions = await generateAdaptiveSession(state);
      const smartQuiz: Quiz = {
        id: 'adaptive-' + Date.now(),
        title: `AI Adaptive: ${prescription.topic || 'Revision'}`,
        questions: smartQuestions,
        timestamp: Date.now(),
        duration: 0,
        isSmartMode: true
      };
      updateState((prev: AppState) => ({ ...prev, quizzes: [smartQuiz, ...prev.quizzes] }));
      navigate('/quiz', { state: { quizId: smartQuiz.id, mode: 'practice' } });
    } catch (e: any) {
      handleProcessingError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const startMistakeRecovery = () => {
    const mistakeQuestions = getPracticeMistakes(state);
    if (mistakeQuestions.length === 0) {
      alert("No failed nodes in archives.");
      return;
    }
    const mistakeQuiz: Quiz = {
      id: 'mistake-recovery-' + Date.now(),
      title: 'Mistake Recovery Module',
      questions: mistakeQuestions,
      timestamp: Date.now(),
      duration: 0,
      isMistakeMode: true
    };
    updateState((prev: AppState) => ({ ...prev, quizzes: [mistakeQuiz, ...prev.quizzes] }));
    navigate('/quiz', { state: { quizId: mistakeQuiz.id, mode: 'practice' } });
  };

  const handleCancelProcessing = () => {
    setIsProcessing(false);
    setLoadingMsg('');
  };

  const containerVariants = {
    normal: { opacity: 1, scale: 1 },
    collapsing: { 
      opacity: 0.1, 
      scale: 0.8,
      // Fixed: Easing string must be literal to match Easing type in Framer Motion variants
      transition: { duration: 0.8, ease: "easeInOut" as const }
    }
  };

  return (
    <div className="relative pb-16 max-w-5xl mx-auto space-y-8 overflow-hidden">
      
      {/* Paste Modal Overlay */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
           <div className="max-w-3xl w-full glass-thick rounded-[3rem] border border-white/10 shadow-2xl flex flex-col p-8 sm:p-12 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                       <Zap className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Neural Pulse</h3>
                       <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mt-1">Direct Question Injection</p>
                    </div>
                 </div>
                 <button onClick={() => setShowPasteModal(false)} className="p-3 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6 text-white/40" /></button>
              </div>

              <div className="flex-1 min-h-[300px] mb-8 relative">
                 <textarea 
                   className="w-full h-full bg-black/40 border-2 border-white/5 rounded-[2rem] p-8 text-slate-200 text-lg font-medium focus:outline-none focus:border-indigo-500/30 transition-all scroll-slim placeholder:opacity-20"
                   placeholder="Paste your questions here..."
                   value={pastedText}
                   onChange={(e) => setPastedText(e.target.value)}
                 />
                 <div className="absolute bottom-6 right-8 text-[9px] font-black text-white/10 uppercase tracking-widest pointer-events-none">AI Extraction Terminal</div>
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setShowPasteModal(false)} className="px-8 py-5 glass border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Cancel</button>
                 <button 
                   onClick={handlePasteSubmit}
                   disabled={!pastedText.trim()}
                   className="flex-1 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] disabled:opacity-20 disabled:scale-100"
                 >
                   Initialize Neural Sync
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* RE-ENGINEERED Error Modal with Link Project Action */}
      {errorModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="glass-thick max-w-xl w-full p-10 rounded-[4rem] border-rose-500/30 text-center shadow-2xl animate-in zoom-in duration-300 flex flex-col items-center">
             <div className="w-24 h-24 bg-rose-500/20 rounded-[2.5rem] flex items-center justify-center mb-8">
                <AlertTriangle className="w-12 h-12 text-rose-500" />
             </div>
             <h3 className="text-4xl font-black text-white mb-4 tracking-tighter leading-none">{errorModal.title}</h3>
             <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8 px-4">
               {errorModal.msg}
               {errorModal.isQuota && (
                 <span className="block mt-4 text-sm text-rose-400/80 italic font-bold">
                   Pro-series models often have zero quota on free tier projects. Link a project with billing to resolve this.
                 </span>
               )}
             </p>
             
             {errorModal.technical && (
               <div className="w-full mb-10 text-left bg-black/60 p-6 rounded-3xl border border-white/5 overflow-hidden">
                  <div className="flex items-center gap-2 mb-3 opacity-30 text-[10px] font-black uppercase tracking-widest">
                     <Info className="w-3.5 h-3.5" /> Synchronized Log (ID: {Math.random().toString(36).substr(2, 6).toUpperCase()})
                  </div>
                  <p className="text-[11px] font-mono text-rose-300/60 leading-relaxed overflow-x-auto whitespace-pre-wrap">{errorModal.technical.slice(0, 300)}...</p>
               </div>
             )}

             <div className="flex flex-col w-full gap-4">
               {errorModal.isQuota && (
                 <button 
                   onClick={handleLinkProject} 
                   className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.4em] text-[12px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(99,102,241,0.4)] flex items-center justify-center gap-4"
                 >
                   <Key className="w-5 h-5" /> Link Paid Project
                 </button>
               )}
               <button 
                 onClick={() => setErrorModal(null)} 
                 className="w-full py-6 bg-white text-slate-950 rounded-3xl font-black uppercase tracking-[0.4em] text-[12px] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4"
               >
                 Dismiss Diagnostic
               </button>
               {errorModal.isQuota && (
                 <a 
                   href="https://ai.google.dev/gemini-api/docs/billing" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 transition-all flex items-center justify-center gap-2 underline"
                 >
                   Billing Documentation <ExternalLink className="w-3 h-3" />
                 </a>
               )}
             </div>
          </div>
        </div>
      )}

      {/* High Priority Neural Prescription */}
      <AnimatePresence>
        {!isProcessing && prescription.priority >= 2 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`glass p-6 rounded-[2rem] border-l-4 ${prescription.priority === 3 ? 'border-rose-500 bg-rose-500/5' : 'border-amber-500 bg-amber-500/5'} shadow-2xl`}
          >
            <div className="flex items-center gap-4">
                <div className={`p-3 ${prescription.priority === 3 ? 'bg-rose-500/20' : 'bg-amber-500/20'} rounded-2xl`}>
                  {prescription.priority === 3 ? <ShieldAlert className="w-6 h-6 text-rose-400" /> : <Lightbulb className="w-6 h-6 text-amber-400" />}
                </div>
                <div className="flex-1">
                  <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${prescription.priority === 3 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {prescription.priority === 3 ? 'Immediate Action Recommended' : 'AI Optimization Tip'}
                  </h4>
                  <p className="text-sm font-bold text-white leading-snug">{prescription.reason}</p>
                </div>
                <button 
                  onClick={prescription.type === 'MISTAKE_RESET' ? startMistakeRecovery : startAdaptiveSession}
                  className="px-6 py-3 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl whitespace-nowrap"
                >
                  Launch Protocol
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={containerVariants}
        animate={isProcessing ? "collapsing" : "normal"}
        className="space-y-8"
      >
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className={`absolute -inset-1 bg-gradient-to-tr from-${theme.accentColor} to-purple-500 rounded-full blur opacity-20`}></div>
              <img src={state.user.avatar} className="relative w-20 h-20 rounded-full border-2 border-white/10 object-cover shadow-2xl" alt="Profile" />
            </div>
            <div>
              <h1 className="font-brand text-3xl font-black text-white tracking-tight">Status: <span className={`text-${theme.accentColor}`}>{state.user.name}</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Level {state.user.level}</span>
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                <span className={`text-xs font-bold ${prescription.type === 'STABLE' ? 'text-emerald-400' : 'text-indigo-400'} uppercase tracking-widest`}>
                  Neural Engine: {prescription.type === 'STABLE' ? 'Stable' : 'Adaptive'}
                </span>
              </div>
            </div>
          </div>

          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/5 shadow-xl">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Atomic Clock</p>
              <p className="text-xl font-black text-white tabular-nums">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <Clock className={`w-5 h-5 text-${theme.accentColor}`} />
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SmallStat icon={Zap} label="Momentum" value={currentStreak} color="orange" />
          <SmallStat icon={Target} label="Precision" value={accuracy + '%'} color="emerald" onClick={() => navigate('/analysis')} />
          <SmallStat icon={History} label="Fault Log" value={totalMistakes} color="rose" onClick={startMistakeRecovery} />
          <SmallStat icon={Activity} label="Cognitive" value={prescription.priority === 3 ? 'Critical' : 'Nominal'} color="indigo" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          <PrimaryAction 
            icon={Brain} 
            title="Concept Sync (PDF)" 
            description="Transform any PDF document into a structured neural practice set."
            color="emerald"
            onClick={() => triggerUpload('quiz')}
            className="lg:col-span-2 border-emerald-500/20"
            badge="High-Efficiency"
          />
          <PrimaryAction 
            icon={Zap} 
            title="Neural Pulse (Paste)" 
            description="Directly paste questions from any source to bypass document scanning."
            color="indigo"
            onClick={() => setShowPasteModal(true)}
            badge="Instant Sync"
          />
          <PrimaryAction 
            icon={BookOpen} 
            title="Rapid Summary" 
            description="Extract the executive summary and key core concepts from your materials."
            color="cyan"
            onClick={() => triggerUpload('summary')}
          />
          <PrimaryAction 
            icon={Sparkles} 
            title="Adaptive Remediation" 
            description="AI generates a practice module specifically targeting detected bottlenecks."
            color="indigo"
            onClick={startAdaptiveSession}
            badge="Neural Brain"
          />
          <PrimaryAction 
            icon={AlertCircle} 
            title="Mistake Mastery" 
            description="Relive and correct failed attempts to fix long-term memory patterns."
            color="rose"
            onClick={startMistakeRecovery}
            disabled={totalMistakes === 0}
          />
        </section>
      </motion.div>

      <input type="file" className="hidden" accept=".pdf" ref={fileInputRef} onChange={(e) => handleFileChange(e, fileInputRef.current?.getAttribute('data-mode') as any)} />

      {/* Processing Core */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-2xl"
          >
            <motion.div 
              animate={{ y: ['-100%', '100%'], opacity: [0, 1, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${theme.accentColor} to-transparent shadow-[0_0_20px_rgba(99,102,241,0.5)] z-0`}
            />

            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative flex items-center justify-center w-64 h-64"
            >
              <div className={`absolute inset-0 rounded-full border border-white/5 shadow-[0_0_100px_rgba(99,102,241,0.15)] animate-pulse`}></div>
              <div className={`w-40 h-40 rounded-full border-[6px] border-white/5 border-t-${theme.accentColor} animate-spin shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]`}></div>
              <motion.div 
                animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute w-32 h-32 rounded-full bg-${theme.accentColor}/20 blur-[30px]`}
              />
              <motion.div className="absolute flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Brain className={`w-16 h-16 text-${theme.accentColor} filter drop-shadow-[0_0_25px_rgba(99,102,241,0.8)]`} />
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 text-center"
            >
              <h2 className="font-brand text-4xl font-black text-white tracking-tighter uppercase mb-4">
                {loadingMsg}
              </h2>
              <div className="flex flex-col items-center gap-1.5 mb-10">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      className={`w-1.5 h-1.5 rounded-full bg-${theme.accentColor}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.6em] ml-1">
                  Synchronizing Neural Architecture
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelProcessing}
                className="px-8 py-3.5 glass border-white/10 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all mx-auto shadow-2xl"
              >
                <Ban className="w-4 h-4" /> Cancel Synchronization
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SmallStat: React.FC<{ icon: any, label: string, value: any, color: string, onClick?: () => void }> = ({ icon: Icon, label, value, color, onClick }) => (
  <motion.button 
    whileHover={{ scale: 1.05, y: -5 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick} 
    className={`glass p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center group hover:bg-white/[0.02] transition-colors ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
  >
    <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-5 h-5 text-${color}-400`} />
    </div>
    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">{label}</p>
    <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
  </motion.button>
);

const PrimaryAction: React.FC<{ 
  icon: any, 
  title: string, 
  description: string, 
  color: string, 
  onClick: () => void, 
  className?: string,
  badge?: string,
  disabled?: boolean
}> = ({ icon: Icon, title, description, color, onClick, className, badge, disabled }) => (
  <motion.button 
    whileHover={!disabled ? { scale: 1.02, y: -8, rotateZ: 0.5 } : {}}
    whileTap={!disabled ? { scale: 0.98 } : {}}
    layout
    onClick={onClick}
    disabled={disabled}
    className={`glass p-8 rounded-[2.5rem] border border-white/5 text-left flex flex-col justify-between group hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-2xl relative overflow-hidden ${className} ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-14 h-14 rounded-2xl bg-${color}-500/10 flex items-center justify-center shadow-inner ${!disabled && 'group-hover:scale-110'} transition-transform`}>
          <Icon className={`w-7 h-7 text-${color}-400`} />
        </div>
        {badge && <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">{badge}</span>}
      </div>
      <h3 className="font-brand text-2xl font-black text-white tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-[280px] group-hover:text-slate-300 transition-colors">{description}</p>
    </div>
    <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-white transition-colors">
        {disabled ? 'Vault Empty' : 'Initialize Protocol'} <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  </motion.button>
);

export default Dashboard;