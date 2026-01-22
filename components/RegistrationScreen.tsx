import React, { useState, useRef, useEffect } from 'react';
import { Shield, Smartphone, Upload, Check, ChevronRight, FileText, Lock, Loader2, Mail, Camera, X, RefreshCw, SwitchCamera } from 'lucide-react';
import { UserProfile } from '../types';

interface RegistrationScreenProps {
  onComplete: (profile: UserProfile) => void;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [idType, setIdType] = useState<'Aadhaar' | 'PAN'>('Aadhaar');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSendOtp = () => {
    if (mobile.length < 10 || !email.includes('@')) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 4) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Manage Camera Stream Lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;

    const enableStream = async () => {
        if (!showCamera) return;

        try {
            // Stop existing tracks if switching modes
            if (videoRef.current && videoRef.current.srcObject) {
                 const oldStream = videoRef.current.srcObject as MediaStream;
                 oldStream.getTracks().forEach(t => t.stop());
            }

            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: facingMode } 
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Unable to access camera. Please check permissions.");
            setShowCamera(false);
        }
    };

    enableStream();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [showCamera, facingMode]);

  const startCamera = () => setShowCamera(true);
  
  const stopCamera = () => setShowCamera(false);

  const toggleCamera = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const capturePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // If facing user (front camera), mirror the capture horizontally to match preview
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setIdImage(dataUrl);
            stopCamera();
          }
      }
  };

  const handleRegister = () => {
    if (!idImage) return;
    setIsLoading(true);
    // Simulate registration
    setTimeout(() => {
      const profile: UserProfile = {
        name: email.split('@')[0], // Default name from email
        mobile,
        email,
        about: 'Available',
        idProofType: idType,
        idProofImage: idImage,
        registeredAt: new Date(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`
      };
      setIsLoading(false);
      onComplete(profile);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a] z-[100] flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">OmniField Identity</h1>
            <p className="text-gray-400">Secure Registration & KYC</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-4">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-700'}`} />
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`} />
            <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-700'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-blue-500' : 'bg-gray-700'}`} />
        </div>

        {/* Form Container */}
        <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            
            {/* Step 1: Mobile & Email */}
            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right duration-300">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-blue-400" /> Contact Details
                    </h2>
                    <div className="space-y-4">
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-400">+91</span>
                            <input 
                                type="tel"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                                placeholder="98765 43210"
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors tracking-widest"
                                maxLength={10}
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="official@dseindia.in"
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        
                        <p className="text-xs text-gray-500">We will send a one-time password to verify your number.</p>
                        
                        <button 
                            onClick={handleSendOtp}
                            disabled={mobile.length < 10 || !email.includes('@') || isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get OTP <ChevronRight className="w-4 h-4" /></>}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right duration-300">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-green-400" /> Verify OTP
                    </h2>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Enter the code sent to +91 {mobile}</p>
                        <input 
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="• • • •"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 text-center text-2xl tracking-[1em] text-white focus:outline-none focus:border-blue-500 transition-colors"
                            maxLength={4}
                            autoFocus
                        />
                        <button 
                            onClick={handleVerifyOtp}
                            disabled={otp.length < 4 || isLoading}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Continue <Check className="w-4 h-4" /></>}
                        </button>
                        <button onClick={() => setStep(1)} className="w-full text-xs text-gray-500 hover:text-gray-300">Wrong details?</button>
                    </div>
                </div>
            )}

            {/* Step 3: ID Proof Upload */}
            {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right duration-300">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" /> Upload ID Proof
                    </h2>
                    
                    <div className="space-y-4">
                        {/* ID Type Selector */}
                        <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setIdType('Aadhaar')}
                                className={`flex-1 py-2 text-sm rounded-md transition-colors ${idType === 'Aadhaar' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Aadhaar Card
                            </button>
                            <button 
                                onClick={() => setIdType('PAN')}
                                className={`flex-1 py-2 text-sm rounded-md transition-colors ${idType === 'PAN' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                PAN Card
                            </button>
                        </div>

                        {/* Hidden Inputs */}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Camera View */}
                        {showCamera ? (
                             <div className="relative rounded-xl overflow-hidden h-48 bg-black">
                                 <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className={`w-full h-full object-cover transition-transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
                                 />
                                 <div className="absolute bottom-4 inset-x-0 flex justify-center">
                                     <button 
                                        onClick={capturePhoto} 
                                        className="w-14 h-14 bg-white rounded-full border-4 border-gray-300 shadow-lg hover:scale-105 transition-transform"
                                     ></button>
                                 </div>
                                 <button 
                                    onClick={stopCamera} 
                                    className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70"
                                    title="Close Camera"
                                 >
                                     <X className="w-5 h-5" />
                                 </button>
                                 <button 
                                    onClick={toggleCamera} 
                                    className="absolute top-2 left-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70"
                                    title="Switch Camera"
                                 >
                                     <SwitchCamera className="w-5 h-5" />
                                 </button>
                             </div>
                        ) : (
                            // File/Preview View
                            <div className="space-y-3">
                                <div 
                                    className={`border-2 border-dashed border-gray-600 bg-gray-800/50 rounded-xl h-48 flex flex-col items-center justify-center overflow-hidden relative ${!idImage ? '' : 'border-blue-500/50'}`}
                                >
                                    {idImage ? (
                                        <>
                                            <img src={idImage} alt="ID Preview" className="h-full w-full object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                 <button onClick={() => setIdImage(null)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
                                                     <RefreshCw className="w-4 h-4" /> Change
                                                 </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 w-full px-8">
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Upload className="w-4 h-4" /> Upload from Gallery
                                            </button>
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="h-px bg-gray-600 flex-1" />
                                                <span className="text-xs text-gray-500 uppercase">Or</span>
                                                <div className="h-px bg-gray-600 flex-1" />
                                            </div>
                                            <button 
                                                onClick={startCamera}
                                                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                                            >
                                                <Camera className="w-4 h-4" /> Take Photo
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {idImage && (
                                    <p className="text-center text-xs text-green-400 flex items-center justify-center gap-1">
                                        <Check className="w-3 h-3" /> Image captured successfully
                                    </p>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={handleRegister}
                            disabled={!idImage || isLoading || showCamera}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationScreen;