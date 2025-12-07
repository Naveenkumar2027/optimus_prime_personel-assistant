import React, { useEffect, useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

interface PrimeFaceProps {
  isSpeaking: boolean;
}

const PrimeFace: React.FC<PrimeFaceProps> = ({ isSpeaking }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateFace = async () => {
      if (imageUrl) return; // Already generated
      
      setLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        // Enforce centered, symmetrical composition to allow CSS effects to align correctly
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: "Front facing symmetrical portrait of Optimus Prime head, perfectly centered, glowing blue eyes, detailed mechanical face, dark background, cinematic lighting, photorealistic 8k, neutral expression" }]
          }
        });

        // Find image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64 = part.inlineData.data;
                setImageUrl(`data:image/png;base64,${base64}`);
                break;
            }
        }
      } catch (e) {
        console.error("Failed to generate face:", e);
      } finally {
        setLoading(false);
      }
    };

    generateFace();
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-blue-500 font-mono animate-pulse">INITIALIZING OPTICS...</div>
        </div>
      )}
      
      {imageUrl ? (
        <div className={`relative w-full h-full flex items-center justify-center transition-all duration-200
            ${isSpeaking ? 'scale-[1.02]' : 'scale-100'}
        `}>
            {/* Main Face Image */}
            <img 
            src={imageUrl} 
            alt="Optimus Prime" 
            className={`max-w-full max-h-full object-contain filter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-100 ease-in-out origin-bottom
                ${isSpeaking ? 'brightness-125 contrast-110' : 'brightness-100 contrast-100'}
            `}
            style={{
                // Simulate "Jaw" movement/Speech vibration
                transform: isSpeaking ? 'scaleY(1.01) translateY(1px)' : 'none',
                animation: isSpeaking ? 'speak-vibrate 0.1s infinite' : 'breathe 4s infinite ease-in-out'
            }}
            />

            {/* Simulated Eye Glow Overlay (Positioned based on "centered" prompt assumption) */}
            <div 
                className={`absolute top-[42%] left-1/2 -translate-x-1/2 w-[25%] h-[5%] bg-blue-400 blur-xl rounded-full mix-blend-screen transition-opacity duration-200
                ${isSpeaking ? 'opacity-60' : 'opacity-0'}
                `}
            />

            {/* Listening "Scanner" Effect */}
            {!isSpeaking && !loading && (
                <div className="absolute inset-0 pointer-events-none opacity-30">
                     <div className="w-full h-[2px] bg-blue-500/50 shadow-[0_0_10px_#3b82f6] animate-scan-vertical absolute top-0"></div>
                </div>
            )}
        </div>
      ) : !loading && (
        // Fallback placeholder
        <div className="w-64 h-80 bg-blue-900/20 border-2 border-blue-500/50 clip-path-polygon flex items-center justify-center relative overflow-hidden">
             <div className="text-blue-500/50 font-prime text-6xl relative z-10">OP</div>
             <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(59,130,246,0.1)_50%,transparent_55%)] bg-[length:200%_200%] animate-scan"></div>
        </div>
      )}
      
      {/* Tech Overlay Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,10,40,0.8)_50%)] bg-[size:100%_4px] opacity-20 pointer-events-none"></div>

      <style>{`
        @keyframes speak-vibrate {
            0% { transform: scale(1.02) translateY(0); }
            50% { transform: scale(1.02) translateY(1px); }
            100% { transform: scale(1.02) translateY(0); }
        }
        @keyframes breathe {
            0% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.01); filter: brightness(1.05); }
            100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes scan-vertical {
            0% { top: 30%; opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { top: 70%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PrimeFace;