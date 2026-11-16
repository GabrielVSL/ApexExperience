'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarDay {
  day: number;
  col: number;
  row: number;
  closed?: boolean;
}

// Grade de 3 semanas (21 dias): Segundas-feiras (col 1) fechadas para manutenção FIA
const CALENDAR_DAYS: CalendarDay[] = [
  { day: 10, col: 0, row: 0 },
  { day: 11, col: 1, row: 0, closed: true },
  { day: 12, col: 2, row: 0 },
  { day: 13, col: 3, row: 0 },
  { day: 14, col: 4, row: 0 },
  { day: 15, col: 5, row: 0 },
  { day: 16, col: 6, row: 0 },

  { day: 17, col: 0, row: 1 },
  { day: 18, col: 1, row: 1, closed: true },
  { day: 19, col: 2, row: 1 },
  { day: 20, col: 3, row: 1 },
  { day: 21, col: 4, row: 1 },
  { day: 22, col: 5, row: 1 },
  { day: 23, col: 6, row: 1 },

  { day: 24, col: 0, row: 2 },
  { day: 25, col: 1, row: 2, closed: true },
  { day: 26, col: 2, row: 2 },
  { day: 27, col: 3, row: 2 },
  { day: 28, col: 4, row: 2 },
  { day: 29, col: 5, row: 2 },
  { day: 30, col: 6, row: 2 },
];

const DEMO_SELECTED_DAYS = [14, 21, 28, 16];

interface ServiceOption {
  id: string;
  label: string;
  description: string;
}

const SERVICES: ServiceOption[] = [
  {
    id: 'visita',
    label: 'Visita ao Box',
    description: 'Acesso ao pitlane, briefing técnico e contato próximo com os supercarros.',
  },
  {
    id: 'fastlap',
    label: 'Fast Lap',
    description: 'Volta lançada de carona com piloto profissional no traçado oficial.',
  },
  {
    id: 'track',
    label: 'Track Experience',
    description: 'Você no volante por um turno completo com telemetria VBOX em tempo real.',
  },
  {
    id: 'vip',
    label: 'Pacote VIP',
    description: 'Imersão full day com box privativo, pneus dedicados e análise de dados.',
  },
];

