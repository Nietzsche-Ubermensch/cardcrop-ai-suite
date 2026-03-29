import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import BatchCropper from './pages/BatchCropper';
import ImageGenerator from './pages/ImageGenerator';
import ChatBot from './pages/ChatBot';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'cropper' | 'generator' | 'chat'>('cropper');

  return (
    <div className="flex h-screen bg-[#0b0c0e] font-sans text-gray-200 overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 ml-64 h-full relative overflow-hidden bg-[#0b0c0e]">
        {currentView === 'cropper' && <BatchCropper />}
        {currentView === 'generator' && <ImageGenerator />}
        {currentView === 'chat' && <ChatBot />}
      </main>
    </div>
  );
};

export default App;