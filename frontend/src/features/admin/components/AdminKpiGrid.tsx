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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      {/* CARD 1: LUCRO LÍQUIDO OPERACIONAL */}
      <div className="p-6 rounded-3xl bg-[#0D1017] hover:bg-[#10141E] transition-colors space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/55">Lucro Líquido Operacional</span>
          <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <TrendingUp size={16} />
          </span>
        </div>
        <p className="text-2xl sm:text-[26px] font-medium text-white tabular-nums tracking-tight leading-none">
          {formatPrice(lucroLiquidoEstimado)}
        </p>
        <div className="pt-1 flex items-center justify-between text-xs text-white/45">
          <span>Receita confirmada</span>
          <span className="text-white/80 font-medium tabular-nums">
            {formatPrice(faturamentoConfirmado)}
          </span>
        </div>
      </div>

      {/* CARD 2: SESSÕES DE PISTA & GRID */}
      <div className="p-6 rounded-3xl bg-[#0D1017] hover:bg-[#10141E] transition-colors space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/55">Sessões & Grid de Pista</span>
          <span className="w-8 h-8 rounded-xl bg-[#FF1717]/15 text-[#FF1717] flex items-center justify-center">
            <CalendarCheck size={16} />
          </span>
        </div>
        <p className="text-2xl sm:text-[26px] font-medium text-white tabular-nums tracking-tight leading-none">
          {totalSessoesAgendadas}
        </p>
        <div className="pt-1 flex items-center justify-between text-xs text-white/45">
          <span>{sessoesConfirmadas} confirmadas</span>
          <span className={sessoesPendentes > 0 ? 'text-amber-300 font-medium' : 'text-white/45'}>
            {sessoesPendentes} pendentes
          </span>
        </div>
      </div>

      {/* CARD 3: DÍVIDA ATIVA & INADIMPLÊNCIA */}
      <div className="p-6 rounded-3xl bg-[#0D1017] hover:bg-[#10141E] transition-colors space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/55">Dívida Ativa ApexPay</span>
          <span className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <AlertTriangle size={16} />
          </span>
        </div>
        <p className="text-2xl sm:text-[26px] font-medium text-rose-300 tabular-nums tracking-tight leading-none">
          {formatPrice(dividaAtivaTotal)}
        </p>
        <div className="pt-1 flex items-center justify-between text-xs">
          <span className={pilotosInadimplentes > 0 ? 'text-rose-300' : 'text-white/45'}>
            {pilotosInadimplentes} inadimplente{pilotosInadimplentes === 1 ? '' : 's'}
          </span>
          <span className="text-emerald-300/90">{pilotosEmDia} em dia</span>
        </div>
      </div>

      {/* CARD 4: CUSTÓDIA APEXPAY & SINISTROS */}
      <div className="p-6 rounded-3xl bg-[#0D1017] hover:bg-[#10141E] transition-colors space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/55">Custódia ApexPay Sandbox</span>
          <span className="w-8 h-8 rounded-xl bg-white/[0.06] text-white/80 flex items-center justify-center">
            <Wallet size={16} />
          </span>
        </div>
        <p className="text-2xl sm:text-[26px] font-medium text-white tabular-nums tracking-tight leading-none">
          {formatPrice(saldoTotalCustodiado)}
        </p>
        <div className="pt-1 flex items-center justify-between text-xs text-white/45">
          <span>{totalPilotosCadastrados} pilotos</span>
          <span className="text-white/65 tabular-nums">
            Sinistros: {formatPrice(totalSinistrosCobrados)}
          </span>
        </div>
      </div>
    </div>
  );
}
