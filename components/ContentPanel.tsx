import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export type ContentMode = 'video' | 'map' | null;

interface ContentPanelProps {
  mode: ContentMode;
  data: string; // Query for video or location
  onClose: () => void;
}

const ContentPanel: React.FC<ContentPanelProps> = ({ mode, data, onClose }) => {
  if (!mode) return null;

  return (
    <div className="w-full h-full bg-black/50 border border-blue-500/30 rounded-xl overflow-hidden relative shadow-[0_0_50px_rgba(37,99,235,0.2)] backdrop-blur-sm animate-fade-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-900/20 border-b border-blue-500/30">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-blue-300 font-prime text-sm tracking-wider">
            {mode === 'video' ? 'MEDIA_PLAYER // YOUTUBE_LINK' : 'NAV_SYSTEM // GLOBAL_POSITIONING'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
            {mode === 'video' && (
                 <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data)}`} target="_blank" rel="noreferrer" className="p-1 hover:bg-blue-500/20 rounded text-blue-400">
                    <ExternalLink size={16} />
                 </a>
            )}
            <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors">
            <X size={18} />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-black/80">
        {mode === 'video' ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(data)}&autoplay=1&mute=0`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <iframe 
            className="w-full h-full filter grayscale invert-[.8] contrast-125 hover:filter-none transition-all duration-500"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(data)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            title="Google Maps"
            loading="lazy"
          />
        )}
        
        {/* Tech Overlays */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/50 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500/50 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500/50 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/50 rounded-br-lg pointer-events-none" />
      </div>
    </div>
  );
};

export default ContentPanel;