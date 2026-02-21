
import React from 'react';
import { AppState } from '../types';
import { Terminal, X, Trash2 } from 'lucide-react';

interface DebugPanelProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ state, updateState }) => {
  return (
    <div className="fixed bottom-4 left-4 z-[300] w-[300px] glass rounded-3xl p-6 border-indigo-500/50 shadow-2xl animate-in slide-in-from-left-8 duration-500">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
         <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-indigo-400">
           <Terminal className="w-4 h-4" /> Runtime State
         </div>
         <button onClick={() => updateState({ devMode: false })} className="hover:text-rose-400">
           <X className="w-4 h-4" />
         </button>
      </div>
      
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scroll-slim font-mono text-[10px]">
         <div className="p-2 bg-black/40 rounded-lg">
           <p className="text-white/40 mb-1 font-bold">Quizzes:</p>
           <pre className="text-green-400">{state.quizzes.length} active sessions</pre>
         </div>
         <div className="p-2 bg-black/40 rounded-lg">
           <p className="text-white/40 mb-1 font-bold">User Hash:</p>
           <pre className="text-indigo-400 break-all">{JSON.stringify(state.user, null, 2)}</pre>
         </div>
         <div className="p-2 bg-black/40 rounded-lg">
           <p className="text-white/40 mb-1 font-bold">Local Persistence:</p>
           <pre className="text-amber-400">{(JSON.stringify(state).length / 1024).toFixed(2)} KB used</pre>
         </div>
      </div>

      <button 
        onClick={() => { localStorage.clear(); window.location.reload(); }}
        className="mt-6 w-full py-3 bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
      >
        <Trash2 className="w-3 h-3" /> Clear Runtime Session
      </button>
    </div>
  );
};

export default DebugPanel;
