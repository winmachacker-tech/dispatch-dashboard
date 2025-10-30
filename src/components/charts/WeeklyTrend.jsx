import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function WeeklyTrend({ data = [] }) {
export default function WeeklyTrend({ data = [] }) {
  const sample = (Array.isArray(data) && data.length)
     ? data
     : [
         { d: "Mon", v: 6 },
         { d: "Tue", v: 7 },
         { d: "Wed", v: 5 },
         { d: "Thu", v: 9 },
         { d: "Fri", v: 8 },
         { d: "Sat", v: 10 },
         { d: "Sun", v: 9 },
       ];

  return (
    <div className="h-48 sm:h-56 lg:h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sample} margin={{ left: 6, right: 6, top: 8, bottom: 0 }}>
          <XAxis dataKey="d" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
          <Tooltip />
          <Area type="monotone" dataKey="v" strokeWidth={2} fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