const CAROUSEL_CARS = [
  { src: '/car1.jpg', alt: 'Supercarro Apex 01 em pista' },
  { src: '/car2.jpg', alt: 'Supercarro Apex 02 no pitlane' },
  { src: '/car3.jpg', alt: 'Supercarro Apex 03 em detalhe' },
  { src: '/car4.jpg', alt: 'Supercarro Apex 04 preparado' },
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function TrackExperienceBentoSection() {
  const [demoStep, setDemoStep] = useState(0);
  const [manualDay, setManualDay] = useState<number | null>(null);
  const [clickPulse, setClickPulse] = useState(false);

  const [activeServiceIdx, setActiveServiceIdx] = useState(2); // Track Experience padrão
  const [carIndex, setCarIndex] = useState(0);

  // Animação automática do mouse selecionando datas no calendário
  useEffect(() => {
    if (manualDay !== null) return;
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % DEMO_SELECTED_DAYS.length);
      setClickPulse(true);
      setTimeout(() => setClickPulse(false), 380);
    }, 2400);
    return () => clearInterval(interval);
  }, [manualDay]);

  // Rotação suave do carrossel de carros (/car1 ... /car4)
  useEffect(() => {
    const interval = setInterval(() => {
      setCarIndex((prev) => (prev + 1) % CAROUSEL_CARS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const selectedDayNumber = manualDay ?? DEMO_SELECTED_DAYS[demoStep];
  const selectedDayObj =
    CALENDAR_DAYS.find((d) => d.day === selectedDayNumber) ?? CALENDAR_DAYS[4];

  const activeService = SERVICES[activeServiceIdx];

  // Posição percentual aproximada dentro da grade 7x3 para o cursor animado
  const cursorLeftPercent = ((selectedDayObj.col + 0.55) / 7) * 100;
  const cursorTopPercent = ((selectedDayObj.row + 0.62) / 3) * 100;

  return (
    <section
      id="experiencia-pista"
      className="relative py-20 sm:py-28 px-6 bg-[#08090C] text-white overflow-hidden select-none"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Cabeçalho Assimétrico Inspirado na Referência */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12 sm:mb-14">
          <div className="lg:col-span-8">
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white/45 leading-[1.12] font-sans">
              Pensado para quem busca
              <br />
              precisão no traçado,{' '}
              <span className="italic font-light text-white">
                e a próxima volta rápida.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col lg:items-end justify-end gap-3.5">
            <div className="flex items-center">
              <img
                src="/piloto.jpg"
                alt="Piloto"
                className="w-9 h-9 rounded-full object-cover object-[50%_20%] ring-2 ring-[#08090C]"
              />
              <img
                src="/driver-helmet.jpg"
                alt="Capacete"
                className="w-9 h-9 rounded-full object-cover object-top -ml-2.5 ring-2 ring-[#08090C]"
              />
              <img
                src="/car1.jpg"
                alt="Frota"
                className="w-9 h-9 rounded-full object-cover -ml-2.5 ring-2 ring-[#08090C]"
              />
            </div>
            <p className="text-xs text-white/50 lg:text-right max-w-[240px] leading-relaxed">
              Agende seu turno digitalmente, escolha a modalidade e encontre o carro aquecido no box.
            </p>
          </div>
        </div>

        {/* Grade de 4 Colunas (Sem Bordas, Arredondada) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {/* Card 1: Calendário Interativo com Mouse Animado Selecionando a Data */}
          <div className="rounded-3xl p-6 flex flex-col justify-between min-h-[370px] bg-gradient-to-b from-[#FF3B3B]/[0.14] via-[#12151E] to-[#0E1117]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-white/85">
                  Novembro · Boxes FIA
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aberto
                </span>
              </div>

              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                {WEEKDAYS.map((wd, idx) => (
                  <span key={`${wd}-${idx}`} className="text-[10px] font-medium text-white/35">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Grade de dias com cursor de mouse animado */}
              <div className="relative">
                <div className="grid grid-cols-7 gap-1.5">
                  {CALENDAR_DAYS.map((item) => {
                    const isSelected = item.day === selectedDayNumber;
                    return (
                      <button
                        key={item.day}
                        type="button"
                        disabled={item.closed}
                        onClick={() => {
                          if (!item.closed) {
                            setManualDay(item.day);
                            setClickPulse(true);
                            setTimeout(() => setClickPulse(false), 380);
                          }
                        }}
                        className={`relative aspect-square rounded-full flex items-center justify-center text-[11px] font-medium tabular-nums transition-all duration-300 ${
                          item.closed
                            ? 'bg-white/[0.02] text-white/20 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#FF1717] text-white shadow-[0_0_16px_rgba(255,23,23,0.6)] scale-110 cursor-pointer'
                            : 'bg-white/[0.06] text-white/65 hover:bg-white/[0.14] hover:text-white cursor-pointer'
                        }`}
                      >
                        {item.day}
                        {isSelected && clickPulse && (
                          <motion.span
                            initial={{ scale: 0.9, opacity: 0.85 }}
                            animate={{ scale: 1.9, opacity: 0 }}
                            transition={{ duration: 0.45 }}
                            className="absolute inset-0 rounded-full bg-[#FF1717]/60 pointer-events-none"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Cursor SVG animado clicando nas datas */}
                {manualDay === null && (
                  <motion.div
                    animate={{
                      left: `${cursorLeftPercent}%`,
                      top: `${cursorTopPercent}%`,
                      scale: clickPulse ? 0.82 : 1,
                    }}
                    transition={{
                      left: { type: 'spring', stiffness: 130, damping: 18 },
                      top: { type: 'spring', stiffness: 130, damping: 18 },
                      scale: { duration: 0.16 },
                    }}
                    className="pointer-events-none absolute z-20 -translate-x-1 -translate-y-1 drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)]"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 3L19 11.5L12.2 13.4L9.2 20L5 3Z"
                        fill="#FFFFFF"
                        stroke="#08090C"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-3 pt-6">
              <span className="text-4xl font-medium tracking-tight text-white tabular-nums">
                3 turnos
              </span>
              <span className="text-xs text-white/50 leading-snug">
                manhã, tarde e noturno
              </span>
            </div>
          </div>

          {/* Card 2: Seleção de Serviço (Pílulas Flutuantes Interativas) */}
          <div className="rounded-3xl p-6 flex flex-col justify-between min-h-[370px] bg-[#10131C]">
            <h3 className="text-lg font-medium tracking-tight text-white text-center">
              Serviço de pista
            </h3>

            {/* Nuvem de Pílulas inspirada no card Tax Advisory */}
            <div className="my-4 flex flex-wrap items-center justify-center gap-2">
              <span className="px-3 py-1.5 rounded-full text-[11px] bg-white/[0.04] text-white/45">
                Telemetria VBOX
              </span>
              <span className="px-3 py-1.5 rounded-full text-[11px] bg-white/[0.04] text-white/45">
                Briefing FIA
              </span>

              {SERVICES.map((srv, idx) => {
                const isActive = idx === activeServiceIdx;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setActiveServiceIdx(idx)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-400 text-[#08090C] shadow-[0_0_20px_rgba(52,211,153,0.35)] scale-[1.04]'
                        : 'bg-white/[0.07] text-white/75 hover:bg-white/[0.14] hover:text-white'
                    }`}
                  >
                    {srv.label}
                  </button>
                );
              })}

              <span className="px-3 py-1.5 rounded-full text-[11px] bg-white/[0.04] text-white/45">
                Equipamento incluso
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={activeService.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-white/55 text-center leading-relaxed"
              >
                {activeService.description}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Card 3: Carrossel de Carros (/car1 ... /car4) + Card Numérico Abaixo */}
          <div className="flex flex-col gap-4 min-h-[370px]">
            {/* Carrossel Superior */}
            <div className="relative flex-1 min-h-[245px] rounded-3xl overflow-hidden bg-[#10131C]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={CAROUSEL_CARS[carIndex].src}
                  src={CAROUSEL_CARS[carIndex].src}
                  alt={CAROUSEL_CARS[carIndex].alt}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

              {/* Tag superior esquerda (como "Strategy") */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/20 text-emerald-300 backdrop-blur-md">
                  Frota ativa
                </span>
              </div>

              {/* Indicadores de página do carrossel */}
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5">
                {CAROUSEL_CARS.map((car, idx) => (
                  <button
                    key={car.src}
                    type="button"
                    onClick={() => setCarIndex(idx)}
                    aria-label={`Mostrar veículo ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === carIndex
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-white/40 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Bloco Inferior Compacto (como "12+ years of combined...") */}
            <div className="rounded-3xl bg-[#10131C] px-6 py-5 flex items-center gap-4">
              <div className="text-3xl sm:text-4xl font-medium tracking-tight text-white tabular-nums shrink-0">
                8<span className="text-[#FF1717]">+</span>
              </div>
              <p className="text-xs text-white/55 leading-snug">
                superesportivos preparados e revisados para pista
              </p>
            </div>
          </div>

          {/* Card 4: Fundo de Pista (/pista.jpg) com Logo Apex Centralizada (/logo.png) */}
          <Link
            to="/pistas"
            aria-label="Explorar pistas oficiais Apex"
            className="relative rounded-3xl overflow-hidden min-h-[370px] bg-[#10131C] flex items-center justify-center group"
          >
            <img
              src="/pista.jpg"
              alt="Circuito oficial Apex"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />

            <img
              src="/logo.png"
              alt="Apex Logo"
              className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain shadow-[0_20px_50px_rgba(0,0,0,0.75)] transition-transform duration-300 group-hover:scale-110"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
