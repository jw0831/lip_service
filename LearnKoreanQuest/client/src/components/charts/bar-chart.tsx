import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  color?: string;
  height?: number;
}

export default function CustomBarChart({ 
  data, 
  color = "hsl(217, 91%, 60%)",
  height = 300 
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 5.9%, 90%)" />
        <XAxis 
          dataKey="name" 
          stroke="hsl(25, 5.3%, 44.7%)"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(25, 5.3%, 44.7%)"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid hsl(20, 5.9%, 90%)',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Bar 
          dataKey="value" 
          fill={color}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
