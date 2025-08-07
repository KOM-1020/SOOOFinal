import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TravelTimeChartProps {
  data: Array<{
    day: string;
    optimizedTravelTime: number;
    originalTravelTime: number;
    customerCount: number;
  }>;
}

export default function TravelTimeChart({ data }: TravelTimeChartProps) {
  const chartData = data.map(item => ({
    day: item.day.slice(0, 3).toUpperCase(), // Mon, Tue, etc.
    Original: item.originalTravelTime,
    Optimized: item.optimizedTravelTime,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis label={{ value: 'Travel Time (minutes)', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Original" fill="hsl(0, 84.2%, 60.2%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Optimized" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
