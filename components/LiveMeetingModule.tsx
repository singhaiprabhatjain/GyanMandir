import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, PhoneOff, Users, MessageSquare, MoreVertical, 
  Video, VideoOff, Hand, MonitorUp, Captions, Info, 
  Settings, X, Sparkles, User, MonitorOff, Copy, Edit2, Smile, 
  LayoutGrid, Square, Columns, Check, FileSpreadsheet, Download,
  Circle, StopCircle, FileText, Loader2
} from 'lucide-react';
import { LiveMeetingService, generateMeetingMinutes } from '../services/geminiService';
import { UserProfile } from '../types';

interface LiveMeetingModuleProps {
    userProfile?: UserProfile | null;
}

const LiveMeetingModule: React.FC<LiveMeetingModuleProps> = ({ userProfile }) => {
  // Session State
  const [isJoined, setIsJoined] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [displayName, setDisplayName] = useState(userProfile?.name || "You");
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Media State
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  
  // UI State
  const [handRaised, setHandRaised] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [sidebarView, setSidebarView] = useState<'none' | 'people' | 'chat' | 'info'>('none');
  const [transcriptions, setTranscriptions] = useState<{text: string, isUser: boolean, timestamp: string}[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // New UI Features
  const [showReactions, setShowReactions] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{id: number, emoji: string}[]>([]);
  const [layout, setLayout] = useState<'auto' | 'spotlight' | 'sidebar'>('auto');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  
  // MoM State
  const [isGeneratingMoM, setIsGeneratingMoM] = useState(false);

  // Refs
  const liveService = useRef<LiveMeetingService | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Service
  useEffect(() => {
    liveService.current = new LiveMeetingService();
    return () => {
      liveService.current?.stopSession();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
      if (recordingStreamRef.current) recordingStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Handle Local Camera Stream
  useEffect(() => {
    const setupCamera = async () => {
      if (cameraOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (e) {
          console.error("Camera error", e);
          setCameraOn(false);
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
    };
    setupCamera();
  }, [cameraOn, isJoined]);

  // Handle Mute Sync with Service
  useEffect(() => {
      liveService.current?.setMuted(!micOn);
  }, [micOn]);

  const toggleScreenShare = async () => {
    if (screenShareOn) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setScreenShareOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream;
        }
        setScreenShareOn(true);
        stream.getVideoTracks()[0].onended = () => {
            setScreenShareOn(false);
        };
      } catch (e) {
        console.error("Screen share error", e);
      }
    }
  };

  const handleJoin = async () => {
    setIsJoined(true);
    await liveService.current?.startSession(
      (text, isUser) => {
          setTranscriptions(prev => [...prev, {
              text, 
              isUser, 
              timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }]);
      },
      (statusMsg) => setStatus(statusMsg)
    );
  };

  const handleLeave = async () => {
    if (isRecording) {
      stopRecording();
    }
    await liveService.current?.stopSession();
    setIsJoined(false);
    setTranscriptions([]);
    setScreenShareOn(false);
  };

  const triggerReaction = (emoji: string) => {
      const id = Date.now();
      setActiveReactions(prev => [...prev, { id, emoji }]);
      setShowReactions(false);
      setTimeout(() => {
          setActiveReactions(prev => prev.filter(r => r.id !== id));
      }, 2000);
  };

  // --- RECORDING FUNCTIONS ---
  const startRecording = async () => {
    try {
      // 1. Capture the screen (visuals + system audio/AI voice)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { width: 1920, height: 1080 },
        audio: true // Crucial: Captures system audio (the AI)
      });

      // 2. Capture the microphone (User voice)
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });

      // 3. Mix audio streams
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      if (displayStream.getAudioTracks().length > 0) {
        const sysSource = audioContext.createMediaStreamSource(displayStream);
        sysSource.connect(dest);
      }
      
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(dest);

      // 4. Combine Video + Mixed Audio
      const combinedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      recordingStreamRef.current = combinedStream;

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `OmniField_Training_Recording_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        // Cleanup tracks
        combinedStream.getTracks().forEach(track => track.stop());
        displayStream.getTracks().forEach(track => track.stop());
        micStream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };

      // Handle user stopping screen share via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      recorder.start();
      setIsRecording(true);
      setShowLayoutMenu(false); // Close menu
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Failed to start recording. Please ensure you grant screen recording permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- MOM GENERATION ---
  const handleDownloadMoM = async () => {
    if (transcriptions.length === 0) {
        alert("No conversation data available to generate minutes.");
        return;
    }
    
    setIsGeneratingMoM(true);

    // Format transcript for AI
    const transcriptText = transcriptions.map(t => 
        `[${t.timestamp}] ${t.isUser ? displayName : 'Gemini Assistant'}: ${t.text}`
    ).join('\n');

    // Get AI Summary
    const aiSummary = await generateMeetingMinutes(transcriptText);

    // Combine into final document
    const finalContent = `OMNIFIELD MEETING REPORT
Date: ${new Date().toLocaleDateString()}
Meeting: Sector 7 Logistics Training
Generated by: OmniField AI

================================================================
${aiSummary}

================================================================
COMPLETE TRANSCRIPT LOG
================================================================
${transcriptText}
`;

    // Download
    const blob = new Blob([finalContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniField_MoM_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setIsGeneratingMoM(false);
    setShowLayoutMenu(false);
  };

  const downloadAttendance = () => {
    const participants = [
        { 
            name: displayName, 
            role: 'Host', 
            email: userProfile?.email || 'user@dseindia.in', 
            joinTime: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString() 
        },
        { 
            name: 'Gemini Assistant', 
            role: 'AI Facilitator', 
            email: 'system@omnifield.ai', 
            joinTime: new Date(Date.now() - 1000 * 60 * 14).toLocaleTimeString()
        },
        { name: 'Dr. Emily Chen', role: 'Participant', email: 'emily.chen@dseindia.in', joinTime: '10:02 AM' },
        { name: 'Sarah Connor', role: 'Security', email: 'sarah.c@dseindia.in', joinTime: '10:05 AM' },
        { name: 'Mike Ross', role: 'Logistics', email: 'mike.r@dseindia.in', joinTime: '10:08 AM' }
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
        + "Participant Name,Email,Role,Join Time,Status\n"
        + participants.map(e => `${e.name},${e.email},${e.role},${e.joinTime},Present`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OmniField_Attendance_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // --- PRE-JOIN SCREEN ---
  if (!isJoined) {
    return (
      <div className="h-full flex flex-col bg-[#202124] text-white overflow-hidden font-sans">
        <div className="h-16 flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
                <Video className="w-6 h-6 text-blue-400" />
                <span className="text-xl font-medium text-gray-200 tracking-tight">OmniField Trainings</span>
            </div>
            <div className="flex items-center gap-4 text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                    {userProfile?.name?.charAt(0) || 'U'}
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-8">
            <div className="flex flex-col items-center gap-4 max-w-2xl w-full">
                 <div className="relative w-full aspect-video bg-[#3c4043] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group">
                     {cameraOn ? (
                         <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                     ) : (
                         <div className="text-gray-400 flex flex-col items-center gap-2">
                             <div className="p-4 bg-gray-700 rounded-full"><VideoOff className="w-8 h-8" /></div>
                             <span>Camera is off</span>
                         </div>
                     )}
                     
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                         <button 
                            onClick={() => setMicOn(!micOn)}
                            className={`p-4 rounded-full border transition-all ${micOn ? 'bg-[#3c4043] border-gray-500 hover:bg-[#45484c]' : 'bg-red-600 border-transparent hover:bg-red-700'}`}
                         >
                             {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                         </button>
                         <button 
                            onClick={() => setCameraOn(!cameraOn)}
                            className={`p-4 rounded-full border transition-all ${cameraOn ? 'bg-[#3c4043] border-gray-500 hover:bg-[#45484c]' : 'bg-red-600 border-transparent hover:bg-red-700'}`}
                         >
                             {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                         </button>
                     </div>
                     
                     {/* Mic Indicator */}
                     <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-full backdrop-blur-sm">
                         <div className="flex gap-1 items-end h-4">
                             <div className={`w-1 bg-blue-400 rounded-sm transition-all duration-100 ${micOn ? 'h-3 animate-pulse' : 'h-1'}`} />
                             <div className={`w-1 bg-blue-400 rounded-sm transition-all duration-100 ${micOn ? 'h-4 animate-pulse delay-75' : 'h-1'}`} />
                             <div className={`w-1 bg-blue-400 rounded-sm transition-all duration-100 ${micOn ? 'h-2 animate-pulse delay-150' : 'h-1'}`} />
                         </div>
                     </div>
                 </div>
                 
                 {/* Display Name Edit */}
                 <div className="flex items-center gap-2 text-lg text-gray-200">
                     {isEditingName ? (
                         <div className="flex items-center gap-2 bg-[#303134] rounded px-2 py-1">
                             <input 
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-40"
                                autoFocus
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                             />
                             <Check className="w-4 h-4 text-green-400 cursor-pointer" onClick={() => setIsEditingName(false)} />
                         </div>
                     ) : (
                         <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                             <span>{displayName}</span>
                             <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                         </div>
                     )}
                 </div>
            </div>

            <div className="flex flex-col items-center md:items-start gap-8 max-w-md">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-normal mb-2">Ready to join?</h1>
                    <p className="text-gray-400">No one else is here</p>
                </div>
                
                <div className="flex flex-col gap-4 w-full">
                    <button 
                        onClick={handleJoin}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-colors w-full md:w-auto shadow-lg shadow-blue-900/20"
                    >
                        Join now
                    </button>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <button className="bg-[#303134] hover:bg-[#3c4043] text-blue-300 px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 text-sm">
                            <MonitorUp className="w-5 h-5" /> Present
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- IN-MEETING SCREEN ---
  return (
    <div className="h-full flex flex-col bg-[#202124] text-white relative font-sans">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-10 pointer-events-none">
           {/* Left: Meeting Code + Recording Status */}
           <div className="flex items-center gap-3">
               <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-b-lg flex items-center gap-3 shadow-lg">
                   <span className="font-medium text-white tracking-wide">train-sec7-logistics</span>
                   <div className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`} />
               </div>
               
               {isRecording && (
                   <div className="pointer-events-auto bg-red-600/20 border border-red-500/50 backdrop-blur-md px-3 py-1.5 rounded-md flex items-center gap-2 shadow-lg animate-pulse">
                       <div className="w-2 h-2 bg-red-500 rounded-full" />
                       <span className="text-xs font-bold text-red-100 tracking-wider">REC</span>
                   </div>
               )}
           </div>

           {/* Layout / View Controls */}
           <div className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-lg shadow-lg">
               <button 
                 onClick={() => setSidebarView(sidebarView === 'people' ? 'none' : 'people')}
                 className={`p-2 rounded hover:bg-gray-700 transition-colors ${sidebarView === 'people' ? 'text-blue-300 bg-blue-900/30' : 'text-gray-300'}`}
               >
                  <Users className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setSidebarView(sidebarView === 'chat' ? 'none' : 'chat')}
                 className={`p-2 rounded hover:bg-gray-700 transition-colors ${sidebarView === 'chat' ? 'text-blue-300 bg-blue-900/30' : 'text-gray-300'}`}
               >
                  <MessageSquare className="w-5 h-5" />
               </button>
           </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Video Grid */}
        <div className={`flex-1 p-4 transition-all duration-300 flex items-center justify-center ${sidebarView !== 'none' ? 'pr-[380px]' : ''}`}>
             <div className={`
                 w-full h-full max-h-[85vh] transition-all duration-500
                 ${layout === 'auto' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}
                 ${layout === 'spotlight' ? 'flex items-center justify-center' : ''}
                 ${layout === 'sidebar' ? 'flex gap-4' : ''}
             `}>
                 
                 {/* AI Participant */}
                 <div className={`
                     bg-[#3c4043] rounded-xl overflow-hidden relative flex items-center justify-center shadow-lg group border border-transparent hover:border-gray-600 transition-all
                     ${layout === 'spotlight' ? 'w-full h-full max-w-5xl aspect-video' : ''}
                     ${layout === 'sidebar' ? 'flex-1 h-full' : ''}
                 `}>
                     <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                         <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse">
                                <Sparkles className="w-12 h-12 text-blue-400" />
                            </div>
                            {/* Visualizer */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite]" style={{height: '100%', animationDelay: `${i * 0.1}s`}} />
                                ))}
                            </div>
                         </div>
                     </div>
                     
                     <div className="absolute bottom-4 left-4 font-medium text-sm flex items-center gap-2 text-white drop-shadow-md">
                         <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] shadow-sm">AI</div>
                         Gemini Assistant
                     </div>
                     <div className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                         <MoreVertical className="w-4 h-4 text-white" />
                     </div>
                 </div>

                 {/* Screen Share */}
                 {screenShareOn && (
                     <div className={`bg-[#202124] rounded-xl overflow-hidden relative shadow-lg border border-gray-700 ${layout === 'auto' ? 'md:col-span-2 row-span-2' : 'w-full h-full'}`}>
                         <video ref={screenShareRef} autoPlay playsInline className="w-full h-full object-contain" />
                         <div className="absolute bottom-4 left-4 font-medium text-sm flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full">
                             <MonitorUp className="w-4 h-4 text-blue-400" />
                             You are presenting
                         </div>
                     </div>
                 )}

                 {/* User Self View */}
                 <div className={`
                     bg-[#3c4043] rounded-xl overflow-hidden relative shadow-lg group border border-transparent hover:border-gray-600 transition-all
                     ${layout === 'spotlight' ? 'absolute bottom-8 right-8 w-64 h-36 shadow-2xl border-2 border-gray-700 z-20' : ''}
                     ${layout === 'sidebar' ? 'w-64 h-36' : ''}
                 `}>
                     {cameraOn ? (
                         <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-800">
                             <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-medium text-white shadow-lg">
                                 {displayName.charAt(0)}
                             </div>
                         </div>
                     )}
                     
                     <div className="absolute bottom-3 left-3 font-medium text-sm text-white drop-shadow-md flex items-center gap-2">
                         {displayName} {isJoined && "(You)"}
                     </div>

                     <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {!micOn && <div className="p-1.5 bg-red-600/90 rounded-full shadow-sm"><MicOff className="w-3 h-3 text-white" /></div>}
                         <div className="bg-black/50 p-1.5 rounded-full cursor-pointer hover:bg-black/70"><MoreVertical className="w-4 h-4 text-white" /></div>
                     </div>
                     
                     {/* Floating Reactions Overlay */}
                     <div className="absolute bottom-12 left-4 pointer-events-none">
                         {activeReactions.map(r => (
                             <div key={r.id} className="absolute bottom-0 left-0 text-4xl animate-[floatUp_2s_ease-out_forwards]">
                                 {r.emoji}
                             </div>
                         ))}
                     </div>

                     {handRaised && (
                         <div className="absolute top-3 left-3 bg-gray-800/90 p-2 rounded-full shadow-lg border border-gray-700">
                             <Hand className="w-4 h-4 text-yellow-500" />
                         </div>
                     )}
                 </div>

             </div>
        </div>

        {/* Sidebar */}
        {sidebarView !== 'none' && (
            <div className="w-[360px] bg-white absolute right-4 bottom-24 top-20 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right z-20 flex flex-col border border-gray-200">
                <div className="flex items-center justify-between p-5 border-b">
                    <h3 className="font-google-sans text-lg text-gray-800 capitalize flex items-center gap-2">
                        {sidebarView === 'info' ? <Info className="w-5 h-5 text-blue-600" /> : null}
                        {sidebarView === 'people' ? `People (${2})` : null}
                        {sidebarView === 'chat' ? 'In-call messages' : null}
                        {sidebarView === 'info' ? 'Meeting Details' : null}
                    </h3>
                    <div className="flex gap-2">
                        {/* Add Download Attendance Button */}
                        {sidebarView === 'people' && (
                            <button 
                                onClick={downloadAttendance} 
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-full transition-colors flex items-center gap-1"
                                title="Download Attendance Report"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={() => setSidebarView('none')} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                    {sidebarView === 'chat' && (
                        <div className="space-y-4">
                            <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600 text-center mb-4">
                                Messages can only be seen by people in the call and are deleted when the call ends.
                            </div>
                            {transcriptions.map((t, i) => (
                                <div key={i} className={`flex flex-col gap-1 ${t.isUser ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 px-1">
                                        <span className="font-bold text-xs text-gray-700">{t.isUser ? 'You' : 'Gemini'}</span>
                                        <span className="text-[10px] text-gray-400">{t.timestamp}</span>
                                    </div>
                                    <p className={`text-sm px-3 py-2 rounded-lg max-w-[85%] ${t.isUser ? 'bg-blue-100 text-blue-900 rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                                        {t.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {sidebarView === 'people' && (
                         <div className="space-y-1">
                             <div className="pb-3 mb-2 border-b border-gray-100 flex items-center justify-between">
                                 <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Meeting</span>
                                 <button 
                                    onClick={downloadAttendance}
                                    className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                                 >
                                    <Download className="w-3 h-3" /> Export CSV
                                 </button>
                             </div>

                             {/* User Item */}
                             <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                         {displayName.charAt(0)}
                                     </div>
                                     <div>
                                         <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                             {isEditingName ? (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        value={displayName}
                                                        onChange={(e) => setDisplayName(e.target.value)}
                                                        className="border border-blue-500 rounded px-1 py-0.5 text-xs w-24 outline-none"
                                                        autoFocus
                                                        onBlur={() => setIsEditingName(false)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                                    />
                                                    <Check className="w-3 h-3 text-green-600 cursor-pointer" onClick={() => setIsEditingName(false)} />
                                                </div>
                                             ) : (
                                                 <>
                                                    {displayName} <span className="text-gray-500 font-normal">(You)</span>
                                                 </>
                                             )}
                                         </div>
                                         <div className="text-xs text-gray-500">Meeting Host</div>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     {!isEditingName && (
                                         <button onClick={() => setIsEditingName(true)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <Edit2 className="w-3 h-3" />
                                         </button>
                                     )}
                                     <Mic className={`w-4 h-4 ${micOn ? 'text-gray-400' : 'text-red-500'}`} />
                                 </div>
                             </div>

                             {/* AI Item */}
                             <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">AI</div>
                                     <div>
                                         <div className="text-sm font-medium text-gray-800">Gemini Assistant</div>
                                     </div>
                                 </div>
                                 <div className="flex gap-2">
                                    <div className="w-4 h-4 flex gap-0.5 items-end justify-center">
                                        <div className="w-0.5 h-2 bg-green-500 animate-pulse" />
                                        <div className="w-0.5 h-3 bg-green-500 animate-pulse delay-75" />
                                        <div className="w-0.5 h-1 bg-green-500 animate-pulse delay-150" />
                                    </div>
                                 </div>
                             </div>
                         </div>
                    )}
                    {sidebarView === 'info' && (
                        <div className="space-y-6 pt-2">
                            <div>
                                <h4 className="font-medium text-sm text-gray-800 mb-2">Joining Info</h4>
                                <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded flex items-center justify-between">
                                    meet.google.com/abc-defg-hij
                                    <Copy className="w-4 h-4 text-gray-500 cursor-pointer hover:text-blue-600" />
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h4 className="font-medium text-sm text-gray-800 mb-2">Description</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Weekly logistics synchronization for Sector 7 field operations.
                                    <br/><br/>
                                    <strong>Agenda:</strong>
                                    <ul className="list-disc pl-5 mt-1">
                                        <li>Site safety review</li>
                                        <li>Inventory check</li>
                                        <li>AI Analysis report</li>
                                    </ul>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Captions Overlay */}
      {captionsOn && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center pointer-events-none z-30">
              <div className="bg-black/80 px-8 py-4 rounded-lg text-white max-w-3xl text-center text-xl font-medium shadow-2xl backdrop-blur-md">
                  {transcriptions.length > 0 ? transcriptions[transcriptions.length - 1].text : "Listening..."}
              </div>
          </div>
      )}

      {/* Bottom Controls Bar (Meet Style) */}
      <div className="h-20 bg-[#202124] flex items-center justify-between px-6 z-40 relative">
        
        {/* Left: Meeting Code / Info */}
        <div className="flex items-center gap-4 text-white font-medium min-w-[200px] hidden md:flex">
            <div className="flex flex-col">
                <span className="text-sm font-bold">{formatTime(currentTime)}</span>
                <span className="text-xs text-gray-400">train-sec7-logistics</span>
            </div>
        </div>

        {/* Center: Main Controls */}
        <div className="flex items-center gap-3">
            
            {/* Mic */}
            <button 
                onClick={() => setMicOn(!micOn)}
                className={`p-3 rounded-full border transition-all duration-200 ${micOn ? 'bg-[#3c4043] border-transparent hover:bg-[#474a4f]' : 'bg-red-600 border-transparent hover:bg-red-700 shadow-red-900/50 shadow-lg'}`}
                title="Microphone"
            >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            {/* Camera */}
            <button 
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-3 rounded-full border transition-all duration-200 ${cameraOn ? 'bg-[#3c4043] border-transparent hover:bg-[#474a4f]' : 'bg-red-600 border-transparent hover:bg-red-700 shadow-red-900/50 shadow-lg'}`}
                title="Camera"
            >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Captions */}
            <button 
                onClick={() => setCaptionsOn(!captionsOn)}
                className={`p-3 rounded-full border transition-all duration-200 ${captionsOn ? 'bg-blue-300 text-gray-900' : 'bg-[#3c4043] border-transparent hover:bg-[#474a4f] text-white'}`}
                title="Captions"
            >
                <Captions className="w-5 h-5" />
            </button>
            
            {/* Hand Raise */}
            <button 
                onClick={() => setHandRaised(!handRaised)}
                className={`p-3 rounded-full border transition-all duration-200 ${handRaised ? 'bg-blue-300 text-gray-900' : 'bg-[#3c4043] border-transparent hover:bg-[#474a4f] text-white'}`}
                title="Raise Hand"
            >
                <Hand className="w-5 h-5" />
            </button>
            
            {/* Screen Share */}
            <button 
                onClick={toggleScreenShare}
                className={`p-3 rounded-full border transition-all duration-200 ${screenShareOn ? 'bg-blue-300 text-gray-900' : 'bg-[#3c4043] border-transparent hover:bg-[#474a4f] text-white'}`}
                title="Present"
            >
                {screenShareOn ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            </button>

            {/* Reactions */}
            <div className="relative">
                <button 
                    onClick={() => setShowReactions(!showReactions)}
                    className={`p-3 rounded-full border transition-all duration-200 ${showReactions ? 'bg-[#474a4f]' : 'bg-[#3c4043] border-transparent hover:bg-[#474a4f] text-white'}`}
                    title="Reactions"
                >
                    <Smile className="w-5 h-5" />
                </button>
                {showReactions && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#303134] p-3 rounded-full shadow-2xl flex gap-2 animate-in zoom-in-95 duration-150 border border-gray-600">
                        {['💖', '👍', '🎉', '👏', '😂', '😮'].map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => triggerReaction(emoji)}
                                className="text-2xl hover:scale-125 transition-transform p-1"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* More Options / Layout */}
            <div className="relative">
                <button 
                    onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                    className="p-3 rounded-full bg-[#3c4043] border-transparent hover:bg-[#474a4f] text-white"
                    title="More Options"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>
                {showLayoutMenu && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-56 bg-[#303134] rounded-lg shadow-2xl border border-gray-600 py-2 animate-in fade-in zoom-in-95 overflow-hidden">
                        
                        {/* MoM Section */}
                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Meeting Intelligence</div>
                        <button 
                          onClick={handleDownloadMoM} 
                          disabled={isGeneratingMoM}
                          className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3 text-white disabled:opacity-50"
                        >
                            {isGeneratingMoM ? <Loader2 className="w-4 h-4 animate-spin text-[#00a884]" /> : <FileText className="w-4 h-4 text-[#00a884]" />}
                            Generate Minutes (MoM)
                        </button>

                        <div className="h-px bg-gray-600 my-1 mx-2"></div>

                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Change Layout</div>
                        <button onClick={() => {setLayout('auto'); setShowLayoutMenu(false)}} className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3">
                            <LayoutGrid className="w-4 h-4 text-gray-300" /> Auto
                        </button>
                        <button onClick={() => {setLayout('spotlight'); setShowLayoutMenu(false)}} className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3">
                            <Square className="w-4 h-4 text-gray-300" /> Spotlight
                        </button>
                        <button onClick={() => {setLayout('sidebar'); setShowLayoutMenu(false)}} className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3">
                            <Columns className="w-4 h-4 text-gray-300" /> Sidebar
                        </button>
                        
                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-t border-gray-600 mt-1">Actions</div>
                        {!isRecording ? (
                          <button onClick={startRecording} className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3 text-white">
                              <Circle className="w-4 h-4 text-red-500 fill-current" /> Start Recording
                          </button>
                        ) : (
                          <button onClick={stopRecording} className="w-full text-left px-4 py-3 hover:bg-[#3c4043] flex items-center gap-3 text-red-400">
                              <StopCircle className="w-4 h-4" /> Stop Recording
                          </button>
                        )}
                    </div>
                )}
            </div>

            {/* End Call */}
            <button 
                onClick={handleLeave}
                className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white ml-2 flex items-center justify-center w-20 shadow-lg shadow-red-900/40"
                title="Leave Call"
            >
                <PhoneOff className="w-6 h-6 fill-current" />
            </button>
        </div>

        {/* Right: Info Toggle */}
        <div className="flex items-center justify-end gap-3 min-w-[200px] hidden md:flex">
             <button 
                onClick={() => setSidebarView(sidebarView === 'info' ? 'none' : 'info')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Meeting Details"
             >
                 <Info className="w-6 h-6" />
             </button>
        </div>
      </div>
      
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { transform: translateY(-150px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveMeetingModule;