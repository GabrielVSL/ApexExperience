'use client';

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Gauge } from 'lucide-react';

const TELEMETRY_BARS = [
  { id: 's1', height: '24%', tone: 'muted' },
  { id: 's2', height: '32%', tone: 'muted' },
  { id: 's3', height: '28%', tone: 'muted' },
  { id: 's4', height: '40%', tone: 'muted' },
  { id: 's5', height: '34%', tone: 'muted' },
  { id: 's6', height: '52%', tone: 'soft' },
  { id: 's7', height: '76%', tone: 'vivid' },
  { id: 's8', height: '94%', tone: 'peak' },
  { id: 's9', height: '70%', tone: 'vivid' },
  { id: 's10', height: '44%', tone: 'soft' },
];

const DISCIPLINE_TAGS = [
  {
    label: 'Track Day',
    href: '#experiencia-pista',
    pillClass: 'bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25',
  },
  {
    label: 'Fast Lap',
    href: '#experiencia-pista',
    pillClass: 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25',
  },
  {
    label: 'VIP Box',
    href: '/pistas',
    isRoute: true,
    pillClass: 'bg-rose-400/15 text-rose-300 hover:bg-rose-400/25',
  },
];

export function EditorialRideBanner() {
  const scrollToSection = (selector: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full bg-[#08090C] text-white py-20 sm:py-28 px-6 overflow-hidden select-none">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          {/* Coluna Esquerda: Retrato do Piloto Arredondado (Sem Borda) + Widget de Telemetria */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative min-h-[480px] sm:min-h-[560px] rounded-3xl overflow-hidden bg-[#10131A] group"
          >
            <img
              src="/piloto.jpg"
              alt="Piloto Apex no cockpit com capacete"
              className="absolute inset-0 w-full h-full object-cover object-[50%_22%] transition-transform duration-700 group-hover:scale-[1.03]"
            />

            {/* Gradiente suave na base apenas para legibilidade do card */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

            {/* Card Flutuante Arredondado de Telemetria (Sem Borda) */}
            <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5 rounded-2xl bg-[#0F1219]/92 backdrop-blur-md p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="block text-xs font-medium text-white/55 mb-1">
                    Velocidade de reta
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white tabular-nums">
                    312 <span className="text-sm font-normal text-white/55">km/h</span>
                  </span>
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/15 text-emerald-300">
                  +18% setor S2
                </span>
              </div>

              {/* Barras Progressivas Arredondadas */}
              <div className="h-16 flex items-end justify-between gap-1.5 sm:gap-2">
                {TELEMETRY_BARS.map((bar, idx) => (
                  <motion.div
                    key={bar.id}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.12 + idx * 0.04,
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ height: bar.height, transformOrigin: 'bottom' }}
                    className={`flex-1 rounded-md transition-colors ${
                      bar.tone === 'peak'
                        ? 'bg-gradient-to-t from-[#E11D48] to-[#FF3B3B]'
                        : bar.tone === 'vivid'
                        ? 'bg-[#FF2E3B]/75'
                        : bar.tone === 'soft'
                        ? 'bg-[#FF4D4D]/30'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Coluna Direita: Conteúdo no Padrão da Fonte do Site, Arredondado e Sem Caixas Blocadas */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-between gap-10 py-1"
          >
            {/* Topo: Selo + Headline Padrão do Site + Botões e Tags Coloridas */}
            <div className="space-y-6">
              {/* Pill Badge Suave Sem Borda */}
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
                <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                  <Gauge size={13} />
                </span>
                <span className="text-xs font-medium text-white/80">
                  Experiência de pista sem distância.
                </span>
              </div>

              {/* Headline na fonte padrão do site (Inter), sem caixa alta */}
              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.1] font-sans">
                Pilotagem em pista deve ser{' '}
                <span className="italic font-light text-white/90">clara — e pessoal.</span>
              </h2>

              {/* Linha de Botão CTA + Tags Suaves */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Link
                    to="/pistas"
                    className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors"
                  >
                    Explorar circuitos
                  </Link>
                  <Link
                    to="/pistas"
                    aria-label="Ir para circuitos"
                    className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)]"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {DISCIPLINE_TAGS.map((tag) =>
                    tag.isRoute ? (
                      <Link
                        key={tag.label}
                        to={tag.href}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${tag.pillClass}`}
                      >
                        {tag.label}
                      </Link>
                    ) : (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => scrollToSection(tag.href)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${tag.pillClass}`}
                      >
                        {tag.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Base: Métrica com Ícone Radial + Avatar à Esquerda | Depoimento Fade-Out à Direita */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-end pt-4">
              {/* Esquerda: Emblema Asterisco Suave + Avatar Circular do Piloto + Número */}
              <div className="sm:col-span-5 flex flex-col justify-between gap-8">
                <div className="flex items-center">
                  {/* Ícone radial suave de 8 pontas arredondadas (como na referência) */}
                  <svg
                    viewBox="0 0 48 48"
                    className="w-12 h-12 text-[#FF4D4D]/25 shrink-0"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="21" y="3" width="6" height="42" rx="3" />
                    <rect x="3" y="21" width="42" height="6" rx="3" />
                    <rect
                      x="21"
                      y="3"
                      width="6"
                      height="42"
                      rx="3"
                      transform="rotate(45 24 24)"
                    />
                    <rect
                      x="21"
                      y="3"
                      width="6"
                      height="42"
                      rx="3"
                      transform="rotate(-45 24 24)"
                    />
                  </svg>

                  {/* Avatar pequeno do piloto sobrepondo o emblema */}
                  <img
                    src="/piloto.jpg"
                    alt="Piloto Apex"
                    className="w-11 h-11 rounded-full object-cover object-[50%_20%] -ml-4 ring-4 ring-[#08090C] relative z-10"
                  />
                </div>

                <div>
                  <div className="text-4xl sm:text-5xl font-medium tracking-tight text-white leading-none tabular-nums">
                    14 dias
                  </div>
                  <p className="text-xs text-white/50 mt-2.5">
                    de janela aberta nos boxes FIA
                  </p>
                </div>
              </div>

              {/* Direita: Mensagem do Lucas arredondada, sem borda, com fade out tranquilo em vermelho */}
              <div className="sm:col-span-7 relative rounded-3xl overflow-hidden p-6 sm:p-7 flex flex-col justify-between gap-6 bg-gradient-to-br from-[#FF3B3B]/[0.16] via-[#991B1B]/[0.07] to-transparent">
                {/* Glow suave no topo direito que desvanece tranquilamente */}
                <div
                  className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full blur-2xl opacity-45"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255, 75, 75, 0.35) 0%, transparent 72%)',
                  }}
                />

                <div className="relative z-10">
                  <span
                    className="block text-3xl leading-none font-bold text-[#FF6B6B] mb-2 select-none"
                    aria-hidden="true"
                  >
                    ”
                  </span>
                  <p className="text-sm text-white/85 leading-relaxed font-normal">
                    Chegar ao pitlane com o carro aquecido, telemetria VBOX gravando cada curva e zero papelada elevou meu fim de semana.
                  </p>
                </div>

                <div className="relative z-10 flex items-center gap-3">
                  <img
                    src="/piloto.jpg"
                    alt="Lucas Andrade"
                    className="w-8 h-8 rounded-full object-cover object-[50%_20%]"
                  />
                  <div className="text-xs">
                    <span className="text-white/90 font-medium block">Lucas Andrade</span>
                    <span className="text-white/45 text-[11px]">Track Experience · Interlagos</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
