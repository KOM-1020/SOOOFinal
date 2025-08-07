import { useEffect, useRef, useState } from 'react';

interface MapWrapperProps {
  children: (containerRef: React.RefObject<HTMLDivElement>, isReady: boolean) => React.ReactNode;
  uniqueKey: string;
}

export default function MapWrapper({ children, uniqueKey }: MapWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reset ready state when key changes
    setIsReady(false);
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (containerRef.current) {
        setIsReady(true);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      setIsReady(false);
    };
  }, [uniqueKey]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px'
        }} 
      />
      {children(containerRef, isReady)}
    </div>
  );
}