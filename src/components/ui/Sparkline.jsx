import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function Sparkline({ data = [] }) {
  if (!data?.length) data = [{ v: 0 }, { v: 0 }, { v: 0 }];
  return (
    <div className="mt-2 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
