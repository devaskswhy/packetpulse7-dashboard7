import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDPI } from '../../context/DPIContext';
import { ACCENT } from '../../lib/motion';

const STATUS_MESSAGES = [
  "Initializing PacketPulse...",
  "Capturing Packets...",
  "Analyzing Network Traffic...",
  "Detecting Threats...",
  "Preparing Dashboard...",
  "Finalizing Session..."
];

const NetworkBackdrop = () => {
  // Generate some subtle random lines/particles
  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: '2px',
            height: '2px',
            backgroundColor: ACCENT,
            borderRadius: '50%',
            boxShadow: `0 0 8px ${ACCENT}`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Subtle connection lines */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
        <motion.path
          d="M 10 50 Q 25 25 50 50 T 90 50"
          fill="transparent"
          stroke={ACCENT}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 80 10 Q 50 80 20 90"
          fill="transparent"
          stroke={ACCENT}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 8, delay: 2, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
};

export default function Preloader() {
  const { connectionStatus } = useDPI();
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);
  
  const word = "PacketPulse";
  const letters = word.split("");
  
  // Calculate which message to show
  const msgIndex = Math.min(
    Math.floor((progress / 100) * STATUS_MESSAGES.length),
    STATUS_MESSAGES.length - 1
  );
  const currentMessage = STATUS_MESSAGES[msgIndex];

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (connectionStatus !== 'live' && prev >= 99) return 99;
        const inc = Math.floor(Math.random() * 8) + 1; // Slower increment for better animation feel
        return Math.min(100, prev + inc); // We allow it to hit 100 if connected conditions are met below
      });
    }, 150);

    return () => clearInterval(timerRef.current);
  }, [connectionStatus]);

  useEffect(() => {
    const elapsed = Date.now() - startTime.current;
    const minTimePassed = elapsed >= 2000;
    const isConnected = connectionStatus === 'live' || connectionStatus === 'polling';
    
    // If we are fully ready, jump to 100 (if not already) and trigger exit
    if (isConnected && minTimePassed && progress === 100 && !isReady) {
      setIsReady(true);
      clearInterval(timerRef.current);
      // Exit without delay
      setTimeout(() => setCompleted(true), 100); 
    }
  }, [progress, connectionStatus, isReady]);

  // If completed, unmount preloader entirely
  if (completed) return null;

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          className="preloader-container"
          initial={{ y: 0 }}
          exit={{ 
            y: "-100%", 
            backgroundColor: ACCENT 
          }}
          transition={{ 
            duration: 1, 
            ease: [0.76, 0, 0.24, 1] // equivalent to power4.inOut
          }}
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
          <NetworkBackdrop />
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            
            {/* Animated Word Reveal */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '40px' }}>
              {letters.map((letter, i) => {
                // Determine if this letter should drop
                // Drop characters earlier so the last one falls by ~85% progress
                // This gives it time to settle before progress reaches 100%
                const threshold = (i + 1) * (85 / letters.length);
                const hasDropped = progress >= threshold;

                return (
                  <motion.span
                    key={i}
                    initial={{
                      y: -150,
                      opacity: 0,
                      rotate: i % 2 === 0 ? -15 : 15,
                      textShadow: `0 0 20px ${ACCENT}`,
                      color: ACCENT
                    }}
                    animate={
                      hasDropped
                        ? {
                            y: 0,
                            opacity: 1,
                            rotate: 0,
                            textShadow: `0 0 0px ${ACCENT}`,
                            color: 'var(--text-primary, #e2e8f0)'
                          }
                        : {}
                    }
                    transition={{
                      type: "spring",
                      bounce: 0.4,
                      damping: 12,
                      stiffness: 200,
                    }}
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      display: 'inline-block'
                    }}
                  >
                    {letter}
                  </motion.span>
                );
              })}
            </div>

            {/* Progress Counter */}
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
            
            {/* Rotating Status Messages */}
            <div style={{ 
                fontSize: '14px', 
                color: 'var(--text-muted, #64748b)', 
                marginTop: '16px', 
                letterSpacing: '0.02em',
                fontWeight: 500,
                height: '20px',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                width: '300px'
              }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: 'absolute' }}
                >
                  {currentMessage}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
