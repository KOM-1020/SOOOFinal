import { useEffect, useRef } from 'react';
import { usePreloadedGeocoding } from '../hooks/use-preloaded-geocoding';

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
  
  // Use preloaded geocoding for instant loading
  const { getCoordinates } = usePreloadedGeocoding(day);

  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Initialize map if not already done
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current!).setView([42.0451, -87.6877], 11); // Chicago area

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing markers
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer.options && layer.options.pane === 'markerPane') {
          mapInstanceRef.current.removeLayer(layer);
        }
      });

      if (selectedTeam !== null && scheduleData && scheduleData.length > 0) {
        // Franchise office location (approximate Chicago area)
        const franchiseLocation = [42.0451, -87.6877];
        
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
          
          // Try multiple cached address formats
          const addressFormats = [
            `${cleanAddress}, ${cleanCity}, Illinois, USA`,
            `${cleanAddress}, ${cleanCity}, IL, USA`,
            `${cleanAddress}, ${cleanCity}, IL`,
            `${cleanAddress}, ${cleanCity}`,
            cleanAddress.includes('Apt') ? `${cleanAddress.split('Apt')[0].trim()}, ${cleanCity}, IL` : null,
            cleanAddress.includes('Ct') ? `${cleanAddress.replace('Ct', 'Court')}, ${cleanCity}, IL` : null,
          ].filter(Boolean);

          let geocodeResult = null;
          
          // Find the first cached result
          for (const addressFormat of addressFormats) {
            geocodeResult = getCoordinates(addressFormat);
            if (geocodeResult) break;
          }
          
          if (geocodeResult) {
            // Create numbered customer marker
            const customerIcon = L.divIcon({
              html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
              className: 'custom-div-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([geocodeResult.lat, geocodeResult.lon], { icon: customerIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup(`
                <div>
                  <strong>Customer ${customer.customerId}</strong><br/>
                  ${cleanAddress}<br/>
                  ${cleanCity}<br/>
                  Time: ${customer.startTime} - ${customer.endTime}<br/>
                  Duration: ${customer.serviceDurationMinutes} min
                </div>
              `);

            routeCoords.push([geocodeResult.lat, geocodeResult.lon]);
          } else {
            // Fallback position if geocoding fails
            const fallbackPositions = [
              { lat: 42.0451, lon: -87.6877 },
              { lat: 42.0551, lon: -87.6777 },
              { lat: 42.0351, lon: -87.6977 },
              { lat: 42.0651, lon: -87.6677 },
              { lat: 42.0251, lon: -87.7077 }
            ];
            
            const fallbackPos = fallbackPositions[index % fallbackPositions.length];
            
            // Create marker with fallback position and warning
            const customerIcon = L.divIcon({
              html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid orange; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
              className: 'custom-div-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([fallbackPos.lat, fallbackPos.lon], { icon: customerIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup(`
                <div>
                  <strong>Customer ${customer.customerId}</strong><br/>
                  <span style="color: orange;">⚠️ Address not found in map</span><br/>
                  ${cleanAddress}<br/>
                  ${cleanCity}<br/>
                  Time: ${customer.startTime} - ${customer.endTime}<br/>
                  Duration: ${customer.serviceDurationMinutes} min<br/>
                  <small><em>Approximate location shown</em></small>
                </div>
              `);

            routeCoords.push([fallbackPos.lat, fallbackPos.lon]);
          }
        });

        // Create route polyline if there are customer locations
        if (routeCoords.length > 1) {
          L.polyline(routeCoords, {
            color: teamColor,
            weight: 3,
            opacity: 0.8,
            dashArray: type === 'original' ? '10, 10' : undefined
          }).addTo(mapInstanceRef.current);
        }

        // Geocode addresses and add customer markers with better error handling
        const geocodePromises = scheduleData.map(async (customer, index) => {
          try {
            // Clean up address formatting
            const cleanAddress = customer.address?.replace(/\r/g, '').trim();
            const cleanCity = customer.city?.replace(/\r/g, '').trim();
            
            // Try multiple address formats for better geocoding success
            const addressFormats = [
              `${cleanAddress}, ${cleanCity}, Illinois, USA`,
              `${cleanAddress}, ${cleanCity}, IL, USA`,
              `${cleanAddress}, ${cleanCity}, IL`,
              `${cleanAddress}, ${cleanCity}`,
              // For problematic addresses, try without apartment numbers
              cleanAddress.includes('Apt') ? `${cleanAddress.split('Apt')[0].trim()}, ${cleanCity}, IL` : null,
              cleanAddress.includes('Ct') ? `${cleanAddress.replace('Ct', 'Court')}, ${cleanCity}, IL` : null,
              `${cleanCity}, Illinois, USA`
            ].filter(Boolean);

            let geocodeResult = null;
            
            for (const addressFormat of addressFormats) {
              try {
                console.log(`Trying to geocode customer ${customer.customerId}: ${addressFormat}`);
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressFormat)}&limit=1&countrycodes=us&addressdetails=1`,
                  {
                    headers: {
                      'User-Agent': 'TCA-Schedule-Optimizer'
                    }
                  }
                );
                
                // Add small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const data = await response.json();
                
                if (data && data.length > 0) {
                  geocodeResult = {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                  };
                  console.log(`Successfully geocoded customer ${customer.customerId} with ${addressFormat}:`, geocodeResult);
                  break;
                }
              } catch (formatError) {
                console.warn(`Failed format ${addressFormat}:`, formatError);
                continue;
              }
            }
            
            if (geocodeResult) {
              // Create custom marker
              const customerIcon = L.divIcon({
                html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                className: 'custom-div-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              const marker = L.marker([geocodeResult.lat, geocodeResult.lon], { icon: customerIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`
                  <div>
                    <strong>Customer ${customer.customerId}</strong><br/>
                    ${cleanAddress}<br/>
                    ${cleanCity}<br/>
                    Time: ${customer.startTime} - ${customer.endTime}<br/>
                    Duration: ${customer.serviceDurationMinutes} min
                  </div>
                `);

              return { lat: geocodeResult.lat, lon: geocodeResult.lon, index, customer };
            } else {
              console.error(`Failed to geocode customer ${customer.customerId}: ${cleanAddress}, ${cleanCity}`);
              
              // If all geocoding attempts fail, use a fallback position near the Chicago area
              // This ensures all customers appear on the map even if geocoding fails
              const fallbackPositions = [
                { lat: 42.0451, lon: -87.6877 }, // Chicago area
                { lat: 42.0551, lon: -87.6777 },
                { lat: 42.0351, lon: -87.6977 },
                { lat: 42.0651, lon: -87.6677 },
                { lat: 42.0251, lon: -87.7077 }
              ];
              
              const fallbackPos = fallbackPositions[index % fallbackPositions.length];
              
              // Create marker with fallback position and warning
              const customerIcon = L.divIcon({
                html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid orange; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                className: 'custom-div-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              const marker = L.marker([fallbackPos.lat, fallbackPos.lon], { icon: customerIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`
                  <div>
                    <strong>Customer ${customer.customerId}</strong><br/>
                    <span style="color: orange;">⚠️ Address not found in map</span><br/>
                    ${cleanAddress}<br/>
                    ${cleanCity}<br/>
                    Time: ${customer.startTime} - ${customer.endTime}<br/>
                    Duration: ${customer.serviceDurationMinutes} min<br/>
                    <small><em>Approximate location shown</em></small>
                  </div>
                `);

              return { lat: fallbackPos.lat, lon: fallbackPos.lon, index, customer, isFallback: true };
            }
          } catch (error) {
            console.error(`Geocoding error for customer ${customer.customerId}:`, error);
          }
          return null;
        });

        // Wait for geocoding and draw routes
        Promise.all(geocodePromises).then((coordinates) => {
          const validCoords = coordinates.filter(coord => coord !== null);
          
          if (validCoords.length > 0) {
            // Create route polyline
            const routeCoords = [
              franchiseLocation,
              ...validCoords.map(coord => [coord!.lat, coord!.lon])
            ];

            const polyline = L.polyline(routeCoords, {
              color: teamColor,
              weight: 3,
              opacity: 0.8,
              dashArray: type === 'original' ? '10, 10' : undefined
            }).addTo(mapInstanceRef.current);

            // Fit map to show all markers
            const group = new L.featureGroup([...validCoords.map(coord => L.marker([coord!.lat, coord!.lon]))]);
            mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
          }
        });
      }
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedTeam, scheduleData, teamColor, type]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg"
      style={{ height: '400px' }}
    />
  );
}