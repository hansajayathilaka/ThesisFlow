'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { refineMarkdownBlock, chatWithDocument, generateDocumentUpdate, analyzeImage } from '@/lib/gemini';
import { 
  FileUp, 
  Sparkles, 
  Loader2, 
  Download, 
  Undo, 
  Moon, 
  Sun,
  MessageSquare,
  FolderOpen,
  FileText,
  Layout,
  RefreshCw
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import JSZip from 'jszip';
import { cn } from '@/lib/utils';
import { 
  Link as LinkIcon, 
  Link2Off, 
  PanelLeftClose, 
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Columns,
  Rows,
  Maximize2,
  Minimize2
} from 'lucide-react';

// Modular Components
import { StoredFile, ChatMessage, TocEntry, LLMInteraction } from './thesis/types';
import { MarkdownRenderer } from './thesis/MarkdownRenderer';
import { ChatSidebar } from './thesis/ChatSidebar';
import { FileManager } from './thesis/FileManager';
import { TableOfContents } from './thesis/TableOfContents';

export default function ThesisFlow() {
  const [markdown, setMarkdown] = useState<string>('# My Research\n\nStart writing here...');
  const [history, setHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmInteractions, setLlmInteractions] = useState<LLMInteraction[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [editorOpen, setEditorOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [showRefineMenu, setShowRefineMenu] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Sync Scroll Logic
  const handleEditorScroll = useCallback(() => {
    if (!syncScroll || isSyncingScroll.current || !textareaRef.current || !previewContainerRef.current) return;
    isSyncingScroll.current = true;
    
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    
    const preview = previewContainerRef.current;
    preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
    
    setTimeout(() => { isSyncingScroll.current = false; }, 50);
  }, [syncScroll]);

  const handlePreviewScroll = useCallback(() => {
    if (!syncScroll || isSyncingScroll.current || !textareaRef.current || !previewContainerRef.current) return;
    isSyncingScroll.current = true;
    
    const { scrollTop, scrollHeight, clientHeight } = previewContainerRef.current;
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    
    const editor = textareaRef.current;
    editor.scrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
    
    setTimeout(() => { isSyncingScroll.current = false; }, 50);
  }, [syncScroll]);

  const saveToHistory = (content: string) => {
    setHistory(prev => [content, ...prev].slice(0, 10));
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[0];
      setMarkdown(prev);
      setHistory(prev => prev.slice(1));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.md')) {
      const text = await file.text();
      saveToHistory(markdown);
      setMarkdown(text);
    } else if (file.name.endsWith('.zip')) {
      handleImportZip(file);
    }
    e.target.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    const newStoredFiles: StoredFile[] = [];
    setIsProcessing(true);

    try {
      for (const file of uploadedFiles) {
        const reader = new FileReader();
        const promise = new Promise<StoredFile>((resolve) => {
          reader.onload = async (event) => {
            const data = event.target?.result as string;
            let description = '';
            
            try {
              const result = await analyzeImage(data, file.type);
              description = result || '';
            } catch (err) {
              console.error("Image analysis failed", err);
            }

            resolve({
              name: file.name,
              type: file.type,
              data: data,
              blob: file,
              description: description || 'No description generated.'
            });
          };
        });
        reader.readAsDataURL(file);
        newStoredFiles.push(await promise);
      }

      setFiles(prev => [...prev, ...newStoredFiles]);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleImportZip = async (file: File) => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const newFiles: StoredFile[] = [];
    let newMarkdown = markdown;

    for (const [path, zipEntry] of Object.entries(contents.files)) {
      if (zipEntry.dir) continue;

      if (path.endsWith('.md')) {
        newMarkdown = await zipEntry.async('string');
      } else if (path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        const blob = await zipEntry.async('blob');
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });
        newFiles.push({
          name: path,
          type: `image/${path.split('.').pop()}`,
          data,
          blob
        });
      }
    }

    saveToHistory(markdown);
    setMarkdown(newMarkdown);
    setFiles(newFiles);
  };

  const handleExportZip = async () => {
    const zip = new JSZip();
    zip.file('document.md', markdown);
    
    // Assets folder
    const assetsFolder = zip.folder('assets');
    files.forEach(file => {
      if (assetsFolder) {
        assetsFolder.file(file.name, file.blob);
        if (file.description) {
          assetsFolder.file(`${file.name}.description.txt`, file.description);
        }
      }
    });

    // LLM Logs folder
    const logsFolder = zip.folder('llm_logs');
    if (logsFolder) {
      llmInteractions.forEach((interaction, index) => {
        const interactionFolder = logsFolder.folder(`${index + 1}_${interaction.type}_${interaction.id}`);
        if (interactionFolder) {
          interactionFolder.file('request.json', JSON.stringify(interaction.request, null, 2));
          interactionFolder.file('response.json', JSON.stringify(interaction.response, null, 2));
          interactionFolder.file('metadata.json', JSON.stringify({
            timestamp: interaction.timestamp,
            type: interaction.type,
            id: interaction.id
          }, null, 2));
        }
      });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research_project_${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelection = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value.substring(start, end);

    if (text.length > 0) {
      setSelection({ start, end, text });
      setShowRefineMenu(true);
    } else {
      setShowRefineMenu(false);
    }
  };

  const handleRefine = async () => {
    if (!selection) return;
    setIsRefining(true);
    setIsProcessing(true);
    const requestPayload = { fullContext: markdown.slice(0, 1000), selectedBlock: selection.text, instruction: refineInstruction };
    
    try {
      const refined = await refineMarkdownBlock(markdown, selection.text, refineInstruction);
      
      setLlmInteractions(prev => [...prev, {
        id: `refine-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'refine',
        request: requestPayload,
        response: { refinedBlock: refined }
      }]);

      if (refined) {
        saveToHistory(markdown);
        const newMarkdown = markdown.substring(0, selection.start) + refined + markdown.substring(selection.end);
        setMarkdown(newMarkdown);
        setShowRefineMenu(false);
        setRefineInstruction('');
      }
    } catch (error) {
      console.error("Refinement failed", error);
    } finally {
      setIsRefining(false);
      setIsProcessing(false);
    }
  };

  const handleGlobalEdit = async () => {
    if (!userInput.trim()) return;
    setIsGlobalEditing(true);
    setIsProcessing(true);
    const instruction = userInput;
    const selectedFiles = files.filter(f => selectedFileNames.includes(f.name));
    const imageContext = selectedFiles.map(f => `File: ${f.name}\nDescription: ${f.description}`).join('\n\n');
    
    setUserInput('');
    setSelectedFileNames([]); // Clear selection after use
    
    setChatMessages(prev => [...prev, { role: 'user', text: `✨ Edit Document: ${instruction}${selectedFiles.length > 0 ? `\n(Context: ${selectedFiles.length} images)` : ''}` }]);

    try {
      const result = await generateDocumentUpdate(markdown, instruction, imageContext);
      const { edits, summary } = result;
      
      setLlmInteractions(prev => [...prev, {
        id: `edit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'edit',
        request: { fullContext: markdown.slice(0, 1000), instruction, imageContext },
        response: result
      }]);

      if (edits && edits.length > 0) {
        saveToHistory(markdown);
        let newMarkdown = markdown;
        let appliedCount = 0;
        
        for (const edit of edits) {
          if (newMarkdown.includes(edit.search)) {
            newMarkdown = newMarkdown.replace(edit.search, edit.replace);
            appliedCount++;
          } else {
            console.warn(`Could not find search string: ${edit.search}`);
          }
        }
        
        if (appliedCount > 0) {
          setMarkdown(newMarkdown);
          setChatMessages(prev => [...prev, { role: 'ai', text: `${summary}\n\n*Applied ${appliedCount} surgical edit(s).*` }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'ai', text: "I identified some changes but couldn't find the exact text in the document to replace. Try being more specific or selecting the text manually." }]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', text: summary || "I couldn't identify any specific changes to make." }]);
      }
    } catch (error) {
      console.error("Global edit failed", error);
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error while updating the document." }]);
    } finally {
      setIsGlobalEditing(false);
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    setIsProcessing(true);
    const currentInput = userInput;
    const selectedFiles = files.filter(f => selectedFileNames.includes(f.name));
    const imageContext = selectedFiles.map(f => `File: ${f.name}\nDescription: ${f.description}`).join('\n\n');
    
    const newMessages = [...chatMessages, { role: 'user' as const, text: currentInput }];
    setChatMessages(newMessages);
    setUserInput('');
    setSelectedFileNames([]); // Clear selection after use

    try {
      const historyForAI = chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));
      const response = await chatWithDocument(markdown, historyForAI, currentInput, imageContext);
      
      setLlmInteractions(prev => [...prev, {
        id: `chat-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'chat',
        request: { fullContext: markdown.slice(0, 1000), history: historyForAI, message: currentInput, imageContext },
        response: { text: response }
      }]);

      if (response) {
        setChatMessages([...newMessages, { role: 'ai', text: response }]);
      }
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const updateFileDescription = (name: string, description: string) => {
    setFiles(prev => prev.map(f => f.name === name ? { ...f, description } : f));
  };

  const toggleFileSelection = (name: string) => {
    setSelectedFileNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleTocSelect = (entry: TocEntry) => {
    // Scroll Preview
    const element = document.getElementById(entry.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }

    // Scroll Editor
    if (textareaRef.current) {
      const lines = markdown.split('\n');
      let charCount = 0;
      for (let i = 0; i < entry.line; i++) {
        charCount += lines[i].length + 1; // +1 for newline
      }
      
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charCount, charCount + lines[entry.line].length);
      
      const lineHeight = 20; // Approximate line height in pixels
      textareaRef.current.scrollTop = entry.line * lineHeight - 100;
    }
  };

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans transition-colors duration-300",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-[#F3F4F6] text-slate-900"
    )}>
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className={cn(
          "h-14 border-b flex items-center justify-between px-6 shrink-0 z-10 transition-colors duration-300",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200/20">M</div>
              <h1 className={cn(
                "font-bold text-lg tracking-tight transition-colors duration-300",
                darkMode ? "text-slate-100" : "text-slate-900"
              )}>ThesisFlow</h1>
            </div>
            
            <div className={cn(
              "h-4 w-[1px] mx-2 transition-colors duration-300",
              darkMode ? "bg-slate-800" : "bg-slate-200"
            )} />

            {/* Layout Controls */}
            <div className={cn(
              "flex p-1 gap-1.5 rounded-xl border transition-colors duration-300",
              darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
            )}>
              <button 
                onClick={() => setChatOpen(!chatOpen)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  chatOpen ? (darkMode ? "bg-slate-700 text-indigo-400" : "bg-white text-indigo-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
                title="Toggle Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTocOpen(!tocOpen)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  tocOpen ? (darkMode ? "bg-slate-700 text-indigo-400" : "bg-white text-indigo-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
                title="Toggle Table of Contents"
              >
                <Rows className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setEditorOpen(!editorOpen)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  editorOpen ? (darkMode ? "bg-slate-700 text-indigo-400" : "bg-white text-indigo-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
                title="Toggle Editor"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPreviewOpen(!previewOpen)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  previewOpen ? (darkMode ? "bg-slate-700 text-indigo-400" : "bg-white text-indigo-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
                title="Toggle Preview"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setFileManagerOpen(!fileManagerOpen)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  fileManagerOpen ? (darkMode ? "bg-slate-700 text-indigo-400" : "bg-white text-indigo-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
                title="Toggle Assets"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isProcessing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">AI Processing</span>
              </div>
            )}
            <button 
              onClick={() => setSyncScroll(!syncScroll)}
              className={cn(
                "p-2 rounded-lg transition-colors duration-300 border",
                syncScroll 
                  ? (darkMode ? "bg-indigo-900/40 border-indigo-800 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600")
                  : (darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-400")
              )}
              title={syncScroll ? "Unsync Scroll" : "Sync Scroll"}
            >
              {syncScroll ? <LinkIcon className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-2 rounded-lg transition-colors duration-300 border",
                darkMode 
                  ? "bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {history.length > 0 && (
              <button 
                onClick={handleUndo}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  darkMode 
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                <Undo className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            <div className={cn(
              "flex p-1 rounded-xl border transition-colors duration-300",
              darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
            )}>
              <label className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all",
                darkMode 
                  ? "text-slate-300 hover:bg-slate-700" 
                  : "text-slate-600 hover:bg-white hover:shadow-sm"
              )}>
                <FileUp className="w-3.5 h-3.5" />
                <span>Import</span>
                <input type="file" accept=".md,.zip" className="hidden" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={handleExportZip}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  darkMode 
                    ? "text-slate-300 hover:bg-slate-700" 
                    : "text-slate-600 hover:bg-white hover:shadow-sm"
                )}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </header>

        {/* Resizable Layout */}
        <div className="flex-1 flex overflow-hidden">
          <PanelGroup orientation="horizontal" className="h-full">
            {/* Chat Panel */}
            {chatOpen && (
              <>
                <Panel defaultSize={20} minSize={15} collapsible>
                  <ChatSidebar 
                    isOpen={chatOpen}
                    setIsOpen={setChatOpen}
                    messages={chatMessages}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    selectedFiles={files.filter(f => selectedFileNames.includes(f.name))}
                    onRemoveSelectedFile={toggleFileSelection}
                    onSendMessage={handleSendMessage}
                    onGlobalEdit={handleGlobalEdit}
                    isGlobalEditing={isGlobalEditing}
                    darkMode={darkMode}
                  />
                </Panel>
                <PanelResizeHandle className={cn(
                  "w-1 transition-colors hover:bg-indigo-500",
                  darkMode ? "bg-slate-800" : "bg-slate-200"
                )} />
              </>
            )}

            {/* Editor Panel */}
            {editorOpen && (
              <>
                <Panel defaultSize={editorOpen && previewOpen ? 30 : 60} minSize={20} collapsible>
                  <div className={cn(
                    "h-full flex flex-col relative transition-colors duration-300",
                    darkMode ? "bg-slate-950" : "bg-white"
                  )}>
                    <div className={cn(
                      "h-10 border-b flex items-center px-4 justify-between transition-colors duration-300",
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className={cn(
                          "text-[10px] uppercase tracking-widest font-bold transition-colors duration-300",
                          darkMode ? "text-slate-500" : "text-slate-500"
                        )}>Editor</span>
                      </div>
                      <button onClick={() => setEditorOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                        <Minimize2 className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                    <div className="flex-1 relative overflow-hidden p-4">
                      <textarea
                        ref={textareaRef}
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        onSelect={handleSelection}
                        onScroll={handleEditorScroll}
                        className={cn(
                          "w-full h-full p-8 rounded-2xl border text-mono text-sm resize-none outline-none leading-relaxed transition-all duration-300",
                          darkMode 
                            ? "bg-slate-900 border-slate-800 text-slate-300 selection:bg-indigo-500/40 focus:ring-indigo-500/20" 
                            : "bg-slate-50 border-slate-200 text-slate-800 selection:bg-indigo-500/20 focus:ring-indigo-500/10"
                        )}
                        placeholder="# Start writing..."
                        spellCheck={false}
                      />
                      
                      {/* Refine Context Menu */}
                      <AnimatePresence>
                        {showRefineMenu && selection && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className={cn(
                              "absolute z-40 rounded-2xl shadow-2xl border p-5 w-80 left-1/2 -translate-x-1/2 bottom-10 transition-colors duration-300",
                              darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-4 h-4 text-indigo-500" />
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                                darkMode ? "text-slate-400" : "text-slate-500"
                              )}>Refine Selection</span>
                            </div>
                            <textarea 
                              value={refineInstruction}
                              onChange={(e) => setRefineInstruction(e.target.value)}
                              placeholder="Make this more academic..."
                              className={cn(
                                "w-full p-3 border rounded-xl text-xs mb-3 h-20 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-colors duration-300",
                                darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-900"
                              )}
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setShowRefineMenu(false)}
                                className={cn(
                                  "px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-300",
                                  darkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-100"
                                )}
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleRefine}
                                disabled={isRefining || !refineInstruction}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200/20"
                              >
                                {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Refine
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Panel>
                {previewOpen && (
                  <PanelResizeHandle className={cn(
                    "w-1 transition-colors hover:bg-indigo-500",
                    darkMode ? "bg-slate-800" : "bg-slate-200"
                  )} />
                )}
              </>
            )}

            {/* Preview Panel */}
            {previewOpen && (
              <>
                <Panel defaultSize={previewOpen && editorOpen ? 35 : 70} minSize={20} collapsible>
                  <div className={cn(
                    "h-full flex flex-col overflow-hidden transition-colors duration-300",
                    darkMode ? "bg-slate-900" : "bg-slate-100"
                  )}>
                    <div className={cn(
                      "h-10 border-b flex items-center px-4 justify-between transition-colors duration-300",
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2">
                        <Layout className="w-3.5 h-3.5 text-slate-400" />
                        <span className={cn(
                          "text-[10px] uppercase tracking-widest font-bold transition-colors duration-300",
                          darkMode ? "text-slate-500" : "text-slate-500"
                        )}>Preview</span>
                      </div>
                      <button onClick={() => setPreviewOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                        <Minimize2 className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                    <div 
                      ref={previewContainerRef}
                      onScroll={handlePreviewScroll}
                      className="flex-1 overflow-y-auto p-8 flex justify-center scroll-smooth"
                    >
                      <div className="w-full max-w-[800px]">
                        <MarkdownRenderer content={markdown} files={files} darkMode={darkMode} />
                      </div>
                    </div>
                  </div>
                </Panel>
              </>
            )}

            {/* Assets Panel */}
            {fileManagerOpen && (
              <>
                <PanelResizeHandle className={cn(
                  "w-1 transition-colors hover:bg-indigo-500",
                  darkMode ? "bg-slate-800" : "bg-slate-200"
                )} />
                <Panel defaultSize={15} minSize={10} collapsible>
                  <FileManager 
                    isOpen={fileManagerOpen}
                    setIsOpen={setFileManagerOpen}
                    files={files}
                    selectedFileNames={selectedFileNames}
                    onToggleSelect={toggleFileSelection}
                    onImageUpload={handleImageUpload}
                    onDeleteFile={deleteFile}
                    onUpdateDescription={updateFileDescription}
                    darkMode={darkMode}
                  />
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>

        <TableOfContents 
          content={markdown}
          onSelect={handleTocSelect}
          darkMode={darkMode}
          isOpen={tocOpen}
          setIsOpen={setTocOpen}
        />
      </main>
    </div>
  );
}
