
import React from 'react';

interface SevenX7LogoProps {
  size?: 'xs' | 'small' | 'medium' | 'large';
  isWelcome?: boolean;
  onNewsClick?: () => void;
}

const SevenX7Logo: React.FC<SevenX7LogoProps> = ({ size = 'small', isWelcome = false, onNewsClick }) => {
  
  const getTextSize = () => {
      switch(size) {
          case 'xs': return 'text-[10px]';
          case 'small': return 'text-xs';
          case 'medium': return 'text-lg';
          case 'large': return 'text-4xl';
          default: return 'text-xs';
      }
  };

  const isLarge = size === 'large';
  const textSizeClass = getTextSize();
  const gapClass = isLarge ? 'gap-3' : size === 'medium' ? 'gap-2.5' : 'gap-1.5';
  
  const xSize = isLarge ? 'text-6xl' : size === 'medium' ? 'text-3xl' : size === 'xs' ? 'text-sm' : 'text-xl';
  const trackingClass = size === 'xs' ? 'tracking-[0.15em]' : isLarge ? 'tracking-[0.2em]' : 'tracking-[0.3em]';

  return (
    <div className={`group flex items-center font-display ${gapClass} select-none`}>
      
      {/* SEVEN - Black, standard bold */}
      <span 
        className={`${textSizeClass} text-black font-bold uppercase ${trackingClass}`}
      >
        Seven
      </span>

      {/* X - Black, extra bold (font-black), no animations */}
      <div className={`relative flex items-center justify-center ${xSize}`} onClick={onNewsClick}>
         <span 
            className="relative z-10 text-black font-black inline-block origin-center" 
            style={{ fontFamily: 'sans-serif', fontWeight: 900 }}
         >
            X
         </span>
      </div>

      {/* 7 - Black, standard bold */}
      <span className={`${textSizeClass} text-black font-bold uppercase ${trackingClass}`}>7</span>

    </div>
  );
};

export default SevenX7Logo;
