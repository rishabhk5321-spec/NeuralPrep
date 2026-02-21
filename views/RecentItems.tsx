
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  GraduationCap, 
  Trash2, 
  ChevronRight,
  Search,
  Clock,
  BookOpen,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Target,
  History
} from 'lucide-react';
import { AppState, QuizHistoryEntry } from '../types';
import { THEMES } from '../constants';

interface RecentItemsProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const RecentItems: React.FC<RecentItemsProps> = ({ state, updateState }) => {
  const [filter, setFilter] = useState<'all' | 'quiz' | 'flash' | 'summary'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = THEMES[state.theme];

  const filteredItems = [
    ...(filter === 'all' || filter === 'quiz' ? state.quizzes.map(q => ({ ...q, type: 'quiz' })) : []),
    ...(filter === 'all' || filter === 'flash' ? state.flashcards.map(f => ({ ...f, type: 'flash' })) : []),
    ...(filter === 'all' || filter === 'summary' ? state.summaries.map(s => ({ ...s, type: 'summary' })) : []),
  ].sort((a: any, b: any) => b.timestamp - a.timestamp)
   .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDelete = (id: string, type: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Purge node from vault?")) return;
    
    updateState((prev: AppState) => {
      const updatedQuizzes = type === 'quiz' ? prev.quizzes.filter(q => q.id !== id) : prev.quizzes;
      const updatedFlashcards = type === 'flash' ? prev.flashcards.filter(f => f.id !== id) : prev.flashcards;
      const updatedSummaries = type === 'summary' ? prev.summaries.filter(s => s.id !== id) : prev.summaries;
      
      return {
        ...prev,
        quizzes: updatedQuizzes,
        flashcards: updatedFlashcards,
        summaries: updatedSummaries
      };
    });
  };

  const handleOpenReport = (id: string, timestamp?: number) => {
    // If no specific timestamp is provided, we want to view the 'latest' attempt report.
    navigate('/quiz', { state: { quizId: id, historyEntryTimestamp: timestamp, viewLatest: !timestamp } });
  };

  const handleReattempt = (id: string) => {
    navigate('/quiz', { state: { quizId: id, mode: 'practice' } });
  };

  const handleOpenItem = (item: any) => {
    if (item.type === 'quiz') handleOpenReport(item.id);
    if (item.type === 'flash') navigate('/flashcards', { state: { setId: item.id } });
    if (item.type === 'summary') navigate('/summary', { state: { summaryId: item.id } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 px-2">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">The Neural Vault</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Historical Cognitive Records</p>
        </div>
        <div className="flex items-center gap-4 glass px-5 py-3 rounded-2xl w-full md:w-80 border border-white/5 shadow-xl focus-within:border-indigo-500/30 transition-all">
           <Search className="w-5 h-5 opacity-30 text-indigo-400" />
           <input 
             type="text" 
             placeholder="Search knowledge..." 
             className="bg-transparent border-none focus:outline-none w-full font-bold text-sm text-white placeholder:text-white/20"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </header>

      <div className="flex items-center gap-3 overflow-x-auto pb-4 scroll-slim">
        {(['all', 'quiz', 'flash', 'summary'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-8 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap border ${
              filter === f ? `bg-white text-slate-950 border-white shadow-xl scale-105` : 'glass border-white/5 hover:bg-white/5 text-white/40'
            }`}
          >
            {f === 'all' ? 'Unified' : f === 'quiz' ? 'Quizzes' : f === 'flash' ? 'Flash Decks' : 'Summaries'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center glass rounded-[3rem] border-2 border-dashed border-white/5">
             <History className="w-16 h-16 mb-6 opacity-5" />
             <p className="text-xl font-black opacity-20 uppercase tracking-[0.4em]">Vault Synchronized: Null</p>
          </div>
        ) : (
          filteredItems.map((item: any) => {
            const isQuiz = item.type === 'quiz';
            const history = item.history || [];
            const hasMultipleReports = history.length > 1;
            const isExpanded = expandedQuizId === item.id;

            return (
              <div 
                key={`${item.type}-${item.id}`}
                className={`glass rounded-3xl border border-white/5 transition-all overflow-hidden ${isExpanded ? 'bg-white/[0.03] ring-1 ring-white/10' : 'hover:bg-white/[0.01]'}`}
              >
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => handleOpenItem(item)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
                      ${isQuiz ? 'bg-indigo-500/10 text-indigo-400' : item.type === 'flash' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                      {isQuiz ? <GraduationCap className="w-6 h-6" /> : item.type === 'flash' ? <Layers className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-white truncate">{item.title}</h3>
                      <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-white/20">
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleDateString()}</span>
                        {isQuiz && item.score !== undefined && <span className="flex items-center gap-1.5 text-emerald-400/60"><Target className="w-3 h-3" /> Precision: {item.score}%</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isQuiz && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReattempt(item.id); }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reattempt
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenReport(item.id); }}
                          className="flex items-center gap-2 px-4 py-2 glass border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Latest Report
                        </button>
                        {hasMultipleReports && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedQuizId(isExpanded ? null : item.id); }}
                            className="p-2 glass border-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      onClick={(e) => handleDelete(item.id, item.type, e)}
                      className="p-2.5 hover:bg-rose-500/15 text-rose-500 rounded-xl opacity-30 hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* History Dropdown for Quizzes */}
                {isExpanded && history.length > 0 && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.3em] text-white/20">
                        <span>Attempt History Log</span>
                        <span>{history.length} Sessions</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto scroll-slim">
                        {history.map((entry: QuizHistoryEntry, hIdx: number) => (
                          <div 
                            key={hIdx} 
                            onClick={() => handleOpenReport(item.id, entry.timestamp)}
                            className="px-5 py-3 flex items-center justify-between hover:bg-white/5 group cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors"
                          >
                            <div className="flex items-center gap-6">
                              <span className="text-[9px] font-black text-white/10 group-hover:text-white/30 w-4">#{history.length - hIdx}</span>
                              <div>
                                <p className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                                  {new Date(entry.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-0.5">Report Sync: Validated</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className={`text-sm font-black tracking-tight ${entry.score >= 80 ? 'text-emerald-400' : entry.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                  {entry.score}%
                                </p>
                                <p className="text-[7px] font-black uppercase text-white/10 tracking-widest">Efficiency</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentItems;
