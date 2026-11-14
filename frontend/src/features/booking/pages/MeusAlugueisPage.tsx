'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CarFront,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ShieldAlert,
  Wallet,
  Calendar,
  Flag,
  ArrowRight,
  Gauge,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { resolveStudioCarImage } from '@/lib/carPresentation';
import { FiaQrPassModal } from '@/features/booking/components/FiaQrPassModal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  id: number;
  trackingCode?: string;
  qrCodePayload?: string;
  qrCodeAssinatura?: string;
  checkInRealizadoEm?: string | null;
  tipoServico?: string;
  automovel?: { id?: number; marca: string; modelo: string; placa: string; imageUrl?: string; precoPorDia?: number } | null;
  trackSlot?: { data: string; turno: string; circuito?: { id: string; nome: string } } | null;
  dataInicio: string;
  dataFim: string;
  valorTotal?: number;
  descontoFidelidade?: number;
  valorFinal?: number;
  valorSinistro?: number;
  motivoSinistro?: string;
  pagamentoStatus?: string;
  status: 'AGUARDANDO_APROVACAO' | 'PENDENTE' | 'PENDENTE_EMPRESA' | 'PENDENTE_BANCO' | 'APROVADO' | 'REJEITADO' | 'CANCELADO' | 'REVISAO_CLIENTE';
  dataPedido: string;
}

