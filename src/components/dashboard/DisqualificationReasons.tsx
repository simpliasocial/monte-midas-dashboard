import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface DisqualificationReasonsProps {
  className?: string;
}

const data = [
  { reason: "Fuera de zona", count: 145, percentage: 42 },
  { reason: "Sin interés real", count: 98, percentage: 28 },
  { reason: "Precio no competitivo", count: 67, percentage: 19 },
  { reason: "Otros", count: 38, percentage: 11 },
];

const colors = [
  "hsl(0, 72%, 51%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 30%, 60%)",
  "hsl(220, 20%, 75%)",
];

export function DisqualificationReasons({ className }: DisqualificationReasonsProps) {
  return (
    <div className={cn("", className)}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="reason" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value} leads`, 'Cantidad']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.slice(0, 3).map((item, index) => (
          <div 
            key={item.reason}
            className="flex items-center gap-2 text-sm"
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index] }}
            />
            <span className="text-muted-foreground">{item.reason}:</span>
            <span className="font-semibold">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
