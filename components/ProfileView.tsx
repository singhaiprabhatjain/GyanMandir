import React, { useRef, useState, useMemo } from 'react';
import { 
  X, Phone, Video, Search, Bell, Download, ShieldCheck, 
  FileText, Calendar, Clock, Lock, Upload, Edit2, Camera, 
  ChevronLeft, Image as ImageIcon, Music, Grid, List, ChevronRight,
  Users, Trash2, UserPlus, LogOut, Check, Filter, FolderArchive
} from 'lucide-react';
import JSZip from 'jszip';
import { UserProfile, ChatSession, Message, GroupMetadata } from '../types';

interface ProfileViewProps {
  chat: ChatSession;
  onClose: () => void;
  onUpdateContact?: (contact: UserProfile) => void;
  contacts?: any[];
  onUpdateChat?: (updatedChat: ChatSession) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ chat, onClose, onUpdateContact, contacts = [], onUpdateChat }) => {
  const profile = chat.contactProfile;
  const isGroup = chat.type === 'group' || chat.type === 'channel';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = 'user'; // Hardcoded for this demo

  // Gallery State
  const [showGallery, setShowGallery] = useState(false);
  const [filteredMediaMessages, setFilteredMediaMessages] = useState<Message[]>([]);
  
  // Group Media & Download State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  
  // New Download Logic State
  const [confirmDownloadType, setConfirmDownloadType] = useState<'gps' | 'report' | 'doc' | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Group Admin State
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState(chat.groupMetadata?.description || '');

  // Determine Permissions
  const isGroupAdmin = isGroup && chat.groupMetadata?.admins.includes(currentUserId);
  const canEditInfo = isGroup && (chat.groupMetadata?.settings.editInfo === 'everyone' || isGroupAdmin);

  // Helper to get participant details
  const getParticipantDetails = (id: string) => {
      if (id === currentUserId) return { name: 'You', avatar: 'https://ui-avatars.com/api/?name=You&background=random' };
      const contact = contacts.find(c => c.id === id);
      return contact || { name: 'Unknown User', avatar: 'https://ui-avatars.com/api/?name=Unknown' };
  };

  const downloadIdProof = () => {
    if (profile?.idProofImage) {
      const link = document.createElement('a');
      link.href = profile.idProofImage;
      link.download = `${profile.name || chat.name}_ID_Proof.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && profile && onUpdateContact) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const updatedProfile = {
                  ...profile,
                  idProofImage: reader.result as string,
                  idProofType: profile.idProofType || 'Aadhaar' // Default to Aadhaar if not set
              };
              onUpdateContact(updatedProfile);
          };
          reader.readAsDataURL(file);
      }
  };

  // --- MEDIA HANDLERS ---

  const handleMediaSectionClick = () => {
      if (isGroup) {
          // Initialize with current month range
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          const today = now.toISOString().split('T')[0];
          setDateRange({ start: firstDay, end: today });
          setShowDatePicker(true);
      } else {
          // For DMs, just show all
          const allMedia = chat.messages.filter(m => m.image || m.audio || m.text.startsWith('📄')).reverse();
          setFilteredMediaMessages(allMedia);
          setShowGallery(true);
      }
  };

  const handleDateConfirm = () => {
      if (!dateRange.start || !dateRange.end) return;

      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      const filtered = chat.messages.filter(m => {
          const msgDate = new Date(m.timestamp);
          const isMedia = m.image || m.audio || m.text.startsWith('📄');
          return isMedia && msgDate >= start && msgDate <= end;
      });

      setFilteredMediaMessages(filtered.reverse());
      setShowDatePicker(false);
      setShowGallery(true);
      
      // If there are files, prompt for bulk download options
      if (filtered.length > 0) {
          setShowDownloadOptions(true);
      }
  };

  const initiateDownloadSelection = (type: 'gps' | 'report' | 'doc') => {
      setConfirmDownloadType(type);
      setShowDownloadOptions(false); // Close first popup
  };

  const handleZipDownload = async () => {
      if (!confirmDownloadType) return;
      setIsZipping(true);

      const zip = new JSZip();
      let fileCount = 0;
      const nameCounters: {[key: string]: number} = {};

      // Filter based on selection and text content for accuracy
      const filesToDownload = filteredMediaMessages.filter(m => {
          if (confirmDownloadType === 'doc') {
              return m.text.startsWith('📄');
          }
          
          if (!m.image) return false;
          
          if (confirmDownloadType === 'report') {
              // Reports explicitly mention "Report" or "Report Submitted" in the text
              return m.text.startsWith("Report:") || m.text.includes("Report Submitted"); 
          } else if (confirmDownloadType === 'gps') {
              // GPS Selfies explicitly mention "GPS Selfie" or "GPS Field Evidence"
              return m.text.startsWith("GPS Selfie") || m.text.includes("GPS Field Evidence");
          }
          return false;
      });

      if (filesToDownload.length === 0) {
          alert(`No ${confirmDownloadType === 'doc' ? 'Documents' : confirmDownloadType === 'gps' ? 'GPS Selfies' : 'Reports'} found in this date range.`);
          setIsZipping(false);
          setConfirmDownloadType(null);
          return;
      }

      // Add files to ZIP
      filesToDownload.forEach((msg) => {
          if (confirmDownloadType === 'doc') {
              // For simulated docs, create a text file
              const cleanName = msg.text.replace('📄 ', '').replace(/[^a-zA-Z0-9.-]/g, '_');
              zip.file(`${cleanName}_${msg.id}.txt`, `Document Content Placeholder for: ${msg.text}\nTimestamp: ${msg.timestamp}`);
              fileCount++;
          } else if (msg.image) {
              // For images, remove base64 header
              const base64Data = msg.image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
              
              // Naming logic: Use Centre Code if available, else Message ID
              let baseName = msg.centreCode ? msg.centreCode : `IMG_${msg.id}`;
              
              // Handle duplicates
              if (nameCounters[baseName] !== undefined) {
                  nameCounters[baseName]++;
                  baseName = `${baseName}_(${nameCounters[baseName]})`;
              } else {
                  nameCounters[baseName] = 0;
              }

              const filename = `${baseName}.png`;
              zip.file(filename, base64Data, {base64: true});
              fileCount++;
          }
      });

      // Generate Filename: DateRange_Selection.zip
      let selectionName = "";
      switch(confirmDownloadType) {
          case 'gps': selectionName = "Selfies"; break;
          case 'report': selectionName = "Reports"; break;
          case 'doc': selectionName = "Docs"; break;
      }
      
      const zipFileName = `${dateRange.start}_to_${dateRange.end}_${selectionName}.zip`;

      try {
          const content = await zip.generateAsync({type: "blob"});
          const link = document.createElement("a");
          link.href = URL.createObjectURL(content);
          link.download = zipFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setConfirmDownloadType(null); // Close modal on success
      } catch (err) {
          console.error("Zip generation failed", err);
          alert("Failed to generate zip file.");
      } finally {
          setIsZipping(false);
      }
  };

  // --- GROUP ADMIN ACTIONS ---

  const updateGroupMetadata = (updates: Partial<GroupMetadata>) => {
      if (!onUpdateChat || !chat.groupMetadata) return;
      const updatedChat = {
          ...chat,
          groupMetadata: { ...chat.groupMetadata, ...updates }
      };
      onUpdateChat(updatedChat);
  };

  const handleSaveDescription = () => {
      updateGroupMetadata({ description: newDescription });
      setEditingDescription(false);
  };

  const handlePromoteAdmin = (userId: string) => {
      if (!chat.groupMetadata) return;
      const newAdmins = [...chat.groupMetadata.admins, userId];
      updateGroupMetadata({ admins: newAdmins });
  };

  const handleDismissAdmin = (userId: string) => {
      if (!chat.groupMetadata) return;
      const newAdmins = chat.groupMetadata.admins.filter(a => a !== userId);
      updateGroupMetadata({ admins: newAdmins });
  };

  const handleRemoveParticipant = (userId: string) => {
      if (!chat.groupMetadata) return;
      const newParticipants = chat.groupMetadata.participants.filter(p => p !== userId);
      const newAdmins = chat.groupMetadata.admins.filter(a => a !== userId);
      updateGroupMetadata({ participants: newParticipants, admins: newAdmins });
  };

  const handleLeaveGroup = () => {
      if (window.confirm("Exit group?")) {
          alert("Left group (Simulation)");
          onClose();
      }
  };

  const toggleSetting = (setting: 'editInfo' | 'sendMessages') => {
      if (!chat.groupMetadata) return;
      const currentVal = chat.groupMetadata.settings[setting];
      const newVal = currentVal === 'everyone' ? 'admins' : 'everyone';
      updateGroupMetadata({
          settings: { ...chat.groupMetadata.settings, [setting]: newVal }
      });
  };

  // --- SUB-VIEWS ---

  if (showGallery) {
      return (
          <div className="w-[350px] bg-[#0b141a] border-l border-gray-800 flex flex-col h-full absolute right-0 top-0 z-40 shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="h-16 bg-[#202c33] px-4 flex items-center justify-between shadow-md z-10">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setShowGallery(false)} className="text-gray-300 hover:text-white"><ChevronLeft /></button>
                      <h2 className="text-white font-medium">Filtered Media</h2>
                  </div>
                  {isGroup && (
                      <button 
                        onClick={() => setShowDownloadOptions(true)} 
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                        title="Download Options"
                      >
                          <Download className="w-4 h-4 text-white" />
                      </button>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-1">
                  {filteredMediaMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
                          <ImageIcon className="w-8 h-8 opacity-20" />
                          <p className="text-sm">No media found for this period</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-3 gap-1">
                          {filteredMediaMessages.map((msg) => (
                              <div key={msg.id} className="aspect-square relative bg-gray-900 group border border-gray-800">
                                  {msg.image ? (
                                      <>
                                        <img src={msg.image} alt="" className="w-full h-full object-cover" />
                                        {msg.centreCode && (
                                            <div className="absolute top-1 right-1 bg-yellow-500/80 text-black text-[8px] font-bold px-1 rounded">RPT</div>
                                        )}
                                        {msg.location && !msg.centreCode && (
                                            <div className="absolute top-1 right-1 bg-cyan-500/80 text-black text-[8px] font-bold px-1 rounded">GPS</div>
                                        )}
                                      </>
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-800/30">
                                          <FileText className="w-6 h-6 text-gray-400" />
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* POPUP 1: DOWNLOAD TYPE SELECTION */}
              {showDownloadOptions && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                  <Download className="w-5 h-5 text-[#00a884]" /> Download
                              </h3>
                              <button onClick={() => setShowDownloadOptions(false)} className="text-gray-400 hover:text-white">
                                  <X className="w-5 h-5" />
                              </button>
                          </div>
                          <p className="text-xs text-gray-400 mb-4">Select file type to download for {dateRange.start} to {dateRange.end}.</p>
                          
                          <div className="space-y-3">
                              <button 
                                onClick={() => initiateDownloadSelection('gps')}
                                className="w-full bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-700/50 p-3 rounded-lg flex items-center gap-3 transition-colors group"
                              >
                                  <div className="bg-cyan-500/20 p-2 rounded-full">
                                      <Camera className="w-5 h-5 text-cyan-400" />
                                  </div>
                                  <div className="text-left">
                                      <div className="text-sm font-bold text-cyan-100">GPS Selfies</div>
                                      <div className="text-[10px] text-cyan-400/70">Includes Location Overlay</div>
                                  </div>
                              </button>

                              <button 
                                onClick={() => initiateDownloadSelection('report')}
                                className="w-full bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-700/50 p-3 rounded-lg flex items-center gap-3 transition-colors group"
                              >
                                  <div className="bg-yellow-500/20 p-2 rounded-full">
                                      <FileText className="w-5 h-5 text-yellow-400" />
                                  </div>
                                  <div className="text-left">
                                      <div className="text-sm font-bold text-yellow-100">Reports</div>
                                      <div className="text-[10px] text-yellow-400/70">Clean (No Location Data)</div>
                                  </div>
                              </button>

                              <button 
                                onClick={() => initiateDownloadSelection('doc')}
                                className="w-full bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/50 p-3 rounded-lg flex items-center gap-3 transition-colors group"
                              >
                                  <div className="bg-indigo-500/20 p-2 rounded-full">
                                      <FolderArchive className="w-5 h-5 text-indigo-400" />
                                  </div>
                                  <div className="text-left">
                                      <div className="text-sm font-bold text-indigo-100">Docs</div>
                                      <div className="text-[10px] text-indigo-400/70">PDFs, Word, Text files</div>
                                  </div>
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* POPUP 2: CONFIRMATION & ZIP ACTION */}
              {confirmDownloadType && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-bold text-white">Confirm Download</h3>
                              {!isZipping && (
                                  <button onClick={() => setConfirmDownloadType(null)} className="text-gray-400 hover:text-white">
                                      <X className="w-5 h-5" />
                                  </button>
                              )}
                          </div>
                          
                          <div className="bg-gray-800/50 p-4 rounded-lg mb-6 border border-gray-700">
                              <p className="text-sm text-gray-300">
                                  You are about to download all <span className="text-[#00a884] font-bold">{confirmDownloadType === 'gps' ? 'GPS Selfies' : confirmDownloadType === 'report' ? 'Reports' : 'Documents'}</span> from selected range.
                              </p>
                              <div className="mt-3 text-xs text-gray-500 font-mono bg-black/40 p-2 rounded break-all">
                                  {dateRange.start}_to_{dateRange.end}_{confirmDownloadType === 'gps' ? 'Selfies' : confirmDownloadType === 'report' ? 'Reports' : 'Docs'}.zip
                              </div>
                          </div>

                          <div className="flex gap-3">
                              <button 
                                onClick={() => setConfirmDownloadType(null)}
                                disabled={isZipping}
                                className="flex-1 py-2 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                              >
                                  Cancel
                              </button>
                              <button 
                                onClick={handleZipDownload}
                                disabled={isZipping}
                                className="flex-1 py-2 rounded-lg font-bold bg-[#00a884] hover:bg-[#008f6f] text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  {isZipping ? 'Zipping...' : 'OK'}
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )
  }

  if (showGroupSettings && isGroupAdmin && chat.groupMetadata) {
      return (
          <div className="w-[350px] bg-[#0b141a] border-l border-gray-800 flex flex-col h-full animate-in slide-in-from-right duration-200 absolute right-0 top-0 z-40 shadow-2xl">
              <div className="h-16 bg-[#202c33] px-4 flex items-center gap-3 shadow-md">
                  <button onClick={() => setShowGroupSettings(false)} className="text-gray-300 hover:text-white"><ChevronLeft /></button>
                  <h2 className="text-white font-medium">Group Settings</h2>
              </div>
              
              <div className="p-4 space-y-6">
                  <div className="space-y-1">
                      <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSetting('editInfo')}>
                          <div>
                              <div className="text-white font-medium">Edit group info</div>
                              <div className="text-xs text-gray-500">Choose who can change this group's subject, icon and description.</div>
                          </div>
                      </div>
                      <div className="text-[#00a884] text-sm font-medium mt-1">
                          {chat.groupMetadata.settings.editInfo === 'everyone' ? 'All participants' : 'Only admins'}
                      </div>
                  </div>

                  <div className="h-px bg-gray-800" />

                  <div className="space-y-1">
                      <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSetting('sendMessages')}>
                          <div>
                              <div className="text-white font-medium">Send messages</div>
                              <div className="text-xs text-gray-500">Choose who can send messages to this group.</div>
                          </div>
                      </div>
                      <div className="text-[#00a884] text-sm font-medium mt-1">
                          {chat.groupMetadata.settings.sendMessages === 'everyone' ? 'All participants' : 'Only admins'}
                      </div>
                  </div>

                  <div className="h-px bg-gray-800" />

                  <div className="space-y-1 opacity-50 cursor-not-allowed">
                       <div className="text-white font-medium">Edit group admins</div>
                       <div className="text-xs text-gray-500">Edit in participant list</div>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN PROFILE VIEW ---
  return (
    <div className="w-[350px] bg-[#111b21] border-l border-gray-800 flex flex-col h-full animate-in slide-in-from-right duration-300 absolute right-0 top-0 z-30 shadow-2xl">
      
      {/* DATE PICKER MODAL (Global for ProfileView) */}
      {showDatePicker && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-[#1e293b] w-full max-w-[300px] rounded-xl border border-gray-700 shadow-2xl p-5">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#00a884]" /> Select Date Range
                      </h3>
                      <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs text-gray-400 uppercase font-bold">Start Date</label>
                          <input 
                              type="date" 
                              value={dateRange.start}
                              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                              className="w-full bg-[#0b141a] border border-gray-600 rounded p-2 text-white text-sm focus:border-[#00a884] outline-none"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs text-gray-400 uppercase font-bold">End Date</label>
                          <input 
                              type="date" 
                              value={dateRange.end}
                              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                              className="w-full bg-[#0b141a] border border-gray-600 rounded p-2 text-white text-sm focus:border-[#00a884] outline-none"
                          />
                      </div>
                      <button 
                          onClick={handleDateConfirm}
                          disabled={!dateRange.start || !dateRange.end}
                          className="w-full bg-[#00a884] hover:bg-[#008f6f] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold shadow-lg mt-2"
                      >
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4">
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-medium text-lg">{isGroup ? 'Group Info' : 'Contact Info'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Pic Section */}
        <div className="bg-[#111b21] pb-6 pt-8 flex flex-col items-center border-b border-gray-900">
          <div className="w-40 h-40 rounded-full overflow-hidden mb-4 relative group cursor-pointer">
            <img 
              src={profile?.avatar || chat.avatar} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            />
            {!isGroup && profile?.idProofImage && (
               <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-1 flex justify-center items-center gap-1">
                 <ShieldCheck className="w-3 h-3 text-green-500" /> KYC Verified
               </div>
            )}
             {canEditInfo && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white mb-1" />
                    <span className="text-xs text-white uppercase font-bold">Change</span>
                </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-normal text-gray-100">{profile?.name || chat.name}</h2>
              {canEditInfo && <Edit2 className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white" />}
          </div>
          <p className="text-gray-500 text-lg">
              {profile?.mobile ? `+91 ${profile.mobile}` : isGroup && chat.groupMetadata ? `Group · ${chat.groupMetadata.participants.length} participants` : ''}
          </p>
        </div>

        {/* Description Section (Group) or About (Direct) */}
        <div className="bg-[#111b21] p-4 border-b border-gray-900">
            {isGroup && chat.groupMetadata ? (
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[#00a884] text-sm font-medium">Description</h3>
                        {canEditInfo && !editingDescription && (
                            <Edit2 className="w-4 h-4 text-gray-500 cursor-pointer" onClick={() => { setNewDescription(chat.groupMetadata!.description); setEditingDescription(true); }} />
                        )}
                    </div>
                    {editingDescription ? (
                        <div className="flex flex-col gap-2">
                            <textarea 
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="w-full bg-[#202c33] text-white p-2 rounded text-sm focus:outline-none"
                                rows={3}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingDescription(false)} className="text-gray-400 text-sm">Cancel</button>
                                <button onClick={handleSaveDescription} className="text-[#00a884] text-sm font-medium">Save</button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-300 text-sm">{chat.groupMetadata.description || "Add group description"}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                        Created by {getParticipantDetails(chat.groupMetadata.createdBy).name}, {new Date(chat.groupMetadata.createdAt).toLocaleDateString()}
                    </p>
                </div>
            ) : (
                <>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">About</h3>
                  <p className="text-gray-300">{profile?.about || "Available"}</p>
                </>
            )}
        </div>

        {/* Media Section */}
        <div className="bg-[#111b21] border-b border-gray-900">
           <div 
             onClick={handleMediaSectionClick}
             className="p-4 flex justify-between items-center cursor-pointer hover:bg-[#202c33] transition-colors"
           >
               <span className="text-gray-400 font-medium text-sm">Media, links, and docs</span>
               <div className="flex items-center gap-1 text-gray-500 text-xs">
                   <span>{chat.messages.filter(m => m.image || m.audio || m.text.startsWith('📄')).length}</span>
                   <ChevronRight className="w-4 h-4" />
               </div>
           </div>
        </div>

        {/* Group Settings & Participants */}
        {isGroup && chat.groupMetadata && (
            <>
                {/* Admin Settings Entry */}
                {isGroupAdmin && (
                    <div 
                        onClick={() => setShowGroupSettings(true)}
                        className="p-4 flex items-center gap-4 hover:bg-[#202c33] cursor-pointer border-b border-gray-900"
                    >
                         <div className="w-10 h-10 bg-[#202c33] rounded-full flex items-center justify-center">
                             <Lock className="w-5 h-5 text-[#00a884]" />
                         </div>
                         <div className="text-white text-sm font-medium">Group Settings</div>
                    </div>
                )}

                {/* Participant List */}
                <div className="bg-[#111b21] pt-4 border-b border-gray-900">
                     <div className="px-4 pb-2 text-sm text-gray-500 font-medium flex justify-between items-center">
                         <span>{chat.groupMetadata.participants.length} participants</span>
                         <Search className="w-4 h-4" />
                     </div>

                     {/* Add Participant Button (Admins only) */}
                     {isGroupAdmin && (
                         <div className="px-4 py-3 flex items-center gap-3 hover:bg-[#202c33] cursor-pointer">
                             <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
                                 <UserPlus className="w-5 h-5 text-white" />
                             </div>
                             <div className="text-white text-sm font-medium">Add participants</div>
                         </div>
                     )}

                     {chat.groupMetadata.participants.map(pid => {
                         const pDetails = getParticipantDetails(pid);
                         const isAdmin = chat.groupMetadata?.admins.includes(pid);
                         const isSelf = pid === currentUserId;

                         return (
                             <div key={pid} className="px-4 py-3 flex items-center justify-between hover:bg-[#202c33] group cursor-pointer relative">
                                 <div className="flex items-center gap-3 overflow-hidden">
                                     <img src={pDetails.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
                                     <div className="min-w-0">
                                         <div className="flex items-center gap-2">
                                             <span className="text-white text-sm font-medium truncate">{pDetails.name}</span>
                                             {isAdmin && (
                                                 <span className="text-[10px] border border-[#00a884] text-[#00a884] px-1 rounded">Group Admin</span>
                                             )}
                                         </div>
                                         <div className="text-xs text-gray-500 truncate">{pDetails.about || "Hey there! I am using OmniField."}</div>
                                     </div>
                                 </div>

                                 {/* Context Menu for Admins (simplified as buttons for hover) */}
                                 {isGroupAdmin && !isSelf && (
                                     <div className="hidden group-hover:flex items-center gap-1 bg-[#202c33] shadow-lg rounded">
                                         {isAdmin ? (
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handleDismissAdmin(pid); }}
                                                className="text-[10px] bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
                                             >
                                                Dismiss
                                             </button>
                                         ) : (
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handlePromoteAdmin(pid); }}
                                                className="text-[10px] bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
                                             >
                                                Make Admin
                                             </button>
                                         )}
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveParticipant(pid); }}
                                            className="p-1 text-red-400 hover:bg-gray-700 rounded"
                                         >
                                             <X className="w-4 h-4" />
                                         </button>
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                </div>

                <div className="p-4" onClick={handleLeaveGroup}>
                    <div className="flex items-center gap-3 text-red-400 cursor-pointer hover:text-red-300">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm">Exit group</span>
                    </div>
                </div>
            </>
        )}

        {/* ID Proof Section (Direct Only) */}
        {!isGroup && profile && (
            <div className="bg-[#111b21] p-4 border-b border-gray-900">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Identity Proof
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${profile.idProofImage ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-gray-700 text-gray-400'}`}>
                        {profile.idProofImage ? profile.idProofType : 'Missing'}
                    </span>
                </div>
                {profile.idProofImage ? (
                    <div className="bg-[#202c33] rounded-lg p-3 group relative overflow-hidden">
                        <img src={profile.idProofImage} alt="ID" className="w-full h-32 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                            <button onClick={downloadIdProof} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg hover:bg-green-500">
                                <Download className="w-3 h-3" /> Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#202c33] border border-dashed border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center"><Camera className="w-6 h-6 text-gray-400" /></div>
                        <p className="text-sm text-gray-400">No ID Proof</p>
                    </div>
                )}
            </div>
        )}

        {/* Security Info */}
        <div className="bg-[#111b21] p-4 border-b border-gray-900 flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-500" />
            <div>
                <h3 className="text-gray-300 text-sm">Encryption</h3>
                <p className="text-gray-500 text-xs">Messages and calls are end-to-end encrypted.</p>
            </div>
        </div>

        {/* Block / Report (Direct Only) */}
        {!isGroup && (
            <div className="bg-[#111b21] p-4 space-y-4 mb-10">
                <div className="flex items-center gap-3 text-red-400 cursor-pointer hover:text-red-300">
                    <span className="w-5 h-5 flex items-center justify-center">🚫</span>
                    <span className="font-medium">Block {profile?.name || chat.name}</span>
                </div>
                <div className="flex items-center gap-3 text-red-400 cursor-pointer hover:text-red-300">
                    <span className="w-5 h-5 flex items-center justify-center">👎</span>
                    <span className="font-medium">Report {profile?.name || chat.name}</span>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ProfileView;