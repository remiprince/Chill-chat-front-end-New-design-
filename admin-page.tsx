import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Shield } from 'lucide-react';

// Type definition for video chats
interface VideoChat {
  id: string;
  client1: string;
  client2: string;
  isMonitoring?: boolean;
}

const AdminPage = () => {
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [videoChats, setVideoChats] = useState<VideoChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  
  // WebSocket for admin monitoring
  const ws = useRef<WebSocket | null>(null);
  
  // Video refs for streams
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  
  // Handle login
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        toast({
          title: 'Admin Login Successful',
          description: 'You now have access to monitoring features.',
        });
        
        // Set up WebSocket connection for admin
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws.current = new WebSocket(wsUrl);
        
        // Start refreshing the chat list periodically
        const interval = window.setInterval(() => {
          fetchActiveChats(data.sessionId);
        }, 5000);
        setRefreshInterval(interval);
        
        // Fetch chats immediately
        fetchActiveChats(data.sessionId);
      } else {
        toast({
          title: 'Login Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Error',
        description: 'Failed to connect to admin API.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch active video chats
  const fetchActiveChats = async (sid: string) => {
    try {
      const res = await fetch(`/api/admin/videochats?sessionId=${sid}`);
      const data = await res.json();
      
      if (data.success) {
        // Preserve monitoring state for existing chats
        const updatedChats = data.chats.map((chat: VideoChat) => {
          const existingChat = videoChats.find(c => c.id === chat.id);
          return {
            ...chat,
            isMonitoring: existingChat ? existingChat.isMonitoring : false
          };
        });
        
        setVideoChats(updatedChats);
      }
    } catch (error) {
      console.error('Error fetching video chats:', error);
    }
  };
  
  // Start monitoring a chat
  const startMonitoring = async (chatId: string) => {
    if (!sessionId) return;
    
    try {
      const res = await fetch('/api/admin/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, chatId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Update local state to show we're monitoring this chat
        setVideoChats(chats => 
          chats.map(chat => 
            chat.id === chatId 
              ? { ...chat, isMonitoring: true } 
              : chat
          )
        );
        
        toast({
          title: 'Monitoring Started',
          description: `Now monitoring chat ${chatId}`,
        });
      } else {
        toast({
          title: 'Monitoring Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      toast({
        title: 'Monitoring Error',
        description: 'Failed to start monitoring.',
        variant: 'destructive',
      });
    }
  };
  
  // Stop monitoring a chat
  const stopMonitoring = async (chatId: string) => {
    if (!sessionId) return;
    
    try {
      const res = await fetch('/api/admin/stop-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, chatId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Update local state
        setVideoChats(chats => 
          chats.map(chat => 
            chat.id === chatId 
              ? { ...chat, isMonitoring: false } 
              : chat
          )
        );
        
        toast({
          title: 'Monitoring Stopped',
          description: `No longer monitoring chat ${chatId}`,
        });
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    // Close WebSocket
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    // Clear interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    
    // Reset state
    setSessionId(null);
    setVideoChats([]);
    setPassword('');
  };
  
  // Listen for WebSocket messages for monitored chats
  useEffect(() => {
    if (!ws.current) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different admin message types
        if (data.type === 'ADMIN_MONITOR') {
          // We received WebRTC signal from a chat we're monitoring
          console.log('Received monitor data:', data);
          
          // Handle WebRTC signals from monitored clients
          if (data.signalData.type === 'offer' && data.signalData.offer) {
            // Process offer (this would initialize a peer connection and set remote description)
            console.log('Received offer for monitoring');
          } else if (data.signalData.type === 'ice_candidate' && data.signalData.candidate) {
            // Process ICE candidate
            console.log('Received ICE candidate for monitoring');
          }
        } 
        else if (data.type === 'ADMIN_CHAT_ENDED') {
          // A chat we were monitoring has ended
          console.log('Chat ended:', data.chatId);
          
          // Update video chats list
          setVideoChats(chats => 
            chats.filter(chat => chat.id !== data.chatId)
          );
          
          toast({
            title: 'Chat Ended',
            description: `The monitored chat has ended`,
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.current.addEventListener('message', handleMessage);
    
    return () => {
      if (ws.current) {
        ws.current.removeEventListener('message', handleMessage);
      }
    };
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [refreshInterval]);
  
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 groovy-text text-amber-600">ChillChat Admin Portal</h1>
          <p className="text-amber-700">Super secret incognito monitoring system</p>
        </div>
        
        {!sessionId ? (
          <Card className="bg-white border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 text-amber-500" />
                Admin Login
              </CardTitle>
              <CardDescription>Enter your admin password to access monitoring functions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password</Label>
                  <div className="flex">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 border-amber-300"
                      placeholder="Enter admin password"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleLogin} 
                disabled={isLoading || !password} 
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                <Lock className="mr-2 h-4 w-4" />
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Tabs defaultValue="active">
            <div className="flex justify-between items-center mb-4">
              <TabsList className="bg-amber-100">
                <TabsTrigger value="active" className="data-[state=active]:bg-amber-500">Active Video Chats</TabsTrigger>
                <TabsTrigger value="monitoring" className="data-[state=active]:bg-amber-500">Monitoring</TabsTrigger>
              </TabsList>
              
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="border-amber-500 text-amber-700"
              >
                Logout
              </Button>
            </div>
            
            <TabsContent value="active" className="space-y-4">
              <Card className="bg-white border-amber-200">
                <CardHeader>
                  <CardTitle>Active Video Chats</CardTitle>
                  <CardDescription>
                    Currently active video conversations ({videoChats.length})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {videoChats.length === 0 ? (
                    <div className="text-center py-8 text-amber-600">
                      <p>No active video chats at the moment</p>
                      <p className="text-sm mt-2">Chats will appear here when users connect</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {videoChats.map((chat) => (
                        <div 
                          key={chat.id} 
                          className="p-4 border border-amber-200 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">Chat ID: {chat.id.substring(0, 8)}...</p>
                            <p className="text-sm text-amber-600">
                              Users: {chat.client1.substring(0, 6)}... & {chat.client2.substring(0, 6)}...
                            </p>
                          </div>
                          
                          <div>
                            {chat.isMonitoring ? (
                              <Button 
                                variant="outline" 
                                className="border-red-400 text-red-500"
                                onClick={() => stopMonitoring(chat.id)}
                              >
                                <EyeOff className="h-4 w-4 mr-2" />
                                Stop Monitoring
                              </Button>
                            ) : (
                              <Button 
                                className="bg-amber-500 hover:bg-amber-600"
                                onClick={() => startMonitoring(chat.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Monitor Incognito
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t border-amber-100 pt-4 flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchActiveChats(sessionId)}
                    className="border-amber-300"
                  >
                    Refresh
                  </Button>
                  
                  <Badge className="bg-amber-500">
                    {videoChats.filter(c => c.isMonitoring).length} chat(s) being monitored
                  </Badge>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="monitoring">
              <Card className="bg-white border-amber-200">
                <CardHeader>
                  <CardTitle>Monitoring Dashboard</CardTitle>
                  <CardDescription>
                    Video feeds from monitored chats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videoChats
                      .filter(chat => chat.isMonitoring)
                      .map(chat => (
                        <div key={chat.id} className="relative">
                          <div className="bg-amber-900 h-64 rounded-lg flex items-center justify-center">
                            <p className="text-amber-100">
                              Monitoring Chat: {chat.id.substring(0, 8)}...
                            </p>
                            {/* This would be a video element in a real implementation */}
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => stopMonitoring(chat.id)}
                            >
                              Stop
                            </Button>
                          </div>
                        </div>
                      ))
                    }
                    
                    {videoChats.filter(chat => chat.isMonitoring).length === 0 && (
                      <div className="col-span-2 text-center py-12 text-amber-600">
                        <p>No chats are currently being monitored</p>
                        <p className="text-sm mt-2">
                          Click "Monitor Incognito" on a chat to start monitoring
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default AdminPage;