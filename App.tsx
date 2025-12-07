import React, { useState, useEffect, useRef } from 'react';
import Orb from './components/Orb';
import PrimeFace from './components/PrimeFace';
import CameraFeed, { CameraHandle } from './components/CameraFeed';
import ContentPanel, { ContentMode } from './components/ContentPanel';
import { LiveService } from './services/liveService';
import { WakeWordService } from './services/wakeWordService';
import { ConnectionStatus } from './types';
import { Power } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // New: Content State
  const [contentMode, setContentMode] = useState<ContentMode>(null);
  const [contentData, setContentData] = useState<string>('');

  const liveServiceRef = useRef<LiveService | null>(null);
  const wakeWordRef = useRef<WakeWordService | null>(null);
  const cameraRef = useRef<CameraHandle>(null);

  const initializeSystem = () => {
    setIsInitialized(true);
    setStatus(ConnectionStatus.LISTENING_WAKE_WORD);
    
    wakeWordRef.current = new WakeWordService(() => {
        connectToLive();
    });
    wakeWordRef.current.start();
  };

  const connectToLive = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) return;
    
    wakeWordRef.current?.stop();
    setStatus(ConnectionStatus.CONNECTING);

    const service = new LiveService({
      onConnect: () => {
        setStatus(ConnectionStatus.CONNECTED);
      },
      onDisconnect: () => {
        setStatus(ConnectionStatus.LISTENING_WAKE_WORD);
        setInputAnalyser(null);
        setOutputAnalyser(null);
        wakeWordRef.current?.start();
      },
      onError: (err) => {
        console.error("Connection Error:", err);
        setStatus(ConnectionStatus.ERROR);
        
        liveServiceRef.current?.disconnect();
        liveServiceRef.current = null;

        setTimeout(() => {
             setStatus(ConnectionStatus.LISTENING_WAKE_WORD);
             wakeWordRef.current?.start();
        }, 3000);
      },
      onAudioInput: (node) => setInputAnalyser(node),
      onAudioOutput: (node) => setOutputAnalyser(node),
      onToolCall: handleToolCall
    });

    liveServiceRef.current = service;
    await service.connect();
  };

  const handleToolCall = async (name: string, args: any) => {
    switch (name) {
      case 'take_picture':
        setIsCameraActive(true);
        await new Promise(r => setTimeout(r, 1000)); 
        if (cameraRef.current) {
            const photo = cameraRef.current.takePhoto();
            setTimeout(() => setIsCameraActive(false), 3000);
            return { result: photo ? "Photo captured." : "Failed to capture." };
        }
        return { result: "Camera unavailable." };

      case 'open_website':
        const url = args.url.startsWith('http') ? args.url : `https://${args.url}`;
        window.open(url, '_blank');
        return { result: `Opening ${args.siteName || url}` };

      case 'play_music':
        // CHANGED: Update local state to show player instead of opening new tab
        setContentMode('video');
        setContentData(args.query);
        return { result: `Playing ${args.query} on main display.` };

      case 'show_location':
        // CHANGED: Handle map display
        setContentMode('map');
        setContentData(args.location);
        return { result: `Displaying navigation map for ${args.location}.` };

      case 'scan_bluetooth':
        return { result: "Scanning... Found 2 devices. Headset X1 connected." };

      case 'set_volume':
        if(liveServiceRef.current) liveServiceRef.current.setVolume(Number(args.level) / 100);
        return { result: "Volume adjusted." };

      default:
        return { result: "Unknown command" };
    }
  };

  const isSpeaking = () => {
      if (status !== ConnectionStatus.CONNECTED || !outputAnalyser) return false;
      const data = new Uint8Array(outputAnalyser.frequencyBinCount);
      outputAnalyser.getByteFrequencyData(data);
      const vol = data.reduce((a,b)=>a+b,0) / data.length;
      return vol > 10;
  };

  const [speakingBool, setSpeakingBool] = useState(false);
  useEffect(() => {
      if(!outputAnalyser) return;
      const i = setInterval(() => {
          setSpeakingBool(isSpeaking());
      }, 100);
      return () => clearInterval(i);
  }, [outputAnalyser]);

  const closeContent = () => {
    setContentMode(null);
    setContentData('');
  };

  if (!isInitialized) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center font-prime text-blue-500">
              <button 
                onClick={initializeSystem}
                className="group relative px-8 py-4 bg-blue-900/20 border border-blue-500 hover:bg-blue-900/40 transition-all rounded-lg overflow-hidden"
              >
                  <div className="absolute inset-0 w-full h-full bg-blue-400/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  <div className="flex items-center space-x-3 relative z-10">
                      <Power className="w-6 h-6 animate-pulse" />
                      <span className="tracking-[0.2em] text-lg">INITIALIZE SYSTEMS</span>
                  </div>
              </button>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-black text-blue-100 flex flex-col relative overflow-hidden font-rajdhani">
      
      {/* Camera (Hidden) */}
      <div className="absolute opacity-0 pointer-events-none">
           <CameraFeed ref={cameraRef} isActive={isCameraActive} onPhotoTaken={()=>{}} />
      </div>

      {/* Main Layout - Flex Row when Content Active, Flex Col when Idle */}
      <main className={`flex-1 flex items-center p-4 md:p-8 transition-all duration-700 ease-in-out
        ${contentMode ? 'flex-row space-x-4 md:space-x-8' : 'flex-col justify-center space-y-8'}
      `}>
        
        {/* Left Side: Optimus Prime & Orb */}
        <div className={`flex flex-col items-center justify-center transition-all duration-700
             ${contentMode ? 'w-1/3 h-full justify-start pt-10' : 'w-full h-3/4'}
        `}>
             {/* Face */}
            <div className={`relative transition-all duration-700 
                ${contentMode ? 'w-full h-48 md:h-64' : 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]'}
            `}>
                <PrimeFace isSpeaking={speakingBool} />
            </div>

            {/* Orb & Status */}
            <div className={`mt-8 flex flex-col items-center transition-all duration-700 ${contentMode ? 'scale-75' : 'scale-100'}`}>
                <div className="mb-4 h-6 font-mono text-xs tracking-widest text-blue-500/80 uppercase whitespace-nowrap">
                    {status === ConnectionStatus.LISTENING_WAKE_WORD && "Waiting for 'Hey Prime'..."}
                    {status === ConnectionStatus.CONNECTING && "Establishing Neural Link..."}
                    {status === ConnectionStatus.CONNECTED && "Online // Systems Nominal"}
                    {status === ConnectionStatus.ERROR && "Connection Lost // Re-initializing"}
                </div>
                <Orb 
                    inputAnalyser={inputAnalyser} 
                    outputAnalyser={outputAnalyser} 
                    status={status}
                    onClick={status === ConnectionStatus.CONNECTED ? () => liveServiceRef.current?.disconnect() : connectToLive}
                />
            </div>
        </div>

        {/* Right Side: Content Panel (Map/Video) */}
        {contentMode && (
             <div className="flex-1 h-full max-h-[80vh] animate-fade-in-right">
                 <ContentPanel mode={contentMode} data={contentData} onClose={closeContent} />
             </div>
        )}

      </main>

      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,30,60,0.4)_0%,rgba(0,0,0,1)_80%)] pointer-events-none -z-10"></div>
    </div>
  );
}

export default App;