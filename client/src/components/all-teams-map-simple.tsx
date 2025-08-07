import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getStaticCoordinates } from '../hooks/use-static-coordinates';
import { getTeamColor } from '../utils/team-colors';

interface AllTeamsMapProps {
  day: string;
  type: 'optimized' | 'original';
}

export default function AllTeamsMapSimple({ day, type }: AllTeamsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const { data: teamsData } = useQuery({
    queryKey: ['/api/teams-by-day', day],
    staleTime: 10 * 60 * 1000,
  });

  const teamsWithData = (teamsData as any)?.teams?.filter((team: any) => team.customerCount > 0) || [];

  const teamQueries = useQueries({
    queries: teamsWithData.map((team: any) => ({
      queryKey: ['/api/team-schedule', day, team.teamNumber],
      staleTime: 10 * 60 * 1000,
    }))
  });

  const allTeamsLoaded = teamQueries.every(query => query.isSuccess);
  const teamSchedules = teamQueries.map(query => query.data).filter(Boolean);

  useEffect(() => {
    if (!mapRef.current || !teamsWithData.length || !allTeamsLoaded) {
      return;
    }

    // Clear existing map and container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (error) {
        console.warn('Map cleanup error:', error);
      }
      mapInstanceRef.current = null;
    }
    
    // Ensure container is clean
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
    }

    // Small delay to ensure container is ready
    const timer = setTimeout(() => {
      import('leaflet').then((L) => {
        if (!mapRef.current) return;

        try {
          mapInstanceRef.current = L.map(mapRef.current).setView([42.0811751, -87.941361], 10);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);

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

          // Add team routes
          for (let i = 0; i < teamsWithData.length; i++) {
            const team = teamsWithData[i];
            const teamData = teamSchedules[i];
            
            if (!teamData) continue;
            
            const scheduleData = type === 'optimized' ? teamData.optimizedSchedule : teamData.originalSchedule;
            if (!scheduleData || scheduleData.length === 0) continue;

            const teamColor = getTeamColor(team.teamNumber);
            const routeCoords = [franchiseLocation];
            
            scheduleData.forEach((customer: any, index: number) => {
              const cleanAddress = customer.address?.replace(/\r/g, '').trim();
              const cleanCity = customer.city?.replace(/\r/g, '').trim();
              
              const geocodeResult = getStaticCoordinates(cleanAddress, cleanCity);
              
              if (geocodeResult) {
                const lat = geocodeResult.lat;
                const lng = geocodeResult.lon;
                routeCoords.push([lat, lng]);
                
                const customerIcon = L.divIcon({
                  html: `<div style="background: ${teamColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${team.teamNumber}</div>`,
                  className: 'custom-div-icon',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                });

                L.marker([lat, lng], { icon: customerIcon })
                  .addTo(mapInstanceRef.current)
                  .bindPopup(`
                    <div style="min-width: 200px;">
                      <div style="font-weight: bold; color: ${teamColor}; margin-bottom: 8px;">
                        Team ${team.teamNumber} - Stop ${index + 1}
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
            const validRouteCoords = routeCoords.filter(coords => coords.length === 2);
            if (validRouteCoords.length > 1) {
              const routeStyle = {
                color: teamColor,
                weight: 2,
                opacity: 0.7,
                dashArray: type === 'original' ? '5, 10' : undefined
              };

              L.polyline(validRouteCoords as any, routeStyle).addTo(mapInstanceRef.current);
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
  }, [day, type, teamsWithData, allTeamsLoaded, teamSchedules]);

  if (!isMapReady && (!teamsWithData.length || !allTeamsLoaded)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}