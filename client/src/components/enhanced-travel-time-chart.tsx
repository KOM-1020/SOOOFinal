import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';

interface EnhancedTravelTimeChartProps {
  metricType: 'total' | 'average' | 'median';
  viewType: 'day' | 'team';
  dailyStats: Array<{
    day: string;
    originalTravelTime: number;
    optimizedTravelTime: number;
    timeSaved: number;
    percentImprovement: number;
  }>;
}

export function EnhancedTravelTimeChart({ metricType, viewType, dailyStats }: EnhancedTravelTimeChartProps) {
  // Fetch analysis data based on current selections
  const { data: analysisData } = useQuery({
    queryKey: [`/api/travel-time-analysis/${metricType}/${viewType}`],
    enabled: true
  });

  const formatTime = (value: number) => {
    if (metricType === 'total') {
      // For total metric, values are in hours
      return `${value.toFixed(2)}h`;
    } else {
      // For average/median metrics, values are in minutes
      const hours = Math.floor(value / 60);
      const mins = Math.round(value % 60);
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${Math.round(value)}m`;
    }
  };

  const formatAxisTime = (value: number) => {
    if (metricType === 'total') {
      // For total metric, values are in hours
      return `${Math.round(value)}h`;
    } else {
      // For average/median metrics, values are in minutes
      const hours = Math.floor(value / 60);
      if (hours > 0) {
        return `${hours}h`;
      }
      return `${Math.round(value)}m`;
    }
  };

  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  // Use data from API or fallback to existing daily stats for total by day
  const getChartData = () => {
    if (analysisData) {
      return analysisData;
    }
    
    // Fallback for total by day using existing dailyStats
    if (viewType === 'day' && metricType === 'total') {
      return dailyStats.map(item => ({
        name: item.day.charAt(0).toUpperCase() + item.day.slice(1, 3),
        'Original Schedule': Math.round(item.originalTravelTime),
        'Optimized Schedule': Math.round(item.optimizedTravelTime),
        timeSaved: Math.round(item.originalTravelTime - item.optimizedTravelTime)
      }));
    }
    
    return [];
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const originalTime = payload.find((p: any) => p.dataKey === 'Original Schedule')?.value || 0;
      const optimizedTime = payload.find((p: any) => p.dataKey === 'Optimized Schedule')?.value || 0;
      const saved = originalTime - optimizedTime;
      const percentSaved = originalTime > 0 ? ((saved / originalTime) * 100) : 0;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 mr-2" style={{ backgroundColor: '#00365b' }}></span>
              Original: {formatTime(originalTime)}
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 mr-2" style={{ backgroundColor: '#00abbd' }}></span>
              Optimized: {formatTime(optimizedTime)}
            </p>
            <hr className="my-2" />
            <p className={`text-sm font-semibold ${saved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Time Saved: {formatTime(saved)} ({percentSaved.toFixed(2)}%)
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
        data={chartData || []}
        margin={{
          top: 20,
          right: 10,
          left: 0,
          bottom: 20,
        }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickFormatter={formatAxisTime}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '10px', fontSize: '12px', paddingLeft: '30px' }}
          iconType="rect"
        />
        <Bar 
          dataKey="Original Schedule" 
          fill="#00365b" 
          radius={[2, 2, 0, 0]}
          name="Original Schedule"
        />
        <Bar 
          dataKey="Optimized Schedule" 
          fill="#00abbd" 
          radius={[2, 2, 0, 0]}
          name="Optimized Schedule"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}