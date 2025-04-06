import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { messageSchema, messageTypes } from '@shared/schema';
import { log } from './vite';

// Define connection states for waiting pools
type ChatMode = 'text' | 'video';
type Client = {
  id: string;
  socket: WebSocket;
  mode: ChatMode | null;
  partnerId: string | null;
  isMonitored?: boolean;
  adminObservers?: Set<string>;
  lastActive: number;
};

export class ChatServer {
  private clients: Map<string, Client> = new Map();
  private textWaitingPool: Set<string> = new Set();
  private videoWaitingPool: Set<string> = new Set();

  // Admin credentials - these should be stored securely in a real application
  private adminPassword = "hippie123!";
  private adminSessions: Set<string> = new Set();
  private activeVideoChats: Map<string, { client1: string, client2: string }> = new Map();

  constructor() {
    // Setup interval to clean up dead connections
    setInterval(() => this.cleanupDeadConnections(), 30000);
  }
  
  // Admin authentication
  validateAdminCredentials(password: string): boolean {
    return password === this.adminPassword;
  }
  
  createAdminSession(): string {
    const sessionId = uuidv4();
    this.adminSessions.add(sessionId);
    return sessionId;
  }
  
  validateAdminSession(sessionId: string): boolean {
    return this.adminSessions.has(sessionId);
  }

  handleConnection(socket: WebSocket): string {
    // Create a new client with a unique ID
    const clientId = uuidv4();
    this.clients.set(clientId, {
      id: clientId,
      socket,
      mode: null,
      partnerId: null,
      lastActive: Date.now()
    });

    log(`New client connected: ${clientId}`, 'chat');
    
    // Send the client their ID
    this.sendToClient(clientId, {
      type: messageTypes.JOIN
    });

    return clientId;
  }

  handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    log(`Client disconnected: ${clientId}`, 'chat');
    
    // Notify partner if exists
    if (client.partnerId) {
      const partner = this.clients.get(client.partnerId);
      if (partner) {
        this.sendToClient(partner.id, {
          type: messageTypes.PARTNER_DISCONNECTED
        });
        partner.partnerId = null;
      }
    }

    // Remove from pools
    this.textWaitingPool.delete(clientId);
    this.videoWaitingPool.delete(clientId);
    
