import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, Search, CheckCheck, MapPin, Lock, Hash, Users, ShieldCheck, Navigation, Megaphone, Plus, Camera, Pin, PinOff, Download, UserPlus, X, Check, ArrowLeft, Edit2, User, Briefcase, Mail, Building, ArrowRight, FileText, Image as ImageIcon, Headphones, BarChart2, Trash2, Mic, MicOff, VideoOff, PhoneOff, Volume2, SwitchCamera, ChevronDown, ClipboardList, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { ChatSession, GeoLocationData, UserProfile, Message, PollData, PollOption } from '../types';
import { generateSmartReply } from '../services/geminiService';
import GeoCameraModule from './GeoCameraModule';
import ProfileView from './ProfileView';

interface ChatModuleProps {
  chats: ChatSession[];
  setChats: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  contacts: any[];
  onAddContact: (contact: UserProfile) => void;
  onUpdateContact: (contact: UserProfile) => void;
}

const ChatModule: React.FC<ChatModuleProps> = ({ chats, setChats, contacts, onAddContact, onUpdateContact }) => {
  const [selectedChatId, setSelectedChatId] = useState<string>(chats[0]?.id || '1');
  const [inputText, setInputText] = useState('');
  const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'geo' | 'simple' | 'report'>('simple');
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null); // State for Full Screen Image Viewer
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Attachment Menu State
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan State for Image Viewer
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Call State
  const [activeCall, setActiveCall] = useState<{
    isActive: boolean;
    type: 'audio' | 'video';
    status: 'ringing' | 'connected';
    startTime: number;
    isMuted: boolean;
    isVideoEnabled: boolean;
    isSpeakerOn: boolean;
  } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Creation State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupCreationStep, setGroupCreationStep] = useState<1 | 2>(1); // 1: Name, 2: Participants
  const [isCreatingBroadcast, setIsCreatingBroadcast] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false); 
  
  // Poll Creation State
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Group/Broadcast Form State
  const [creationSubject, setCreationSubject] = useState('');
  const [creationImage, setCreationImage] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState(''); 
  
  // Renaming State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');

  // New Contact Form State
  const [newContact, setNewContact] = useState({
      firstName: '',
      lastName: '',
      mobile: '',
      email: '',
      company: '',
      title: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === selectedChatId);

  // Helper to determine if user can send messages in current group
  const canSendMessages = () => {
    if (!activeChat) return false;
    if (activeChat.type === 'group' && activeChat.groupMetadata) {
        if (activeChat.groupMetadata.settings.sendMessages === 'admins') {
            return activeChat.groupMetadata.admins.includes('user');
        }
    }
    return true; // Default for DMs, Broadcasts, and unrestricted groups
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (activeChat) {
       const lastMsg = activeChat.messages[activeChat.messages.length - 1];
       if (lastMsg && lastMsg.sender !== 'user' && !lastMsg.image && !lastMsg.audio && !lastMsg.poll) {
         const history = activeChat.messages.map(m => `${m.senderName || 'Me'}: ${m.text}`).join('\n');
         generateSmartReply(history, lastMsg.text).then(suggestion => {
            if (suggestion) setSmartSuggestion(suggestion.trim());
         });
       } else {
           setSmartSuggestion(null);
       }
    }
  }, [activeChat, chats]);

  useEffect(() => {
      setShowProfileInfo(false);
      setIsRenaming(false);
      setShowAttachmentMenu(false);
  }, [selectedChatId]);

  // Click outside to close attachment menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
              setShowAttachmentMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- ZOOM & PAN HANDLERS ---
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => {
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
  };

  const handleCloseViewer = () => {
      setViewingImage(null);
      handleResetZoom();
  };

  const onMouseDown = (e: React.MouseEvent) => {
      if (zoomLevel > 1) {
          setIsDragging(true);
          dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }
  };

  const onMouseMove = (e: React.MouseEvent) => {
      if (isDragging && zoomLevel > 1) {
          e.preventDefault();
          setPan({
              x: e.clientX - dragStartRef.current.x,
              y: e.clientY - dragStartRef.current.y
          });
      }
  };

  const onMouseUp = () => setIsDragging(false);

  // --- CALL EFFECTS ---
  useEffect(() => {
    let interval: any;
    if (activeCall?.isActive && activeCall.status === 'connected') {
        interval = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.isActive, activeCall?.status]);

  useEffect(() => {
    if (activeCall?.isActive && activeCall.status === 'ringing') {
        const timer = setTimeout(() => {
             setActiveCall(prev => prev ? ({ ...prev, status: 'connected', startTime: Date.now() }) : null);
        }, 2000); // Simulate answer after 2s
        return () => clearTimeout(timer);
    }
  }, [activeCall?.isActive, activeCall?.status]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeCall?.isActive && activeCall.type === 'video' && activeCall.isVideoEnabled) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(s => {
                stream = s;
                if (localVideoRef.current) localVideoRef.current.srcObject = s;
            })
            .catch(e => console.error("Call stream error", e));
    }
    return () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [activeCall?.isActive, activeCall?.type, activeCall?.isVideoEnabled]);

  const handleStartCall = (type: 'audio' | 'video') => {
      setActiveCall({
          isActive: true,
          type,
          status: 'ringing',
          startTime: 0,
          isMuted: false,
          isVideoEnabled: type === 'video',
          isSpeakerOn: false
      });
      setCallDuration(0);
  };

  const handleEndCall = () => {
      setActiveCall(null);
      setCallDuration(0);
  };

  const formatDuration = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSend = (text: string = inputText) => {
    if (!text.trim()) return;

    setChats(prev => prev.map(chat => {
      if (chat.id === selectedChatId) {
        return {
          ...chat,
          messages: [
            ...chat.messages,
            {
              id: Date.now().toString(),
              sender: 'user',
              text: text,
              timestamp: new Date(),
              isEncrypted: true
            }
          ],
          lastMessage: text,
          timestamp: new Date()
        };
      }
      return chat;
    }));
    setInputText('');
    setSmartSuggestion(null);
  };

  // --- ATTACHMENT HANDLERS ---

  const handleLocationShare = () => {
      setShowAttachmentMenu(false);
      if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
              const locationData: GeoLocationData = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  timestamp: position.timestamp
              };

              const newMessage: Message = {
                  id: Date.now().toString(),
                  sender: 'user',
                  text: 'Shared a location',
                  timestamp: new Date(),
                  location: locationData,
                  isEncrypted: true
              };

              setChats(prev => prev.map(chat => {
                  if (chat.id === selectedChatId) {
                      return {
                          ...chat,
                          messages: [...chat.messages, newMessage],
                          lastMessage: '📍 Location',
                          timestamp: new Date()
                      };
                  }
                  return chat;
              }));
          }, (err) => {
              alert("Unable to fetch location: " + err.message);
          });
      }
  };

  const handleFileShare = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'audio') => {
      const file = e.target.files?.[0];
      setShowAttachmentMenu(false);
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const content = reader.result as string;
              
              let displayText = '';
              if (type === 'document') displayText = `📄 ${file.name}`;
              if (type === 'audio') displayText = `🎤 Audio (${(file.size / 1024 / 1024).toFixed(1)} MB)`;

              const newMessage: Message = {
                  id: Date.now().toString(),
                  sender: 'user',
                  text: displayText,
                  timestamp: new Date(),
                  image: type === 'image' ? content : undefined,
                  audio: type === 'audio' ? content : undefined,
                  isEncrypted: true
              };
              
              setChats(prev => prev.map(chat => {
                if (chat.id === selectedChatId) {
                    return {
                        ...chat,
                        messages: [...chat.messages, newMessage],
                        lastMessage: type === 'image' ? '📷 Photo' : type === 'audio' ? '🎤 Audio' : '📄 Document',
                        timestamp: new Date()
                    };
                }
                return chat;
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  // --- POLL HANDLERS ---
  const handleAddPollOption = () => {
      setPollOptions([...pollOptions, '']);
  };

  const handlePollOptionChange = (index: number, value: string) => {
      const newOptions = [...pollOptions];
      newOptions[index] = value;
      setPollOptions(newOptions);
  };

  const handleRemovePollOption = (index: number) => {
      if (pollOptions.length > 2) {
          const newOptions = pollOptions.filter((_, i) => i !== index);
          setPollOptions(newOptions);
      }
  };

  const handleSendPoll = () => {
      const validOptions = pollOptions.filter(o => o.trim() !== '');
      if (!pollQuestion.trim() || validOptions.length < 2) return;

      const pollData: PollData = {
          question: pollQuestion,
          options: validOptions.map((opt, idx) => ({
              id: `opt-${idx}-${Date.now()}`,
              text: opt,
              votes: 0
          })),
          allowMultiple: pollAllowMultiple
      };

      const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'user',
          text: 'Poll: ' + pollQuestion,
          timestamp: new Date(),
          poll: pollData,
          isEncrypted: true
      };

      setChats(prev => prev.map(chat => {
          if (chat.id === selectedChatId) {
              return {
                  ...chat,
                  messages: [...chat.messages, newMessage],
                  lastMessage: '📊 Poll',
                  timestamp: new Date()
              };
          }
          return chat;
      }));

      setIsCreatingPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollAllowMultiple(false);
  };

  // --- NEW CONTACT HANDLER ---
  const handleSaveContact = () => {
      if (!newContact.mobile) {
          alert("Mobile number is required");
          return;
      }

      const fullName = `${newContact.firstName} ${newContact.lastName}`.trim() || newContact.mobile;
      const newId = Date.now().toString();

      // Create a profile for the new contact
      const newProfile: UserProfile = {
          name: fullName,
          mobile: newContact.mobile,
          email: newContact.email,
          about: newContact.title ? `${newContact.title} at ${newContact.company}` : 'Available',
          idProofType: 'Aadhaar', // Placeholder, user can upload later
          idProofImage: '', // Initially empty
          registeredAt: new Date(),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
      };

      // 1. Save to Device Contacts (via App prop)
      onAddContact(newProfile);

      // 2. Start Chat
      const newChatSession: ChatSession = {
          id: newId,
          name: fullName,
          lastMessage: 'Tap to start conversation',
          timestamp: new Date(),
          unread: 0,
          avatar: newProfile.avatar!,
          type: 'direct',
          isVerified: false,
          contactProfile: newProfile,
          messages: []
      };

      setChats(prev => [newChatSession, ...prev]);
      setSelectedChatId(newId);
      setIsAddingContact(false);
      setNewContact({ firstName: '', lastName: '', mobile: '', email: '', company: '', title: '' });
  };

  // --- CREATION HANDLERS (Group/Broadcast) ---

  const startBroadcastCreation = () => {
      setIsCreatingBroadcast(true);
      setSelectedParticipants([]);
      setCreationSubject('');
      setContactSearchQuery('');
  };

  const startGroupCreation = () => {
      setIsCreatingGroup(true);
      setGroupCreationStep(1); // Start at step 1: Name
      setSelectedParticipants([]);
      setCreationSubject('');
      setCreationImage(null);
      setContactSearchQuery('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setCreationImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const toggleParticipant = (id: string) => {
      setSelectedParticipants(prev => 
          prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
  };

  const finalizeCreation = () => {
      const newId = Date.now().toString();
      let newChat: ChatSession;

      if (isCreatingBroadcast) {
          if (selectedParticipants.length === 0) return;
          const recipientCount = selectedParticipants.length;
          const firstNames = contacts.filter(c => selectedParticipants.includes(c.id)).slice(0, 2).map(c => c.name).join(', ');
          const defaultName = `${recipientCount} recipients: ${firstNames}${recipientCount > 2 ? '...' : ''}`;

          newChat = {
            id: newId,
            name: defaultName,
            lastMessage: 'Tap to send a broadcast message...',
            timestamp: new Date(),
            unread: 0,
            avatar: 'https://ui-avatars.com/api/?name=Broadcast&background=E11D48&color=fff&font-size=0.33',
            type: 'broadcast',
            messages: []
          };
      } else {
          if (!creationSubject.trim()) return;
          
          // --- GROUP CREATION LOGIC WITH ADMINS ---
          const participants = ['user', ...selectedParticipants];
          
          newChat = {
              id: newId,
              name: creationSubject,
              lastMessage: 'Group created. Tap to send a message.',
              timestamp: new Date(),
              unread: 0,
              avatar: creationImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(creationSubject)}&background=00a884&color=fff`,
              type: 'group',
              groupMetadata: {
                  description: 'No description',
                  createdBy: 'user',
                  createdAt: new Date(),
                  participants: participants,
                  admins: ['user'], // Creator is admin
                  settings: {
                      editInfo: 'everyone',
                      sendMessages: 'everyone'
                  }
              },
              messages: [
                  {
                      id: 'sys1',
                      sender: 'ai',
                      text: `You created group "${creationSubject}"`,
                      timestamp: new Date(),
                      senderName: 'System'
                  }
              ]
          };
      }

      setChats(prev => [newChat, ...prev]);
      setSelectedChatId(newId);
      
      setIsCreatingGroup(false);
      setIsCreatingBroadcast(false);
      setCreationSubject('');
      setCreationImage(null);
      setSelectedParticipants([]);
      setGroupCreationStep(1);
      setContactSearchQuery('');
  };

  // --- RENAMING HANDLERS ---
  const openRenameModal = () => {
      if (!activeChat) return;
      setRenameText(activeChat.name);
      setIsRenaming(true);
  };

  const saveRename = () => {
      if (!activeChat || !renameText.trim()) return;
      
      setChats(prev => prev.map(c => 
          c.id === activeChat.id ? { ...c, name: renameText } : c
      ));
      setIsRenaming(false);
  };

  // --- UPDATE CHAT FROM PROFILE VIEW ---
  const handleChatUpdate = (updatedChat: ChatSession) => {
      setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
  };

  const handleCameraShare = (image: string, location: GeoLocationData | null, analysis: string, chatId: string, centreCode?: string) => {
    const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: analysis,
        timestamp: new Date(),
        image: image,
        location: location,
        isEncrypted: true,
        centreCode: centreCode // Store Centre Code if present
    };

    setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
            return {
                ...chat,
                messages: [...chat.messages, newMessage],
                lastMessage: centreCode ? '📋 Centre Report Submitted' : location ? '📷 Sent a GeoTag Report' : '📷 Sent a Photo',
                timestamp: new Date()
            };
        }
        return chat;
    }));
    
    setShowCamera(false);
  };

  const togglePin = (e: React.MouseEvent, chat: ChatSession) => {
      e.stopPropagation();
      const pinnedCount = chats.filter(c => c.isPinned).length;
      if (!chat.isPinned && pinnedCount >= 10) {
          alert("You can only pin up to 10 chats/groups.");
          return;
      }
      setChats(prev => prev.map(c => 
          c.id === chat.id ? { ...c, isPinned: !c.isPinned } : c
      ));
  };

  const downloadImage = (base64Data: string, filename: string) => {
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Chat categorization & Filtering
  const filteredChats = chats.filter(c => 
      c.name.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );
  
  const pinnedChats = filteredChats.filter(c => c.isPinned);
  const channels = filteredChats.filter(c => (c.type === 'channel' || c.type === 'group') && !c.isPinned);
  const dms = filteredChats.filter(c => c.type === 'direct' && !c.isPinned);
  const broadcasts = filteredChats.filter(c => c.type === 'broadcast' && !c.isPinned);

  const renderChatItem = (chat: ChatSession) => (
      <div 
          key={chat.id}
          onClick={() => setSelectedChatId(chat.id)}
          className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors relative ${selectedChatId === chat.id ? 'bg-blue-900/40 text-blue-200' : 'hover:bg-gray-800 text-gray-400'}`}
      >
          {chat.type === 'broadcast' ? (
             <div className="relative flex-shrink-0">
                 <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-white" />
                 </div>
             </div>
          ) : chat.type === 'channel' || chat.type === 'group' ? (
             <div className="relative flex-shrink-0">
                <img src={chat.avatar} alt="Group" className="w-8 h-8 rounded-full object-cover" />
             </div>
          ) : (
             <div className="relative flex-shrink-0">
                <img src={chat.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                {chat.isVerified && <div className="absolute -bottom-1 -right-1 bg-[#0f172a] rounded-full"><ShieldCheck className="w-3 h-3 text-green-500" /></div>}
             </div>
          )}

          <div className="flex-1 min-w-0">
             <div className="flex justify-between items-center">
                 <div className={`truncate font-medium ${chat.type === 'direct' ? '' : 'text-sm'}`}>{chat.name}</div>
                 {chat.isPinned && <Pin className="w-3 h-3 text-gray-500 rotate-45 ml-1 flex-shrink-0" />}
             </div>
             {chat.type === 'direct' && <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>}
          </div>

          <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-gray-900/90 p-1 rounded backdrop-blur-sm shadow-md z-10">
              <button 
                onClick={(e) => togglePin(e, chat)}
                className="hover:text-white text-gray-400 p-1"
                title={chat.isPinned ? "Unpin" : "Pin"}
              >
                  {chat.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
          </div>

          {!chat.isPinned && chat.unread > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full ml-auto">{chat.unread}</span>}
      </div>
  );

  return (
    <div className="flex h-full bg-gray-900 text-white relative">

      {/* Hidden Inputs for Attachments */}
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => handleFileShare(e, 'image')} />
      <input type="file" ref={docInputRef} accept="*/*" className="hidden" onChange={(e) => handleFileShare(e, 'document')} />
      <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={(e) => handleFileShare(e, 'audio')} />
      
      {/* --- FULL SCREEN IMAGE VIEWER (WhatsApp Style Lightbox + Zoom) --- */}
      {viewingImage && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-in fade-in duration-200 backdrop-blur-sm">
              {/* Lightbox Header */}
              <div className="h-16 flex items-center justify-between px-4 bg-black/40 z-10 backdrop-blur-md border-b border-white/10">
                  <div className="flex items-center gap-3 text-white">
                      <button onClick={handleCloseViewer} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                          <ArrowLeft className="w-6 h-6" />
                      </button>
                      <div className="flex flex-col">
                          <span className="font-medium text-sm">Media View</span>
                          <span className="text-xs text-gray-400">{activeChat?.name}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={handleZoomOut} 
                        className="p-2 hover:bg-white/10 rounded-full text-white disabled:opacity-30 disabled:hover:bg-transparent" 
                        disabled={zoomLevel <= 1}
                        title="Zoom Out"
                      >
                          <ZoomOut className="w-5 h-5" />
                      </button>
                      <span className="flex items-center text-sm font-mono text-gray-400 w-12 justify-center">
                          {Math.round(zoomLevel * 100)}%
                      </span>
                      <button 
                        onClick={handleZoomIn} 
                        className="p-2 hover:bg-white/10 rounded-full text-white disabled:opacity-30 disabled:hover:bg-transparent" 
                        disabled={zoomLevel >= 5}
                        title="Zoom In"
                      >
                          <ZoomIn className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleResetZoom} 
                        className="p-2 hover:bg-white/10 rounded-full text-white" 
                        title="Reset Zoom"
                      >
                          <RefreshCw className="w-5 h-5" /> 
                      </button>
                      
                      <div className="w-px h-6 bg-gray-700 mx-2" />
                      
                      <button 
                        onClick={() => {
                            const msg = activeChat?.messages.find(m => m.image === viewingImage);
                            const filename = msg?.centreCode ? `${msg.centreCode}.png` : `image-${Date.now()}.png`;
                            downloadImage(viewingImage, filename);
                        }} 
                        title="Download"
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                           <Download className="w-5 h-5 text-white" />
                      </button>
                  </div>
              </div>
              
              {/* Main Image Container */}
              <div 
                  className="flex-1 flex items-center justify-center p-4 overflow-hidden"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onWheel={(e) => {
                      if (e.deltaY < 0) handleZoomIn();
                      else handleZoomOut();
                  }}
                  onClick={() => {
                      // Only close if not dragging
                      if (!isDragging) {
                          // Optional: Click to close or ignore
                      }
                  }}
              >
                  <img 
                      src={viewingImage} 
                      className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-100 ease-out will-change-transform" 
                      style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                      }}
                      alt="Full screen view"
                      draggable={false}
                      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image itself
                  />
              </div>
          </div>
      )}

      {/* --- POLL CREATION MODAL --- */}
      {isCreatingPoll && (
          <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1e293b] w-full max-w-sm rounded-xl border border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a] rounded-t-xl">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2"><BarChart2 className="w-5 h-5 text-yellow-500" /> Create Poll</h2>
                      <button onClick={() => setIsCreatingPoll(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-4">
                      <div>
                          <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Question</label>
                          <input 
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              placeholder="Ask a question..."
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none"
                              autoFocus
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Options</label>
                          <div className="space-y-2">
                              {pollOptions.map((opt, idx) => (
                                  <div key={idx} className="flex gap-2">
                                      <input 
                                          value={opt}
                                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                                          placeholder={`Option ${idx + 1}`}
                                          className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-yellow-500 focus:outline-none"
                                      />
                                      {pollOptions.length > 2 && (
                                          <button onClick={() => handleRemovePollOption(idx)} className="text-gray-500 hover:text-red-400 px-1">
                                              <Trash2 className="w-5 h-5" />
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                          <button onClick={handleAddPollOption} className="mt-3 text-[#00a884] text-sm font-bold flex items-center gap-1 hover:text-[#008f6f]">
                              <Plus className="w-4 h-4" /> Add Option
                          </button>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Allow multiple answers</span>
                              <div 
                                onClick={() => setPollAllowMultiple(!pollAllowMultiple)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${pollAllowMultiple ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                              >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${pollAllowMultiple ? 'left-5.5' : 'left-0.5'}`} />
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 bg-[#0f172a] rounded-b-xl border-t border-gray-700 flex justify-end">
                      <button 
                        onClick={handleSendPoll}
                        disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                        className="bg-[#00a884] hover:bg-[#008f6f] disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-lg"
                      >
                          Send Poll
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- ADD NEW CONTACT MODAL --- */}
      {isAddingContact && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a] rounded-t-2xl">
                      <div className="flex items-center gap-3">
                          <div className="bg-blue-600/20 p-2 rounded-full">
                              <UserPlus className="w-5 h-5 text-blue-400" />
                          </div>
                          <h2 className="text-lg font-bold text-white">New Contact</h2>
                      </div>
                      <button onClick={() => setIsAddingContact(false)} className="text-gray-400 hover:text-white">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto space-y-5">
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><User className="w-3 h-3" /> First name</label>
                              <input 
                                  type="text" 
                                  placeholder="John"
                                  value={newContact.firstName}
                                  onChange={e => setNewContact({...newContact, firstName: e.target.value})}
                                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-400 uppercase">Last name</label>
                              <input 
                                  type="text" 
                                  placeholder="Doe"
                                  value={newContact.lastName}
                                  onChange={e => setNewContact({...newContact, lastName: e.target.value})}
                                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                              />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Phone className="w-3 h-3" /> Mobile Number *</label>
                          <div className="flex">
                              <span className="bg-gray-800 border border-gray-600 border-r-0 rounded-l-lg p-2.5 text-gray-400 text-sm flex items-center">+91</span>
                              <input 
                                  type="tel" 
                                  placeholder="98765 43210"
                                  value={newContact.mobile}
                                  onChange={e => setNewContact({...newContact, mobile: e.target.value})}
                                  className="w-full bg-gray-900 border border-gray-600 rounded-r-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                              />
                          </div>
                          <p className="text-[10px] text-gray-500">Contact will be saved to device securely.</p>
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                          <input 
                              type="email" 
                              placeholder="john.doe@example.com"
                              value={newContact.email}
                              onChange={e => setNewContact({...newContact, email: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Building className="w-3 h-3" /> Company</label>
                          <input 
                              type="text" 
                              placeholder="DSE India"
                              value={newContact.company}
                              onChange={e => setNewContact({...newContact, company: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Briefcase className="w-3 h-3" /> Job Title</label>
                          <input 
                              type="text" 
                              placeholder="Site Engineer"
                              value={newContact.title}
                              onChange={e => setNewContact({...newContact, title: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                          />
                      </div>

                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-[#0f172a] border-t border-gray-700 flex justify-end gap-3 rounded-b-2xl">
                      <button onClick={() => setIsAddingContact(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                      <button 
                        onClick={handleSaveContact}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                      >
                          Save & Chat
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- RENAME MODAL --- */}
      {isRenaming && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1e293b] w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-white mb-4">
                      {activeChat?.type === 'broadcast' ? 'Broadcast List Name' : 'Group Name'}
                  </h3>
                  <input 
                      type="text" 
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none mb-6"
                      autoFocus
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setIsRenaming(false)} className="text-gray-400 hover:text-white font-medium px-4 py-2">Cancel</button>
                      <button onClick={saveRename} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- GROUP / BROADCAST CREATION OVERLAY --- */}
      {(isCreatingGroup || isCreatingBroadcast) && (
        <div className="absolute inset-0 z-50 bg-[#111b21] flex flex-col animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="h-24 bg-[#202c33] flex items-end pb-3 px-4 gap-4 shadow-sm shrink-0">
                <button onClick={() => { 
                    if (isCreatingGroup && groupCreationStep === 2) {
                        setGroupCreationStep(1);
                        setContactSearchQuery('');
                    } else {
                        setIsCreatingGroup(false); 
                        setIsCreatingBroadcast(false); 
                        setContactSearchQuery('');
                    }
                }} className="mb-1 text-gray-300 hover:text-white">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-white">
                        {isCreatingBroadcast ? 'New Broadcast' : groupCreationStep === 1 ? 'New Group' : 'Add Participants'}
                    </h2>
                    <p className="text-xs text-gray-400">
                        {isCreatingBroadcast ? 'Only contacts with your number will receive messages.' : groupCreationStep === 1 ? 'Add subject and icon' : 'Select contacts to add'}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                
                {/* Step 1: Image Upload & Subject (Group Only) */}
                {isCreatingGroup && groupCreationStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-right duration-300 w-full flex flex-col items-center">
                        <div className="mb-8 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-[#00a884] transition-all">
                                {creationImage ? (
                                    <img src={creationImage} alt="Icon" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-10 h-10 text-gray-400" />
                                )}
                            </div>
                            <div className="absolute top-0 right-0 bg-[#00a884] rounded-full p-1.5 shadow-lg">
                                <Plus className="w-4 h-4 text-white" />
                            </div>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageUpload}
                            />
                        </div>

                        <div className="w-full max-w-md mb-8">
                            <div className="flex items-center border-b-2 border-[#00a884] py-2">
                                <input 
                                    type="text" 
                                    value={creationSubject}
                                    onChange={(e) => setCreationSubject(e.target.value)}
                                    placeholder="Type group subject..." 
                                    className="appearance-none bg-transparent border-none w-full text-white mr-3 py-1 px-2 leading-tight focus:outline-none text-lg"
                                    maxLength={25}
                                    autoFocus
                                />
                                <Smile className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                                <span>Provide a group subject and optional icon</span>
                                <span>{creationSubject.length}/25</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Broadcast Info */}
                {isCreatingBroadcast && (
                     <div className="w-full max-w-md mb-6 bg-[#202c33] p-4 rounded-lg flex items-center gap-4 text-sm text-gray-300">
                         <div className="bg-rose-600/20 p-2 rounded-full">
                             <Megaphone className="w-5 h-5 text-rose-500" />
                         </div>
                         <p>
                             Messages will be broadcast to selected contacts. They will appear as individual direct messages.
                         </p>
                     </div>
                )}

                {/* Step 2: Participant Selection (with Search) */}
                {((isCreatingGroup && groupCreationStep === 2) || isCreatingBroadcast) && (
                    <div className="w-full max-w-md animate-in fade-in slide-in-from-right duration-300 flex flex-col h-full max-h-[60vh]">
                        
                        {/* Search Bar */}
                        <div className="bg-[#202c33] rounded-lg px-3 py-2 flex items-center gap-2 mb-4 sticky top-0 z-10 shadow-sm">
                             <Search className="w-5 h-5 text-gray-400" />
                             <input 
                                type="text" 
                                value={contactSearchQuery} 
                                onChange={(e) => setContactSearchQuery(e.target.value)}
                                placeholder="Search name or number..."
                                className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-gray-500"
                                autoFocus
                             />
                             {contactSearchQuery && (
                                 <X className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" onClick={() => setContactSearchQuery('')} />
                             )}
                        </div>

                        <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                            {contacts.filter(c => 
                                c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || 
                                (c.mobile && c.mobile.includes(contactSearchQuery))
                            ).length === 0 ? (
                                <p className="text-center text-gray-500 py-4 text-sm">No contacts found</p>
                            ) : (
                                contacts.filter(c => 
                                    c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || 
                                    (c.mobile && c.mobile.includes(contactSearchQuery))
                                ).map(contact => (
                                    <div 
                                        key={contact.id} 
                                        onClick={() => toggleParticipant(contact.id)}
                                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedParticipants.includes(contact.id) ? 'bg-[#202c33]' : 'hover:bg-[#202c33]'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
                                            {selectedParticipants.includes(contact.id) && (
                                                <div className="absolute -bottom-1 -right-1 bg-[#00a884] rounded-full p-0.5 border-2 border-[#111b21]">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <h4 className={`text-sm font-medium truncate ${selectedParticipants.includes(contact.id) ? 'text-[#00a884]' : 'text-gray-200'}`}>{contact.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{contact.about}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-[#202c33]/50 flex justify-center animate-in slide-in-from-bottom absolute bottom-0 w-full z-10 pointer-events-none">
                {/* Next Button for Step 1 */}
                {isCreatingGroup && groupCreationStep === 1 && creationSubject.length > 0 && (
                    <button 
                        onClick={() => setGroupCreationStep(2)}
                        className="bg-[#00a884] hover:bg-[#008f6f] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 pointer-events-auto"
                    >
                        <ArrowRight className="w-8 h-8" />
                    </button>
                )}

                {/* Create Button for Step 2 */}
                {((isCreatingGroup && groupCreationStep === 2) || isCreatingBroadcast) && selectedParticipants.length > 0 && (
                    <button 
                        onClick={finalizeCreation}
                        className="bg-[#00a884] hover:bg-[#008f6f] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 pointer-events-auto"
                    >
                        <Check className="w-8 h-8" />
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Sidebar - Teams Style */}
      <div className="w-1/3 min-w-[300px] border-r border-gray-800 flex flex-col hidden md:flex bg-[#0f172a]">
        <div className="p-4 bg-[#1e293b] flex justify-between items-center shadow-md z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">
                OmniField <span className="px-2 py-0.5 bg-blue-600 text-xs rounded-full">PRO</span>
            </h2>
        </div>
        
        {/* Sidebar Search Bar */}
        <div className="px-3 pb-2 pt-2 bg-[#0f172a]"> 
            <div className="bg-[#1e293b] rounded-lg flex items-center px-3 py-2 border border-transparent focus-within:border-blue-500/50 transition-colors">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search Groups, DMs..." 
                    className="bg-transparent border-none focus:outline-none text-sm text-white w-full ml-2 placeholder-gray-500"
                />
                {chatSearchQuery && (
                    <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" onClick={() => setChatSearchQuery('')} />
                )}
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-6">
            {/* Pinned Section */}
            {pinnedChats.length > 0 && (
                <div>
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                        <Pin className="w-3 h-3" /> Pinned
                     </h3>
                     {pinnedChats.map(renderChatItem)}
                </div>
            )}

            {/* Broadcast Section */}
            <div>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                    Broadcast Lists
                    <button 
                        onClick={startBroadcastCreation} 
                        className="hover:text-white cursor-pointer hover:bg-gray-700 rounded p-1 transition-colors"
                        title="New Broadcast"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </h3>
                {broadcasts.map(renderChatItem)}
            </div>

            {/* CREATE GROUP OPTION */}
            <div className="px-2 mb-2">
                 <button 
                    onClick={startGroupCreation}
                    className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 text-blue-400 rounded-lg transition-colors border border-dashed border-gray-700 hover:border-blue-500/50 group"
                 >
                     <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                        <UserPlus className="w-4 h-4 text-blue-400" />
                     </div>
                     <span className="font-medium text-sm">Create New Group</span>
                 </button>
            </div>

            {/* Groups Section (Renamed from Teams & Channels) */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                    Groups
                    <span className="hover:text-white cursor-pointer">+</span>
                </h3>
                {channels.map(renderChatItem)}
            </div>

            {/* DMs Section */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                    Direct Messages
                    <button 
                        onClick={() => setIsAddingContact(true)}
                        className="hover:text-white cursor-pointer hover:bg-gray-700 rounded p-1 transition-colors"
                        title="New Contact"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </h3>
                {dms.map(renderChatItem)}
            </div>
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChat ? (
          <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative">
              
              {/* Overlay Camera */}
              {showCamera && (
                  <div className="absolute inset-0 z-50 bg-black animate-in fade-in zoom-in duration-200">
                      <GeoCameraModule 
                          onShare={handleCameraShare} 
                          chats={chats} 
                          targetChatId={activeChat.id} 
                          onClose={() => setShowCamera(false)}
                          mode={cameraMode}
                          initialFacingMode={cameraMode === 'simple' ? 'user' : 'environment'}
                      />
                  </div>
              )}

              {/* CALL OVERLAY (WhatsApp Style) */}
              {activeCall?.isActive && (
                  <div className="absolute inset-0 z-[100] bg-[#0b141a] flex flex-col animate-in fade-in duration-300">
                    
                    {/* Video Call View */}
                    {activeCall.type === 'video' ? (
                        <div className="flex-1 relative bg-black">
                            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            
                            {/* Top Bar Overlay */}
                            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-between">
                                <button onClick={() => {/* Minimize logic */}} className="p-2 text-white">
                                    <ChevronDown className="w-8 h-8" />
                                </button>
                                <div className="flex flex-col items-center">
                                    <h2 className="text-xl font-bold text-white shadow-black drop-shadow-md">{activeChat.name}</h2>
                                    <p className="text-sm text-gray-200 shadow-black drop-shadow-md">
                                        {activeCall.status === 'ringing' ? 'Ringing...' : formatDuration(callDuration)}
                                    </p>
                                </div>
                                <div className="w-10" /> {/* Spacer */}
                            </div>

                            {/* Center Notification (Encryption) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400/50 flex flex-col items-center gap-2">
                                <Lock className="w-4 h-4" />
                                <span className="text-xs">End-to-end encrypted</span>
                            </div>

                            {/* Bottom Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-6">
                                <button className="text-gray-300 flex items-center gap-2 text-sm font-medium animate-pulse">
                                    <ChevronDown className="w-4 h-4" /> Swipe up for more
                                </button>
                                <div className="flex items-center gap-6 bg-[#1f2c34]/80 p-3 rounded-full backdrop-blur-md border border-white/10">
                                    <button onClick={() => setActiveCall({...activeCall, isVideoEnabled: !activeCall.isVideoEnabled})} className={`p-4 rounded-full ${!activeCall.isVideoEnabled ? 'bg-white text-black' : 'bg-gray-700/50 text-white'}`}>
                                        {activeCall.isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                                    </button>
                                    <button onClick={() => setActiveCall({...activeCall, isMuted: !activeCall.isMuted})} className={`p-4 rounded-full ${activeCall.isMuted ? 'bg-white text-black' : 'bg-gray-700/50 text-white'}`}>
                                        {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                    </button>
                                    <button onClick={() => {/* Switch Cam logic */}} className="p-4 rounded-full bg-gray-700/50 text-white">
                                        <SwitchCamera className="w-6 h-6" />
                                    </button>
                                    <button onClick={handleEndCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-900/50">
                                        <PhoneOff className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Audio Call View
                        <div className="flex-1 flex flex-col bg-[#0f1c24] relative overflow-hidden">
                             {/* Header */}
                             <div className="p-4 flex items-center justify-between text-gray-400">
                                 <ChevronDown className="w-6 h-6 cursor-pointer" onClick={() => {/* Minimize logic */}} />
                                 <div className="flex items-center gap-1 text-xs">
                                     <Lock className="w-3 h-3" /> End-to-end encrypted
                                 </div>
                                 <UserPlus className="w-6 h-6" />
                             </div>

                             {/* Main Content */}
                             <div className="flex-1 flex flex-col items-center pt-10">
                                 <div className="relative mb-6">
                                     <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#1f2c34] z-10 relative">
                                        <img src={activeChat.avatar} className="w-full h-full object-cover" alt="Profile" />
                                     </div>
                                     {/* Ripple Animation */}
                                     {activeCall.status === 'ringing' && (
                                         <>
                                            <div className="absolute inset-0 rounded-full border border-gray-600 opacity-50 animate-[ping_2s_linear_infinite]" />
                                            <div className="absolute -inset-4 rounded-full border border-gray-700 opacity-30 animate-[ping_2s_linear_infinite_0.5s]" />
                                         </>
                                     )}
                                 </div>
                                 <h2 className="text-2xl font-bold text-white mb-2">{activeChat.name}</h2>
                                 <p className="text-gray-400 text-lg font-medium">
                                     {activeCall.status === 'ringing' ? 'Ringing...' : formatDuration(callDuration)}
                                 </p>
                             </div>

                             {/* Bottom Controls Sheet */}
                             <div className="bg-[#1f2c34] rounded-t-3xl p-6 pb-12 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                                 <div className="flex justify-center mb-6">
                                     <div className="w-10 h-1 bg-gray-600 rounded-full opacity-50" />
                                 </div>
                                 <div className="flex items-center justify-between px-6">
                                    <button onClick={() => setActiveCall({...activeCall, isSpeakerOn: !activeCall.isSpeakerOn})} className={`p-3 rounded-full ${activeCall.isSpeakerOn ? 'text-white bg-white/10' : 'text-gray-400'}`}>
                                        <Volume2 className="w-6 h-6" />
                                    </button>
                                    <button onClick={() => {/* Switch to Video logic */}} className="p-3 rounded-full text-gray-400">
                                        <Video className="w-6 h-6" />
                                    </button>
                                    <button onClick={() => setActiveCall({...activeCall, isMuted: !activeCall.isMuted})} className={`p-3 rounded-full ${activeCall.isMuted ? 'text-white bg-white/10' : 'text-gray-400'}`}>
                                        {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                    </button>
                                    <button onClick={handleEndCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/50 transition-colors">
                                        <PhoneOff className="w-6 h-6" />
                                    </button>
                                 </div>
                             </div>
                        </div>
                    )}
                  </div>
              )}

              {/* Profile Info Side View */}
              {showProfileInfo && (
                  <ProfileView 
                      chat={activeChat} 
                      onClose={() => setShowProfileInfo(false)}
                      onUpdateContact={onUpdateContact}
                      contacts={contacts}
                      onUpdateChat={handleChatUpdate}
                  />
              )}

              {/* Chat Header */}
              <div className="h-16 bg-[#1e293b] px-4 flex items-center justify-between border-b border-gray-700 shadow-sm z-10">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 p-1 pr-4 rounded-lg transition-colors"
                    onClick={() => setShowProfileInfo(true)}
                  >
                      <div className="md:hidden text-gray-300 cursor-pointer mr-2" onClick={(e) => { e.stopPropagation(); setSelectedChatId(''); }}>←</div>
                      
                      {activeChat.type === 'broadcast' ? (
                          <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center">
                              <Megaphone className="w-6 h-6 text-white" />
                          </div>
                      ) : (
                          <img src={activeChat.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                      )}
                      
                      <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {activeChat.name}
                            {activeChat.type === 'broadcast' && <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">BROADCAST LIST</span>}
                            {activeChat.type === 'channel' && <Users className="w-3 h-3 text-gray-400" />}
                            {activeChat.isVerified && <ShieldCheck className="w-3 h-3 text-green-500" />}
                            {activeChat.isPinned && <Pin className="w-3 h-3 text-gray-400 rotate-45" />}
                          </h3>
                          <p className="text-xs text-green-400 flex items-center gap-1">
                            {activeChat.type === 'direct' ? 'Click for info' : 'Tap for group info'}
                          </p>
                      </div>
                  </div>
                  <div className="flex gap-4 text-gray-400">
                      <button onClick={() => handleStartCall('video')} className="hover:text-white transition-colors">
                          <Video className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleStartCall('audio')} className="hover:text-white transition-colors">
                          <Phone className="w-5 h-5" />
                      </button>
                      <div className="relative group">
                          <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white" />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded shadow-xl border border-gray-700 hidden group-hover:block z-20 py-1">
                                <button 
                                    onClick={() => setShowProfileInfo(true)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-white"
                                >
                                    {activeChat.type === 'direct' ? 'View Contact' : 'Group Info'}
                                </button>
                                {activeChat.type === 'broadcast' && (
                                    <button 
                                        onClick={openRenameModal} 
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 text-white"
                                    >
                                        Change List Name
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); togglePin(e as any, activeChat); }} 
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 text-white"
                                >
                                    {activeChat.isPinned ? "Unpin Chat" : "Pin Chat"}
                                </button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-fixed bg-opacity-5 relative">
                  
                  <div className="flex justify-center mb-6">
                    <div className="bg-[#1e293b]/90 text-yellow-500 text-xs px-4 py-2 rounded-lg shadow border border-yellow-500/20 flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        Messages and calls are end-to-end encrypted. No one outside of this chat, not even OmniField, can read or listen to them.
                    </div>
                  </div>

                  {activeChat.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-1 shadow-md ${
                              msg.sender === 'user' ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-gray-100 rounded-tl-none'
                          }`}>
                              {/* Content Container */}
                              <div className="p-2">
                                  {msg.sender !== 'user' && <p className="text-xs text-blue-400 font-bold mb-1">{msg.senderName}</p>}
                                  
                                  {/* Image Attachment (GeoTag/Report) */}
                                  {msg.image && (
                                    <div 
                                      className="mb-2 rounded-lg overflow-hidden border border-white/10 relative group cursor-pointer"
                                      onClick={() => setViewingImage(msg.image!)}
                                    >
                                        <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover max-h-64" />
                                        
                                        {/* Download Overlay */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadImage(msg.image!, msg.centreCode ? `${msg.centreCode}.png` : `omnifield-image-${msg.id}.png`)
                                                }}
                                                className="bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white backdrop-blur-sm transition-colors"
                                                title={msg.centreCode ? `Download Report: ${msg.centreCode}` : "Download Image"}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 pointer-events-none">
                                            <div className="flex items-center gap-1 text-xs text-white">
                                                {msg.centreCode ? (
                                                     <div className="flex items-center gap-1 text-yellow-400 font-mono">
                                                         <ClipboardList className="w-3 h-3" />
                                                         Report: {msg.centreCode}
                                                     </div>
                                                ) : msg.location ? (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-red-400" />
                                                        Geotagged Evidence
                                                    </div>
                                                ) : (
                                                    'Photo'
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                  )}

                                  {/* Audio Attachment */}
                                  {msg.audio && (
                                      <div className="mb-2 min-w-[240px]">
                                          <audio controls src={msg.audio} className="w-full h-8" />
                                      </div>
                                  )}

                                  {/* Poll Attachment */}
                                  {msg.poll && (
                                      <div className="mb-2 bg-gray-800/50 rounded p-3 min-w-[200px]">
                                          <h4 className="font-bold text-sm mb-3 text-gray-100">{msg.poll.question}</h4>
                                          <div className="space-y-2">
                                              {msg.poll.options.map(opt => (
                                                  <div key={opt.id} className="flex items-center gap-3 p-2 rounded border border-gray-600 hover:bg-gray-700/50 cursor-pointer transition-colors">
                                                      <div className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0" />
                                                      <span className="text-sm text-gray-300">{opt.text}</span>
                                                  </div>
                                              ))}
                                          </div>
                                          <div className="mt-3 pt-2 border-t border-gray-700/50 text-xs text-center text-[#00a884] font-medium cursor-pointer">
                                              View Votes
                                          </div>
                                      </div>
                                  )}

                                  {/* Location Data Bubble / Link */}
                                  {msg.location && (
                                     <div className="mb-2 bg-gray-800/50 rounded p-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                                                <MapPin className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-blue-300">Location Data</p>
                                                <p className="text-[10px] opacity-70">±{msg.location.accuracy.toFixed(0)}m accuracy</p>
                                            </div>
                                        </div>
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${msg.location.latitude},${msg.location.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-green-600/20 hover:bg-green-600/40 text-green-400 p-2 rounded-full transition-colors"
                                            title="Track Live Location"
                                        >
                                            <Navigation className="w-4 h-4" />
                                        </a>
                                     </div>
                                  )}

                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              </div>

                              {/* Footer */}
                              <div className="flex justify-end items-center gap-1 px-2 pb-1">
                                  <span className="text-[10px] text-gray-400 opacity-80">
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                  </span>
                                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {smartSuggestion && canSendMessages() && (
                    <div className="flex justify-center my-2 sticky bottom-2 z-20">
                        <button 
                            onClick={() => handleSend(smartSuggestion)}
                            className="bg-indigo-900/90 backdrop-blur hover:bg-indigo-900 border border-indigo-500/50 text-indigo-100 text-xs py-2 px-6 rounded-full flex items-center gap-2 transition-all shadow-xl hover:shadow-indigo-500/20"
                        >
                            <span className="font-bold text-yellow-300">✨ AI Reply:</span> {smartSuggestion.length > 50 ? smartSuggestion.substring(0, 50) + '...' : smartSuggestion}
                        </button>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {canSendMessages() ? (
              <div className="p-3 bg-[#1e293b] flex items-center gap-2 relative z-40">
                  
                  {/* WhatsApp Style Attachment Menu */}
                  {showAttachmentMenu && (
                      <div ref={attachmentMenuRef} className="absolute bottom-16 left-2 bg-[#233138] p-4 rounded-xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 border border-gray-700 w-auto max-w-[320px]">
                          <div className="grid grid-cols-3 gap-6 p-2">
                              
                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => docInputRef.current?.click()}>
                                  <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Document</span>
                              </div>

                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => galleryInputRef.current?.click()}>
                                  <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <ImageIcon className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Photos</span>
                              </div>

                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { 
                                  // Determine mode based on chat type: Group/Channel -> 'geo', Direct -> 'simple'
                                  const mode = activeChat.type === 'direct' ? 'simple' : 'geo';
                                  setCameraMode(mode); 
                                  setShowCamera(true); 
                                  setShowAttachmentMenu(false); 
                              }}>
                                  <div className="w-14 h-14 rounded-full bg-rose-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <Camera className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Camera</span>
                              </div>

                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setIsAddingContact(true); setShowAttachmentMenu(false); }}>
                                  <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <User className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Contact</span>
                              </div>

                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setIsCreatingPoll(true); setShowAttachmentMenu(false); }}>
                                  <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <BarChart2 className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Poll</span>
                              </div>
                              
                              {/* GROUP SPECIFIC OPTION: SEND REPORTS */}
                              {(activeChat.type === 'group' || activeChat.type === 'channel') && (
                                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setCameraMode('report'); setShowCamera(true); setShowAttachmentMenu(false); }}>
                                      <div className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                          <ClipboardList className="w-6 h-6 text-white" />
                                      </div>
                                      <span className="text-xs text-gray-300 text-center">Send Reports</span>
                                  </div>
                              )}

                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => audioInputRef.current?.click()}>
                                  <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <Headphones className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Audio</span>
                              </div>
                              
                              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={handleLocationShare}>
                                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                      <MapPin className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs text-gray-300">Location</span>
                              </div>

                          </div>
                      </div>
                  )}

                  <Smile className="w-6 h-6 text-gray-400 cursor-pointer hover:text-white" />
                  
                  <div 
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="p-2 hover:bg-gray-700 rounded-full cursor-pointer transition-colors"
                  >
                      <Plus className={`w-6 h-6 ${showAttachmentMenu ? 'text-gray-300 transform rotate-45' : 'text-gray-400'}`} />
                  </div>

                  <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message" 
                      className="flex-1 bg-[#2a3942] text-white rounded-lg py-2 px-4 focus:outline-none placeholder-gray-400"
                  />
                  
                  {inputText.trim() ? (
                      <button onClick={() => handleSend()} className="p-2 bg-[#00a884] rounded-full text-white hover:bg-[#008f6f] transition-colors shadow-lg">
                          <Send className="w-5 h-5" />
                      </button>
                  ) : (
                      <button className="p-2 bg-[#2a3942] rounded-full text-gray-400 hover:text-white transition-colors">
                          <Mic className="w-5 h-5" />
                      </button>
                  )}

              </div>
              ) : (
                  <div className="p-4 bg-[#1e293b] text-center text-gray-400 text-sm border-t border-gray-700 flex flex-col items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Only admins can send messages in this group.
                  </div>
              )}
          </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#222e35] border-b-8 border-[#00a884] h-full text-center p-10">
            <div className="w-64 h-64 bg-gray-800 rounded-full flex items-center justify-center mb-8 opacity-50 animate-pulse">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="OmniField" className="w-32 h-32 opacity-50 grayscale" />
            </div>
            <h1 className="text-3xl font-light text-gray-200 mb-4">OmniField Connect</h1>
            <p className="text-gray-400 max-w-md leading-relaxed">
                Send and receive messages without keeping your phone online.<br/>
                Use OmniField on up to 4 linked devices and 1 phone.
            </p>
            <div className="mt-8 flex items-center gap-2 text-gray-500 text-xs">
                <Lock className="w-3 h-3" /> End-to-end encrypted
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatModule;