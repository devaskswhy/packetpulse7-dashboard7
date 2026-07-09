import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * ViewportFreezer
 * 
 * Wraps heavy components (like Recharts) and uses IntersectionObserver to detect if they are visible.
 * When off-screen, it freezes the `dataProps` to prevent re-renders when high-frequency data arrives.
 * 
 * Usage:
 * <ViewportFreezer dataProps={{ stats, flows }}>
 *   {({ stats, flows }) => (
 *     <MyHeavyChart stats={stats} flows={flows} />
 *   )}
 * </ViewportFreezer>
 */
export default function ViewportFreezer({ children, dataProps, threshold = 0 }) {
  const containerRef = useRef(null);
  const [isInView, setIsInView] = useState(true); // Default true so it renders on mount
  const [frozenProps, setFrozenProps] = useState(dataProps);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '100px', // Buffer zone before it actually enters viewport
        threshold,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  // When in view, keep frozenProps synced with live dataProps.
  // When out of view, this effect is still called (because parent re-renders),
  // but we DON'T update frozenProps, preventing the children from updating.
  useEffect(() => {
    if (isInView) {
      setFrozenProps(dataProps);
    }
  }, [dataProps, isInView]);

  // Memoize the child rendering so it only re-renders when frozenProps changes
  const renderedChildren = useMemo(() => {
    return children(frozenProps);
  }, [frozenProps, children]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {renderedChildren}
    </div>
  );
}
