import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';

export interface SessionActionPedido {
  id: number;
  trackingCode?: string;
  tipoServico?: string;
  automovel?: { id?: number; marca: string; modelo: string; placa: string } | null;
  trackSlot?: {
    id?: number;
    data: string;
    turno: string;
    circuito?: { id: string; nome: string };
  } | null;
  dataInicio: string;
  dataFim: string;
  valorTotal?: number;
  valorFinal?: number;
  pagamentoStatus?: string;
  formaPagamento?: string;
  reagendamentosCount?: number;
  taxaCancelamentoMinima?: number;
}

interface PoliticaAlteracao {
  pedidoId: number;
  horasAteSessao: number;
  valorBase: number;
  podeCancelar: boolean;
  taxaCancelamentoPercent: number;
  taxaCancelamentoValor: number;
  valorEstornoLiquido: number;
  travaAntiBurlaAtiva: boolean;
  taxaCancelamentoMinima: number;
  podeReagendar: boolean;
  motivoBloqueioReagendamento?: string | null;
  taxaReagendamentoPercent: number;
  taxaReagendamentoValor: number;
  reagendamentosUsados: number;
  reagendamentosLimite: number;
}

interface TrackSlotOption {
  id: number;
  data: string;
  turno: string;
  vagasTotais: number;
  vagasOcupadas: number;
  taxaAdicionalTurno?: number;
}

const TURNO_LABEL: Record<string, string> = {
  MANHA: 'Manhã (08h – 12h)',
  TARDE: 'Tarde (13h – 17h)',
  NOTURNO: 'Noturno (19h – 22h)',
};

function formatAntecedencia(horas: number): string {
  if (horas >= 48) {
    const dias = Math.floor(horas / 24);
    return `${dias} dias`;
  }
  return `${horas} hora${horas === 1 ? '' : 's'}`;
}

function buildFallbackPolicy(pedido: SessionActionPedido): PoliticaAlteracao {
  const diffMs = new Date(pedido.dataInicio).getTime() - Date.now();
  const horas = Math.max(Math.floor(diffMs / 3600000), 0);
  const base = Number(pedido.valorFinal ?? pedido.valorTotal ?? 0);
  const faixaCancel = horas >= 168 ? 0 : horas >= 72 ? 15 : horas >= 24 ? 35 : 50;
  const minPrev = pedido.taxaCancelamentoMinima ?? 0;
  const taxaCancelPercent = Math.max(faixaCancel, minPrev);
  const taxaCancelVal = Number(((base * taxaCancelPercent) / 100).toFixed(2));
  const taxaRemarcPercent = horas >= 168 ? 0 : horas >= 72 ? 10 : 25;
  const taxaRemarcVal = Number(((base * taxaRemarcPercent) / 100).toFixed(2));
  const usados = pedido.reagendamentosCount ?? 0;

  return {
    pedidoId: pedido.id,
    horasAteSessao: horas,
    valorBase: base,
    podeCancelar: true,
    taxaCancelamentoPercent: taxaCancelPercent,
    taxaCancelamentoValor: taxaCancelVal,
    valorEstornoLiquido: Math.max(base - taxaCancelVal, 0),
    travaAntiBurlaAtiva: minPrev > faixaCancel || usados > 0,
    taxaCancelamentoMinima: minPrev,
    podeReagendar: usados < 1 && horas >= 24,
    motivoBloqueioReagendamento:
      usados >= 1
        ? 'Cada reserva permite apenas 1 alteração de data.'
        : horas < 24
        ? 'Com menos de 24 horas de antecedência não é possível remarcar; apenas cancelar.'
        : null,
    taxaReagendamentoPercent: taxaRemarcPercent,
    taxaReagendamentoValor: taxaRemarcVal,
    reagendamentosUsados: usados,
    reagendamentosLimite: 1,
  };
}

interface CancelModalProps {
  pedido: SessionActionPedido | null;
  onClose: () => void;
  onCancelled: (updatedPedido: any) => void;
}

