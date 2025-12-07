import React, { useEffect, useRef } from 'react';

interface PrimeVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const PrimeVisualizer: React.FC<PrimeVisualizerProps> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);
    
    let rotation = 0;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Idle animation data
        for(let i=0; i<dataArray.length; i++) dataArray[i] = 10;
      }

      // Calculate average volume for pulse effect
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / (bufferLength || 1);
      const pulse = average / 255; // 0 to 1

      // PRIME CORE (Center)
      const coreRadius = 30 + (pulse * 20);
      
      // Glow
      const gradient = ctx.createRadialGradient(cx, cy, coreRadius * 0.5, cx, cy, coreRadius * 3);
      gradient.addColorStop(0, '#60a5fa'); // Blue-400
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Inner Hexagon
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) + rotation;
        const r = coreRadius + 10;
        ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      ctx.closePath();
      ctx.stroke();

      // Outer Rings (React to frequency chunks)
      const rings = 3;
      for (let r = 0; r < rings; r++) {
        ctx.strokeStyle = `rgba(37, 99, 235, ${0.8 - (r * 0.2)})`; // Blue fading out
        ctx.lineWidth = 2;
        ctx.beginPath();
        const baseR = 80 + (r * 40);
        
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            // Modulate radius based on frequency data
            const freqIndex = Math.floor((i / segments) * (bufferLength / 2));
            const val = dataArray[freqIndex] || 0;
            const offset = (val / 255) * 50 * (isActive ? 1 : 0.1);
            
            const angle = (i / segments) * Math.PI * 2 - rotation * (r % 2 === 0 ? 1 : -1);
            const rad = baseR + offset;
            
            ctx.lineTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Connecting Lines (Tech look)
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<8; i++) {
          const angle = (i * Math.PI / 4) + rotation * 0.5;
          ctx.moveTo(cx + 40 * Math.cos(angle), cy + 40 * Math.sin(angle));
          ctx.lineTo(cx + 200 * Math.cos(angle), cy + 200 * Math.sin(angle));
      }
      ctx.stroke();

      rotation += 0.005 + (pulse * 0.02); // Spin faster when loud
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isActive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full max-w-[600px] max-h-[600px]" />
    </div>
  );
};

export default PrimeVisualizer;