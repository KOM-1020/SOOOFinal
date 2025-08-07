import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimeShiftChartProps {
  data: Array<{
    timeShift: number;
    customerCount: number;
  }>;
}

export default function TimeShiftChart({ data }: TimeShiftChartProps) {
  // Create complete range from -7 to +7 with zeros for missing values
  const createCompleteRange = () => {
    const dataMap = new Map(data.map(item => [item.timeShift, item.customerCount]));
    const completeData = [];
    
    for (let i = -7; i <= 7; i++) {
      completeData.push({
        dateShift: i > 0 ? `+${i}` : i.toString(),
        customers: dataMap.get(i) || 0,
      });
    }
    
    return completeData;
  };

  const chartData = createCompleteRange();

  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart 
        data={chartData}
        margin={{
          top: 10,
          right: 15,
          left: 15,
          bottom: 25,
        }}
        barCategoryGap="8%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
        <XAxis 
          dataKey="dateShift" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          label={{ value: 'Day', position: 'insideBottom', offset: -10, style: { fontSize: '12px', fill: '#6b7280' } }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280', textAnchor: 'middle' } }}
        />
        <Tooltip 
          labelFormatter={(label) => `Date Shift: ${label} days`}
          formatter={(value) => [`${value}`, 'Customers']}
        />
        <Bar 
          dataKey="customers" 
          fill="#00365b" 
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
