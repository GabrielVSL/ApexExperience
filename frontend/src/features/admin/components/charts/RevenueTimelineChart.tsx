'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface TimelinePoint {
  mes: string;
  faturamento: number;
  lucro: number;
  sessoes: number;
}

interface RevenueTimelineChartProps {
  data: TimelinePoint[];
}

export default function RevenueTimelineChart({ data }: RevenueTimelineChartProps) {
  const { formatPrice } = useCurrencyStore();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl bg-[#0A0D14]/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-1.5">
          <p className="text-white/60 font-semibold text-[11px] uppercase tracking-wider">{label}</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF1717]" />
            <span className="text-white/80">Receita:</span>
            <span className="text-white font-bold">{formatPrice(payload[0]?.value || 0)}</span>
          </div>
          {payload[1] && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-white/80">Lucro Operacional:</span>
              <span className="text-emerald-400 font-bold">{formatPrice(payload[1]?.value || 0)}</span>
            </div>
          )}
          {payload[0]?.payload?.sessoes !== undefined && (
            <p className="text-[10px] text-white/45 pt-1 border-t border-white/10">
              {payload[0].payload.sessoes} sessão(ões) no período
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF1717" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#FF1717" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="rgba(255, 255, 255, 0.4)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontFamily: 'monospace' }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.4)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fontFamily: 'monospace' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="faturamento"
            name="Receita"
            stroke="#FF1717"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorFaturamento)"
          />
          <Area
            type="monotone"
            dataKey="lucro"
            name="Lucro Líquido"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#colorLucro)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
