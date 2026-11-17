import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Loader2,
  ScanLine,
  CarFront,
  Calendar,
  MapPin,
  UserCheck,
  User,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { QrCodeVisual } from '@/components/ui/QrCodeVisual';

export interface QrPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: number;
  initialTrackingCode?: string;
  initialPayload?: string;
  initialAssinatura?: string;
  initialCheckInEm?: string | null;
  isAdmin?: boolean;
  onCheckInCompleted?: (pedidoId: number, checkInEm: string) => void;
}

interface QrPassResumo {
  pedidoId: number;
  trackingCode: string;
  status: string;
  qrCodePayload: string;
  qrCodeAssinatura: string;
  qrCodeGeradoEm?: string;
  checkInRealizadoEm?: string | null;
  dadosDecodificados?: Record<string, string>;
}

interface ValidacaoResponse {
  valido: boolean;
  liberadoPitlane: boolean;
  assinaturaVerificada: boolean;
  algoritmo: string;
  mensagem: string;
  checkInRealizadoEm?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  APROVADO: { label: 'Confirmada', badgeClass: 'bg-emerald-500/15 text-emerald-300' },
  AGUARDANDO_APROVACAO: {
    label: 'Aguardando aprovação',
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
  PENDENTE: { label: 'Em validação', badgeClass: 'bg-white/[0.08] text-white/80' },
  REVISAO_CLIENTE: { label: 'Ajuste sugerido', badgeClass: 'bg-[#FF1717]/20 text-[#FF8A8A]' },
  CANCELADO: { label: 'Cancelada', badgeClass: 'bg-white/[0.06] text-white/45' },
  REJEITADO: { label: 'Não aprovada', badgeClass: 'bg-rose-500/15 text-rose-300' },
};

const MODALIDADE_LABELS: Record<string, string> = {
  VISITA_BOX: 'Visita ao Box & Paddock VIP',
  FAST_LAP: 'Fast Lap (Carona com piloto)',
  TRACK_EXPERIENCE: 'Track Experience (Pilotar)',
  PACOTE_VIP: 'Pacote VIP Full Day',
};

export function FiaQrPassModal({
  isOpen,
  onClose,
  pedidoId,
  initialTrackingCode,
  initialPayload,
  initialAssinatura,
  initialCheckInEm,
  isAdmin = false,
  onCheckInCompleted,
}: QrPassModalProps) {
  const [resumo, setResumo] = useState<QrPassResumo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validacao, setValidacao] = useState<ValidacaoResponse | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setValidacao(null);
      setShowTechDetails(false);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/api/pedidos/${pedidoId}/qrcode`);
        if (active) {
          setResumo(res.data);
        }
      } catch {
        if (active && initialPayload) {
          let decoded: Record<string, string> = {};
          try {
            decoded = JSON.parse(initialPayload);
          } catch {
            decoded = {};
          }
          setResumo({
            pedidoId,
            trackingCode: initialTrackingCode || `APX-${pedidoId}`,
            status: decoded.status || 'PENDENTE',
            qrCodePayload: initialPayload,
            qrCodeAssinatura: initialAssinatura || decoded.sig || '',
            checkInRealizadoEm: initialCheckInEm || null,
            dadosDecodificados: decoded,
          });
        } else if (active) {
          toast.error('Não foi possível carregar a credencial da sessão.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isOpen, pedidoId, initialPayload, initialTrackingCode, initialAssinatura, initialCheckInEm]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleCopyCode = async () => {
    const textToCopy = isAdmin
      ? resumo?.qrCodePayload || ''
      : resumo?.trackingCode || initialTrackingCode || `APX-${pedidoId}`;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(
        isAdmin ? 'Payload da credencial copiado!' : 'Código da credencial copiado!'
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar código.');
    }
  };

  const handleValidarCredencial = async (registrarCheckIn: boolean) => {
    if (!resumo?.qrCodePayload) return;
    try {
      setValidating(true);
      const res = await api.post('/api/pedidos/validar-qrcode', {
        qrData: resumo.qrCodePayload,
        registrarCheckIn,
      });
      const data: ValidacaoResponse = res.data;
      setValidacao(data);
      if (data.checkInRealizadoEm) {
        setResumo((prev) =>
          prev ? { ...prev, checkInRealizadoEm: data.checkInRealizadoEm } : prev
        );
        onCheckInCompleted?.(pedidoId, data.checkInRealizadoEm);
      }
      if (data.liberadoPitlane) {
        toast.success(data.mensagem);
      } else {
        toast.info(data.mensagem);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao validar credencial.');
    } finally {
      setValidating(false);
    }
  };

  const decoded = resumo?.dadosDecodificados || {};
  const trackingCode =
    resumo?.trackingCode || initialTrackingCode || `APX-${String(pedidoId).padStart(6, '0')}`;
  const statusInfo = STATUS_LABELS[resumo?.status || ''] || {
    label: resumo?.status || 'Pendente',
    badgeClass: 'bg-white/[0.08] text-white/80',
  };
  const modalidadeLabel =
    MODALIDADE_LABELS[decoded.modalidade || ''] || decoded.modalidade || 'Sessão de pista';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 font-sans">
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
            aria-label="Credencial de acesso"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0D1017] rounded-3xl shadow-2xl text-white"
          >
            {/* Header limpo */}
            <div className="flex items-start justify-between gap-4 px-6 sm:px-7 pt-6 sm:pt-7 pb-5 border-b border-white/[0.06]">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#121622] text-xs font-medium text-white/90 tabular-nums">
                    {trackingCode}
                  </span>
                  {resumo && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
                  Credencial de acesso ao box
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar credencial"
                className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {isLoading || !resumo ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={30} className="animate-spin text-[#FF1717]" />
                <span className="text-xs text-white/50">Carregando sua credencial...</span>
              </div>
            ) : (
              <div className="p-6 sm:p-7 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Coluna QR Code */}
                  <div className="md:col-span-5 flex flex-col items-center bg-[#121622] rounded-3xl p-5 text-center">
                    <QrCodeVisual payload={resumo.qrCodePayload} size={184} />

                    <div className="w-full mt-4 space-y-2.5">
                      {resumo.checkInRealizadoEm ? (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium">
                          <UserCheck size={13} />
                          <span>
                            Check-in às{' '}
                            {new Date(resumo.checkInRealizadoEm).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-white/55 leading-relaxed">
                          Apresente este QR Code na entrada do box no dia da sessão.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Coluna Dados da Credencial */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-[#121622]">
                        <span className="text-[11px] text-white/45 flex items-center gap-1.5">
                          <User size={12} className="text-[#FF1717]" />
                          <span>Piloto</span>
                        </span>
                        <span className="text-sm font-medium text-white block mt-1 truncate">
                          {decoded.pilotoNome || 'Piloto cadastrado'}
                        </span>
                        <span className="text-xs text-white/50 block mt-0.5 truncate">
                          {decoded.pilotoCnh && decoded.pilotoCnh !== 'ISENTO_BOX'
                            ? `CNH: ${decoded.pilotoCnh}`
                            : 'Habilitação verificada / isenta'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#121622]">
                        <span className="text-[11px] text-white/45 flex items-center gap-1.5">
                          <CarFront size={12} className="text-[#FF1717]" />
                          <span>Veículo</span>
                        </span>
                        <span className="text-sm font-medium text-white block mt-1 truncate">
                          {decoded.veiculo || 'Acesso ao Paddock VIP'}
                        </span>
                        <span className="text-xs text-white/50 block mt-0.5 truncate">
                          {decoded.placa ? `Placa ${decoded.placa}` : modalidadeLabel}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#121622]">
                        <span className="text-[11px] text-white/45 flex items-center gap-1.5">
                          <MapPin size={12} className="text-[#FF1717]" />
                          <span>Autódromo</span>
                        </span>
                        <span className="text-sm font-medium text-white block mt-1 truncate">
                          {decoded.circuito || 'Circuito Internacional'}
                        </span>
                        <span className="text-xs text-emerald-300/90 block mt-0.5 truncate">
                          Turno {decoded.turno || 'Confirmado'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#121622]">
                        <span className="text-[11px] text-white/45 flex items-center gap-1.5">
                          <Calendar size={12} className="text-white/55" />
                          <span>Data e horário</span>
                        </span>
                        <span className="text-sm font-medium text-white block mt-1">
                          {decoded.inicio
                            ? new Date(decoded.inicio).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Conforme reserva'}
                        </span>
                        <span className="text-xs text-white/50 block mt-0.5">
                          {decoded.inicio
                            ? `Início às ${new Date(decoded.inicio).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : modalidadeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Área técnica apenas para Administradores */}
                    {isAdmin && (
                      <div className="rounded-2xl bg-[#121622] p-3.5 space-y-2.5">
                        <button
                          type="button"
                          onClick={() => setShowTechDetails((prev) => !prev)}
                          className="w-full flex items-center justify-between text-xs font-medium text-white/75 hover:text-white cursor-pointer"
                        >
                          <span>Dados criptográficos e payload (Admin)</span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${showTechDetails ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showTechDetails && (
                          <pre className="text-[11px] text-white/60 bg-[#0D1017] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-28">
                            {resumo.qrCodePayload}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Resultado da verificação (Admin) */}
                    {validacao && (
                      <div
                        className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                          validacao.liberadoPitlane
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : validacao.valido
                            ? 'bg-amber-500/15 text-amber-200'
                            : 'bg-rose-500/15 text-rose-200'
                        }`}
                      >
                        {validacao.liberadoPitlane ? (
                          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{validacao.mensagem}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé de ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-4 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span>
                      {copied
                        ? 'Copiado'
                        : isAdmin
                        ? 'Copiar payload'
                        : 'Copiar código da reserva'}
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleValidarCredencial(false)}
                          disabled={validating}
                          className="px-4 py-2.5 rounded-full text-xs font-medium bg-[#121622] hover:bg-white/[0.08] text-white flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          {validating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ScanLine size={14} className="text-[#FF1717]" />
                          )}
                          <span>Validar assinatura</span>
                        </button>

                        {resumo.status === 'APROVADO' && (
                          <button
                            type="button"
                            onClick={() => handleValidarCredencial(true)}
                            disabled={validating}
                            className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            {validating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            <span>Registrar check-in</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-full bg-white hover:bg-white/90 text-[#08090C] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface PitlaneValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  onValidated?: () => void;
}

interface ValidatorFullResponse extends ValidacaoResponse {
  sessao?: Record<string, string | null> | null;
}

export function PitlaneQrValidatorModal({
  isOpen,
  onClose,
  onValidated,
}: PitlaneValidatorProps) {
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidatorFullResponse | null>(null);

  const handleValidate = async (registrarCheckIn: boolean) => {
    if (!qrInput.trim()) {
      toast.error('Cole o código lido do QR Code ou o código da reserva (APX-...).');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/api/pedidos/validar-qrcode', {
        qrData: qrInput.trim(),
        registrarCheckIn,
      });
      const data: ValidatorFullResponse = res.data;
      setResult(data);
      if (data.liberadoPitlane) {
        toast.success(data.mensagem);
        if (registrarCheckIn) onValidated?.();
      } else {
        toast.info(data.mensagem);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao validar credencial no servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#08090C]/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-xl bg-[#0D1017] rounded-3xl shadow-2xl text-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <div>
                <p className="text-xs text-[#FF1717] font-medium mb-0.5">Controle de Box</p>
                <h2 className="text-lg font-medium tracking-tight">
                  Validar credencial e check-in
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs text-white/60 block mb-2">
                  Código da reserva (APX-...) ou dados do QR Code
                </label>
                <textarea
                  rows={3}
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Ex: APX-1234ABCD"
                  className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] outline-none focus:ring-2 focus:ring-[#FF1717]/40 p-3.5 text-xs text-white placeholder:text-white/25 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleValidate(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-full text-xs font-medium bg-[#121622] hover:bg-white/[0.08] text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ScanLine size={14} className="text-[#FF1717]" />
                  )}
                  <span>Verificar credencial</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleValidate(true)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-full text-xs font-semibold bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserCheck size={14} />
                  )}
                  <span>Validar e fazer check-in</span>
                </button>
              </div>

              {result && (
                <div
                  className={`p-4 rounded-2xl space-y-3 ${
                    result.liberadoPitlane
                      ? 'bg-emerald-500/15'
                      : result.valido
                      ? 'bg-amber-500/15'
                      : 'bg-rose-500/15'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {result.liberadoPitlane ? (
                      <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{result.mensagem}</p>
                      <p className="text-xs text-white/60 mt-0.5">
                        Assinatura: {result.assinaturaVerificada ? 'Autêntica' : 'Inválida'} ·
                        Acesso ao box: {result.liberadoPitlane ? 'Liberado' : 'Bloqueado'}
                      </p>
                    </div>
                  </div>

                  {result.sessao && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-[11px] text-white/45 block">Piloto</span>
                        <span className="font-medium text-white">{result.sessao.pilotoNome}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-white/45 block">Veículo</span>
                        <span className="text-white/85">{result.sessao.veiculo}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-white/45 block">Circuito / Turno</span>
                        <span className="text-white/85">
                          {result.sessao.circuito} · {result.sessao.turno}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
