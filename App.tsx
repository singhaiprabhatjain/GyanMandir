import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import ChatModule from './components/ChatModule';
import LiveMeetingModule from './components/LiveMeetingModule';
import LockScreen from './components/LockScreen';
import SettingsModal from './components/SettingsModal';
import RegistrationScreen from './components/RegistrationScreen';
import { AppMode, ChatSession, UserProfile } from './types';

// Initial Mock Contacts
const INITIAL_CONTACTS: any[] = [
    { id: 'c1', name: 'Dr. Emily Chen', avatar: 'https://picsum.photos/202/202', about: 'Seismologist', mobile: '9876543210' },
    { id: 'c2', name: 'Sarah Connor', avatar: 'https://picsum.photos/203/203', about: 'Security Lead', mobile: '9876543211' },
    { id: 'c3', name: 'Mike Ross', avatar: 'https://picsum.photos/204/204', about: 'Logistics', mobile: '9876543212' },
    { id: 'c4', name: 'Harvey Specter', avatar: 'https://picsum.photos/205/205', about: 'Legal', mobile: '9876543213' },
    { id: 'c5', name: 'Logistics Team A', avatar: 'https://ui-avatars.com/api/?name=L+A&background=random', about: 'Field Unit', mobile: '9876543214' },
    { id: 'c6', name: 'Site Engineer', avatar: 'https://ui-avatars.com/api/?name=S+E&background=random', about: 'Civil Dept', mobile: '9876543215' },
    { id: 'c7', name: 'Control Room', avatar: 'https://ui-avatars.com/api/?name=C+R&background=random', about: 'HQ', mobile: '9876543216' },
];

