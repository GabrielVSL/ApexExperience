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
  FileCode2,
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

  useEffect(() => {
    if (!isOpen) {
      setValidacao(null);
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
          toast.error('Não foi possível carregar o QR Code da sessão.');
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

  const handleCopy = async () => {
    if (!resumo?.qrCodePayload) return;
    try {
      await navigator.clipboard.writeText(resumo.qrCodePayload);
      setCopied(true);
      toast.success('Payload JSON assinado copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar payload.');
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
        setResumo((prev) => (prev ? { ...prev, checkInRealizadoEm: data.checkInRealizadoEm } : prev));
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
  const sigPreview = resumo?.qrCodeAssinatura
    ? `${resumo.qrCodeAssinatura.slice(0, 12)}...${resumo.qrCodeAssinatura.slice(-8)}`
    : '---';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#0B0D12] border border-white/15 rounded-3xl shadow-2xl text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#10131B]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                    <ShieldCheck size={12} /> HMAC-SHA256 SIGNED
                  </span>
                  <span className="text-[11px] font-mono text-[#FF1717] font-bold">
                    #{resumo?.trackingCode || initialTrackingCode || `APX-${pedidoId}`}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-1.5">
                  Credencial FIA Paddock Pass — Box QR Code
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isLoading || !resumo ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={32} className="animate-spin text-[#FF1717]" />
                <span className="text-xs font-mono text-white/50">
                  Gerando credencial criptográfica da sessão...
                </span>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Coluna QR Code */}
                  <div className="md:col-span-5 flex flex-col items-center bg-[#08090C] border border-white/10 rounded-2xl p-5">
                    <QrCodeVisual payload={resumo.qrCodePayload} size={200} />

                    <div className="w-full mt-6 space-y-2 text-center">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                        Assinatura Digital
                      </p>
                      <p className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-1.5 px-2.5 break-all">
                        {sigPreview}
                      </p>
                      {resumo.checkInRealizadoEm ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium">
                          <UserCheck size={12} />
                          <span>Check-in Box: {new Date(resumo.checkInRealizadoEm).toLocaleString('pt-BR')}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-white/50">Aguardando leitura na portaria dos boxes</p>
                      )}
                    </div>
                  </div>

                  {/* Coluna Dados Decodificados dentro do QR */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block">
                          Piloto Titular
                        </span>
                        <span className="text-sm font-semibold text-white block mt-0.5 truncate">
                          {decoded.pilotoNome || '-'}
                        </span>
                        <span className="text-[11px] font-mono text-white/50 block truncate">
                          CNH: {decoded.pilotoCnh || 'ISENTO_BOX'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-1">
                          <CarFront size={11} className="text-[#FF1717]" /> Máquina &amp; Placa
                        </span>
                        <span className="text-sm font-semibold text-white block mt-0.5 truncate">
                          {decoded.veiculo || 'Acesso Boxes VIP'}
                        </span>
                        <span className="text-[11px] font-mono text-white/50 block">
                          {decoded.placa || 'BOX-VIP'} · {decoded.matricula || 'FIA-PASS'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-1">
                          <MapPin size={11} className="text-[#FF1717]" /> Circuito &amp; Turno
                        </span>
                        <span className="text-sm font-semibold text-white block mt-0.5 truncate">
                          {decoded.circuito || 'Autódromo Internacional'}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-300 block">
                          Turno {decoded.turno || 'FULL_DAY'} · {decoded.modalidade || ''}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-1">
                          <Calendar size={11} className="text-white/60" /> Status da Sessão
                        </span>
                        <span className="text-sm font-bold font-mono text-white block mt-0.5">
                          {resumo.status}
                        </span>
                        <span className="text-[11px] font-mono text-white/50 block">
                          {decoded.inicio ? new Date(decoded.inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Payload JSON Real Armazenado no QR */}
                    <div className="rounded-xl bg-[#08090C] border border-white/10 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                          <FileCode2 size={12} className="text-[#FF1717]" /> Payload Codificado no QR Code
                        </span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/80 cursor-pointer"
                        >
                          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copied ? 'Copiado' : 'Copiar Payload'}</span>
                        </button>
                      </div>
                      <pre className="text-[10px] font-mono text-white/65 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-28 custom-scrollbar">
                        {resumo.qrCodePayload}
                      </pre>
                    </div>

                    {/* Resultado da Verificação em Tempo Real */}
                    {validacao && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                          validacao.liberadoPitlane
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                            : validacao.valido
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        {validacao.liberadoPitlane ? (
                          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold">{validacao.mensagem}</p>
                          <p className="text-[10px] font-mono opacity-80 mt-0.5">
                            Algoritmo: {validacao.algoritmo} · Assinatura: {validacao.assinaturaVerificada ? 'AUTÊNTICA' : 'INVÁLIDA'} · Pitlane:{' '}
                            {validacao.liberadoPitlane ? 'LIBERADO' : 'RETIDO'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações do Rodapé */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleValidarCredencial(false)}
                    disabled={validating}
                    className="px-4 py-2.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/15 text-white flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {validating ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} className="text-[#FF1717]" />}
                    <span>Simular Leitura / Validar Credencial</span>
                  </button>

                  {isAdmin && resumo.status === 'APROVADO' && (
                    <button
                      type="button"
                      onClick={() => handleValidarCredencial(true)}
                      disabled={validating}
                      className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-[#FF1717]/25"
                    >
                      {validating ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      <span>Validar &amp; Registrar Check-in Box</span>
                    </button>
                  )}
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

export function PitlaneQrValidatorModal({ isOpen, onClose, onValidated }: PitlaneValidatorProps) {
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidatorFullResponse | null>(null);

  const handleValidate = async (registrarCheckIn: boolean) => {
    if (!qrInput.trim()) {
      toast.error('Cole o payload JSON do QR Code ou digite o Tracking Code (#APX-...).');
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
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-2xl bg-[#0B0D12] border border-white/15 rounded-3xl shadow-2xl text-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#10131B]">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF1717] mb-1">
                  Pitlane Control · Criptografia HMAC-SHA256
                </p>
                <h2 className="text-lg font-bold tracking-tight">Validador de QR Code &amp; Check-in Box</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block mb-2">
                  Payload JSON lido do QR Code ou Código APX
                </label>
                <textarea
                  rows={4}
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder='Ex: APX-1234ABCD ou {"v":"APEX-FIA-PASS-V2","pedidoId":1,"trackingCode":"APX-...","sig":"..."}'
                  className="w-full rounded-2xl bg-[#141720] border border-white/15 focus:border-[#FF1717] outline-none p-3.5 text-xs font-mono text-white placeholder:text-white/30"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleValidate(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/15 text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} className="text-[#FF1717]" />}
                  <span>Verificar Assinatura</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleValidate(true)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-full text-xs font-semibold bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF1717]/25"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                  <span>Validar &amp; Check-in Pitlane</span>
                </button>
              </div>

              {result && (
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    result.liberadoPitlane
                      ? 'bg-emerald-500/10 border-emerald-500/35'
                      : result.valido
                        ? 'bg-amber-500/10 border-amber-500/35'
                        : 'bg-rose-500/10 border-rose-500/35'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {result.liberadoPitlane ? (
                      <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{result.mensagem}</p>
                      <p className="text-[11px] font-mono text-white/60 mt-0.5">
                        {result.algoritmo} · Assinatura: {result.assinaturaVerificada ? 'AUTÊNTICA' : 'INVÁLIDA'} · Pitlane:{' '}
                        {result.liberadoPitlane ? 'LIBERADO' : 'BLOQUEADO'}
                      </p>
                    </div>
                  </div>

                  {result.sessao && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">PILOTO</span>
                        <span className="font-medium text-white">{result.sessao.pilotoNome}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">CNH</span>
                        <span className="font-mono text-white/85">{result.sessao.pilotoCnh}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">VEÍCULO / PLACA</span>
                        <span className="text-white/85">{result.sessao.veiculo} ({result.sessao.placa})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">CIRCUITO / TURNO</span>
                        <span className="text-white/85">{result.sessao.circuito} · {result.sessao.turno}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">STATUS</span>
                        <span className="font-mono text-white">{result.sessao.status}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">CHECK-IN BOX</span>
                        <span className="font-mono text-emerald-300">
                          {result.sessao.checkInRealizadoEm
                            ? new Date(result.sessao.checkInRealizadoEm).toLocaleTimeString('pt-BR')
                            : 'Pendente'}
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