    // Delete client
    this.clients.delete(clientId);
  }

  handleMessage(clientId: string, rawMessage: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Parse the message
      const message = JSON.parse(rawMessage);
      
      // Handle heartbeat ping - respond immediately without validation
      if (message.type === messageTypes.PING) {
        this.sendToClient(clientId, { type: messageTypes.PONG });
        return;
      }
      
      // For regular messages, validate with schema
      const result = messageSchema.safeParse(message);
      
      if (!result.success) {
        log(`Invalid message from client ${clientId}: ${result.error.message}`, 'chat');
        this.sendToClient(clientId, {
          type: messageTypes.ERROR,
          message: 'Invalid message format'
        });
        return;
      }

      const validMessage = result.data;

      // Handle different message types
      switch (validMessage.type) {
        case messageTypes.FIND_PARTNER:
          this.handleFindPartner(clientId, validMessage.mode);
          break;
        
        case messageTypes.TEXT_MESSAGE:
          this.handleTextMessage(clientId, validMessage);
          break;
        
        case messageTypes.OFFER:
        case messageTypes.ANSWER:
        case messageTypes.ICE_CANDIDATE:
          this.forwardWebRTCSignal(clientId, validMessage);
          break;
        
        case messageTypes.LEAVE:
          this.handleLeave(clientId);
          break;
          
        default:
          log(`Unhandled message type from client ${clientId}: ${validMessage.type}`, 'chat');
      }
    } catch (error) {
      log(`Error processing message from client ${clientId}: ${error}`, 'chat');
      this.sendToClient(clientId, {
        type: messageTypes.ERROR,
        message: 'Failed to process message'
      });
    }
    
    // Update client's last activity timestamp to manage inactive connections
    const client2 = this.clients.get(clientId);
    if (client2) {
      client2.lastActive = Date.now();
    }
  }

  private handleFindPartner(clientId: string, mode: ChatMode): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // If already paired, disconnect first
    if (client.partnerId) {
      this.handleLeave(clientId);
    }

    // Set client mode and add to waiting pool
    client.mode = mode;
    
    // Try to find a partner
    const waitingPool = mode === 'text' ? this.textWaitingPool : this.videoWaitingPool;
    
    // Don't match with self
    waitingPool.delete(clientId);
    
    if (waitingPool.size > 0) {
      // Get first available partner safely - using Array.from to avoid iteration errors
      const waitingClients = Array.from(waitingPool);
      if (waitingClients.length > 0) {
        const partnerId = waitingClients[0];
        waitingPool.delete(partnerId);
        
        // Create the pairing
        if (partnerId) {
          this.pairClients(clientId, partnerId);
        }
      }
    } else {
      // No partner available, add to waiting pool
      waitingPool.add(clientId);
      log(`Client ${clientId} added to ${mode} waiting pool`, 'chat');
    }
  }

  private pairClients(clientId1: string, clientId2: string): void {
    const client1 = this.clients.get(clientId1);
    const client2 = this.clients.get(clientId2);
    
    if (!client1 || !client2) return;

    // Set partner IDs for both clients
    client1.partnerId = clientId2;
    client2.partnerId = clientId1;

    // Initialize monitoring fields
    client1.isMonitored = false;
    client2.isMonitored = false;
    client1.adminObservers = new Set();
    client2.adminObservers = new Set();

    // Notify both clients of the pairing
    this.sendToClient(clientId1, {
      type: messageTypes.PARTNER_FOUND,
      partnerId: clientId2
    });
    
    this.sendToClient(clientId2, {
      type: messageTypes.PARTNER_FOUND,
      partnerId: clientId1
    });

    log(`Paired clients: ${clientId1} with ${clientId2}`, 'chat');

    // If this is a video chat, add it to active video chats for admin monitoring
    if (client1.mode === 'video' && client2.mode === 'video') {
      const chatId = uuidv4();
      this.activeVideoChats.set(chatId, { client1: clientId1, client2: clientId2 });
      log(`Added video chat to monitoring: ${chatId}`, 'admin');
    }
  }

  private handleTextMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.partnerId) return;

    // Forward the message to the partner
    this.sendToClient(client.partnerId, message);
  }

  private forwardWebRTCSignal(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.partnerId) return;

    // Forward WebRTC signaling data to the partner
    this.sendToClient(client.partnerId, message);
    
    // For admin monitoring: forward WebRTC signals to admin observers if this is a monitored client
    if (client.isMonitored && client.adminObservers && client.adminObservers.size > 0) {
      // Forward to all admin observers - using Array.from to avoid downlevelIteration errors
      Array.from(client.adminObservers).forEach(adminId => {
        const admin = this.clients.get(adminId);
        if (admin && admin.socket.readyState === WebSocket.OPEN) {
          admin.socket.send(JSON.stringify({
            type: 'ADMIN_MONITOR',
            sourceClientId: clientId,
            signalData: message
          }));
        }
      });
    }
  }
  
  // Add methods for admin monitoring
  
  getActiveVideoChats(): Array<{ id: string, client1: string, client2: string }> {
    const chats: Array<{ id: string, client1: string, client2: string }> = [];
    
    // Using Array.from instead of for...of to avoid downlevelIteration errors
    Array.from(this.activeVideoChats.entries()).forEach(([id, { client1, client2 }]) => {
      chats.push({ id, client1, client2 });
    });
    
    return chats;
  }
  
  startMonitoringChat(adminId: string, chatId: string): boolean {
    // Verify this is an admin session
    if (!this.adminSessions.has(adminId)) return false;
    
    // Get the video chat
    const chat = this.activeVideoChats.get(chatId);
    if (!chat) return false;
    
    const { client1, client2 } = chat;
    const client1Obj = this.clients.get(client1);
    const client2Obj = this.clients.get(client2);
    
    // Check if clients still exist
    if (!client1Obj || !client2Obj) {
      this.activeVideoChats.delete(chatId);
      return false;
    }
    
    // Mark clients as monitored and add admin to observers
    client1Obj.isMonitored = true;
    client2Obj.isMonitored = true;
    
    if (!client1Obj.adminObservers) client1Obj.adminObservers = new Set();
    if (!client2Obj.adminObservers) client2Obj.adminObservers = new Set();
    
    client1Obj.adminObservers.add(adminId);
    client2Obj.adminObservers.add(adminId);
    
    log(`Admin ${adminId} started monitoring chat ${chatId}`, 'admin');
    return true;
  }
  
  stopMonitoringChat(adminId: string, chatId: string): boolean {
    // Verify this is an admin session
    if (!this.adminSessions.has(adminId)) return false;
    
    // Get the video chat
    const chat = this.activeVideoChats.get(chatId);
    if (!chat) return false;
    
    const { client1, client2 } = chat;
    const client1Obj = this.clients.get(client1);
    const client2Obj = this.clients.get(client2);
    
    // Remove admin from observers
    if (client1Obj && client1Obj.adminObservers) {
      client1Obj.adminObservers.delete(adminId);
      if (client1Obj.adminObservers.size === 0) client1Obj.isMonitored = false;
    }
    
    if (client2Obj && client2Obj.adminObservers) {
      client2Obj.adminObservers.delete(adminId);
      if (client2Obj.adminObservers.size === 0) client2Obj.isMonitored = false;
    }
    
    log(`Admin ${adminId} stopped monitoring chat ${chatId}`, 'admin');
    return true;
  }

  private handleLeave(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from waiting pools
    this.textWaitingPool.delete(clientId);
    this.videoWaitingPool.delete(clientId);

    // Notify partner of disconnection if exists
    if (client.partnerId) {
      const partner = this.clients.get(client.partnerId);
      
      // Find and remove any active video chat from monitoring
      if (client.mode === 'video' && partner && partner.mode === 'video') {
        // Using Array.from to avoid downlevelIteration errors
        const foundChatEntry = Array.from(this.activeVideoChats.entries()).find(([_, chatInfo]) => 
          (chatInfo.client1 === clientId && chatInfo.client2 === client.partnerId) ||
          (chatInfo.client2 === clientId && chatInfo.client1 === client.partnerId)
        );
        
        if (foundChatEntry) {
          const [chatId, _] = foundChatEntry;
          
          // Notify any admin observers that the chat has ended
          if (client.adminObservers) {
            Array.from(client.adminObservers).forEach(adminId => {
              const admin = this.clients.get(adminId);
              if (admin && admin.socket.readyState === WebSocket.OPEN) {
                admin.socket.send(JSON.stringify({
                  type: 'ADMIN_CHAT_ENDED',
                  chatId
                }));
              }
            });
          }
          
          // Remove the video chat from monitoring
          this.activeVideoChats.delete(chatId);
          log(`Video chat ${chatId} ended and removed from monitoring`, 'admin');
        }
      }
      
      if (partner) {
        this.sendToClient(partner.id, {
          type: messageTypes.PARTNER_DISCONNECTED
        });
        partner.partnerId = null;
      }
      
      // Reset client's partner
      client.partnerId = null;
    }
    
    // Clear monitoring fields
    client.isMonitored = false;
    if (client.adminObservers) {
      client.adminObservers.clear();
    }
  }

  private sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(data));
    }
  }

  private cleanupDeadConnections(): void {
    const now = Date.now();
    const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Using Array.from to avoid downlevelIteration errors
    Array.from(this.clients.entries()).forEach(([id, client]) => {
      // Remove clients with closed WebSocket connections
      if (client.socket.readyState !== WebSocket.OPEN) {
        this.handleDisconnection(id);
        return;
      }
      
      // Remove clients that have been inactive for too long
      if (now - client.lastActive > INACTIVE_TIMEOUT) {
        log(`Client ${id} timed out due to inactivity`, 'chat');
        this.handleDisconnection(id);
      }
    });
  }
}
