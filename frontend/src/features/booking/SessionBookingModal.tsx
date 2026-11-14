'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Check,
  LogIn,
  UserPlus,
  KeyRound,
  AlertTriangle,
  Loader2,
  CreditCard,
  Zap,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { resolveStudioCarImage, getCarDisplaySpecs } from '@/lib/carPresentation';
import { CIRCUITS } from '@/services/telemetryService';
import { CountryFlag } from '@/components/ui/CountryFlag';

export interface CircuitoRef {
  id: string;
  nome: string;
  pais?: string;
}

export interface Automovel {
  id: number;
  matricula: string;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  imageUrl?: string;
  precoPorDia?: number;
  potenciaCv?: number;
  aceleracao0a100?: string;
  velocidadeMaxima?: string;
  categoria?: string;
  ativoBox?: boolean;
  circuito?: CircuitoRef;
  circuitosDisponiveis?: CircuitoRef[];
}

export interface TrackSlotItem {
  id: number;
  data: string; // YYYY-MM-DD
  turno: 'MANHA' | 'TARDE' | 'NOTURNO' | string;
  vagasTotais: number;
  vagasOcupadas: number;
  taxaAdicionalTurno: number;
}

export type ServiceType = 'TRACK_EXPERIENCE' | 'FAST_LAP' | 'PACOTE_VIP' | 'VISITA_BOX';

interface ServiceOption {
  id: ServiceType;
  title: string;
  badge: string;
  description: string;
  multiplier: number;
  fixedPrice?: number;
  requiresCar: boolean;
  requiresCnh: boolean;
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'TRACK_EXPERIENCE',
    title: 'Track Experience (Pilotar)',
    badge: 'Mais Escolhido',
    description: 'Você no comando com rádio de box e telemetria.',
    multiplier: 1.0,
    requiresCar: true,
    requiresCnh: true,
  },
  {
    id: 'FAST_LAP',
    title: 'Fast Lap (Carona c/ Piloto)',
    badge: 'Isento CNH',
    description: '2 voltas rápidas no limite com piloto profissional.',
    multiplier: 0.55,
    requiresCar: true,
    requiresCnh: false,
  },
  {
    id: 'PACOTE_VIP',
    title: 'Pacote VIP Full Day',
    badge: 'Box Exclusivo',
    description: 'Acesso VIP ilimitado, box privativo e telemetria 4K.',
    multiplier: 1.7,
    requiresCar: true,
    requiresCnh: true,
  },
  {
    id: 'VISITA_BOX',
    title: 'Visita ao Paddock & Pitlane',
    badge: 'Isento CNH',
    description: 'Tour guiado pelos boxes e fotos exclusivas.',
    multiplier: 0,
    fixedPrice: 890,
    requiresCar: false,
    requiresCnh: false,
  },
];

const CIRCUIT_COUNTRY_CODES: Record<string, string> = {
  nurburgring: 'DE',
  spa: 'BE',
  monza: 'IT',
  monaco: 'MC',
  le_mans: 'FR',
  silverstone: 'GB',
  interlagos: 'BR',
  suzuka: 'JP',
};

const TURNO_LABELS: Record<string, string> = {
  MANHA: 'Manhã · 08h às 12h',
  TARDE: 'Tarde · 13h às 17h',
  NOTURNO: 'Noturno · 19h às 22h',
};

interface SessionBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCar?: Automovel | null;
  initialCircuitId?: string | null;
  circuitCars?: Automovel[];
  lockCircuit?: boolean;
  lockCar?: boolean;
}

interface UserProfile {
  nome?: string;
  email?: string;
  telefone?: string;
  saldoCarteira: number;
  statusFinanceiro?: string;
  inadimplente: boolean;
  cnhNumero?: string;
  cnhCategoria?: string;
  dataNascimento?: string;
}

