import React, { useState } from 'react';
import { Sparkles, Loader2, Download, Image as ImageIcon, AlertCircle, Cpu } from 'lucide-react';
import { generateCardImage } from '../services/openaiService';
import { ImageSize } from '../types';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>(ImageSize.Size1K);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageData = await generateCardImage(prompt, size);
      setGeneratedImage(imageData);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateApiKey = () => {
    const newKey = prompt('Enter your OpenAI API key:');
    if (newKey) {
      localStorage.setItem('OPENAI_API_KEY', newKey);
      setError(null);
    }
  };

  return (
    <div className="h-full bg-[#0b0c0e] p-6 md:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        
        {/* Left Column: Controls */}
        <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
                    <Cpu size={32} className="text-[#3274d9]" />
                    <span>GEN_ENGINE_V3</span>
                </h2>
                <p className="text-gray-500 font-mono text-sm">
                    AI-powered sports card image generation using OpenAI DALL-E 3.
                </p>
            </div>

            <div className="bg-[#111217] border border-[#2c3235] p-6 rounded-sm space-y-6">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prompt Input</label>
                   <textarea
                     className="w-full h-32 bg-[#0b0c0e] border border-[#2c3235] rounded-sm p-3 focus:border-[#3274d9] outline-none resize-none text-gray-300 font-mono text-sm"
                     placeholder="> Describe asset parameters..."
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                   ></textarea>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resolution Output</label>
                   <div className="grid grid-cols-3 gap-2">
                      {Object.values(ImageSize).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSize(s)}
                          className={`py-2 px-3 rounded-sm text-xs font-bold font-mono border transition-all ${
                            size === s 
                             ? 'bg-[#3274d9]/20 border-[#3274d9] text-[#3274d9]' 
                             : 'bg-[#181b1f] border-[#2c3235] text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    className={`w-full py-3 rounded-sm font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${
                        isLoading || !prompt.trim()
                        ? 'bg-[#181b1f] text-gray-600 border border-[#2c3235] cursor-not-allowed'
                        : 'bg-[#3274d9] hover:bg-[#3274d9]/90 text-white shadow-lg shadow-blue-900/20'
                    }`}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isLoading ? 'PROCESSING...' : 'INITIALIZE GENERATION'}
                </button>
                
                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                        <div className="w-2 h-2 bg-[#73bf69] rounded-full animate-pulse"></div>
                        SYSTEM READY
                    </div>
                    <button onClick={updateApiKey} className="text-[10px] text-[#3274d9] hover:underline font-mono">
                        UPDATE API KEY
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="bg-[#2a1215] border border-[#f2495c] text-[#f2495c] px-4 py-3 rounded-sm flex items-center gap-3 font-mono text-xs">
                    <AlertCircle size={16} />
                    <p>{error}</p>
                </div>
            )}
        </div>

        {/* Right Column: Preview */}
        <div className="bg-[#111217] border border-[#2c3235] rounded-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
            {generatedImage ? (
              <div className="w-full max-w-sm animate-in fade-in duration-700">
                 <div className="aspect-[3/4] relative rounded-sm overflow-hidden border border-[#2c3235] shadow-2xl shadow-black/50 bg-black">
                    <img 
                        src={generatedImage} 
                        alt="Generated Card" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                 </div>
                 <div className="mt-6 flex justify-center">
                    <a 
                       href={generatedImage} 
                       download={`ai-card-${Date.now()}.png`}
                       className="inline-flex items-center gap-2 px-6 py-2 bg-[#181b1f] border border-[#2c3235] hover:border-[#3274d9] text-gray-300 hover:text-white rounded-sm transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                       <Download size={14} />
                       Save Asset
                    </a>
                 </div>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-[#2c3235]">
                    <div className="w-24 h-24 border-2 border-dashed border-[#2c3235] rounded-full flex items-center justify-center mb-6">
                        {isLoading ? <Loader2 size={32} className="animate-spin text-[#3274d9]" /> : <ImageIcon size={32} />}
                    </div>
                    <p className="font-mono text-sm tracking-widest">{isLoading ? 'RENDERING...' : 'AWAITING INPUT'}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;