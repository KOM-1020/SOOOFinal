import React, { useEffect, useRef } from 'react';
import { getStaticCoordinates } from '../hooks/use-static-coordinates';

interface IndividualTeamMapProps {
  selectedTeam: number | null;
  scheduleData: any[];
  teamColor: string;
  type: 'optimized' | 'original';
  day: string;
}

export default function IndividualTeamMap({ selectedTeam, scheduleData, teamColor, type, day }: IndividualTeamMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  console.log(`IndividualTeamMap rendering: Team ${selectedTeam}, ${scheduleData?.length || 0} customers, type: ${type}`, {
    scheduleData: scheduleData?.slice(0, 3).map(item => ({
      customerId: item?.customerId,
      address: item?.address,
      city: item?.city,
      startTime: item?.startTime,
      endTime: item?.endTime
    }))
  });

  useEffect(() => {
    if (!mapRef.current || selectedTeam === null || !scheduleData || scheduleData.length === 0) {
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; background: #f9f9f9;">
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">📍</div>
              <h3 style="margin: 0 0 8px 0;">No Route Data</h3>
              <p style="margin: 0; font-size: 14px;">Team ${selectedTeam} has no customers for ${day}</p>
            </div>
          </div>
        `;
      }
      return;
    }

    console.log(`Creating map for Team ${selectedTeam} with ${scheduleData.length} customers`);

    // Import Leaflet dynamically
    import('leaflet').then(L => {
      if (!mapRef.current) return;

      // Clear any existing content and ensure container is ready
      mapRef.current.innerHTML = '';
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (!mapRef.current) return;
        
        try {
          // Create map
          const map = L.map(mapRef.current).setView([42.0811751, -87.941361], 11);

          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Franchise office
          const franchiseLocation = [42.0811751, -87.941361] as [number, number];
          
          const franchiseIcon = L.divIcon({
            html: `<div style="background: #3B82F6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏢</div>`,
            className: 'custom-div-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          L.marker(franchiseLocation, { icon: franchiseIcon })
            .addTo(map)
            .bindPopup('Franchise 372 Office<br/>350 W Kensington Rd #105<br/>Mount Prospect, IL');

          // Route coordinates starting from franchise
          const routeCoords: [number, number][] = [franchiseLocation];
          const markers: any[] = [];

          // Add customer stops
          scheduleData.forEach((customer: any, index: number) => {
            const cleanAddress = customer.address?.replace(/\r/g, '').trim();
            const cleanCity = customer.city?.replace(/\r/g, '').trim();
            
            console.log(`IndividualTeamMap Customer ${index + 1}:`, {
              customerId: customer.customerId,
              originalAddress: customer.address,
              cleanAddress,
              originalCity: customer.city,
              cleanCity,
              allFields: Object.keys(customer)
            });
            
            const geocodeResult = getStaticCoordinates(cleanAddress, cleanCity);
            
            if (geocodeResult && geocodeResult.lat && geocodeResult.lon) {
              const customerLocation: [number, number] = [geocodeResult.lat, geocodeResult.lon];
              routeCoords.push(customerLocation);
              
              // Create numbered customer marker
              const customerIcon = L.divIcon({
                html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                className: 'custom-div-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              const marker = L.marker(customerLocation, { icon: customerIcon })
                .addTo(map)
                .bindPopup(`
                  <div style="min-width: 180px;">
                    <div style="font-weight: bold; color: ${teamColor}; margin-bottom: 6px;">
                      Team ${selectedTeam} - Stop ${index + 1}
                    </div>
                    <div style="margin-bottom: 3px; font-size: 13px;">
                      <strong>Time:</strong> ${customer.startTime || 'N/A'} - ${customer.endTime || 'N/A'}
                    </div>
                    <div style="margin-bottom: 3px; font-size: 13px;">
                      <strong>Customer:</strong> ${customer.customerId || 'N/A'}
                    </div>
                    <div style="margin-bottom: 3px; font-size: 13px;">
                      <strong>Address:</strong> ${customer.address || cleanAddress || 'No address'}
                    </div>
                    <div style="margin-bottom: 3px; font-size: 13px;">
                      <strong>City:</strong> ${customer.city || cleanCity || 'No city'}
                    </div>
                    <div style="font-size: 13px;">
                      <strong>Duration:</strong> ${customer.serviceDurationMinutes || customer.duration || 'N/A'} min
                    </div>
                  </div>
                `);
              
              markers.push(marker);
            }
          });

          // Draw route line
          if (routeCoords.length > 1) {
            const routeStyle = {
              color: teamColor,
              weight: 3,
              opacity: 0.8,
              dashArray: type === 'original' ? '8, 8' : undefined
            };

            L.polyline(routeCoords, routeStyle).addTo(map);
          }

          // Fit bounds to show all markers
          if (markers.length > 0) {
            const allMarkers = [L.marker(franchiseLocation), ...markers];
            const group = new (L as any).featureGroup(allMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
          }

          console.log(`Map created successfully for Team ${selectedTeam}`);

        } catch (error) {
          console.error('Error creating individual team map:', error);
          if (mapRef.current) {
            mapRef.current.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; background: #f9f9f9;">
                <div style="text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                  <h3 style="margin: 0 0 8px 0;">Map Error</h3>
                  <p style="margin: 0; font-size: 14px;">Unable to load map for Team ${selectedTeam}</p>
                </div>
              </div>
            `;
          }
        }
      }, 100);
    }).catch(error => {
      console.error('Error importing Leaflet:', error);
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #dc2626;">
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
              <h3 style="margin: 0 0 8px 0;">Map Error</h3>
              <p style="margin: 0; font-size: 14px;">Could not load map</p>
            </div>
          </div>
        `;
      }
    });

  }, [selectedTeam, scheduleData, teamColor, type, day]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '350px',
        position: 'relative'
      }} 
    />
  );
}