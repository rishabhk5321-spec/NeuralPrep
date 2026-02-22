
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Brain, 
  Target, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Rocket,
  ShieldCheck
} from 'lucide-react';
import { ThemeConfig } from '../types';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  userName: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, theme, userName }) => {
  const [step, setStep] = useState(1);

  const steps = [
    {
      icon: Rocket,
      title: "Neural Link Established",
      description: `Welcome, Scholar ${userName}. Your cognitive enhancement journey begins now. NeuralPrep is your AI-powered study companion.`,
      color: "indigo"
    },
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Upload PDFs or paste text. Our neural core extracts key concepts and generates adaptive practice sessions tailored to your weak points.",
      color: "emerald"
    },
    {
      icon: Target,
      title: "Mastery Tracking",
      description: "Track your precision, momentum, and cognitive consistency through our Neural Activity Matrix and Achievement Vault.",
      color: "amber"
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="max-w-2xl w-full glass-thick rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          <div className={`h-2 bg-gradient-to-r from-transparent via-${theme.accentColor} to-transparent opacity-50`} />
          
          <div className="p-8 sm:p-12 flex-1 flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              <motion.div 
                key={step}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[2.5rem] bg-${steps[step-1].color}-500/20 flex items-center justify-center mb-8 shadow-2xl`}>
                  {React.createElement(steps[step-1].icon, { className: `w-10 h-10 sm:w-12 sm:h-12 text-${steps[step-1].color}-400` })}
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                  {steps[step-1].title}
                </h2>
                
                <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
                  {steps[step-1].description}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-2 mt-12 mb-8">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${step === i + 1 ? `w-8 bg-${theme.accentColor}` : 'w-2 bg-white/10'}`} 
                />
              ))}
            </div>

            <div className="w-full flex gap-4">
              {step < steps.length ? (
                <button 
                  onClick={() => setStep(prev => prev + 1)}
                  className={`flex-1 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3`}
                >
                  Next Protocol <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className={`flex-1 py-5 bg-${theme.accentColor} text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_50px_rgba(99,102,241,0.3)] flex items-center justify-center gap-3`}
                >
                  Initialize Dashboard <ShieldCheck className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {step < steps.length && (
              <button 
                onClick={onClose}
                className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 transition-all"
              >
                Skip Introduction
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeModal;
