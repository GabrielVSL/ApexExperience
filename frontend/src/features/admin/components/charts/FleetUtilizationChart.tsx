'use client';

import { motion } from 'framer-motion';

interface FleetUtilizationChartProps {
  data: Record<string, number>;
}

export default function FleetUtilizationChart({ data }: FleetUtilizationChartProps) {
  const items = Object.entries(data || {})
    .map(([modelo, total]) => ({
      modelo,
      total: Number(total) || 0,
    }))
    .filter((i) => i.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalSessoes = items.reduce((acc, i) => acc + i.total, 0);
  const maxValor = items[0]?.total || 1;

  if (items.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-white/40">
        Nenhum registro de uso da frota até o momento.
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-h-[304px] overflow-y-auto pr-1 custom-scrollbar">
      {items.map((item, idx) => {
        const sharePercent = totalSessoes > 0 ? Math.round((item.total / totalSessoes) * 100) : 0;
        const barWidth = Math.max(Math.round((item.total / maxValor) * 100), 6);
        const isTop = idx === 0;

        return (
          <div key={item.modelo} className="rounded-2xl bg-[#121622] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 tabular-nums ${
                    isTop
                      ? 'bg-emerald-500 text-[#08090C]'
                      : 'bg-white/[0.06] text-white/65'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="font-medium text-white truncate">{item.modelo}</span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                <span className="text-[11px] text-white/45">{sharePercent}%</span>
                <span className="font-semibold text-emerald-300">
                  {item.total} {item.total === 1 ? 'sessão' : 'sessões'}
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-[#08090C] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.45, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full rounded-full ${
                  isTop
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                    : idx < 3
                    ? 'bg-emerald-400/75'
                    : 'bg-white/25'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
