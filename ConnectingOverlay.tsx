import { useEffect } from 'react';
import { type ChatMode } from '../App';
import useChat from '../lib/useChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import FlowerLogo from './FlowerLogo';
import { Progress } from '@/components/ui/progress';

interface ConnectingOverlayProps {
  onCancel: () => void;
  onConnected: () => void;
  chatMode: ChatMode;
  connectionState?: string;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  reconnect?: () => boolean;
}

const ConnectingOverlay = ({ 
  onCancel, 
  onConnected, 
  chatMode,
  connectionState: propConnectionState,
  reconnectAttempt: propReconnectAttempt,
  maxReconnectAttempts: propMaxReconnectAttempts,
  reconnect: propReconnect
}: ConnectingOverlayProps) => {
  // Use props values if provided, otherwise use hook values
  const { 
    isConnected, 
    connectionState: hookConnectionState, 
    findPartner, 
    reconnect: hookReconnect, 
    reconnectAttempt: hookReconnectAttempt, 
    maxReconnectAttempts: hookMaxReconnectAttempts 
  } = useChat({ mode: chatMode });
  
  // Use provided props or fall back to hook values
  const connectionState = propConnectionState || hookConnectionState;
  const reconnectAttempt = propReconnectAttempt !== undefined ? propReconnectAttempt : hookReconnectAttempt;
  const maxReconnectAttempts = propMaxReconnectAttempts || hookMaxReconnectAttempts;
  const reconnect = propReconnect || hookReconnect;

  // Attempt to find a partner when the overlay is shown
  useEffect(() => {
    if (chatMode) {
      findPartner();
    }
  }, [chatMode, findPartner]);

  // When connected, notify parent component
  useEffect(() => {
    if (isConnected) {
      onConnected();
    }
  }, [isConnected, onConnected]);

  // Get message and icon based on connection state
  const getConnectionInfo = () => {
    switch (connectionState) {
      case 'connecting':
        return {
          title: 'Establishing connection',
          message: 'Starting the journey... connecting to the cosmic web...',
          icon: <Wifi className="h-8 w-8 text-amber-600" />
        };
      case 'connected':
        return {
          title: 'Finding your cosmic connection',
          message: 'Sending good vibes into the universe... hang loose while we find your chat partner...',
          icon: <Loader className="h-8 w-8 animate-spin text-amber-600" />
        };
      case 'reconnecting':
        return {
          title: 'Reconnecting...',
          message: 'The cosmic waves are choppy! Trying to restore your connection to the universe...',
          icon: <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
        };
      case 'disconnected':
        return {
          title: 'Connection lost',
          message: 'Oh no! The cosmic connection has faded. Try reconnecting to get back on the journey.',
          icon: <WifiOff className="h-8 w-8 text-amber-600" />
        };
      default:
        return {
          title: 'Finding your cosmic connection',
          message: 'Sending good vibes into the universe... hang loose while we find your chat partner...',
          icon: <Loader className="h-8 w-8 animate-spin text-amber-600" />
        };
    }
  };

  const { title, message, icon } = getConnectionInfo();

  return (
    <div className="fixed inset-0 bg-amber-50/90 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-white rounded-2xl overflow-hidden shadow-lg border border-amber-200">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 rounded-full opacity-50 animate-pulse"></div>
              <FlowerLogo size="md" showText={false} />
              <div className="absolute inset-0 flex items-center justify-center">
                {icon}
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-500">
              {title}
            </span>
          </h3>
          <p className="text-amber-700 mb-5 font-light max-w-sm mx-auto">{message}</p>
          
          {connectionState === 'reconnecting' && (
            <div className="mb-6 max-w-xs mx-auto">
              <Progress 
                value={(reconnectAttempt / maxReconnectAttempts) * 100} 
                className="h-2 mb-2 bg-amber-100" 
              />
              <p className="text-xs text-amber-600 font-medium">
                Reconnecting... Attempt {reconnectAttempt} of {maxReconnectAttempts}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline"
              className="rounded-full border-amber-200 hover:bg-amber-50 text-amber-700 font-medium shadow-sm hover:shadow transition-all"
              onClick={onCancel}
            >
              Cancel the Trip
            </Button>
            
            {connectionState === 'disconnected' && (
              <Button 
                className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-medium shadow-md hover:shadow-lg transition-all"
                onClick={reconnect}
              >
                Reconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectingOverlay;
