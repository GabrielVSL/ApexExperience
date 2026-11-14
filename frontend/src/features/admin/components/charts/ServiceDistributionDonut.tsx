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

const COLORS = ['#FF1717', '#3B82F6', '#10B981', '#F59E0B'];

export default function ServiceDistributionDonut({ data }: ServiceDistributionDonutProps) {
  const { formatPrice } = useCurrencyStore();

  const chartData = (data || []).filter((item) => item.quantidade > 0);
  const totalSessoes = chartData.reduce((acc, curr) => acc + curr.quantidade, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalSessoes > 0 ? Math.round((item.quantidade / totalSessoes) * 100) : 0;
      return (
        <div className="rounded-2xl bg-[#0A0D14]/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-1">
          <p className="text-white font-bold">{item.modalidade}</p>
          <p className="text-white/70">
            {item.quantidade} sessão(ões) ({pct}%)
          </p>
          <p className="text-emerald-400 font-semibold pt-0.5">
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-72">
      <div className="w-full sm:w-1/2 h-52 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={chartData}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="quantidade"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-white">{totalSessoes}</span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-white/40">Sessões</span>
        </div>
      </div>

      <div className="w-full sm:w-1/2 space-y-2.5 text-xs font-mono">
        {chartData.map((item, index) => {
          const pct = totalSessoes > 0 ? Math.round((item.quantidade / totalSessoes) * 100) : 0;
          return (
            <div key={item.tipoServico} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80 font-sans text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {item.modalidade}
                </span>
                <span className="text-white font-bold">{pct}%</span>
              </div>
              <div className="flex justify-between text-[11px] text-white/45 pl-4.5">
                <span>{item.quantidade} sessões</span>
                <span className="text-emerald-400 font-medium">{formatPrice(item.totalBRL)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
