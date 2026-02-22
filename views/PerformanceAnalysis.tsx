
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Target, 
  Clock, 
  AlertTriangle, 
  Zap, 
  ArrowLeft, 
  Brain, 
  Trophy, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { AppState } from '../types';
import { THEMES } from '../constants';
import { getFullPerformanceAnalysis } from '../services/memoryService';
import { generateExecutiveInsights } from '../aiBrain/performanceAnalyzer';

interface AnalysisProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const PerformanceAnalysis: React.FC<AnalysisProps> = ({ state, updateState }) => {
  const navigate = useNavigate();
  const theme = THEMES[state.theme];
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const analysis = getFullPerformanceAnalysis(state);

  useEffect(() => {
    if (analysis && !recommendations && !isGenerating) {
      handleGenerateRecommendations();
    }
  }, [analysis]);

  const handleGenerateRecommendations = async () => {
    if (!analysis) return;
    setIsGenerating(true);
    try {
      const recs = await generateExecutiveInsights(state);
      setRecommendations(recs);
    } catch (e) {
      setRecommendations("FOCUS AREAS\n* Review high-error topics in diagnostic list.\n* Focus on improving response speed.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-8">
        <Activity className="w-20 h-20 opacity-10 animate-pulse" />
        <h2 className="text-3xl font-black opacity-30 tracking-tighter">MATRIX OFFLINE</h2>
        <button onClick={() => navigate('/')} className="px-8 py-4 glass rounded-2xl font-black uppercase tracking-widest text-xs">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 px-4 sm:px-0">
      <header className="mb-8 sm:mb-12 space-y-4 sm:space-y-6">
        <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8">
           <div className="space-y-2">
             <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white uppercase leading-tight sm:leading-none">AI Insight Index</h1>
             <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[8px] sm:text-[10px]">Neural Brain Diagnostic</p>
           </div>
           <div className="flex gap-3 sm:gap-4">
             <MetricBox icon={Activity} label="Precision" value={analysis.overview.accuracy + '%'} color="indigo" />
             <MetricBox icon={Trophy} label="Attempts" value={analysis.overview.total} color="emerald" />
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <section className="glass p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-white/5">
             <h3 className="text-xl sm:text-2xl font-black flex items-center gap-3 mb-6 sm:mb-8">
               <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" /> Weakness Detection
             </h3>
             <div className="space-y-4 sm:space-y-6">
                {analysis.weakTopics.slice(0, 5).map((topic, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/5">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-base sm:text-lg font-black text-white truncate">{topic.topic}</p>
                      <p className="text-[8px] sm:text-[10px] opacity-40 font-black uppercase tracking-widest truncate">Acc: {topic.accuracy}% • Speed: {topic.avgTime}s</p>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-xl sm:text-2xl font-black text-rose-500">{(topic.weaknessScore * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
             </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
             <section className="glass p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-white/5">
                <h3 className="text-lg sm:text-xl font-black mb-6 sm:mb-8 flex items-center gap-3"><Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> Pattern Matrix</h3>
                <div className="space-y-4 sm:space-y-6">
                   {analysis.patterns.map((p, idx) => (
                     <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                           <span className="opacity-40">{p.name}</span>
                           <span className="text-rose-400">{p.errorRate}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 w-full bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-rose-500" style={{ width: `${p.errorRate}%` }}></div>
                        </div>
                     </div>
                   ))}
                </div>
             </section>
             <section className="glass p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-white/5 flex flex-col items-center justify-center min-h-[150px]">
                <p className="text-4xl sm:text-5xl font-black mb-2">{analysis.speed.avgSeconds}s</p>
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Average Response Time</p>
             </section>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
           <section className="glass p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-white/5 h-full flex flex-col min-h-[300px]">
              <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-10 flex items-center gap-3">
                 <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 animate-pulse" /> Brain Recommendations
              </h3>
              <div className="flex-1 overflow-y-auto scroll-slim">
                {isGenerating ? <div className="animate-pulse opacity-20 text-xs uppercase font-black tracking-widest">Scanning...</div> : 
                 <div className="prose prose-invert whitespace-pre-wrap text-slate-300 font-medium leading-[1.8] sm:leading-[2] text-sm sm:text-base">{recommendations}</div>}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

const MetricBox: React.FC<{ icon: any, label: string, value: any, color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="glass px-4 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border border-white/10 flex items-center gap-4 sm:gap-6 flex-1 sm:flex-none">
    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-400 shrink-0`} />
    <div className="flex flex-col min-w-0">
       <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-30 truncate">{label}</span>
       <span className="text-xl sm:text-2xl font-black text-white truncate">{value}</span>
    </div>
  </div>
);

export default PerformanceAnalysis;
