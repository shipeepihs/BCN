import React from 'react';

const BaconLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Main bacon strip body */}
      <path 
        d="M4 6C4 6 6 4 9 4C12 4 13 6 16 6C19 6 20 4 20 4V18C20 18 19 20 16 20C13 20 12 18 9 18C6 18 4 20 4 20V6Z" 
        fill="#1D4ED8" 
      />
      {/* Wavy fat stripes in lighter blue */}
      <path 
        d="M4 9C4 9 6 7 9 7C12 7 13 9 16 9C19 9 20 7 20 7V10C20 10 19 12 16 12C13 12 12 10 9 10C6 10 4 12 4 12V9Z" 
        fill="#60A5FA" 
        fillOpacity="0.6"
      />
      <path 
        d="M4 14C4 14 6 12 9 12C12 12 13 14 16 14C19 14 20 12 20 12V15C20 15 19 17 16 17C13 17 12 15 9 15C6 15 4 17 4 17V14Z" 
        fill="#60A5FA" 
        fillOpacity="0.4"
      />
    </svg>
  );
};

export default BaconLogo;
