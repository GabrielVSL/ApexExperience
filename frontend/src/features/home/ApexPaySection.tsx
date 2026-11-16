'use client';

import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus, Wifi, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const PARTNERS = [
  {
    name: 'ApexPay',
    renderLogo: () => (
      <div className="flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
        <img src="/logo.png" alt="" className="w-5 h-5 rounded-md object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
        <span className="text-base font-semibold tracking-tight">ApexPay</span>
      </div>
    ),
  },
  {
    name: 'Pirelli Track',
    renderLogo: () => (
      <div className="flex items-center gap-2 text-white/50 group-hover:text-white/90 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="text-base font-bold tracking-tight italic">Pirelli</span>
      </div>
    ),
  },
  {
    name: 'brembo',
    renderLogo: () => (
      <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white/90 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M12 3a9 9 0 0 0-9 9h4a5 5 0 0 1 5-5V3Zm0 18a9 9 0 0 0 9-9h-4a5 5 0 0 1-5 5v4Z" />
        </svg>
        <span className="text-base font-bold tracking-tight">brembo</span>
      </div>
    ),
  },
  {
    name: 'VBOX',
    renderLogo: () => (
      <div className="flex items-center gap-2 text-white/50 group-hover:text-white/90 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 12h3l3-6 4 12 3-6h5" />
        </svg>
        <span className="text-sm font-semibold tracking-wide">VBOX</span>
      </div>
    ),
  },
  {
    name: 'Motul',
    renderLogo: () => (
      <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white/90 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M12 2.5C8.5 7 6 10.6 6 14a6 6 0 0 0 12 0c0-3.4-2.5-7-6-11.5Z" />
        </svg>
        <span className="text-base font-bold tracking-tight">Motul</span>
      </div>
    ),
  },
  {
    name: 'Sparco',
    renderLogo: () => (
      <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white/90 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 17 12 6l7 11" />
          <path d="M8.5 14h7" />
        </svg>
        <span className="text-base font-medium tracking-tight italic">sparco</span>
      </div>
    ),
  },
];

