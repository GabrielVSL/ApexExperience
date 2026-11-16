'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  ArrowUpRight,
  Flame,
  Gauge,
  Zap,
  MapPin,
} from 'lucide-react';
import { api } from '@/services/api';
import { BookingModal, Automovel } from '../components/BookingModal';
import { CarBlueprintSvg } from '../components/CarBlueprintSvg';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getCarDetailSheet,
  getCarDisplaySpecs,
  resolveSideCarImage,
  resolveStudioCarImage,
} from '@/lib/carPresentation';

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

function resolveCountryCode(circuitId?: string, circuitName?: string): string {
  if (circuitId && CIRCUIT_COUNTRY_CODES[circuitId]) {
    return CIRCUIT_COUNTRY_CODES[circuitId];
  }
  const lower = (circuitName || '').toLowerCase();
  if (lower.includes('interlagos')) return 'BR';
  if (lower.includes('spa')) return 'BE';
  if (lower.includes('monza')) return 'IT';
  if (lower.includes('monaco') || lower.includes('mônaco')) return 'MC';
  if (lower.includes('mans')) return 'FR';
  if (lower.includes('silverstone')) return 'GB';
  if (lower.includes('suzuka')) return 'JP';
  return 'DE';
}

function formatCircuitLabel(name: string): string {
  return name
    .replace('Circuit de la Sarthe ', '')
    .replace('Circuit de ', '')
    .replace('Autodromo Nazionale ', '')
    .replace('Autódromo de ', '')
    .replace(' International Racing Course', '')
    .replace(' Nordschleife', '')
    .replace(' Circuit', '')
    .replace(/[()]/g, '')
    .trim();
}

