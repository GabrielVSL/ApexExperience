'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';

interface WalletSummary {
  usuarioId: number;
  nome: string;
  email: string;
  saldoCarteira: number;
  totalDepositadoHistorico: number;
  statusFinanceiro: string;
  inadimplente: boolean;
}

interface TransactionItem {
  id: number;
  tipo: 'DEPOSITO' | 'DEBITO_RESERVA' | 'JUROS_ATRASO' | 'SINISTRO_PISTA' | 'ESTORNO' | string;
  valor: number;
  dataHora: string;
  descricao: string;
  trackingReserva?: string;
}

interface MonthGroup {
  key: string;
  label: string;
  items: TransactionItem[];
}

type StatementFilter = 'all' | 'credits' | 'debits';

const TIPO_LABELS: Record<string, string> = {
  DEPOSITO: 'Depósito',
  DEBITO_RESERVA: 'Reserva de pista',
  JUROS_ATRASO: 'Encargos de atraso',
  SINISTRO_PISTA: 'Ocorrência em pista',
  ESTORNO: 'Estorno',
};

const QUICK_AMOUNTS = [
  { value: 250, label: '+R$ 250' },
  { value: 500, label: '+R$ 500' },
  { value: 1000, label: '+R$ 1 mil' },
  { value: 2500, label: '+R$ 2,5 mil' },
];

function formatCnhDisplay(cnh: string): string {
  const digits = cnh.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `•••••••${digits.slice(-4)}`;
}

function formatBirthDate(dateStr: string): string {
  if (!dateStr) return 'Não informada';
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  return format(parsed, 'dd/MM/yyyy');
}

function getMonthGroupInfo(dateStr: string): { key: string; label: string } {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return { key: 'outros', label: 'Outros lançamentos' };
  }
  const key = format(parsed, 'yyyy-MM');
  const rawLabel = format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  return { key, label };
}

