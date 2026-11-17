'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface ServiceItem {
  modalidade: string;
  tipoServico: string;
  quantidade: number;
  totalBRL: number;
}

interface ServiceDistributionDonutProps {
  data: ServiceItem[];
}

const COLORS = ['#FF1717', '#FFFFFF', '#10B981', '#64748B'];

export default function ServiceDistributionDonut({ data }: ServiceDistributionDonutProps) {
  const { formatPrice } = useCurrencyStore();

  const chartData = (data || [])
    .filter((item) => item.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);
  const totalSessoes = chartData.reduce((acc, curr) => acc + curr.quantidade, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ServiceItem;
      const pct = totalSessoes > 0 ? Math.round((item.quantidade / totalSessoes) * 100) : 0;
      return (
        <div className="rounded-2xl bg-[#08090C]/95 px-4 py-3 shadow-2xl backdrop-blur-xl text-xs space-y-1 font-sans">
          <p className="text-white font-medium">{item.modalidade}</p>
          <p className="text-white/65 tabular-nums">
            {item.quantidade} {item.quantidade === 1 ? 'sessão' : 'sessões'} ({pct}%)
          </p>
          <p className="text-emerald-300 font-semibold tabular-nums pt-0.5">
            {formatPrice(item.totalBRL)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-white/40">
        Nenhuma modalidade registrada no histórico.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-5 min-h-[260px]">
      <div className="w-full sm:w-[210px] h-52 relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={chartData}
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              cornerRadius={6}
              stroke="none"
              dataKey="quantidade"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold text-white tabular-nums leading-none">
            {totalSessoes}
          </span>
          <span className="text-[11px] text-white/45 mt-1">
            {totalSessoes === 1 ? 'sessão' : 'sessões'}
          </span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5 text-xs">
        {chartData.map((item, index) => {
          const pct = totalSessoes > 0 ? Math.round((item.quantidade / totalSessoes) * 100) : 0;
          const color = COLORS[index % COLORS.length];
          return (
            <div key={item.tipoServico} className="p-3.5 rounded-2xl bg-[#121622] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-white font-medium truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{item.modalidade}</span>
                </span>
                <span className="text-white font-semibold tabular-nums shrink-0">{pct}%</span>
              </div>

              <div className="h-1.5 w-full rounded-full bg-[#08090C] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/50 tabular-nums">
                <span>
                  {item.quantidade} {item.quantidade === 1 ? 'sessão' : 'sessões'}
                </span>
                <span className="text-emerald-300 font-medium">
                  {formatPrice(item.totalBRL)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
