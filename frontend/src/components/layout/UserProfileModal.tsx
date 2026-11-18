import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfileData {
  id: number;
  nome: string;
  email: string;
  role: 'ADMIN' | 'CLIENTE';
  telefone?: string;
  endereco?: string;
  cpf?: string;
  rg?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  dataNascimento?: string;
  saldoCarteira?: number;
  statusFinanceiro?: string;
  avatarUrl?: string;
  accessToken?: string;
}

type ActiveTab = 'profile' | 'security';
type PasswordMethod = 'current' | 'email';

function formatPhone(value?: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskCpf(cpf?: string): string {
  if (!cpf) return 'Não informado';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `•••.${digits.slice(3, 6)}.•••-${digits.slice(9, 11)}`;
}

function maskDocument(doc?: string): string {
  if (!doc) return 'Não informado';
  const clean = doc.trim();
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(Math.max(clean.length - 4, 2))}${clean.slice(-4)}`;
}

function formatCurrency(value?: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0));
}

function getInitials(name?: string, email?: string): string {
  const source = (name || email || 'AX').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user: authUser, login, logout } = useAuthStore();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  // Dados pessoais
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Segurança / Senha
  const [passwordMethod, setPasswordMethod] = useState<PasswordMethod>('current');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [codigoEmail, setCodigoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = (profile?.role ?? authUser?.role) === 'ADMIN';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setFeedback(null);
    setActiveTab('profile');
    setSenhaAtual('');
    setCodigoEmail('');
    setNovaSenha('');
    setConfirmarSenha('');
    setCodeSent(false);
    setLoading(true);

    api
      .get<UserProfileData>('/api/usuarios/me')
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setProfile(data);
        setNome(data.nome || '');
        setEmail(data.email || '');
        setTelefone(formatPhone(data.telefone));
        setEndereco(data.endereco || '');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setFeedback({
          type: 'error',
          message: err?.response?.data?.message || 'Não foi possível carregar os dados da conta.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const initials = useMemo(
    () => getInitials(profile?.nome, profile?.email || authUser?.email),
    [profile?.nome, profile?.email, authUser?.email]
  );

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) return;

    setFeedback(null);
    const trimmedName = nome.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const digitsPhone = telefone.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setFeedback({ type: 'error', message: 'Informe seu nome completo.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFeedback({ type: 'error', message: 'Informe um endereço de e-mail válido.' });
      return;
    }

    if (digitsPhone.length > 0 && digitsPhone.length < 10) {
      setFeedback({ type: 'error', message: 'Informe um número de telefone válido com DDD.' });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put<UserProfileData>('/api/usuarios/me', {
        nome: trimmedName,
        email: trimmedEmail,
        telefone: digitsPhone,
        endereco: endereco.trim(),
      });
      setProfile((prev) => ({ ...(prev ?? ({} as UserProfileData)), ...res.data }));
      if (res.data.accessToken && res.data.email) {
        login(
          res.data.accessToken,
          res.data.email,
          authUser?.role || (res.data.role === 'ADMIN' ? 'ADMIN' : 'CLIENTE')
        );
        if (typeof window !== 'undefined' && localStorage.getItem('apex_remembered_email')) {
          localStorage.setItem('apex_remembered_email', res.data.email);
        }
      }
      setFeedback({ type: 'success', message: 'Dados atualizados com sucesso.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Erro ao atualizar seus dados.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailCode = async () => {
    if (isAdmin) return;
    setFeedback(null);

    const targetEmail = (profile?.email || authUser?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setFeedback({
        type: 'error',
        message: 'Nenhum e-mail válido encontrado para este piloto.',
      });
      return;
    }

    setRequestingCode(true);
    try {
      await api.post('/api/usuarios/recuperar-senha/solicitar', {
        email: targetEmail,
      });
      setCodeSent(true);
      setFeedback({
        type: 'success',
        message: 'Código de verificação enviado para o seu e-mail cadastrado.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Não foi possível enviar o código por e-mail.',
      });
    } finally {
      setRequestingCode(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) return;
    setFeedback(null);

    if (passwordMethod === 'current' && !senhaAtual.trim()) {
      setFeedback({ type: 'error', message: 'Digite sua senha atual para continuar.' });
      return;
    }

    if (passwordMethod === 'email' && codigoEmail.trim().length < 4) {
      setFeedback({ type: 'error', message: 'Informe o código recebido no seu e-mail.' });
      return;
    }

    if (novaSenha.length < 6) {
      setFeedback({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setFeedback({ type: 'error', message: 'As novas senhas não coincidem.' });
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/api/usuarios/me/senha', {
        ...(passwordMethod === 'current'
          ? { senhaAtual: senhaAtual.trim() }
          : { codigoEmail: codigoEmail.trim() }),
        novaSenha,
      });
      setSenhaAtual('');
      setCodigoEmail('');
      setNovaSenha('');
      setConfirmarSenha('');
      setCodeSent(false);
      setFeedback({ type: 'success', message: 'Senha alterada com sucesso.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Não foi possível alterar a senha.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (typeof document === 'undefined' || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex justify-end font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#08090C]/75 backdrop-blur-md"
      />

      {/* Slide-over panel */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Minha conta"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[460px] h-full sm:p-3 flex flex-col"
      >
            <div className="flex flex-col h-full w-full bg-[#0D1017] sm:rounded-3xl shadow-2xl overflow-hidden">
              {/* Top header */}
              <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-sm font-semibold ${
                      isAdmin
                        ? 'bg-[#FF1717]/15 text-[#FF1717]'
                        : 'bg-[#121622] text-white'
                    }`}
                  >
                    {isAdmin ? <Shield size={20} /> : initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-medium text-white truncate">
                        {profile?.nome || 'Minha conta'}
                      </h2>
                      {isAdmin && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FF1717]/15 text-[#FF1717] text-[11px] font-medium shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 truncate mt-0.5">
                      {profile?.email || authUser?.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar painel da conta"
                  className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                {loading ? (
                  <div className="space-y-3 pt-2">
                    <div className="h-24 rounded-2xl bg-[#121622] animate-pulse" />
                    <div className="h-11 rounded-full bg-[#121622] animate-pulse" />
                    <div className="h-12 rounded-2xl bg-[#121622] animate-pulse" />
                    <div className="h-12 rounded-2xl bg-[#121622] animate-pulse" />
                  </div>
                ) : (
                  <>
                    {/* Highlight card: ApexPay Wallet (Cliente) or Admin Shortcut */}
                    {isAdmin ? (
                      <div className="rounded-2xl bg-[#121622] p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">Conta administrativa</p>
                          <p className="text-xs text-white/50 mt-0.5">
                            Alterações de dados e senha desta conta são gerenciadas internamente.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/admin')}
                          className="px-4 py-2 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          Painel
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#121622] p-4 space-y-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#FF1717]/15 flex items-center justify-center text-[#FF1717]">
                              <Wallet size={17} />
                            </div>
                            <div>
                              <p className="text-xs text-white/50">Saldo ApexPay</p>
                              <p className="text-lg font-medium text-white tabular-nums leading-tight">
                                {formatCurrency(profile?.saldoCarteira)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleNavigate('/apexpay')}
                            className="px-4 py-2 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-[#FF1717]/20 cursor-pointer"
                          >
                            <span>Abrir ApexPay</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleNavigate('/meus-alugueis')}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#0D1017] hover:bg-white/[0.06] text-xs text-white/80 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Calendar size={13} className="text-[#FF1717]" />
                            <span>Minhas sessões</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavigate('/apexpay')}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#0D1017] hover:bg-white/[0.06] text-xs text-white/80 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Wallet size={13} className="text-white/60" />
                            <span>Recarregar saldo</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Segmented Tab Switcher */}
                    <div className="bg-[#121622] p-1 rounded-full grid grid-cols-2 gap-1">
                      {(
                        [
                          { id: 'profile', label: 'Dados pessoais', icon: User },
                          { id: 'security', label: 'Segurança', icon: Lock },
                        ] as const
                      ).map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.id);
                              setFeedback(null);
                            }}
                            className={`relative py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                              active ? 'text-[#08090C]' : 'text-white/65 hover:text-white'
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="account-drawer-tab"
                                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                className="absolute inset-0 rounded-full bg-white"
                              />
                            )}
                            <Icon size={13} className="relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback Banner */}
                    {feedback && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed flex items-start gap-2.5 ${
                          feedback.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-[#FF1717]/15 text-[#FF8A8A]'
                        }`}
                      >
                        <CheckCircle2
                          size={15}
                          className={`shrink-0 mt-0.5 ${
                            feedback.type === 'success' ? 'text-emerald-400' : 'text-[#FF1717]'
                          }`}
                        />
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Tab 1: Dados pessoais */}
                    {activeTab === 'profile' ? (
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                              Nome completo
                            </label>
                            <div className="relative">
                              <User
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                              />
                              <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                disabled={isAdmin}
                                placeholder="Seu nome"
                                className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] disabled:opacity-60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                              E-mail de acesso
                            </label>
                            <div className="relative">
                              <Mail
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                              />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isAdmin}
                                placeholder="piloto@apex.com"
                                className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] disabled:opacity-60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                              Telefone
                            </label>
                            <div className="relative">
                              <Phone
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                              />
                              <input
                                type="tel"
                                value={telefone}
                                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                                disabled={isAdmin}
                                placeholder="(11) 99999-9999"
                                className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] disabled:opacity-60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                              Endereço
                            </label>
                            <div className="relative">
                              <MapPin
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                              />
                              <input
                                type="text"
                                value={endereco}
                                onChange={(e) => setEndereco(e.target.value)}
                                disabled={isAdmin}
                                placeholder="Rua, número e cidade"
                                className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] disabled:opacity-60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {!isAdmin && (
                          <div className="rounded-2xl bg-[#121622]/80 p-4 space-y-2.5">
                            <p className="text-xs font-medium text-white/75">
                              Documentação cadastrada
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-white/40">CPF</p>
                                <p className="text-white/85 mt-0.5 tabular-nums">
                                  {maskCpf(profile?.cpf)}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/40">CNH</p>
                                <p className="text-white/85 mt-0.5 tabular-nums">
                                  {profile?.cnhNumero
                                    ? `${maskDocument(profile.cnhNumero)}${
                                        profile.cnhCategoria ? ` (${profile.cnhCategoria})` : ''
                                      }`
                                    : 'Não informada'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isAdmin && (
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="w-full py-3 px-5 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#08090C] text-sm font-semibold transition-all cursor-pointer"
                          >
                            {savingProfile ? 'Salvando alterações...' : 'Salvar alterações'}
                          </button>
                        )}
                      </form>
                    ) : (
                      /* Tab 2: Segurança e senha */
                      <div className="space-y-4">
                        {isAdmin ? (
                          <div className="rounded-2xl bg-[#121622] p-5 text-sm text-white/65 leading-relaxed">
                            Por segurança, a alteração de senha da conta administrativa não é feita
                            por este painel.
                          </div>
                        ) : (
                          <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-white/55 px-1">
                                Como deseja confirmar a alteração?
                              </p>
                              <div className="bg-[#121622] p-1 rounded-full grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPasswordMethod('current');
                                    setFeedback(null);
                                  }}
                                  className={`py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    passwordMethod === 'current'
                                      ? 'bg-[#1D2333] text-white'
                                      : 'text-white/55 hover:text-white'
                                  }`}
                                >
                                  <KeyRound size={13} />
                                  <span>Senha atual</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPasswordMethod('email');
                                    setFeedback(null);
                                  }}
                                  className={`py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    passwordMethod === 'email'
                                      ? 'bg-[#1D2333] text-white'
                                      : 'text-white/55 hover:text-white'
                                  }`}
                                >
                                  <Mail size={13} />
                                  <span>Via E-mail</span>
                                </button>
                              </div>
                            </div>

                            {passwordMethod === 'current' ? (
                              <div>
                                <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                                  Senha atual
                                </label>
                                <div className="relative">
                                  <Lock
                                    size={15}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                                  />
                                  <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={senhaAtual}
                                    onChange={(e) => setSenhaAtual(e.target.value)}
                                    placeholder="Digite sua senha atual"
                                    className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] pl-10 pr-11 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword((v) => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                                    aria-label="Mostrar ou ocultar senha atual"
                                  >
                                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-[#121622] p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-white">
                                      Verificação por E-mail
                                    </p>
                                    <p className="text-xs text-white/50 truncate mt-0.5">
                                      {profile?.email || authUser?.email || 'E-mail não informado'}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleRequestEmailCode}
                                    disabled={requestingCode}
                                    className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-50 text-xs font-medium text-white shrink-0 transition-colors cursor-pointer"
                                  >
                                    {requestingCode
                                      ? 'Enviando...'
                                      : codeSent
                                      ? 'Reenviar código'
                                      : 'Enviar código'}
                                  </button>
                                </div>

                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={codigoEmail}
                                  onChange={(e) => setCodigoEmail(e.target.value)}
                                  placeholder="Código de verificação"
                                  className="w-full rounded-xl bg-[#0D1017] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                                Nova senha
                              </label>
                              <div className="relative">
                                <KeyRound
                                  size={15}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                                />
                                <input
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={novaSenha}
                                  onChange={(e) => setNovaSenha(e.target.value)}
                                  placeholder="Mínimo 6 caracteres"
                                  className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] pl-10 pr-11 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword((v) => !v)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                                  aria-label="Mostrar ou ocultar nova senha"
                                >
                                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-white/55 mb-1.5 px-1">
                                Confirmar nova senha
                              </label>
                              <div className="relative">
                                <KeyRound
                                  size={15}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                                />
                                <input
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={confirmarSenha}
                                  onChange={(e) => setConfirmarSenha(e.target.value)}
                                  placeholder="Repita a nova senha"
                                  className="w-full rounded-2xl bg-[#121622] focus:bg-[#171C2B] pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={savingPassword}
                              className="w-full py-3 px-5 rounded-full bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-md shadow-[#FF1717]/20 cursor-pointer"
                            >
                              {savingPassword ? 'Atualizando senha...' : 'Atualizar senha'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#0B0E14] flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-full bg-[#121622] hover:bg-[#FF1717]/15 text-xs font-medium text-white/75 hover:text-[#FF8A8A] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sair da conta</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.aside>
        </div>,
    document.body
  );
};

export default UserProfileModal;
