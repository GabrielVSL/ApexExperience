'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CarFront,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Wallet,
  Calendar,
  Flag,
  ArrowRight,
  Gauge,
  QrCode,
  ShieldCheck,
  Plus,
  Eye,
  X,
  MapPin,
  CalendarClock,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { resolveStudioCarImage } from '@/lib/carPresentation';
import { FiaQrPassModal } from '@/features/booking/components/FiaQrPassModal';
import {
  CancelSessionModal,
  RescheduleSessionModal,
} from '@/features/booking/components/SessionActionModals';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  id: number;
  trackingCode?: string;
  qrCodePayload?: string;
  qrCodeAssinatura?: string;
  checkInRealizadoEm?: string | null;
  tipoServico?: string;
  automovel?: {
    id?: number;
    marca: string;
    modelo: string;
    placa: string;
    imageUrl?: string;
    precoPorDia?: number;
  } | null;
  trackSlot?: {
    id?: number;
    data: string;
    turno: string;
    circuito?: { id: string; nome: string };
  } | null;
  dataInicio: string;
  dataFim: string;
  valorTotal?: number;
  descontoFidelidade?: number;
  valorFinal?: number;
  valorSinistro?: number;
  motivoSinistro?: string;
  pagamentoStatus?: string;
  formaPagamento?: string;
  reagendamentosCount?: number;
  taxaCancelamentoMinima?: number;
  taxaAplicada?: number;
  status:
    | 'AGUARDANDO_APROVACAO'
    | 'PENDENTE'
    | 'PENDENTE_EMPRESA'
    | 'PENDENTE_BANCO'
    | 'APROVADO'
    | 'REJEITADO'
    | 'CANCELADO'
    | 'REVISAO_CLIENTE';
  dataPedido: string;
}

type StatusFilter = 'all' | 'approved' | 'pending' | 'closed';

const statusConfig: Record<
  Pedido['status'],
  { text: string; pillClass: string; icon: typeof Clock }
> = {
  AGUARDANDO_APROVACAO: {
    text: 'Aguardando aprovação',
    pillClass: 'bg-amber-500/15 text-amber-300',
    icon: Clock,
  },
  PENDENTE: {
    text: 'Em validação',
    pillClass: 'bg-white/[0.08] text-white/80',
    icon: Clock,
  },
  PENDENTE_EMPRESA: {
    text: 'Aguardando equipe',
    pillClass: 'bg-amber-500/15 text-amber-300',
    icon: Clock,
  },
  PENDENTE_BANCO: {
    text: 'Em análise financeira',
    pillClass: 'bg-sky-500/15 text-sky-300',
    icon: Clock,
  },
  REVISAO_CLIENTE: {
    text: 'Ajuste sugerido',
    pillClass: 'bg-[#FF1717]/20 text-[#FF8A8A]',
    icon: AlertTriangle,
  },
  APROVADO: {
    text: 'Confirmada',
    pillClass: 'bg-emerald-500/15 text-emerald-300',
    icon: CheckCircle2,
  },
  REJEITADO: {
    text: 'Não aprovada',
    pillClass: 'bg-rose-500/15 text-rose-300',
    icon: XCircle,
  },
  CANCELADO: {
    text: 'Cancelada',
    pillClass: 'bg-white/[0.06] text-white/45',
    icon: XCircle,
  },
};

const SERVICO_LABELS: Record<string, string> = {
  VISITA_BOX: 'Visita ao Box & Paddock VIP',
  FAST_LAP: 'Fast Lap (Carona com piloto)',
  TRACK_EXPERIENCE: 'Track Experience (Pilotar)',
  PACOTE_VIP: 'Pacote VIP Full Day',
};

const SERVICO_INCLUSOS: Record<string, string[]> = {
  VISITA_BOX: [
    'Tour guiado pelo pitlane e área dos boxes',
    'Briefing técnico com a equipe de pista',
    'Acesso à área VIP de paddock',
  ],
  FAST_LAP: [
    '2 voltas rápidas como passageiro ao lado de piloto profissional',
    'Capacete, balaclava e briefing de segurança',
    'Acesso à área de boxes durante o turno',
  ],
  TRACK_EXPERIENCE: [
    'Pilotagem no circuito durante todo o turno escolhido',
    'Combustível 102 octanas, pneus de pista e suporte de box',
    'Telemetria de voltas e rádio com engenheiro de pista',
  ],
  PACOTE_VIP: [
    'Box privativo exclusivo e acompanhamento dedicado',
    'Pneus dedicados e gravação on-board completa',
    'Telemetria avançada, combustível e acesso total ao paddock',
  ],
};

