'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { List, ChevronRight, ChevronDown } from 'lucide-react';
import { TocEntry } from './types';

interface TableOfContentsProps {
  content: string;
  onSelect: (entry: TocEntry) => void;
  darkMode: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const TableOfContents = ({ content, onSelect, darkMode, isOpen, setIsOpen }: TableOfContentsProps) => {
  const toc = useMemo(() => {
    const lines = content.split('\n');
    const entries: TocEntry[] = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        entries.push({ id, text, level, line: index });
      }
    });
    
    return entries;
  }, [content]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-4 bottom-4 z-40 p-3 rounded-full shadow-lg transition-all",
          darkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-50"
        )}
      >
        <List className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed right-4 bottom-4 z-40 w-64 max-h-[60vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden transition-all",
      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
    )}>
      <div className={cn(
        "h-10 border-b flex items-center px-4 justify-between transition-colors duration-300",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex items-center gap-2">
          <List className="w-3.5 h-3.5 text-slate-400" />
          <span className={cn(
            "text-[10px] uppercase tracking-widest font-bold transition-colors duration-300",
            darkMode ? "text-slate-500" : "text-slate-500"
          )}>Contents</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className={cn(
            "p-1 rounded hover:bg-slate-200 transition-colors",
            darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {toc.map((entry, i) => (
          <button
            key={`${entry.id}-${i}`}
            onClick={() => onSelect(entry)}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all",
              darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-50 text-slate-600 hover:text-indigo-600",
              entry.level === 1 ? "font-bold" : entry.level === 2 ? "pl-6" : "pl-9"
            )}
          >
            {entry.text}
          </button>
        ))}
        {toc.length === 0 && (
          <p className="text-center py-4 text-[10px] text-slate-400 italic">No headers found.</p>
        )}
      </div>
    </div>
  );
};
