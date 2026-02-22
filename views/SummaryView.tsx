
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Check, Download, ArrowLeft, BookOpen, Clock, FileText, Zap } from 'lucide-react';
import { AppState } from '../types';
import { THEMES } from '../constants';

interface SummaryViewProps {
  state: AppState;
  updateState: (updater: any) => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ state, updateState }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = THEMES[state.theme];
  const [copied, setCopied] = React.useState(false);

  const summaryId = location.state?.summaryId;
  const summary = state.summaries.find(s => s.id === summaryId);

  if (!summary) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FileText className="w-16 h-16 opacity-10 mb-6" />
      <h2 className="text-2xl font-black opacity-30">NODE NOT FOUND</h2>
      <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 glass rounded-full font-bold">Return to Dashboard</button>
    </div>
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export the report.");
      return;
    }

    const title = summary.title;
    const content = summary.content;
    const date = new Date(summary.timestamp).toLocaleDateString();

    printWindow.document.write(`
      <html>
        <head>
          <title>NeuralPrep Revision: ${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body { 
              font-family: 'Outfit', -apple-system, sans-serif; 
              padding: 50px; 
              color: #1a1a1a; 
              line-height: 1.8;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { 
              border-bottom: 3px solid #000; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .brand { font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: -1px; }
            .meta { font-size: 12px; font-weight: 700; opacity: 0.6; text-transform: uppercase; }
            .title { font-size: 32px; font-weight: 900; margin: 20px 0; line-height: 1.1; letter-spacing: -1px; }
            .content { 
              white-space: pre-wrap; 
              font-size: 14pt; 
              color: #333; 
              word-break: break-word;
            }
            .footer { 
              margin-top: 60px; 
              padding-top: 20px; 
              border-top: 1px solid #eee; 
              font-size: 10px; 
              font-weight: 700; 
              text-transform: uppercase; 
              letter-spacing: 2px;
              color: #999;
              text-align: center;
            }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">NEURALPREP <span style="color: #6366f1;">•</span> REVISION</div>
            <div class="meta">Sync Date: ${date}</div>
          </div>
          <h1 class="title">${title}</h1>
          <div class="content">${content}</div>
          <div class="footer">Confidential Scholastic Material • NeuralPrep Neural Sync • Rapid Revision Segment</div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700 px-4 sm:px-0">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-3 sm:space-y-4">
          <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all">
             <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" /> Back to Archives
          </button>
          <h1 className="font-brand text-3xl sm:text-5xl font-black tracking-tighter text-white leading-tight sm:leading-none">{summary.title}</h1>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {new Date(summary.timestamp).toLocaleDateString()}
            </span>
            <span className={`flex items-center gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-${theme.accentColor}`}>
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Neural-Coaching Notes
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={handleCopy} className="flex-1 sm:flex-none glass px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-[9px] sm:text-[11px] font-black uppercase tracking-widest">
            {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-40" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button 
            onClick={handleExportPDF}
            className={`flex-1 sm:flex-none bg-${theme.accentColor} text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 shadow-2xl transition-all text-[9px] sm:text-[11px] font-black uppercase tracking-widest`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Export
          </button>
        </div>
      </div>

      <div className="glass p-6 sm:p-12 md:p-20 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/5 bg-slate-900/40">
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-${theme.accentColor}/5 rounded-full blur-[140px] -z-10`}></div>
        <div className={`absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-${theme.accentColor}/20 to-transparent`}></div>
        
        <div className="relative text-lg sm:text-xl font-medium text-slate-200 leading-[2] whitespace-pre-wrap font-sans selection:bg-indigo-500/30">
           {summary.content}
        </div>
      </div>
      
      <div className="mt-12 text-center space-y-2 opacity-20">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Rapid Neural Revision Sync Complete</p>
        <div className="w-12 h-0.5 bg-white/20 mx-auto rounded-full"></div>
      </div>
    </div>
  );
};

export default SummaryView;
