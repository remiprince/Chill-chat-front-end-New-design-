import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Flower2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { type ChatMode } from '../App';

// Define the ConnectionState type to match useChat.ts
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'stranger';
  timestamp: number;
  pending?: boolean;
  failed?: boolean;
}

interface TextChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => boolean; // Now returns whether the send was successful
  isConnected: boolean;
  connectionState?: ConnectionState;
  chatMode?: ChatMode;
  compactMode?: boolean; // When true, shows a more compact interface for video chat mode
}

const TextChatInterface = ({ 
  messages, 
  onSendMessage, 
  isConnected, 
  connectionState = 'connected',
  chatMode,
  compactMode = false
}: TextChatInterfaceProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [pendingMessages, setPendingMessages] = useState<Map<string, string>>(new Map());
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMessage.trim() && isConnected) {
      const trimmedMessage = inputMessage.trim();
      const success = onSendMessage(trimmedMessage);
      
      // Only clear input if message was sent successfully
      if (success) {
        setInputMessage('');
      } else {
        // Store pending message to retry later
        const messageId = Date.now().toString();
        setPendingMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(messageId, trimmedMessage);
          return newMap;
        });
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <Wifi className="h-4 w-4 text-amber-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`bg-white rounded-lg ${compactMode ? 'border border-amber-200' : 'peace-border'} overflow-hidden`}>
      
      {/* Header - Show only in full mode or as a simplified version in compact mode */}
      {(!compactMode || (compactMode && connectionState !== 'connected')) && (
        <div className="flex items-center justify-between border-b border-amber-200 py-1 px-3 bg-gradient-to-r from-amber-50 to-yellow-50">
          <Badge
            variant={isConnected ? "default" : "outline"}
            className={`bg-opacity-70 flex gap-1 items-center ${
              isConnected 
                ? "bg-green-100 text-green-800 hover:bg-green-100" 
                : "bg-red-100 text-red-800 hover:bg-red-100"
            }`}
          >
            {getConnectionIcon()}
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          
          {!compactMode && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              {chatMode === 'text' ? "Text Chat" : "Text Messages"}
            </Badge>
          )}
        </div>
      )}
      
      {/* Messages area - adjust height based on mode */}
      <ScrollArea className={`${compactMode ? 'h-64' : 'h-96'} p-3 bg-amber-50`}>
        <div className="space-y-2">
          {messages.length === 0 && isConnected && !compactMode && (
            <div className="text-center p-4 text-amber-600 flex flex-col items-center">
              <Flower2 className="h-10 w-10 text-amber-400 mb-3" />
              <p className="font-bold text-base">Groovy connection established!</p>
              <p className="text-sm font-light">Share some peace and love with your new friend...</p>
            </div>
          )}
          
          {messages.length === 0 && isConnected && compactMode && (
            <div className="text-center p-2 text-amber-600">
              <p className="text-sm font-light">Send a message to your cosmic friend...</p>
            </div>
          )}
          
          {connectionState === 'reconnecting' && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className={`${compactMode ? 'text-sm' : 'text-base'}`}>Reconnecting...</AlertTitle>
              {!compactMode && (
                <AlertDescription className="text-sm">
                  Keep the good vibes flowing! We're trying to restore your connection.
                </AlertDescription>
              )}
            </Alert>
          )}
          
          {connectionState === 'disconnected' && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <WifiOff className="h-4 w-4 text-red-500" />
              <AlertTitle className={`${compactMode ? 'text-sm' : 'text-base'}`}>Connection lost</AlertTitle>
              {!compactMode && (
                <AlertDescription className="text-sm">
                  The cosmic waves have faded. Please try to reconnect to continue your journey.
                </AlertDescription>
              )}
            </Alert>
          )}
          
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`mb-2 ${message.sender === 'me' ? 'ml-auto' : ''}`}
            >
              <div className={`flex items-start ${message.sender === 'me' ? 'justify-end' : ''}`}>
                <div 
                  className={`rounded-2xl py-2 px-3 shadow-sm ${compactMode ? 'max-w-[240px] text-xs' : 'max-w-xs md:max-w-md text-sm'} break-words
                    ${message.sender === 'me' 
                      ? message.failed 
                        ? 'bg-red-100 text-red-800' 
                        : message.pending 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'hippie-gradient text-amber-800' 
                      : 'bg-white border border-amber-200 text-amber-800'}`}
                >
                  <p className={compactMode ? "text-xs" : "text-sm"}>{message.content}</p>
                </div>
              </div>
              <div className={`flex ${message.sender === 'me' ? 'justify-end' : ''}`}>
                <span className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  {message.sender === 'me' 
                    ? compactMode ? 'You' : '☮️ You' 
                    : compactMode ? 'Friend' : '✌️ Cosmic Friend'
                  } • {formatTime(message.timestamp)}
                  {message.pending && <span className="text-amber-500 text-xs">(Sending...)</span>}
                  {message.failed && <span className="text-red-500 text-xs">(Failed to send)</span>}
                </span>
              </div>
            </div>
          ))}
          
          {Array.from(pendingMessages.entries()).map(([id, content]) => (
            <div key={id} className="ml-auto mb-2">
              <div className="flex items-start justify-end">
                <div className={`rounded-2xl py-2 px-3 shadow-sm ${compactMode ? 'max-w-[240px]' : 'max-w-xs md:max-w-md'} break-words bg-amber-100 text-amber-800`}>
                  <p className={compactMode ? "text-xs" : "text-sm"}>{content}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <span className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  {compactMode ? 'You' : '☮️ You'} • {formatTime(parseInt(id))}
                  <span className="text-amber-500 text-xs">(Waiting to send...)</span>
                </span>
              </div>
            </div>
          ))}
          
          <div ref={endOfMessagesRef} />
        </div>
      </ScrollArea>
      
      {/* Input area - adjust padding based on mode */}
      <div className={`${compactMode ? 'p-2' : 'p-3'} border-t border-amber-200 bg-white`}>
        <form onSubmit={handleSubmit} className="flex items-center">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isConnected 
                ? compactMode ? "Send a message..." : "Share your groovy thoughts..." 
                : connectionState === 'reconnecting'
                  ? "Reconnecting..."
                  : "Connection lost"
            }
            disabled={!isConnected}
            className={`flex-grow border-amber-300 focus:border-amber-500 rounded-full ${compactMode ? 'text-sm h-8' : ''}`}
          />
          <Button 
            type="submit" 
            className={`ml-2 rounded-full bg-yellow-400 hover:bg-yellow-500 text-amber-800 ${compactMode ? 'h-8 w-8 p-0' : ''}`}
            disabled={!isConnected || !inputMessage.trim()}
          >
            <Send size={compactMode ? 14 : 18} />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default TextChatInterface;
