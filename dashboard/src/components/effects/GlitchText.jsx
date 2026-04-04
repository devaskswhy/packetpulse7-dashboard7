import React from 'react';

export default function GlitchText({ text, className }) {
  return (
    <>
      <style>{`
        .glitch-text {
          position: relative;
          color: white;
          text-shadow: 0 0 8px rgba(34,211,238,0.6);
          animation: glitch-trigger 4s infinite;
        }
        
        .glitch-text:hover {
          animation: glitch-trigger 0.3s infinite;
        }
        
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }
        
        .glitch-text::before {
          color: #ff0040;
          animation: glitch 4s infinite;
          z-index: -1;
        }
        
        .glitch-text::after {
          color: #00d4ff;
          animation: glitch 4s infinite reverse;
          z-index: -2;
        }
        
        .glitch-text:hover::before,
        .glitch-text:hover::after {
          animation: glitch 0.3s infinite;
        }
        
        @keyframes glitch-trigger {
          0%, 90%, 100% { opacity: 1; }
          92%, 96% { opacity: 1; }
        }
        
        @keyframes glitch {
          0%, 100% { 
            clip-path: none; 
            transform: none; 
          }
          20% { 
            clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); 
            transform: translate(-3px, 0); 
          }
          40% { 
            clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%); 
            transform: translate(3px, 0); 
          }
          60% { 
            clip-path: polygon(0 40%, 100% 40%, 100% 60%, 0 60%); 
            transform: translate(-2px, 0); 
          }
          80% { 
            clip-path: none; 
            transform: translate(2px, 0); 
          }
        }
      `}</style>
      <div className={`glitch-text ${className}`} data-text={text}>
        {text}
      </div>
    </>
  );
}
