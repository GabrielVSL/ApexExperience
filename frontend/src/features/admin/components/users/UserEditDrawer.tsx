'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  User,
  ShieldCheck,
  CreditCard,
  Settings,
  AlertTriangle,
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';

export interface AdminUserDetail {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  endereco?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  dataNascimento?: string;
  statusConta: 'ATIVO' | 'BLOQUEADO_RESERVAS' | 'SUSPENSO';
  saldoCarteira: number;
  totalDepositadoHistorico: number;
  statusFinanceiro: 'REGULAR' | 'INADIMPLENTE';
  inadimplente: boolean;
  historicoSessoes?: Array<{
    id: number;
    trackingCode: string;
    automovel: string;
    circuito: string;
    tipoServico: string;
    status: string;
    valorFinal: number;
    valorSinistro: number;
    data: string;
  }>;
  resumoCarteira?: {
    saldo: number;
    totalDepositado: number;
    faturaPendente: number;
  };
}

interface UserEditDrawerProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

type DrawerTab = 'perfil' | 'cnh' | 'financeiro' | 'seguranca';

const STATUS_CONTA_LABELS: Record<AdminUserDetail['statusConta'], { label: string; cls: string }> = {
  ATIVO: { label: 'Ativo', cls: 'bg-emerald-500/15 text-emerald-300' },
  BLOQUEADO_RESERVAS: { label: 'Reservas bloqueadas', cls: 'bg-amber-500/15 text-amber-300' },
  SUSPENSO: { label: 'Suspenso', cls: 'bg-rose-500/15 text-rose-300' },
};

