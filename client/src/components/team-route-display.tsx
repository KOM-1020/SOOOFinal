import React from 'react';

interface TeamRouteDisplayProps {
  selectedTeam: number | null;
  scheduleData: any[];
  teamColor: string;
  type: 'optimized' | 'original';
  day: string;
}

export default function TeamRouteDisplay({ selectedTeam, scheduleData, teamColor, type, day }: TeamRouteDisplayProps) {
  if (selectedTeam === null) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <div className="text-4xl text-gray-400 mb-4">📍</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Team Selected</h3>
          <p className="text-gray-500">Click on a team to view their route</p>
        </div>
      </div>
    );
  }

  if (!scheduleData || scheduleData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white border border-gray-200 rounded-lg">
        <div className="text-center">
          <div className="text-4xl text-gray-400 mb-4">📍</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Route Data</h3>
          <p className="text-gray-500">Team {selectedTeam} has no scheduled customers for {day}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200" style={{ backgroundColor: `${teamColor}20` }}>
        <h3 className="text-lg font-semibold mb-1" style={{ color: teamColor }}>
          Team {selectedTeam} Route
        </h3>
        <p className="text-sm text-gray-600">
          {scheduleData.length} customer stops on {day}
        </p>
      </div>

      {/* Route List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {scheduleData.map((customer: any, index: number) => (
            <div 
              key={`${customer.customerId}-${index}`}
              className="bg-gray-50 rounded-lg p-3 border-l-4"
              style={{ borderLeftColor: teamColor }}
            >
              {/* Stop Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm" style={{ color: teamColor }}>
                  Stop {index + 1}
                </span>
                <span 
                  className="px-2 py-1 rounded-full text-xs text-white font-medium"
                  style={{ backgroundColor: teamColor }}
                >
                  {customer.startTime} - {customer.endTime}
                </span>
              </div>

              {/* Customer Details */}
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Customer:</span> {customer.customerId}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Address:</span> {customer.address?.replace(/\r/g, '')}
                </div>
                <div>
                  <span className="font-medium text-gray-700">City:</span> {customer.city?.replace(/\r/g, '')}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span> {customer.serviceDurationMinutes || customer.duration || 'N/A'} minutes
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          🏢 All routes start and end at Franchise 372 Office
        </p>
      </div>
    </div>
  );
}