import React from 'react';
import { MessageSquare, Video, Settings, Shield, Lock, BookOpen } from 'lucide-react';
import { AppMode, UserProfile } from '../types';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  onOpenSettings: () => void;
  onLock: () => void;
  userProfile: UserProfile | null;
}

const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode, onOpenSettings, onLock, userProfile }) => {
  const navItems = [
    { mode: AppMode.CHAT, icon: MessageSquare, label: 'Secure Chat' },
    { mode: AppMode.MEETING, icon: Video, label: 'Trainings' },
  ];

  const handleGyanMandirClick = () => {
    if (userProfile?.email?.toLowerCase().endsWith('@dseindia.in')) {
      window.open('https://sites.google.com/dseindia.in/gyan-mandir/home', '_blank');
    } else {
      alert('Access Denied: This section is restricted to authorized @dseindia.in personnel only.');
    }
  };

  return (
    <div className="w-20 bg-gray-950 flex flex-col items-center py-6 border-r border-gray-800 z-50">
      <div className="mb-8 cursor-pointer group" onClick={onOpenSettings}>
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-6 w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setMode(item.mode)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 group relative
              ${currentMode === item.mode ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}
            `}
          >
            <item.icon className={`w-6 h-6 ${currentMode === item.mode ? 'stroke-2' : 'stroke-1.5'}`} />
            <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
            {currentMode === item.mode && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
            )}
          </button>
        ))}

        {/* Gyan Mandir Link */}
        <button
          onClick={handleGyanMandirClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 group relative text-gray-500 hover:text-yellow-400 hover:bg-gray-900"
          title="Gyan Mandir (Office Use Only)"
        >
          <BookOpen className="w-6 h-6 stroke-1.5" />
          <span className="text-[10px] font-medium text-center leading-tight">Gyan Mandir</span>
        </button>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <button 
            onClick={onLock}
            className="p-3 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded-lg transition-colors"
            title="Lock App"
        >
            <Lock className="w-6 h-6" />
        </button>
        <button 
            onClick={onOpenSettings}
            className="p-3 text-gray-500 hover:text-gray-300 hover:bg-gray-900 rounded-lg transition-colors"
        >
            <Settings className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Navigation;