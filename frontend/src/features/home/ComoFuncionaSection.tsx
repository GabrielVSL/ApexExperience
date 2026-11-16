'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const RULES = [
  {
    step: '01',
    tag: 'ARRIVE & DRIVE',
    title: 'Sessões & Turnos Cronometrados',
    description:
      'Escolha o circuito, a modalidade (Visita ao Box, Fast Lap, Track Experience ou Full Day VIP) e o turno. O supercarro não vai para a rua — ele aguarda aquecido no box.',
    circuitImage: '/circuits/interlagos-video.jpg',
    circuitCaption: 'Interlagos · Box Preparado',
  },
  {
    step: '02',
    tag: 'POSSE EM PISTA',
    title: 'Exclusividade na Sua Bateria',
    description:
      'Durante toda a janela reservada, o veículo é exclusivamente seu em pista com briefing técnico, capacete com rádio e telemetria. No Fast Lap você vai de carona com piloto oficial.',
    circuitImage: '/circuits/spa-video.jpg',
    circuitCaption: 'Spa-Francorchamps · Eau Rouge',
  },
  {
    step: '03',
    tag: 'ALL-INCLUSIVE BOX',
    title: 'Combustível, Pneus & Telemetria',
    description:
      'Gasolina 102 octanas, pneus Michelin Cup 2 R, pastilhas carbono-cerâmica, equipe de box e gravação VBOX HD já estão inclusos no valor da sessão, sem taxas ocultas.',
    circuitImage: '/circuits/nurburgring-video.jpg',
    circuitCaption: 'Nürburgring · Telemetria VBOX HD',
  },
  {
    step: '04',
    tag: 'PROTEÇÃO APEXPAY',
    title: 'Seguro Base & Franquia de Pista',
    description:
      'Cobertura base inclusa sem bloquear o limite do seu cartão pessoal. Em caso de avaria além da franquia, o débito é lançado na carteira ApexPay até a quitação.',
    circuitImage: '/circuits/monaco-video.jpg',
    circuitCaption: 'Mônaco · Protocolo FIA Safety',
  },
];

const WEEKLY_SCHEDULE = [
  {
    days: 'Segunda-feira',
    regime: 'Manutenção FIA',
    dotClass: 'bg-rose-500',
    accent: 'text-rose-400',
    detail: 'Vistoria de asfalto, barreiras TecPro e calibração oficial. Pista fechada.',
  },
  {
    days: 'Terça a Quinta',
    regime: 'Operação Técnica',
    dotClass: 'bg-amber-400',
    accent: 'text-amber-300',
    detail: 'Turnos Manhã e Tarde com grade enxuta (5 a 6 boxes) para pilotagem executiva.',
  },
  {
    days: 'Sexta a Domingo',
    regime: 'Full Grid + Noturno',
    dotClass: 'bg-emerald-400',
    accent: 'text-emerald-400',
    detail: 'Grade completa (10 a 14 boxes) nos 3 turnos, liberando a Sessão Noturna.',
  },
];

export function ComoFuncionaSection() {
  const [activeRuleIdx, setActiveRuleIdx] = useState(0);
  const activeRule = RULES[activeRuleIdx];

  return (
    <section
      id="como-funciona"
      className="relative py-24 sm:py-32 px-6 bg-[#08090C] text-white border-t border-white/[0.08] select-none"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Cabeçalho Assimétrico com CTA (Inspirado na Ref. Section Process) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-white/10">
          <div>
            <p className="text-[11px] font-mono font-medium tracking-[0.24em] text-[#FF1717] uppercase mb-2.5">
              Protocolo de Pista · Arrive &amp; Drive
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white font-sans">
              Simples. Direto. Sem Burocracia.
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-xs sm:text-sm text-white/55 max-w-xs leading-relaxed">
              Do agendamento digital ao capacete no box em 4 etapas objetivas nos circuitos FIA.
            </p>
            <Link
              to="/pistas"
              className="inline-flex items-center gap-2 bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-all duration-200 shrink-0 self-start sm:self-auto"
            >
              <span>Ver Agenda das Pistas</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        {/* Layout Assimétrico: Esquerda Etapas em Lista Arquitetônica | Direita Fotografia + Agenda */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-12 items-start">
          {/* Esquerda: 4 Etapas Interativas em Grade Sem Cards Arredondados */}
          <div className="lg:col-span-7 divide-y divide-white/10 border-b border-white/10">
            {RULES.map((rule, idx) => {
              const isActive = idx === activeRuleIdx;
              return (
                <button
                  key={rule.step}
                  type="button"
                  onClick={() => setActiveRuleIdx(idx)}
                  onMouseEnter={() => setActiveRuleIdx(idx)}
                  className={`w-full text-left py-6 sm:py-7 pl-5 pr-4 relative transition-colors duration-200 cursor-pointer flex items-start gap-5 sm:gap-7 group ${
                    isActive ? 'bg-white/[0.03]' : 'hover:bg-white/[0.015]'
                  }`}
                >
                  {/* Barra lateral ativa vermelha (sem rounded) */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-[2px] transition-colors duration-200 ${
                      isActive ? 'bg-[#FF1717]' : 'bg-transparent group-hover:bg-white/20'
                    }`}
                  />

                  <span
                    className={`text-sm font-mono font-semibold tracking-widest pt-0.5 transition-colors ${
                      isActive ? 'text-[#FF1717]' : 'text-white/35 group-hover:text-white/60'
                    }`}
                  >
                    {rule.step}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <h3
                        className={`text-base sm:text-lg font-medium tracking-tight transition-colors ${
                          isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                        }`}
                      >
                        {rule.title}
                      </h3>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                        {rule.tag}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Direita: Painel Visual do Circuito + Tabela Semanal */}
          <div className="lg:col-span-5 space-y-6">
            {/* Fotografia Sharp-Edge vinculada ao passo selecionado */}
            <div className="relative h-56 sm:h-64 w-full border border-white/10 overflow-hidden bg-[#0D1017]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeRule.circuitImage}
                  src={activeRule.circuitImage}
                  alt={activeRule.circuitCaption}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 0.85, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/20 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF1717] block mb-1">
                    Etapa {activeRule.step} · {activeRule.tag}
                  </span>
                  <span className="text-sm font-medium text-white">
                    {activeRule.circuitCaption}
                  </span>
                </div>
              </div>
            </div>

            {/* Calendário Operacional Semanal em Linhas Limpas */}
            <div className="border-t border-white/10">
              <div className="py-3 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                  Regime Semanal de Pista
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/35">
                  Horário Local do Box
                </span>
              </div>
              <div className="divide-y divide-white/10 border-y border-white/10">
                {WEEKLY_SCHEDULE.map((item) => (
                  <div key={item.days} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.dotClass}`} />
                        {item.days}
                      </span>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${item.accent}`}>
                        {item.regime}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed pl-3.5">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
