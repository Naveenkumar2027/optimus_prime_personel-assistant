
import React, { useEffect, useRef } from 'react';
import { ConnectionStatus } from '../types';

interface OrbProps {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  status: ConnectionStatus;
  onClick: () => void;
}

const Orb: React.FC<OrbProps> = ({ inputAnalyser, outputAnalyser, status, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = 300;
      canvas.height = 300;
    };
    resize();

    const dataArray = new Uint8Array(128);
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      let amplitude = 0;
      let activeAnalyser = outputAnalyser;
      let color = '#3b82f6'; // Default Blue

      if (status === ConnectionStatus.CONNECTED) {
          // Check who is talking louder
          let inputLevel = 0;
          let outputLevel = 0;

          if (inputAnalyser) {
              inputAnalyser.getByteFrequencyData(dataArray);
              inputLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          }
          if (outputAnalyser) {
              outputAnalyser.getByteFrequencyData(dataArray);
              outputLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          }

          if (outputLevel > 10) {
             amplitude = outputLevel;
             color = '#8b5cf6'; // Purple (Prime Speaking)
          } else if (inputLevel > 10) {
             amplitude = inputLevel;
             color = '#06b6d4'; // Cyan (User Speaking)
          } else {
             amplitude = 5; // Idle hum
          }
      } else if (status === ConnectionStatus.LISTENING_WAKE_WORD) {
          color = '#eab308'; // Yellow/Amber (Standby)
          amplitude = 10 + Math.sin(Date.now() / 500) * 5;
      } else {
          color = '#64748b'; // Gray (Disconnected)
      }

      // Normalize amplitude for visuals (0 to 1)
      const normAmp = Math.min(1, amplitude / 100);
      
      // Update Rotation
      rotationRef.current += 0.01 + (normAmp * 0.05);

      // --- Draw Orb Core ---
      const coreRadius = 40 + (normAmp * 20);
      const gradient = ctx.createRadialGradient(cx, cy, coreRadius * 0.2, cx, cy, coreRadius * 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '80'); // 50% opacity
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // --- Draw Rotating Rings ---
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      
      // Ring 1
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60 + normAmp * 30, 20, rotationRef.current, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60 + normAmp * 30, 20, -rotationRef.current, 0, Math.PI * 2);
      ctx.stroke();
      
      // Ring 3 (Outer Circle)
      ctx.beginPath();
      ctx.arc(cx, cy, 70 + normAmp * 10, 0 + rotationRef.current, Math.PI * 1.5 + rotationRef.current);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [inputAnalyser, outputAnalyser, status]);

  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <canvas ref={canvasRef} className="w-48 h-48" />
      {/* Glow Effect behind */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-2xl transition-colors duration-500
        ${status === ConnectionStatus.CONNECTED ? 'bg-blue-500/40' : status === ConnectionStatus.LISTENING_WAKE_WORD ? 'bg-yellow-500/20' : 'bg-gray-500/10'}
      `}></div>
    </div>
  );
};

export default Orb;
