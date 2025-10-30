import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function Donut({ data = [] }) {
  const fallback = [
    { name: "In Transit", value: 9 },
    { name: "Delivered", value: 8 },
    { name: "Problem", value: 3 },
    { name: "Other", value: 2 },
  ];
  const rows = data?.length ? data : fallback;

  return (
    <div className="h-48 sm:h-56 lg:h-60">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            dataKey="value"
            data={rows}
            innerRadius={60}
            outerRadius={85}
            paddingAngle={2}
          >
            {rows.map((_, i) => <Cell key={i} />)}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="middle" align="right" layout="vertical" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
