import { useState, useEffect } from 'react';
import { type ChatMode } from '../App';
import TextChatInterface from './TextChatInterface';
import VideoChatInterface from './VideoChatInterface';
import ConnectingOverlay from './ConnectingOverlay';
import useChat from '../lib/useChat';
import { Button } from '@/components/ui/button';
import { SkipForward, Flower2, Wifi, WifiOff } from 'lucide-react';

interface ChatViewProps {
  mode: ChatMode;
  onStop: () => void;
  onNewChat: () => void;
}

const ChatView = ({ mode, onStop, onNewChat }: ChatViewProps) => {
  const { 
    isConnected, 
    messages, 
    sendMessage, 
    disconnect, 
    reconnect, 
    connectionState,
    reconnectAttempt,
    maxReconnectAttempts
  } = useChat({ mode });
  
  const [showReconnectOverlay, setShowReconnectOverlay] = useState(false);
  
  // Show reconnect overlay when disconnected or reconnecting
  useEffect(() => {
    if (connectionState === 'disconnected' || connectionState === 'reconnecting') {
      setShowReconnectOverlay(true);
    } else {
      setShowReconnectOverlay(false);
    }
  }, [connectionState]);
  
  const handleNext = () => {
    disconnect();
    onNewChat();
  };

  // Show reconnection overlay if needed
  if (showReconnectOverlay) {
    return (
      <ConnectingOverlay
        onCancel={onStop}
        onConnected={() => setShowReconnectOverlay(false)}
        chatMode={mode}
        connectionState={connectionState}
        reconnectAttempt={reconnectAttempt}
        maxReconnectAttempts={maxReconnectAttempts}
        reconnect={reconnect}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Chat Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <Flower2 className="h-6 w-6 text-amber-500 mr-2" />
          <h2 className="text-2xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-500">
              {mode === 'text' ? 'Peace & Text Vibes' : 'Face-to-Face Cosmic Connection'}
            </span>
          </h2>
        </div>
        <p className="text-amber-700 mb-3 font-light">
          {isConnected 
            ? mode === 'text' 
              ? "You're connected with a cosmic friend. Spread some peace and love!" 
              : "You're connected! Chat and share your vibes through video and text."
            : "Searching for a groovy connection in the universe..."}
        </p>
      </div>
      
      {/* Chat Controls */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center">
          <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-amber-100">
            {isConnected ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                <span className="text-sm font-medium text-amber-700">Connected</span>
              </>
            ) : (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse mr-2"></div>
                <span className="text-sm font-medium text-amber-700">Connecting...</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-800 shadow-md hover:shadow-lg transition-all" 
            onClick={handleNext}
            disabled={!isConnected}
          >
            <SkipForward className="h-4 w-4" />
            <span className="font-medium">New Friend</span>
          </Button>
          <Button 
            className="rounded-full border border-red-300 bg-white text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors shadow-sm hover:shadow" 
            variant="outline"
            onClick={onStop}
          >
            <span className="font-medium">End Journey</span>
          </Button>
        </div>
      </div>
      
      {/* Chat Interfaces */}
      {mode === 'text' && (
        <TextChatInterface 
          messages={messages}
          onSendMessage={sendMessage}
          isConnected={isConnected}
          connectionState={connectionState}
          chatMode={mode}
        />
      )}
      
      {mode === 'video' && (
        <div className="space-y-6">
          <VideoChatInterface 
            isConnected={isConnected}
            connectionState={connectionState}
          />
          
          {/* Text chat alongside video */}
          <div className="mt-4">
            <TextChatInterface 
              messages={messages}
              onSendMessage={sendMessage}
              isConnected={isConnected}
              connectionState={connectionState}
              chatMode={mode}
              compactMode={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatView;
