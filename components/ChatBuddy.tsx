
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { chatWithStudyBuddy } from '../services/geminiService';
import { ChatMessage, ThemeConfig } from '../types';

interface ChatBuddyProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  initialMessage?: string | null;
  onInitialMessageProcessed?: () => void;
}

const ChatBuddy: React.FC<ChatBuddyProps> = ({ isOpen, onClose, theme, initialMessage, onInitialMessageProcessed }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Neural Link Established. How can I assist your studies today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialMessage) {
      handleTriggeredMessage(initialMessage);
      onInitialMessageProcessed?.();
    }
  }, [isOpen, initialMessage]);

  const handleTriggeredMessage = async (msg: string) => {
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);
    try {
      const response = await chatWithStudyBuddy(messages, msg);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', content: "Error: Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatWithStudyBuddy(messages, userMsg);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', content: "Error: Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[200] w-full sm:max-w-[400px] h-full sm:h-[600px] sm:max-h-[80vh] flex flex-col glass sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-white/20 overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
      <div className={`bg-${theme.accentColor} p-4 sm:p-6 flex items-center justify-between text-white shadow-lg`}>
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
          <h3 className="font-bold text-base sm:text-lg">Neural Assistant</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-950/40">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 flex items-center justify-center shadow-md ${m.role === 'user' ? 'bg-white/10' : `bg-${theme.accentColor}/20`}`}>
                {m.role === 'user' ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-${theme.accentColor}`} />}
              </div>
              <div className={`p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] text-xs sm:text-sm leading-relaxed ${m.role === 'user' ? `bg-${theme.accentColor} text-white` : 'glass bg-white/5 text-white/90'}`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex gap-1.5 items-center opacity-50 ml-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-200"></span>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 bg-slate-900/50 border-t border-white/5 pb-8 sm:pb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl pl-4 sm:pl-6 pr-12 sm:pr-14 py-3 sm:py-4 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-1.5 top-1.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${input.trim() ? `bg-${theme.accentColor} text-white shadow-lg` : 'opacity-20 pointer-events-none'}`}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBuddy;
