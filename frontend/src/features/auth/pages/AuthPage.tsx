'use client';

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import {
  loginSchema,
  registerSchema,
  LoginFormInputs,
  RegisterFormInputs,
} from '@/schemas/authSchema';
import AntigravityParticlesBackground from '../components/AntigravityParticlesBackground';
import ApexDatePicker from '@/components/ui/ApexDatePicker';

type AuthMode = 'login' | 'register';
type RegisterStep = 1 | 2 | 3;

interface AuthPageProps {
  initialMode?: AuthMode;
}

const maskCPF = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');

const maskPhone = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Títulos em caixa normal (sem caixa alta / uppercase)
const STEP_TITLES: Record<RegisterStep, string> = {
  1: 'Dados pessoais',
  2: 'Habilitação e documentos',
  3: 'Senha e acesso ao paddock',
};

export default function AuthPage({ initialMode }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const loginToStore = useAuthStore((state) => state.login);

  const resolvedInitialMode: AuthMode = (() => {
    if (searchParams.get('mode') === 'register') return 'register';
    if (searchParams.get('mode') === 'login') return 'login';
    if (initialMode) return initialMode;
    if (location.pathname === '/cadastro') return 'register';
    return 'login';
  })();

  const [mode, setMode] = useState<AuthMode>(resolvedInitialMode);
  const [step, setStep] = useState<RegisterStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  // --- 📲 RECURSO WHATSAPP DE RECUPERAÇÃO DE SENHA ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappOtp, setWhatsappOtp] = useState('');
  const [whatsappNewPassword, setWhatsappNewPassword] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  useEffect(() => {
    if (location.pathname === '/cadastro' || searchParams.get('mode') === 'register') {
      setMode('register');
    } else if (location.pathname === '/login' || searchParams.get('mode') === 'login') {
      setMode('login');
    } else if (initialMode) {
      setMode(initialMode);
    }
    setServerError(null);
  }, [location.pathname, searchParams, initialMode]);

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setServerError(null);
    setMode(next);
    if (next === 'register') {
      setStep(1);
    }
    const targetUrl = next === 'register' ? '/cadastro' : '/login';
    if (window.location.pathname !== targetUrl) {
      window.history.replaceState(window.history.state, '', targetUrl);
    }
  };

  const savedEmail =
    typeof window !== 'undefined' ? localStorage.getItem('apex_remembered_email') || '' : '';

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    formState: { errors: loginErrors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: savedEmail, password: '' },
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    setValue: setSignupValue,
    watch: signupWatch,
    trigger,
    reset: resetSignup,
    formState: { errors: signupErrors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema) as any,
    shouldUnregister: false,
    defaultValues: {
      role: 'CLIENTE',
      nome: '',
      email: '',
      telefone: '',
      endereco: '',
      cpf: '',
      rg: '',
      cnhNumero: '',
      dataNascimento: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleNextStep = async () => {
    setServerError(null);
    if (step === 1) {
      const ok = await trigger(['nome', 'email', 'telefone', 'endereco']);
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await trigger(['cpf', 'rg']);
      if (ok) setStep(3);
    }
  };

  const onLogin = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const response = await api.post('/login', { username: data.email, password: data.password });
      const { access_token, roles } = response.data;
      const userRole = (roles && roles.length > 0 ? roles[0] : 'ROLE_CLIENTE').replace('ROLE_', '');
      loginToStore(access_token, data.email, userRole);

      if (rememberEmail) {
        localStorage.setItem('apex_remembered_email', data.email);
      } else {
        localStorage.removeItem('apex_remembered_email');
      }

      toast.success(
        userRole === 'ADMIN'
          ? 'Acesso Executivo liberado! Bem-vindo ao Painel Admin.'
          : 'Login realizado com sucesso!'
      );

      const fromState = (location.state as { from?: string } | null)?.from;
      const adminRoutes = ['/admin', '/pedidos', '/frota'];

      if (userRole === 'ADMIN') {
        const target = fromState && adminRoutes.includes(fromState) ? fromState : '/admin';
        navigate(target, { replace: true });
      } else if (fromState && fromState !== '/login' && fromState !== '/cadastro') {
        navigate(fromState, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      setServerError('E-mail ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormInputs) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const { confirmPassword: _confirmPassword, ...cleanData } = data;
      const cnhLimpa = cleanData.cnhNumero?.replace(/\D/g, '').trim();
      const dobLimpa = cleanData.dataNascimento?.trim();

      const payload = {
        ...cleanData,
        role: 'CLIENTE',
        cpf: cleanData.cpf?.replace(/\D/g, ''),
        cnhNumero: cnhLimpa || undefined,
        dataNascimento: dobLimpa || undefined,
      };
      await api.post('/api/usuarios/registrar', payload);
      toast.success('Conta criada com sucesso! Faça login para continuar.');
      setLoginValue('email', cleanData.email);
      resetSignup({
        role: 'CLIENTE',
        nome: '',
        email: '',
        telefone: '',
        endereco: '',
        cpf: '',
        rg: '',
        cnhNumero: '',
        dataNascimento: '',
        password: '',
        confirmPassword: '',
      });
      setStep(1);
      switchMode('login');
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        'Dados inválidos. Verifique se o CPF ou E-mail já existem.';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Envio do código WhatsApp
  const handleSendWhatsAppCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = whatsappPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      toast.error('Informe um número de WhatsApp válido com DDD.');
      return;
    }
    setWhatsappLoading(true);
    try {
      await api.post('/api/usuarios/recuperar-senha-whatsapp/solicitar', {
        telefone: clean,
      });
      setWhatsappSent(true);
      setWhatsappOtp('');
      toast.success(`Código de verificação enviado para o WhatsApp ${whatsappPhone}! Digite o código recebido no seu celular.`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Falha ao solicitar código via WhatsApp. Verifique o número informado.';
      toast.error(msg);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = whatsappPhone.replace(/\D/g, '');
    if (whatsappOtp.trim().length < 4) {
      toast.error('Digite o código de 6 dígitos recebido no WhatsApp.');
      return;
    }
    if (whatsappNewPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setWhatsappLoading(true);
    try {
      await api.post('/api/usuarios/recuperar-senha-whatsapp/redefinir', {
        telefone: cleanPhone,
        codigo: whatsappOtp.trim(),
        novaSenha: whatsappNewPassword,
      });
      setShowForgotModal(false);
      setWhatsappSent(false);
      setWhatsappPhone('');
      setWhatsappOtp('');
      setWhatsappNewPassword('');
      toast.success('Senha atualizada com sucesso! Você já pode entrar com a nova senha.');
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Código inválido ou expirado. Tente novamente.';
      toast.error(msg);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const pillInputClass =
    'w-full bg-white/95 text-[#08090C] placeholder:text-slate-400 text-xs sm:text-sm font-medium rounded-full px-4 py-2 sm:py-2.5 outline-none focus:ring-2 focus:ring-[#FF1717]/80 shadow-sm transition-all';

  return (
    <div
      className="relative min-h-[100dvh] w-full bg-black text-white p-3 sm:p-6 md:p-10 flex items-center justify-center overflow-hidden selection:bg-[#FF1717] selection:text-white"
    >
      {/* ========================================================
          1. EFEITO ANTIGRAVITY (REACT BITS / GOOGLE ANTIGRAVITY WEBGL2)
         ======================================================== */}
      <AntigravityParticlesBackground />

      {/* ========================================================
          2. PALCO CENTRAL (ALTURA ESTÁVEL — FROSTED GLASS TRANSLÚCIDO)
         ======================================================== */}
      <div className="relative z-10 w-full max-w-5xl h-[670px] min-h-[640px] max-h-[92vh] rounded-[30px] sm:rounded-[36px] overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.95)] flex flex-col justify-between bg-[#08090C]/60 backdrop-blur-xl">
        {/* Vídeo noturno dentro do palco central */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <video
            src="/login.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover filter brightness-[0.82] contrast-[1.15] scale-[1.01]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08090C]/60 via-[#08090C]/25 to-[#08090C]/70" />
        </div>

        {/* Barra superior dentro da moldura: Logo à esquerda + Botão minimalista de voltar com seta */}
        <header className="relative z-20 flex items-center justify-between px-6 sm:px-9 pt-6 sm:pt-7">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Apex"
              className="w-7 h-7 rounded-lg object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-lg font-normal tracking-[-0.03em] text-white lowercase leading-none">
              apex
            </span>
          </Link>

          {/* Botão de retorno minimalista: apenas a seta elegante com hover em vidro */}
          <Link
            to="/"
            aria-label="Voltar à página inicial"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/75 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
        </header>

        {/* ========================================================
            3. CARD CENTRAL FROSTED GLASS (DIMENSÃO FIXA ANTI-PULO)
           ======================================================== */}
        <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
          <div className="w-full max-w-[440px] min-h-[535px] rounded-[26px] bg-[#0A0D14]/75 backdrop-blur-2xl border border-white/20 shadow-[0_28px_80px_rgba(0,0,0,0.75),0_0_40px_rgba(255,23,23,0.09)] p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden">
            {/* Topo Fixo: Título, Subtítulo e Seletor Login / Cadastro */}
            <div className="shrink-0">
              <div className="text-center mb-4">
                <h1 className="text-2xl sm:text-[25px] font-bold tracking-[0.06em] uppercase text-white">
                  {mode === 'login' ? 'LOGIN' : 'CADASTRO'}
                </h1>
                <p className="text-xs text-white/65 mt-1 truncate">
                  {mode === 'login'
                    ? 'Entre com suas credenciais para acessar o paddock'
                    : `Etapa ${step} de 3 · ${STEP_TITLES[step]}`}
                </p>
              </div>

              {/* Pílula Seletora Fluida (Login <-> Cadastro) com mola suave */}
              <div className="flex justify-center mb-3">
                <div
                  role="tablist"
                  aria-label="Modo de autenticação"
                  className="inline-flex items-center p-1 rounded-full bg-white/15 backdrop-blur-md border border-white/15 relative"
                >
                  {(['login', 'register'] as const).map((tab) => {
                    const isActive = mode === tab;
                    const label = tab === 'login' ? 'Login' : 'Cadastro';
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => switchMode(tab)}
                        className={`relative px-5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer select-none ${
                          isActive ? 'text-[#08090C]' : 'text-white/75 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="authModeSelectorPill"
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="absolute inset-0 rounded-full bg-white shadow-sm"
                          />
                        )}
                        <span className="relative z-10">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {serverError && (
                <div className="mb-2 p-2.5 rounded-xl bg-rose-950/75 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                  <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{serverError}</span>
                </div>
              )}
            </div>

            {/* Centro Flexível: Formulário com Transições Suaves */}
            <div className="flex-1 flex flex-col justify-between my-auto overflow-y-auto overflow-x-hidden max-h-[400px] pr-0.5">
              <AnimatePresence>
                {mode === 'login' ? (
                  <motion.form
                    key="login-form"
                    onSubmit={handleLoginSubmit(onLogin)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3.5"
                  >
                    <div>
                      <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                        E-mail
                      </label>
                      <input
                        {...registerLogin('email')}
                        type="email"
                        placeholder="piloto@apex.com"
                        className={pillInputClass}
                      />
                      {loginErrors.email && (
                        <p className="text-rose-300 text-[11px] mt-1 pl-2">
                          {loginErrors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                        Senha
                      </label>
                      <div className="relative">
                        <input
                          {...registerLogin('password')}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Digite sua senha"
                          className={`${pillInputClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#08090C] transition-colors cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-rose-300 text-[11px] mt-1 pl-2">
                          {loginErrors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/75 px-1 pt-0.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberEmail}
                          onChange={(e) => setRememberEmail(e.target.checked)}
                          className="rounded border-white/30 bg-white/10 accent-[#FF1717]"
                        />
                        <span>Lembrar e-mail</span>
                      </label>

                      {/* Gatilho de recuperação de senha via WhatsApp */}
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-white/65 hover:text-white hover:underline transition-colors cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="relative w-full rounded-full py-3 bg-white/90 hover:bg-white text-[#08090C] text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-lg overflow-hidden group mt-1"
                    >
                      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,23,23,0.22)_0%,transparent_55%)] opacity-80 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Entrar'}
                      </span>
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register-form"
                    onSubmit={handleSignupSubmit(onRegister)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    {/* ========================================================
                        NOVO STEPPER REDESENHADO:
                        Barra segmentada unificada + tipografia natural (SEM CAIXA ALTA)
                       ======================================================== */}
                    <div className="space-y-1.5 mb-2.5">
                      <div className="flex items-center gap-1.5 h-1.5 w-full bg-white/10 rounded-full p-0.5 backdrop-blur-sm">
                        {([1, 2, 3] as RegisterStep[]).map((num) => {
                          const isDone = step > num;
                          const isCurrent = step === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                if (num < step) setStep(num);
                              }}
                              disabled={num > step}
                              className={`h-full rounded-full transition-all duration-300 flex-1 ${
                                isCurrent
                                  ? 'bg-[#FF1717] shadow-[0_0_12px_rgba(255,23,23,0.85)]'
                                  : isDone
                                  ? 'bg-white/80 cursor-pointer hover:bg-white'
                                  : 'bg-white/15'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Micro-cabeçalho com tipografia natural e limpa (Sentence case) */}
                      <div className="flex items-center justify-between text-[11px] px-0.5 text-white/80">
                        <span className="font-medium text-[#FF3B3B]">
                          {STEP_TITLES[step]}
                        </span>
                        <span className="font-mono text-[10px] text-white/50 tracking-wider">
                          {step} de 3
                        </span>
                      </div>
                    </div>

                    {/* Transição Suave de Etapas */}
                    <AnimatePresence>
                      {step === 1 && (
                        <motion.div
                          key="step-1"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-2"
                        >
                          <div>
                            <label className="block text-[11px] font-medium text-white/80 mb-0.5 pl-1">
                              Nome Completo
                            </label>
                            <input
                              {...registerSignup('nome')}
                              placeholder="Seu nome completo"
                              className={pillInputClass}
                            />
                            {signupErrors.nome && (
                              <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                {signupErrors.nome.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-white/80 mb-0.5 pl-1">
                              E-mail
                            </label>
                            <input
                              {...registerSignup('email')}
                              type="email"
                              placeholder="piloto@email.com"
                              className={pillInputClass}
                            />
                            {signupErrors.email && (
                              <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                {signupErrors.email.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-white/80 mb-0.5 pl-1">
                              WhatsApp (com DDD)
                            </label>
                            <input
                              {...registerSignup('telefone', {
                                onChange: (e) => {
                                  e.target.value = maskPhone(e.target.value);
                                },
                              })}
                              type="tel"
                              placeholder="(11) 98765-4321"
                              className={pillInputClass}
                            />
                            {signupErrors.telefone && (
                              <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                {signupErrors.telefone.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-white/80 mb-0.5 pl-1">
                              Endereço Completo
                            </label>
                            <input
                              {...registerSignup('endereco')}
                              placeholder="Rua, número, cidade e estado"
                              className={pillInputClass}
                            />
                            {signupErrors.endereco && (
                              <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                {signupErrors.endereco.message}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="relative w-full rounded-full py-2.5 sm:py-3 bg-white/90 hover:bg-white text-[#08090C] text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-lg overflow-hidden group mt-1"
                          >
                            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,23,23,0.20)_0%,transparent_55%)]" />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              <span>Próxima Etapa</span>
                              <ArrowRight size={14} />
                            </span>
                          </button>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="step-2"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-2.5"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                                CPF
                              </label>
                              <input
                                {...registerSignup('cpf')}
                                placeholder="000.000.000-00"
                                maxLength={14}
                                onChange={(e) => setSignupValue('cpf', maskCPF(e.target.value))}
                                className={pillInputClass}
                              />
                              {signupErrors.cpf && (
                                <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                  {signupErrors.cpf.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                                RG
                              </label>
                              <input
                                {...registerSignup('rg')}
                                placeholder="RG"
                                className={pillInputClass}
                              />
                              {signupErrors.rg && (
                                <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                  {signupErrors.rg.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-1 px-1">
                                <label className="text-[11px] font-medium text-white/80">
                                  CNH (opcional)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setSignupValue('cnhNumero', '52798802310')}
                                  className="text-[10px] font-mono text-[#FF1717] hover:text-white transition-colors cursor-pointer"
                                >
                                  CNH Teste
                                </button>
                              </div>
                              <input
                                {...registerSignup('cnhNumero')}
                                maxLength={11}
                                placeholder="11 dígitos"
                                className={pillInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                                Nascimento (opcional)
                              </label>
                              <ApexDatePicker
                                value={signupWatch('dataNascimento')}
                                onChange={(iso) => setSignupValue('dataNascimento', iso)}
                                placeholder="DD/MM/AAAA"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="px-4 py-3 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              onClick={handleNextStep}
                              className="relative flex-1 rounded-full py-3 bg-white/90 hover:bg-white text-[#08090C] text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-lg overflow-hidden"
                            >
                              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,23,23,0.20)_0%,transparent_55%)]" />
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                <span>Próxima Etapa</span>
                                <ArrowRight size={14} />
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="step-3"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-2.5"
                        >
                          <div className="rounded-2xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-[11px] text-white/80 leading-relaxed">
                            Sua conta já inclui a carteira simulada{' '}
                            <strong className="text-white">ApexPay Sandbox</strong> para recargas instantâneas e faturas pós-pagas no paddock.
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                                Senha
                              </label>
                              <input
                                {...registerSignup('password')}
                                type="password"
                                placeholder="Mín. 6 caracteres"
                                className={pillInputClass}
                              />
                              {signupErrors.password && (
                                <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                  {signupErrors.password.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                                Confirmar Senha
                              </label>
                              <input
                                {...registerSignup('confirmPassword')}
                                type="password"
                                placeholder="Repita a senha"
                                className={pillInputClass}
                              />
                              {signupErrors.confirmPassword && (
                                <p className="text-rose-300 text-[11px] mt-0.5 pl-2">
                                  {signupErrors.confirmPassword.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setStep(2)}
                              className="px-4 py-3 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="relative flex-1 rounded-full py-3 bg-white/90 hover:bg-white text-[#08090C] text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-lg overflow-hidden"
                            >
                              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,23,23,0.24)_0%,transparent_55%)]" />
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  'Finalizar Cadastro'
                                )}
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Rodapé Fixo: Alternância de Modo (Login <-> Cadastro) */}
            <div className="shrink-0 text-center text-xs text-white/65 pt-1">
              {mode === 'login' ? (
                <span>
                  Não possui conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-white font-semibold underline underline-offset-4 hover:text-[#FF1717] transition-colors cursor-pointer"
                  >
                    Cadastre-se
                  </button>
                </span>
              ) : (
                <span>
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-white font-semibold underline underline-offset-4 hover:text-[#FF1717] transition-colors cursor-pointer"
                  >
                    Entrar
                  </button>
                </span>
              )}
            </div>

            {/* ========================================================
                4. MODAL FLUTUANTE DE RECUPERAÇÃO VIA WHATSAPP
               ======================================================== */}
            <AnimatePresence>
              {showForgotModal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 z-30 bg-[#080A10]/95 backdrop-blur-2xl p-6 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
                        <MessageCircle size={15} />
                      </div>
                      <span className="text-xs font-mono uppercase tracking-widest text-[#25D366] font-bold">
                        WhatsApp OTP
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {!whatsappSent ? (
                    <form onSubmit={handleSendWhatsAppCode} className="space-y-4 my-auto">
                      <div className="text-center">
                        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
                          Recuperar Acesso
                        </h2>
                        <p className="text-xs text-white/60 mt-1">
                          Enviaremos um código de segurança de 6 dígitos instantaneamente para seu WhatsApp.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                          Número do WhatsApp
                        </label>
                        <input
                          type="tel"
                          placeholder="(11) 98765-4321"
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(maskPhone(e.target.value))}
                          className={pillInputClass}
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={whatsappLoading}
                        className="w-full rounded-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-black font-semibold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {whatsappLoading ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <>
                            <MessageCircle size={15} />
                            <span>Enviar Código via WhatsApp</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyAndResetPassword} className="space-y-3 my-auto">
                      <div className="text-center">
                        <h2 className="text-base font-bold uppercase tracking-wider text-white">
                          Validar Código
                        </h2>
                        <p className="text-[11px] text-white/60 mt-0.5">
                          Enviado para <strong className="text-white">{whatsappPhone}</strong>
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                          Código de 6 dígitos
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Ex: 849201"
                          value={whatsappOtp}
                          onChange={(e) => setWhatsappOtp(e.target.value.replace(/\D/g, ''))}
                          className={`${pillInputClass} text-center tracking-[0.3em] font-mono text-base font-bold`}
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/80 mb-1 pl-1">
                          Nova Senha
                        </label>
                        <input
                          type="password"
                          placeholder="Mín. 6 caracteres"
                          value={whatsappNewPassword}
                          onChange={(e) => setWhatsappNewPassword(e.target.value)}
                          className={pillInputClass}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={whatsappLoading}
                        className="w-full rounded-full py-3 bg-[#FF1717] hover:bg-[#E10600] text-white font-semibold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        {whatsappLoading ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <>
                            <KeyRound size={15} />
                            <span>Redefinir Senha</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setWhatsappSent(false)}
                          className="text-[11px] text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Reenviar para outro número
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/40">
                    <ShieldCheck size={12} className="text-[#25D366]" />
                    <span>Autenticação Criptografada Apex Paddock</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Espaçador inferior proporcional para harmonia visual */}
        <div className="h-4 sm:h-6 shrink-0" />
      </div>
    </div>
  );
}
