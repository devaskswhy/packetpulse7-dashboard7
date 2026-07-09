import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useDPI } from '../../context/DPIContext';
import { ACCENT } from '../../lib/motion';

export default function Preloader() {
  const { connectionStatus } = useDPI();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Establishing connection...');
  const [isReady, setIsReady] = useState(false);
  
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    // Fake progress
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (connectionStatus !== 'live' && prev >= 99) return 99;
        
        const inc = Math.floor(Math.random() * 15) + 1;
        return Math.min(99, prev + inc);
      });
    }, 150);

    return () => clearInterval(timerRef.current);
  }, [connectionStatus]);

  useEffect(() => {
    if (progress > 30 && progress < 70) {
      setStatusText('Syncing live data...');
    }
  }, [progress]);

  useEffect(() => {
    const checkCompletion = () => {
      const elapsed = Date.now() - startTime.current;
      const minTimePassed = elapsed >= 2000;
      const isConnected = connectionStatus === 'live' || connectionStatus === 'polling';
      
      if (isConnected && minTimePassed && !isReady) {
        setIsReady(true);
        clearInterval(timerRef.current);
        setProgress(100);
        setStatusText('Ready');
        
        const tl = gsap.timeline();
        
        tl.to(contentRef.current, { 
          opacity: 0, 
          duration: 0.3, 
          delay: 0.4 
        })
        .set(containerRef.current, { backgroundColor: ACCENT })
        .to(containerRef.current, { 
          yPercent: -100, 
          duration: 1, 
          ease: 'power4.inOut'
        });
      }
    };
    
    const interval = setInterval(checkCompletion, 100);
    return () => clearInterval(interval);
  }, [connectionStatus, isReady]);

  return (
    <div 
      ref={containerRef}
      className="preloader-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'var(--bg-base, #0a0e1a)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary, #e2e8f0)',
      }}
    >
      <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div 
          style={{ 
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '64px',
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: ACCENT
          }}
        >
          {progress}%
        </div>
        <div style={{ 
            fontSize: '14px', 
            color: 'var(--text-muted, #64748b)', 
            marginTop: '16px', 
            letterSpacing: '0.02em',
            fontWeight: 500
          }}>
          {statusText}
        </div>
      </div>
    </div>
  );
}
