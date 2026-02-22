
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Rotate3d, 
  Home, 
  HelpCircle, 
  CheckCircle, 
  Shuffle, 
  RefreshCcw,
  Zap
} from 'lucide-react';
import { AppState, Flashcard } from '../types';
import { THEMES } from '../constants';

interface FlashcardDeckProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ state, updateState }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = THEMES[state.theme];
  
  const setId = location.state?.setId;
  const set = state.flashcards.find(s => s.id === setId);
  
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (set) {
      setCards(set.cards);
    }
  }, [set]);

  const handleFlip = useCallback(() => setIsFlipped(prev => !prev), []);
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % cards.length);
    setIsFlipped(false);
  }, [cards.length]);
  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);
    setIsFlipped(false);
  }, [cards.length]);

  const toggleMastery = () => {
    const currentId = cards[currentIndex].id;
    setMasteredIds(prev => {
      const next = new Set(prev);
      if (next.has(currentId)) next.delete(currentId);
      else next.add(currentId);
      return next;
    });
  };

  const handleShuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.code === 'KeyM') {
        toggleMastery();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, cards, currentIndex]);

  if (!set || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <HelpCircle className="w-16 h-16 opacity-20" />
        <p className="text-2xl opacity-40 font-black">Not found</p>
        <button onClick={() => navigate('/')} className="glass px-8 py-4 rounded-full font-bold">Return Home</button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const isMastered = masteredIds.has(currentCard.id);
  const masteryProgress = (masteredIds.size / cards.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24 sm:pb-20 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 glass p-4 sm:p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button onClick={() => navigate('/')} className="p-2.5 sm:p-3 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-all">
             <Home className="w-5 h-5 sm:w-6 sm:h-6 opacity-50" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-full">{set.title}</h1>
            <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider opacity-40">Active Session</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 sm:gap-8">
           <div className="text-center sm:text-left">
              <p className="text-[8px] sm:text-[10px] font-bold uppercase opacity-30 tracking-widest">Mastery</p>
              <p className="text-xl sm:text-2xl font-black">{Math.round(masteryProgress)}%</p>
           </div>
           <div className="h-8 sm:h-10 w-[1px] bg-white/10"></div>
           <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={handleShuffle} className="p-2.5 sm:p-3 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-all" title="Shuffle">
                 <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 opacity-50 hover:opacity-100" />
              </button>
              <button onClick={() => { setCurrentIndex(0); setMasteredIds(new Set()); setIsFlipped(false); }} className="p-2.5 sm:p-3 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-all" title="Reset">
                 <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6 opacity-50 hover:opacity-100" />
              </button>
           </div>
        </div>
      </div>

      <div className="relative h-[350px] sm:h-[450px] w-full max-w-[650px] mx-auto perspective-1000">
        <div 
          onClick={handleFlip}
          className={`relative w-full h-full transition-all duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          <div className="absolute inset-0 backface-hidden glass border-white/20 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden group">
             <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-${theme.accentColor} to-transparent opacity-40`}></div>
             <h2 className="text-2xl sm:text-4xl font-black leading-tight text-white px-2 sm:px-4">{currentCard.front}</h2>
             <div className="absolute bottom-6 sm:bottom-10 flex items-center gap-2 text-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
               <Rotate3d className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Flip Card
             </div>
             {isMastered && (
               <div className="absolute top-4 right-6 sm:top-6 sm:right-8 text-emerald-500 animate-in zoom-in">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
               </div>
             )}
          </div>

          <div className="absolute inset-0 backface-hidden rotate-y-180 glass border-white/20 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden bg-slate-900/60">
             <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40`}></div>
             <div className="text-lg sm:text-2xl leading-relaxed opacity-90 max-h-[200px] sm:max-h-[250px] overflow-y-auto pr-2 sm:pr-4 scroll-slim font-medium text-white/90">
               {currentCard.back}
             </div>
             <div className="absolute bottom-6 sm:bottom-10 flex items-center gap-2 text-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
               <Rotate3d className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Correct
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-between sm:justify-center w-full sm:gap-8">
          <button 
            onClick={handlePrev}
            className="p-4 sm:p-5 glass rounded-full hover:bg-white/10 disabled:opacity-10 transition-all active:scale-90"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleMastery(); }}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${isMastered ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40 border border-white/10'}`}
            >
              {isMastered ? 'Mastered' : 'Mark Mastered'}
            </button>
            <span className="text-xl sm:text-2xl font-black tracking-widest">{currentIndex + 1} <span className="text-white/20">/ {cards.length}</span></span>
          </div>

          <button 
            onClick={handleNext}
            className="p-4 sm:p-5 glass rounded-full hover:bg-white/10 disabled:opacity-10 transition-all active:scale-90"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        <div className="hidden sm:flex gap-4">
           <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl text-xs font-bold opacity-30 uppercase tracking-widest">
             <span className="bg-white/20 px-1.5 py-0.5 rounded text-white">Space</span> Flip
           </div>
           <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl text-xs font-bold opacity-30 uppercase tracking-widest">
             <span className="bg-white/20 px-1.5 py-0.5 rounded text-white">Arrows</span> Move
           </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardDeck;
