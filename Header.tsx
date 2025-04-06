import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Info, Heart } from 'lucide-react';
import FlowerLogo from './FlowerLogo';

const Header = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm py-4 border-b-4 border-amber-300">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <FlowerLogo size="sm" showText={false} />
          <h1 className="ml-2 text-2xl groovy-text text-amber-600">ChillChat</h1>
        </div>
        
        <div className="flex space-x-2">
          {/* Settings Dialog */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center rounded-full border-amber-400 hover:bg-amber-100">
                <span className="hidden md:inline mr-1">Good Vibes</span>
                <Heart className="h-5 w-5 md:hidden text-amber-500" />
              </Button>
            </DialogTrigger>
            <DialogContent className="peace-border bg-amber-50">
              <DialogHeader>
                <DialogTitle className="groovy-text text-amber-600 text-xl">Good Vibes Only</DialogTitle>
                <DialogDescription className="text-amber-800">
                  Configure your groovy chat preferences
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-amber-700">Privacy</h3>
                  <p className="text-sm text-amber-600">
                    All chats are anonymous and not stored on our servers. Peace and love, man.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-amber-700">Media Access</h3>
                  <p className="text-sm text-amber-600">
                    For video chat, you need to allow camera and microphone access when prompted by your browser. Share the love!
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Report Issue Dialog */}
          <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center rounded-full bg-yellow-400 hover:bg-yellow-500 text-amber-800">
                <span className="hidden md:inline mr-1">Spread Peace</span>
                <Info className="h-5 w-5 md:hidden" />
              </Button>
            </DialogTrigger>
            <DialogContent className="peace-border bg-amber-50">
              <DialogHeader>
                <DialogTitle className="groovy-text text-amber-600 text-xl">Report Bad Vibes</DialogTitle>
                <DialogDescription className="text-amber-800">
                  Let us know if you encounter any uncool behavior, man.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-amber-700">
                  If you encounter bad vibes or inappropriate content, disconnect and let us know. 
                  We're all about peace and love here, and we'll check it out as soon as possible.
                </p>
                <Button onClick={() => setIsFeedbackOpen(false)} className="bg-yellow-400 hover:bg-yellow-500 text-amber-800">
                  Submit Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};

export default Header;
