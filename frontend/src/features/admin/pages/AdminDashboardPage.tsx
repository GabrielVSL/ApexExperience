'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  FileCheck2,
  CarFront,
  Loader2,
  BarChart3,
  Users,
  MapPin,
  Server,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';

import AdminKpiGrid from '../components/AdminKpiGrid';
import RevenueTimelineChart from '../components/charts/RevenueTimelineChart';
import CircuitPerformanceChart from '../components/charts/CircuitPerformanceChart';
import ServiceDistributionDonut from '../components/charts/ServiceDistributionDonut';
import FleetUtilizationChart from '../components/charts/FleetUtilizationChart';

interface AdminDashboardData {
  faturamentoTotalBRL: number;
  faturamentoConfirmadoBRL: number;
  faturamentoPendenteBRL: number;
  lucroLiquidoEstimadoBRL: number;
  totalDescontosConcedidosBRL: number;
  totalSinistrosCobradosBRL: number;
  totalJurosRecebidosBRL: number;
  totalSessoesAgendadas: number;
  sessoesConfirmadas: number;
  sessoesPendentes: number;
  timelineFaturamento: Array<{
    mes: string;
    faturamento: number;
    lucro: number;
    sessoes: number;
  }>;
  distribuicaoModalidades: Array<{
    modalidade: string;
    tipoServico: string;
    quantidade: number;
    totalBRL: number;
  }>;
  faturamentoPorCircuito: Record<string, number>;
  ocupacaoBoxesPorAutodromo: Record<
    string,
    { circuitoNome: string; totalVagas: number; totalOcupadas: number; taxaOcupacaoPercentual: number }
  >;
  supercarrosMaisPilotados: Record<string, number>;
  metricasApexPay: {
    totalPilotosCadastrados: number;
    pilotosInadimplentes: number;
    pilotosEmDia: number;
    saldoTotalCustodiadoBRL: number;
    dividaAtivaTotalBRL: number;
  };
  saudeMensageriaQueue: {
    motor: string;
    status: string;
    tamanhoFilaAtual: number;
    tamanhoDlqAtual: number;
    totalEnfileiradas: number;
    totalSucessos: number;
    totalFalhas: number;
    totalDlq: number;
    dlqNome: string;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/admin/dashboard');
      setData(res.data);
    } catch {
      toast.error('Erro ao carregar dados do Painel Executivo Apex.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C] font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF1717]" size={30} />
          <span className="text-xs text-white/50">Carregando indicadores executivos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-white pt-28 pb-24 px-6 font-sans selection:bg-[#FF1717] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
              <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                <BarChart3 size={12} />
              </span>
              <span className="text-xs font-medium text-white/80">
                Visão Executiva · Indicadores e Métricas
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.08]">
              Painel Executivo Apex
            </h1>
            <p className="text-xs sm:text-sm text-white/55 max-w-2xl leading-relaxed">
              Acompanhe faturamento, lucro líquido mensal, receita por autódromo, utilização da frota e ocupação real das agendas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/admin/usuarios"
              className="px-4 py-2.5 rounded-full text-xs font-medium text-white/85 bg-[#0D1017] hover:bg-[#121622] transition-colors inline-flex items-center gap-2"
            >
              <Users size={14} className="text-white/70" />
              <span>Pilotos</span>
            </Link>

            <Link
              to="/pedidos"
              className="px-4 py-2.5 rounded-full text-xs font-medium text-white/85 bg-[#0D1017] hover:bg-[#121622] transition-colors inline-flex items-center gap-2"
            >
              <FileCheck2 size={14} className="text-[#FF1717]" />
              <span>Sessões</span>
              {data.sessoesPendentes > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF1717] text-white text-[10px] font-semibold tabular-nums">
                  {data.sessoesPendentes}
                </span>
              )}
            </Link>

            <Link
              to="/cars"
              className="px-4 py-2.5 rounded-full text-xs font-medium text-white/85 bg-[#0D1017] hover:bg-[#121622] transition-colors inline-flex items-center gap-2"
            >
              <CarFront size={14} className="text-white/70" />
              <span>Frota</span>
            </Link>

