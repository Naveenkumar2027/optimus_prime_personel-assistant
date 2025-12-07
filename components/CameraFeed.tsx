import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface CameraFeedProps {
  onPhotoTaken: (url: string) => void;
  isActive: boolean;
}

export interface CameraHandle {
  takePhoto: () => string | null;
}

const CameraFeed = forwardRef<CameraHandle, CameraFeedProps>(({ isActive, onPhotoTaken }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    takePhoto: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        onPhotoTaken(dataUrl);
        return dataUrl;
      }
      return null;
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isActive) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => console.error("Camera error:", err));
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute top-4 right-4 w-48 h-36 bg-black border border-blue-500 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20 animate-fade-in-up">
      <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-1 left-1 bg-blue-900/80 text-[10px] text-blue-200 px-2 py-0.5 rounded font-prime">
        CAM_01 // ACTIVE
      </div>
      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    </div>
  );
});

export default CameraFeed;