export function ApexPaySection() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const handleOpenWallet = () => {
    if (!token || !user) {
      navigate('/login', { state: { from: '/apexpay' } });
      return;
    }
    navigate('/apexpay');
  };

  return (
    <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-6 bg-[#08090C] text-white overflow-hidden select-none">
      <div className="container mx-auto max-w-6xl space-y-16 sm:space-y-24">
        {/* Parte 1: Split Editorial + Cartão ApexPay com Halo Curvo (Inspirado na Ref. 1) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden bg-[#0D1017] p-8 sm:p-12 lg:p-14"
        >
          {/* Arco Radial Suave à Direita (versão dark em vermelho Apex do semicírculo da referência) */}
          <div
            className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 w-[480px] h-[480px] sm:w-[620px] sm:h-[620px] rounded-full opacity-90"
            style={{
              background:
                'radial-gradient(circle at 35% 50%, rgba(255, 23, 23, 0.26) 0%, rgba(153, 27, 27, 0.12) 48%, transparent 76%)',
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Esquerda: Texto Direto + Botões de Ação */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
                <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                  <Wallet size={12} />
                </span>
                <span className="text-xs font-medium text-white/80">
                  ApexPay · Carteira sandbox
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.08] font-sans">
                Ative sua conta hoje e acelere{' '}
                <span className="italic font-light text-white/90">
                  sem cartão real.
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-md">
                Todo o fluxo financeiro roda em créditos fictícios: recarregue saldo na hora, confirme vagas nos boxes e controle faturas pelo seu painel.
              </p>

              {/* Ações no estilo da Referência (Botão principal com seta circular + Link secundário) */}
              <div className="flex flex-wrap items-center gap-5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenWallet}
                    className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors cursor-pointer"
                  >
                    Abrir carteira sandbox
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWallet}
                    aria-label="Abrir carteira ApexPay"
                    className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)] cursor-pointer"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </div>

                <Link
                  to="/pistas"
                  className="text-xs sm:text-sm font-medium text-white/75 hover:text-white transition-colors"
                >
                  Explorar pistas
                </Link>
              </div>
            </div>

            {/* Direita: Cartão ApexPay Black Flutuante */}
            <div className="lg:col-span-6 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[400px]">
                {/* Recorte / Pílula "+ Recarregar" no topo direito (como "+ SET BUDGET") */}
                <button
                  type="button"
                  onClick={handleOpenWallet}
                  className="absolute -top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-medium shadow-[0_8px_24px_rgba(255,23,23,0.45)] transition-transform hover:scale-105 cursor-pointer"
                >
                  <span className="w-4 h-4 rounded-full bg-[#08090C]/30 flex items-center justify-center">
                    <Plus size={11} />
                  </span>
                  <span>Recarregar</span>
                </button>

                {/* Corpo do Cartão */}
                <div className="relative rounded-3xl bg-[#07080B] p-6 sm:p-7 shadow-[0_32px_80px_rgba(0,0,0,0.85)] overflow-hidden min-h-[225px] flex flex-col justify-between">
                  {/* Textura sutil de mapa/luz interna */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-25"
                    style={{
                      background:
                        'radial-gradient(circle at 22% 30%, rgba(255,255,255,0.08) 0%, transparent 55%)',
                    }}
                  />

                  {/* Faixa lateral vertical Contactless (como a pílula amarela na direita do cartão) */}
                  <div className="absolute right-5 top-12 bottom-5 w-11 rounded-2xl bg-gradient-to-b from-[#FF3B3B] to-[#C8102E] flex items-center justify-center text-white shadow-[0_0_24px_rgba(255,23,23,0.35)]">
                    <Wifi size={20} className="rotate-90" />
                  </div>

                  {/* Topo esquerdo: Marca ApexPay */}
                  <div className="relative z-10 flex items-center gap-2">
                    <img
                      src="/logo.png"
                      alt="ApexPay"
                      className="w-5 h-5 rounded-md object-contain"
                    />
                    <span className="text-sm font-semibold tracking-tight text-white/90">
                      ApexPay
                    </span>
                  </div>

                  {/* Meio: Saldo e Número Mascarado */}
                  <div className="relative z-10 pr-14 my-4">
                    <span className="block text-xs text-white/45 mb-1">
                      Saldo disponível
                    </span>
                    <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-white tabular-nums">
                      R$ 38.450,00
                    </div>
                    <div className="text-xs font-mono tracking-widest text-white/45 mt-2">
                      •••• &nbsp;•••• &nbsp;•••• &nbsp;0178
                    </div>
                  </div>

                  {/* Base: Titular & Validade */}
                  <div className="relative z-10 pr-14 flex items-center justify-between text-xs text-white/60">
                    <span>{user?.email ? user.email.split('@')[0] : 'Piloto Apex'}</span>
                    <span className="tabular-nums text-white/45">Val. 08/29</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Parte 2: Globo em Dark Mode (Sem Cards Flutuantes) + Barra de Patrocinadores (Inspirado na Ref. 2) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center"
        >
          {/* Título discreto acima do globo */}
          <div className="text-center max-w-xl mx-auto mb-4 sm:mb-6 relative z-10 space-y-2">
            <h3 className="text-2xl sm:text-4xl font-medium tracking-tight text-white font-sans">
              Conectado aos principais{' '}
              <span className="italic font-light text-white/85">circuitos do mundo.</span>
            </h3>
            <p className="text-xs sm:text-sm text-white/50">
              Saldo único válido em toda a rede homologada com parceiros de engenharia e pista.
            </p>
          </div>

          {/* Globo Sem Cards ao Redor — integrado ao fundo #08090C */}
          <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
            <div className="relative w-full overflow-hidden flex justify-center">
              <img
                src="/globo.png"
                alt="Rede global Apex de circuitos"
                className="w-full max-w-4xl h-auto object-contain mix-blend-screen opacity-95 pointer-events-none"
                style={{
                  maskImage:
                    'radial-gradient(ellipse 75% 75% at 50% 50%, black 55%, transparent 100%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse 75% 75% at 50% 50%, black 55%, transparent 100%)',
                }}
              />
              {/* Fade suave na base para ancorar a barra de patrocinadores */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#08090C] via-[#08090C]/75 to-transparent" />
            </div>

            {/* Faixa Arredondada de Patrocinadores (Versão Dark da Barra Inferior da Ref. 2) */}
            <div className="relative z-10 -mt-10 sm:-mt-14 w-full max-w-4xl rounded-3xl sm:rounded-full bg-[#10131C]/90 backdrop-blur-md px-6 sm:px-10 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center">
                {PARTNERS.map((partner) => (
                  <div
                    key={partner.name}
                    className="group cursor-default flex items-center justify-center"
                    title={partner.name}
                  >
                    {partner.renderLogo()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
