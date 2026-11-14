'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface SandboxMode {
  id: 'saldo' | 'fatura' | 'juros';
  tabLabel: string;
  endpointTag: string;
  headline: string;
  description: string;
  badgeText: string;
  badgeClass: string;
  balanceLabel: string;
  balanceValue: string;
  ledgerEntries: {
    label: string;
    detail: string;
    amount: string;
    positive?: boolean;
  }[];
  ruleNote: string;
}

const SANDBOX_MODES: SandboxMode[] = [
  {
    id: 'saldo',
    tabLabel: 'Saldo Sandbox',
    endpointTag: 'CARTEIRA_APEXPAY · GREEN FLAG',
    headline: 'Aprovação Imediata via Saldo',
    description:
      'Adicione créditos fictícios via recarga instantânea e confirme vagas nos boxes em segundos, sem cartão de crédito real.',
    badgeText: 'APROVADO · BOX LIBERADO',
    badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
    balanceLabel: 'Saldo Simulado em Conta',
    balanceValue: 'R$ 11.150,00',
    ledgerEntries: [
      {
        label: 'Recarga Instantânea Sandbox',
        detail: 'Crédito simulado · POST /api/apexpay/deposito',
        amount: '+ R$ 15.000,00',
        positive: true,
      },
      {
        label: 'Track Experience · Spa-Francorchamps',
        detail: 'Débito imediato na reserva · Status APROVADO',
        amount: '- R$ 3.850,00',
      },
    ],
    ruleNote: 'Cancelamentos estornam o saldo integralmente para a carteira sandbox.',
  },
  {
    id: 'fatura',
    tabLabel: 'Fatura Pós-Paga',
    endpointTag: 'FATURA_APEXPAY · HOMOLOGAÇÃO',
    headline: 'Débito Apenas na Confirmação',
    description:
      'Reserve mesmo com saldo zerado. A fatura aguarda a homologação do Race Control antes de lançar qualquer débito na sua conta.',
    badgeText: 'AGUARDANDO_APROVACAO',
    badgeClass: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
    balanceLabel: 'Saldo Após Reserva (Pré-Aprovação)',
    balanceValue: 'R$ 0,00',
    ledgerEntries: [
      {
        label: 'Pré-reserva de Box · Interlagos',
        detail: 'Pagamento: FATURA_AGUARDANDO_APROVACAO',
        amount: 'R$ 2.100,00 (retido)',
        positive: true,
      },
      {
        label: 'Homologação Race Control',
        detail: 'Ao aprovar → debita em carteira/fatura; ao rejeitar → cancela sem ônus',
        amount: 'Somente no aceite',
      },
    ],
    ruleNote: 'Contrapropostas de horário/slot também só debitam quando o piloto aceita.',
  },
  {
    id: 'juros',
    tabLabel: 'Franquia & Juros',
    endpointTag: 'SINISTRO_PISTA · 0,1% / DIA',
    headline: 'Controle Transparente de Pendências',
    description:
      'Eventuais faturas em aberto ou franquias de dano em pista negativam o saldo simulado, bloqueando novos agendamentos até a quitação.',
    badgeText: 'INADIMPLENTE · BLOQUEADO',
    badgeClass: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
    balanceLabel: 'Saldo Devedor Simulado',
    balanceValue: '- R$ 2.502,50',
    ledgerEntries: [
      {
        label: 'Franquia de Pista Homologada (Sinistro)',
        detail: 'Lançado apenas em sessões APROVADO de condução',
        amount: '- R$ 2.500,00',
      },
      {
        label: 'Encargo Diário de Atraso (0,1% a.d.)',
        detail: 'Incidência automática sobre saldo negativo em aberto',
        amount: '- R$ 2,50',
      },
    ],
    ruleNote: 'Um único depósito no valor devido quita a pendência e desbloqueia a conta.',
  },
];

const SANDBOX_PILLARS = [
  {
    icon: Wallet,
    title: 'Pagamento Simulado sem Dinheiro Real',
    description:
      'Todo o fluxo financeiro roda em um gateway próprio (ApexPay Sandbox) para você testar recargas, agendamentos e estornos com segurança total.',
  },
  {
    icon: Clock,
    title: 'Pré-Pago Imediato ou Fatura em 1 Etapa',
    description:
      'Escolha débito na hora via saldo para aprovação instantânea ou fatura pós-paga analisada diretamente pelo Race Control.',
  },
  {
    icon: ShieldAlert,
    title: 'Regras Reais de Paddock',
    description:
      'Cobertura operacional transparente, histórico imutável de transações e proteção de agenda contra inadimplência em aberto.',
  },
];

