import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getStaticCoordinates } from '../hooks/use-static-coordinates';
import MapWrapper from './map-wrapper';

interface AllTeamsMapProps {
  day: string;
  type: 'optimized' | 'original';
}

// 17 distinct colors for the 17 teams
const TEAM_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE',
  '#A9DFBF', '#F9E79F'
];

export default function AllTeamsMap({ day, type }: AllTeamsMapProps) {
  const mapInstanceRef = useRef<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // Use static coordinates for instant reliable mapping
  
  const { data: teamsData } = useQuery({
    queryKey: ['/api/teams-by-day', day],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const teamsWithData = teamsData?.teams?.filter((team: any) => team.customerCount > 0) || [];

  // Preload all team schedules in parallel
  const teamQueries = useQueries({
    queries: teamsWithData.map((team: any) => ({
      queryKey: ['/api/team-schedule', day, team.teamNumber],
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    }))
  });

  const allTeamsLoaded = teamQueries.every(query => query.isSuccess);
  const teamSchedules = teamQueries.map(query => query.data).filter(Boolean);

  const initializeMap = (mapRef: React.RefObject<HTMLDivElement>, isReady: boolean) => {
    useEffect(() => {
      if (!mapRef.current || !isReady || !teamsWithData.length || !allTeamsLoaded) {
        return;
      }

    setIsMapLoading(true);

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

      // Initialize fresh map - Center on Mount Prospect area
      mapInstanceRef.current = L.map(mapRef.current!).setView([42.0811751, -87.941361], 10);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

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
        .bindPopup('Franchise 372 Office<br/>350 W Kensington Rd #105<br/>Mount Prospect, IL');

      // Process each team using preloaded data - no async needed since everything is cached
      for (let i = 0; i < teamsWithData.length; i++) {
        const team = teamsWithData[i];
        const teamData = teamSchedules[i];
        
        if (!teamData) continue;
        
        try {
          const scheduleData = type === 'optimized' ? teamData?.optimizedSchedule : teamData?.originalSchedule;
          
          if (!scheduleData || scheduleData.length === 0) continue;

          const teamColor = TEAM_COLORS[team.teamNumber] || '#666666';
          
          // Process customers instantly using preloaded geocoded addresses
          const routeCoords = [franchiseLocation];
          
          scheduleData.forEach((customer: any, index: number) => {
            try {
              // Clean up address formatting - handle both formats
              const cleanAddress = customer.address?.replace(/\r/g, '').trim();
              let cleanCity = customer.city?.replace(/\r/g, '').trim();
              
              // Handle different city formats (some have state already)
              if (cleanCity.includes(',')) {
                cleanCity = cleanCity.split(',')[0].trim();
              }
              if (cleanCity.includes(' IL')) {
                cleanCity = cleanCity.replace(' IL', '').trim();
              }
              
              console.log(`Processing customer ${customer.customerId}: ${cleanAddress}, ${cleanCity}`);
              
              // Get static coordinates for reliable mapping
              const geocodeResult = getStaticCoordinates(cleanAddress, cleanCity);
              
              if (geocodeResult) {
                // Create custom marker with team number
                const customerIcon = L.divIcon({
                  html: `<div style="background: ${teamColor}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${team.teamNumber}</div>`,
                  className: 'custom-div-icon',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });

                L.marker([geocodeResult.lat, geocodeResult.lon], { icon: customerIcon })
                  .addTo(mapInstanceRef.current)
                  .bindPopup(`
                    <div>
                      <strong>Team ${team.teamNumber} - Customer ${customer.customerId}</strong><br/>
                      ${cleanAddress}<br/>
                      ${cleanCity}<br/>
                      Time: ${customer.startTime} - ${customer.endTime}<br/>
                      Duration: ${customer.serviceDurationMinutes} min
                    </div>
                  `);

                // Add to route coordinates
                routeCoords.push([geocodeResult.lat, geocodeResult.lon]);
              } else {
                // Fallback to Mount Prospect area with grid offset
                const fallbackPos = {
                  lat: 42.0811751 + (index * 0.01),
                  lon: -87.941361 + (index * 0.01)
                };
                
                const customerIcon = L.divIcon({
                  html: `<div style="background: ${teamColor}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid orange; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${team.teamNumber}</div>`,
                  className: 'custom-div-icon',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });

                L.marker([fallbackPos.lat, fallbackPos.lon], { icon: customerIcon })
                  .addTo(mapInstanceRef.current)
                  .bindPopup(`
                    <div>
                      <strong>Team ${team.teamNumber} - Customer ${customer.customerId}</strong><br/>
                      <span style="color: orange;">⚠️ Address not found</span><br/>
                      ${cleanAddress}<br/>
                      ${cleanCity}<br/>
                      Time: ${customer.startTime} - ${customer.endTime}<br/>
                      Duration: ${customer.serviceDurationMinutes} min
                    </div>
                  `);

                routeCoords.push([fallbackPos.lat, fallbackPos.lon]);
              }
            } catch (error) {
              console.error(`Error processing customer for team ${team.teamNumber}:`, error);
            }
          });
          
          // Create route polyline for this team if there are customer locations
          if (routeCoords.length > 1) {
            L.polyline(routeCoords, {
              color: teamColor,
              weight: 2,
              opacity: 0.7,
              dashArray: type === 'original' ? '10, 10' : undefined
            }).addTo(mapInstanceRef.current);
          }
        } catch (error) {
          console.error(`Error processing team ${team.teamNumber}:`, error);
        }
      }

      // Auto-fit map to show all markers
      if (teamsWithData.length > 0) {
        mapInstanceRef.current.setView([42.0811751, -87.941361], 10);
      }
      
      setIsMapLoading(false);
    });

    // Cleanup function
    return () => {
      // Cleanup on unmount only
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn('Map cleanup error:', error);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [day, type, teamsWithData, allTeamsLoaded, teamSchedules]);

  if (!teamsWithData.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-lg font-medium">No team data</p>
          <p className="text-sm">No teams have schedules for {day}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg" style={{ height: '400px' }}>
      {(isMapLoading || !allTeamsLoaded) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">
              {isMapLoading ? 'Rendering map...' : 
               `Loading ${teamsWithData.length} teams...`}
            </p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
      />
    </div>
  );
}