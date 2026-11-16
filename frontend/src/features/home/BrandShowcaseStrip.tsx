'use client';

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Cpu } from 'lucide-react';
import type { Automovel } from '@/features/cars/components/BookingModal';

export interface BrandShowcaseItem {
  id: string;
  name: string;
  division: string;
  origin: string;
  logo: string;
  carImage: string;
  highlightModel: string;
  powertrain: string;
  circuits: string;
  setup: string;
  summary: string;
  orbitAngle: number;
  tagColor: string;
  fadeGradient: string;
  glowColor: string;
}

const BRANDS: BrandShowcaseItem[] = [
  {
    id: 'porsche',
    name: 'Porsche',
    division: 'Porsche Motorsport',
    origin: 'Stuttgart · GT3 & GT4',
    logo: '/brands/porsche.svg',
    carImage: '/cars/porsche-studio.webp',
    highlightModel: '911 GT3 RS & 718 GT4 RS',
    powertrain: 'Boxer 4.0L Aspirado · 9.000 rpm',
    circuits: 'Nürburgring · Mônaco · Interlagos',
    setup: 'DRS ativo + carbono-cerâmica PCCB',
    summary:
      'Motores boxer aspirados calibrados para máxima carga aerodinâmica em curvas de alta e frenagens no limite.',
    orbitAngle: -45,
    tagColor: 'bg-rose-400/15 text-rose-300',
    fadeGradient: 'from-[#FF3B3B]/[0.15] via-[#991B1B]/[0.06] to-transparent',
    glowColor: 'rgba(255, 75, 75, 0.32)',
  },
  {
    id: 'bmw',
    name: 'BMW M',
    division: 'BMW M Motorsport',
    origin: 'Munique · GT4 & GT3',
    logo: '/brands/bmw.svg',
    carImage: '/cars/bmw-studio.webp',
    highlightModel: 'M4 Competition & M8 Coupé',
    powertrain: 'TwinPower Turbo · até 625 cv',
    circuits: 'Spa-Francorchamps · Le Mans · Monza',
    setup: 'Teto CFRP + diferencial M ativo',
    summary:
      'Tração traseira e M xDrive de pista entregando estabilidade cirúrgica nas retas longas de Spa e Le Mans.',
    orbitAngle: 45,
    tagColor: 'bg-sky-400/15 text-sky-300',
    fadeGradient: 'from-sky-400/[0.14] via-sky-900/[0.06] to-transparent',
    glowColor: 'rgba(56, 189, 248, 0.28)',
  },
  {
    id: 'mercedes',
    name: 'Mercedes-AMG',
    division: 'AMG Customer Racing',
    origin: 'Affalterbach · GT2 Series',
    logo: '/brands/mercedes.svg',
    carImage: '/cars/amg-studio.webp',
    highlightModel: 'GT Track Series & Black Series',
    powertrain: 'V8 4.0L Biturbo · até 734 cv',
    circuits: 'Monza · Silverstone · Interlagos',
    setup: 'Virabrequim flat-plane + asa GT',
    summary:
      'Torque bruto de Affalterbach combinado com acerto de suspensão ajustável para ataques agressivos às zebras.',
    orbitAngle: 135,
    tagColor: 'bg-emerald-400/15 text-emerald-300',
    fadeGradient: 'from-emerald-400/[0.14] via-emerald-950/[0.06] to-transparent',
    glowColor: 'rgba(52, 211, 153, 0.28)',
  },
  {
    id: 'audi',
    name: 'Audi Sport',
    division: 'Audi Sport Racing',
    origin: 'Neckarsulm · V10 & 800V',
    logo: '/brands/audi.svg',
    carImage: '/cars/audi-studio.webp',
    highlightModel: 'R8 V10 & RS e-tron GT',
    powertrain: 'V10 5.2L FSI & Dual-Motor 925 cv',
    circuits: 'Suzuka · Interlagos · Silverstone',
    setup: 'Tração quattro + eixo traseiro direcional',
    summary:
      'Da sinfonia mecânica do V10 atmosférico à entrega instantânea elétrica de 800V com vetorização de torque.',
    orbitAngle: 225,
    tagColor: 'bg-amber-400/15 text-amber-300',
    fadeGradient: 'from-amber-400/[0.14] via-amber-950/[0.05] to-transparent',
    glowColor: 'rgba(251, 191, 36, 0.26)',
  },
];

interface BrandShowcaseStripProps {
  cars?: Automovel[];
}

const PREFERRED_MODEL_TOKEN: Record<string, string> = {
  porsche: 'gt3',
  bmw: 'm4',
  mercedes: 'track',
  audi: 'r8',
};

