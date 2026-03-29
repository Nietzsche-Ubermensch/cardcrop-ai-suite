import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { generateBotResponse } from '../services/openaiService';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello, I am Lumina. I can help you evaluate card conditions, suggest grading strategies, or explain restoration techniques. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await generateBotResponse(history, userMsg.text);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered a connection error. Please verify your API key configuration.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0c0e] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-[#0b0c0e]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
             <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-100 text-lg tracking-tight">Lumina Assistant</h2>
            <p className="text-xs text-gray-400">Powered by OpenAI GPT-4.1</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                 msg.role === 'user' ? 'bg-gray-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
             }`}>
                {msg.role === 'user' ? <User size={14} className="text-gray-300"/> : <Bot size={14} className="text-white"/>}
             </div>
             
             <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gray-800 text-gray-100 rounded-tr-sm' 
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
                 }`}>
                    {msg.text}
                 </div>
                 <span className="text-[10px] text-gray-600 mt-1.5 px-1">
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
             </div>
          </div>
        ))}
        
        {isTyping && (
           <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-white"/>
              </div>
              <div className="px-5 py-4 bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#0b0c0e]/80 backdrop-blur-md border-t border-white/5">
        <div className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Lumina about card grading or restoration..."
            className="w-full bg-[#18181b] border border-white/10 rounded-xl py-4 pl-5 pr-14 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-lg shadow-black/20"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-700 transition-all shadow-md"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-center mt-3">
             <p className="text-[10px] text-gray-600">AI responses may vary. Check standard grading criteria manually.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;