            <button
              type="button"
              onClick={loadDashboard}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-white/90 text-[#08090C] transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw size={13} />
              <span>Atualizar</span>
            </button>
          </div>
        </header>

        {/* Grid Executivo de KPIs */}
        <AdminKpiGrid
          faturamentoConfirmado={data.faturamentoConfirmadoBRL}
          lucroLiquidoEstimado={data.lucroLiquidoEstimadoBRL}
          totalSessoesAgendadas={data.totalSessoesAgendadas}
          sessoesConfirmadas={data.sessoesConfirmadas}
          sessoesPendentes={data.sessoesPendentes}
          dividaAtivaTotal={data.metricasApexPay.dividaAtivaTotalBRL}
          pilotosInadimplentes={data.metricasApexPay.pilotosInadimplentes}
          pilotosEmDia={data.metricasApexPay.pilotosEmDia}
          saldoTotalCustodiado={data.metricasApexPay.saldoTotalCustodiadoBRL}
          totalPilotosCadastrados={data.metricasApexPay.totalPilotosCadastrados}
          totalSinistrosCobrados={data.totalSinistrosCobradosBRL}
        />

        {/* Linha 1: Receita vs Lucro Mensal + Modalidades */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-white">Receita &amp; Lucro por Mês</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Comparativo mensal entre faturamento confirmado e lucro líquido (margem operacional + sinistros + juros + taxas retidas)
                </p>
              </div>
            </div>
            <RevenueTimelineChart data={data.timelineFaturamento || []} />
          </div>

          <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
            <div>
              <h2 className="text-base font-medium text-white">Distribuição por Modalidade</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Participação de cada experiência nas reservas ativas
              </p>
            </div>
            <ServiceDistributionDonut data={data.distribuicaoModalidades || []} />
          </div>
        </div>

        {/* Linha 2: Receita por Autódromo + Demanda da Frota */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-white">Receita por Autódromo</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Ranking de faturamento entre os 8 circuitos oficiais
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-[#FF1717]/15 text-[#FF8A8A] shrink-0">
                Pistas
              </span>
            </div>
            <CircuitPerformanceChart data={data.faturamentoPorCircuito || {}} />
          </div>

          <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-white">Demanda da Frota em Pista</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Supercarros mais reservados pelos pilotos
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 shrink-0">
                Frota
              </span>
            </div>
            <FleetUtilizationChart data={data.supercarrosMaisPilotados || {}} />
          </div>
        </div>

        {/* Linha 3: Ocupação real das vagas por circuito + Fila do servidor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <MapPin size={16} className="text-[#FF1717]" />
              <span>Ocupação das vagas nos 8 autódromos</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {Object.entries(data.ocupacaoBoxesPorAutodromo || {}).map(([id, info]) => {
                const pct = info.taxaOcupacaoPercentual || 0;
                return (
                  <div key={id} className="p-4 rounded-2xl bg-[#121622] space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-white font-medium line-clamp-1">
                        {info.circuitoNome}
                      </span>
                      <span className="text-white/75 font-semibold shrink-0 tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#08090C] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 80
                            ? 'bg-[#FF1717]'
                            : pct > 40
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-white/45 tabular-nums">
                      <span>{info.totalOcupadas} ocupadas</span>
                      <span>{info.totalVagas} vagas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-medium text-white flex items-center gap-2">
                <Server size={16} className="text-[#FF1717]" />
                <span>Processamento de reservas</span>
              </h2>
              <span className="text-xs text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full">
                {data.saudeMensageriaQueue?.status || 'ONLINE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#121622]">
                <span className="text-white/45 block">Processadas</span>
                <span className="text-2xl text-white font-medium tabular-nums mt-1 block">
                  {data.saudeMensageriaQueue?.totalSucessos || 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#121622]">
                <span className="text-white/45 block">Falhas na fila</span>
                <span
                  className={`text-2xl font-medium tabular-nums mt-1 block ${
                    (data.saudeMensageriaQueue?.tamanhoDlqAtual || 0) > 0
                      ? 'text-rose-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {data.saudeMensageriaQueue?.tamanhoDlqAtual || 0}
                </span>
              </div>
            </div>

            <p className="text-xs text-white/45 leading-relaxed">
              Motor {data.saudeMensageriaQueue?.motor || 'VirtualThreads'} ativo garantindo alocação atômica de vagas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
