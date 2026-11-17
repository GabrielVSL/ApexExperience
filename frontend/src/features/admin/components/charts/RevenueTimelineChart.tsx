'use client';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface TimelinePoint {
  mes: string;
  faturamento: number;
  faturamentoPendente?: number;
  lucro: number;
  sessoes: number;
}

interface RevenueTimelineChartProps {
  data: TimelinePoint[];
}

function formatCompactMoney(val: number): string {
  if (val >= 1000) {
    const k = val / 1000;
    return `R$ ${Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')}k`;
  }
  return `R$ ${val}`;
}

export default function RevenueTimelineChart({ data }: RevenueTimelineChartProps) {
  const { formatPrice } = useCurrencyStore();
  const points = useMemo(
    () =>
      (data || []).map((p) => ({
        ...p,
        faturamento: Number(p.faturamento) || 0,
        faturamentoPendente: Number(p.faturamentoPendente) || 0,
        lucro: Number(p.lucro) || 0,
        sessoes: Number(p.sessoes) || 0,
      })),
    [data]
  );

  const activePoints = useMemo(
    () =>
      points.filter(
        (p) =>
          p.faturamento > 0 ||
          p.faturamentoPendente > 0 ||
          p.lucro > 0 ||
          p.sessoes > 0
      ),
    [points]
  );

  const [showAllMonths, setShowAllMonths] = useState(false);
  const displayedPoints =
    showAllMonths || activePoints.length === 0 ? points : activePoints;

  const totalReceita = points.reduce((acc, p) => acc + p.faturamento, 0);
  const totalPendente = points.reduce((acc, p) => acc + p.faturamentoPendente, 0);
  const totalLucro = points.reduce((acc, p) => acc + p.lucro, 0);
  const margemPercent =
    totalReceita > 0 ? Math.round((totalLucro / totalReceita) * 100) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload as TimelinePoint | undefined;
      return (
        <div className="rounded-2xl bg-[#08090C]/95 px-4 py-3 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 font-sans">
          <p className="text-white/55 font-medium">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-white/75">
              <span className="w-2 h-2 rounded-full bg-[#FF1717]" />
              Receita confirmada
            </span>
            <span className="text-white font-semibold tabular-nums">
              {formatPrice(point?.faturamento || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-white/75">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Lucro líquido
            </span>
            <span className="text-emerald-300 font-semibold tabular-nums">
              {formatPrice(point?.lucro || 0)}
            </span>
          </div>
          {(point?.faturamentoPendente || 0) > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-white/75">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Aguardando aprovação
              </span>
              <span className="text-amber-300 font-semibold tabular-nums">
                {formatPrice(point?.faturamentoPendente || 0)}
              </span>
            </div>
          )}
          {point?.sessoes !== undefined && (
            <p className="text-[11px] text-white/45 pt-1 border-t border-white/[0.06]">
              {point.sessoes} {point.sessoes === 1 ? 'sessão no mês' : 'sessões no mês'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-white/40">
        Ainda não há histórico financeiro suficiente para exibir o gráfico.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo e legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#121622] px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-white/75">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF1717]" />
            <span>Confirmado:</span>
            <strong className="text-white font-medium tabular-nums">
              {formatPrice(totalReceita)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2 text-white/75">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Lucro:</span>
            <strong className="text-emerald-300 font-medium tabular-nums">
              {formatPrice(totalLucro)}
            </strong>
          </span>
          {totalPendente > 0 && (
            <span className="inline-flex items-center gap-2 text-white/75">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Pendente:</span>
              <strong className="text-amber-300 font-medium tabular-nums">
                {formatPrice(totalPendente)}
              </strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white/50 tabular-nums">Margem: {margemPercent}%</span>
          {activePoints.length > 0 && activePoints.length < points.length && (
            <button
              type="button"
              onClick={() => setShowAllMonths((v) => !v)}
              className="px-2.5 py-1 rounded-full bg-[#0D1017] hover:bg-white/[0.08] text-[11px] text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              {showAllMonths ? 'Meses com movimento' : 'Ver 6 meses'}
            </button>
          )}
        </div>
      </div>

      {totalReceita === 0 && totalPendente > 0 && (
        <div className="rounded-2xl bg-amber-500/12 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <span>
            As reservas deste mês ainda estão aguardando aprovação para entrar em receita e lucro confirmados.
          </span>
          <Link
            to="/pedidos"
            className="font-semibold text-amber-300 hover:text-white underline underline-offset-2"
          >
            Ir para Sessões →
          </Link>
        </div>
      )}

      {/* Gráfico comparativo mês a mês */}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayedPoints}
            margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
            barGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="mes"
              stroke="rgba(255,255,255,0.45)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              width={60}
              stroke="rgba(255,255,255,0.4)"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactMoney}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar
              dataKey="faturamento"
              name="Receita confirmada"
              fill="#FF1717"
              radius={[8, 8, 0, 0]}
              maxBarSize={44}
            />
            <Bar
              dataKey="lucro"
              name="Lucro líquido"
              fill="#10B981"
              radius={[8, 8, 0, 0]}
              maxBarSize={44}
            />
            {totalPendente > 0 && (
              <Bar
                dataKey="faturamentoPendente"
                name="Aguardando aprovação"
                fill="#F59E0B"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
