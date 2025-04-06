import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin-page";
import Header from "./components/Header";
import Footer from "./components/Footer";
import WelcomeView from "./components/WelcomeView";
import ChatView from "./components/ChatView";
import ConnectingOverlay from "./components/ConnectingOverlay";

// Chat mode type
export type ChatMode = 'text' | 'video' | null;

// Home page component
function HomePage() {
  // State for the app
  const [currentView, setCurrentView] = useState<'welcome' | 'chat'>('welcome');
  const [chatMode, setChatMode] = useState<ChatMode>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Handler for starting a chat
  const handleStartChat = (mode: ChatMode) => {
    setChatMode(mode);
    setIsConnecting(true);
  };

  // Handler for when connection is established
  const handleConnected = () => {
    setCurrentView('chat');
    setIsConnecting(false);
  };

  // Handler for canceling connection
  const handleCancel = () => {
    setIsConnecting(false);
  };

  // Handler for stopping the chat
  const handleStopChat = () => {
    setCurrentView('welcome');
    setChatMode(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {currentView === 'welcome' && (
          <WelcomeView onStartChat={handleStartChat} />
        )}
        
        {currentView === 'chat' && chatMode && (
          <ChatView 
            mode={chatMode} 
            onStop={handleStopChat}
            onNewChat={() => setIsConnecting(true)}
          />
        )}
      </main>
      
      <Footer />
      
      {isConnecting && (
        <ConnectingOverlay 
          onCancel={handleCancel}
          onConnected={handleConnected}
          chatMode={chatMode}
        />
      )}
    </div>
  );
}

// Main App component with routing
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
