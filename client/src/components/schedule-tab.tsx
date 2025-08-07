import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import TeamDetailPopup from './team-detail-popup';
import RouteMap from './route-map';

interface ScheduleTabProps {
  stats: any;
}

interface TeamData {
  teamNumber: number;
  customerCount: number;
  customers?: any[];
  originalCustomers?: any[];
}

const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

// All 17 team numbers (0-16)
const ALL_TEAMS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

export default function ScheduleTab({ stats }: ScheduleTabProps) {
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedOptimizedTeam, setSelectedOptimizedTeam] = useState<number | null>(null);
  const [selectedOriginalTeam, setSelectedOriginalTeam] = useState<number | null>(null);
  const [showOptimizedTeamDetail, setShowOptimizedTeamDetail] = useState(false);
  const [showOriginalTeamDetail, setShowOriginalTeamDetail] = useState(false);

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['/api/teams-by-day', selectedDay],
  });

  // Query for individual optimized team data
  const { data: optimizedTeamDetailData, isLoading: isOptimizedTeamDetailLoading } = useQuery({
    queryKey: ['/api/team-schedule', selectedDay, selectedOptimizedTeam],
    enabled: showOptimizedTeamDetail && selectedOptimizedTeam !== null && selectedOptimizedTeam !== undefined,
  });

  // Query for individual original team data
  const { data: originalTeamDetailData, isLoading: isOriginalTeamDetailLoading } = useQuery({
    queryKey: ['/api/team-schedule', selectedDay, selectedOriginalTeam],
    enabled: showOriginalTeamDetail && selectedOriginalTeam !== null && selectedOriginalTeam !== undefined,
  });

  const getTeamData = (teamNumber: number): TeamData | null => {
    if (!teamsData || !(teamsData as any)?.teams) return null;
    return (teamsData as any).teams.find((team: TeamData) => team.teamNumber === teamNumber) || null;
  };

  const handleTeamClick = (teamNumber: number, scheduleType: 'optimized' | 'original') => {
    if (scheduleType === 'optimized') {
      setSelectedOptimizedTeam(teamNumber);
      setShowOptimizedTeamDetail(true);
    } else {
      setSelectedOriginalTeam(teamNumber);
      setShowOriginalTeamDetail(true);
    }
  };

  const handleBackToAllTeams = (scheduleType: 'optimized' | 'original') => {
    if (scheduleType === 'optimized') {
      setShowOptimizedTeamDetail(false);
      setSelectedOptimizedTeam(null);
    } else {
      setShowOriginalTeamDetail(false);
      setSelectedOriginalTeam(null);
    }
  };

  const renderTeamBox = (teamNumber: number, isOptimized: boolean) => {
    const teamData = getTeamData(teamNumber);
    const customers = isOptimized ? teamData?.customers : teamData?.originalCustomers;
    const hasData = customers && customers.length > 0;
    const colorClass = isOptimized 
      ? (hasData ? "bg-green-50 border-green-200 hover:bg-green-100" : "bg-gray-50 border-gray-200")
      : (hasData ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-gray-50 border-gray-200");
    const badgeClass = isOptimized ? "border-green-300 text-green-700" : "border-red-300 text-red-700";
    const detailClass = isOptimized ? "bg-green-100" : "bg-red-100";
    const textClass = isOptimized ? "text-green-800" : "text-red-800";
    const timeClass = isOptimized ? "text-green-600" : "text-red-600";

    return (
      <div
        key={teamNumber}
        onClick={() => hasData && handleTeamClick(teamNumber, isOptimized ? 'optimized' : 'original')}
        className={`p-1.5 border rounded-lg cursor-pointer transition-colors min-h-[80px] ${colorClass}`}
      >
        <div className="text-xs font-semibold text-gray-700 mb-1">
          Team {teamNumber}
        </div>
        {hasData ? (
          <div className="space-y-0.5">
            <div className="text-xs space-y-0.5">
              {customers.map((customer: any, idx: number) => (
                <div key={customer.customerId} className={`${detailClass} rounded px-1 py-0.5`}>
                  <div className={`font-medium ${timeClass}`}>{customer.startTime} - {customer.endTime}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400">No schedule</div>
        )}
      </div>
    );
  };

  const renderTeamGrid = (isOptimized: boolean) => (
    <div className="grid grid-cols-6 gap-1">
      {/* All 17 teams in 6-column grid */}
      {ALL_TEAMS.map((teamNumber) => renderTeamBox(teamNumber, isOptimized))}
    </div>
  );

  const renderIndividualTeamSchedule = (teamNumber: number, isOptimized: boolean) => {
    // Use detailed team data if available, fallback to summary data
    const teamDetailData = isOptimized ? optimizedTeamDetailData : originalTeamDetailData;
    const teamData = teamDetailData || getTeamData(teamNumber);
    const customers = isOptimized 
      ? (teamDetailData ? (teamDetailData as any).optimizedSchedule : teamData?.customers)
      : (teamDetailData ? (teamDetailData as any).originalSchedule : teamData?.originalCustomers);
    const hasData = customers && customers.length > 0;



    if (!hasData) {
      return (
        <div className="text-center py-12 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No route data</p>
          <p className="text-sm">Team {teamNumber} has no scheduled customers for {selectedDay}</p>
        </div>
      );
    }

    const colorClass = isOptimized ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
    const textClass = isOptimized ? "text-green-800" : "text-red-800";
    const timeClass = isOptimized ? "text-green-600" : "text-red-600";

    return (
      <div className="space-y-4">
        <div className={`p-4 border rounded-lg ${colorClass}`}>
          <div className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team {teamNumber} - {customers.length} customers
          </div>
          <div className="grid gap-3">
            {customers.map((customer: any, idx: number) => (
              <div key={customer.customerId} className="bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className={`font-medium ${timeClass}`}>
                    {customer.startTime} - {customer.endTime}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Customer {customer.customerId}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3" />
                    {customer.address?.replace(/\r/g, '').trim()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {customer.city?.replace(/\r/g, '').trim()}, {customer.serviceDurationMinutes || customer.duration || 'N/A'} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-page-container space-y-2 max-w-none w-full" style={{ transform: 'scale(0.65)', transformOrigin: 'top left' }}>
      {/* Header with Day Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule for July 7-13, 2025 (Franchise 372)
            </CardTitle>
            <div className="flex gap-1">
              {WEEKDAYS.map(day => (
                <Button
                  key={day.key}
                  variant={selectedDay === day.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(day.key)}
                  className={`min-w-[48px] text-xs px-2 py-1 h-7 ${
                    selectedDay === day.key 
                      ? 'bg-[#00365b] hover:bg-[#00365b] text-white border-[#00365b]' 
                      : 'hover:bg-[#BFBFBF] hover:text-black'
                  }`}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Layout: Left (Calendars) + Right (Maps) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full items-start">
        {/* Left Side - Schedule Calendars */}
        <div className="space-y-2 flex flex-col h-full">
          {/* Optimized Schedule Calendar */}
          <Card className="h-[455px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-green-700 text-base">
                {showOptimizedTeamDetail ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleBackToAllTeams('optimized')}
                      className="p-1 h-8 w-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    📅 Team {selectedOptimizedTeam} - Optimized Schedule
                  </div>
                ) : (
                  <>📅 Optimized Schedule - {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 overflow-hidden">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading teams...</p>
                </div>
              ) : showOptimizedTeamDetail ? (
                <div className="h-full overflow-y-auto pr-2">
                  {isOptimizedTeamDetailLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading team details...</p>
                    </div>
                  ) : (
                    renderIndividualTeamSchedule(selectedOptimizedTeam!, true)
                  )}
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  {renderTeamGrid(true)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original Schedule Calendar */}
          <Card className="h-[455px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-red-700 text-base">
                {showOriginalTeamDetail ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleBackToAllTeams('original')}
                      className="p-1 h-8 w-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    📅 Team {selectedOriginalTeam} - Original Schedule
                  </div>
                ) : (
                  <>📅 Original Schedule - {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 overflow-hidden">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading teams...</p>
                </div>
              ) : showOriginalTeamDetail ? (
                <div className="h-full overflow-y-auto pr-2">
                  {isOriginalTeamDetailLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading team details...</p>
                    </div>
                  ) : (
                    renderIndividualTeamSchedule(selectedOriginalTeam!, false)
                  )}
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  {renderTeamGrid(false)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Route Maps */}
        <div className="space-y-2 flex flex-col h-full">
          {/* Optimized Route Map */}
          <Card className="h-[455px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-green-700 text-base">
                {showOptimizedTeamDetail ? 
                  `🗺️ Team ${selectedOptimizedTeam} - Optimized Route` : 
                  `🗺️ Optimized Route - ${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}`
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
              <RouteMap 
                day={selectedDay} 
                type="optimized"
                selectedTeam={showOptimizedTeamDetail ? selectedOptimizedTeam : null}
              />
            </CardContent>
          </Card>

          {/* Original Route Map */}
          <Card className="h-[455px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-red-700 text-base">
                {showOriginalTeamDetail ? 
                  `🗺️ Team ${selectedOriginalTeam} - Original Route` : 
                  `🗺️ Original Route - ${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}`
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
              <RouteMap 
                day={selectedDay} 
                type="original"
                selectedTeam={showOriginalTeamDetail ? selectedOriginalTeam : null}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note: Team details now shown inline, popup removed */}
    </div>
  );
}