export function BrandShowcaseStrip({ cars = [] }: BrandShowcaseStripProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBrand = BRANDS[activeIndex];

  const matchedCar = useMemo(() => {
    if (!cars.length) return null;
    const brandToken = activeBrand.id.toLowerCase();
    const preferredToken = PREFERRED_MODEL_TOKEN[brandToken];
    const brandMatches = cars.filter((c) =>
      `${c.marca} ${c.modelo}`.toLowerCase().includes(brandToken)
    );
    if (!brandMatches.length) return null;
    if (preferredToken) {
      const preferred = brandMatches.find((c) =>
        `${c.marca} ${c.modelo}`.toLowerCase().includes(preferredToken)
      );
      if (preferred) return preferred;
    }
    return brandMatches[0];
  }, [cars, activeBrand.id]);

  const detailPath = matchedCar ? `/cars/${matchedCar.id}` : '/cars';

  return (
    <section className="relative bg-[#08090C] text-white py-16 sm:py-24 px-6 overflow-hidden select-none">
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Cabeçalho Suave e Seletor em Pílulas Arredondadas (Sem Bordas) */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="space-y-4 shrink-0">
            <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
              <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                <Cpu size={13} />
              </span>
              <span className="text-xs font-medium text-white/80">
                Engenharia homologada
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.1] font-sans">
              Performance de pista
              <br />
              <span className="italic font-light text-white/90">sem concessões.</span>
            </h2>
          </div>

          {/* Seletor de Montadoras em Linha Única no Desktop e Grid 2x2 no Mobile */}
          <div className="grid grid-cols-2 sm:inline-flex sm:flex-nowrap items-center gap-1 p-1.5 rounded-2xl sm:rounded-full bg-white/[0.04] shrink-0 self-stretch sm:self-start lg:self-auto">
            {BRANDS.map((brand, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative px-3.5 py-2 rounded-xl sm:rounded-full flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive ? 'text-white' : 'text-white/50 hover:text-white/85'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-brand-pill"
                      className="absolute inset-0 rounded-xl sm:rounded-full bg-white/[0.1]"
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    />
                  )}
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className={`relative z-10 h-4 w-5 object-contain shrink-0 transition-all duration-300 ${
                      isActive ? 'opacity-100' : 'opacity-45 grayscale'
                    }`}
                  />
                  <span className="relative z-10 text-xs font-medium tracking-tight">
                    {brand.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Palco Orbital Concêntrico Sem Caixas Duras */}
        <div className="relative min-h-[340px] sm:min-h-[380px] flex flex-col items-center justify-center">
          {/* Anéis Concêntricos Sutis ao Fundo */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
            <div className="w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] lg:w-[460px] lg:h-[460px] rounded-full border border-white/[0.04] relative flex items-center justify-center">
              {/* Nó Orbital Ativo */}
              <motion.div
                animate={{ rotate: activeBrand.orbitAngle }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                className="absolute inset-0"
              >
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FF1717] shadow-[0_0_16px_rgba(255,23,23,0.9)] ring-4 ring-[#08090C]" />
              </motion.div>

              <div className="w-[210px] h-[210px] sm:w-[300px] sm:h-[300px] lg:w-[340px] lg:h-[340px] rounded-full border border-dashed border-white/[0.06] flex items-center justify-center">
                <div className="w-[130px] h-[130px] sm:w-[190px] sm:h-[190px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,rgba(255,23,23,0.04)_45%,transparent_75%)]" />
              </div>
            </div>
          </div>

          {/* Conteúdo em 3 Colunas */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBrand.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
            >
              {/* Esquerda: Identidade da Divisão & CTA */}
              <div className="lg:col-span-4 text-center lg:text-left order-2 lg:order-1 space-y-5">
                <div className="inline-flex items-center gap-3 justify-center lg:justify-start">
                  <img
                    src={activeBrand.logo}
                    alt={activeBrand.name}
                    className="h-7 w-auto object-contain"
                  />
                  <span className="text-xs font-medium text-white/50">
                    {activeBrand.origin}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    {activeBrand.division}
                  </h3>
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${activeBrand.tagColor}`}
                    >
                      {activeBrand.highlightModel}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-sm mx-auto lg:mx-0">
                  {activeBrand.summary}
                </p>

                <div className="pt-1 flex items-center justify-center lg:justify-start gap-2">
                  <Link
                    to={detailPath}
                    className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors"
                  >
                    Ver detalhes · {matchedCar ? matchedCar.modelo : activeBrand.name}
                  </Link>
                  <Link
                    to={detailPath}
                    aria-label={`Ver detalhes de ${matchedCar ? matchedCar.modelo : activeBrand.name}`}
                    className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)]"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Centro: Supercarro Flutuante */}
              <div className="lg:col-span-4 order-1 lg:order-2 flex items-center justify-center relative py-4">
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-7 rounded-full bg-black/85 blur-xl pointer-events-none" />
                <img
                  src={activeBrand.carImage}
                  alt={activeBrand.highlightModel}
                  className="relative z-10 w-full max-w-[340px] sm:max-w-[400px] h-48 sm:h-56 object-contain drop-shadow-[0_22px_32px_rgba(0,0,0,0.9)]"
                />
              </div>

              {/* Direita: Ficha Técnica Arredondada com Fade Out Suave e Colorido (Sem Bordas) */}
              <div
                className={`lg:col-span-4 order-3 relative rounded-3xl overflow-hidden p-6 sm:p-7 bg-gradient-to-br ${activeBrand.fadeGradient}`}
              >
                <div
                  className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full blur-2xl opacity-45"
                  style={{
                    background: `radial-gradient(circle, ${activeBrand.glowColor} 0%, transparent 72%)`,
                  }}
                />

                <div className="relative z-10 space-y-5">
                  <div>
                    <span className="block text-xs text-white/50 mb-1">
                      Conjunto motriz
                    </span>
                    <span className="text-sm sm:text-base font-medium text-white">
                      {activeBrand.powertrain}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs text-white/50 mb-1">
                      Circuitos homologados
                    </span>
                    <span className="text-sm sm:text-base font-medium text-white">
                      {activeBrand.circuits}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs text-white/50 mb-1">
                      Preparação de box
                    </span>
                    <span className="text-sm sm:text-base font-medium text-white">
                      {activeBrand.setup}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