export default function ApexPayPage() {
  const navigate = useNavigate();
  const { formatBrl, formatCircuitEquivalent, eurRate } = useCurrencyStore();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [extrato, setExtrato] = useState<TransactionItem[]>([]);

  // CNH estado salvo vs edição
  const [savedCnh, setSavedCnh] = useState('');
  const [savedDob, setSavedDob] = useState('');
  const [cnh, setCnh] = useState('');
  const [dob, setDob] = useState('1995-05-15');
  const [isEditingCnh, setIsEditingCnh] = useState(false);

  const [depositAmount, setDepositAmount] = useState('500');
  const [statementFilter, setStatementFilter] = useState<StatementFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSavingCnh, setIsSavingCnh] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [saldoRes, extratoRes, perfilRes] = await Promise.all([
        api.get('/api/apexpay/saldo'),
        api.get('/api/apexpay/extrato'),
        api.get('/api/usuarios/me').catch(() => ({ data: null })),
      ]);
      setWallet(saldoRes.data);
      setExtrato(Array.isArray(extratoRes.data) ? extratoRes.data : []);

      const fetchedCnh = perfilRes.data?.cnhNumero || '';
      const fetchedDob = perfilRes.data?.dataNascimento || '';
      setSavedCnh(fetchedCnh);
      setSavedDob(fetchedDob);
      setCnh(fetchedCnh);
      if (fetchedDob) setDob(fetchedDob);
      setIsEditingCnh(!fetchedCnh);
    } catch {
      toast.error('Erro ao carregar dados da sua carteira ApexPay.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeposit = async (valorCustom?: number) => {
    const val = valorCustom ?? Number(depositAmount);
    if (!val || val <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }

    try {
      setIsDepositing(true);
      await api.post('/api/apexpay/deposito', {
        valor: val,
        descricao: wallet?.inadimplente
          ? 'Quitação de Débito / Recarga ApexPay'
          : 'Recarga de Carteira ApexPay',
      });
      toast.success(`Depósito de ${formatBrl(val)} creditado com sucesso!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao realizar depósito.');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleSaveCnh = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingCnh(true);
      await api.put('/api/usuarios/me/habilitacao', {
        cnhNumero: cnh,
        cnhCategoria: 'B',
        dataNascimento: dob,
      });
      toast.success('Habilitação validada e vinculada ao perfil!');
      setIsEditingCnh(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'CNH inválida no algoritmo Módulo 11.');
    } finally {
      setIsSavingCnh(false);
    }
  };

  const extratoFiltrado = useMemo(() => {
    const sorted = [...extrato].sort(
      (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
    );
    if (statementFilter === 'all') return sorted;
    if (statementFilter === 'credits') {
      return sorted.filter((item) => item.tipo === 'DEPOSITO' || item.tipo === 'ESTORNO');
    }
    return sorted.filter((item) => item.tipo !== 'DEPOSITO' && item.tipo !== 'ESTORNO');
  }, [extrato, statementFilter]);

  const extratoPorMes = useMemo<MonthGroup[]>(() => {
    const groupsMap = new Map<string, MonthGroup>();

    for (const item of extratoFiltrado) {
      const { key, label } = getMonthGroupInfo(item.dataHora);
      const existing = groupsMap.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groupsMap.set(key, { key, label, items: [item] });
      }
    }

    return Array.from(groupsMap.values());
  }, [extratoFiltrado]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C] font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF1717]" size={30} />
          <span className="text-xs text-white/50">Carregando carteira ApexPay...</span>
        </div>
      </div>
    );
  }

  const totalDep = wallet?.totalDepositadoHistorico || 0;
  const saldoAtual = wallet?.saldoCarteira || 0;
  const hasValidCnh = Boolean(savedCnh && savedCnh.trim().length > 0);

  return (
    <div className="min-h-screen bg-[#08090C] text-white pt-28 pb-24 px-6 font-sans selection:bg-[#FF1717] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
              <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                <Wallet size={12} />
              </span>
              <span className="text-xs font-medium text-white/80">
                Carteira digital · Ambiente simulado
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.08]">
              Minha carteira{' '}
              <span className="italic font-light text-white/85">ApexPay.</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/55 max-w-2xl leading-relaxed">
              Faça recargas instantâneas para testar reservas sem dinheiro real, acompanhe faturas ou estornos e mantenha sua CNH validada para pilotar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/meus-alugueis')}
              className="px-4 py-2.5 rounded-full text-xs font-medium text-white/85 bg-[#0D1017] hover:bg-[#121622] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Calendar size={14} className="text-[#FF1717]" />
              <span>Minhas sessões</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/pistas')}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-white/90 text-[#08090C] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Explorar pistas</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </header>

        {/* Alerta de pendência financeira */}
        {wallet?.inadimplente && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-3xl bg-rose-500/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-300 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-rose-200">
                  Conta com pendência financeira ({formatBrl(saldoAtual)})
                </h2>
                <p className="text-xs text-rose-200/75 mt-1 leading-relaxed">
                  Novos agendamentos estão temporariamente bloqueados até a quitação do saldo devedor via depósito.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isDepositing}
              onClick={() => handleDeposit(Math.abs(saldoAtual))}
              className="shrink-0 bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-full cursor-pointer transition-colors"
            >
              Quitar pendência ({formatBrl(Math.abs(saldoAtual))})
            </button>
          </motion.div>
        )}

        {/* Grade Principal com altura igualada entre esquerda e direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Coluna Esquerda: Saldo + Recarga + CNH */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Card de Saldo */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-white/55 flex items-center gap-2">
                  <Wallet size={14} className="text-[#FF1717]" />
                  <span>Saldo disponível</span>
                </span>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    wallet?.inadimplente
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {wallet?.inadimplente ? 'Com pendência' : 'Conta regular'}
                </span>
              </div>

              <div>
                <p
                  className={`text-4xl sm:text-[42px] font-medium tracking-tight tabular-nums leading-none ${
                    saldoAtual < 0 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {formatBrl(saldoAtual)}
                </p>
                <p className="text-xs text-white/45 mt-2.5 tabular-nums">
                  Total depositado no histórico: {formatBrl(totalDep)}
                </p>
                {saldoAtual > 0 && (
                  <p className="text-xs text-white/55 mt-1 tabular-nums">
                    Equivalente em pistas europeias:{' '}
                    <span className="text-white/80 font-medium">
                      ~ {formatCircuitEquivalent(saldoAtual, 'nurburgring')?.formatted}
                    </span>{' '}
                    (1 € = R$ {eurRate.toFixed(2).replace('.', ',')})
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-[#121622] p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Aprovação imediata com saldo
                  </span>
                  <span className="text-white/50 text-xs">
                    {wallet?.inadimplente ? 'Bloqueada' : 'Ativa'}
                  </span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Reservas pagas integralmente com saldo têm confirmação na hora. Faturas pós-pagas passam por análise do Race Control.
                </p>
              </div>
            </div>

            {/* Card de Depósito / Recarga */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
              <div>
                <h2 className="text-base font-medium text-white">Adicionar saldo</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Escolha um atalho ou informe qualquer valor simulado.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((item) => {
                  const selected = depositAmount === String(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setDepositAmount(String(item.value))}
                      className={`py-2 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-white text-[#08090C]'
                          : 'bg-[#121622] text-white/75 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 tabular-nums transition-all"
                  placeholder="Valor em R$"
                />
                <button
                  type="button"
                  disabled={isDepositing}
                  onClick={() => handleDeposit()}
                  className="bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-50 text-white text-xs font-semibold px-6 py-3 rounded-full transition-all shadow-md shadow-[#FF1717]/20 cursor-pointer shrink-0"
                >
                  {isDepositing ? 'Creditando...' : 'Depositar'}
                </button>
              </div>
            </div>

            {/* Card de Habilitação (CNH) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium text-white flex items-center gap-2">
                  <KeyRound size={16} className="text-[#FF1717]" />
                  <span>Habilitação de pista (CNH)</span>
                </h2>

                {hasValidCnh && !isEditingCnh ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium">
                    <ShieldCheck size={13} />
                    <span>Validada</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCnh('52798802310')}
                    className="text-xs font-medium text-[#FF1717] hover:text-[#ff4545] transition-colors cursor-pointer"
                  >
                    Usar CNH de teste
                  </button>
                )}
              </div>

              {hasValidCnh && !isEditingCnh ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#121622] p-4 flex items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <div>
                        <span className="text-[11px] text-white/45 block">
                          CNH cadastrada e verificada
                        </span>
                        <span className="text-sm font-medium text-white tabular-nums">
                          {formatCnhDisplay(savedCnh)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-white/45 block">
                          Data de nascimento
                        </span>
                        <span className="text-xs text-white/80 tabular-nums">
                          {formatBirthDate(savedDob || dob)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingCnh(true)}
                      className="px-4 py-2 rounded-full bg-[#0D1017] hover:bg-white/[0.08] text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      <Pencil size={12} />
                      <span>Alterar CNH</span>
                    </button>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed">
                    Sua habilitação está ativa para reservas em que você assume o volante.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveCnh} className="space-y-4">
                  <p className="text-xs text-white/50 leading-relaxed">
                    Necessária apenas para reservas em que você assume o volante. Fast Lap como passageiro e Visita ao Box são isentos.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-white/45 mb-1.5 px-1">
                        Número da CNH
                      </label>
                      <input
                        type="text"
                        placeholder="11 dígitos"
                        value={cnh}
                        onChange={(e) => setCnh(e.target.value)}
                        className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 tabular-nums transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/45 mb-1.5 px-1">
                        Data de nascimento
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 tabular-nums transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {hasValidCnh && (
                      <button
                        type="button"
                        onClick={() => {
                          setCnh(savedCnh);
                          if (savedDob) setDob(savedDob);
                          setIsEditingCnh(false);
                        }}
                        className="px-5 py-3 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/80 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingCnh}
                      className="flex-1 bg-white hover:bg-white/90 disabled:opacity-50 text-[#08090C] text-xs font-semibold py-3 rounded-full transition-all cursor-pointer"
                    >
                      {isSavingCnh ? 'Validando CNH...' : 'Validar e salvar CNH'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Coluna Direita: Extrato (ocupa 100% da altura da coluna esquerda) */}
          <div className="lg:col-span-7 flex">
            <div className="w-full h-full p-6 sm:p-7 rounded-3xl bg-[#0D1017] flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.06] shrink-0">
                <div>
                  <h2 className="text-base font-medium text-white">Extrato de movimentações</h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    {extrato.length}{' '}
                    {extrato.length === 1 ? 'lançamento registrado' : 'lançamentos registrados'}
                  </p>
                </div>

                {extrato.length > 0 && (
                  <div className="flex items-center gap-1 bg-[#121622] p-1 rounded-full self-start sm:self-auto">
                    {(
                      [
                        { id: 'all', label: 'Todas' },
                        { id: 'credits', label: 'Entradas' },
                        { id: 'debits', label: 'Saídas' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStatementFilter(opt.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          statementFilter === opt.id
                            ? 'bg-white text-[#08090C]'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {extrato.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#121622] flex items-center justify-center text-white/30 mb-3">
                    <CheckCircle2 size={22} />
                  </div>
                  <p className="text-sm font-medium text-white/80">
                    Nenhuma movimentação registrada ainda.
                  </p>
                  <p className="text-xs text-white/45 mt-1 max-w-xs leading-relaxed">
                    Adicione saldo ao lado para testar reservas imediatas e acompanhar seu extrato organizado por mês aqui.
                  </p>
                </div>
              ) : extratoFiltrado.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <p className="text-sm text-white/65">Nenhum lançamento encontrado neste filtro.</p>
                  <button
                    type="button"
                    onClick={() => setStatementFilter('all')}
                    className="px-4 py-2 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 transition-colors cursor-pointer"
                  >
                    Mostrar todas
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-6 overflow-y-auto max-h-[680px] pr-1 custom-scrollbar">
                    {extratoPorMes.map((group) => (
                      <section key={group.key} className="space-y-3">
                        {/* Divisor de Mês com linha horizontal */}
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-xs font-medium text-white/75 shrink-0">
                            {group.label}
                          </span>
                          <div className="h-px flex-1 bg-white/[0.07]" />
                          <span className="text-[11px] text-white/40 shrink-0 tabular-nums">
                            {group.items.length}{' '}
                            {group.items.length === 1 ? 'movimentação' : 'movimentações'}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {group.items.map((item) => {
                            const isCredit =
                              item.tipo === 'DEPOSITO' || item.tipo === 'ESTORNO';
                            const isWarning =
                              item.tipo === 'JUROS_ATRASO' || item.tipo === 'SINISTRO_PISTA';
                            const tipoLabel = TIPO_LABELS[item.tipo] || item.tipo;

                            return (
                              <div
                                key={item.id}
                                className="p-4 rounded-2xl bg-[#121622] hover:bg-[#161B29] transition-colors flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      isCredit
                                        ? 'bg-emerald-500/15 text-emerald-300'
                                        : isWarning
                                        ? 'bg-rose-500/15 text-rose-300'
                                        : 'bg-white/[0.07] text-white/75'
                                    }`}
                                  >
                                    {isCredit ? (
                                      <ArrowDownLeft size={16} />
                                    ) : isWarning ? (
                                      <ShieldAlert size={16} />
                                    ) : (
                                      <ArrowUpRight size={16} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      {item.descricao}
                                    </p>
                                    <p className="text-xs text-white/45 mt-0.5 truncate">
                                      {tipoLabel} ·{' '}
                                      {new Date(item.dataHora).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className={`text-sm font-semibold tabular-nums ${
                                      isCredit ? 'text-emerald-300' : 'text-rose-300'
                                    }`}
                                  >
                                    {isCredit ? '+' : '-'}
                                    {formatBrl(item.valor)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>

                  {/* Rodapé discreto no fim do painel quando há poucos itens */}
                  {extratoFiltrado.length <= 4 && (
                    <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-white/35">
                      <span>Novos depósitos, reservas e estornos aparecem aqui automaticamente.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