// Mock Initial Data
const INITIAL_CHATS: ChatSession[] = [
  {
    id: '1',
    name: 'Sector 7 Operations',
    lastMessage: 'Site inspection completed at Sector 7.',
    timestamp: new Date(),
    unread: 2,
    avatar: 'https://picsum.photos/200/200',
    type: 'group', // Changed to group to test admin features
    groupMetadata: {
        description: 'Coordination for Sector 7 field ops. Emergency contacts only.',
        createdBy: 'system',
        createdAt: new Date('2023-01-01'),
        participants: ['user', 'c2', 'c3'], // 'user' is the current user
        admins: ['user', 'c2'],
        settings: {
            editInfo: 'everyone',
            sendMessages: 'everyone'
        }
    },
    messages: [
      { id: 'm1', sender: 'colleague', text: 'Has anyone checked the north perimeter?', timestamp: new Date(Date.now() - 3600000), senderName: 'Sarah', isEncrypted: true },
      { id: 'm2', sender: 'user', text: 'I am heading there now with the GeoCamera.', timestamp: new Date(Date.now() - 3500000), isEncrypted: true },
      { id: 'm3', sender: 'colleague', text: 'Great. Make sure to log the structural integrity.', timestamp: new Date(Date.now() - 1000000), senderName: 'Mike', isEncrypted: true },
    ]
  },
  {
    id: '2',
    name: 'Logistics Support',
    lastMessage: 'Equipment delivery scheduled for 2 PM.',
    timestamp: new Date(Date.now() - 86400000),
    unread: 0,
    avatar: 'https://picsum.photos/201/201',
    type: 'channel',
    messages: [
        { id: 'm4', sender: 'colleague', text: 'We need to confirm the drop-off zone.', timestamp: new Date(), senderName: 'Logistics', isEncrypted: true }
    ]
  },
  {
    id: '3',
    name: 'Dr. Emily Chen',
    lastMessage: 'The seismic readings look stable.',
    timestamp: new Date(Date.now() - 10000000),
    unread: 0,
    avatar: 'https://picsum.photos/202/202',
    type: 'direct',
    isVerified: true,
    contactProfile: {
        name: 'Dr. Emily Chen',
        avatar: 'https://picsum.photos/202/202',
        mobile: '9876543210',
        email: 'emily.chen@dseindia.in',
        about: 'Senior Seismologist | Sector 7 Lead',
        idProofType: 'Aadhaar',
        // Placeholder for a document image
        idProofImage: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Aadhaar_Logo.svg', 
        registeredAt: new Date('2023-01-15')
    },
    messages: [
        { id: 'm5', sender: 'colleague', text: 'Sending you the updated report.', timestamp: new Date(), senderName: 'Emily', isEncrypted: true }
    ]
  }
];

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isLocked, setIsLocked] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [contacts, setContacts] = useState<any[]>(INITIAL_CONTACTS);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load Profile & Contacts from Local Storage on Mount
  useEffect(() => {
    // Load User Profile
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        parsed.registeredAt = new Date(parsed.registeredAt);
        setUserProfile(parsed);
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }

    // Load Saved Device Contacts
    const savedContacts = localStorage.getItem('device_contacts');
    if (savedContacts) {
        try {
            const parsedContacts = JSON.parse(savedContacts);
            setContacts(prev => [...prev, ...parsedContacts]);
        } catch(e) {
            console.error("Failed to load contacts", e);
        }
    }
  }, []);

  const handleRegistrationComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('user_profile', JSON.stringify(profile));
    // Automatically unlock after registration
    setIsLocked(false);
  };

  const handleAddContact = (newContact: UserProfile) => {
      // 1. Add to local state
      const contactEntry = {
          id: newContact.mobile, // Use mobile as ID for simplicity
          name: newContact.name,
          avatar: newContact.avatar,
          about: newContact.about,
          ...newContact // Store full profile details
      };
      
      setContacts(prev => {
          const updated = [...prev, contactEntry];
          return updated;
      });

      // 2. Persist to "Device Storage"
      const existingSaved = JSON.parse(localStorage.getItem('device_contacts') || '[]');
      const updatedSaved = [...existingSaved, contactEntry];
      localStorage.setItem('device_contacts', JSON.stringify(updatedSaved));
  };

  const handleUpdateContact = (updatedProfile: UserProfile) => {
      // 1. Update Contacts List
      setContacts(prev => prev.map(c => 
          (c.mobile === updatedProfile.mobile || c.name === updatedProfile.name) 
          ? { ...c, ...updatedProfile } 
          : c
      ));

      // 2. Update Active Chats containing this profile
      setChats(prev => prev.map(chat => {
          if (chat.contactProfile && (chat.contactProfile.mobile === updatedProfile.mobile)) {
              return {
                  ...chat,
                  contactProfile: { ...chat.contactProfile, ...updatedProfile }
              };
          }
          return chat;
      }));

      // 3. Update Storage
      const existingSaved = JSON.parse(localStorage.getItem('device_contacts') || '[]');
      const updatedSaved = existingSaved.map((c: any) => 
          (c.mobile === updatedProfile.mobile) ? { ...c, ...updatedProfile } : c
      );
      localStorage.setItem('device_contacts', JSON.stringify(updatedSaved));
  };

  // If no user profile exists, show registration screen first
  if (!userProfile) {
    return <RegistrationScreen onComplete={handleRegistrationComplete} />;
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-blue-500/30">
      
      {/* Security Layer */}
      {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        userProfile={userProfile}
      />

      {/* Main App Structure */}
      {!isLocked && (
        <>
          <Navigation 
            currentMode={mode} 
            setMode={setMode} 
            onOpenSettings={() => setShowSettings(true)}
            onLock={() => setIsLocked(true)}
            userProfile={userProfile}
          />

          <main className="flex-1 h-full relative overflow-hidden bg-gray-900">
            {mode === AppMode.CHAT && (
                <ChatModule 
                    chats={chats} 
                    setChats={setChats} 
                    contacts={contacts}
                    onAddContact={handleAddContact}
                    onUpdateContact={handleUpdateContact}
                />
            )}
            {mode === AppMode.MEETING && (
                <LiveMeetingModule userProfile={userProfile} />
            )}
          </main>
        </>
      )}

      {/* Global API Key Warning */}
      {!process.env.API_KEY && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[200]">
          <div className="bg-red-900/20 border border-red-500 p-8 rounded-lg max-w-md text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h2>
            <p className="text-gray-300">
              The Gemini API Key is missing. This application requires <code>process.env.API_KEY</code> to function.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;