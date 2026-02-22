
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw,
  Home,
  X,
  Brain,
  Zap,
  Lightbulb,
  ArrowRight,
  GripVertical,
  Image as ImageIcon,
  SkipForward,
  Target,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Bot,
  TrendingUp,
  FileText,
  Pause,
  Play,
  Activity,
  ShieldCheck,
  Dna,
  Keyboard,
  Info,
  Layers,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppState, Quiz, Question, Attempt, QuizHistoryEntry, ThemeId, Badge } from '../types';
import { THEMES } from '../constants';
import { playCorrectSound, playWrongSound, playClickSound } from '../services/audioService';
import { submitAttempt } from '../services/memoryService';
import { analyzePerformance } from '../services/geminiService';

interface QuizEngineProps {
  state: AppState;
  updateState: (updater: any) => void;
  onDiscuss?: (message: string) => void;
}

const QuizEngine: React.FC<QuizEngineProps> = ({ state, updateState, onDiscuss }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = THEMES[state.theme];
  
  const quizId = location.state?.quizId;
  const mode = location.state?.mode || 'practice';
  const historyEntryTimestamp = location.state?.historyEntryTimestamp;
  const viewLatest = location.state?.viewLatest; // New flag for Latest Report
  const quiz = state.quizzes.find(q => q.id === quizId);

  // If we are viewing a specific history entry, override results logic
  const historyEntry = useMemo(() => {
    if (!quiz) return null;
    if (historyEntryTimestamp) {
      return quiz.history?.find(h => h.timestamp === historyEntryTimestamp);
    }
    if (viewLatest && quiz.history && quiz.history.length > 0) {
      return quiz.history[0]; // Latest is first in array
    }
    return null;
  }, [quiz, historyEntryTimestamp, viewLatest]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isFinished, setIsFinished] = useState(false); // Initially false, will be set by useEffect
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(mode === 'timed' ? 600 : 0); 
  const [showHint, setShowHint] = useState(false);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dynamicExplanation, setDynamicExplanation] = useState<string | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  const lastQuestionTimeRef = useRef<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (historyEntry) {
      setUserAnswers(historyEntry.answers);
      setIsFinished(true);
    } else if (viewLatest && quiz?.lastAnswers) {
      // Fallback for older data without history array
      setUserAnswers(quiz.lastAnswers);
      setIsFinished(true);
    }
  }, [historyEntry, viewLatest, quiz]);

  const currentQuestion = useMemo(() => quiz?.questions[currentIndex], [quiz, currentIndex]);

  /**
   * Robust normalization for answer comparison.
   * Cleans punctuation, extra whitespace, and common list markers.
   */
  const normalize = (val: any): string => {
    if (val === undefined || val === null) return "";
    let s = String(val).trim().toLowerCase();
    
    // Remove common prefixes like "a)", "1.", "(b)" etc.
    s = s.replace(/^[a-z0-9][\.\)\-\:]\s+/, "");
    // Remove Markdown formatting
    s = s.replace(/[\*\_]/g, '');
    // Remove final punctuation and extra spaces
    s = s.replace(/[\.\,\?\!]$/, '').replace(/\s+/g, ' ');
    
    return s.trim();
  };

  /**
   * Advanced Answer Verification
   * Handles direct matches, label-to-text mapping, and numeric precision.
   */
  const checkIsCorrect = useCallback((q: Question, selected: any): boolean => {
    if (selected === undefined || selected === null) return false;
    
    const normSelected = normalize(selected);
    const normCorrect = normalize(q.correctAnswer);

    // 1. Direct Text Match
    if (normSelected === normCorrect) return true;

    // 2. MCQ / Assertion Label Mapping (e.g., correct answer "A" matches selected "Option Text")
    if (q.options && q.options.length > 0) {
      const labels = ['a', 'b', 'c', 'd', 'e'];
      
      // Case A: correctAnswer is "A", user selected "Paris"
      const labelIdx = labels.indexOf(normCorrect);
      if (labelIdx !== -1 && q.options[labelIdx]) {
        if (normalize(q.options[labelIdx]) === normSelected) return true;
      }

      // Case B: correctAnswer is "Paris", user pressed "1" or "A" on keyboard
      const selectedLabelIdx = labels.indexOf(normSelected);
      if (selectedLabelIdx !== -1 && q.options[selectedLabelIdx]) {
        if (normalize(q.options[selectedLabelIdx]) === normCorrect) return true;
      }
      
      // Case C: Numeric label index check
      const numericCorrectIdx = parseInt(normCorrect) - 1; // 1-based index support
      if (!isNaN(numericCorrectIdx) && q.options[numericCorrectIdx]) {
        if (normalize(q.options[numericCorrectIdx]) === normSelected) return true;
      }
    }

    // 3. Match The Column Logic
    if (q.type === 'match_the_column') {
      const userMap = selected || {};
      const correctMap = q.correctMatches || {};
      const correctKeys = q.columnA || Object.keys(correctMap);
      if (correctKeys.length === 0) return false;
      return correctKeys.every(k => normalize(userMap[k]) === normalize(correctMap[k]));
    }

    // 4. Numeric Approximation (Optional but helpful for science/math)
    if (q.type === 'numeric') {
      const numSelected = parseFloat(normSelected);
      const numCorrect = parseFloat(normCorrect);
      if (!isNaN(numSelected) && !isNaN(numCorrect)) {
        return Math.abs(numSelected - numCorrect) < 0.01; // Allow small rounding diff
      }
    }

    return false;
  }, []);

  const handleFinish = useCallback(async () => {
    if (isFinished || !quiz) return;
    const now = Date.now();
    const finalQTime = now - lastQuestionTimeRef.current;
    const qId = currentQuestion?.id || 'last';
    const finalQuestionTimes = { ...questionTimes, [qId]: finalQTime };

    setIsFinished(true);
    playClickSound();
    
    let correctCount = 0;
    const timestamp = Date.now();
    const attempts: Attempt[] = [];

    quiz.questions.forEach(q => {
      const selected = userAnswers[q.id];
      const isCorrect = checkIsCorrect(q, selected);
      if (isCorrect) correctCount++;
      
      attempts.push({
        questionId: q.id,
        questionText: q.questionText,
        topic: q.topic || quiz.title || 'General',
        subtopic: q.subtopic,
        selectedAnswer: selected,
        correctAnswer: q.type === 'match_the_column' ? q.correctMatches : q.correctAnswer,
        isCorrect: isCorrect,
        timestamp: timestamp,
        timeTaken: finalQuestionTimes[q.id] || 0,
        pattern: q.pattern 
      });
    });

    const scorePct = Math.round((correctCount / (quiz.questions.length || 1)) * 100);
    const xpGained = correctCount * 15;
    const timeTakenTotal = mode === 'timed' ? 600 - timer : timer;

    updateState((prev: AppState) => {
      const newXp = prev.user.xp + xpGained;
      const newLevel = Math.floor(newXp / 1000) + 1;
      const currentBadges = [...(prev.user.badges || [])];
      const currentUnlockedThemes = [...(prev.user.unlockedThemes || [])];

      // Badge: Perfect Sync
      if (scorePct === 100 && quiz.questions.length >= 20 && !currentBadges.find(b => b.id === 'perfect_sync')) {
        currentBadges.push({
          id: 'perfect_sync',
          name: 'Perfect Sync',
          description: '100% accuracy on a 20+ question quiz',
          icon: 'Target',
          unlockedAt: timestamp
        });
      }

      // Badge: Speed Demon
      if (mode === 'timed' && timeTakenTotal < 300 && scorePct >= 80 && !currentBadges.find(b => b.id === 'speed_demon')) {
        currentBadges.push({
          id: 'speed_demon',
          name: 'Speed Demon',
          description: 'Finished a timed quiz in under 5 minutes with 80%+ score',
          icon: 'Zap',
          unlockedAt: timestamp
        });
      }

      // Theme Unlocks
      if (newLevel >= 5 && !currentUnlockedThemes.includes(ThemeId.NebulaGold)) {
        currentUnlockedThemes.push(ThemeId.NebulaGold);
      }
      if (newLevel >= 10 && !currentUnlockedThemes.includes(ThemeId.CyberGrid)) {
        currentUnlockedThemes.push(ThemeId.CyberGrid);
      }

      const updatedQuizzes = prev.quizzes.map(q => {
        if (q.id === quizId) {
          const history = q.history || [];
          return { 
            ...q, 
            score: scorePct, 
            lastAnswers: userAnswers,
            history: [{
              score: scorePct,
              timestamp: timestamp,
              answers: userAnswers,
              timeTaken: timeTakenTotal
            }, ...history] 
          };
        }
        return q;
      });
      
      let currentMemory = prev.memory;
      attempts.forEach(attempt => {
        currentMemory = submitAttempt({ ...prev, memory: currentMemory }, attempt);
      });

      return {
        ...prev,
        quizzes: updatedQuizzes,
        memory: currentMemory,
        user: {
          ...prev.user,
          completedTests: prev.user.completedTests + 1,
          avgScore: Math.round(((prev.user.avgScore * prev.user.completedTests) + scorePct) / (prev.user.completedTests + 1)),
          accuracy: scorePct,
          xp: newXp,
          level: newLevel,
          badges: currentBadges,
          unlockedThemes: currentUnlockedThemes
        }
      };
    });
  }, [isFinished, quiz, currentQuestion, questionTimes, userAnswers, quizId, updateState, checkIsCorrect, mode, timer]);

  const handleCheckAnswer = useCallback(async () => {
    if (!currentQuestion) return;
    const answer = userAnswers[currentQuestion.id];
    
    if (currentQuestion.type === 'match_the_column') {
      const columnA = currentQuestion.columnA || [];
      const answers = answer || {};
      if (columnA.length > 0 && Object.keys(answers).length < columnA.length) {
         return; 
      }
    } else if (!answer) {
      return;
    }
    
    const now = Date.now();
    const elapsed = now - lastQuestionTimeRef.current;
    setQuestionTimes(prev => ({ ...prev, [currentQuestion.id]: (prev[currentQuestion.id] || 0) + elapsed }));
    
    setIsAnswerChecked(true);
    const isCorrect = checkIsCorrect(currentQuestion, userAnswers[currentQuestion.id]);
    if (isCorrect) playCorrectSound();
    else playWrongSound();

    // Generate Dynamic Explanation
    setIsGeneratingExplanation(true);
    try {
      const prompt = `
        ACT AS A NEURALPREP COGNITIVE MASTER.
        Question: ${currentQuestion.questionText}
        User's Selected Answer: ${JSON.stringify(userAnswers[currentQuestion.id])}
        Correct Answer: ${currentQuestion.type === 'match_the_column' ? JSON.stringify(currentQuestion.correctMatches) : currentQuestion.correctAnswer}
        Static Explanation: ${currentQuestion.explanation}

        TASK:
        1. Briefly explain why the user's answer is ${isCorrect ? 'CORRECT' : 'INCORRECT'}.
        2. Provide a simple, clear, and professional explanation of the concept.
        3. Use PLAIN TEXT ONLY. NO MARKDOWN. NO BOLDING.
        4. Keep it under 100 words.
      `;
      const { chatWithStudyBuddy } = await import('../services/geminiService');
      const explanation = await chatWithStudyBuddy([], prompt);
      setDynamicExplanation(explanation);
    } catch (e) {
      setDynamicExplanation(currentQuestion.explanation);
    } finally {
      setIsGeneratingExplanation(false);
    }
  }, [currentQuestion, userAnswers, checkIsCorrect]);

  // Timer Logic
  useEffect(() => {
    if (isFinished || isPaused || isAnswerChecked) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (mode === 'timed') {
          if (prev <= 0) {
            handleFinish();
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isFinished, isPaused, isAnswerChecked, mode, handleFinish]);

  const handleNext = useCallback(() => {
    if (!quiz || !currentQuestion) return;
    
    lastQuestionTimeRef.current = Date.now();

    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowHint(false);
      setIsAnswerChecked(false);
      setDynamicExplanation(null);
    } else {
      handleFinish();
    }
  }, [quiz, currentQuestion, currentIndex, handleFinish]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setShowHint(false);
    setIsAnswerChecked(false);
  }, []);

  const handleSelectAnswer = useCallback((answer: any) => {
    if (isFinished || isPaused || isAnswerChecked) return;
    playClickSound();
    setUserAnswers(prev => ({ ...prev, [currentQuestion!.id]: answer }));
  }, [isFinished, isPaused, isAnswerChecked, currentQuestion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || isPaused) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      if (e.code === 'Space') {
        e.preventDefault();
        if (isAnswerChecked) handleNext();
        else handleCheckAnswer();
      }

      if (key === 'h') setShowHint(prev => !prev);
      if (e.code === 'Escape') setIsPaused(true);

      if (!isAnswerChecked && (currentQuestion?.type === 'mcq' || currentQuestion?.type === 'assertion_reason')) {
        const optionKeys = ['1', '2', '3', '4', 'a', 'b', 'c', 'd'];
        const index = optionKeys.indexOf(key) % 4;
        if (index !== -1 && currentQuestion.options?.[index]) {
          handleSelectAnswer(currentQuestion.options[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, isPaused, isAnswerChecked, currentQuestion, userAnswers, handleNext, handleCheckAnswer, handleSelectAnswer]);

  const onDragStart = (item: string) => {
    setDraggedItem(item);
  };

  const onDragOver = (e: React.DragEvent, label: string) => {
    e.preventDefault();
    setDropTarget(label);
  };

  const onDrop = (label: string) => {
    if (!draggedItem || isAnswerChecked || !currentQuestion) return;
    const currentMatches = { ...(userAnswers[currentQuestion.id] || {}) };
    Object.keys(currentMatches).forEach(key => {
      if (currentMatches[key] === draggedItem) delete currentMatches[key];
    });
    currentMatches[label] = draggedItem;
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: currentMatches }));
    setDraggedItem(null);
    setDropTarget(null);
    playClickSound();
  };

  const formatTime = (s: number) => {
    const min = Math.floor(Math.abs(s) / 60);
    const sec = Math.abs(s) % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Markers: I., II., III., IV., V., Statement I:, Statement II:, Assertion A:, Reason R:, etc.
    const markerRegex = /(\b(?:Statement\s+)?(?:I|II|III|IV|V|1|2|3|4|5)[\.\:]\s+|\bAssertion\s?\(?A\)?[:\-]\s+|\bReason\s?\(?R\)?[:\-]\s+|\bAssertion[:\-]\s+|\bReason[:\-]\s+)/gi;
    const parts = text.split(markerRegex);
    
    if (parts.length === 1) {
      return <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight relative z-10 max-w-4xl">{text}</h3>;
    }

    const elements = [];
    const intro = parts[0].trim();
    if (intro) {
      elements.push(<p key="intro" className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-6 relative z-10">{intro}</p>);
    }

    const instructionMarkers = [
      "In the light of the above statements",
      "The option with correct statements is/are",
      "Choose the correct answer from the options given below",
      "Select the correct option"
    ];

    for (let i = 1; i < parts.length; i += 2) {
      const marker = parts[i].trim();
      let content = parts[i + 1] || "";
      let instruction = "";

      // Only check for instruction in the very last content part
      if (i + 2 >= parts.length) {
        for (const instr of instructionMarkers) {
          const idx = content.toLowerCase().indexOf(instr.toLowerCase());
          if (idx !== -1) {
            instruction = content.substring(idx).trim();
            content = content.substring(0, idx).trim();
            break;
          }
        }
      }

      elements.push(
        <div key={i} className="flex gap-4 items-start py-3 animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-500 shrink-0 mt-0.5 min-w-[60px] text-center shadow-[0_0_15px_rgba(244,63,94,0.1)] uppercase">
            {marker.trim().replace(/[:\.\-]$/, '')}
          </div>
          <div className="text-lg sm:text-xl text-white/90 leading-relaxed font-semibold">{content.trim()}</div>
        </div>
      );

      if (instruction) {
        elements.push(
          <div key="instruction" className="mt-8 pt-6 border-t border-white/10 animate-in fade-in duration-700">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-3">
              <Sparkles className="w-4 h-4" /> {instruction}
            </p>
          </div>
        );
      }
    }

    return <div className="relative z-10 max-w-4xl w-full space-y-2">{elements}</div>;
  };

  if (!quiz || !currentQuestion) return null;

  if (isFinished) {
    const correctCount = quiz.questions.filter(q => checkIsCorrect(q, userAnswers[q.id])).length;
    const scorePct = Math.round((correctCount / quiz.questions.length) * 100);
    const scoreColor = scorePct >= 80 ? 'emerald' : scorePct >= 50 ? 'amber' : 'rose';
    
    return (
      <div className="fixed inset-0 z-[100] bg-[#050508] flex flex-col items-center p-4 sm:p-6 lg:p-8 overflow-hidden selection:bg-rose-500/30">
        <div className="max-w-[1400px] w-full h-full flex flex-col animate-in zoom-in-95 duration-700 gap-6">
          
          {/* HEADER - DIAGNOSTIC OVERVIEW */}
          <div className="glass p-8 sm:p-10 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden shrink-0">
             <div className={`absolute top-0 right-0 w-[600px] h-[600px] bg-${scoreColor}-500/5 rounded-full blur-[120px] -z-10 -translate-y-1/2 translate-x-1/2`}></div>
             <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                <div className="flex flex-col sm:flex-row items-center gap-10">
                   <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl"></div>
                      <svg className="w-40 h-40 -rotate-90 relative z-10">
                        <circle cx="80" cy="80" r="72" className="stroke-white/5 fill-none" strokeWidth="12" />
                        <circle cx="80" cy="80" r="72" className={`stroke-${scoreColor}-500 fill-none transition-all duration-1500 ease-out`} 
                          strokeWidth="12" strokeDasharray={452.4} strokeDashoffset={452.4 - (452.4 * scorePct) / 100} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <span className="text-4xl font-black text-white tracking-tighter">{scorePct}%</span>
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.3em] mt-1">Efficiency</span>
                      </div>
                   </div>
                   <div className="space-y-4 text-center sm:text-left">
                      <div>
                        <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.5em] mb-2 flex items-center justify-center sm:justify-start gap-2">
                          <Activity className="w-3 h-3" /> {historyEntry ? 'Historical Archive' : 'Neural Mission Terminal'}
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-black text-white leading-none uppercase tracking-tighter max-w-2xl">{quiz.title}</h1>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                         <div className="glass px-4 py-2 rounded-2xl flex items-center gap-3 border-white/10">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase text-white/50 tracking-widest">Protocol: <span className="text-white">COMPLETED</span></span>
                         </div>
                         <div className="glass px-4 py-2 rounded-2xl flex items-center gap-3 border-white/10">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            <span className="text-[9px] font-black uppercase text-white/50 tracking-widest">Integrity: <span className="text-white">VALIDATED</span></span>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                  <CompactSummaryStat icon={Target} label="Node Hits" value={`${correctCount}/${quiz.questions.length}`} color="emerald" />
                  <CompactSummaryStat icon={Clock} label="Latency" value={formatTime(historyEntry?.timeTaken || (mode === 'timed' ? 600 - timer : timer))} color="cyan" />
                  <CompactSummaryStat icon={Award} label="XP Net" value={`+${correctCount * 15}`} color="amber" />
                  <CompactSummaryStat icon={TrendingUp} label="Grade" value={scorePct >= 90 ? 'S+' : scorePct >= 80 ? 'A' : 'B-'} color="indigo" />
                </div>
             </div>
          </div>

          {/* CONTENT - LOG ENTRIES */}
          <div className="flex-1 min-h-0">
             <div className="glass h-full rounded-[3rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl bg-[#0c0c14]/60">
                <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl"><FileText className="w-6 h-6 text-white/40" /></div>
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Diagnostic Node Log</h2>
                        <p className="text-[9px] font-black uppercase text-white/20 tracking-widest mt-1">Detailed synaptic response analysis</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase text-rose-500 tracking-widest">Live Analysis</span>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto scroll-slim p-8 space-y-4">
                  {quiz.questions.map((q, idx) => (
                    <CompactNodeCard 
                      key={q.id} index={idx + 1} question={q} 
                      userAnswer={userAnswers[q.id]} isCorrect={checkIsCorrect(q, userAnswers[q.id])} 
                      onDiscuss={() => {
                        const context = `I want to discuss Question ${idx + 1}: "${q.questionText}". 
                        My answer was: "${userAnswers[q.id] || 'No answer'}". 
                        The correct answer is: "${q.type === 'match_the_column' ? JSON.stringify(q.correctMatches) : q.correctAnswer}". 
                        Explanation provided: "${q.explanation}". 
                        Can you explain this in more detail or clarify why my answer was ${checkIsCorrect(q, userAnswers[q.id]) ? 'correct' : 'incorrect'}?`;
                        onDiscuss?.(context);
                      }}
                    />
                  ))}
                </div>
             </div>
          </div>

          {/* FOOTER - PROTOCOL CONTROLS */}
          <div className="flex items-center justify-between py-6 shrink-0 border-t border-white/5">
             <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
                <div className="flex items-center gap-2"><Keyboard className="w-4 h-4 opacity-50" /> Protocol Ready</div>
                <div className="w-1 h-1 rounded-full bg-white/10"></div>
                <div className="flex items-center gap-2"><Bot className="w-4 h-4 opacity-50" /> AI Diagnostic Active</div>
             </div>
             <div className="flex gap-4">
                <button 
                  onClick={() => navigate('/')} 
                  className="px-8 py-4 glass border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-white/50 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-all group shadow-xl"
                >
                  <Home className="w-5 h-5 group-hover:scale-110 transition-transform" /> Return to HQ
                </button>
                {!historyEntry && (
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-12 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(225,29,72,0.3)]"
                  >
                    <RotateCcw className="w-5 h-5" /> Rerun Mission
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  const isCurrentCorrect = isAnswerChecked && checkIsCorrect(currentQuestion, userAnswers[currentQuestion.id]);
  const currentLatency = questionTimes[currentQuestion.id] || 0;
  const isAllMatched = currentQuestion.type === 'match_the_column' && (Object.keys(userAnswers[currentQuestion.id] || {}).length === (currentQuestion.columnA?.length || 0));
  const isAnswerValid = currentQuestion.type === 'match_the_column' ? isAllMatched : !!userAnswers[currentQuestion.id];

  return (
    <div className="fixed inset-0 z-[100] bg-[#08080c] flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="max-w-5xl w-full h-full glass bg-[#0d0d16]/80 p-4 sm:p-6 rounded-[2.5rem] border border-white/10 flex flex-col relative animate-in zoom-in-95 duration-500 shadow-[0_0_150px_rgba(0,0,0,0.8)]">
        
        {/* TOP HUD BAR - REFINED */}
        <div className="flex items-center justify-between text-white shrink-0 mb-6 border-b border-white/5 pb-4">
           <div className="flex items-center gap-8">
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500/50 mb-1">Neural Node</p>
                <h2 className="text-4xl font-black tracking-tighter leading-none">
                  <span className="opacity-20">0</span>{currentIndex + 1}
                </h2>
              </div>
              <div className="h-10 w-[1px] bg-white/10"></div>
              <div className="hidden lg:flex flex-col">
                 <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/30 leading-none mb-2">Cognitive Synchronization</p>
                 <div className="flex items-center gap-1.5">
                    {quiz.questions.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i === currentIndex ? 'bg-rose-500 w-10 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : i < currentIndex ? 'bg-emerald-500 w-4' : 'bg-white/10 w-4'}`}></div>
                    ))}
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                 <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/30 leading-none mb-1">Temporal Sync</p>
                 <div className="flex items-center gap-3 text-3xl font-black tabular-nums tracking-tighter text-white">
                    <Clock className="w-6 h-6 text-rose-500 animate-pulse" />
                    <span>{formatTime(timer)}</span>
                 </div>
              </div>
              <button 
                onClick={() => setIsPaused(true)} 
                className="p-4 glass rounded-2xl hover:bg-white/10 transition-all active:scale-90 group border border-white/10"
              >
                <Pause className="w-6 h-6 text-white fill-current" />
              </button>
           </div>
        </div>

        {/* INTERACTIVE CORE - REFINED */}
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
           <div className="p-6 sm:p-8 border-l-8 border-rose-600 bg-white/[0.02] rounded-r-[2rem] flex flex-col justify-center shrink-0 mb-6 relative group overflow-hidden shadow-2xl border border-white/5">
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] -rotate-12 translate-x-8 pointer-events-none transition-transform group-hover:scale-110 duration-1000">
                <Brain className="w-48 h-48 text-white" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500 mb-4 flex items-center gap-2">
                  <Zap className="w-3 h-3 fill-current" /> Incoming Signal
                </p>
                {renderFormattedText(currentQuestion.questionText)}
              </div>
              {currentQuestion.diagramUrl && (
                <div className="mt-4 flex items-center gap-3 px-4 py-2 glass rounded-xl text-indigo-400 font-mono text-[11px] w-fit border-white/10 shadow-lg">
                  <ImageIcon className="w-4 h-4" /> 
                  <span className="tracking-widest uppercase">{currentQuestion.diagramUrl}</span>
                </div>
              )}
           </div>

            <div className="flex-1 overflow-y-auto scroll-slim pr-2">
              {currentQuestion.type === 'match_the_column' ? (
                renderMatching()
              ) : currentQuestion.type === 'numeric' ? (
                <div className="max-w-xl mx-auto py-16">
                   <div className="relative group">
                     <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-indigo-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-100"></div>
                     <input 
                       type="text" disabled={isAnswerChecked} autoFocus placeholder="INPUT TARGET SIGNAL..." 
                       className="relative w-full bg-slate-950 border-2 p-10 rounded-[2rem] text-white text-4xl font-black text-center focus:outline-none transition-all shadow-2xl border-white/10 focus:border-rose-500/50 placeholder:text-white/5"
                       value={userAnswers[currentQuestion.id] || ''}
                       onChange={(e) => handleSelectAnswer(e.target.value)}
                     />
                   </div>
                   <p className="text-center mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Awaiting numerical confirmation</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {currentQuestion.options?.map((opt, i) => {
                    const isSelected = userAnswers[currentQuestion.id] === opt;
                    return (
                      <button 
                        key={i} 
                        disabled={isAnswerChecked} 
                        onClick={() => handleSelectAnswer(opt)}
                        className={`w-full p-5 sm:p-6 text-left rounded-[1.5rem] border-2 transition-all flex items-center gap-5 group relative overflow-hidden
                          ${isSelected 
                            ? 'border-rose-500 bg-rose-500/10 text-white shadow-[0_0_30px_rgba(244,63,94,0.15)]' 
                            : 'border-white/5 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.01]'}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border transition-all shrink-0
                          ${isSelected ? 'bg-rose-500 text-white border-transparent' : 'bg-white/5 text-white/20 border-white/10 group-hover:text-white/40'}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="font-bold text-lg sm:text-xl leading-snug">{opt}</span>
                        {isSelected && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
           </div>
        </div>

        {/* BOTTOM HUD CONTROLS - COMPACT */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4 shrink-0">
           <div className="flex items-center gap-3">
              <button onClick={handlePrev} disabled={currentIndex === 0 || isAnswerChecked} className="p-3.5 glass border-white/10 rounded-xl text-white disabled:opacity-5 hover:bg-white/10 transition-all shadow-lg active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => navigate('/')} className="px-6 py-3.5 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all shadow-xl">Abort</button>
           </div>

           <div className="flex items-center gap-3">
              {!isAnswerChecked && <button onClick={() => setShowHint(!showHint)} className={`px-6 py-3.5 ${showHint ? 'bg-indigo-600 text-white' : 'glass text-indigo-400 border-indigo-500/10'} rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all flex items-center gap-2.5 shadow-xl`}><Lightbulb className="w-4 h-4" /> Hint [H]</button>}
              <button onClick={handleCheckAnswer} disabled={!isAnswerValid} className={`px-10 py-3.5 rounded-xl font-black uppercase text-[11px] tracking-[0.3em] transition-all flex items-center gap-2.5
                  ${isAnswerValid ? 'bg-emerald-600 text-white hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/20 cursor-not-allowed border-white/5'}`}>Confirm <Zap className="w-5 h-5" /></button>
           </div>
        </div>
      </div>

      {isAnswerChecked && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-500">
           <div className="absolute inset-0 bg-[#08080c]/95 backdrop-blur-3xl">
              <div className={`absolute inset-0 bg-gradient-to-b ${isCurrentCorrect ? 'from-emerald-500/5' : 'from-rose-500/5'} to-transparent`}></div>
           </div>
           <motion.div 
             initial={{ opacity: 0, scale: 0.9, y: 40 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             className="relative w-full max-w-3xl glass p-8 sm:p-12 rounded-[4rem] border-2 border-white/10 shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col items-center text-center overflow-hidden"
           >
              <div className={`absolute top-0 left-0 w-full h-2 ${isCurrentCorrect ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_20px_rgba(0,0,0,0.5)]`}></div>
              
              <div className={`w-28 h-28 rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl transition-all relative
                ${isCurrentCorrect ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                 <div className={`absolute inset-0 rounded-[3rem] animate-ping opacity-20 ${isCurrentCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                 {isCurrentCorrect ? <CheckCircle2 className="w-16 h-16 relative z-10" /> : <XCircle className="w-16 h-16 relative z-10" />}
              </div>
              
              <h2 className={`text-6xl font-black uppercase tracking-tighter mb-4 ${isCurrentCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCurrentCorrect ? 'Synaptic Match' : 'Logic Dissonance'}
              </h2>
              <div className="flex items-center gap-6 mb-12 opacity-40 text-[11px] font-black uppercase tracking-[0.5em]">
                 <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> <span>{(currentLatency / 1000).toFixed(1)}s</span></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                 <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> <span>Node Validated</span></div>
              </div>

              <div className="w-full p-10 rounded-[3rem] bg-white/[0.03] border border-white/5 mb-12 text-left relative overflow-hidden group">
                 <div className={`absolute top-0 left-0 w-2 h-full ${isCurrentCorrect ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}></div>
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 opacity-40 text-[10px] font-black uppercase tracking-[0.4em]">
                       <Bot className="w-5 h-5" /> Neural Logic Breakdown
                    </div>
                    {!isGeneratingExplanation && (
                      <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black text-white/30 uppercase tracking-widest">
                        Analysis Complete
                      </div>
                    )}
                 </div>
                 <div className="text-2xl text-slate-200 font-medium leading-relaxed italic max-h-[250px] overflow-y-auto scroll-slim pr-4">
                    {isGeneratingExplanation ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                          <span className="text-sm font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">Synthesizing Cognitive Matrix...</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-white/5 rounded-full w-full animate-pulse"></div>
                          <div className="h-4 bg-white/5 rounded-full w-[90%] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="h-4 bg-white/5 rounded-full w-[95%] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    ) : (
                      dynamicExplanation || currentQuestion.explanation
                    )}
                 </div>
              </div>

              <button 
                onClick={handleNext}
                autoFocus
                className="group relative w-full py-7 bg-white text-slate-950 rounded-[2rem] font-black uppercase text-base tracking-[0.6em] shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-6 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                Continue <span className="px-4 py-1.5 bg-slate-200 rounded-xl text-[11px] tracking-widest shadow-inner">SPACE</span>
              </button>
           </motion.div>
        </div>
      )}

      {isPaused && (
        <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-3xl flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-rose-600 rounded-[2rem] flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(225,29,72,0.5)] animate-pulse"><Pause className="w-12 h-12 text-white fill-current" /></div>
           <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-4">LINK SUSPENDED</h2>
           <button onClick={() => setIsPaused(false)} className="px-16 py-7 bg-white text-slate-950 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:scale-110 active:scale-95 transition-all shadow-2xl flex items-center gap-4"><Play className="w-6 h-6 fill-current" /> Resume Synthesis</button>
        </div>
      )}
    </div>
  );

  function renderMatching() {
    const userMatches = userAnswers[currentQuestion!.id] || {};
    const assigned = Object.values(userMatches);
    const columnA = currentQuestion!.columnA || [];
    const pool = (currentQuestion!.columnB || []).filter(i => !assigned.includes(i));
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-hidden">
        <div className="space-y-3 overflow-y-auto pr-2 scroll-slim h-full pb-4">
           <p className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.3em] mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Neural Targets (Column I)
           </p>
          {columnA.map((label, idx) => {
            const val = userMatches[label];
            const isHovered = dropTarget === label;
            return (
              <div key={idx} className="space-y-1.5 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                 <div className={`min-h-[64px] rounded-2xl border flex items-center p-3 transition-all relative overflow-hidden group
                   ${val ? 'border-indigo-500/40 bg-indigo-500/5 shadow-inner' : isHovered ? 'border-rose-500 bg-rose-500/10' : 'border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.01]'}`}
                   onDragOver={e => onDragOver(e, label)} onDrop={() => onDrop(label)}>
                   
                   <div className="flex flex-col flex-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">{label}</span>
                      {val ? (
                        <div draggable={!isAnswerChecked} onDragStart={() => onDragStart(val)} 
                          className="w-full bg-white/[0.05] py-2 px-4 rounded-xl flex items-center justify-between group cursor-grab active:cursor-grabbing border border-white/5 shadow-md">
                           <span className="text-xs font-bold text-white truncate pr-3">{val}</span>
                           <GripVertical className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isHovered ? 'text-rose-400' : 'text-white/10'}`}>
                          {isHovered ? 'Initialize Link...' : 'Awaiting Signal...'}
                        </span>
                      )}
                   </div>

                   {val && !isAnswerChecked && (
                     <button onClick={() => {
                       const next = { ...userMatches };
                       delete next[label];
                       handleSelectAnswer(next);
                     }} className="ml-3 p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                     </button>
                   )}
                 </div>
              </div>
            );
          })}
        </div>

        <div className="glass bg-white/[0.01] rounded-3xl border border-white/5 p-6 flex flex-col h-full overflow-hidden shadow-xl relative">
           <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
              <Dna className="w-32 h-32" />
           </div>
           
           <div className="flex items-center justify-between mb-6 shrink-0">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Signal Pool (Column II)
              </p>
              <div className="glass px-3 py-1 rounded-full border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                {pool.length} Left
              </div>
           </div>

           <div className="flex-1 overflow-y-auto scroll-slim flex flex-wrap content-start gap-3">
              {pool.map((item, idx) => (
                <div key={idx} draggable={!isAnswerChecked} onDragStart={() => onDragStart(item)}
                  className={`px-4 py-3 glass-thick rounded-xl border border-white/10 flex items-center gap-3 text-xs font-bold text-white shadow-lg active:cursor-grabbing group transition-all hover:scale-105 hover:bg-white/[0.08] hover:border-white/20
                    ${isAnswerChecked ? 'opacity-20 grayscale cursor-default' : 'cursor-grab'}`}>
                  <GripVertical className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                  {item}
                </div>
              ))}
              {pool.length === 0 && (
                <div className="h-full w-full flex flex-col items-center justify-center text-center opacity-30 py-12 animate-in fade-in zoom-in duration-500">
                   <ShieldCheck className="w-12 h-12 mb-3 text-emerald-400" />
                   <p className="text-[10px] font-black uppercase tracking-[0.4em]">Network Mapping Complete</p>
                </div>
              )}
           </div>
           
           <div className="mt-6 pt-4 border-t border-white/5 text-center shrink-0">
              <p className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">Drag fragments to link synaptic nodes</p>
           </div>
        </div>
      </div>
    );
  }
};

