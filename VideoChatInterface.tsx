import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Flower2 } from 'lucide-react';
import useWebRTC from '../lib/useWebRTC';

interface VideoChatInterfaceProps {
  isConnected: boolean;
  connectionState?: string;
}

const VideoChatInterface = ({ isConnected, connectionState = 'connected' }: VideoChatInterfaceProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const { 
    localStream, 
    remoteStream, 
    startLocalStream,
    toggleMute,
    toggleVideo 
  } = useWebRTC({ isConnected });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize local video when component mounts
  useEffect(() => {
    startLocalStream();
  }, []);
  
  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };
  
  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoOff(!isVideoOff);
  };

  return (
    <Card className="bg-white rounded-lg peace-border overflow-hidden">
      <div className="relative">
        {/* Connection Status Indicator */}
        <div className={`absolute top-2 right-2 z-10 p-1 px-2 rounded-full text-xs font-medium flex items-center gap-1 ${
          connectionState === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : connectionState === 'reconnecting'
              ? 'bg-amber-100 text-amber-800 animate-pulse'
              : 'bg-red-100 text-red-800'
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            connectionState === 'connected' 
              ? 'bg-green-500' 
              : connectionState === 'reconnecting'
                ? 'bg-amber-500'
                : 'bg-red-500'
          }`}></span>
          {connectionState === 'connected' ? 'Connected' : 
           connectionState === 'reconnecting' ? 'Reconnecting...' :
           'Disconnected'}
        </div>

        {/* Main Video (Stranger) */}
        <div className="bg-gradient-to-b from-amber-800 to-amber-900 h-96 flex items-center justify-center">
          {!isConnected || !remoteStream ? (
            <div className="text-center p-6">
              <div className="mx-auto mb-6">
                <Flower2 className="h-16 w-16 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-amber-100 text-xl groovy-text">Sending good vibes to the universe...</p>
              <p className="text-amber-200 text-sm mt-2 font-light">Looking for a cosmic connection, hang loose</p>
            </div>
          ) : (
            <video 
              ref={remoteVideoRef} 
              className="w-full h-full object-cover rounded-t-lg" 
              autoPlay 
              playsInline
            />
          )}
        </div>
        
        {/* Self Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden shadow-xl">
          <div className="absolute inset-0 rounded-lg border-2 border-amber-400"></div>
          <video 
            ref={localVideoRef} 
            className="w-full h-full object-cover rounded-lg" 
            autoPlay 
            playsInline 
            muted 
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent h-8"></div>
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <span className="text-xs text-white font-medium px-1">You</span>
          </div>
        </div>
        
        {/* Video controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-amber-900/90 to-transparent">
          <div className="flex justify-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-amber-800 rounded-full h-10 w-10 p-0 flex items-center justify-center shadow-md"
              onClick={handleToggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-amber-800 rounded-full h-10 w-10 p-0 flex items-center justify-center shadow-md"
              onClick={handleToggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VideoChatInterface;
