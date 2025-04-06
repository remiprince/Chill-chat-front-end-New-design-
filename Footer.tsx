import { FlowerIcon } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t-4 border-amber-300 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 flex items-center">
            <FlowerIcon className="h-5 w-5 text-amber-600 mr-2" />
            <p className="text-sm text-amber-700">&copy; {new Date().getFullYear()} ChillChat. Peace, love & good vibes.</p>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-sm text-amber-700 hover:text-amber-500 groovy-text">Terms</a>
            <a href="#" className="text-sm text-amber-700 hover:text-amber-500 groovy-text">Privacy</a>
            <a href="#" className="text-sm text-amber-700 hover:text-amber-500 groovy-text">Vibes Guide</a>
            <a href="#" className="text-sm text-amber-700 hover:text-amber-500 groovy-text">Contact</a>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs text-amber-600">Spread love, not hate. Be kind to one another.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
