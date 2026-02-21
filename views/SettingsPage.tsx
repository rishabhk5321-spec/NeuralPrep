
import React, { useRef } from 'react';
import { 
  Palette, 
  User, 
  Database, 
  Trash2, 
  Download, 
  Upload as UploadIcon, 
  Terminal,
  ShieldCheck,
  Star,
  Check,
  FileUp
} from 'lucide-react';
import { AppState, ThemeId } from '../types';
import { THEMES } from '../constants';

interface SettingsProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const SettingsPage: React.FC<SettingsProps> = ({ state, updateState }) => {
  const theme = THEMES[state.theme];
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateState((prev: AppState) => ({
          ...prev,
          user: { ...prev.user, avatar: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quiz-master-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to export your data.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported && imported.user && Array.isArray(imported.quizzes)) {
            updateState(() => imported);
            alert("Backup restored.");
            window.location.reload();
          }
        } catch (error) {
          alert("Error parsing backup file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const clearData = () => {
    if (window.confirm("Clear all data?")) {
      localStorage.removeItem('quiz_master_state');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight">System Settings</h1>
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] opacity-30">
           <ShieldCheck className="w-5 h-5" /> Encryption Active
        </div>
      </div>

      {/* Identifiers */}
      <section className="space-y-6">
        <h2 className="text-base font-black uppercase tracking-widest opacity-50 flex items-center gap-3">
           <User className="w-5 h-5 text-indigo-400" /> Identification
        </h2>
        <div className="glass p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10 border border-white/5 shadow-2xl">
           <div className="relative group shrink-0">
              <img src={state.user.avatar} className="w-32 h-32 rounded-full border-4 border-white/10 group-hover:border-indigo-500/50 transition-all object-cover shadow-2xl" alt="Avatar" />
              <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarChange} 
              />
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className={`absolute bottom-0 right-0 p-3 bg-${theme.accentColor} rounded-full border border-white/20 hover:scale-110 transition-transform shadow-2xl`}
              >
                <UploadIcon className="w-5 h-5 text-white" />
              </button>
           </div>
           <div className="flex-1 space-y-4 text-center md:text-left w-full">
              <input 
                type="text" 
                value={state.user.name}
                onChange={(e) => updateState((prev: AppState) => ({ ...prev, user: { ...prev.user, name: e.target.value } }))}
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-3xl font-black w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white shadow-inner"
                placeholder="Enter scholar name"
              />
              <p className="opacity-40 text-sm font-medium">This moniker will be encoded into all generated report segments.</p>
           </div>
        </div>
      </section>

      {/* Visual Protocols */}
      <section className="space-y-6">
        <h2 className="text-base font-black uppercase tracking-widest opacity-50 flex items-center gap-3">
           <Palette className="w-5 h-5 text-emerald-400" /> Neural Themes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {(Object.values(THEMES)).map((t) => (
             <button
               key={t.id}
               onClick={() => updateState({ theme: t.id })}
               className={`relative p-6 rounded-[2rem] border-2 transition-all group overflow-hidden shadow-xl ${
                 state.theme === t.id ? `border-${t.accentColor} bg-${t.accentColor}/15` : 'border-white/5 bg-white/5 hover:bg-white/10'
               }`}
             >
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${t.accentColor}/20 flex items-center justify-center shrink-0 shadow-inner`}>
                     <Star className={`w-6 h-6 text-${t.accentColor}`} />
                  </div>
                  <span className="font-black text-lg text-white tracking-tight">{t.name}</span>
               </div>
               {state.theme === t.id && (
                 <div className={`absolute top-5 right-5 bg-${t.accentColor} rounded-full p-1.5 shadow-2xl animate-in zoom-in`}>
                    <Check className="w-4 h-4 text-white" />
                 </div>
               )}
             </button>
           ))}
        </div>
      </section>

      {/* Maintenance Controls */}
      <div className="grid md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h2 className="text-base font-black uppercase tracking-widest opacity-50 flex items-center gap-3">
             <Terminal className="w-5 h-5 text-amber-400" /> Runtime Tools
          </h2>
          <div className="glass p-8 rounded-[2.5rem] flex items-center justify-between border border-white/5 shadow-2xl">
             <div className="pr-6">
                <p className="font-black text-xl text-white tracking-tight">Dev Diagnostics</p>
                <p className="opacity-40 text-xs font-bold uppercase tracking-widest mt-1">Status: {state.devMode ? 'Active' : 'Standby'}</p>
             </div>
             <button 
               onClick={() => updateState({ devMode: !state.devMode })}
               className={`w-16 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${state.devMode ? `bg-${theme.accentColor}` : 'bg-white/10'}`}
             >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-xl ${state.devMode ? 'left-9' : 'left-1'}`}></div>
             </button>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-base font-black uppercase tracking-widest opacity-50 flex items-center gap-3">
             <Database className="w-5 h-5 text-rose-400" /> Vault Controls
          </h2>
          <div className="grid grid-cols-2 gap-4">
             <button onClick={handleExport} className="glass p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-white/10 transition-all group border border-white/5 shadow-xl">
                <Download className="w-6 h-6 text-emerald-400 opacity-60 group-hover:opacity-100" />
                <span className="text-sm font-black uppercase tracking-widest text-white">Export</span>
             </button>
             <button onClick={() => importInputRef.current?.click()} className="glass p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-white/10 transition-all group border border-white/5 shadow-xl">
                <FileUp className="w-6 h-6 text-indigo-400 opacity-60 group-hover:opacity-100" />
                <span className="text-sm font-black uppercase tracking-widest text-white">Import</span>
             </button>
             <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImport} />
             <button onClick={clearData} className="glass p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-rose-500/20 transition-all group border border-white/5 col-span-2 shadow-xl">
                <Trash2 className="w-6 h-6 text-rose-500 opacity-60 group-hover:opacity-100" />
                <span className="text-sm font-black uppercase tracking-widest text-rose-500">Purge Data</span>
             </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
