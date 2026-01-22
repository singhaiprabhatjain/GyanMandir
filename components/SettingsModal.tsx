import React, { useState, useEffect } from 'react';
import { 
  X, User, Shield, Key, Lock, MessageSquare, Bell, Database, 
  Globe, HelpCircle, ChevronRight, Smartphone, Mail, CreditCard, 
  LogOut, Moon, Sun, Image as ImageIcon, Download, Trash2, 
  SmartphoneNfc, Fingerprint, Activity, PieChart, Wifi, Check,
  ArrowLeft, Edit2, Camera, Eye, EyeOff, Mic, Video, Volume2,
  FileText, Languages, CircleHelp, Info
} from 'lucide-react';
import { NetworkDownloadSettings, UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

type SettingsCategory = 'main' | 'profile' | 'account' | 'privacy' | 'chats' | 'notifications' | 'storage' | 'help' | 'language';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userProfile }) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('main');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // --- MOCK SETTINGS STATE ---
  const [readReceipts, setReadReceipts] = useState(true);
  const [disappearingMessages, setDisappearingMessages] = useState('Off');
  const [lastSeen, setLastSeen] = useState('Nobody');
  const [theme, setTheme] = useState('Dark');
  const [wallpaper, setWallpaper] = useState('Default');
  const [enterToSend, setEnterToSend] = useState(false);
  const [mediaAutoDownload, setMediaAutoDownload] = useState({
    mobile: { photos: true, audio: false, video: false, documents: false },
    wifi: { photos: true, audio: true, video: true, documents: true },
    roaming: { photos: false, audio: false, video: false, documents: false }
  });

  // Profile Edit State
  const [displayName, setDisplayName] = useState(userProfile?.name || '');
  const [aboutText, setAboutText] = useState(userProfile?.about || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  // --- COMPONENTS ---

  const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <div 
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${checked ? 'bg-[#00a884]' : 'bg-gray-600'}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  );

  const ListItem = ({ icon: Icon, color, label, subLabel, onClick, value, danger }: any) => (
    <div 
      onClick={onClick}
      className={`flex items-center p-4 hover:bg-gray-800/50 cursor-pointer transition-colors ${danger ? 'text-red-400' : 'text-gray-200'}`}
    >
      {Icon && (
        <div className={`w-6 h-6 mr-4 flex items-center justify-center ${color || 'text-gray-400'}`}>
           <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1">
        <div className="text-[15px] font-medium">{label}</div>
        {subLabel && <div className="text-sm text-gray-500">{subLabel}</div>}
      </div>
      {value && <div className="text-sm text-gray-500 mr-2">{value}</div>}
      {!danger && <ChevronRight className="w-5 h-5 text-gray-600" />}
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-4 py-3 text-sm font-bold text-[#00a884] uppercase tracking-wider bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      {title}
    </div>
  );

  const renderMainView = () => (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-left duration-200">
      {/* Profile Header */}
      <div 
        onClick={() => setActiveCategory('profile')}
        className="p-4 flex items-center gap-4 hover:bg-gray-800/50 cursor-pointer border-b border-gray-800 transition-colors"
      >
        <div className="w-16 h-16 rounded-full overflow-hidden relative border-2 border-gray-700">
            <img src={userProfile?.avatar} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
            <h3 className="text-xl font-medium text-white">{displayName}</h3>
            <p className="text-gray-400 text-sm truncate">{aboutText}</p>
        </div>
        <div className="p-2 bg-[#00a884]/10 rounded-full">
            <SmartphoneNfc className="w-6 h-6 text-[#00a884]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ListItem icon={Key} color="text-gray-400" label="Account" subLabel="Security notifications, change number" onClick={() => setActiveCategory('account')} />
        <ListItem icon={Lock} color="text-gray-400" label="Privacy" subLabel="Block contacts, disappearing messages" onClick={() => setActiveCategory('privacy')} />
        <ListItem icon={MessageSquare} color="text-gray-400" label="Chats" subLabel="Theme, wallpapers, chat history" onClick={() => setActiveCategory('chats')} />
        <ListItem icon={Bell} color="text-gray-400" label="Notifications" subLabel="Message, group & call tones" onClick={() => setActiveCategory('notifications')} />
        <ListItem icon={Database} color="text-gray-400" label="Storage and data" subLabel="Network usage, auto-download" onClick={() => setActiveCategory('storage')} />
        <ListItem icon={Globe} color="text-gray-400" label="App Language" subLabel="English (device's language)" onClick={() => setActiveCategory('language')} />
        <ListItem icon={CircleHelp} color="text-gray-400" label="Help" subLabel="Help center, contact us, privacy policy" onClick={() => setActiveCategory('help')} />
        
        <div className="my-4 border-t border-gray-800 pt-2">
            <ListItem icon={User} color="text-gray-400" label="Invite a friend" onClick={() => {}} />
        </div>
        
        <div className="px-4 py-6 text-center">
            <div className="text-sm text-gray-500 font-medium">OmniField by GyanMandir</div>
            <div className="text-xs text-gray-600">Version 2.24.11.85</div>
        </div>
      </div>
    </div>
  );

  const renderProfileView = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 bg-[#0b141a]">
       <div className="p-6 flex flex-col items-center border-b border-gray-800">
          <div className="w-40 h-40 rounded-full overflow-hidden relative group cursor-pointer mb-4 border-4 border-[#1e293b]">
              <img src={userProfile?.avatar} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white mb-1" />
                  <span className="text-xs text-white uppercase font-bold">Change</span>
              </div>
          </div>
       </div>
       
       <div className="p-4 space-y-6">
          <div className="space-y-2">
              <label className="text-[#00a884] text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" /> Name
              </label>
              <div className="flex items-center gap-3">
                  {isEditingName ? (
                      <input 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        autoFocus
                        className="flex-1 bg-transparent border-b-2 border-[#00a884] text-white py-1 focus:outline-none"
                      />
                  ) : (
                      <div className="flex-1 text-white text-lg">{displayName}</div>
                  )}
                  <Edit2 onClick={() => setIsEditingName(true)} className="w-5 h-5 text-[#00a884] cursor-pointer" />
              </div>
              <p className="text-xs text-gray-500">This is not your username or pin. This name will be visible to your OmniField contacts.</p>
          </div>

          <div className="space-y-2">
              <label className="text-[#00a884] text-sm font-medium flex items-center gap-2">
                  <Info className="w-4 h-4" /> About
              </label>
              <div className="flex items-center gap-3">
                  {isEditingAbout ? (
                      <input 
                        value={aboutText} 
                        onChange={(e) => setAboutText(e.target.value)}
                        onBlur={() => setIsEditingAbout(false)}
                        autoFocus
                        className="flex-1 bg-transparent border-b-2 border-[#00a884] text-white py-1 focus:outline-none"
                      />
                  ) : (
                      <div className="flex-1 text-white text-lg">{aboutText}</div>
                  )}
                  <Edit2 onClick={() => setIsEditingAbout(true)} className="w-5 h-5 text-[#00a884] cursor-pointer" />
              </div>
          </div>

          <div className="space-y-2">
              <label className="text-[#00a884] text-sm font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Phone
              </label>
              <div className="text-white text-lg">+91 {userProfile?.mobile}</div>
          </div>
       </div>
    </div>
  );

  const renderAccountView = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
        <ListItem icon={Shield} label="Security notifications" onClick={() => {}} />
        <ListItem icon={Key} label="Passkeys" onClick={() => {}} />
        <ListItem icon={Mail} label="Email address" value={userProfile?.email} onClick={() => {}} />
        <ListItem icon={Lock} label="Two-step verification" onClick={() => {}} />
        <ListItem icon={Smartphone} label="Change number" onClick={() => {}} />
        <ListItem icon={FileText} label="Request account info" onClick={() => {}} />
        <div className="mt-4">
             <ListItem icon={Trash2} label="Delete account" danger onClick={() => {}} />
        </div>
    </div>
  );

  const renderPrivacyView = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 overflow-y-auto">
        <SectionHeader title="Who can see my personal info" />
        <ListItem label="Last seen and online" value={lastSeen} onClick={() => {}} />
        <ListItem label="Profile photo" value="Everyone" onClick={() => {}} />
        <ListItem label="About" value="Everyone" onClick={() => {}} />
        <ListItem label="Status" value="My contacts" onClick={() => {}} />
        
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Read receipts</div>
                <div className="text-sm text-gray-500">If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats.</div>
            </div>
            <Toggle checked={readReceipts} onChange={setReadReceipts} />
        </div>

        <SectionHeader title="Disappearing messages" />
        <ListItem label="Default message timer" value={disappearingMessages} subLabel="Start new chats with disappearing messages set to your timer" onClick={() => {}} />

        <SectionHeader title="Calls" />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Silence unknown callers</div>
                <div className="text-sm text-gray-500">Calls from unknown numbers will be silenced. They will still be shown in the Calls tab and in your notifications.</div>
            </div>
            <Toggle checked={false} onChange={() => {}} />
        </div>

        <div className="mt-4 border-t border-gray-800">
            <ListItem label="Live location" value="None" onClick={() => {}} />
            <ListItem label="Blocked contacts" value="2" onClick={() => {}} />
            <ListItem label="App lock" subLabel="Enabled immediately" onClick={() => {}} />
            <ListItem label="Chat lock" onClick={() => {}} />
        </div>
    </div>
  );

  const renderChatsView = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 overflow-y-auto">
        <SectionHeader title="Display" />
        <ListItem icon={Moon} label="Theme" value={theme} onClick={() => {}} />
        <ListItem icon={ImageIcon} label="Wallpaper" onClick={() => {}} />

        <SectionHeader title="Chat settings" />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Enter is send</div>
                <div className="text-sm text-gray-500">Enter key will send your message</div>
            </div>
            <Toggle checked={enterToSend} onChange={setEnterToSend} />
        </div>
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Media visibility</div>
                <div className="text-sm text-gray-500">Show newly downloaded media in your device's gallery</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
        </div>
        <ListItem label="Font size" value="Medium" onClick={() => {}} />

        <SectionHeader title="Archived chats" />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Keep chats archived</div>
                <div className="text-sm text-gray-500">Archived chats will remain archived when you receive a new message</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
        </div>

        <div className="mt-4 border-t border-gray-800">
            <ListItem icon={Download} label="Chat backup" onClick={() => {}} />
            <ListItem icon={Smartphone} label="Transfer chats" onClick={() => {}} />
            <ListItem icon={FileText} label="Chat history" onClick={() => {}} />
        </div>
    </div>
  );

  const renderNotificationsView = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 overflow-y-auto">
        <SectionHeader title="Messages" />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Notification tones</div>
                <div className="text-sm text-gray-500">Play sounds for incoming and outgoing messages</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
        </div>
        <ListItem label="Notification tone" value="Default (Note)" onClick={() => {}} />
        <ListItem label="Vibrate" value="Default" onClick={() => {}} />
        <ListItem label="Light" value="White" onClick={() => {}} />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">High priority notifications</div>
                <div className="text-sm text-gray-500">Show previews of notifications at the top of the screen</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
        </div>

        <SectionHeader title="Groups" />
        <ListItem label="Notification tone" value="Default (Note)" onClick={() => {}} />
        <ListItem label="Vibrate" value="Default" onClick={() => {}} />
        <ListItem label="Light" value="White" onClick={() => {}} />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">High priority notifications</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
        </div>

        <SectionHeader title="Calls" />
        <ListItem label="Ringtone" value="Default" onClick={() => {}} />
        <ListItem label="Vibrate" value="Default" onClick={() => {}} />
    </div>
  );

  const renderStorageView = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 overflow-y-auto">
        <ListItem icon={Database} label="Manage storage" value="1.2 GB used" onClick={() => {}} />
        
        <div className="p-4 py-6 border-b border-gray-800">
             <div className="w-full h-3 bg-gray-700 rounded-full flex overflow-hidden">
                 <div className="h-full bg-[#00a884] w-[30%]" />
                 <div className="h-full bg-yellow-500 w-[15%]" />
                 <div className="h-full bg-blue-500 w-[10%]" />
             </div>
             <div className="flex gap-4 mt-3 text-xs text-gray-400">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#00a884] rounded-full"/> OmniField Media</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-full"/> Apps and Other</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-700 rounded-full"/> Free</div>
             </div>
        </div>

        <ListItem icon={PieChart} label="Network usage" value="6.4 GB sent • 12.8 GB received" onClick={() => {}} />
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer">
            <div>
                <div className="text-[15px] font-medium text-gray-200">Use less data for calls</div>
            </div>
            <Toggle checked={false} onChange={() => {}} />
        </div>
        <ListItem icon={Globe} label="Proxy" value="Off" onClick={() => {}} />

        <SectionHeader title="Media auto-download" />
        <ListItem label="When using mobile data" value="Photos" onClick={() => {}} />
        <ListItem label="When connected on Wi-Fi" value="All media" onClick={() => {}} />
        <ListItem label="When roaming" value="No media" onClick={() => {}} />

        <SectionHeader title="Media upload quality" />
        <ListItem label="Photo upload quality" value="Auto" onClick={() => {}} />
    </div>
  );

  const renderContent = () => {
    switch(activeCategory) {
      case 'profile': return renderProfileView();
      case 'account': return renderAccountView();
      case 'privacy': return renderPrivacyView();
      case 'chats': return renderChatsView();
      case 'notifications': return renderNotificationsView();
      case 'storage': return renderStorageView();
      case 'help': return <div className="p-4 text-center text-gray-500">Help Center & Contact info placeholder</div>;
      case 'language': return <div className="p-4 text-center text-gray-500">Language selection placeholder</div>;
      default: return renderMainView();
    }
  };

  const getHeaderTitle = () => {
      switch(activeCategory) {
          case 'profile': return 'Profile';
          case 'account': return 'Account';
          case 'privacy': return 'Privacy';
          case 'chats': return 'Chats';
          case 'notifications': return 'Notifications';
          case 'storage': return 'Storage and data';
          case 'help': return 'Help';
          case 'language': return 'App Language';
          default: return 'Settings';
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111b21] w-full max-w-4xl h-full md:h-[85vh] md:rounded-2xl shadow-2xl border border-gray-800 overflow-hidden relative flex">
        
        {/* Sidebar (Desktop) or Main View (Mobile) */}
        <div className={`w-full md:w-[35%] border-r border-gray-800 bg-[#111b21] flex flex-col ${isMobileView && activeCategory !== 'main' ? 'hidden' : 'block'}`}>
            <div className="h-16 px-4 flex items-center bg-[#202c33] flex-shrink-0">
                <button onClick={onClose} className="md:hidden mr-4 text-gray-300">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-medium text-gray-200">Settings</h2>
                <div className="ml-auto md:block hidden">
                   <button onClick={onClose} className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                   </button>
                </div>
            </div>
            
            {/* Search Bar */}
            <div className="px-4 py-2 border-b border-gray-800">
                <div className="bg-[#202c33] rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search settings" className="bg-transparent border-none focus:outline-none text-sm text-white w-full h-8" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {renderMainView()}
            </div>
        </div>

        {/* Content Area (Desktop) or Detail View (Mobile) */}
        <div className={`flex-1 bg-[#0b141a] flex flex-col ${isMobileView && activeCategory === 'main' ? 'hidden' : 'block'}`}>
            <div className="h-16 px-4 flex items-center bg-[#202c33] border-b border-gray-800 flex-shrink-0">
                <button onClick={() => setActiveCategory('main')} className="mr-4 text-gray-300 md:hidden">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-medium text-gray-200">{getHeaderTitle()}</h2>
                {activeCategory !== 'main' && !isMobileView && (
                    <button onClick={() => setActiveCategory('main')} className="ml-auto text-gray-400 hover:text-white md:hidden">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeCategory === 'main' && !isMobileView ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-16 h-16 opacity-20 grayscale" alt="" />
                        </div>
                        <p>Select a setting to view details</p>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

// Simple Icon Import Helper
const Search = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

export default SettingsModal;