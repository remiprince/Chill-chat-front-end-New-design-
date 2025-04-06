import { type ChatMode } from '../App';
import { MessageSquare, Video } from 'lucide-react';
import FlowerLogo from './FlowerLogo';

interface WelcomeViewProps {
  onStartChat: (mode: ChatMode) => void;
}

const WelcomeView = ({ onStartChat }: WelcomeViewProps) => {
  return (
    <div className="w-full max-w-3xl">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <FlowerLogo size="lg" />
        </div>
        <h2 className="text-3xl font-bold mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-yellow-500">
            Groovy Vibes with Strangers!
          </span>
        </h2>
        <p className="text-amber-800 max-w-md mx-auto font-light">
          Connect with far-out folks around the world for a cosmic conversation. Choose your preferred flow below.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Text Chat Card */}
        <div 
          className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-md p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border border-amber-200 hover:border-amber-400 transform hover:-translate-y-1" 
          onClick={() => onStartChat('text')}
        >
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-center mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-500">
              Peace & Text
            </span>
          </h3>
          <p className="text-amber-700 text-center text-sm font-light">
            Share your thoughts and good vibes with a kindred spirit through text messages.
          </p>
        </div>
        
        {/* Video Chat Card */}
        <div 
          className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-md p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border border-amber-200 hover:border-amber-400 transform hover:-translate-y-1" 
          onClick={() => onStartChat('video')}
        >
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
            <Video className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-center mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-500">
              Face-to-Face Vibes
            </span>
          </h3>
          <p className="text-amber-700 text-center text-sm font-light">
            Experience the full energy of another soul with a far-out video connection.
          </p>
        </div>
      </div>
      
      <div className="mt-12 text-center text-sm text-amber-700">
        <p className="font-light">
          By joining our tribe, you agree to spread 
          <a href="#" className="text-amber-500 hover:text-amber-600 font-medium ml-1 mr-1 transition-colors">
            Good Vibes
          </a> 
          and follow the 
          <a href="#" className="text-amber-500 hover:text-amber-600 font-medium ml-1 transition-colors">
            Path of Peace
          </a>.
        </p>
      </div>
    </div>
  );
};

export default WelcomeView;
