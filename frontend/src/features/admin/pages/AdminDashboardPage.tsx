'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  ArrowUpRight,
  FileCheck2,
  CarFront,
  Loader2,
  ShieldAlert,
  Wallet,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  Flag,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';

// Componentes modulares
import AdminKpiGrid from '../components/AdminKpiGrid';
import RevenueTimelineChart from '../components/charts/RevenueTimelineChart';
import CircuitPerformanceChart from '../components/charts/CircuitPerformanceChart';
import ServiceDistributionDonut from '../components/charts/ServiceDistributionDonut';
import FleetUtilizationChart from '../components/charts/FleetUtilizationChart';
import UserManagementTable, { AdminClientItem } from '../components/users/UserManagementTable';
import UserEditDrawer from '../components/users/UserEditDrawer';
import UserCreateModal from '../components/users/UserCreateModal';
import PaddockLiveStatus from '../components/race-control/PaddockLiveStatus';

interface AdminBookingItem {
  id: number;
  trackingCode: string;
  clienteNome: string;
  clienteEmail: string;
  clienteInadimplente: boolean;
  automovelNome: string;
  circuitoNome: string;
  slotData: string;
  slotTurno: string;
  tipoServico: string;
  valorTotal: number;
  descontoFidelidade: number;
  valorFinal: number;
  valorSinistro: number;
  motivoSinistro?: string;
  formaPagamento?: string;
  pagamentoStatus?: string;
  status: string;
}

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
    pilotosVipApexBlack: number;
    saldoTotalCustodiadoBRL: number;
    dividaAtivaTotalBRL: number;
  };
  clientes: AdminClientItem[];
  agendamentos: AdminBookingItem[];
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
  const { formatPrice } = useCurrencyStore();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pilotos' ? 'pilotos' : 'graficos';

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'graficos' | 'pilotos' | 'sessoes' | 'racecontrol'>(initialTab);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Drawer de Edição 360° do Usuário
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Modal de Criação de Usuário
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Modal de Crédito ApexPay
  const [creditModalClient, setCreditModalClient] = useState<AdminClientItem | null>(null);
  const [creditValor, setCreditValor] = useState('5000');
  const [creditDescricao, setCreditDescricao] = useState('Ajuste Administrativo Apex');

  // Modal de Sinistro
  const [sinistroModalBooking, setSinistroModalBooking] = useState<AdminBookingItem | null>(null);
  const [sinistroValor, setSinistroValor] = useState('4500');
  const [sinistroMotivo, setSinistroMotivo] = useState('Avaria em para-choque / caixa de brita');

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/admin/dashboard');
      setData(res.data);
    } catch {
      toast.error('Erro ao carregar dados do Painel Executivo Race Control.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('tab') === 'pilotos') {
      setActiveTab('pilotos');
    }
  }, [searchParams]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleDeleteUser = async (client: AdminClientItem) => {
    if (client.email === 'admin@apex.com') {
      toast.error('A conta do Administrador principal é protegida e não pode ser excluída.');
      return;
    }
    const confirmed = window.confirm(
      `Deseja realmente excluir ou desativar o piloto ${client.nome} (${client.email})?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(`delete-${client.id}`);
      const res = await api.delete(`/api/admin/usuarios/${client.id}`);
      toast.success(res.data?.message || `Piloto ${client.nome} removido com sucesso.`);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao excluir piloto.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApplyInterest = async (clientId: number) => {
    try {
      setProcessingId(`interest-${clientId}`);
      await api.post(`/api/admin/clientes/${clientId}/aplicar-juros`, {});
      toast.success('Juros diários (0,1%) aplicados sobre o saldo devedor!');
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao aplicar juros.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEvaluateBooking = async (bookingId: number, status: 'APROVADO' | 'REJEITADO') => {
    try {
      setProcessingId(`eval-${bookingId}`);
      await api.put(`/api/pedidos/${bookingId}/avaliar?status=${status}`);
      toast.success(`Sessão ${status === 'APROVADO' ? 'homologada' : 'rejeitada'} com sucesso!`);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar status da sessão.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLaunchSinistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sinistroModalBooking) return;
    try {
      setProcessingId(`sinistro-${sinistroModalBooking.id}`);
      await api.post(`/api/admin/pedidos/${sinistroModalBooking.id}/sinistro`, {
        valor: Number(sinistroValor),
        motivo: sinistroMotivo,
      });
      toast.success('Franquia de sinistro lançada na carteira ApexPay do piloto!');
      setSinistroModalBooking(null);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao lançar sinistro.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreditBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalClient) return;
    const valorNum = Number(creditValor);
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    try {
      setProcessingId(`credit-${creditModalClient.id}`);
      await api.post('/api/apexpay/deposito', {
        email: creditModalClient.email,
        valor: valorNum,
        descricao: creditDescricao.trim() || 'Ajuste Administrativo Apex',
      });
      toast.success(`Crédito de ${formatPrice(valorNum)} lançado para ${creditModalClient.nome}!`);
      setCreditModalClient(null);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao creditar saldo do piloto.');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C]">
        <Loader2 className="animate-spin text-[#FF1717]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-white pt-28 pb-24 px-4 sm:px-6 selection:bg-[#FF1717] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho Executivo do Painel */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#FF1717] mb-2 font-semibold">
              Race Control & Gateway ApexPay · Gestão Administrativa
            </p>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">
              Painel Executivo Apex
            </h1>
            <p className="text-sm text-white/60 mt-2 max-w-3xl leading-relaxed">
              Visão analítica de lucro operacional, gráficos de desempenho de autódromos, gestão completa de pilotos com edição de CNH, e controle de bandeiras de pista.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium cursor-pointer transition-colors"
          >
            <RefreshCw size={14} />
            <span>Atualizar Painel</span>
          </button>
        </header>

        {/* Atalhos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/pedidos"
            className="group p-4 rounded-2xl bg-[#11131A] hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#FF1717]/40 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FF1717]/15 border border-[#FF1717]/30 flex items-center justify-center text-[#FF1717]">
                <FileCheck2 size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Homologação de Sessões</p>
                <p className="text-xs text-white/50">Aprovar, rejeitar ou propor troca de slots</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-white/40 group-hover:text-[#FF1717] transition-colors" />
          </Link>

          <Link
            to="/frota"
            className="group p-4 rounded-2xl bg-[#11131A] hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#FF1717]/40 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
                <CarFront size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Boxes &amp; Frota de Supercarros</p>
                <p className="text-xs text-white/50">Cadastrar, associar circuitos e calibrar diárias</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-white/40 group-hover:text-[#FF1717] transition-colors" />
          </Link>
        </div>

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

        {/* Navegação de Abas do Painel */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {[
            { id: 'graficos', label: 'Gráficos & Análise Visual', icon: BarChart3 },
            { id: 'pilotos', label: `Gestão de Pilotos (${data.clientes.length})`, icon: Users },
            { id: 'sessoes', label: `Sessões & Sinistros (${data.agendamentos.length})`, icon: FileCheck2 },
            { id: 'racecontrol', label: 'Race Control & Paddock Live', icon: Flag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#FF1717] text-white border-[#FF1717] shadow-lg'
                    : 'bg-white/[0.03] text-white/65 border-white/10 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GRÁFICOS & ANÁLISE VISUAL */}
        {activeTab === 'graficos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 1: Evolução Financeira */}
              <div className="p-6 rounded-3xl bg-[#11131A] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Evolução de Receita & Lucro</h3>
                    <p className="text-xs text-white/50">Histórico temporal de faturamento e margem operacional líquida</p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                    Últimos 6 meses
                  </span>
                </div>
                <RevenueTimelineChart data={data.timelineFaturamento || []} />
              </div>

              {/* Gráfico 2: Receita por Autódromo */}
              <div className="p-6 rounded-3xl bg-[#11131A] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Receita por Autódromo</h3>
                    <p className="text-xs text-white/50">Volume faturado nos 8 circuitos internacionais</p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#FF1717]/15 border border-[#FF1717]/30 text-[#FF1717]">
                    Ranking Pistas
                  </span>
                </div>
                <CircuitPerformanceChart data={data.faturamentoPorCircuito || {}} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 3: Modalidades de Serviço */}
              <div className="p-6 rounded-3xl bg-[#11131A] border border-white/[0.08] space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Distribuição por Modalidade</h3>
                  <p className="text-xs text-white/50">Divisão percentual entre Track Day, Hot Lap e Visita ao Box</p>
                </div>
                <ServiceDistributionDonut data={data.distribuicaoModalidades || []} />
              </div>

              {/* Gráfico 4: Demanda da Frota */}
              <div className="p-6 rounded-3xl bg-[#11131A] border border-white/[0.08] space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Demanda da Frota em Pista</h3>
                  <p className="text-xs text-white/50">Volume de voltas e sessões pilotadas por supercarro</p>
                </div>
                <FleetUtilizationChart data={data.supercarrosMaisPilotados || {}} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GESTÃO DE PILOTOS & USUÁRIOS (COM DRAWER DE EDIÇÃO) */}
        {activeTab === 'pilotos' && (
          <UserManagementTable
            clients={data.clientes || []}
            onOpenEditDrawer={(id) => setEditingUserId(id)}
            onOpenCreateModal={() => setIsCreateUserModalOpen(true)}
            onDeleteUser={handleDeleteUser}
            onOpenCreditModal={(client) => {
              setCreditModalClient(client);
              setCreditValor('5000');
              setCreditDescricao('Ajuste Administrativo Apex');
            }}
            onApplyInterest={handleApplyInterest}
            processingId={processingId}
          />
        )}

        {/* TAB 3: SESSÕES DE PISTA & SINISTROS */}
        {activeTab === 'sessoes' && (
          <div className="space-y-4">
            {data.agendamentos.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-xs text-white/50">
                Nenhuma sessão agendada no momento.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.015]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-white/50 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Protocolo / Piloto</th>
                      <th className="py-3.5 px-4">Circuito · Veículo</th>
                      <th className="py-3.5 px-4">Data / Turno</th>
                      <th className="py-3.5 px-4">Valor / Sinistro</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Controles Race Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {data.agendamentos.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <p className="font-mono text-[#FF1717] font-semibold">{b.trackingCode}</p>
                          <p className="font-medium text-white mt-0.5">{b.clienteNome}</p>
                          <p className="text-[11px] text-white/45 font-mono">{b.clienteEmail}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-white">{b.circuitoNome}</p>
                          <p className="text-[11px] text-white/55">{b.automovelNome} · {b.tipoServico}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <p>{b.slotData}</p>
                          <p className="text-[11px] text-white/50">{b.slotTurno}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <p className="text-white font-semibold">{formatPrice(b.valorFinal)}</p>
                          {b.valorSinistro > 0 && (
                            <p className="text-[11px] text-rose-400">
                              Sinistro: +{formatPrice(b.valorSinistro)}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {b.status === 'AGUARDANDO_APROVACAO' && (
                            <>
                              <button
                                type="button"
                                disabled={processingId === `eval-${b.id}`}
                                onClick={() => handleEvaluateBooking(b.id, 'APROVADO')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 text-[11px] cursor-pointer"
                              >
                                <CheckCircle2 size={12} /> Aprovar
                              </button>
                              <button
                                type="button"
                                disabled={processingId === `eval-${b.id}`}
                                onClick={() => handleEvaluateBooking(b.id, 'REJEITADO')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-[11px] cursor-pointer"
                              >
                                <XCircle size={12} /> Rejeitar
                              </button>
                            </>
                          )}
                          {b.status === 'APROVADO' && b.tipoServico !== 'VISITA_BOX' && (
                            <button
                              type="button"
                              onClick={() => setSinistroModalBooking(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[11px] cursor-pointer"
                              title="Cobrar franquia por avaria / colisão"
                            >
                              <ShieldAlert size={12} /> Lançar Sinistro
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RACE CONTROL & PADDOCK LIVE */}
        {activeTab === 'racecontrol' && (
          <PaddockLiveStatus
            saudeQueue={data.saudeMensageriaQueue}
            ocupacaoBoxes={data.ocupacaoBoxesPorAutodromo || {}}
          />
        )}
      </div>

      {/* Drawer de Edição 360° do Piloto */}
      <UserEditDrawer
        userId={editingUserId}
        isOpen={editingUserId !== null}
        onClose={() => setEditingUserId(null)}
        onUserUpdated={loadDashboard}
      />

      {/* Modal de Crédito Administrativo ApexPay */}
      {creditModalClient && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setCreditModalClient(null)}
        >
          <form
            onSubmit={handleCreditBalance}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-3xl bg-[#0D0F15] border border-white/15 space-y-4"
          >
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Wallet size={18} className="text-emerald-400" />
              Creditar Saldo ApexPay
            </h3>
            <p className="text-xs text-white/60">
              Piloto: <strong className="text-white">{creditModalClient.nome}</strong> ({creditModalClient.email}).
            </p>
            <div>
              <label className="text-[11px] text-white/60 block mb-1">Valor do Crédito (R$)</label>
              <input
                type="number"
                min="1"
                step="50"
                required
                value={creditValor}
                onChange={(e) => setCreditValor(e.target.value)}
                className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-sm text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/60 block mb-1">Descrição / Motivo</label>
              <input
                type="text"
                required
                value={creditDescricao}
                onChange={(e) => setCreditDescricao(e.target.value)}
                className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreditModalClient(null)}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={processingId === `credit-${creditModalClient.id}`}
                className="flex-1 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Confirmar Crédito
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Lançamento de Franquia / Sinistro */}
      {sinistroModalBooking && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setSinistroModalBooking(null)}
        >
          <form
            onSubmit={handleLaunchSinistro}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-3xl bg-[#0D0F15] border border-white/15 space-y-4"
          >
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-400" />
              Lançar Franquia / Sinistro em Pista
            </h3>
            <p className="text-xs text-white/60">
              Piloto: <strong className="text-white">{sinistroModalBooking.clienteNome}</strong> ({sinistroModalBooking.trackingCode}). O valor será debitado diretamente na carteira ApexPay.
            </p>
            <div>
              <label className="text-[11px] text-white/60 block mb-1">Valor da Franquia (R$)</label>
              <input
                type="number"
                min="1"
                step="50"
                required
                value={sinistroValor}
                onChange={(e) => setSinistroValor(e.target.value)}
                className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-sm text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/60 block mb-1">Ocorrência / Motivo</label>
              <input
                type="text"
                required
                value={sinistroMotivo}
                onChange={(e) => setSinistroMotivo(e.target.value)}
                className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSinistroModalBooking(null)}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={processingId === `sinistro-${sinistroModalBooking.id}`}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Cobrar Franquia
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal de Cadastro de Novo Piloto / Usuário */}
      <UserCreateModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onUserCreated={loadDashboard}
      />
    </div>
  );
}
