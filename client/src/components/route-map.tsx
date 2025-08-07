import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AllTeamsMapSimple from './all-teams-map-simple';
import IndividualTeamMap from './individual-team-map';
import { getTeamColor } from '../utils/team-colors';

interface RouteMapProps {
  day: string;
  type: 'optimized' | 'original';
  selectedTeam?: number | null;
}

export default function RouteMap({ day, type, selectedTeam: propSelectedTeam }: RouteMapProps) {
  const [selectedTeam, setSelectedTeam] = useState<number | null>(propSelectedTeam || null);
  const [showAllTeams, setShowAllTeams] = useState(true);
  
  // Get all teams for the day
  const { data: teamsData } = useQuery({
    queryKey: ['/api/teams-by-day', day],
  });

  // Get specific team schedule when a team is selected
  const { data: teamData } = useQuery({
    queryKey: ['/api/team-schedule', day, selectedTeam || propSelectedTeam],
    enabled: (selectedTeam !== null || propSelectedTeam !== null),
  });

  const scheduleData = teamData ? (type === 'optimized' ? (teamData as any).optimizedSchedule : (teamData as any).originalSchedule) : [];
  const effectiveSelectedTeam = propSelectedTeam ?? selectedTeam;
  
  // Debug logging for route map data flow
  if (effectiveSelectedTeam === 2 && day === 'tuesday' && type === 'original') {
    console.log('RouteMap data flow for Team 2 Tuesday Original:', {
      propSelectedTeam,
      selectedTeam,
      effectiveSelectedTeam,
      scheduleDataLength: scheduleData?.length,
      type,
      day,
      teamData,
      scheduleData: scheduleData?.map((item: any) => ({
        customerId: item.customerId,
        address: item.address,
        city: item.city,
        allFields: Object.keys(item || {})
      }))
    });
  }

  // When propSelectedTeam changes, update internal state
  React.useEffect(() => {
    if (propSelectedTeam !== undefined && propSelectedTeam !== null) {
      setSelectedTeam(propSelectedTeam);
      setShowAllTeams(false);
    } else {
      setShowAllTeams(true);
      setSelectedTeam(null);
    }
  }, [propSelectedTeam]);

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Geographical Map - Shows all teams by default, individual team when selected */}
      <div className="bg-white rounded-lg border flex-1" style={{ minHeight: '200px', position: 'relative' }}>
        {propSelectedTeam === null && selectedTeam === null ? (
          <div key={`all-teams-${day}-${type}`} style={{ width: '100%', height: '100%' }}>
            <AllTeamsMapSimple day={day} type={type} />
          </div>
        ) : (
          <div key={`team-${effectiveSelectedTeam}-${day}-${type}`} style={{ width: '100%', height: '100%' }}>
            <IndividualTeamMap
              selectedTeam={effectiveSelectedTeam}
              scheduleData={scheduleData}
              teamColor={effectiveSelectedTeam !== null ? getTeamColor(effectiveSelectedTeam) : '#666666'}
              type={type}
              day={day}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-600 space-y-2 flex-shrink-0 min-h-[60px]">
        <div className="flex items-center space-x-4 flex-wrap">
          <span className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
            Franchise Office
          </span>
          {(propSelectedTeam === null && showAllTeams) || (propSelectedTeam === null && selectedTeam === null) ? (
            <>
              <span className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2 bg-gray-400"></div>
                Team Numbers on Markers
              </span>
              <span className="flex items-center">
                <div 
                  className="w-4 h-1 mr-2 rounded bg-gray-400"
                  style={{ 
                    opacity: 0.7,
                    ...(type === 'original' ? { 
                      backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 2px, white 2px, white 4px)',
                      backgroundSize: '6px 1px'
                    } : {})
                  }}
                ></div>
                {type === 'optimized' ? 'Optimized Routes' : 'Original Routes'}
              </span>
            </>
          ) : effectiveSelectedTeam !== null && (
            <>
              <span className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: effectiveSelectedTeam !== null ? getTeamColor(effectiveSelectedTeam) : '#666666' }}
                ></div>
                Team {effectiveSelectedTeam} - {scheduleData?.length || 0} stops
              </span>
              <span className="flex items-center">
                <div 
                  className="w-4 h-1 mr-2 rounded"
                  style={{ 
                    backgroundColor: effectiveSelectedTeam !== null ? getTeamColor(effectiveSelectedTeam) : '#666666',
                    opacity: 0.7,
                    ...(type === 'original' ? { 
                      backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 2px, white 2px, white 4px)',
                      backgroundSize: '6px 1px'
                    } : {})
                  }}
                ></div>
                {type === 'optimized' ? 'Optimized Route' : 'Original Route'}
              </span>
            </>
          )}
        </div>
        <div className="text-gray-500">
          All Teams for {day}: Can view unique color routes and markers. Click any marker for customer details.
        </div>
      </div>
    </div>
  );
}