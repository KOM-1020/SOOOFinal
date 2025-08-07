import { useEffect, useRef, useState } from 'react';
import { getStaticCoordinates } from '../hooks/use-static-coordinates';

interface LeafletMapProps {
  selectedTeam: number | null;
  scheduleData: any[];
  teamColor: string;
  type: 'optimized' | 'original';
  day: string;
}

export default function LeafletMapSimple({ selectedTeam, scheduleData, teamColor, type, day }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  useEffect(() => {
    if (!mapRef.current) {
      console.warn('mapRef.current is null');
      return;
    }

    // Clear existing map
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (error) {
        console.warn('Map cleanup error:', error);
      }
      mapInstanceRef.current = null;
    }

    // Small delay to ensure container is ready
    const timer = setTimeout(() => {
      import('leaflet').then((L) => {
        if (!mapRef.current) return;

        try {
          console.log('Map data check:', {
            selectedTeam,
            scheduleDataLength: scheduleData?.length,
            scheduleData: scheduleData?.slice(0, 2),
            mapRefExists: !!mapRef.current
          });
          
          mapInstanceRef.current = L.map(mapRef.current).setView([42.0811751, -87.941361], 11);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);

          if (selectedTeam !== null && scheduleData && scheduleData.length > 0) {
            // Franchise office
            const franchiseLocation = [42.0811751, -87.941361];
            const franchiseIcon = L.divIcon({
              html: `<div style="background: #3B82F6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏢</div>`,
              className: 'custom-div-icon',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });

            L.marker([franchiseLocation[0], franchiseLocation[1]], { icon: franchiseIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('Franchise 372 Office');

            const routeCoords = [franchiseLocation];
            
            scheduleData.forEach((customer, index) => {
              const cleanAddress = customer.address?.replace(/\r/g, '').trim();
              const cleanCity = customer.city?.replace(/\r/g, '').trim();
              
              const geocodeResult = getStaticCoordinates(cleanAddress, cleanCity);
              
              if (geocodeResult) {
                const lat = geocodeResult.lat;
                const lng = geocodeResult.lon;
                routeCoords.push([lat, lng]);
                
                const customerIcon = L.divIcon({
                  html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                  className: 'custom-div-icon',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                });

                L.marker([lat, lng], { icon: customerIcon })
                  .addTo(mapInstanceRef.current)
                  .bindPopup(`
                    <div style="min-width: 200px;">
                      <div style="font-weight: bold; color: ${teamColor}; margin-bottom: 8px;">
                        Team ${selectedTeam} - Stop ${index + 1}
                      </div>
                      <div style="margin-bottom: 4px;">
                        <strong>Time:</strong> ${customer.startTime} - ${customer.endTime}
                      </div>
                      <div style="margin-bottom: 4px;">
                        <strong>Customer:</strong> ${customer.customerId}
                      </div>
                      <div style="margin-bottom: 4px;">
                        <strong>Address:</strong> ${cleanAddress}
                      </div>
                      <div style="margin-bottom: 4px;">
                        <strong>City:</strong> ${cleanCity}
                      </div>
                      <div>
                        <strong>Duration:</strong> ${customer.duration} min
                      </div>
                    </div>
                  `);
              }
            });

            // Add route line
            if (routeCoords.length > 1) {
              const routeStyle = {
                color: teamColor,
                weight: 3,
                opacity: 0.8,
                dashArray: type === 'original' ? '5, 10' : undefined
              };

              const validRouteCoords = routeCoords.filter(coords => coords.length === 2);
              if (validRouteCoords.length > 1) {
                L.polyline(validRouteCoords as any, routeStyle).addTo(mapInstanceRef.current);

                // Fit map to show all markers
                const markers = validRouteCoords.map(coords => L.marker([coords[0], coords[1]]));
                const group = new L.featureGroup(markers);
                mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
              }
            }
          }

          setIsMapReady(true);
        } catch (error) {
          console.error('Map initialization error:', error);
          setIsMapReady(true); // Still show something even if there's an error
        }
      }).catch(error => {
        console.error('Leaflet import error:', error);
        setIsMapReady(true);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn('Map cleanup error:', error);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [selectedTeam, scheduleData, teamColor, type, day]);

  // Force show map after 3 seconds regardless of ready state
  React.useEffect(() => {
    const forceShowTimer = setTimeout(() => {
      if (!isMapReady) {
        console.warn('Forcing map to show after timeout');
        setIsMapReady(true);
      }
    }, 3000);

    return () => clearTimeout(forceShowTimer);
  }, [isMapReady]);

  if (!isMapReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading map...</p>
          <p className="mt-1 text-xs text-gray-500">Team {selectedTeam} - {scheduleData?.length || 0} stops</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
}