export function SessionBookingModal({
  isOpen,
  onClose,
  initialCar = null,
  initialCircuitId = null,
  circuitCars = [],
  lockCircuit = false,
}: SessionBookingModalProps) {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { formatPrice } = useCurrencyStore();

  const [fleetCars, setFleetCars] = useState<Automovel[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType>('TRACK_EXPERIENCE');
  const [selectedCar, setSelectedCar] = useState<Automovel | null>(initialCar);
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(initialCircuitId || 'nurburgring');
  const [carCarouselIndex, setCarCarouselIndex] = useState<number>(0);

  const [slots, setSlots] = useState<TrackSlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const [formaPagamento, setFormaPagamento] = useState<'CARTEIRA_APEXPAY' | 'FATURA_APEXPAY'>('CARTEIRA_APEXPAY');
  const [perfil, setPerfil] = useState<UserProfile | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<{ trackingCode: string; status: string; valorFinal: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Busca lista de carros da frota caso não tenham sido passados
  useEffect(() => {
    if (!isOpen) return;
    if (circuitCars && circuitCars.length > 0) {
      setFleetCars(circuitCars);
      return;
    }
    api
      .get('/api/automoveis')
      .then((res) => {
        const list: Automovel[] = Array.isArray(res.data) ? res.data : [];
        setFleetCars(list);
      })
      .catch(() => setFleetCars([]));
  }, [isOpen, circuitCars]);

  const displayCars = useMemo(() => {
    if (circuitCars && circuitCars.length > 0) return circuitCars;
    if (fleetCars.length > 0) return fleetCars;
    if (initialCar) return [initialCar];
    return [];
  }, [circuitCars, fleetCars, initialCar]);

  // Sincroniza estado inicial ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setCreatedBooking(null);
    setErrorMsg(null);

    const carToUse = initialCar || (displayCars.length > 0 ? displayCars[0] : null);
    if (carToUse) {
      setSelectedCar(carToUse);
      const idx = displayCars.findIndex((c) => c.id === carToUse.id);
      setCarCarouselIndex(idx >= 0 ? idx : 0);

      const carCircuit =
        initialCircuitId ||
        carToUse.circuitosDisponiveis?.[0]?.id ||
        carToUse.circuito?.id ||
        'nurburgring';
      setSelectedCircuitId(carCircuit);
    } else if (initialCircuitId) {
      setSelectedCircuitId(initialCircuitId);
    }
  }, [isOpen, initialCar, initialCircuitId, displayCars]);

  // Carrega perfil do usuário
  useEffect(() => {
    if (!isOpen || !token || !user) {
      setPerfil(null);
      return;
    }
    api
      .get('/api/usuarios/me')
      .then((res) => setPerfil(res.data))
      .catch(() => setPerfil(null));
  }, [isOpen, token, user]);

  // Carrega slots do circuito selecionado
  useEffect(() => {
    if (!isOpen || !selectedCircuitId) return;
    setLoadingSlots(true);
    api
      .get(`/api/slots/${selectedCircuitId}`)
      .then((res) => {
        const list: TrackSlotItem[] = Array.isArray(res.data) ? res.data : [];
        setSlots(list);
        if (list.length > 0) {
          const firstAvailable = list.find((s) => s.vagasOcupadas < s.vagasTotais) || list[0];
          setSelectedDate(firstAvailable.data);
          setSelectedSlotId(firstAvailable.id);
        } else {
          setSelectedDate('');
          setSelectedSlotId(null);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [isOpen, selectedCircuitId]);

  // Carro em foco no carrossel
  const viewedCar = displayCars[carCarouselIndex] || selectedCar || null;
  const isViewedCarSelected = selectedCar && viewedCar && selectedCar.id === viewedCar.id;

  const handleNextCar = () => {
    if (displayCars.length <= 1) return;
    setCarCarouselIndex((prev) => (prev + 1) % displayCars.length);
  };

  const handlePrevCar = () => {
    if (displayCars.length <= 1) return;
    setCarCarouselIndex((prev) => (prev - 1 + displayCars.length) % displayCars.length);
  };

  const handleSelectViewedCar = (car: Automovel) => {
    setSelectedCar(car);
    if (car.circuitosDisponiveis && car.circuitosDisponiveis.length > 0) {
      const match = car.circuitosDisponiveis.some((c) => c.id === selectedCircuitId);
      if (!match) {
        setSelectedCircuitId(car.circuitosDisponiveis[0].id);
      }
    }
  };

  const availableCircuits = useMemo(() => {
    if (selectedCar?.circuitosDisponiveis && selectedCar.circuitosDisponiveis.length > 0) {
      return selectedCar.circuitosDisponiveis;
    }
    if (selectedCar?.circuito) {
      return [selectedCar.circuito];
    }
    return CIRCUITS.map((c) => ({ id: c.id, nome: c.name }));
  }, [selectedCar]);

  // Datas únicas disponíveis
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(slots.map((s) => s.data)));
  }, [slots]);

  // Turnos para a data selecionada
  const slotsForSelectedDate = useMemo(() => {
    return slots.filter((s) => s.data === selectedDate);
  }, [slots, selectedDate]);

  const activeSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) || slotsForSelectedDate[0] || null,
    [slots, selectedSlotId, slotsForSelectedDate]
  );

  const activeService = useMemo(
    () => SERVICE_OPTIONS.find((s) => s.id === selectedService) || SERVICE_OPTIONS[0],
    [selectedService]
  );

  const activeCircuitMeta = useMemo(
    () => CIRCUITS.find((c) => c.id === selectedCircuitId) || CIRCUITS[0],
    [selectedCircuitId]
  );

  const pricing = useMemo(() => {
    let base = 0;
    if (activeService.fixedPrice) {
      base = activeService.fixedPrice;
    } else if (selectedCar?.precoPorDia) {
      base = Number(selectedCar.precoPorDia) * activeService.multiplier;
    }
    const shiftFee = activeSlot?.taxaAdicionalTurno ? Number(activeSlot.taxaAdicionalTurno) : 0;
    const subtotal = Math.round((base + shiftFee) * 100) / 100;
    return { base, shiftFee, subtotal, finalPrice: subtotal };
  }, [activeService, selectedCar, activeSlot]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token || !user) {
      toast.info('Faça login ou cadastre-se para reservar sua sessão.');
      onClose();
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (user.role !== 'CLIENTE') {
      setErrorMsg('Apenas contas de Piloto podem reservar sessões.');
      return;
    }

    if (perfil?.inadimplente) {
      setErrorMsg('Sua conta possui pendências no ApexPay. Regularize para agendar.');
      return;
    }

    if (!activeSlot) {
      setErrorMsg('Selecione uma data e turno válidos.');
      return;
    }

    if (activeService.requiresCar && !selectedCar) {
      setErrorMsg('Selecione um supercarro no carrossel.');
      return;
    }

    try {
      setIsSubmitting(true);
      const startHour =
        activeSlot.turno === 'MANHA' ? '08:00:00' : activeSlot.turno === 'TARDE' ? '13:00:00' : '19:00:00';
      const endHour =
        activeSlot.turno === 'MANHA' ? '12:00:00' : activeSlot.turno === 'TARDE' ? '17:00:00' : '22:00:00';

      const payload: Record<string, unknown> = {
        tipoServico: selectedService,
        trackSlot: { id: activeSlot.id },
        dataInicio: `${activeSlot.data}T${startHour}`,
        dataFim: `${activeSlot.data}T${endHour}`,
        valorTotal: pricing.subtotal,
        formaPagamento,
      };

      if (activeService.requiresCar && selectedCar) {
        payload.automovel = { id: selectedCar.id };
      }

      if (activeService.requiresCnh && perfil?.cnhNumero) {
        payload.cnhInformada = perfil.cnhNumero;
        if (perfil.dataNascimento) payload.dataNascimentoInformada = perfil.dataNascimento;
      }

      const res = await api.post('/api/pedidos', payload);
      setCreatedBooking({
        trackingCode: res.data.trackingCode || 'APX-CONFIRMED',
        status: res.data.status,
        valorFinal: res.data.valorFinal ?? pricing.finalPrice,
      });
      toast.success('Sessão registrada com sucesso no box!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Não foi possível concluir o agendamento.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const viewedSpecs = viewedCar ? getCarDisplaySpecs(viewedCar) : null;
  const isAuthenticated = Boolean(token && user);

  // Formata data ISO para "Sex, 15 Nov"
  const formatDateFriendly = (isoDate: string) => {
    if (!isoDate) return 'Selecione a data';
    const parsed = new Date(`${isoDate}T12:00:00`);
    const dowNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${dowNames[parsed.getDay()]}, ${parsed.getDate()} ${monthNames[parsed.getMonth()]}`;
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/85 backdrop-blur-xl font-sans text-white"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl h-[90vh] min-h-[620px] max-h-[820px] bg-[#0E1015] border border-white/10 rounded-[28px] sm:rounded-[36px] shadow-[0_35px_100px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col lg:flex-row"
        >
          {/* ========================================================
              COLUNA ESQUERDA: FORMULÁRIO CLEAN ESTILO LUXO (SEM CARDS EM PILHA)
             ======================================================== */}
          <div className="w-full lg:w-[48%] flex flex-col justify-between p-6 sm:p-9 relative bg-[#0B0D12] overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-white/10">
            {/* Topo do Formulário: Botão Minimalista de Voltar */}
            <div className="shrink-0 mb-5">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Voltar"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-2">
                  <CountryFlag
                    countryCode={CIRCUIT_COUNTRY_CODES[selectedCircuitId] || 'DE'}
                    className="w-5 h-3.5 rounded-sm shrink-0"
                  />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/60">
                    {activeCircuitMeta.name}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                Agendar Sessão
              </h2>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Reserve seu box exclusivo e prepare-se para acelerar no traçado oficial.
              </p>
            </div>

            {/* Tela de Sucesso / Voucher Emitido */}
            {createdBooking ? (
              <div className="my-auto py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF1717]">
                    Box Homologado
                  </p>
                  <h3 className="text-xl font-bold text-white mt-1">Sessão Confirmada!</h3>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    Protocolo: <span className="text-white font-semibold">{createdBooking.trackingCode}</span>
                  </p>
                </div>

                <div className="py-3 border-y border-white/10 text-xs text-white/70 space-y-1">
                  <p>
                    Supercarro:{' '}
                    <strong className="text-white">
                      {selectedCar ? `${selectedCar.marca} ${selectedCar.modelo}` : 'Paddock Pass'}
                    </strong>
                  </p>
                  <p>
                    Data:{' '}
                    <strong className="text-white">
                      {formatDateFriendly(activeSlot?.data || '')} ({activeSlot?.turno})
                    </strong>
                  </p>
                  <p className="text-[#FF1717] font-semibold text-sm pt-1">
                    Total: {formatPrice(createdBooking.valorFinal)}
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/meus-alugueis');
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Ver Minhas Sessões
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative flex-1 flex flex-col justify-between">
                {/* ========================================================
                    BLUR ELEGANTE: QUANDO O USUÁRIO NÃO ESTÁ LOGADO
                   ======================================================== */}
                {!isAuthenticated && (
                  <div className="absolute inset-0 z-30 backdrop-blur-xl bg-[#0B0D12]/85 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#FF1717]/15 border border-[#FF1717]/30 flex items-center justify-center text-[#FF1717] mb-3">
                      <KeyRound size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">
                      Você Não Está Logado Ainda
                    </h3>
                    <p className="text-xs text-white/60 mt-1.5 max-w-xs leading-relaxed">
                      Para emitir sua credencial de box e gravar a telemetria em seu nome, entre na sua conta ou cadastre-se no paddock.
                    </p>

                    <div className="flex gap-3 w-full max-w-xs mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/login', { state: { from: window.location.pathname } });
                        }}
                        className="flex-1 py-3 rounded-xl bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF1717]/25"
                      >
                        <LogIn size={14} />
                        <span>Fazer Login</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/login?mode=register', { state: { from: window.location.pathname } });
                        }}
                        className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserPlus size={14} />
                        <span>Cadastrar-se</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* FORMULÁRIO PRINCIPAL COM CAMPOS LIMPOS (ESTILO REFERÊNCIA) */}
                <form onSubmit={handleConfirm} className="space-y-4">
                  {/* Identificação do Piloto Logado (Discreta, sem card pesado) */}
                  {isAuthenticated && user && (
                    <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-white">{perfil?.nome || user.email.split('@')[0]}</span>
                        <span className="text-[10px] font-mono text-white/40">
                          (CNH: {perfil?.cnhNumero || 'Cadastrada'})
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400">
                        Saldo: {formatPrice(perfil?.saldoCarteira || 0)}
                      </span>
                    </div>
                  )}

                  {/* Campo 1: Autódromo Homologado */}
                  {!lockCircuit && availableCircuits.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/50 mb-1.5">
                        Autódromo Homologado
                      </label>
                      <div className="relative">
                        <select
                          value={selectedCircuitId}
                          onChange={(e) => setSelectedCircuitId(e.target.value)}
                          className="w-full h-11 px-3.5 rounded-xl bg-[#171A21] border border-white/10 text-xs font-medium text-white outline-none focus:border-[#FF1717] cursor-pointer appearance-none"
                        >
                          {availableCircuits.map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#0B0D12] text-white">
                              {c.nome}
                            </option>
                          ))}
                        </select>
                        <ChevronRight
                          size={14}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-white/40 pointer-events-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campo 2: Modalidade da Sessão */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/50 mb-1.5">
                      Modalidade da Bateria
                    </label>
                    <div className="relative">
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value as ServiceType)}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#171A21] border border-white/10 text-xs font-medium text-white outline-none focus:border-[#FF1717] cursor-pointer appearance-none"
                      >
                        {SERVICE_OPTIONS.map((srv) => {
                          const estPrice = srv.fixedPrice
                            ? srv.fixedPrice
                            : selectedCar?.precoPorDia
                            ? Number(selectedCar.precoPorDia) * srv.multiplier
                            : 0;
                          return (
                            <option key={srv.id} value={srv.id} className="bg-[#0B0D12] text-white">
                              {srv.title} · {srv.badge} ({estPrice > 0 ? formatPrice(estPrice) : 'Sob Consulta'})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronRight
                        size={14}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-white/40 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Campos 3 & 4 Lado a Lado: Data e Turno (Exatamente como Check-in e Check-out da Referência) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Data */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/50 mb-1.5">
                        Data da Bateria
                      </label>
                      <div className="relative">
                        <select
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            const firstForDate = slots.find(
                              (s) => s.data === e.target.value && s.vagasOcupadas < s.vagasTotais
                            );
                            if (firstForDate) setSelectedSlotId(firstForDate.id);
                          }}
                          className="w-full h-11 pl-9 pr-8 rounded-xl bg-[#171A21] border border-white/10 text-xs font-medium text-white outline-none focus:border-[#FF1717] cursor-pointer appearance-none font-mono"
                        >
                          {uniqueDates.map((d) => (
                            <option key={d} value={d} className="bg-[#0B0D12] text-white">
                              {formatDateFriendly(d)}
                            </option>
                          ))}
                        </select>
                        {loadingSlots ? (
                          <Loader2 size={14} className="animate-spin text-[#FF1717] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        ) : (
                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        )}
                        <ChevronRight
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-white/40 pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Turno */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/50 mb-1.5">
                        Turno no Box
                      </label>
                      <div className="relative">
                        <select
                          value={selectedSlotId ?? ''}
                          onChange={(e) => setSelectedSlotId(parseInt(e.target.value, 10))}
                          className="w-full h-11 pl-9 pr-8 rounded-xl bg-[#171A21] border border-white/10 text-xs font-medium text-white outline-none focus:border-[#FF1717] cursor-pointer appearance-none"
                        >
                          {slotsForSelectedDate.map((slot) => {
                            const livres = slot.vagasTotais - slot.vagasOcupadas;
                            const esgotado = livres <= 0;
                            return (
                              <option
                                key={slot.id}
                                value={slot.id}
                                disabled={esgotado}
                                className="bg-[#0B0D12] text-white"
                              >
                                {TURNO_LABELS[slot.turno] || slot.turno} ({livres} vagas)
                              </option>
                            );
                          })}
                        </select>
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <ChevronRight
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-white/40 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campo 5: Forma de Pagamento */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/50 mb-1.5">
                      Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormaPagamento('CARTEIRA_APEXPAY')}
                        className={`h-11 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          formaPagamento === 'CARTEIRA_APEXPAY'
                            ? 'bg-[#FF1717]/15 border-[#FF1717] text-white ring-1 ring-[#FF1717]/40'
                            : 'bg-[#171A21] border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <span>Saldo ApexPay</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormaPagamento('FATURA_APEXPAY')}
                        className={`h-11 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          formaPagamento === 'FATURA_APEXPAY'
                            ? 'bg-[#FF1717]/15 border-[#FF1717] text-white ring-1 ring-[#FF1717]/40'
                            : 'bg-[#171A21] border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <span>Fatura Pós-Paga</span>
                        <CreditCard size={13} className="text-white/40" />
                      </button>
                    </div>
                  </div>

                  {/* Mensagem de Erro (se houver) */}
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Botão de Confirmação (Estilo 'Complete your booking' da referência) */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || Boolean(perfil?.inadimplente)}
                      className="w-full h-12 rounded-xl bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-[#FF1717]/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Processando Agendamento...</span>
                        </>
                      ) : (
                        <span>
                          Confirmar Agendamento · {formatPrice(pricing.finalPrice)}
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ========================================================
              COLUNA DIREITA: VITRINE DE ESTÚDIO FULL-BLEED (CARROSSEL)
             ======================================================== */}
          <div className="w-full lg:w-[52%] relative bg-gradient-to-br from-[#121620] via-[#080A0E] to-[#040507] p-6 sm:p-9 flex flex-col justify-between overflow-hidden">
            {/* Glow cinematográfico de pista */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: 'radial-gradient(circle at 60% 55%, rgba(255, 23, 23, 0.25) 0%, transparent 65%)',
              }}
            />

            {/* Topo da Vitrine: Posição do Carrossel e Categoria */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF1717] flex items-center gap-1.5">
                <Zap size={12} />
                <span>Supercarros de Alta Velocidade</span>
              </span>

              {displayCars.length > 1 && (
                <span className="text-[11px] font-mono text-white/50">
                  {carCarouselIndex + 1} / {displayCars.length}
                </span>
              )}
            </div>

            {/* Imagem do Supercarro com Setas Minimalistas */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto py-4">
              <div className="relative w-full aspect-[16/10] max-h-[340px] flex items-center justify-center">
                {/* Seta Esquerda */}
                {displayCars.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevCar}
                    aria-label="Carro anterior"
                    className="absolute left-2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-[#FF1717] text-white/70 hover:text-white border border-white/15 flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}

                {/* Carro em foco */}
                {viewedCar && (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={viewedCar.id}
                      src={resolveStudioCarImage(viewedCar)}
                      alt={`${viewedCar.marca} ${viewedCar.modelo}`}
                      initial={{ opacity: 0, x: 20, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.96 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full h-full object-contain filter drop-shadow-[0_24px_40px_rgba(0,0,0,0.95)]"
                    />
                  </AnimatePresence>
                )}

                {/* Seta Direita */}
                {displayCars.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextCar}
                    aria-label="Próximo carro"
                    className="absolute right-2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-[#FF1717] text-white/70 hover:text-white border border-white/15 flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              {/* Botão de Selecionar Carro */}
              {viewedCar && (
                <div className="mt-3">
                  {isViewedCarSelected ? (
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-semibold">
                      <Check size={14} />
                      <span>Carro Selecionado</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectViewedCar(viewedCar)}
                      className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-white hover:bg-[#FF1717] text-[#08090C] hover:text-white text-xs font-semibold transition-all shadow-md cursor-pointer hover:scale-105"
                    >
                      <Check size={14} />
                      <span>Escolher este Supercarro</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé da Vitrine: Título, Descrição Poética & Telemetria HUD */}
            {viewedCar && viewedSpecs && (
              <div className="relative z-10 pt-4 border-t border-white/10 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {viewedCar.marca} {viewedCar.modelo}
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Engenharia de pista pura · {viewedSpecs.power} · 0–100 km/h em {viewedSpecs.accel}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-white shrink-0">
                    {formatPrice(viewedCar.precoPorDia)} / dia
                  </span>
                </div>

                {/* Pontos de Navegação do Carrossel */}
                {displayCars.length > 1 && (
                  <div className="flex justify-center items-center gap-1.5 pt-2">
                    {displayCars.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCarCarouselIndex(i)}
                        aria-label={`Ver ${c.modelo}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === carCarouselIndex ? 'w-6 bg-[#FF1717]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default SessionBookingModal;
