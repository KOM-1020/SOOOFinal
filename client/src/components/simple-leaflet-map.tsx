import React, { useEffect, useRef, useState } from 'react';
import { getStaticCoordinates } from '../hooks/use-static-coordinates';

interface SimpleLeafletMapProps {
  selectedTeam: number | null;
  scheduleData: any[];
  teamColor: string;
  type: 'optimized' | 'original';
  day: string;
}

export default function SimpleLeafletMap({ selectedTeam, scheduleData, teamColor, type, day }: SimpleLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    console.log('=== SimpleLeafletMap Debug ===');
    console.log('Props received:', {
      selectedTeam,
      scheduleDataLength: scheduleData?.length,
      scheduleDataType: typeof scheduleData,
      scheduleDataIsArray: Array.isArray(scheduleData),
      hasMapRef: !!mapRef.current,
      teamColor,
      type,
      day
    });
    
    if (scheduleData) {
      console.log('First customer:', scheduleData[0]);
    }

    setDebugInfo(`Team ${selectedTeam}, ${scheduleData?.length || 0} customers`);
    
    if (!mapRef.current) {
      setDebugInfo('No map container');
      setMapStatus('error');
      return;
    }

    // Clear any existing map content
    mapRef.current.innerHTML = '';
    
    // Set loading state
    setMapStatus('loading');

    // Simple timeout to show the map container
    const timer = setTimeout(() => {
      console.log('Timer executed, checking conditions:', {
        hasMapRef: !!mapRef.current,
        selectedTeam,
        hasScheduleData: !!scheduleData,
        scheduleDataLength: scheduleData?.length
      });
      
      if (mapRef.current) {
        // Force show something regardless of conditions for debugging
        console.log('About to render - Final check:', {
          selectedTeamNotNull: selectedTeam !== null,
          hasScheduleData: !!scheduleData,
          scheduleDataLength: scheduleData?.length,
          allConditionsMet: selectedTeam !== null && scheduleData && scheduleData.length > 0
        });
        
        // Create proper route display
        if (selectedTeam !== null && scheduleData && scheduleData.length > 0) {
          mapRef.current.innerHTML = `
            <div style="padding: 20px; height: 100%; background: white; border: 1px solid #ddd; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: ${teamColor}; margin: 0 0 10px 0;">Team ${selectedTeam} Route</h3>
                <p style="margin: 0; color: #666;">${scheduleData.length} customer stops on ${day}</p>
              </div>
              
              <div style="max-height: 300px; overflow-y: auto;">
                ${scheduleData.map((customer: any, index: number) => `
                  <div style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${teamColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <strong style="color: ${teamColor};">Stop ${index + 1}</strong>
                      <span style="background: ${teamColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                        ${customer.startTime} - ${customer.endTime}
                      </span>
                    </div>
                    <div style="font-size: 14px; margin-bottom: 4px;">
                      <strong>Customer:</strong> ${customer.customerId}
                    </div>
                    <div style="font-size: 14px; margin-bottom: 4px;">
                      <strong>Address:</strong> ${customer.address?.replace(/\r/g, '')}
                    </div>
                    <div style="font-size: 14px; margin-bottom: 4px;">
                      <strong>City:</strong> ${customer.city?.replace(/\r/g, '')}
                    </div>
                    <div style="font-size: 14px;">
                      <strong>Duration:</strong> ${customer.serviceDurationMinutes || customer.duration || 'N/A'} minutes
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
                <p style="margin: 0;">🏢 All routes start and end at Franchise 372 Office</p>
              </div>
            </div>
          `;
        } else {
          mapRef.current.innerHTML = `
            <div style="padding: 40px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; background: white; border: 1px solid #ddd; border-radius: 8px;">
              <div style="color: #999; font-size: 48px; margin-bottom: 20px;">📍</div>
              <h3 style="color: #666; margin-bottom: 10px;">No Route Data</h3>
              <p style="color: #999; margin: 0;">Team ${selectedTeam} has no scheduled customers for ${day}</p>
            </div>
          `;
        }
        
        /*
        // Original conditional logic - commented for debugging
        if (selectedTeam !== null && scheduleData && scheduleData.length > 0) {
          console.log('Rendering team data for team:', selectedTeam);
          mapRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
              <h3 style="color: ${teamColor}; margin-bottom: 10px;">Team ${selectedTeam} Route</h3>
              <p style="margin-bottom: 10px;">${scheduleData.length} customer stops</p>
              <div style="text-align: left; max-width: 300px; margin: 0 auto;">
                ${scheduleData.slice(0, 3).map((customer: any, i: number) => `
                  <div style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                    <strong>Stop ${i + 1}:</strong> ${customer.startTime} - ${customer.endTime}<br>
                    <small>${customer.address}, ${customer.city?.replace(/\r/g, '')}</small>
                  </div>
                `).join('')}
                ${scheduleData.length > 3 ? `<p><em>... and ${scheduleData.length - 3} more stops</em></p>` : ''}
              </div>
            </div>
          `;
        } else {
          console.log('No data case - team:', selectedTeam, 'scheduleData:', scheduleData);
          mapRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
              <h3>No Route Data</h3>
              <p>Team ${selectedTeam} has no scheduled customers for ${day}</p>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Debug: Team=${selectedTeam}, DataLength=${scheduleData?.length || 0}
              </p>
            </div>
          `;
        }
        */
        setMapStatus('ready');
      }
    }, 100); // Reduced timeout for faster debugging

    return () => {
      clearTimeout(timer);
    };
  }, [selectedTeam, scheduleData, teamColor, type, day]);

  if (mapStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading route...</p>
          <p className="mt-1 text-xs text-gray-500">{debugInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px'
      }} 
    />
  );
}