export function ApexPaySection() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'saldo' | 'fatura' | 'juros'>('saldo');

  const activeMode = SANDBOX_MODES.find((m) => m.id === activeTab) || SANDBOX_MODES[0];

  return (
    <section className="relative py-24 md:py-32 bg-[#08090C] border-t border-white/[0.06] overflow-hidden">
      {/* Glow radial discreto */}
      <div
        className="pointer-events-none absolute -top-24 left-1/4 w-[520px] h-[520px] rounded-full blur-[150px] opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(255,23,23,0.18), transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Esquerda: Console Interativo do Gateway Sandbox ApexPay */}
          <div className="lg:col-span-6 space-y-6">
            {/* Seletor de cenários do Gateway Sandbox */}
            <div className="inline-flex flex-wrap gap-1.5 p-1 rounded-full bg-white/[0.03] border border-white/10">
              {SANDBOX_MODES.map((m) => {
                const isActive = m.id === activeTab;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveTab(m.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#FF1717] text-white shadow-md shadow-[#FF1717]/25'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {m.tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Painel Console Sandbox */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12151D] via-[#0B0D12] to-[#08090C] p-6 sm:p-7 shadow-[0_30px_80px_rgba(0,0,0,0.65)] space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/55">
                    <Terminal size={13} className="text-[#FF1717]" />
                    <span>{activeMode.endpointTag}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${activeMode.badgeClass}`}
                  >
                    {activeMode.badgeText}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-white/45">
                    {activeMode.balanceLabel}
                  </p>
                  <p className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-white mt-1">
                    {activeMode.balanceValue}
                  </p>
                  <p className="text-xs text-white/60 mt-2 leading-relaxed">
                    {activeMode.description}
                  </p>
                </div>

                {/* Mini Extrato Simulado */}
                <div className="space-y-2.5">
                  {activeMode.ledgerEntries.map((entry) => (
                    <div
                      key={entry.label}
                      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/[0.025] border border-white/[0.07]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{entry.label}</p>
                        <p className="text-[11px] font-mono text-white/45 truncate mt-0.5">
                          {entry.detail}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono font-semibold shrink-0 tabular-nums ${
                          entry.positive ? 'text-emerald-400' : 'text-white/80'
                        }`}
                      >
                        {entry.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08] text-[11px] text-white/55 font-mono">
                  <RefreshCw size={12} className="text-[#FF1717] shrink-0" />
                  <span>{activeMode.ruleNote}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Direita: Narrativa Editorial */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FF1717] mb-3">
                ApexPay · Gateway de Pagamentos Simulado
              </p>
              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.1] font-sans">
                Checkout Completo em Ambiente Sandbox.
              </h2>
              <p className="text-sm sm:text-base text-white/65 font-normal leading-relaxed mt-4 max-w-xl">
                Como a plataforma é um ambiente demonstrativo sem cobrança real de cartão ou Pix bancário, o ApexPay simula todo o ciclo financeiro de um autódromo: recarga instantânea, faturas homologadas pelo Race Control, estornos e gestão de pendências.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SANDBOX_PILLARS.map((feat, idx) => {
                const Icon = feat.icon;
                const isWide = idx === 2;
                return (
                  <div
                    key={feat.title}
                    className={`p-5 rounded-2xl bg-white/[0.025] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/15 transition-colors ${
                      isWide ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#FF1717] shrink-0 mt-0.5">
                        <Icon size={17} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white tracking-tight mb-1">
                          {feat.title}
                        </h3>
                        <p className="text-xs text-white/60 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!token || !user) {
                    navigate('/login', { state: { from: '/apexpay' } });
                    return;
                  }
                  navigate(user.role === 'ADMIN' ? '/admin' : '/apexpay');
                }}
                className="inline-flex items-center gap-2 bg-[#FF1717] hover:bg-[#e01414] text-white text-xs sm:text-sm font-medium px-7 py-3 rounded-full transition-all shadow-lg shadow-[#FF1717]/25 cursor-pointer"
              >
                <span>
                  {user?.role === 'ADMIN'
                    ? 'Abrir Painel Financeiro Admin'
                    : 'Abrir Minha Carteira Sandbox'}
                </span>
                <ArrowRight size={15} />
              </button>

              <span className="inline-flex items-center gap-1.5 text-xs text-white/50 font-mono">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Créditos fictícios gratuitos para teste
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
