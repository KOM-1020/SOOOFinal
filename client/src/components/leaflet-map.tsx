import { useEffect, useRef } from 'react';
import { getStaticCoordinates } from '../hooks/use-static-coordinates';

interface LeafletMapProps {
  selectedTeam: number | null;
  scheduleData: any[];
  teamColor: string;
  type: 'optimized' | 'original';
  day: string;
}

export default function LeafletMap({ selectedTeam, scheduleData, teamColor, type, day }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Always recreate map to prevent container conflicts
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }

      // Initialize fresh map
      if (mapRef.current) {
        try {
          mapInstanceRef.current = L.map(mapRef.current).setView([42.0811751, -87.941361], 11);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);
        } catch (error) {
          console.warn('Map initialization error:', error);
          return;
        }
      }

      if (selectedTeam !== null && scheduleData && scheduleData.length > 0) {
        // Franchise office location - 350 W Kensington Rd #105, Mount Prospect
        const franchiseLocation = [42.0811751, -87.941361];
        
        // Add franchise office marker
        const franchiseIcon = L.divIcon({
          html: `<div style="background: #3B82F6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏢</div>`,
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker(franchiseLocation, { icon: franchiseIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Franchise 372 Office');

        // Use preloaded geocoding for instant rendering
        const routeCoords = [franchiseLocation];
        
        scheduleData.forEach((customer, index) => {
          // Clean up address formatting
          const cleanAddress = customer.address?.replace(/\r/g, '').trim();
          const cleanCity = customer.city?.replace(/\r/g, '').trim();
          
          // Get static coordinates for reliable mapping
          const geocodeResult = getStaticCoordinates(cleanAddress, cleanCity);
          
          if (geocodeResult.coordinates) {
            const [lat, lng] = geocodeResult.coordinates;
            routeCoords.push([lat, lng]);
            
            // Create custom marker with team color
            const customerIcon = L.divIcon({
              html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
              className: 'custom-div-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            // Add customer marker
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

        // Add route line if we have coordinates
        if (routeCoords.length > 1) {
          const routeStyle = {
            color: teamColor,
            weight: 3,
            opacity: 0.8,
            dashArray: type === 'original' ? '5, 10' : undefined
          };

          L.polyline(routeCoords, routeStyle)
            .addTo(mapInstanceRef.current);
        }

        // Fit map to show all markers
        if (routeCoords.length > 1) {
          const group = new L.featureGroup(
            routeCoords.map(coords => L.marker(coords))
          );
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
        }
      }
    }).catch(error => {
      console.error('Error loading Leaflet:', error);
    });

    // Cleanup function - only remove on component unmount
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn('Map cleanup error:', error);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [selectedTeam, scheduleData, teamColor, type, day]); // Dependencies for re-rendering content only

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}