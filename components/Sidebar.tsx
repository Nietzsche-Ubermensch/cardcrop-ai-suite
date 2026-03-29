import React from 'react';
import { LayoutDashboard, Image as ImageIcon, MessageSquare, Hexagon } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'cropper' | 'generator' | 'chat') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'cropper', label: 'Processing', icon: LayoutDashboard },
    { id: 'generator', label: 'Generator', icon: ImageIcon },
    { id: 'chat', label: 'Lumina AI', icon: MessageSquare },
  ];

  return (
    <div className="w-64 bg-[#09090b] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Hexagon size={18} className="text-white fill-current" />
        </div>
        <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">CardCrop</h1>
            <span className="text-[10px] text-indigo-400 font-medium">PRO SUITE</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4">
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 mb-2">Modules</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as any)}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
              currentView === item.id 
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] text-gray-400 font-medium">System Operational</span>
            </div>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-indigo-500"></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;