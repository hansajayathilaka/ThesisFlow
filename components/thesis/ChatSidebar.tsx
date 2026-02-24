'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquare, 
  ChevronLeft, 
  Sparkles, 
  Loader2, 
  Send, 
  Wand2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, StoredFile } from './types';

interface ChatSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  userInput: string;
  setUserInput: (input: string) => void;
  selectedFiles: StoredFile[];
  onRemoveSelectedFile: (name: string) => void;
  onSendMessage: () => void;
  onGlobalEdit: () => void;
  isGlobalEditing: boolean;
  darkMode: boolean;
}

export const ChatSidebar = ({
  isOpen,
  setIsOpen,
  messages,
  userInput,
  setUserInput,
  selectedFiles,
  onRemoveSelectedFile,
  onSendMessage,
  onGlobalEdit,
  isGlobalEditing,
  darkMode
}: ChatSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "h-full flex flex-col shadow-sm z-20 transition-colors duration-300",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
    >
          <div className={cn(
            "h-10 border-b flex items-center px-4 justify-between transition-colors duration-300",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <h2 className={cn(
                "text-[10px] uppercase tracking-widest font-bold transition-colors duration-300",
                darkMode ? "text-slate-500" : "text-slate-500"
              )}>AI Assistant</h2>
            </div>
            <button onClick={() => setIsOpen(false)} className={cn(
              "p-1 rounded transition-colors duration-300",
              darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-200 text-slate-600"
            )}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Ask questions about your research or request analysis.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "p-3 rounded-xl text-sm leading-relaxed transition-colors duration-300",
                msg.role === 'user' 
                  ? (darkMode ? "bg-indigo-900/30 ml-4 text-indigo-200 border border-indigo-800/50" : "bg-indigo-50 ml-4 text-indigo-900 border border-indigo-100")
                  : (darkMode ? "bg-slate-800 mr-4 text-slate-200 border border-slate-700" : "bg-slate-100 mr-4 text-slate-800 border border-slate-200")
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none transition-colors duration-300",
                  darkMode ? "prose-invert" : ""
                )}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isGlobalEditing && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-xl border text-xs italic transition-colors duration-300",
                darkMode ? "bg-slate-800/50 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
              )}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating document...
              </div>
            )}
          </div>

          <div className={cn(
            "p-4 border-t transition-colors duration-300",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="flex flex-col gap-3">
              {/* Selected Files Visualization */}
              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-wrap gap-2 mb-1"
                  >
                    {selectedFiles.map(file => (
                      <div 
                        key={file.name}
                        className={cn(
                          "group relative w-12 h-12 rounded-lg border overflow-hidden shadow-sm",
                          darkMode ? "border-slate-700" : "border-slate-200"
                        )}
                      >
                        <img src={file.data} alt="" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => onRemoveSelectedFile(file.name)}
                          className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white px-1 truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative group">
                <textarea 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask a question or describe an edit..."
                  className={cn(
                    "w-full p-4 border rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-28 transition-all duration-300 shadow-sm",
                    darkMode 
                      ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:bg-slate-700" 
                      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                   <span className="text-[10px] text-slate-400 font-medium opacity-0 group-focus-within:opacity-100 transition-opacity">
                     Shift + Enter for new line
                   </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={onSendMessage}
                  disabled={isGlobalEditing || !userInput.trim()}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm",
                    darkMode 
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Ask AI
                </button>
                <button 
                  onClick={onGlobalEdit}
                  disabled={isGlobalEditing || !userInput.trim()}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/10",
                    darkMode 
                      ? "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600" 
                      : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  )}
                >
                  {isGlobalEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Update Doc
                </button>
              </div>
            </div>
          </div>
    </div>
  );
};
