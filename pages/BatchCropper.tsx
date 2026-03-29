import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Loader2, Download, Settings2, Play, Trash2, Search, Sliders, Crop, Wand2, Key, Info, CheckCircle2 } from 'lucide-react';
import { CardImage, ProcessingStatus, ProcessingSettings, RestorationLevel } from '../types';
import { analyzeCardDamage, restoreCard } from '../services/openaiService';
import JSZip from 'jszip';

const BatchCropper: React.FC = () => {
  const [cards, setCards] = useState<CardImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [settings, setSettings] = useState<ProcessingSettings>({
    aspectRatio: 2.5 / 3.5,
    jpegQuality: 95,
    enableUpscaling: true,
    enableDescratching: true,
    restorationLevel: RestorationLevel.Balanced,
    upscalingScale: 4,
    backgroundColor: 'White',
    autoCrop: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Cleanup object URLs to prevent memory leaks when component unmounts
  useEffect(() => {
    return () => {
      cards.forEach(card => {
        URL.revokeObjectURL(card.previewUrl);
        if (card.processedUrl) URL.revokeObjectURL(card.processedUrl);
      });
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const base64ToBlobUrl = (base64: string): string => {
    try {
      const byteCharacters = atob(base64.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Failed to convert base64 to blob", e);
      return base64; // Fallback
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const MAX_SIZE_MB = 20;
      const MAX_BATCH_SIZE = 50;
      
      const files = Array.from(event.target.files);
      
      if (files.length > MAX_BATCH_SIZE) {
          addLog(`Warning: Selecting >${MAX_BATCH_SIZE} files may slow down browser.`);
      }

      const newCards: CardImage[] = [];
      let skippedCount = 0;

      files.forEach(file => {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            skippedCount++;
            return;
        }
        newCards.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            previewUrl: URL.createObjectURL(file),
            status: ProcessingStatus.Pending,
            originalWidth: 0,
            originalHeight: 0
        });
      });

      if (skippedCount > 0) {
          addLog(`Skipped ${skippedCount} files larger than ${MAX_SIZE_MB}MB.`);
      }

      setCards(prev => [...prev, ...newCards]);
      addLog(`Added ${newCards.length} images to queue.`);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAll = () => {
      if (isProcessing) {
          if(!window.confirm("Processing is active. Are you sure you want to clear and stop?")) return;
      }
      // Cleanup memory
      cards.forEach(c => {
          URL.revokeObjectURL(c.previewUrl);
          if (c.processedUrl) URL.revokeObjectURL(c.processedUrl);
      });
      setCards([]);
      addLog("Queue cleared. Memory released.");
  };

  const clearCompleted = () => {
      const completed = cards.filter(c => c.status === ProcessingStatus.Completed);
      const remaining = cards.filter(c => c.status !== ProcessingStatus.Completed);
      
      // Cleanup memory for completed items only
      completed.forEach(c => {
          URL.revokeObjectURL(c.previewUrl);
          if (c.processedUrl) URL.revokeObjectURL(c.processedUrl);
      });

      setCards(remaining);
      addLog(`Removed ${completed.length} completed items.`);
  };

  const handleApiKeyUpdate = () => {
    const newKey = prompt('Enter your OpenAI API key:');
    if (newKey) {
      localStorage.setItem('OPENAI_API_KEY', newKey);
      addLog("System: API Key updated.");
    }
  };

  const processBatch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Filter pending items
    const pendingCards = cards.filter(c => c.status === ProcessingStatus.Pending);
    addLog(`Starting batch process (${pendingCards.length} pending items)`);
    
    // We iterate through the existing cards array by index to ensure we update state correctly
    // Note: We access the *current* state inside the loop via the card.id match
    
    for (const card of pendingCards) {
      // Check if user cleared queue mid-process
      // We can't easily check state inside loop without refs, but we can try-catch
      
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: ProcessingStatus.Processing } : c));
      
      try {
          // 1. Analyze & Detect Crop Box
          addLog(`[${card.file.name}] Analyzing & Detecting boundaries...`);
          const analysis = await analyzeCardDamage(card.file);
          
          setCards(prev => prev.map(c => c.id === card.id ? { ...c, analysis } : c));
          addLog(`[${card.file.name}] Damage Score: ${analysis.damageScore} | Crop Conf: High`);

          // 2. Crop & Restore
          addLog(`[${card.file.name}] Applying ${settings.restorationLevel} restoration...`);
          const restoredBase64 = await restoreCard(card.file, settings, analysis);
          
          // Convert Base64 to Blob URL for memory efficiency
          const restoredBlobUrl = base64ToBlobUrl(restoredBase64);

          setCards(prev => prev.map(c => 
             c.id === card.id ? { ...c, status: ProcessingStatus.Completed, processedUrl: restoredBlobUrl } : c
          ));
          addLog(`[${card.file.name}] Finished.`);

      } catch (error: any) {
          console.error(error);
          addLog(`ERROR [${card.id}] ${error.message || 'Processing failed'}`);
          if (error.message?.includes('401') || error.message?.includes('API keys')) {
             addLog(`SYSTEM ALERT: Authentication failed. Update API Key.`);
          }
          setCards(prev => prev.map(c => 
             c.id === card.id ? { ...c, status: ProcessingStatus.Failed } : c
          ));
      }
    }
    setIsProcessing(false);
  };

  const handleDownloadBatch = async () => {
    const completedCards = cards.filter(c => c.status === ProcessingStatus.Completed && c.processedUrl);
    if (completedCards.length === 0) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const promises = completedCards.map(async (card) => {
        if (card.processedUrl) {
           const response = await fetch(card.processedUrl);
           const blob = await response.blob();
           zip.file(`restored_${card.file.name.replace(/\.[^/.]+$/, "")}.png`, blob);
        }
      });
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `lumina_batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      addLog("Zip generation failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const completedCount = cards.filter(c => c.status === ProcessingStatus.Completed).length;
  const progress = cards.length > 0 ? (completedCount / cards.length) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-gray-300 font-sans">
      {/* Top Navigation */}
      <div className="h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md flex items-center px-8 justify-between z-10">
        <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Wand2 size={18} className="text-purple-500" />
                Workstation
            </h2>
            <div className="h-6 w-px bg-white/10"></div>
            <div className="flex gap-6 text-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Queue</span>
                    <span className="text-white font-medium">{cards.length} Assets</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Status</span>
                    <span className={`${isProcessing ? 'text-blue-400' : 'text-green-400'} font-medium`}>
                        {isProcessing ? 'Processing...' : 'Ready'}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex gap-3">
             {completedCount > 0 && (
                <button 
                  onClick={clearCompleted}
                  className="px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2"
                  title="Remove completed items to free memory"
                >
                  <CheckCircle2 size={14} /> Prune Done
                </button>
             )}
             <button 
              onClick={clearAll}
              disabled={cards.length === 0}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} /> Clear All
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
            >
              <Upload size={14} /> Import
            </button>
            <button 
              onClick={processBatch}
              disabled={isProcessing || cards.length === 0}
              className={`px-6 py-2 rounded-lg text-white text-xs font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 ${
                isProcessing || cards.length === 0 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              {isProcessing ? 'Processing' : 'Start Batch'}
            </button>
        </div>
        <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect}/>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Grid */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#09090b] to-[#09090b] pointer-events-none"></div>

          {cards.length === 0 ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="h-full border border-dashed border-white/10 bg-white/[0.02] rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all group"
             >
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-gray-400 group-hover:text-indigo-400" />
               </div>
               <p className="font-medium text-lg text-gray-300">Drop cards here</p>
               <div className="flex items-center gap-4 mt-2">
                   <p className="text-xs text-gray-600 flex items-center gap-1"><Info size={10}/> Max 20MB per file</p>
                   <p className="text-xs text-gray-600 flex items-center gap-1"><Info size={10}/> Max 50 files per batch</p>
               </div>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-0">
              {cards.map(card => (
                <div key={card.id} className="group relative bg-[#121214] border border-white/5 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300">
                  <div className="aspect-[3/4] relative bg-[#09090b] p-3">
                    <img 
                      src={card.processedUrl || card.previewUrl} 
                      alt="Card" 
                      className={`w-full h-full object-contain rounded-lg shadow-sm ${card.status === ProcessingStatus.Processing ? 'opacity-50 blur-sm scale-95' : 'scale-100'} transition-all`} 
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                         {card.status === ProcessingStatus.Completed && (
                             <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 p-1.5 rounded-md">
                                 <Wand2 size={12} />
                             </div>
                         )}
                         {card.status === ProcessingStatus.Processing && (
                             <div className="bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-400 p-1.5 rounded-md animate-pulse">
                                 <Loader2 size={12} className="animate-spin" />
                             </div>
                         )}
                         {card.status === ProcessingStatus.Failed && (
                             <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 p-1.5 rounded-md">
                                 <X size={12} />
                             </div>
                         )}
                    </div>

                    {/* Analysis Overlay (Hover) */}
                    {card.analysis && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                            <div className="text-3xl font-bold text-white mb-1">{card.analysis.damageScore}</div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">Condition Score</div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {card.analysis.issues.slice(0, 3).map((issue, i) => (
                                    <span key={i} className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">{issue}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <button 
                      onClick={() => {
                          // Clean up specific card
                          URL.revokeObjectURL(card.previewUrl);
                          if(card.processedUrl) URL.revokeObjectURL(card.processedUrl);
                          setCards(prev => prev.filter(c => c.id !== card.id));
                      }}
                      className="absolute top-3 right-3 bg-black/50 hover:bg-red-500/80 p-1.5 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Settings Panel (Lumina Style) */}
        <div className="w-80 bg-[#0c0c0e]/95 backdrop-blur-xl border-l border-white/5 flex flex-col z-20">
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Settings2 size={16} className="text-indigo-400" />
            </div>
            <h3 className="font-medium text-sm text-gray-200">Processing Config</h3>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* API Key */}
             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-300">OpenAI API</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <button 
                    onClick={handleApiKeyUpdate}
                    className="w-full text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 py-2 rounded-lg transition-colors font-medium"
                >
                    CONFIGURE KEY
                </button>
             </div>

            {/* Smart Crop */}
            <div>
               <div className="flex items-center justify-between mb-3">
                   <label className="text-xs font-medium text-gray-400">Smart Crop</label>
                   <Crop size={14} className="text-gray-600"/>
               </div>
               <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                   <span className="text-xs text-gray-300">Auto-Detect Borders</span>
                   <div 
                      onClick={() => setSettings({...settings, autoCrop: !settings.autoCrop})}
                      className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.autoCrop ? 'bg-indigo-600' : 'bg-gray-700'}`}
                   >
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.autoCrop ? 'translate-x-4' : 'translate-x-0'}`}></div>
                   </div>
               </div>
            </div>

            {/* Restoration Level */}
            <div>
               <div className="flex items-center justify-between mb-3">
                   <label className="text-xs font-medium text-gray-400">Restoration Engine</label>
                   <Sliders size={14} className="text-gray-600"/>
               </div>
               <div className="grid grid-cols-3 gap-2">
                   {[RestorationLevel.Light, RestorationLevel.Balanced, RestorationLevel.Aggressive].map((level) => (
                       <button
                         key={level}
                         onClick={() => setSettings({...settings, restorationLevel: level})}
                         className={`py-2 text-[10px] font-medium rounded-lg border transition-all ${
                             settings.restorationLevel === level
                             ? 'bg-white/10 border-white/20 text-white shadow-sm'
                             : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5'
                         }`}
                       >
                           {level}
                       </button>
                   ))}
               </div>
               <p className="text-[10px] text-gray-600 mt-2 px-1">
                   {settings.restorationLevel === 'Light' && "Conservative. Removes loose dust only."}
                   {settings.restorationLevel === 'Balanced' && "Standard. Fixes scratches & corner wear."}
                   {settings.restorationLevel === 'Aggressive' && "Heavy. Reconstructs damaged surfaces."}
               </p>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
               <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                  <span className="text-xs text-gray-300">Neural Upscale (4x)</span>
                  <input 
                    type="checkbox" 
                    checked={settings.enableUpscaling}
                    onChange={(e) => setSettings({...settings, enableUpscaling: e.target.checked})}
                    className="w-4 h-4 accent-indigo-500 bg-transparent"
                  />
               </label>
            </div>

            {/* Console */}
            <div className="flex-1 flex flex-col min-h-[150px]">
                <label className="text-xs font-medium text-gray-400 mb-2">Activity Log</label>
                <div className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl overflow-y-auto max-h-[200px] text-[10px] font-mono text-gray-500 custom-scrollbar shadow-inner">
                    {logs.length === 0 && <span className="opacity-30 italic">System ready...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                    ))}
                    <div ref={logsEndRef}></div>
                </div>
            </div>

            {/* Footer */}
            <div className="pt-4">
               {cards.length > 0 && progress > 0 && (
                   <div className="mb-4">
                       <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                           <span>Progress</span>
                           <span>{Math.round(progress)}%</span>
                       </div>
                       <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                       </div>
                   </div>
               )}
               <button 
                  onClick={handleDownloadBatch}
                  disabled={completedCount === 0 || isDownloading}
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${
                    completedCount > 0 && !isDownloading
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                  }`}
                >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isDownloading ? 'Compressing...' : 'Export Results'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchCropper;