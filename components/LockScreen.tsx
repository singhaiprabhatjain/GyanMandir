import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Lock } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleNumClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Mock PIN validation
        if (newPin === '1234') {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleBiometric = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onUnlock();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a] z-[100] flex flex-col items-center justify-center text-white">
      <div className="mb-8 flex flex-col items-center animate-fade-in">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">OmniField Connect</h1>
        <p className="text-gray-400 text-sm mt-2">Enterprise Secure Login</p>
      </div>

      <div className="w-full max-w-xs">
        <div className="flex justify-center gap-4 mb-8 h-4">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i < pin.length 
                  ? error ? 'bg-red-500' : 'bg-blue-500' 
                  : 'bg-gray-700'
              }`} 
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num.toString())}
              className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xl font-medium transition-all active:scale-95"
            >
              {num}
            </button>
          ))}
          <div className="col-start-2">
            <button
              onClick={() => handleNumClick('0')}
              className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xl font-medium transition-all active:scale-95"
            >
              0
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleBiometric}
            className={`flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors ${isScanning ? 'animate-pulse' : ''}`}
          >
            {isScanning ? (
              <Fingerprint className="w-8 h-8 text-green-400" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                 <div className="p-3 bg-gray-800/50 rounded-full border border-blue-500/30">
                    <Fingerprint className="w-6 h-6" />
                 </div>
                 <span className="text-xs uppercase tracking-widest opacity-70">Biometric Scan</span>
              </div>
            )}
          </button>
        </div>
        
        <p className="text-center text-gray-600 text-xs mt-8 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> End-to-End Encrypted Environment
        </p>
      </div>
    </div>
  );
};

export default LockScreen;
