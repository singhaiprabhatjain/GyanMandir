import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Camera, RefreshCw, Send, X, SwitchCamera, Navigation, MessageSquare, Check, Layers, Scan, Activity, Building, Hash, Search, ClipboardList } from 'lucide-react';
import { GeoLocationData, ChatSession } from '../types';
import { formatFullDate } from '../services/utils';

interface GeoCameraModuleProps {
    onShare: (image: string, location: GeoLocationData | null, analysis: string, chatId: string, centreCode?: string) => void;
    chats: ChatSession[];
    targetChatId?: string; // Optional: If provided, pre-selects this chat
    onClose?: () => void; // Optional: To close the camera if embedded
    mode?: 'geo' | 'simple' | 'report';
    initialFacingMode?: 'user' | 'environment';
}

const GeoCameraModule: React.FC<GeoCameraModuleProps> = ({ onShare, chats, targetChatId, onClose, mode = 'geo', initialFacingMode = 'environment' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<GeoLocationData | null>(null);
  const [captureLocation, setCaptureLocation] = useState<GeoLocationData | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);

  // New State for Multi-Share and Search
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'capture' | 'review'>('capture');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Report Mode State
  const [centreCode, setCentreCode] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // DM Mode State
  const [dmMessage, setDmMessage] = useState('');
  const [showDmModal, setShowDmModal] = useState(false);

  // Determine if any selected chat is a group/channel/broadcast (not direct)
  const isGroupContext = useMemo(() => {
    return Array.from(selectedChats).some(chatId => {
        const chat = chats.find(c => c.id === chatId);
        return chat && chat.type !== 'direct';
    });
  }, [selectedChats, chats]);

  // Initialize Location (Run once)
  useEffect(() => {
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            address: "Fetching address..."
          });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Initialize Camera
  useEffect(() => {
    let localStream: MediaStream | null = null;
    const startCamera = async () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode }, 
          audio: false 
        });
        localStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };
    startCamera();
    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Set default selection when targetChatId changes
  useEffect(() => {
    if (targetChatId) {
      setSelectedChats(new Set([targetChatId]));
    } else {
      setSelectedChats(new Set());
    }
  }, [targetChatId]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame
        // Mirror if user facing
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Apply Geocam Overlay ONLY if mode is 'geo'. 'report' mode is simple (no overlay).
        if (mode === 'geo') {
            // --- GPS Map Camera Overlay Style ---
            const overlayHeight = 160;
            const padding = 20;

            // Gradient Background at bottom
            const gradient = ctx.createLinearGradient(0, canvas.height - overlayHeight, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvas.height - overlayHeight - 50, canvas.width, overlayHeight + 50);

            // Text settings
            ctx.fillStyle = '#06b6d4'; // Cyan for geo
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.shadowColor = "rgba(6, 182, 212, 0.5)";
            ctx.shadowBlur = 10;
            
            // Header
            const headerText = "OMNIFIELD // SECURE";
            ctx.fillText(headerText, padding, canvas.height - overlayHeight + 40);
            ctx.shadowBlur = 0; // Reset shadow

            ctx.font = '18px Inter, sans-serif';
            ctx.fillStyle = '#e2e8f0';
            const dateText = formatFullDate(new Date());
            ctx.fillText(dateText, padding, canvas.height - overlayHeight + 75);
            
            // Coords
            const latText = location ? `LAT: ${location.latitude.toFixed(6)}` : 'LAT: --';
            const lngText = location ? `LNG: ${location.longitude.toFixed(6)}` : 'LNG: --';
            ctx.fillStyle = '#4ade80'; // Green
            ctx.font = 'bold 20px monospace';
            ctx.fillText(`${latText}  ${lngText}`, padding, canvas.height - overlayHeight + 110);
            
            // Accuracy
            const accuracyText = location ? `GPS ACCURACY: ±${location.accuracy.toFixed(1)}m` : '';
            ctx.fillStyle = '#facc15'; // Yellow
            ctx.font = '16px monospace';
            ctx.fillText(accuracyText, padding, canvas.height - overlayHeight + 135);

            // Tech Decoration (Right Side)
            const mapBoxSize = 100;
            const mapX = canvas.width - mapBoxSize - padding;
            const mapY = canvas.height - overlayHeight + 30;
            
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.strokeRect(mapX, mapY, mapBoxSize, mapBoxSize);
            
            // Crosshair inside box
            ctx.beginPath();
            ctx.moveTo(mapX + mapBoxSize/2 - 10, mapY + mapBoxSize/2);
            ctx.lineTo(mapX + mapBoxSize/2 + 10, mapY + mapBoxSize/2);
            ctx.moveTo(mapX + mapBoxSize/2, mapY + mapBoxSize/2 - 10);
            ctx.lineTo(mapX + mapBoxSize/2, mapY + mapBoxSize/2 + 10);
            ctx.stroke();
        }

        // Generate final image
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setCaptureLocation(location);
        setViewMode('review');

        // Show modals based on mode
        // MODIFICATION: Geo mode in Groups also requires Centre Code now
        if (mode === 'report' || (mode === 'geo' && isGroupContext)) {
            setShowReportModal(true);
        } else if (mode === 'simple') {
            setShowDmModal(true);
        }
      }
    }
  }, [location, mode, facingMode, isGroupContext]);

  const handleRetake = () => {
    setCapturedImage(null);
    setCaptureLocation(null);
    setSearchQuery('');
    setCentreCode('');
    setDmMessage('');
    setShowReportModal(false);
    setShowDmModal(false);
    setViewMode('capture');
  };

  const toggleChatSelection = (chatId: string) => {
      const newSelection = new Set(selectedChats);
      if (newSelection.has(chatId)) {
          newSelection.delete(chatId);
      } else {
          newSelection.add(chatId);
      }
      setSelectedChats(newSelection);
  };

  const handleSimpleSend = (withMessage: boolean) => {
      const message = withMessage ? dmMessage : "";
      selectedChats.forEach(chatId => {
          onShare(capturedImage!, captureLocation, message, chatId);
      });
      if (onClose) {
          onClose();
      } else {
          handleRetake();
      }
  };

  const handleSend = () => {
    if (!capturedImage) return; 
    
    if (selectedChats.size === 0) {
        alert("Please select at least one recipient.");
        return;
    }

    // Validation for Report Mode AND Geo Mode in Groups
    const requiresCentreCode = mode === 'report' || (mode === 'geo' && isGroupContext);

    if (requiresCentreCode && !centreCode.trim()) {
        alert("Please enter a Centre Code to submit the report.");
        return;
    }

    let finalMessage = "";

    if (mode === 'geo') {
        if (requiresCentreCode) {
            finalMessage = `GPS Selfie: ${centreCode}`;
        } else {
            finalMessage = "GPS Selfie";
        }
    } else if (mode === 'report') {
        finalMessage = `Report: ${centreCode}`;
    }

    // Send to all selected chats
    selectedChats.forEach(chatId => {
        onShare(capturedImage, captureLocation, finalMessage, chatId, centreCode);
    });

    if (onClose) {
        onClose();
    } else {
        handleRetake();
    }
  };

  const toggleCamera = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 text-cyan-50 relative font-sans selection:bg-cyan-500/30">
      
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* --- HEADER --- */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
              <div className="flex items-center gap-2 mb-1">
                {mode === 'geo' ? (
                    <Scan className="w-5 h-5 text-cyan-400 animate-pulse" />
                ) : mode === 'report' ? (
                    <ClipboardList className="w-5 h-5 text-yellow-400" />
                ) : (
                    <Camera className="w-5 h-5 text-white" />
                )}
                <h1 className="text-lg font-bold tracking-widest text-white shadow-black drop-shadow-md">
                    {mode === 'geo' ? <>GEO<span className="text-cyan-400">CAM</span></> : mode === 'report' ? 'REPORT CAM' : 'CAMERA'}
                </h1>
              </div>
              {mode === 'geo' && (
                  <p className="text-[10px] font-mono text-cyan-200/70 border-l-2 border-cyan-500 pl-2">
                      SECURE FIELD DOCUMENTATION
                  </p>
              )}
              {mode === 'report' && (
                  <p className="text-[10px] font-mono text-yellow-200/70 border-l-2 border-yellow-500 pl-2">
                      CENTRE REPORTING
                  </p>
              )}
          </div>
          
          <div className="flex gap-3 pointer-events-auto">
            {onClose && (
                <button 
                    onClick={onClose}
                    className="p-3 bg-red-900/20 backdrop-blur-md border border-red-500/30 rounded-full text-red-400 hover:bg-red-950/50 transition-all"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
          </div>
      </div>

      {/* --- CAPTURE MODE --- */}
      {viewMode === 'capture' && (
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
            />
            
            {/* HUD Overlay (Geo Mode Only) */}
            {mode === 'geo' && (
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                    {/* Corners */}
                    <div className="flex justify-between">
                        <div className="w-16 h-16 border-l-4 border-t-4 border-cyan-500/80 rounded-tl-3xl shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                        <div className="w-16 h-16 border-r-4 border-t-4 border-cyan-500/80 rounded-tr-3xl shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                    </div>
                    
                    {/* Center Reticle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20 rounded-full flex items-center justify-center">
                        <div className="w-60 h-60 border border-cyan-500/30 rounded-full animate-ping opacity-20" />
                        <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="w-16 h-16 border-l-4 border-b-4 border-cyan-500/80 rounded-bl-3xl shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                        
                        {/* Data Block */}
                        <div className="mb-4 text-center">
                            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-900/50">
                                <div className="flex items-center gap-2 justify-center text-cyan-300 font-mono text-xs mb-1">
                                    <Activity className="w-3 h-3 animate-pulse" />
                                    <span>LIVE FEED // {formatFullDate(new Date())}</span>
                                </div>
                                <div className="font-mono text-white font-bold text-sm tracking-wider">
                                    {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'ACQUIRING SATELLITE LOCK...'}
                                </div>
                            </div>
                        </div>

                        <div className="w-16 h-16 border-r-4 border-b-4 border-cyan-500/80 rounded-br-3xl shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                    </div>
                </div>
            )}

            {/* Controls Container (Bottom) */}
            <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center px-10">
                
                {/* Shutter Button (Center) */}
                <button 
                    onClick={capturePhoto}
                    className="group relative"
                >
                    <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-colors bg-black/20 backdrop-blur-sm ${mode === 'geo' ? 'border-cyan-500/50 group-hover:border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : mode === 'report' ? 'border-yellow-500/50 group-hover:border-yellow-400' : 'border-white/50 group-hover:border-white'}`}>
                        <div className="w-20 h-20 bg-white rounded-full transition-transform group-active:scale-90 shadow-inner" />
                    </div>
                </button>

                {/* Switch Camera Button (Right) */}
                <button 
                    onClick={toggleCamera}
                    className="absolute right-8 md:right-20 p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/60 transition-all active:rotate-180 duration-500"
                    title="Switch Camera"
                >
                    <SwitchCamera className="w-6 h-6 md:w-8 md:h-8" />
                </button>
            </div>
        </div>
      )}

      {/* --- REVIEW & SHARE MODE --- */}
      {viewMode === 'review' && capturedImage && (
          <div className="flex-1 flex flex-col bg-slate-900 animate-in slide-in-from-bottom duration-300 relative">
              
              {/* Report Mode POPUP (Modal) - ALSO SHOWN FOR GEO MODE IN GROUPS */}
              {showReportModal && (mode === 'report' || (mode === 'geo' && isGroupContext)) && (
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                           <div className="flex items-center gap-3 mb-2">
                               <div className="p-2 bg-yellow-900/30 rounded-full">
                                   <ClipboardList className="w-6 h-6 text-yellow-500" />
                               </div>
                               <h3 className="text-xl font-bold text-white">
                                   {mode === 'geo' ? 'Geo Verification' : 'Submit Report'}
                               </h3>
                           </div>
                           <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                               Enter the unique <span className="text-yellow-400 font-bold">Centre Code</span> to finalize and tag this {mode === 'geo' ? 'location' : 'report'}.
                           </p>
                           
                           <div className="space-y-2 mb-8">
                               <label className="text-xs font-bold text-yellow-600 uppercase tracking-wider ml-1">Centre Code</label>
                               <input 
                                  autoFocus
                                  type="text" 
                                  value={centreCode}
                                  onChange={(e) => setCentreCode(e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-mono text-xl uppercase tracking-widest text-center shadow-inner"
                                  placeholder="CODE-123"
                               />
                           </div>
                           
                           <div className="flex gap-3">
                               <button 
                                  onClick={handleRetake} 
                                  className="flex-1 py-3.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
                               >
                                  Retake
                               </button>
                               <button 
                                  onClick={handleSend}
                                  disabled={!centreCode.trim()}
                                  className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg shadow-yellow-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                               >
                                  Done
                               </button>
                           </div>
                      </div>
                  </div>
              )}

              {/* Simple Mode (DM) POPUP (Modal) */}
              {showDmModal && mode === 'simple' && (
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                           <h3 className="text-xl font-bold text-white mb-2">Send Image</h3>
                           <p className="text-sm text-gray-400 mb-4">Want to send any message with this image?</p>
                           
                           <textarea
                              autoFocus
                              value={dmMessage}
                              onChange={(e) => setDmMessage(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none mb-6 resize-none h-24"
                              placeholder="Type a message..."
                           />
                           
                           <div className="flex gap-3">
                               <button 
                                  onClick={() => handleSimpleSend(false)} 
                                  className="flex-1 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
                               >
                                  No
                               </button>
                               <button 
                                  onClick={() => handleSimpleSend(true)}
                                  className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-all transform active:scale-95"
                               >
                                  Send
                               </button>
                           </div>
                      </div>
                  </div>
              )}

              {/* Image & Caption Section */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  
                  {/* Image Preview Container */}
                  <div className={`relative w-full bg-black aspect-video shrink-0 shadow-2xl ${mode === 'geo' ? 'border-b border-cyan-900/50' : ''}`}>
                      <img src={capturedImage} alt="Evidence" className="w-full h-full object-contain" />
                      
                      {mode === 'geo' && captureLocation && (
                          <a 
                             href={`https://www.google.com/maps/search/?api=1&query=${captureLocation.latitude},${captureLocation.longitude}`}
                             target="_blank"
                             rel="noreferrer"
                             className="absolute bottom-4 right-4 bg-black/60 hover:bg-cyan-600/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold backdrop-blur-md border border-white/10 transition-colors"
                          >
                             <Navigation className="w-3 h-3" /> Map View
                          </a>
                      )}
                  </div>

                  {/* Input Fields Container */}
                  <div className="p-5 space-y-6 max-w-3xl mx-auto pb-24">
                      {/* Removed "Share With" list for Simple Mode as per request */}
                  </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex items-center justify-between z-20 absolute bottom-0 w-full">
                  <button 
                      onClick={handleRetake}
                      className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Retake</span>
                  </button>
                  
                  {/* Hide main send button in Report AND Simple AND Geo Group mode because modals handle it */}
                  {mode !== 'report' && mode !== 'simple' && !(mode === 'geo' && isGroupContext) && (
                  <button 
                      onClick={handleSend}
                      disabled={selectedChats.size === 0}
                      className={`flex-1 max-w-sm ml-4 text-white py-3 px-6 rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                          mode === 'geo' 
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/30' 
                            : 'bg-blue-600 hover:bg-blue-500'
                      }`}
                  >
                      <Send className="w-5 h-5" />
                      <span>
                          {mode === 'geo' 
                            ? 'Send Report' 
                            : (selectedChats.size > 0 
                                ? `Send to ${selectedChats.size} Chat${selectedChats.size > 1 ? 's' : ''}` 
                                : 'Select Recipients')}
                      </span>
                  </button>
                  )}
              </div>

          </div>
      )}
    </div>
  );
};

export default GeoCameraModule;