import { useEffect, useRef, useState } from 'react';

interface StableMapContainerProps {
  children: (mapRef: React.RefObject<HTMLDivElement>) => React.ReactNode;
  mapKey: string;
}

export default function StableMapContainer({ children, mapKey }: StableMapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [containerReady, setContainerReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure container is properly mounted
    const timeout = setTimeout(() => {
      setContainerReady(true);
    }, 10);

    return () => clearTimeout(timeout);
  }, [mapKey]);

  return (
    <div key={mapKey} style={{ width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {containerReady && children(mapRef)}
    </div>
  );
}