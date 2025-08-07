import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailySlotsChartProps {
  data: Array<{
    day: string;
    optimizedSlots: number;
    originalSlots: number;
    customerCount: number;
  }>;
}

export default function DailySlotsChart({ data }: DailySlotsChartProps) {
  const chartData = data.map(item => ({
    day: item.day.charAt(0).toUpperCase() + item.day.slice(1),
    'Original Slots': item.originalSlots,
    'Optimized Slots': item.optimizedSlots,
  }));

  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart 
        data={chartData}
        margin={{
          top: 10,
          right: 15,
          left: 15,
          bottom: 25,
        }}
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
        />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line 
          type="monotone" 
          dataKey="Original Slots" 
          stroke="#00365b" 
          strokeWidth={2}
          dot={{ fill: '#00365b', strokeWidth: 1, r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="Optimized Slots" 
          stroke="#00abbd" 
          strokeWidth={2}
          dot={{ fill: '#00abbd', strokeWidth: 1, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
