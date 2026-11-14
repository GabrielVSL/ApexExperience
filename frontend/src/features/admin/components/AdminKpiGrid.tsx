'use client';

import {
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface AdminKpiGridProps {
  faturamentoConfirmado: number;
  lucroLiquidoEstimado: number;
  totalSessoesAgendadas: number;
  sessoesConfirmadas: number;
  sessoesPendentes: number;
  dividaAtivaTotal: number;
  pilotosInadimplentes: number;
  pilotosEmDia: number;
  saldoTotalCustodiado: number;
  totalPilotosCadastrados: number;
  totalSinistrosCobrados: number;
}

export default function AdminKpiGrid({
  faturamentoConfirmado,
  lucroLiquidoEstimado,
  totalSessoesAgendadas,
  sessoesConfirmadas,
  sessoesPendentes,
  dividaAtivaTotal,
  pilotosInadimplentes,
  pilotosEmDia,
  saldoTotalCustodiado,
  totalPilotosCadastrados,
  totalSinistrosCobrados,
}: AdminKpiGridProps) {
  const { formatPrice } = useCurrencyStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: LUCRO LÍQUIDO OPERACIONAL */}
      <div className="p-5 rounded-2xl bg-[#11131A] border border-white/10 hover:border-[#FF1717]/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>Lucro Líquido Operacional</span>
          <TrendingUp size={16} className="text-emerald-400" />
        </div>
        <p className="text-2xl font-semibold text-white tabular-nums tracking-tight">
          {formatPrice(lucroLiquidoEstimado)}
        </p>
        <p className="text-[11px] font-mono text-white/45 mt-1.5 flex items-center justify-between">
          <span>Receita confirmada:</span>
          <span className="text-white/80">{formatPrice(faturamentoConfirmado)}</span>
        </p>
      </div>

      {/* CARD 2: SESSÕES DE PISTA & GRID */}
      <div className="p-5 rounded-2xl bg-[#11131A] border border-white/10 hover:border-[#FF1717]/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>Sessões & Grid de Pista</span>
          <CalendarCheck size={16} className="text-[#FF1717]" />
        </div>
        <p className="text-2xl font-semibold text-white tabular-nums tracking-tight">
          {totalSessoesAgendadas}
        </p>
        <p className="text-[11px] font-mono text-white/45 mt-1.5 flex items-center justify-between">
          <span>Homologadas: {sessoesConfirmadas}</span>
          <span className="text-amber-400 font-semibold">{sessoesPendentes} pendentes</span>
        </p>
      </div>

      {/* CARD 3: DÍVIDA ATIVA & INADIMPLÊNCIA */}
      <div className="p-5 rounded-2xl bg-[#11131A] border border-white/10 hover:border-rose-500/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>Dívida Ativa ApexPay</span>
          <AlertTriangle size={16} className="text-rose-400" />
        </div>
        <p className="text-2xl font-semibold text-rose-400 tabular-nums tracking-tight">
          {formatPrice(dividaAtivaTotal)}
        </p>
        <p className="text-[11px] font-mono text-white/45 mt-1.5 flex items-center justify-between">
          <span className="text-rose-300 font-medium">{pilotosInadimplentes} inadimplente(s)</span>
          <span className="text-emerald-400">{pilotosEmDia} em dia</span>
        </p>
      </div>

      {/* CARD 4: CUSTÓDIA APEXPAY & SINISTROS */}
      <div className="p-5 rounded-2xl bg-[#11131A] border border-white/10 hover:border-emerald-500/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>Custódia ApexPay Sandbox</span>
          <Wallet size={16} className="text-white/70" />
        </div>
        <p className="text-2xl font-semibold text-white tabular-nums tracking-tight">
          {formatPrice(saldoTotalCustodiado)}
        </p>
        <p className="text-[11px] font-mono text-white/45 mt-1.5 flex items-center justify-between">
          <span>{totalPilotosCadastrados} pilotos</span>
          <span className="text-rose-300">Sinistros: {formatPrice(totalSinistrosCobrados)}</span>
        </p>
      </div>
    </div>
  );
}
