import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import type { Data } from "ws";
import { ChatServer } from "./chat";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize the chat server
  const chatServer = new ChatServer();

  // Create WebSocket server with a specific path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true
  });

  // Handle new WebSocket connections
  wss.on('connection', (socket: WebSocket) => {
    const clientId = chatServer.handleConnection(socket);
    
    // Handle messages from this client
    socket.on('message', (message: Data) => {
      const msgString = message.toString();
      chatServer.handleMessage(clientId, msgString);
    });

    // Handle disconnection
    socket.on('close', () => {
      chatServer.handleDisconnection(clientId);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      log(`WebSocket error for client ${clientId}: ${error}`, 'websocket');
      chatServer.handleDisconnection(clientId);
    });
  });

  // Basic status endpoint
  app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', connections: wss.clients.size });
  });
  
  // Admin API endpoints - these should be properly secured in a production app
  
  // Admin login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (chatServer.validateAdminCredentials(password)) {
      const sessionId = chatServer.createAdminSession();
      res.json({ 
        success: true, 
        sessionId,
        message: 'Admin login successful'
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid admin credentials'
      });
    }
  });
  
  // Get all active video chats
  app.get('/api/admin/videochats', (req, res) => {
    const { sessionId } = req.query;
    
    if (!sessionId || !chatServer.validateAdminSession(String(sessionId))) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin session'
      });
    }
    
    const activeChats = chatServer.getActiveVideoChats();
    res.json({ 
      success: true, 
      chats: activeChats
    });
  });
  
  // Start monitoring a video chat
  app.post('/api/admin/monitor', (req, res) => {
    const { sessionId, chatId } = req.body;
    
    if (!sessionId || !chatServer.validateAdminSession(sessionId)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin session'
      });
    }
    
    if (!chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID is required'
      });
    }
    
    const success = chatServer.startMonitoringChat(sessionId, chatId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Monitoring started'
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Chat not found or no longer active'
      });
    }
  });
  
  // Stop monitoring a video chat
  app.post('/api/admin/stop-monitor', (req, res) => {
    const { sessionId, chatId } = req.body;
    
    if (!sessionId || !chatServer.validateAdminSession(sessionId)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin session'
      });
    }
    
    if (!chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID is required'
      });
    }
    
    const success = chatServer.stopMonitoringChat(sessionId, chatId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Monitoring stopped'
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Chat not found or no longer active'
      });
    }
  });

  return httpServer;
}
