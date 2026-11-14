'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface FleetUtilizationChartProps {
  data: Record<string, number>;
}

export default function FleetUtilizationChart({ data }: FleetUtilizationChartProps) {
  const chartData = Object.entries(data || {})
    .map(([modelo, total]) => ({
      modelo: modelo.replace('Competition Coupé', 'M8 Coupé').replace('V10 Performance', 'R8 Performance'),
      modeloCompleto: modelo,
      total: Number(total) || 0,
    }))
    .sort((a, b) => b.total - a.total);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-2xl bg-[#0A0D14]/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-xl font-mono text-xs">
          <p className="text-white/60 font-semibold text-[11px] uppercase tracking-wider mb-1">
            {item.modeloCompleto}
          </p>
          <p className="text-emerald-400 font-bold text-sm">
            {item.total} sessão(ões) em pista
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-white/40">
        Nenhum registro de uso da frota até o momento.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="modelo"
            stroke="rgba(255, 255, 255, 0.5)"
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.4)"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fontSize: 10, fontFamily: 'monospace' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {chartData.map((_, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={idx === 0 ? '#10B981' : idx < 3 ? '#34D399' : 'rgba(16, 185, 129, 0.4)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