const statusConfig = {
  AGUARDANDO_APROVACAO: { text: 'Homologação Paddock', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: Clock },
  PENDENTE: { text: 'Validação de Box', color: 'bg-white/10 text-white border-white/20', icon: Clock },
  PENDENTE_EMPRESA: { text: 'Aguardando Grid', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
  PENDENTE_BANCO: { text: 'Em Análise Financeira', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Clock },
  REVISAO_CLIENTE: { text: 'Ajuste de Horário Sugerido', color: 'bg-[#FF1717]/10 text-[#FF1717] border-[#FF1717]/40 animate-pulse', icon: AlertTriangle },
  APROVADO: { text: 'Green Flag // Confirmada', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 },
  REJEITADO: { text: 'Não Homologada', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: XCircle },
  CANCELADO: { text: 'Cancelada', color: 'bg-white/5 text-white/40 border-white/10', icon: XCircle },
};

const SERVICO_LABELS: Record<string, string> = {
  VISITA_BOX: 'Visita ao Box & Paddock VIP',
  FAST_LAP: 'Fast Lap (Carona c/ Piloto)',
  TRACK_EXPERIENCE: 'Track Experience (Pilotar)',
  PACOTE_VIP: 'Pacote VIP Full Day',
};

export default function MeusAlugueisPage() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [qrPedido, setQrPedido] = useState<Pedido | null>(null);
  const { formatPrice } = useCurrencyStore();

  const fetchMeusPedidos = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/pedidos/meus');
      const list = Array.isArray(response.data) ? response.data : [];
      const sorted = list.sort((a: Pedido, b: Pedido) => {
        if (a.status === 'REVISAO_CLIENTE') return -1;
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

  const handleCancelarPedido = async (id: number) => {
    try {
      setIsProcessing(id);
      await api.put(`/api/pedidos/${id}/cancelar`);
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'CANCELADO' } : p)));
      toast.success('Sessão de pista cancelada.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar sessão.');
    } finally {
      setIsProcessing(null);
    }
  };

  const totalAprovadas = pedidos.filter((p) => p.status === 'APROVADO').length;
  const totalEmAnalise = pedidos.filter((p) =>
    ['AGUARDANDO_APROVACAO', 'PENDENTE', 'PENDENTE_EMPRESA', 'PENDENTE_BANCO'].includes(p.status)
  ).length;

  return (
    <div className="relative min-h-screen bg-[#08090C] text-white pt-24 pb-32 selection:bg-[#FF1717] selection:text-white overflow-hidden">
      {/* Halo de iluminação aerodinâmica de fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,23,23,0.12),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Página */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#FF1717] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF1717]">
                Paddock Driver Pass
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Minhas <span className="text-[#FF1717]">Sessões</span>
            </h1>
            <p className="text-white/60 mt-1.5 text-xs sm:text-sm font-normal">
              Acompanhe suas credenciais de autódromo, horários de box e faturas no ApexPay.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/apexpay')}
              className="px-4 py-2.5 rounded-full text-xs font-mono font-medium text-white/80 bg-white/5 hover:bg-white/10 border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet size={13} className="text-[#FF1717]" />
              <span>Carteira ApexPay</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/pistas')}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#FF1717] hover:bg-[#e01414] text-white transition-all shadow-md shadow-[#FF1717]/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>+ Nova Sessão</span>
            </button>
          </div>
        </header>

        {/* Barra de KPIs Resumo do Piloto */}
        {!isLoading && pedidos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div className="p-4 rounded-2xl bg-[#0A0D14]/80 backdrop-blur-xl border border-white/10">
              <div className="flex items-center justify-between text-white/50 text-[11px] font-mono mb-1">
                <span>Total de Sessões</span>
                <Activity size={14} className="text-[#FF1717]" />
              </div>
              <p className="text-xl font-bold font-mono text-white">{pedidos.length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0D14]/80 backdrop-blur-xl border border-white/10">
              <div className="flex items-center justify-between text-white/50 text-[11px] font-mono mb-1">
                <span>Confirmadas (Green Flag)</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <p className="text-xl font-bold font-mono text-emerald-300">{totalAprovadas}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0D14]/80 backdrop-blur-xl border border-white/10 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-white/50 text-[11px] font-mono mb-1">
                <span>Em Homologação</span>
                <Clock size={14} className="text-amber-400" />
              </div>
              <p className="text-xl font-bold font-mono text-amber-300">{totalEmAnalise}</p>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-[#FF1717]" size={36} />
            <span className="font-mono text-xs text-white/50 tracking-wider">
              Carregando credenciais do piloto...
            </span>
          </div>
        ) : pedidos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-[#0A0D14]/75 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5 text-[#FF1717] border border-white/10">
              <Flag size={28} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight mb-2">
              Nenhuma Sessão Ativa no Momento
            </h3>
            <p className="text-white/50 text-xs sm:text-sm max-w-md mx-auto mb-6">
              Você ainda não reservou nenhuma bateria de pista ou visita técnica aos boxes.
            </p>
            <button
              type="button"
              onClick={() => navigate('/pistas')}
              className="px-6 py-3 bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold rounded-full transition-all shadow-lg shadow-[#FF1717]/30 cursor-pointer inline-flex items-center gap-2"
            >
              <span>Explorar Pistas e Boxes</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {pedidos.map((pedido, index) => {
                const config = statusConfig[pedido.status] || statusConfig.PENDENTE;
                const StatusIcon = config.icon;
                const dataInicio = parseISO(pedido.dataInicio);
                const podeCancelar = ['AGUARDANDO_APROVACAO', 'PENDENTE', 'PENDENTE_EMPRESA', 'PENDENTE_BANCO'].includes(
                  pedido.status
                );
                const servicoLabel = SERVICO_LABELS[pedido.tipoServico || 'TRACK_EXPERIENCE'] || pedido.tipoServico;
                const circuitoLabel = pedido.trackSlot?.circuito?.nome || 'Circuito Internacional';
                const turnoLabel = pedido.trackSlot?.turno || 'SESSÃO';
                const valorExibido = pedido.valorFinal ?? pedido.valorTotal ?? 0;

                return (
                  <motion.div
                    key={pedido.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[#0A0D14]/85 backdrop-blur-2xl border border-white/10 hover:border-[#FF1717]/40 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300"
                  >
                    {/* Top Ribbon / Tracking Pass */}
                    <div className="bg-white/[0.02] border-b border-white/10 px-5 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          FIA PASS
                        </span>
                        <span className="font-mono text-xs font-bold text-[#FF1717] bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
                          {pedido.trackingCode || `APX-${String(pedido.id).padStart(6, '0')}`}
                        </span>
                        {pedido.dataPedido && (
                          <span className="text-[11px] text-white/45 hidden sm:inline">
                            • Solicitado em {format(parseISO(pedido.dataPedido), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${config.color}`}
                      >
                        <StatusIcon size={12} strokeWidth={2.5} />
                        <span>{config.text}</span>
                      </div>
                    </div>

                    {/* Corpo da Ficha do Supercarro / Sessão */}
                    <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Imagem do Carro Studio */}
                      <div className="lg:col-span-5 flex flex-col items-center">
                        <div className="w-full aspect-[16/10] bg-gradient-to-b from-[#141822] to-[#0A0D14] rounded-2xl border border-white/10 p-3 flex items-center justify-center relative overflow-hidden group">
                          {pedido.automovel ? (
                            <img
                              src={resolveStudioCarImage(pedido.automovel)}
                              alt={pedido.automovel.modelo}
                              className="max-h-full max-w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <CarFront size={48} className="text-white/20" />
                          )}
                          <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-mono font-bold text-[#FF1717] uppercase tracking-wider">
                            {pedido.automovel ? pedido.automovel.marca : 'PADDOCK VIP'}
                          </div>
                        </div>

                        <div className="w-full mt-3 text-left">
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                            {pedido.automovel ? pedido.automovel.modelo : servicoLabel}
                          </h3>
                          <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                            <Gauge size={11} className="text-[#FF1717]" />
                            <span>{circuitoLabel} · Turno {turnoLabel}</span>
                          </p>
                        </div>
                      </div>

                      {/* Dados Técnicos e Financeiros */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-[#FF1717] font-mono uppercase tracking-wider block font-bold">
                              Modalidade
                            </span>
                            <span className="font-semibold text-white text-sm block mt-0.5">{servicoLabel}</span>
                            <span className="text-[11px] text-white/50 block">{circuitoLabel}</span>
                          </div>

                          <div className="sm:border-l sm:border-white/10 sm:pl-3">
                            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider block font-bold">
                              Data & Turno
                            </span>
                            <span className="font-semibold text-white text-sm block mt-0.5 flex items-center gap-1.5">
                              <Calendar size={13} className="text-white/60" />
                              {format(dataInicio, "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="text-[11px] text-emerald-400 block mt-0.5">Turno: {turnoLabel}</span>
                          </div>
                        </div>

                        {/* Bloco Financeiro ApexPay */}
                        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block font-bold">
                              Fatura ApexPay ({pedido.pagamentoStatus || 'PENDENTE'})
                            </span>
                            <span className="text-xs text-white/65">
                              Combustível 102 octanas, pneus e telemetria inclusos
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-[#FF1717] uppercase tracking-wider block font-bold">
                              Valor Total
                            </span>
                            <span className="text-xl sm:text-2xl font-black font-mono text-white">
                              {formatPrice(valorExibido)}
                            </span>
                          </div>
                        </div>

                        {/* Alerta de Sinistro */}
                        {pedido.valorSinistro && pedido.valorSinistro > 0 ? (
                          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center gap-2.5 text-xs">
                            <ShieldAlert size={15} className="text-rose-400 shrink-0" />
                            <span className="text-rose-200">
                              Sinistro lançado: <strong>{formatPrice(pedido.valorSinistro)}</strong> ({pedido.motivoSinistro || 'Avaria'})
                            </span>
                          </div>
                        ) : null}

                        {/* Ajuste Proposto pelo Box (REVISAO_CLIENTE) */}
                        {pedido.status === 'REVISAO_CLIENTE' && (
                          <div className="p-4 rounded-2xl bg-[#FF1717]/10 border border-[#FF1717]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="text-[#FF1717] shrink-0 mt-0.5" size={16} />
                              <div>
                                <p className="text-xs font-bold text-white">Ajuste de horário sugerido pelo Box.</p>
                                <p className="text-[11px] text-white/60">Aceite ou recuse o novo turno proposto pela equipe.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleResponderRevisao(pedido.id, false)}
                                disabled={isProcessing === pedido.id}
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                              >
                                Recusar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResponderRevisao(pedido.id, true)}
                                disabled={isProcessing === pedido.id}
                                className="px-4 py-1.5 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
                              >
                                Aceitar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Ações da Credencial (QR Code FIA + Cancelar) */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQrPedido(pedido)}
                              className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#FF1717]/50 text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <QrCode size={13} className="text-[#FF1717]" />
                              <span>Credencial QR Code</span>
                            </button>

                            {pedido.checkInRealizadoEm && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                                <ShieldCheck size={11} /> Check-in Box OK
                              </span>
                            )}
                          </div>

                          {podeCancelar && (
                            <button
                              type="button"
                              onClick={() => handleCancelarPedido(pedido.id)}
                              disabled={isProcessing === pedido.id}
                              className="px-3.5 py-1.5 rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              {isProcessing === pedido.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                              <span>Cancelar Bateria</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

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
    </div>
  );
}