export default function UserEditDrawer({
  userId,
  isOpen,
  onClose,
  onUserUpdated,
}: UserEditDrawerProps) {
  const { formatPrice } = useCurrencyStore();
  const [activeTab, setActiveTab] = useState<DrawerTab>('perfil');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<AdminUserDetail | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cnhNumero, setCnhNumero] = useState('');
  const [cnhCategoria, setCnhCategoria] = useState('B');
  const [dataNascimento, setDataNascimento] = useState('');
  const [statusConta, setStatusConta] = useState<'ATIVO' | 'BLOQUEADO_RESERVAS' | 'SUSPENSO'>('ATIVO');
  const [statusFinanceiro, setStatusFinanceiro] = useState<'REGULAR' | 'INADIMPLENTE'>('REGULAR');
  const [novaSenha, setNovaSenha] = useState('');

  const isAdmin = user?.email === 'admin@apex.com' || (user as any)?.role?.includes('ADMIN');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !userId) {
      setUser(null);
      return;
    }

    setActiveTab('perfil');
    setNovaSenha('');

    const fetchUserDetails = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/api/admin/usuarios/${userId}`);
        const data: AdminUserDetail = res.data;
        setUser(data);
        setNome(data.nome || '');
        setEmail(data.email || '');
        setTelefone(data.telefone || '');
        setEndereco(data.endereco || '');
        setCnhNumero(data.cnhNumero || '');
        setCnhCategoria(data.cnhCategoria || 'B');
        setDataNascimento(data.dataNascimento ? data.dataNascimento.slice(0, 10) : '');
        setStatusConta(data.statusConta || 'ATIVO');
        setStatusFinanceiro(data.statusFinanceiro || 'REGULAR');
      } catch {
        toast.error('Erro ao carregar detalhes do piloto.');
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [isOpen, userId, onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setIsSaving(true);
      const payload: Record<string, any> = {
        nome,
        email,
        telefone,
        endereco,
        cnhNumero,
        cnhCategoria,
        dataNascimento: dataNascimento || null,
        statusConta: isAdmin ? 'ATIVO' : statusConta,
        statusFinanceiro,
      };

      if (!isAdmin && novaSenha.trim()) {
        if (novaSenha.trim().length < 6) {
          toast.error('A nova senha deve ter no mínimo 6 caracteres.');
          setIsSaving(false);
          return;
        }
        payload.password = novaSenha.trim();
      }

      await api.put(`/api/admin/usuarios/${userId}`, payload);

      toast.success('Ficha do piloto atualizada com sucesso!');
      onUserUpdated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao salvar alterações do piloto.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmailReset = async () => {
    if (!user?.email) {
      toast.error('O piloto não possui e-mail cadastrado.');
      return;
    }
    try {
      const res = await api.post('/api/usuarios/recuperar-senha/solicitar', {
        email: user.email,
      });
      toast.success(
        res.data?.message || 'Código de redefinição enviado para o e-mail do piloto!'
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar e-mail de recuperação.');
    }
  };

  const statusMeta = STATUS_CONTA_LABELS[statusConta] || STATUS_CONTA_LABELS.ATIVO;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end overflow-hidden font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#08090C]/75 backdrop-blur-md"
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Editar ficha do piloto"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[540px] h-full sm:p-3 flex flex-col"
      >
            <div className="flex flex-col h-full w-full bg-[#0D1017] sm:rounded-3xl shadow-2xl overflow-hidden">
              {/* Cabeçalho */}
              <div className="px-6 pt-6 pb-5 space-y-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#121622] text-[11px] font-medium text-white/75 tabular-nums">
                        Piloto #{userId}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${statusMeta.cls}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <h2 className="text-xl font-medium text-white truncate">
                      {user?.nome || 'Carregando piloto...'}
                    </h2>
                    <p className="text-xs text-white/50 truncate">{user?.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar edição"
                    className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] flex items-center justify-center text-white/65 hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* Abas em pill */}
                <div className="bg-[#121622] p-1 rounded-full grid grid-cols-4 gap-1">
                  {[
                    { id: 'perfil', label: 'Dados Pessoais', icon: User },
                    { id: 'cnh', label: 'CNH & Piloto', icon: ShieldCheck },
                    { id: 'financeiro', label: 'ApexPay', icon: CreditCard },
                    { id: 'seguranca', label: 'Segurança & Status', icon: Settings },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as DrawerTab)}
                        className={`relative py-2 px-2 rounded-full text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isActive ? 'text-[#08090C]' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="admin-edit-drawer-tab"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            className="absolute inset-0 rounded-full bg-white"
                          />
                        )}
                        <Icon size={13} className="relative z-10 shrink-0" />
                        <span className="relative z-10 hidden sm:inline truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Corpo */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#FF1717]" size={28} />
                  </div>
                ) : (
                  <form id="edit-user-form" onSubmit={handleSave} className="space-y-4">
                    {/* TAB 1: DADOS PESSOAIS */}
                    {activeTab === 'perfil' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                            Nome completo
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={nome}
                              onChange={(e) => setNome(e.target.value)}
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-10 transition-all"
                            />
                            <User
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                            E-mail de contato
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-10 transition-all"
                            />
                            <Mail
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                            Telefone (com DDD)
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              placeholder="11987654321"
                              value={telefone}
                              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-10 tabular-nums transition-all"
                            />
                            <Phone
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                            />
                          </div>
                          <p className="text-[11px] text-white/45 mt-1.5 px-1">
                            Utilizado para contato direto com o piloto em caso de emergência ou suporte.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                            Endereço completo
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={endereco}
                              onChange={(e) => setEndereco(e.target.value)}
                              placeholder="Rua, número, cidade e estado"
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-10 transition-all"
                            />
                            <MapPin
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: CNH & PILOTO */}
                    {activeTab === 'cnh' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-[#121622] flex items-start gap-3">
                          <ShieldCheck size={18} className="text-[#FF1717] shrink-0 mt-0.5" />
                          <div className="text-xs text-white/65 leading-relaxed">
                            Pilotos sem CNH válida ou menores de 21 anos podem agendar apenas{' '}
                            <strong className="text-white">Visita ao Box</strong> ou{' '}
                            <strong className="text-white">Fast Lap</strong> como passageiro.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                              <label className="text-xs font-medium text-white/60">
                                Número da CNH
                              </label>
                              <button
                                type="button"
                                onClick={() => setCnhNumero('52798802310')}
                                className="text-xs font-medium text-[#FF1717] hover:underline cursor-pointer"
                              >
                                Usar CNH teste
                              </button>
                            </div>
                            <input
                              type="text"
                              maxLength={11}
                              placeholder="11 dígitos"
                              value={cnhNumero}
                              onChange={(e) => setCnhNumero(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 tabular-nums transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                              Categoria
                            </label>
                            <select
                              value={cnhCategoria}
                              onChange={(e) => setCnhCategoria(e.target.value)}
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-3.5 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 cursor-pointer transition-all"
                            >
                              <option value="B">B (Carros)</option>
                              <option value="C">C (Carga)</option>
                              <option value="D">D (Passageiros)</option>
                              <option value="E">E (Especiais)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                            Data de nascimento
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              value={dataNascimento}
                              onChange={(e) => setDataNascimento(e.target.value)}
                              className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-10 tabular-nums transition-all"
                            />
                            <Calendar
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                            />
                          </div>
                          <p className="text-[11px] text-white/45 mt-1.5 px-1">
                            Idade mínima de 21 anos para pilotar em circuito.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: FINANCEIRO APEXPAY */}
                    {activeTab === 'financeiro' && (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 rounded-2xl bg-[#121622]">
                            <p className="text-white/45 text-xs">Saldo em carteira</p>
                            <p
                              className={`text-xl font-semibold mt-1 tabular-nums ${
                                (user?.saldoCarteira || 0) < 0 ? 'text-rose-300' : 'text-emerald-300'
                              }`}
                            >
                              {formatPrice(user?.saldoCarteira || 0)}
                            </p>
                          </div>
                          <div className="p-4 rounded-2xl bg-[#121622]">
                            <p className="text-white/45 text-xs">Total depositado</p>
                            <p className="text-xl font-semibold text-white mt-1 tabular-nums">
                              {formatPrice(user?.totalDepositadoHistorico || 0)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                            Situação financeira ApexPay
                          </label>
                          <select
                            value={statusFinanceiro}
                            onChange={(e) => setStatusFinanceiro(e.target.value as any)}
                            className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 cursor-pointer transition-all"
                          >
                            <option value="REGULAR">Regular (em dia com a plataforma)</option>
                            <option value="INADIMPLENTE">Inadimplente (bloqueado por pendência)</option>
                          </select>
                        </div>

                        <div className="pt-1 space-y-2.5">
                          <p className="text-xs font-medium text-white/80 px-1">
                            Histórico de sessões do piloto
                          </p>
                          {!user?.historicoSessoes || user.historicoSessoes.length === 0 ? (
                            <div className="p-4 rounded-2xl bg-[#121622] text-xs text-white/45">
                              Nenhuma sessão registrada para este piloto.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                              {user.historicoSessoes.map((s) => (
                                <div
                                  key={s.id}
                                  className="p-3.5 rounded-2xl bg-[#121622] flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="text-white font-medium truncate">{s.automovel}</p>
                                    <p className="text-white/50 text-[11px] truncate mt-0.5">
                                      {s.circuito} · {s.tipoServico}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-white font-semibold tabular-nums">
                                      {formatPrice(s.valorFinal)}
                                    </p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0D1017] text-white/70 inline-block mt-0.5">
                                      {s.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 4: SEGURANÇA & STATUS DA CONTA */}
                    {activeTab === 'seguranca' && (
                      <div className="space-y-4">
                        {isAdmin ? (
                          <div className="p-4 rounded-2xl bg-amber-500/12 space-y-2">
                            <div className="flex items-center gap-2 text-amber-300 font-medium text-xs">
                              <Lock size={15} />
                              <span>Conta de Administrador Protegida</span>
                            </div>
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                              Por segurança, a senha de acesso, e-mail e privilégios desta conta administrativa são protegidos contra modificações ou exclusão.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-white/60 mb-1.5 px-1">
                                Status da conta
                              </label>
                              <select
                                value={statusConta}
                                onChange={(e) => setStatusConta(e.target.value as any)}
                                className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 cursor-pointer transition-all"
                              >
                                <option value="ATIVO">Ativo (acesso e reservas liberados)</option>
                                <option value="BLOQUEADO_RESERVAS">
                                  Bloqueado para reservas (apenas consulta)
                                </option>
                                <option value="SUSPENSO">Suspenso (conta desativada)</option>
                              </select>
                            </div>

                            <div className="p-4 rounded-2xl bg-[#121622] space-y-2.5">
                              <label className="block text-xs font-medium text-white/80">
                                Definir nova senha para o piloto
                              </label>
                              <input
                                type="password"
                                placeholder="Mínimo 6 caracteres (opcional)"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                className="w-full bg-[#0D1017] focus:bg-[#171C2B] px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                              />
                              <p className="text-[11px] text-white/45">
                                Deixe em branco para manter a senha atual.
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-[#121622] space-y-2.5">
                              <h4 className="text-xs font-medium text-white flex items-center gap-2">
                                <Mail size={14} className="text-emerald-400" />
                                <span>Enviar código de recuperação por E-mail</span>
                              </h4>
                              <p className="text-xs text-white/55 leading-relaxed">
                                Envia um código de verificação para o e-mail cadastrado (
                                {user?.email || 'sem e-mail cadastrado'}).
                              </p>
                              <button
                                type="button"
                                onClick={handleSendEmailReset}
                                className="px-4 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium cursor-pointer transition-colors"
                              >
                                Enviar código por E-mail
                              </button>
                            </div>

                            <div className="p-4 rounded-2xl bg-rose-500/10 space-y-1.5">
                              <div className="flex items-center gap-2 text-rose-300 font-medium text-xs">
                                <AlertTriangle size={14} />
                                <span>Atenção ao suspender</span>
                              </div>
                              <p className="text-xs text-rose-200/75 leading-relaxed">
                                Alterar o status para <strong>Suspenso</strong> cancela sessões pendentes e impede o acesso do piloto.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Rodapé */}
              <div className="px-6 py-4 bg-[#0B0E14] flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="edit-user-form"
                  disabled={isSaving || isLoading}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#08090C] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Salvar alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
  );
}
