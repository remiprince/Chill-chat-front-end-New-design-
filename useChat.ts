import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { type ChatMode } from '../App';
import { messageTypes } from '@shared/schema';

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'stranger';
  timestamp: number;
}

interface UseChatProps {
  mode: ChatMode;
}

// WebSocket connection states
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

export default function useChat({ mode }: UseChatProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const { toast } = useToast();
  
  // Keep refs for socket, reconnection attempts and timeouts
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const waitingForPartnerRef = useRef<boolean>(false);
  
  // Maximum reconnection attempts
  const MAX_RECONNECT_ATTEMPTS = 5;
  // Base delay for exponential backoff (milliseconds)
  const BASE_RECONNECT_DELAY = 1000;
  // Heartbeat interval (milliseconds)
  const HEARTBEAT_INTERVAL = 30000;

  // Function to send a message with error handling
  const sendSocketMessage = useCallback((message: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Socket not open, message not sent:', message);
      return false;
    }
    
    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  // Heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = window.setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Send a minimal ping message
        socketRef.current.send(JSON.stringify({ type: messageTypes.PING }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  // Function to initialize WebSocket connection with auto-reconnect
  const initializeSocket = useCallback(() => {
    // Clean up any existing connection first
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState(ConnectionState.CONNECTING);
    
    // Create WebSocket connection to server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionState(ConnectionState.CONNECTED);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempt(0);
      startHeartbeat();
      
      // If we were waiting for a partner before disconnection, resume the search
      if (waitingForPartnerRef.current && mode) {
        console.log('Resuming partner search after reconnection');
        setTimeout(() => {
          sendSocketMessage({
            type: messageTypes.FIND_PARTNER,
            mode
          });
        }, 500); // Short delay to ensure socket is fully established
      }
    };
    
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case messageTypes.PARTNER_FOUND:
            setIsConnected(true);
            setPartnerId(data.partnerId);
            waitingForPartnerRef.current = false;
            break;
            
          case messageTypes.PARTNER_DISCONNECTED:
            setIsConnected(false);
            setPartnerId(null);
            toast({
              title: "Chat Ended",
              description: "Your chat partner has disconnected.",
              variant: "default",
            });
            waitingForPartnerRef.current = false;
            break;
            
          case messageTypes.TEXT_MESSAGE:
            if (data.content) {
              setMessages((prev) => [
                ...prev,
                {
                  id: uuidv4(),
                  content: data.content,
                  sender: 'stranger',
                  timestamp: data.timestamp || Date.now(),
                },
              ]);
            }
            break;
            
          case messageTypes.ERROR:
            toast({
              title: "Error",
              description: data.message || "Something went wrong",
              variant: "destructive",
            });
            break;
            
          case messageTypes.PONG:
            // Heartbeat response - do nothing
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    newSocket.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      setIsConnected(false);
      setPartnerId(null);
      setConnectionState(ConnectionState.DISCONNECTED);
      
      // Don't attempt to reconnect if this was a clean closure
      if (event.wasClean) {
        waitingForPartnerRef.current = false;
        return;
      }
      
      // Attempt to reconnect with exponential backoff
      const shouldReconnect = reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS;
      
      if (shouldReconnect) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        setConnectionState(ConnectionState.RECONNECTING);
        reconnectAttemptsRef.current++;
        setReconnectAttempt(reconnectAttemptsRef.current);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          initializeSocket();
        }, delay);
      } else {
        console.log('Maximum reconnection attempts reached');
        waitingForPartnerRef.current = false;
        toast({
          title: "Connection Lost",
          description: "Could not reconnect to the server. Please try again later.",
          variant: "destructive",
        });
      }
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Don't show error toast here as onclose will be called immediately after
      // and we'll handle reconnection there
    };
    
    setSocket(newSocket);
    socketRef.current = newSocket;
  }, [mode, sendSocketMessage, startHeartbeat, toast]);

  // Initialize WebSocket on component mount
  useEffect(() => {
    initializeSocket();
    
    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [initializeSocket]);

  // Function to find a chat partner
  const findPartner = useCallback(() => {
    if (!socketRef.current || !mode) return false;
    
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to chat server. Please try again.",
        variant: "destructive",
      });
      return false;
    }
    
    // Clear messages when finding a new partner
    setMessages([]);
    
    // If we're connected to someone, disconnect first
    if (isConnected) {
      sendSocketMessage({
        type: messageTypes.LEAVE
      });
    }
    
    // Send request to find a new partner
    const sent = sendSocketMessage({
      type: messageTypes.FIND_PARTNER,
      mode
    });
    
    if (sent) {
      waitingForPartnerRef.current = true;
      toast({
        title: "Finding a partner",
        description: `Looking for someone to chat with...`,
        variant: "default",
      });
    }
    
    return sent;
  }, [isConnected, mode, sendSocketMessage, toast]);

  // Function to send a message with retry
  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current || !isConnected) return false;
    
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Message Not Sent",
        description: "Connection to chat server lost. Trying to reconnect...",
        variant: "destructive",
      });
      return false;
    }
    
    const messageData = {
      type: messageTypes.TEXT_MESSAGE,
      content,
      timestamp: Date.now()
    };
    
    const sent = sendSocketMessage(messageData);
    
    if (sent) {
      // Add message to local state
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          content,
          sender: 'me',
          timestamp: messageData.timestamp,
        },
      ]);
    }
    
    return sent;
  }, [isConnected, sendSocketMessage, toast]);

  // Function to disconnect from current chat
  const disconnect = useCallback(() => {
    if (!socketRef.current) return false;
    
    const sent = sendSocketMessage({
      type: messageTypes.LEAVE
    });
    
    if (sent) {
      setIsConnected(false);
      setPartnerId(null);
      waitingForPartnerRef.current = false;
    }
    
    return sent;
  }, [sendSocketMessage]);

  // Function to reconnect after disconnection
  const reconnect = useCallback(() => {
    // If socket is not connected, reinitialize it
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      initializeSocket();
      // We'll attempt to find a partner once the connection is established (in onopen handler)
      waitingForPartnerRef.current = true;
      return true;
    }
    
    // Otherwise just find a new partner
    return findPartner();
  }, [findPartner, initializeSocket]);

  return {
    isConnected,
    connectionState,
    messages,
    sendMessage,
    findPartner,
    disconnect,
    reconnect,
    reconnectAttempt,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
  };
}
