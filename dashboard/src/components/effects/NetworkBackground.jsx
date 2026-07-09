import { useEffect, useRef } from 'react';
import { ACCENT } from '../../lib/motion';

export default function NetworkBackground() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let lastTime = 0;
    const fpsInterval = 1000 / 30; // Cap at 30 FPS

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Create ~35 slow-drifting particles
    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2, // Very slow drift
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.5 + 0.5,
      // Opacity between 0.08 and 0.15
      opacity: Math.random() * 0.07 + 0.08,
    }));
    
    // Convert hex ACCENT to rgb for rgba usage
    // ACCENT is '#0d9488'
    let rgb = '13, 148, 136';
    if (ACCENT.startsWith('#')) {
      const hex = ACCENT.replace('#', '');
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      rgb = `${r}, ${g}, ${b}`;
    }
    
    const animate = (time) => {
      animId = requestAnimationFrame(animate);
      
      // Pause if tab is hidden to save CPU
      if (document.hidden) return;
      
      // Manual 30fps timing
      const elapsed = time - lastTime;
      if (elapsed < fpsInterval) return;
      
      // Adjust lastTime to maintain precise FPS
      lastTime = time - (elapsed % fpsInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap around instead of bouncing for a continuous infinite flow
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;
        ctx.fill();
      });
    };
    
    animId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