export function CancelSessionModal({ pedido, onClose, onCancelled }: CancelModalProps) {
  const { formatPrice } = useCurrencyStore();
  const [policy, setPolicy] = useState<PoliticaAlteracao | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pedido) return;
    let active = true;
    setLoadingPolicy(true);
    setPolicy(buildFallbackPolicy(pedido));

    api
      .get<PoliticaAlteracao>(`/api/pedidos/${pedido.id}/politica-alteracao`)
      .then((res) => {
        if (active) setPolicy(res.data);
      })
      .catch(() => {
        // mantém fallback calculado localmente
      })
      .finally(() => {
        if (active) setLoadingPolicy(false);
      });

    return () => {
      active = false;
    };
  }, [pedido]);

  const handleConfirmCancel = async () => {
    if (!pedido) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/api/pedidos/${pedido.id}/cancelar`);
      toast.success(
        policy && policy.taxaCancelamentoPercent > 0
          ? `Sessão cancelada com taxa de ${policy.taxaCancelamentoPercent}%.`
          : 'Sessão cancelada gratuitamente.'
      );
      onCancelled(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível cancelar a sessão.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!pedido || !policy) return null;

  const isPaid =
    pedido.pagamentoStatus === 'PAGO_CARTEIRA' ||
    pedido.pagamentoStatus === 'FATURA_EM_ABERTO' ||
    pedido.pagamentoStatus === 'DEBITO_ABERTO';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#08090C]/80 backdrop-blur-md"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Cancelar sessão"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-10 w-full max-w-lg bg-[#0D1017] rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 text-xs font-medium">
                <XCircle size={13} />
                <span>Cancelamento de sessão</span>
              </span>
              <h2 className="text-xl font-medium text-white pt-1">
                {pedido.automovel ? pedido.automovel.modelo : 'Reserva de pista'}
              </h2>
              <p className="text-xs text-white/50">
                Faltam {formatAntecedencia(policy.horasAteSessao)} para a sessão agendada.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          {/* Política progressiva */}
          <div className="rounded-2xl bg-[#121622] p-4 space-y-2.5 text-xs">
            <p className="font-medium text-white/80">Regras de cancelamento por antecedência</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { label: '7+ dias', fee: 'Grátis', active: policy.taxaCancelamentoPercent === 0 },
                { label: '3 a 6 dias', fee: '15%', active: policy.taxaCancelamentoPercent === 15 },
                { label: '1 a 2 dias', fee: '35%', active: policy.taxaCancelamentoPercent === 35 },
                { label: '< 24h', fee: '50%', active: policy.taxaCancelamentoPercent >= 50 },
              ].map((tier) => (
                <div
                  key={tier.label}
                  className={`rounded-xl py-2 px-2 ${
                    tier.active
                      ? 'bg-[#FF1717]/20 text-white font-semibold'
                      : 'bg-[#0D1017] text-white/45'
                  }`}
                >
                  <span className="block text-[11px]">{tier.label}</span>
                  <span className="block text-xs mt-0.5">{tier.fee}</span>
                </div>
              ))}
            </div>
          </div>

          {policy.travaAntiBurlaAtiva && policy.taxaCancelamentoMinima > 0 && (
            <div className="rounded-2xl bg-amber-500/12 p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
              <ShieldAlert size={16} className="text-amber-300 shrink-0 mt-0.5" />
              <span>
                Como esta reserva já foi remarcada anteriormente, permanece aplicada a taxa mínima
                de cancelamento da data original ({policy.taxaCancelamentoMinima}%).
              </span>
            </div>
          )}

          {/* Resumo financeiro do cancelamento */}
          <div className="rounded-2xl bg-[#121622] p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-white/60">
              <span>Valor da sessão</span>
              <span className="tabular-nums">{formatPrice(policy.valorBase)}</span>
            </div>
            <div className="flex items-center justify-between text-rose-300">
              <span>Taxa de cancelamento ({policy.taxaCancelamentoPercent}%)</span>
              <span className="tabular-nums">
                {policy.taxaCancelamentoValor > 0
                  ? `-${formatPrice(policy.taxaCancelamentoValor)}`
                  : 'Grátis'}
              </span>
            </div>
            <div className="h-px bg-white/[0.06] my-1" />
            <div className="flex items-center justify-between text-sm font-semibold text-white">
              <span>{isPaid ? 'Valor devolvido no ApexPay' : 'Cobrança na carteira'}</span>
              <span className="tabular-nums text-emerald-300">
                {isPaid
                  ? formatPrice(policy.valorEstornoLiquido)
                  : formatPrice(policy.taxaCancelamentoValor)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 transition-colors cursor-pointer"
            >
              Manter sessão
            </button>
            <button
              type="button"
              disabled={submitting || loadingPolicy}
              onClick={handleConfirmCancel}
              className="px-5 py-2.5 rounded-full bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>
                {policy.taxaCancelamentoPercent === 0
                  ? 'Confirmar cancelamento gratuito'
                  : 'Confirmar cancelamento'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface RescheduleModalProps {
  pedido: SessionActionPedido | null;
  onClose: () => void;
  onRescheduled: (updatedPedido: any) => void;
}

export function RescheduleSessionModal({
  pedido,
  onClose,
  onRescheduled,
}: RescheduleModalProps) {
  const { formatPrice } = useCurrencyStore();
  const [policy, setPolicy] = useState<PoliticaAlteracao | null>(null);
  const [slots, setSlots] = useState<TrackSlotOption[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const circuitoId = pedido?.trackSlot?.circuito?.id || '';

  useEffect(() => {
    if (!pedido) return;
    let active = true;
    setLoading(true);
    setPolicy(buildFallbackPolicy(pedido));
    setSelectedSlotId(null);
    setSelectedDate('');

    const requests: Promise<any>[] = [
      api.get<PoliticaAlteracao>(`/api/pedidos/${pedido.id}/politica-alteracao`),
    ];
    if (circuitoId) {
      requests.push(api.get<TrackSlotOption[]>(`/api/slots/${circuitoId}`));
    }

    Promise.all(requests)
      .then(([polRes, slotsRes]) => {
        if (!active) return;
        if (polRes?.data) setPolicy(polRes.data);
        if (slotsRes?.data && Array.isArray(slotsRes.data)) {
          const currentSlotId = pedido.trackSlot?.id;
          const valid = slotsRes.data.filter(
            (s: TrackSlotOption) =>
              s.id !== currentSlotId && s.vagasOcupadas < s.vagasTotais
          );
          setSlots(valid);
          if (valid.length > 0) {
            setSelectedDate(valid[0].data);
            setSelectedSlotId(valid[0].id);
          }
        }
      })
      .catch(() => {
        // fallback já inicializado
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pedido, circuitoId]);

  const availableDates = useMemo(() => {
    const unique = Array.from(new Set(slots.map((s) => s.data)));
    return unique.slice(0, 14);
  }, [slots]);

  const slotsForDate = useMemo(
    () => slots.filter((s) => s.data === selectedDate),
    [slots, selectedDate]
  );

  const handleConfirmReschedule = async () => {
    if (!pedido || !selectedSlotId) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/api/pedidos/${pedido.id}/reagendar`, {
        trackSlotId: selectedSlotId,
      });
      toast.success('Data da sessão alterada com sucesso!');
      onRescheduled(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível alterar a data.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!pedido || !policy) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#08090C]/80 backdrop-blur-md"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Alterar data da sessão"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0D1017] rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121622] text-white/85 text-xs font-medium">
                <CalendarClock size={13} className="text-[#FF1717]" />
                <span>Alterar data e turno</span>
              </span>
              <h2 className="text-xl font-medium text-white pt-1">
                {pedido.automovel ? pedido.automovel.modelo : 'Reserva de pista'}
              </h2>
              <p className="text-xs text-white/50">
                {pedido.trackSlot?.circuito?.nome || 'Circuito'} · limite de 1 alteração por reserva
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          {/* Regras de remarcação e aviso anti-burla */}
          <div className="rounded-2xl bg-[#121622] p-4 space-y-2.5 text-xs">
            <p className="font-medium text-white/80">Taxa por proximidade da sessão atual</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { label: '7+ dias', fee: 'Grátis', active: policy.taxaReagendamentoPercent === 0 && policy.podeReagendar },
                { label: '3 a 6 dias', fee: '10%', active: policy.taxaReagendamentoPercent === 10 && policy.podeReagendar },
                { label: '1 a 2 dias', fee: '25%', active: policy.taxaReagendamentoPercent === 25 && policy.podeReagendar },
                { label: '< 24h', fee: 'Bloqueado', active: policy.horasAteSessao < 24 },
              ].map((tier) => (
                <div
                  key={tier.label}
                  className={`rounded-xl py-2 px-2 ${
                    tier.active
                      ? 'bg-white text-[#08090C] font-semibold'
                      : 'bg-[#0D1017] text-white/45'
                  }`}
                >
                  <span className="block text-[11px]">{tier.label}</span>
                  <span className="block text-xs mt-0.5">{tier.fee}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed pt-1">
              Ao alterar perto da data, a taxa mínima de cancelamento da data original é mantida para evitar cancelamentos após a remarcação.
            </p>
          </div>

          {!policy.podeReagendar ? (
            <div className="rounded-2xl bg-rose-500/12 p-4 flex items-start gap-3 text-xs text-rose-200">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>
                {policy.motivoBloqueioReagendamento ||
                  'Não é possível alterar a data desta sessão no momento.'}
              </span>
            </div>
          ) : loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-white/50">
              <Loader2 size={18} className="animate-spin text-[#FF1717]" />
              <span>Buscando horários disponíveis na pista...</span>
            </div>
          ) : availableDates.length === 0 ? (
            <div className="rounded-2xl bg-[#121622] p-5 text-center text-xs text-white/55">
              Nenhum outro horário com vagas disponíveis neste circuito nos próximos dias.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Escolha a nova data
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableDates.map((dateStr) => {
                    const active = selectedDate === dateStr;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateStr);
                          const firstForDate = slots.find((s) => s.data === dateStr);
                          if (firstForDate) setSelectedSlotId(firstForDate.id);
                        }}
                        className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-white text-[#08090C]'
                            : 'bg-[#121622] text-white/75 hover:bg-white/[0.08]'
                        }`}
                      >
                        {format(parseISO(dateStr), 'dd/MM (EEE)', { locale: ptBR })}
                      </button>
                    );
                  })}
                </div>
              </div>

              {slotsForDate.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Escolha o turno
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {slotsForDate.map((slot) => {
                      const active = selectedSlotId === slot.id;
                      const vagasRestantes = slot.vagasTotais - slot.vagasOcupadas;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-3 rounded-2xl text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#FF1717] text-white'
                              : 'bg-[#121622] text-white/80 hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="text-xs font-medium block">
                            {TURNO_LABEL[slot.turno]?.split(' ')[0] || slot.turno}
                          </span>
                          <span
                            className={`text-[11px] block mt-0.5 ${
                              active ? 'text-white/85' : 'text-white/45'
                            }`}
                          >
                            {vagasRestantes} {vagasRestantes === 1 ? 'vaga' : 'vagas'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-[#121622] p-4 flex items-center justify-between text-xs">
                <span className="text-white/65 flex items-center gap-2">
                  <Calendar size={14} className="text-[#FF1717]" />
                  <span>
                    Taxa de alteração ({policy.taxaReagendamentoPercent}%)
                  </span>
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {policy.taxaReagendamentoValor > 0
                    ? formatPrice(policy.taxaReagendamentoValor)
                    : 'Grátis'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            {policy.podeReagendar && availableDates.length > 0 && (
              <button
                type="button"
                disabled={submitting || !selectedSlotId}
                onClick={handleConfirmReschedule}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#08090C] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>Confirmar nova data</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
