import React from 'react';

interface FlowerLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const FlowerLogo: React.FC<FlowerLogoProps> = ({ 
  size = 'md', 
  showText = true 
}) => {
  // Size mappings
  const sizeMap = {
    sm: {
      svg: 40,
      text: 'text-lg',
      textOffset: 'mt-1',
    },
    md: {
      svg: 60,
      text: 'text-2xl',
      textOffset: 'mt-2',
    },
    lg: {
      svg: 80,
      text: 'text-3xl',
      textOffset: 'mt-3',
    },
  };
  
  const { svg, text, textOffset } = sizeMap[size];
  
  return (
    <div className="flex flex-col items-center">
      <svg 
        width={svg} 
        height={svg} 
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Center Circle */}
        <circle cx="50" cy="50" r="15" fill="#FF9800" />
        
        {/* Flower Petals */}
        <g className="flower-petals">
          {/* Top petal */}
          <ellipse cx="50" cy="25" rx="18" ry="20" fill="#F06292" />
          
          {/* Top right petal */}
          <ellipse cx="75" cy="35" rx="18" ry="20" fill="#BA68C8" transform="rotate(45 75 35)" />
          
          {/* Right petal */}
          <ellipse cx="75" cy="50" rx="18" ry="20" fill="#64B5F6" />
          
          {/* Bottom right petal */}
          <ellipse cx="65" cy="75" rx="18" ry="20" fill="#81C784" transform="rotate(-45 65 75)" />
          
          {/* Bottom petal */}
          <ellipse cx="50" cy="75" rx="18" ry="20" fill="#FFD54F" />
          
          {/* Bottom left petal */}
          <ellipse cx="35" cy="65" rx="18" ry="20" fill="#FF8A65" transform="rotate(45 35 65)" />
          
          {/* Left petal */}
          <ellipse cx="25" cy="50" rx="18" ry="20" fill="#7986CB" />
          
          {/* Top left petal */}
          <ellipse cx="35" cy="35" rx="18" ry="20" fill="#4DB6AC" transform="rotate(-45 35 35)" />
        </g>
        
        {/* Center Dot (stamen) */}
        <circle cx="50" cy="50" r="8" fill="#FFF9C4" />
      </svg>
      
      {showText && (
        <div className={`${text} groovy-text text-amber-600 ${textOffset} font-bold`}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-yellow-500">
            Chill<span className="text-amber-600">Chat</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default FlowerLogo;