'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  FolderOpen, 
  X, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoredFile } from './types';

interface FileManagerProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  files: StoredFile[];
  selectedFileNames: string[];
  onToggleSelect: (name: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteFile: (name: string) => void;
  onUpdateDescription: (name: string, description: string) => void;
  darkMode: boolean;
}

export const FileManager = ({
  isOpen,
  setIsOpen,
  files,
  selectedFileNames,
  onToggleSelect,
  onImageUpload,
  onDeleteFile,
  onUpdateDescription,
  darkMode
}: FileManagerProps) => {
  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "h-full flex flex-col z-20 transition-colors duration-300",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
      )}
    >
          <div className={cn(
            "h-10 border-b flex items-center px-4 justify-between transition-colors duration-300",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <h2 className={cn(
                "text-[10px] uppercase tracking-widest font-bold transition-colors duration-300",
                darkMode ? "text-slate-500" : "text-slate-500"
              )}>Assets</h2>
            </div>
            <button onClick={() => setIsOpen(false)} className={cn(
              "p-1 rounded transition-colors duration-300",
              darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-200 text-slate-600"
            )}>
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <label className={cn(
              "flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all group",
              darkMode 
                ? "border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10" 
                : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50"
            )}>
              <Plus className={cn(
                "w-4 h-4 transition-colors duration-300",
                darkMode ? "text-slate-600 group-hover:text-indigo-400" : "text-slate-400 group-hover:text-indigo-600"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors duration-300",
                darkMode ? "text-slate-500 group-hover:text-indigo-400" : "text-slate-500 group-hover:text-indigo-600"
              )}>Add Images</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={onImageUpload} />
            </label>

            <div className="pt-4 space-y-3">
              {files.map((file) => {
                const isSelected = selectedFileNames.includes(file.name);
                return (
                  <div key={file.name} className={cn(
                    "group flex flex-col gap-2 p-2 rounded-lg border transition-all relative",
                    darkMode 
                      ? "bg-slate-800/50 border-slate-800 hover:border-slate-700" 
                      : "bg-white border-slate-100 hover:border-slate-200",
                    isSelected && (darkMode ? "ring-1 ring-indigo-500/50 bg-indigo-900/10" : "ring-1 ring-indigo-500/30 bg-indigo-50/30")
                  )}>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onToggleSelect(file.name)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : (darkMode ? "border-slate-700 bg-slate-900" : "border-slate-300 bg-white")
                        )}
                      >
                        {isSelected && <Plus className="w-3 h-3 rotate-45" />}
                      </button>
                      <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative">
                        <Image src={file.data} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[11px] font-medium truncate transition-colors duration-300",
                          darkMode ? "text-slate-300" : "text-slate-700"
                        )}>{file.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase">{file.type.split('/')[1]}</p>
                      </div>
                      <button 
                        onClick={() => onDeleteFile(file.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="px-1">
                      <textarea
                        value={file.description || ''}
                        onChange={(e) => onUpdateDescription(file.name, e.target.value)}
                        placeholder="AI generating description..."
                        className={cn(
                          "w-full p-2 rounded-lg text-[10px] leading-relaxed resize-none h-16 outline-none transition-colors",
                          darkMode 
                            ? "bg-slate-900/50 text-slate-400 border border-slate-800 focus:border-indigo-500/50" 
                            : "bg-slate-50 text-slate-600 border border-slate-100 focus:border-indigo-500/30"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
              {files.length === 0 && (
                <p className="text-center py-10 text-[10px] text-slate-400 italic">No images uploaded yet.</p>
              )}
            </div>
          </div>
    </div>
  );
};
