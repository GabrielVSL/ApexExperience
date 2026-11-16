'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Check,
  LogIn,
  AlertTriangle,
  Loader2,
  CreditCard,
  Zap,
  Gauge,
  Flame,
  X,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import {
  resolveStudioCarImage,
  resolveSideCarImage,
  getCarDisplaySpecs,
} from '@/lib/carPresentation';
import { CIRCUITS } from '@/services/telemetryService';
import { CountryFlag } from '@/components/ui/CountryFlag';
import WorldMapCanvas from '@/features/circuits/components/WorldMapCanvas';

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
  shortLabel: string;
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
    title: 'Track Experience',
    shortLabel: 'Track Experience',
    badge: 'Pilotar · CNH',
    description: 'Você no comando por um turno completo com rádio de box e telemetria VBOX.',
    multiplier: 1.0,
    requiresCar: true,
    requiresCnh: true,
  },
  {
    id: 'FAST_LAP',
    title: 'Fast Lap',
    shortLabel: 'Fast Lap',
    badge: 'Carona · Sem CNH',
    description: '2 voltas rápidas no limite ao lado de piloto profissional.',
    multiplier: 0.55,
    requiresCar: true,
    requiresCnh: false,
  },
  {
    id: 'PACOTE_VIP',
    title: 'Pacote VIP',
    shortLabel: 'Pacote VIP',
    badge: 'Full Day · CNH',
    description: 'Box privativo exclusivo, pneus dedicados e gravação on-board completa.',
    multiplier: 1.7,
    requiresCar: true,
    requiresCnh: true,
  },
  {
    id: 'VISITA_BOX',
    title: 'Visita ao Box',
    shortLabel: 'Visita ao Box',
    badge: 'Paddock · Sem CNH',
    description: 'Tour técnico guiado pelo pitlane, boxes e briefing com a equipe.',
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

const TURNO_SHORT_LABELS: Record<string, { name: string; hours: string }> = {
  MANHA: { name: 'Manhã', hours: '08h – 12h' },
  TARDE: { name: 'Tarde', hours: '13h – 17h' },
  NOTURNO: { name: 'Noturno', hours: '19h – 22h' },
};

const shortCircuitLabel = (name: string) =>
  name
    .replace('Circuit de la Sarthe ', '')
    .replace('Circuit de ', '')
    .replace('Autodromo Nazionale ', '')
    .replace('Autódromo de ', '')
    .replace(' International Racing Course', '')
    .replace(' Nordschleife', '')
    .replace(' Circuit', '')
    .replace(/[()]/g, '')
    .trim();

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
  lockCar = false,
}: SessionBookingModalProps) {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { formatPrice } = useCurrencyStore();

  const [fleetCars, setFleetCars] = useState<Automovel[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType>('TRACK_EXPERIENCE');
  const [selectedCar, setSelectedCar] = useState<Automovel | null>(initialCar);
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(
    initialCircuitId || 'nurburgring'
  );
  const [carCarouselIndex, setCarCarouselIndex] = useState<number>(0);

  const [slots, setSlots] = useState<TrackSlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const [formaPagamento, setFormaPagamento] = useState<'CARTEIRA_APEXPAY' | 'FATURA_APEXPAY'>(
    'CARTEIRA_APEXPAY'
  );
  const [perfil, setPerfil] = useState<UserProfile | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<{
    trackingCode: string;
    status: string;
    valorFinal: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    if (lockCar && initialCar) return [initialCar];
    if (circuitCars && circuitCars.length > 0) return circuitCars;
    if (fleetCars.length > 0) return fleetCars;
    if (initialCar) return [initialCar];
    return [];
  }, [lockCar, circuitCars, fleetCars, initialCar]);

  useEffect(() => {
    if (!isOpen) return;
    setCreatedBooking(null);
    setErrorMsg(null);
    setIsDatePickerOpen(false);

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

  useEffect(() => {
    if (!isOpen || !selectedCircuitId) return;
    setLoadingSlots(true);
    api
      .get(`/api/slots/${selectedCircuitId}`)
      .then((res) => {
        const list: TrackSlotItem[] = Array.isArray(res.data) ? res.data : [];
        setSlots(list);
        if (list.length > 0) {
          const firstAvailable =
            list.find((s) => s.vagasOcupadas < s.vagasTotais) || list[0];
          setSelectedDate(firstAvailable.data);
          setSelectedSlotId(firstAvailable.id);
          setCalendarMonth(startOfMonth(parseISO(firstAvailable.data)));
        } else {
          setSelectedDate('');
          setSelectedSlotId(null);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [isOpen, selectedCircuitId]);

  const selectCarAtIndex = (nextIdx: number) => {
    if (displayCars.length === 0) return;
    const normalized = (nextIdx + displayCars.length) % displayCars.length;
    setCarCarouselIndex(normalized);
    const car = displayCars[normalized];
    setSelectedCar(car);

    if (!lockCircuit && car.circuitosDisponiveis && car.circuitosDisponiveis.length > 0) {
      const match = car.circuitosDisponiveis.some((c) => c.id === selectedCircuitId);
      if (!match) {
        setSelectedCircuitId(car.circuitosDisponiveis[0].id);
      }
    }
  };

  const availableCircuits = useMemo(() => {
    if (selectedService === 'VISITA_BOX') {
      return CIRCUITS.map((c) => ({ id: c.id, nome: c.name }));
    }
    if (selectedCar?.circuitosDisponiveis && selectedCar.circuitosDisponiveis.length > 0) {
      return selectedCar.circuitosDisponiveis;
    }
    if (selectedCar?.circuito) {
      return [selectedCar.circuito];
    }
    return CIRCUITS.map((c) => ({ id: c.id, nome: c.name }));
  }, [selectedCar, selectedService]);

  const openDatesSet = useMemo(() => {
    const s = new Set<string>();
    slots.forEach((slot) => {
      if (slot.vagasOcupadas < slot.vagasTotais) {
        s.add(slot.data);
      }
    });
    return s;
  }, [slots]);

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

  const handleConfirm = async () => {
    setErrorMsg(null);

    if (!token || !user) {
      toast.info('Entre na sua conta para confirmar sua vaga no box.');
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
      setErrorMsg('Selecione uma data e turno disponíveis.');
      return;
    }

    if (activeService.requiresCar && !selectedCar) {
      setErrorMsg('Selecione um supercarro para esta modalidade.');
      return;
    }

    try {
      setIsSubmitting(true);
      const startHour =
        activeSlot.turno === 'MANHA'
          ? '08:00:00'
          : activeSlot.turno === 'TARDE'
            ? '13:00:00'
            : '19:00:00';
      const endHour =
        activeSlot.turno === 'MANHA'
          ? '12:00:00'
          : activeSlot.turno === 'TARDE'
            ? '17:00:00'
            : '22:00:00';

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
      toast.success('Sessão confirmada no box!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Não foi possível concluir o agendamento.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isAuthenticated = Boolean(token && user);
  const currentCar = selectedCar || displayCars[carCarouselIndex] || null;
  const carSpecs = currentCar ? getCarDisplaySpecs(currentCar) : null;
  const sideImg = currentCar ? resolveSideCarImage(currentCar) : null;
  const studioImg = currentCar ? resolveStudioCarImage(currentCar) : '/cars/porsche-studio.webp';

  const hasEnoughBalance =
    perfil !== null && Number(perfil.saldoCarteira || 0) >= pricing.finalPrice;
  const missingCnhForDriving =
    isAuthenticated && activeService.requiresCnh && perfil !== null && !perfil.cnhNumero;

  const formatDateFriendly = (isoDate: string) => {
    if (!isoDate) return 'Selecionar data';
    const parsed = parseISO(isoDate);
    const dowNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${dowNames[parsed.getDay()]}, ${parsed.getDate()} ${monthNames[parsed.getMonth()]}`;
  };

  const activeFreeSpots = activeSlot
    ? Math.max(0, activeSlot.vagasTotais - activeSlot.vagasOcupadas)
    : 0;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl font-sans text-white"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl h-[92vh] max-h-[840px] bg-[#08090C] rounded-[32px] shadow-[0_40px_110px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col lg:flex-row p-3 sm:p-4 gap-3 sm:gap-4"
        >
          {/* =================================================================
              COLUNA ESQUERDA: TODOS OS SELECIONÁVEIS + BOTÃO "VERIFICAR DATA"
             ================================================================= */}
          <div className="relative w-full lg:w-[47%] rounded-3xl bg-[#0D1017] p-5 sm:p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            {createdBooking ? (
              <div className="my-auto py-8 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center mx-auto">
                  <Check size={28} />
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FF1717]/15 text-[#FF1717] text-xs font-medium mb-2">
                    Box homologado
                  </span>
                  <h3 className="text-2xl font-medium tracking-tight text-white">
                    Sessão confirmada!
                  </h3>
                  <p className="text-xs text-white/55 mt-1">
                    Protocolo <strong className="text-white">{createdBooking.trackingCode}</strong>
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.04] p-4 text-xs text-white/75 space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-white/45">Experiência</span>
                    <span className="font-medium text-white">{activeService.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/45">Veículo</span>
                    <span className="font-medium text-white">
                      {activeService.requiresCar && currentCar
                        ? `${currentCar.marca} ${currentCar.modelo}`
                        : 'Paddock Pass'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/45">Circuito</span>
                    <span className="font-medium text-white">
                      {shortCircuitLabel(activeCircuitMeta.name)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-white/45">Total</span>
                    <span className="font-semibold text-white tabular-nums">
                      {formatPrice(createdBooking.valorFinal)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/meus-alugueis');
                    }}
                    className="flex-1 py-3 rounded-full bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Ver minhas sessões
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : isDatePickerOpen ? (
              /* SUB-TELA / POPOVER DO CALENDÁRIO E ESCOLHA DE TURNO */
              <div className="flex flex-col justify-between h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft size={15} />
                      <span>Voltar ao resumo</span>
                    </button>
                    <span className="text-xs font-medium text-[#FF1717]">
                      {shortCircuitLabel(activeCircuitMeta.name)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Escolha a data e o turno
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Segundas-feiras são fechadas para manutenção FIA.
                    </p>
                  </div>

                  {/* Calendário Customizado em Modo Escuro (Zero Bugs de CSS Externo) */}
                  {(() => {
                    const monthStart = startOfMonth(calendarMonth);
                    const monthEnd = endOfMonth(calendarMonth);
                    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    const leadingBlanks = getDay(monthStart);
                    const monthLabel = format(calendarMonth, 'MMMM yyyy', { locale: ptBR });

                    return (
                      <div className="rounded-3xl bg-[#121622] p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white capitalize">
                            {monthLabel}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                              aria-label="Mês anterior"
                              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                              aria-label="Próximo mês"
                              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center">
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((wd) => (
                            <span
                              key={wd}
                              className="text-[11px] font-medium text-white/40 py-1"
                            >
                              {wd}
                            </span>
                          ))}

                          {Array.from({ length: leadingBlanks }).map((_, i) => (
                            <div key={`blank-${i}`} />
                          ))}

                          {daysInMonth.map((day) => {
                            const iso = format(day, 'yyyy-MM-dd');
                            const isOpenDay = openDatesSet.has(iso);
                            const isSelected = iso === selectedDate;
                            const isMonday = getDay(day) === 1;

                            return (
                              <button
                                key={iso}
                                type="button"
                                disabled={!isOpenDay}
                                onClick={() => {
                                  if (!isOpenDay) return;
                                  setSelectedDate(iso);
                                  const firstForDate = slots.find(
                                    (s) => s.data === iso && s.vagasOcupadas < s.vagasTotais
                                  );
                                  if (firstForDate) setSelectedSlotId(firstForDate.id);
                                }}
                                title={
                                  isMonday
                                    ? 'Segunda-feira · Manutenção FIA'
                                    : isOpenDay
                                      ? 'Vagas disponíveis'
                                      : 'Sem vagas abertas'
                                }
                                className={`relative h-9 rounded-full flex items-center justify-center text-xs font-medium tabular-nums transition-all ${
                                  isSelected
                                    ? 'bg-[#FF1717] text-white font-semibold shadow-[0_0_16px_rgba(255,23,23,0.45)] cursor-pointer'
                                    : isOpenDay
                                      ? 'bg-white/[0.06] hover:bg-white/[0.15] text-white cursor-pointer'
                                      : 'text-white/20 cursor-not-allowed'
                                }`}
                              >
                                {day.getDate()}
                                {isOpenDay && !isSelected && (
                                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3 Turnos para o Dia Selecionado */}
                  <div className="space-y-2">
                    <span className="block text-xs text-white/55 font-medium">
                      Turnos em {formatDateFriendly(selectedDate)}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {slotsForSelectedDate.map((slot) => {
                        const livres = Math.max(0, slot.vagasTotais - slot.vagasOcupadas);
                        const esgotado = livres <= 0;
                        const active = activeSlot?.id === slot.id;
                        const meta = TURNO_SHORT_LABELS[slot.turno] || {
                          name: slot.turno,
                          hours: '',
                        };
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={esgotado}
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`rounded-2xl p-3 text-left transition-all ${
                              esgotado
                                ? 'bg-white/[0.02] text-white/25 cursor-not-allowed'
                                : active
                                  ? 'bg-white text-[#08090C] cursor-pointer'
                                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold">{meta.name}</span>
                              <Clock
                                size={12}
                                className={active ? 'text-[#FF1717]' : 'text-white/40'}
                              />
                            </div>
                            <span
                              className={`block text-[11px] mt-0.5 ${
                                active ? 'text-[#08090C]/70' : 'text-white/45'
                              }`}
                            >
                              {meta.hours}
                            </span>
                            <span
                              className={`block text-[10px] mt-1 font-medium ${
                                esgotado
                                  ? 'text-rose-400/70'
                                  : active
                                    ? 'text-emerald-700'
                                    : 'text-emerald-300'
                              }`}
                            >
                              {esgotado ? 'Esgotado' : `${livres} vagas`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="w-full py-3 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Confirmar {formatDateFriendly(selectedDate)} ·{' '}
                  {activeSlot ? TURNO_SHORT_LABELS[activeSlot.turno]?.name : 'Turno'}
                </button>
              </div>
            ) : (
              /* VISÃO PRINCIPAL DA ESQUERDA (LIMPA E SEM CORTES) */
              <div className="flex flex-col justify-between h-full gap-3">
                <div className="space-y-3">
                  {/* Vitrine Limpa 2 Ângulos do Carro em Foco */}
                  <div className="grid grid-cols-12 gap-2 h-28 sm:h-32 shrink-0">
                    <div className="col-span-7 relative rounded-2xl bg-[#121622] overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={activeService.requiresCar ? studioImg : '/pista.jpg'}
                        alt={
                          activeService.requiresCar && currentCar
                            ? `${currentCar.marca} ${currentCar.modelo}`
                            : activeCircuitMeta.name
                        }
                        className={
                          activeService.requiresCar
                            ? 'w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)]'
                            : 'w-full h-full object-cover'
                        }
                      />
                    </div>

                    <div className="col-span-5 rounded-2xl bg-[#121622] overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={activeService.requiresCar && sideImg ? sideImg : '/piloto.jpg'}
                        alt="Perfil lateral"
                        className={
                          activeService.requiresCar && sideImg
                            ? 'w-full h-full object-contain'
                            : 'w-full h-full object-cover object-top'
                        }
                      />
                    </div>
                  </div>

                  {/* Seletor Direto em Miniaturas dos 3 Carros (Opção 1) */}
                  {activeService.requiresCar && displayCars.length > 1 && (
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                      {displayCars.slice(0, 3).map((carItem, idx) => {
                        const isSelected = currentCar?.id === carItem.id;
                        return (
                          <button
                            key={carItem.id}
                            type="button"
                            onClick={() => selectCarAtIndex(idx)}
                            className={`rounded-2xl px-2.5 py-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-white/[0.11] ring-1 ring-[#FF1717] shadow-[0_6px_20px_rgba(255,23,23,0.18)]'
                                : 'bg-white/[0.03] hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className="h-9 w-full flex items-center justify-center mb-1">
                              <img
                                src={resolveStudioCarImage(carItem)}
                                alt={`${carItem.marca} ${carItem.modelo}`}
                                className="h-full w-auto object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]"
                              />
                            </div>
                            <p
                              className={`text-[11px] font-medium truncate ${
                                isSelected ? 'text-white' : 'text-white/75'
                              }`}
                            >
                              {carItem.modelo}
                            </p>
                            <p className="text-[10px] text-white/45 tabular-nums truncate">
                              {formatPrice(carItem.precoPorDia)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Título e Bandeira do Circuito */}
                  <div className="flex items-start justify-between gap-3 shrink-0">
                    <div>
                      <h2 className="text-lg sm:text-xl font-medium tracking-tight text-white">
                        {activeService.requiresCar && currentCar
                          ? `${currentCar.marca} ${currentCar.modelo}`
                          : 'Paddock & Pitlane Pass'}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-white/55">
                        <CountryFlag
                          countryCode={CIRCUIT_COUNTRY_CODES[selectedCircuitId] || 'DE'}
                          className="w-4 h-3 rounded-[2px] shrink-0"
                        />
                        <span>
                          {shortCircuitLabel(activeCircuitMeta.name)} · {activeCircuitMeta.country}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Mini Cards Compactos de Telemetria */}
                  {activeService.requiresCar && carSpecs && (
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5 flex items-center gap-2.5">
                        <Gauge size={14} className="text-[#FF1717] shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white tabular-nums">
                            {carSpecs.power}
                          </p>
                          <p className="text-[10px] text-white/45">Potência</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5 flex items-center gap-2.5">
                        <Zap size={14} className="text-amber-300 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white tabular-nums">
                            {carSpecs.accel}
                          </p>
                          <p className="text-[10px] text-white/45">0–100 km/h</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5 flex items-center gap-2.5">
                        <Flame size={14} className="text-emerald-300 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white tabular-nums">
                            {carSpecs.topSpeed}
                          </p>
                          <p className="text-[10px] text-white/45">Veloc. máx.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modalidade */}
                  <div className="space-y-1.5">
                    <span className="block text-xs text-white/50">Modalidade</span>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICE_OPTIONS.map((srv) => {
                        const active = srv.id === selectedService;
                        const est = srv.fixedPrice
                          ? srv.fixedPrice
                          : currentCar?.precoPorDia
                            ? Number(currentCar.precoPorDia) * srv.multiplier
                            : 0;
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setSelectedService(srv.id)}
                            className={`rounded-2xl px-3 py-2.5 text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-white text-[#08090C]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium truncate">
                                {srv.shortLabel}
                              </span>
                              <span
                                className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                                  active ? 'text-[#FF1717]' : 'text-white/75'
                                }`}
                              >
                                {est > 0 ? formatPrice(est) : '—'}
                              </span>
                            </div>
                            <span
                              className={`block text-[10px] mt-0.5 ${
                                active ? 'text-[#08090C]/65' : 'text-white/45'
                              }`}
                            >
                              {srv.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botão "Verificar data" (abre Calendário + Turnos) */}
                  <div className="space-y-1.5">
                    <span className="block text-xs text-white/50">Data e turno</span>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(true)}
                      className="w-full rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-[#FF1717]/15 text-[#FF1717] flex items-center justify-center shrink-0">
                          {loadingSlots ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CalendarDays size={15} />
                          )}
                        </span>
                        <div className="text-left min-w-0">
                          <span className="block text-xs font-medium text-white truncate">
                            {selectedDate
                              ? `${formatDateFriendly(selectedDate)} · ${
                                  activeSlot
                                    ? TURNO_SHORT_LABELS[activeSlot.turno]?.name || activeSlot.turno
                                    : 'Turno'
                                }`
                              : 'Verificar data disponível'}
                          </span>
                          <span className="block text-[11px] text-white/45 truncate">
                            {activeSlot
                              ? `${TURNO_SHORT_LABELS[activeSlot.turno]?.hours || ''} · ${activeFreeSpots} vagas livres`
                              : 'Clique para abrir o calendário'}
                          </span>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-white/[0.07] group-hover:bg-[#FF1717] text-[11px] font-medium text-white transition-colors shrink-0">
                        Verificar data
                      </span>
                    </button>
                  </div>

                  {/* Pagamento & Saldo */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.05]">
                      <button
                        type="button"
                        onClick={() => setFormaPagamento('CARTEIRA_APEXPAY')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          formaPagamento === 'CARTEIRA_APEXPAY'
                            ? 'bg-[#FF1717] text-white'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Wallet size={12} />
                        <span>Saldo ApexPay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormaPagamento('FATURA_APEXPAY')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          formaPagamento === 'FATURA_APEXPAY'
                            ? 'bg-[#FF1717] text-white'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <CreditCard size={12} />
                        <span>Fatura Pós-Paga</span>
                      </button>
                    </div>

                    {isAuthenticated && perfil && (
                      <div className="text-xs flex items-center gap-2">
                        <span className="text-white/45">Saldo:</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            hasEnoughBalance || formaPagamento === 'FATURA_APEXPAY'
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                          }`}
                        >
                          {formatPrice(perfil.saldoCarteira || 0)}
                        </span>
                        {!hasEnoughBalance && formaPagamento === 'CARTEIRA_APEXPAY' && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate('/apexpay');
                            }}
                            className="text-[11px] font-medium text-[#FF1717] hover:underline cursor-pointer"
                          >
                            Recarregar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé Esquerdo: Total + Botão Confirmar */}
                <div className="pt-3 mt-1 border-t border-white/[0.06] space-y-2.5 shrink-0">
                  {missingCnhForDriving && (
                    <div className="rounded-2xl bg-amber-400/10 px-3.5 py-2 text-[11px] text-amber-200 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-300 shrink-0" />
                      <span>Esta modalidade exige CNH válida cadastrada no perfil.</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-2xl bg-rose-500/15 px-3.5 py-2 text-xs text-rose-200 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-2xl font-semibold text-white tabular-nums leading-none">
                        {formatPrice(pricing.finalPrice)}
                      </div>
                      <span className="text-[11px] text-white/45">
                        por sessão {pricing.shiftFee > 0 ? '(incl. adicional turno)' : ''}
                      </span>
                    </div>

                    {!isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/login', { state: { from: window.location.pathname } });
                        }}
                        className="inline-flex items-center gap-2 bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs sm:text-sm font-medium px-5 py-3 rounded-full transition-colors cursor-pointer"
                      >
                        <LogIn size={15} />
                        <span>Entrar para reservar</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConfirm}
                          disabled={isSubmitting || Boolean(perfil?.inadimplente)}
                          className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 disabled:opacity-45 text-xs sm:text-sm font-medium px-5 py-3 rounded-full transition-colors cursor-pointer"
                        >
                          {isSubmitting ? 'Confirmando...' : 'Confirmar sessão'}
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirm}
                          disabled={isSubmitting || Boolean(perfil?.inadimplente)}
                          aria-label="Confirmar sessão"
                          className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-45 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)] cursor-pointer"
                        >
                          {isSubmitting ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <ArrowUpRight size={16} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================
              COLUNA DIREITA: MAPA SATÉLITE LIMPO CENTRALIZADO NO CIRCUITO
              (Sem cards no meio, sem dock por cima, sem filtro preto)
             ================================================================= */}
          <div className="w-full lg:w-[53%] min-h-[260px] rounded-3xl bg-[#0D1017] relative overflow-hidden flex flex-col justify-between p-4 sm:p-5">
            <div className="absolute inset-0 z-0">
              <WorldMapCanvas
                circuits={CIRCUITS}
                selectedCircuit={activeCircuitMeta}
                compact={true}
                defaultMapMode="satellite"
              />
            </div>

            {/* Topo: Pílulas de Circuitos + Botão Fechar */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {!lockCircuit &&
                  availableCircuits.map((c) => {
                    const active = c.id === selectedCircuitId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCircuitId(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap backdrop-blur-md transition-colors cursor-pointer ${
                          active
                            ? 'bg-white text-[#08090C] shadow-lg'
                            : 'bg-[#08090C]/80 hover:bg-[#08090C] text-white/85 hover:text-white'
                        }`}
                      >
                        <CountryFlag
                          countryCode={CIRCUIT_COUNTRY_CODES[c.id] || 'DE'}
                          className="w-3.5 h-2.5 rounded-[2px] shrink-0"
                        />
                        <span>{shortCircuitLabel(c.nome)}</span>
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar janela"
                className="w-9 h-9 rounded-full bg-[#08090C]/85 hover:bg-[#FF1717] text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer shrink-0 shadow-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Rodapé Discreto da Pista no Satélite */}
            <div className="relative z-10 flex items-end justify-between pointer-events-none">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#08090C]/80 backdrop-blur-md text-xs text-white shadow-lg">
                <CountryFlag
                  countryCode={CIRCUIT_COUNTRY_CODES[selectedCircuitId] || 'DE'}
                  className="w-4 h-3 rounded-[2px] shrink-0"
                />
                <span className="font-medium">{shortCircuitLabel(activeCircuitMeta.name)}</span>
                <span className="text-white/45">·</span>
                <span className="text-white/75 tabular-nums">{activeCircuitMeta.lengthKm}</span>
                <span className="text-white/45">·</span>
                <span className="text-white/75 tabular-nums">{activeCircuitMeta.corners} curvas</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default SessionBookingModal;
