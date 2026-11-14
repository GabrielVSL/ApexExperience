'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageCircle,
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
    if (!isOpen || !userId) {
      setUser(null);
      return;
    }

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

  const handleSendWhatsAppReset = async () => {
    if (!telefone) {
      toast.error('O piloto não possui telefone de WhatsApp cadastrado.');
      return;
    }
    try {
      const res = await api.post('/api/usuarios/recuperar-senha-whatsapp/solicitar', {
        telefone,
      });
      toast.success(res.data?.message || 'Instruções de redefinição enviadas para o WhatsApp do piloto!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar WhatsApp.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end overflow-hidden">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full max-w-[540px] h-full bg-[#0A0D14] border-l border-white/15 shadow-2xl flex flex-col justify-between"
          >
            {/* Header Sticky */}
            <div className="p-6 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF1717] font-semibold">
                      Race Control · Piloto #{userId}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        statusConta === 'ATIVO'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : statusConta === 'BLOQUEADO_RESERVAS'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {statusConta}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white truncate mt-1">
                    {user?.nome || 'Carregando piloto...'}
                  </h2>
                  <p className="text-xs text-white/50 font-mono truncate">{user?.email}</p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex gap-1.5 mt-5 border-b border-white/10 pb-2">
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
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#FF1717] text-white shadow-sm'
                          : 'bg-white/[0.03] text-white/60 hover:text-white'
                      }`}
                    >
                      <Icon size={13} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
                        <label className="block text-[11px] font-medium text-white/70 mb-1">
                          Nome Completo
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9"
                          />
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/70 mb-1">
                          E-mail de Contato
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9 font-mono"
                          />
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/70 mb-1">
                          Telefone / WhatsApp (com DDD)
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="11987654321"
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9 font-mono"
                          />
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 pl-1">
                          Utilizado para envio do código de segurança OTP e avisos de Race Control.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/70 mb-1">
                          Endereço Completo
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={endereco}
                            onChange={(e) => setEndereco(e.target.value)}
                            placeholder="Rua, número, cidade e estado"
                            className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9"
                          />
                          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PILOTO & CNH */}
                  {activeTab === 'cnh' && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                        <ShieldCheck size={18} className="text-[#FF1717] shrink-0 mt-0.5" />
                        <div className="text-xs text-white/70 leading-relaxed">
                          Pilotos sem CNH válida ou menores de 21 anos podem agendar apenas <strong className="text-white">Visita ao Box</strong> ou sessões com instrutor Hot Lap.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-medium text-white/70">
                              Número da CNH
                            </label>
                            <button
                              type="button"
                              onClick={() => setCnhNumero('52798802310')}
                              className="text-[10px] font-mono text-[#FF1717] hover:underline cursor-pointer"
                            >
                              Usar CNH Teste
                            </button>
                          </div>
                          <input
                            type="text"
                            maxLength={11}
                            placeholder="11 dígitos (Módulo 11)"
                            value={cnhNumero}
                            onChange={(e) => setCnhNumero(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-white/70 mb-1">
                            Categoria
                          </label>
                          <select
                            value={cnhCategoria}
                            onChange={(e) => setCnhCategoria(e.target.value)}
                            className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
                          >
                            <option value="B">B (Carros)</option>
                            <option value="C">C (Carga)</option>
                            <option value="D">D (Passageiros)</option>
                            <option value="E">E (Especiais)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/70 mb-1">
                          Data de Nascimento
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={dataNascimento}
                            onChange={(e) => setDataNascimento(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9 font-mono"
                          />
                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 pl-1">
                          Exigência de 21 anos completos para condução esportiva em circuito internacional.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: FINANCEIRO APEXPAY */}
                  {activeTab === 'financeiro' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                          <p className="text-white/40 text-[10px] uppercase">Saldo em Carteira</p>
                          <p
                            className={`text-lg font-bold mt-1 ${
                              (user?.saldoCarteira || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatPrice(user?.saldoCarteira || 0)}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                          <p className="text-white/40 text-[10px] uppercase">Total Depositado</p>
                          <p className="text-lg font-bold text-white mt-1">
                            {formatPrice(user?.totalDepositadoHistorico || 0)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium font-sans text-white/70 mb-1">
                          Situação Financeira ApexPay
                        </label>
                        <select
                          value={statusFinanceiro}
                          onChange={(e) => setStatusFinanceiro(e.target.value as any)}
                          className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="REGULAR">REGULAR (Em dia com a plataforma)</option>
                          <option value="INADIMPLENTE">INADIMPLENTE (Bloqueado por pendência financeira)</option>
                        </select>
                      </div>

                      {/* Histórico Recente de Sessões */}
                      <div className="pt-2">
                        <p className="text-[11px] font-sans font-medium text-white/80 mb-2">
                          Sessões Realizadas pelo Piloto
                        </p>
                        {(!user?.historicoSessoes || user.historicoSessoes.length === 0) ? (
                          <p className="text-[11px] text-white/40 py-2">Nenhuma sessão registrada para este piloto.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {user.historicoSessoes.map((s) => (
                              <div
                                key={s.id}
                                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px]"
                              >
                                <div>
                                  <p className="text-white font-medium">{s.automovel}</p>
                                  <p className="text-white/45 text-[10px]">{s.circuito} · {s.tipoServico}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-bold">{formatPrice(s.valorFinal)}</p>
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/80">
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
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase font-mono">
                            <Lock size={15} />
                            Conta de Administrador Protegida
                          </div>
                          <p className="text-xs text-amber-200/80 leading-relaxed">
                            Esta conta executiva é mantida pública para fins de demonstração e homologação.
                            Por regras de segurança da plataforma, a senha de acesso, e-mail e privilégios
                            são protegidos contra modificações e exclusão.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[11px] font-medium text-white/70 mb-1">
                              Status da Conta no Race Control
                            </label>
                            <select
                              value={statusConta}
                              onChange={(e) => setStatusConta(e.target.value as any)}
                              className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
                            >
                              <option value="ATIVO">ATIVO (Permissão total de acesso e agendamentos)</option>
                              <option value="BLOQUEADO_RESERVAS">BLOQUEADO_RESERVAS (Acesso mantido, sem novas sessões)</option>
                              <option value="SUSPENSO">SUSPENSO (Conta desativada por infração de pista)</option>
                            </select>
                          </div>

                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                            <label className="block text-[11px] font-medium text-white/80">
                              Redefinir Senha do Piloto (Direta)
                            </label>
                            <input
                              type="password"
                              placeholder="Digite uma nova senha (mín. 6 caracteres)"
                              value={novaSenha}
                              onChange={(e) => setNovaSenha(e.target.value)}
                              className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2 rounded-xl text-xs text-white outline-none"
                            />
                            <p className="text-[10px] text-white/40">
                              Deixe em branco para manter a senha atual do piloto.
                            </p>
                          </div>

                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <MessageCircle size={14} className="text-[#25D366]" />
                              Disparo de Código via WhatsApp
                            </h4>
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              Dispara um código de segurança de 6 dígitos diretamente para o WhatsApp do piloto ({telefone || 'Sem telefone'}).
                            </p>
                            <button
                              type="button"
                              onClick={handleSendWhatsAppReset}
                              className="px-3.5 py-2 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-xs font-medium cursor-pointer transition-colors"
                            >
                              Disparar Recuperação WhatsApp
                            </button>
                          </div>

                          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                            <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                              <AlertTriangle size={14} />
                              Zona de Risco Race Control
                            </div>
                            <p className="text-[11px] text-rose-200/70 leading-relaxed">
                              Alterar o status para <strong className="text-rose-200">SUSPENSO</strong> cancelará imediatamente todas as sessões pendentes e impedirá login do piloto.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Footer Sticky */}
            <div className="p-4 sm:p-6 border-t border-white/10 bg-[#0A0D14] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-user-form"
                disabled={isSaving || isLoading}
                className="relative px-6 py-2.5 rounded-full bg-[#FF1717] hover:bg-[#E10600] text-white text-xs font-semibold tracking-wide transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
