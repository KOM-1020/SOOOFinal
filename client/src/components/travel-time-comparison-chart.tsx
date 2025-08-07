import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TravelTimeComparisonChartProps {
  data: Array<{
    day: string;
    originalTravelTime: number;
    optimizedTravelTime: number;
    timeSaved: number;
    percentImprovement: number;
  }>;
}

export function TravelTimeComparisonChart({ data }: TravelTimeComparisonChartProps) {
  const chartData = data.map(item => ({
    day: item.day.charAt(0).toUpperCase() + item.day.slice(1, 3),
    'Original Schedule': Math.round(item.originalTravelTime),
    'Optimized Schedule': Math.round(item.optimizedTravelTime),
    timeSaved: item.timeSaved
  }));

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const originalTime = payload.find((p: any) => p.dataKey === 'Original Schedule')?.value || 0;
      const optimizedTime = payload.find((p: any) => p.dataKey === 'Optimized Schedule')?.value || 0;
      const saved = originalTime - optimizedTime;
      const percentSaved = originalTime > 0 ? Math.round((saved / originalTime) * 100) : 0;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-red-500 mr-2"></span>
              Original: {formatTime(originalTime)}
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-blue-500 mr-2"></span>
              Optimized: {formatTime(optimizedTime)}
            </p>
            <hr className="my-2" />
            <p className="text-sm font-semibold text-green-600">
              Time Saved: {formatTime(saved)} ({percentSaved}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 50,
        }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
        <XAxis 
          dataKey="day" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickFormatter={formatTime}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="rect"
        />
        <Bar 
          dataKey="Original Schedule" 
          fill="#ef4444" 
          radius={[2, 2, 0, 0]}
          name="Original Schedule"
        />
        <Bar 
          dataKey="Optimized Schedule" 
          fill="#3b82f6" 
          radius={[2, 2, 0, 0]}
          name="Optimized Schedule"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}