interface HeroAngleOption {
  id: string;
  label: string;
  src: string;
}

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatPrice } = useCurrencyStore();
  const { user } = useAuthStore();
  const isStaff = Boolean(user && user.role !== 'CLIENTE');
  const staffTarget = '/frota';

  const [car, setCar] = useState<Automovel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeAngleIdx, setActiveAngleIdx] = useState(0);
  const [showMoreSpecs, setShowMoreSpecs] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setActiveAngleIdx(0);
    setShowMoreSpecs(false);

    const fetchCar = async () => {
      if (!id) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setNotFound(false);

      try {
        const res = await api.get(`/api/automoveis/${id}`);
        setCar(res.data);
      } catch {
        try {
          const allRes = await api.get('/api/automoveis');
          const list = Array.isArray(allRes.data) ? (allRes.data as Automovel[]) : [];
          const found = list.find((item) => String(item.id) === String(id)) ?? null;
          setCar(found);
          setNotFound(!found);
        } catch {
          setNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCar();
  }, [id]);

  // Apenas imagens recortadas em estúdio sem fundo (.webp) na mesma proporção
  const heroAngles = useMemo<HeroAngleOption[]>(() => {
    if (!car) return [];
    const studioSrc = resolveStudioCarImage(car);
    const sideSrc = resolveSideCarImage(car);

    const options: HeroAngleOption[] = [];
    if (sideSrc) {
      options.push({ id: 'side', label: 'Perfil Lateral', src: sideSrc });
    }
    options.push({ id: 'studio', label: 'Estúdio 3/4', src: studioSrc });
    return options;
  }, [car]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF1717]" size={34} />
          <span className="text-xs text-white/50">Carregando especificações...</span>
        </div>
      </div>
    );
  }

  if (notFound || !car) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#08090C] text-white px-6 text-center">
        <p className="text-xs font-medium text-[#FF1717] mb-3">
          404 · Veículo não localizado
        </p>
        <h1 className="text-3xl font-medium tracking-tight mb-3">
          Automóvel indisponível no box
        </h1>
        <p className="text-sm text-white/60 max-w-md mb-8">
          O modelo solicitado não foi encontrado no catálogo ativo. Volte à frota para explorar os supercarros disponíveis.
        </p>
        <Link
          to="/cars"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FF1717] text-white text-xs font-medium hover:bg-[#e01414] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Frota</span>
        </Link>
      </div>
    );
  }

  const displaySpecs = getCarDisplaySpecs(car);
  const detailSheet = getCarDetailSheet(car);
  const activeAngle = heroAngles[activeAngleIdx] ?? heroAngles[0];
  const circuitsList =
    car.circuitosDisponiveis && car.circuitosDisponiveis.length > 0
      ? car.circuitosDisponiveis.map((c) => ({
          id: c.id,
          label: formatCircuitLabel(c.nome),
          countryCode: resolveCountryCode(c.id, c.nome),
        }))
      : [
          {
            id: displaySpecs.circuit.toLowerCase(),
            label: formatCircuitLabel(displaySpecs.circuit),
            countryCode: resolveCountryCode(undefined, displaySpecs.circuit),
          },
        ];

  return (
    <div className="min-h-screen bg-[#08090C] text-white pt-24 pb-20 selection:bg-[#FF1717] selection:text-white font-sans">
      {/* =====================================================================
          1. BREADCRUMB + TÍTULO MONUMENTAL + PALCO DO CARRO + TELEMETRIA E CTA
         ===================================================================== */}
      <section className="relative overflow-hidden pb-14 sm:pb-20">
        <div className="absolute top-36 left-1/2 -translate-x-1/2 w-[900px] h-[440px] bg-[radial-gradient(ellipse,rgba(255,255,255,0.06)_0%,transparent_68%)] pointer-events-none" />

        <div className="container mx-auto max-w-6xl px-6 relative z-10">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-xs text-white/45 mb-8 sm:mb-10"
            aria-label="Navegação estrutural"
          >
            <Link to="/cars" className="hover:text-white transition-colors">
              Frota
            </Link>
            <ChevronRight size={12} className="text-white/30" />
            <span className="text-white/60">{car.marca}</span>
            <ChevronRight size={12} className="text-white/30" />
            <span className="text-white/90 font-medium">{car.modelo}</span>
          </nav>

          {/* Tipografia Monumental estilo estúdio automotivo */}
          <div className="relative select-none pointer-events-none mb-2 sm:-mb-6">
            <p className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-[0.06em] uppercase leading-[0.95] bg-gradient-to-b from-white/35 via-white/15 to-transparent bg-clip-text text-transparent">
              {detailSheet.heroTitleTop}
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-[0.04em] uppercase leading-[0.95] bg-gradient-to-b from-white/25 via-white/10 to-transparent bg-clip-text text-transparent">
              {detailSheet.heroTitleSub}
            </h1>
          </div>

          {/* Palco Principal do Veículo + Dots de Vista à Direita */}
          <div className="relative flex items-center justify-center my-2 sm:my-4">
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[72%] max-w-2xl h-10 rounded-full bg-black/90 blur-xl pointer-events-none" />

            <div className="w-full max-w-4xl h-56 sm:h-80 md:h-96 flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {activeAngle && (
                  <motion.img
                    key={activeAngle.id}
                    src={activeAngle.src}
                    alt={`${car.marca} ${car.modelo} — ${activeAngle.label}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full object-contain drop-shadow-[0_24px_38px_rgba(0,0,0,0.9)]"
                  />
                )}
              </AnimatePresence>
            </div>

            {heroAngles.length > 1 && (
              <div
                className="hidden sm:flex flex-col items-center gap-3 absolute right-0 top-1/2 -translate-y-1/2 z-20"
                aria-label="Selecionar ângulo do veículo"
              >
                {heroAngles.map((angle, idx) => {
                  const isActive = idx === activeAngleIdx;
                  return (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => setActiveAngleIdx(idx)}
                      title={angle.label}
                      aria-label={angle.label}
                      className={`transition-all cursor-pointer rounded-full ${
                        isActive
                          ? 'w-4 h-4 bg-[#FF1717] ring-4 ring-[#FF1717]/20'
                          : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/70'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Seletor discreto mobile para ângulos */}
          {heroAngles.length > 1 && (
            <div className="flex sm:hidden justify-center gap-2.5 mt-3 mb-4">
              {heroAngles.map((angle, idx) => (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => setActiveAngleIdx(idx)}
                  className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                    idx === activeAngleIdx
                      ? 'bg-[#FF1717] text-white'
                      : 'bg-white/[0.06] text-white/60'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>
          )}

          {/* Barra de Telemetria + Preço e Reserva Imediata na Primeira Tela */}
          <div className="mt-8 sm:mt-10 rounded-3xl bg-[#0D1017] p-5 sm:px-8 sm:py-6 max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="grid grid-cols-3 gap-6 sm:gap-10 w-full lg:w-auto text-center sm:text-left">
              <div>
                <div className="inline-flex items-center gap-1.5 text-lg sm:text-2xl font-medium tracking-tight text-white tabular-nums">
                  <Zap size={16} className="text-amber-300 hidden sm:inline" />
                  <span>{displaySpecs.accel}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/45 mt-1">
                  0 a 100 km/h
                </p>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-lg sm:text-2xl font-medium tracking-tight text-white tabular-nums">
                  <Gauge size={16} className="text-[#FF1717] hidden sm:inline" />
                  <span>{displaySpecs.power}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/45 mt-1">
                  Potência homologada
                </p>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-lg sm:text-2xl font-medium tracking-tight text-white tabular-nums">
                  <Flame size={16} className="text-emerald-300 hidden sm:inline" />
                  <span>{displaySpecs.topSpeed}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/45 mt-1">
                  Velocidade máxima
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-between lg:justify-end gap-5 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
              <div className="text-left">
                <span className="block text-[11px] text-white/45">A partir de</span>
                <span className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                  {formatPrice(car.precoPorDia)}
                  <span className="text-xs font-normal text-white/45 ml-1">/sessão</span>
                </span>
              </div>

              {isStaff ? (
                <Link
                  to={staffTarget}
                  className="inline-flex items-center gap-2 bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors"
                >
                  <span>Gerenciar nos boxes</span>
                  <ArrowUpRight size={15} />
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(true)}
                    className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors cursor-pointer"
                  >
                    Reservar sessão
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(true)}
                    aria-label="Reservar sessão"
                    className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)] cursor-pointer"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. CARACTERÍSTICAS TÉCNICAS + BLUEPRINT CAD + RODAPÉ DE AÇÃO
         ===================================================================== */}
      <section className="py-10 sm:py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Cabeçalho da Seção + Circuitos Homologados com Bandeira */}
          <div className="space-y-5 mb-12 sm:mb-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-white">
                  Características
                </h2>
                <p className="text-xs sm:text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
                  {detailSheet.designDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-white/45 inline-flex items-center gap-1.5 mr-1 shrink-0">
                <MapPin size={13} className="text-[#FF1717]" />
                <span>Pistas homologadas:</span>
              </span>
              {circuitsList.map((circuit) => (
                <Link
                  key={circuit.id}
                  to="/pistas"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D1017] hover:bg-white/[0.08] text-xs font-medium text-white/85 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <CountryFlag
                    countryCode={circuit.countryCode}
                    className="w-4 h-3 rounded-[2px] shrink-0"
                  />
                  <span>{circuit.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Coluna Esquerda: 5 Especificações */}
            <div className="md:col-span-4 space-y-6 text-center">
              {detailSheet.leftSpecs.map((spec) => (
                <div key={spec.label}>
                  <p className="text-xs text-white/45 mb-1">{spec.label}</p>
                  <p className="text-base sm:text-lg font-medium text-white tracking-tight">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Centro: Blueprint Técnico CAD em Vista Superior */}
            <div className="md:col-span-4 flex items-center justify-center py-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,23,23,0.08)_0%,rgba(255,255,255,0.04)_40%,transparent_72%)] pointer-events-none" />
                <CarBlueprintSvg
                  architecture={detailSheet.blueprint}
                  className="w-52 sm:w-64 h-auto"
                />
              </div>
            </div>

            {/* Coluna Direita: 5 Especificações */}
            <div className="md:col-span-4 space-y-6 text-center">
              {detailSheet.rightSpecs.map((spec) => (
                <div key={spec.label}>
                  <p className="text-xs text-white/45 mb-1">{spec.label}</p>
                  <p className="text-base sm:text-lg font-medium text-white tracking-tight">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Toggle "Ver mais características" */}
          <div className="mt-14">
            <div className="relative flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowMoreSpecs((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-[#0D1017] hover:bg-white/[0.08] px-6 py-2.5 text-xs font-medium text-white/75 hover:text-white transition-colors cursor-pointer"
              >
                <span>{showMoreSpecs ? 'Ocultar características' : 'Ver mais características'}</span>
                {showMoreSpecs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            <AnimatePresence>
              {showMoreSpecs && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-8 text-center">
                    {detailSheet.extraSpecs.map((extra) => (
                      <div key={extra.label} className="p-5 rounded-3xl bg-[#0D1017]">
                        <p className="text-xs text-white/45 mb-1.5">{extra.label}</p>
                        <p className="text-sm font-medium text-white/90">{extra.value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Barra Final Integrada: Reservar Sessão + Ver Toda a Frota */}
          <div className="mt-14 rounded-3xl bg-[#0D1017] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-xl font-medium tracking-tight text-white">
                {car.marca} {car.modelo}
              </p>
              <p className="text-xs sm:text-sm text-white/50 mt-1 tabular-nums">
                Sessões a partir de{' '}
                <span className="text-white font-medium">{formatPrice(car.precoPorDia)}</span>{' '}
                · combustível e telemetria VBOX inclusos
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/cars"
                className="px-5 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs sm:text-sm font-medium text-white/75 hover:text-white transition-colors"
              >
                Ver toda a frota
              </Link>

              {isStaff ? (
                <Link
                  to={staffTarget}
                  className="inline-flex items-center gap-2 bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors"
                >
                  <span>Gerenciar nos boxes</span>
                  <ArrowUpRight size={15} />
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(true)}
                    className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors cursor-pointer"
                  >
                    Reservar sessão
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(true)}
                    aria-label="Reservar sessão"
                    className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)] cursor-pointer"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        car={car}
      />
    </div>
  );
}
