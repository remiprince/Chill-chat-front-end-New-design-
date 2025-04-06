import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { messageTypes } from '@shared/schema';

interface UseWebRTCProps {
  isConnected: boolean;
}

// ICE servers configuration (STUN/TURN servers)
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function useWebRTC({ isConnected }: UseWebRTCProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();
  
  // Keep a ref to the socket to use in cleanup function
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Get the socket connection when component mounts
  useEffect(() => {
    // Create WebSocket connection to server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebRTC: WebSocket connection established');
    };
    
    newSocket.onmessage = (event) => {
      handleSocketMessage(event);
    };
    
    setSocket(newSocket);
    socketRef.current = newSocket;
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);
  
  // Handle incoming WebSocket messages
  const handleSocketMessage = async (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case messageTypes.OFFER:
          if (peerConnection.current && data.offer) {
            await handleOffer(data.offer);
          }
          break;
          
        case messageTypes.ANSWER:
          if (peerConnection.current && data.answer) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
          break;
          
        case messageTypes.ICE_CANDIDATE:
          if (peerConnection.current && data.candidate) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;
      }
    } catch (error) {
      console.error('Error handling WebRTC message:', error);
    }
  };
  
  // Initialize a new WebRTC peer connection
  const initializePeerConnection = useCallback(() => {
    // Clean up any existing peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    // Create a new peer connection
    const pc = new RTCPeerConnection(iceServers);
    peerConnection.current = pc;
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: messageTypes.ICE_CANDIDATE,
          candidate: event.candidate
        }));
      }
    };
    
    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      
      // Handle disconnection
      if (pc.iceConnectionState === 'disconnected' || 
          pc.iceConnectionState === 'failed' || 
          pc.iceConnectionState === 'closed') {
        setRemoteStream(null);
      }
    };
    
    return pc;
  }, [socket]);
  
  // Create and send an offer when connected
  const createOffer = useCallback(async () => {
    if (!peerConnection.current || !socket) return;
    
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: messageTypes.OFFER,
          offer
        }));
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish video connection. Please try again.",
        variant: "destructive",
      });
    }
  }, [socket, toast]);
  
  // Handle incoming offers
  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current || !socket) return;
    
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: messageTypes.ANSWER,
          answer
        }));
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };
  
  // Start local media stream
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Initialize peer connection after getting local stream
      initializePeerConnection();
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Camera/Microphone Access Denied",
        description: "Please allow access to your camera and microphone to use video chat.",
        variant: "destructive",
      });
    }
  }, [initializePeerConnection, toast]);
  
  // Set up WebRTC when connected to a partner
  useEffect(() => {
    if (isConnected && localStream) {
      const pc = initializePeerConnection();
      
      // Create offer to initiate the connection
      // Add a small delay to make sure both peers are ready
      setTimeout(() => {
        createOffer();
      }, 1000);
    } else if (!isConnected) {
      // Reset remote stream when disconnected
      setRemoteStream(null);
    }
  }, [isConnected, localStream, initializePeerConnection, createOffer]);
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Stop local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);
  
  // Toggle microphone mute state
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);
  
  // Toggle video on/off
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);
  
  return {
    localStream,
    remoteStream,
    startLocalStream,
    toggleMute,
    toggleVideo
  };
}