const CompactSummaryStat: React.FC<{ icon: any, label: string, value: any, color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="glass p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-1 hover:bg-white/[0.04] transition-all group shadow-md">
    <div className={`w-8 h-8 rounded-xl bg-${color}-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner`}><Icon className={`w-4 h-4 text-${color}-400`} /></div>
    <div className="text-center">
       <p className="text-[7px] font-black uppercase text-white/20 tracking-widest leading-none mb-1">{label}</p>
       <p className="text-sm font-black text-white leading-none tracking-tight">{value}</p>
    </div>
  </div>
);

const CompactNodeCard: React.FC<{
  index: number;
  question: Question;
  userAnswer: any;
  isCorrect: boolean;
  onDiscuss?: () => void;
}> = ({ index, question, userAnswer, isCorrect, onDiscuss }) => {
  const [isOpen, setIsOpen] = useState(index === 1); 
  const formatAnswer = (ans: any) => {
    if (ans === undefined || ans === null) return "VOID SIGNAL";
    if (typeof ans === 'object') return Object.entries(ans).map(([k, v]) => `${k} → ${v}`).join(' | ');
    return String(ans);
  };

  return (
    <div className={`glass rounded-2xl border transition-all duration-300 ${isOpen ? 'border-white/20 bg-white/[0.04] shadow-xl' : isCorrect ? 'border-emerald-500/20' : 'border-rose-500/20'} overflow-hidden`}>
       <div onClick={() => setIsOpen(!isOpen)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 group">
          <div className="flex items-center gap-4">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-inner ${isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{index.toString().padStart(2, '0')}</div>
             <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors max-w-2xl leading-snug truncate">{question.questionText}</p>
          </div>
          <div className="flex items-center gap-4">
             {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
             <ChevronDown className={`w-4 h-4 opacity-20 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
       </div>
       {isOpen && (
         <div className="px-6 pb-6 pt-1 space-y-4 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden shadow-inner">
                  <div className={`absolute top-0 left-0 w-1 h-full ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Your Signal</p>
                  <p className={`text-xs font-bold uppercase tracking-tight ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>{formatAnswer(userAnswer)}</p>
               </div>
               <div className="p-4 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Target Signal</p>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-tight">{formatAnswer(question.type === 'match_the_column' ? question.correctMatches : question.correctAnswer)}</p>
               </div>
            </div>
            <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden shadow-inner">
               <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none"><Brain className="w-16 h-16 text-white" /></div>
               <div className="flex items-center gap-2 mb-2 opacity-40 text-[8px] font-black uppercase tracking-[0.4em]"><Bot className="w-4 h-4" /> Breakdown</div>
               <p className="text-xs text-slate-300 font-medium leading-relaxed italic">{question.explanation}</p>
            </div>
            {onDiscuss && (
              <button onClick={(e) => { e.stopPropagation(); onDiscuss(); }} className="w-full py-3 glass border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center justify-center gap-2 hover:bg-indigo-500 hover:text-white transition-all shadow-md"><Bot className="w-4 h-4" /> CONSULT ASSISTANT</button>
            )}
         </div>
       )}
    </div>
  );
};

export default QuizEngine;
