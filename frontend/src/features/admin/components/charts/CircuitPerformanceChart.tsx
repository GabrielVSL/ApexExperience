'use client';

import { motion } from 'framer-motion';
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface CircuitPerformanceChartProps {
  data: Record<string, number>;
}

export default function CircuitPerformanceChart({ data }: CircuitPerformanceChartProps) {
  const { formatPrice } = useCurrencyStore();

  const items = Object.entries(data || {})
    .map(([circuito, valor]) => ({
      circuito,
      valor: Number(valor) || 0,
    }))
    .filter((i) => i.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const totalGeral = items.reduce((acc, i) => acc + i.valor, 0);
  const maxValor = items[0]?.valor || 1;

  if (items.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-white/40">
        Ainda não há faturamento registrado por autódromo.
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-h-[304px] overflow-y-auto pr-1 custom-scrollbar">
      {items.map((item, idx) => {
        const sharePercent = totalGeral > 0 ? Math.round((item.valor / totalGeral) * 100) : 0;
        const barWidth = Math.max(Math.round((item.valor / maxValor) * 100), 4);
        const isLeader = idx === 0;

        return (
          <div key={item.circuito} className="rounded-2xl bg-[#121622] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 tabular-nums ${
                    isLeader
                      ? 'bg-[#FF1717] text-white'
                      : 'bg-white/[0.06] text-white/65'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="font-medium text-white truncate">{item.circuito}</span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                <span className="text-[11px] text-white/45">{sharePercent}%</span>
                <span className="font-semibold text-white">{formatPrice(item.valor)}</span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-[#08090C] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.45, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full rounded-full ${
                  isLeader
                    ? 'bg-gradient-to-r from-[#FF1717] to-[#FF5252]'
                    : idx < 3
                    ? 'bg-[#FF1717]/75'
                    : 'bg-white/30'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