const PAGAMENTO_LABELS: Record<string, string> = {
  PAGO: 'Pago via ApexPay',
  PAGO_CARTEIRA: 'Pago com saldo ApexPay',
  FATURA_AGUARDANDO_APROVACAO: 'Fatura aguardando aprovação',
  FATURA_EM_ABERTO: 'Fatura em aberto',
  PENDENTE: 'Pagamento pendente',
  ESTORNADO: 'Valor estornado',
  CANCELADO: 'Fatura cancelada',
};

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'approved', label: 'Confirmadas' },
  { id: 'pending', label: 'Em análise' },
  { id: 'closed', label: 'Canceladas e recusadas' },
];

export default function MeusAlugueisPage() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [qrPedido, setQrPedido] = useState<Pedido | null>(null);
  const [detailPedido, setDetailPedido] = useState<Pedido | null>(null);
  const [cancelPedido, setCancelPedido] = useState<Pedido | null>(null);
  const [reschedulePedido, setReschedulePedido] = useState<Pedido | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { formatPrice, formatCircuitEquivalent } = useCurrencyStore();

  const fetchMeusPedidos = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/pedidos/meus');
      const list = Array.isArray(response.data) ? response.data : [];
      const sorted = list.sort((a: Pedido, b: Pedido) => {
        if (a.status === 'REVISAO_CLIENTE' && b.status !== 'REVISAO_CLIENTE') return -1;
        if (b.status === 'REVISAO_CLIENTE' && a.status !== 'REVISAO_CLIENTE') return 1;
        return new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime();
      });
      setPedidos(sorted);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeusPedidos();
  }, []);

  const handleResponderRevisao = async (id: number, aceito: boolean) => {
    try {
      setIsProcessing(id);
      await api.put(`/api/pedidos/${id}/responder-revisao?aceito=${aceito}`);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: aceito ? 'APROVADO' : 'CANCELADO' } : p))
      );
      toast.success(aceito ? 'Novo horário aceito e sessão confirmada!' : 'Contraproposta recusada.');
    } catch {
      toast.error('Erro ao enviar resposta.');
    } finally {
      setIsProcessing(null);
    }
  };

  const totalAprovadas = useMemo(
    () => pedidos.filter((p) => p.status === 'APROVADO').length,
    [pedidos]
  );

  const totalEmAnalise = useMemo(
    () =>
      pedidos.filter((p) =>
        ['AGUARDANDO_APROVACAO', 'PENDENTE', 'PENDENTE_EMPRESA', 'PENDENTE_BANCO', 'REVISAO_CLIENTE'].includes(
          p.status
        )
      ).length,
    [pedidos]
  );

  const pedidosFiltrados = useMemo(() => {
    if (statusFilter === 'all') return pedidos;
    if (statusFilter === 'approved') return pedidos.filter((p) => p.status === 'APROVADO');
    if (statusFilter === 'pending') {
      return pedidos.filter((p) =>
        ['AGUARDANDO_APROVACAO', 'PENDENTE', 'PENDENTE_EMPRESA', 'PENDENTE_BANCO', 'REVISAO_CLIENTE'].includes(
          p.status
        )
      );
    }
    return pedidos.filter((p) => ['CANCELADO', 'REJEITADO'].includes(p.status));
  }, [pedidos, statusFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C] font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF1717]" size={30} />
          <span className="text-xs text-white/50">Carregando suas sessões de pista...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#08090C] text-white pt-28 pb-24 selection:bg-[#FF1717] selection:text-white font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Cabeçalho */}
        <header className="mb-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
                <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                  <Flag size={12} />
                </span>
                <span className="text-xs font-medium text-white/80">
                  Credenciais de pista · {pedidos.length}{' '}
                  {pedidos.length === 1 ? 'sessão' : 'sessões'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.08]">
                Minhas sessões{' '}
                <span className="italic font-light text-white/85">no autódromo.</span>
              </h1>
              <p className="text-white/55 text-xs sm:text-sm max-w-xl leading-relaxed">
                Acompanhe reservas confirmadas, horários de pista, credenciais QR de acesso ao box e status das faturas no ApexPay.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/apexpay')}
                className="px-4 py-2.5 rounded-full text-xs font-medium text-white/85 bg-[#0D1017] hover:bg-[#121622] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Wallet size={14} className="text-[#FF1717]" />
                <span>Carteira ApexPay</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/pistas')}
                className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-white/90 text-[#08090C] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus size={14} />
                <span>Nova sessão</span>
              </button>
            </div>
          </div>

          {/* Barra de resumo e filtros */}
          {pedidos.length > 0 && (
            <div className="rounded-3xl bg-[#0D1017] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                <div>
                  <span className="block text-[11px] text-white/45">Total de sessões</span>
                  <span className="text-xl font-semibold text-white tabular-nums">
                    {pedidos.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/[0.07] hidden sm:block" />
                <div>
                  <span className="block text-[11px] text-white/45">Confirmadas</span>
                  <span className="text-xl font-semibold text-emerald-300 tabular-nums">
                    {totalAprovadas}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/[0.07] hidden sm:block" />
                <div>
                  <span className="block text-[11px] text-white/45">Em análise</span>
                  <span className="text-xl font-semibold text-amber-300 tabular-nums">
                    {totalEmAnalise}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-[#121622] p-1 rounded-full self-start lg:self-auto">
                {FILTER_OPTIONS.map((option) => {
                  const active = statusFilter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStatusFilter(option.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#08090C]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {/* Estado vazio */}
        {pedidos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-6 bg-[#0D1017] rounded-3xl"
          >
            <div className="w-16 h-16 bg-[#121622] rounded-2xl flex items-center justify-center mx-auto mb-5 text-[#FF1717]">
              <Flag size={26} />
            </div>
            <h2 className="text-xl font-medium text-white tracking-tight mb-2">
              Nenhuma sessão agendada
            </h2>
            <p className="text-white/50 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Você ainda não reservou nenhuma bateria de pista ou visita aos boxes. Escolha um circuito para começar.
            </p>
            <button
              type="button"
              onClick={() => navigate('/pistas')}
              className="px-6 py-3 bg-white hover:bg-white/90 text-[#08090C] text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Explorar pistas e boxes</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center py-16 px-6 bg-[#0D1017] rounded-3xl space-y-3">
            <p className="text-sm font-medium text-white">
              Nenhuma sessão encontrada neste filtro.
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="px-4 py-2 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 transition-colors cursor-pointer"
            >
              Mostrar todas as sessões
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {pedidosFiltrados.map((pedido, index) => {
                const config = statusConfig[pedido.status] || statusConfig.PENDENTE;
                const StatusIcon = config.icon;
                const dataInicio = parseISO(pedido.dataInicio);
                const podeCancelar =
                  !['CANCELADO', 'REJEITADO'].includes(pedido.status) &&
                  !pedido.checkInRealizadoEm;
                const podeAlterarData =
                  podeCancelar &&
                  Boolean(pedido.trackSlot?.circuito?.id) &&
                  (pedido.reagendamentosCount ?? 0) < 1;
                const servicoLabel =
                  SERVICO_LABELS[pedido.tipoServico || 'TRACK_EXPERIENCE'] || pedido.tipoServico;
                const circuitoLabel =
                  pedido.trackSlot?.circuito?.nome || 'Circuito Internacional';
                const turnoLabel = pedido.trackSlot?.turno || 'A definir';
                const valorExibido = pedido.valorFinal ?? pedido.valorTotal ?? 0;
                const pagamentoTexto =
                  PAGAMENTO_LABELS[pedido.pagamentoStatus || 'PENDENTE'] ||
                  `Fatura ${pedido.pagamentoStatus}`;

                return (
                  <motion.article
                    key={pedido.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-[#0D1017] hover:bg-[#0F131C] rounded-3xl p-5 sm:p-7 transition-colors"
                  >
                    {/* Linha superior do card */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 rounded-full bg-[#121622] text-xs font-medium text-white/90 tabular-nums">
                          {pedido.trackingCode || `APX-${String(pedido.id).padStart(6, '0')}`}
                        </span>
                        {pedido.dataPedido && (
                          <span className="text-xs text-white/45">
                            Solicitado em{' '}
                            {format(parseISO(pedido.dataPedido), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.pillClass}`}
                      >
                        <StatusIcon size={13} />
                        <span>{config.text}</span>
                      </span>
                    </div>

                    {/* Corpo principal */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Carro / Paddock preview */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="w-full aspect-[16/10] rounded-2xl bg-gradient-to-b from-[#161B28] to-[#111520] p-4 flex items-center justify-center relative overflow-hidden group">
                          {pedido.automovel ? (
                            <img
                              src={resolveStudioCarImage(pedido.automovel)}
                              alt={pedido.automovel.modelo}
                              className="max-h-full max-w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <CarFront size={46} className="text-white/20" />
                          )}
                          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#08090C]/75 backdrop-blur-md text-[11px] font-medium text-white/80">
                            {pedido.automovel ? pedido.automovel.marca : 'Paddock VIP'}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-lg font-medium text-white tracking-tight truncate">
                            {pedido.automovel ? pedido.automovel.modelo : servicoLabel}
                          </h2>
                          <p className="text-xs text-white/50 flex items-center gap-1.5 mt-0.5">
                            <Gauge size={13} className="text-[#FF1717]" />
                            <span>
                              {circuitoLabel} · Turno {turnoLabel}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Informações da bateria e ações */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                        <div className="rounded-2xl bg-[#121622] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[11px] text-white/45 block">Modalidade</span>
                            <span className="text-sm font-medium text-white block mt-1">
                              {servicoLabel}
                            </span>
                            <span className="text-xs text-white/45 block mt-0.5 truncate">
                              {circuitoLabel}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-white/45 block">Data e turno</span>
                            <span className="text-sm font-medium text-white mt-1 flex items-center gap-1.5">
                              <Calendar size={13} className="text-white/50 shrink-0" />
                              <span className="truncate">
                                {format(dataInicio, "dd 'de' MMMM", { locale: ptBR })}
                              </span>
                            </span>
                            <span className="text-xs text-emerald-300/90 block mt-0.5">
                              Turno {turnoLabel}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-white/45 block">Valor total</span>
                            <span className="text-lg font-semibold text-white tabular-nums block mt-0.5">
                              {formatPrice(valorExibido)}
                            </span>
                            {(() => {
                              const foreignEquiv = formatCircuitEquivalent(
                                valorExibido,
                                pedido.trackSlot?.circuito?.id
                              );
                              if (!foreignEquiv) return null;
                              return (
                                <span className="text-[11px] text-white/55 block mt-0.5 tabular-nums">
                                  ≈ {foreignEquiv.formatted} ({foreignEquiv.code})
                                </span>
                              );
                            })()}
                            <span className="text-xs text-white/50 block mt-0.5">
                              {pagamentoTexto}
                            </span>
                          </div>
                        </div>

                        {/* Alerta de Sinistro */}
                        {pedido.valorSinistro && pedido.valorSinistro > 0 ? (
                          <div className="p-4 rounded-2xl bg-rose-500/10 flex items-center gap-3 text-xs">
                            <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                            <span className="text-rose-200 leading-relaxed">
                              Ocorrência registrada: <strong>{formatPrice(pedido.valorSinistro)}</strong>{' '}
                              ({pedido.motivoSinistro || 'Avaria'})
                            </span>
                          </div>
                        ) : null}

                        {/* Ajuste Proposto (REVISAO_CLIENTE) */}
                        {pedido.status === 'REVISAO_CLIENTE' && (
                          <div className="p-4 rounded-2xl bg-[#FF1717]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="text-[#FF1717] shrink-0 mt-0.5" size={16} />
                              <div>
                                <p className="text-xs font-semibold text-white">
                                  Ajuste de horário sugerido pela equipe de pista.
                                </p>
                                <p className="text-xs text-white/60 mt-0.5">
                                  Confirme se o novo turno atende sua disponibilidade.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleResponderRevisao(pedido.id, false)}
                                disabled={isProcessing === pedido.id}
                                className="px-3.5 py-2 rounded-full bg-[#121622] hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
                              >
                                Recusar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResponderRevisao(pedido.id, true)}
                                disabled={isProcessing === pedido.id}
                                className="px-4 py-2 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Aceitar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Ações da Credencial e Detalhes */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setDetailPedido(pedido)}
                              className="px-4 py-2 rounded-full bg-white hover:bg-white/90 text-[#08090C] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Eye size={14} />
                              <span>Ver detalhes</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setQrPedido(pedido)}
                              className="px-4 py-2 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/90 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <QrCode size={14} className="text-[#FF1717]" />
                              <span>Credencial QR</span>
                            </button>

                            {pedido.checkInRealizadoEm && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium">
                                <ShieldCheck size={13} />
                                <span>Check-in realizado</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {podeAlterarData && (
                              <button
                                type="button"
                                onClick={() => setReschedulePedido(pedido)}
                                className="px-4 py-2 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <CalendarClock size={13} className="text-[#FF1717]" />
                                <span>Alterar data</span>
                              </button>
                            )}

                            {podeCancelar && (
                              <button
                                type="button"
                                onClick={() => setCancelPedido(pedido)}
                                className="px-4 py-2 rounded-full bg-[#121622] hover:bg-rose-500/15 text-white/70 hover:text-rose-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <XCircle size={13} />
                                <span>Cancelar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Drawer de Detalhes da Sessão */}
      {detailPedido && (() => {
          const config = statusConfig[detailPedido.status] || statusConfig.PENDENTE;
          const StatusIcon = config.icon;
          const dataInicio = parseISO(detailPedido.dataInicio);
          const dataFim = parseISO(detailPedido.dataFim);
          const servicoKey = detailPedido.tipoServico || 'TRACK_EXPERIENCE';
          const servicoLabel = SERVICO_LABELS[servicoKey] || servicoKey;
          const inclusos = SERVICO_INCLUSOS[servicoKey] || SERVICO_INCLUSOS.TRACK_EXPERIENCE;
          const circuitoLabel =
            detailPedido.trackSlot?.circuito?.nome || 'Circuito Internacional';
          const turnoLabel = detailPedido.trackSlot?.turno || 'A definir';
          const valorBase = detailPedido.valorTotal ?? detailPedido.valorFinal ?? 0;
          const desconto = detailPedido.descontoFidelidade ?? 0;
          const valorFinal = detailPedido.valorFinal ?? detailPedido.valorTotal ?? 0;
          const foreignEquiv = formatCircuitEquivalent(
            valorFinal,
            detailPedido.trackSlot?.circuito?.id
          );
          const pagamentoTexto =
            PAGAMENTO_LABELS[detailPedido.pagamentoStatus || 'PENDENTE'] ||
            'Pagamento em processamento';
          const podeCancelar =
            !['CANCELADO', 'REJEITADO'].includes(detailPedido.status) &&
            !detailPedido.checkInRealizadoEm;
          const podeAlterarData =
            podeCancelar &&
            Boolean(detailPedido.trackSlot?.circuito?.id) &&
            (detailPedido.reagendamentosCount ?? 0) < 1;

          return (
            <div className="fixed inset-0 z-[120] flex justify-end font-sans">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                onClick={() => setDetailPedido(null)}
                className="fixed inset-0 bg-[#08090C]/75 backdrop-blur-md"
              />

              <motion.aside
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes da sessão"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-[480px] h-full sm:p-3 flex flex-col"
              >
                <div className="flex flex-col h-full w-full bg-[#0D1017] sm:rounded-3xl shadow-2xl overflow-hidden">
                  {/* Cabeçalho */}
                  <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4 border-b border-white/[0.06] shrink-0">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#121622] text-xs font-medium text-white/90 tabular-nums">
                          {detailPedido.trackingCode ||
                            `APX-${String(detailPedido.id).padStart(6, '0')}`}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.pillClass}`}
                        >
                          <StatusIcon size={12} />
                          <span>{config.text}</span>
                        </span>
                      </div>
                      <h2 className="text-xl font-medium text-white truncate">
                        {detailPedido.automovel
                          ? detailPedido.automovel.modelo
                          : servicoLabel}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailPedido(null)}
                      aria-label="Fechar detalhes"
                      className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  {/* Corpo com rolagem */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Imagem do veículo */}
                    <div className="w-full aspect-[16/9] rounded-2xl bg-gradient-to-b from-[#161B28] to-[#111520] p-4 flex items-center justify-center relative overflow-hidden">
                      {detailPedido.automovel ? (
                        <img
                          src={resolveStudioCarImage(detailPedido.automovel)}
                          alt={detailPedido.automovel.modelo}
                          className="max-h-full max-w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)]"
                        />
                      ) : (
                        <CarFront size={48} className="text-white/20" />
                      )}
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#08090C]/75 backdrop-blur-md text-[11px] font-medium text-white/85">
                        {detailPedido.automovel
                          ? `${detailPedido.automovel.marca} · Placa ${detailPedido.automovel.placa}`
                          : 'Paddock VIP'}
                      </span>
                    </div>

                    {/* Local, data e horário */}
                    <div className="rounded-2xl bg-[#121622] p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-[#FF1717] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-white/45">Circuito e modalidade</p>
                          <p className="text-sm font-medium text-white mt-0.5">
                            {circuitoLabel}
                          </p>
                          <p className="text-xs text-white/60 mt-0.5">{servicoLabel}</p>
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.06]" />

                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-white/60 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-white/45">Data e horário da bateria</p>
                          <p className="text-sm font-medium text-white mt-0.5">
                            {format(dataInicio, "EEEE, dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                          <p className="text-xs text-emerald-300/90 mt-0.5">
                            Turno {turnoLabel} · {format(dataInicio, 'HH:mm')} às{' '}
                            {format(dataFim, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* O que está incluso */}
                    <div className="rounded-2xl bg-[#121622] p-4 space-y-2.5">
                      <p className="text-xs font-medium text-white/80">
                        Incluído nesta sessão
                      </p>
                      <ul className="space-y-2">
                        {inclusos.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2.5 text-xs text-white/60 leading-relaxed"
                          >
                            <CheckCircle2
                              size={14}
                              className="text-emerald-400 shrink-0 mt-0.5"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resumo financeiro */}
                    <div className="rounded-2xl bg-[#121622] p-4 space-y-2.5 text-xs">
                      <p className="text-xs font-medium text-white/80 mb-1">
                        Resumo financeiro
                      </p>
                      <div className="flex items-center justify-between text-white/60">
                        <span>Valor da sessão</span>
                        <span className="tabular-nums">{formatPrice(valorBase)}</span>
                      </div>
                      {desconto > 0 && (
                        <div className="flex items-center justify-between text-emerald-300">
                          <span>Desconto fidelidade</span>
                          <span className="tabular-nums">-{formatPrice(desconto)}</span>
                        </div>
                      )}
                      <div className="h-px bg-white/[0.06] my-1" />
                      <div className="flex items-center justify-between text-sm font-semibold text-white">
                        <span>Total</span>
                        <span className="tabular-nums">{formatPrice(valorFinal)}</span>
                      </div>
                      {foreignEquiv && (
                        <div className="flex items-center justify-between text-[11px] text-white/50">
                          <span>Equivalente na moeda da pista</span>
                          <span className="tabular-nums">
                            ≈ {foreignEquiv.formatted} ({foreignEquiv.label})
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-white/55 pt-1">
                        <span>Pagamento</span>
                        <span>{pagamentoTexto}</span>
                      </div>
                    </div>

                    {detailPedido.valorSinistro && detailPedido.valorSinistro > 0 ? (
                      <div className="p-4 rounded-2xl bg-rose-500/10 flex items-center gap-3 text-xs">
                        <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                        <span className="text-rose-200 leading-relaxed">
                          Ocorrência registrada:{' '}
                          <strong>{formatPrice(detailPedido.valorSinistro)}</strong> (
                          {detailPedido.motivoSinistro || 'Avaria'})
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Rodapé */}
                  <div className="px-6 py-4 bg-[#0B0E14] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const target = detailPedido;
                        setDetailPedido(null);
                        setQrPedido(target);
                      }}
                      className="px-4 py-2.5 rounded-full bg-white hover:bg-white/90 text-[#08090C] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <QrCode size={14} />
                      <span>Credencial QR</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {podeAlterarData && (
                        <button
                          type="button"
                          onClick={() => {
                            const target = detailPedido;
                            setDetailPedido(null);
                            setReschedulePedido(target);
                          }}
                          className="px-4 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                        >
                          Alterar data
                        </button>
                      )}
                      {podeCancelar && (
                        <button
                          type="button"
                          onClick={() => {
                            const target = detailPedido;
                            setDetailPedido(null);
                            setCancelPedido(target);
                          }}
                          className="px-4 py-2.5 rounded-full bg-[#121622] hover:bg-rose-500/15 text-white/75 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailPedido(null)}
                        className="px-4 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/75 hover:text-white transition-colors cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </div>
          );
        })()}

      {qrPedido && (
        <FiaQrPassModal
          isOpen={Boolean(qrPedido)}
          onClose={() => setQrPedido(null)}
          pedidoId={qrPedido.id}
          initialTrackingCode={qrPedido.trackingCode}
          initialPayload={qrPedido.qrCodePayload}
          initialAssinatura={qrPedido.qrCodeAssinatura}
          initialCheckInEm={qrPedido.checkInRealizadoEm}
        />
      )}

      <CancelSessionModal
        pedido={cancelPedido}
        onClose={() => setCancelPedido(null)}
        onCancelled={(updated) => {
          setPedidos((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        }}
      />

      <RescheduleSessionModal
        pedido={reschedulePedido}
        onClose={() => setReschedulePedido(null)}
        onRescheduled={(updated) => {
          setPedidos((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        }}
      />
    </div>
  );
}
