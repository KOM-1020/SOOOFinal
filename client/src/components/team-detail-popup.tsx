import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CalendarCheck, Clock, MapPin } from 'lucide-react';

interface TeamDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  teamNumber: number | null;
  day: string;
  scheduleType: 'optimized' | 'original';
}

export default function TeamDetailPopup({ isOpen, onClose, teamNumber, day, scheduleType }: TeamDetailPopupProps) {
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['/api/team-schedule', day, teamNumber],
    enabled: isOpen && teamNumber !== null,
  });

  if (!isOpen) return null;

  const dayName = day.charAt(0).toUpperCase() + day.slice(1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {dayName} Schedule - Team {teamNumber} ({scheduleType === 'optimized' ? 'Optimized' : 'Original'})
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Loading team schedule...</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${scheduleType === 'optimized' ? 'text-green-700' : 'text-red-700'}`}>
                  <CalendarCheck className="h-5 w-5" />
                  Team {teamNumber} - {(scheduleType === 'optimized' ? teamData?.optimizedSchedule : teamData?.originalSchedule)?.length || 0} customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(scheduleType === 'optimized' ? teamData?.optimizedSchedule : teamData?.originalSchedule)?.length > 0 ? (
                  <div className="space-y-3">
                    {(scheduleType === 'optimized' ? teamData.optimizedSchedule : teamData.originalSchedule).map((schedule: any, index: number) => (
                      <div key={schedule.customerId} className={`${scheduleType === 'optimized' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border p-4 rounded-lg`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full ${scheduleType === 'optimized' ? 'bg-green-600' : 'bg-red-600'} text-white flex items-center justify-center text-sm font-bold mr-3`}>
                              {index + 1}
                            </div>
                            <span className={`font-semibold text-lg ${scheduleType === 'optimized' ? 'text-green-800' : 'text-red-800'}`}>Customer {schedule.customerId}</span>
                          </div>
                          <Badge variant="outline" className={`${scheduleType === 'optimized' ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'}`}>
                            {schedule.serviceDurationMinutes || schedule.duration || 'N/A'} min
                          </Badge>
                        </div>
                        <div className={`space-y-2 ${scheduleType === 'optimized' ? 'text-green-600' : 'text-red-600'}`}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium text-lg">{schedule.startTime} - {schedule.endTime}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <div>{schedule.address?.replace(/\r/g, '').trim()}</div>
                              <div>{schedule.city?.replace(/\r/g, '').trim()}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-lg font-medium">No schedule available</p>
                    <p className="text-sm">Team {teamNumber} has no assignments on {dayName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}