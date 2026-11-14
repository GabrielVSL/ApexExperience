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
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface CircuitPerformanceChartProps {
  data: Record<string, number>;
}

export default function CircuitPerformanceChart({ data }: CircuitPerformanceChartProps) {
  const { formatPrice } = useCurrencyStore();

  const formattedData = Object.entries(data || {})
    .map(([circuito, valor]) => ({
      circuito: circuito.replace('Autódromo de ', '').replace('Circuit de ', '').replace(' International Racing Course', ''),
      circuitoCompleto: circuito,
      valor: Number(valor) || 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-2xl bg-[#0A0D14]/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-xl font-mono text-xs">
          <p className="text-white/60 font-semibold text-[11px] uppercase tracking-wider mb-1">
            {item.circuitoCompleto}
          </p>
          <p className="text-white font-bold text-sm">
            {formatPrice(item.valor)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (formattedData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-white/40">
        Ainda não há dados de faturamento por circuito.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          layout="vertical"
          margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
          <XAxis
            type="number"
            stroke="rgba(255, 255, 255, 0.4)"
            tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fontFamily: 'monospace' }}
          />
          <YAxis
            type="category"
            dataKey="circuito"
            stroke="rgba(255, 255, 255, 0.7)"
            tickLine={false}
            axisLine={false}
            width={90}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
            {formattedData.map((_, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={idx === 0 ? '#FF1717' : idx < 3 ? '#E10600' : 'rgba(255, 23, 23, 0.45)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
