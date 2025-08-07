import { Badge } from "@/components/ui/badge";

interface ScheduleCalendarProps {
  type: 'optimized' | 'original';
  selectedDay: string;
  customerCount: number;
}

export default function ScheduleCalendar({ type, selectedDay, customerCount }: ScheduleCalendarProps) {
  const isOptimized = type === 'optimized';
  const bgColor = isOptimized ? 'bg-blue-100' : 'bg-red-100';
  const selectedBgColor = isOptimized ? 'bg-primary' : 'bg-destructive';
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = [7, 8, 9, 10, 11, 12, 13];
  
  const selectedDayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(selectedDay);

  return (
    <div className="mini-calendar mb-4">
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, index) => (
          <div key={day} className="text-xs font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
        {dates.map((date, index) => (
          <div
            key={date}
            className={`text-sm p-2 rounded font-medium ${
              index === selectedDayIndex 
                ? `${selectedBgColor} text-white` 
                : `${bgColor}`
            }`}
          >
            {date}
          </div>
        ))}
      </div>
    </div>
  );
}
