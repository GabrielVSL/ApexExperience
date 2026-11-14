import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Shield,
  ShieldAlert,
  Lock,
  LogOut,
  CheckCircle2,
  Loader2,
  KeyRound,
  MessageCircle,
  Eye,
  EyeOff,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfileData {
  id?: number;
  nome?: string;
  email?: string;
  role?: string;
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
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { formatPrice } = useCurrencyStore();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'dossie' | 'senha'>('dossie');

  // Estados de edição de dados (Cliente)
  const [nomeEdit, setNomeEdit] = useState('');
  const [telefoneEdit, setTelefoneEdit] = useState('');
  const [enderecoEdit, setEnderecoEdit] = useState('');
  const [savingData, setSavingData] = useState(false);

  // Estados de alteração segura de senha
  const [metodoVerificacao, setMetodoVerificacao] = useState<'senha_atual' | 'whatsapp'>('senha_atual');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [codigoWhatsApp, setCodigoWhatsApp] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const carregarPerfil = () => {
    if (!user) return;
    setLoading(true);
    api
      .get('/api/usuarios/me')
      .then((res) => {
        if (res.data) {
          setProfile(res.data);
          setNomeEdit(res.data.nome || '');
          setTelefoneEdit(res.data.telefone || '');
          setEnderecoEdit(res.data.endereco || '');
        }
      })
      .catch(() => {
        setProfile({
          email: user.email,
          role: user.role,
          nome: isAdmin ? 'Administrador Apex' : user.email.split('@')[0],
        });
        setNomeEdit(isAdmin ? 'Administrador Apex' : user.email.split('@')[0]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      carregarPerfil();
      setActiveTab('dossie');
      setSenhaAtual('');
      setCodigoWhatsApp('');
      setNovaSenha('');
      setConfirmarSenha('');
      setCodigoEnviado(false);
    }
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    onClose();
    toast.info('Sessão encerrada com sucesso.');
    navigate('/login');
  };

  // Salva dados cadastrais (Nome, Telefone, Endereço)
  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error('Alterações de dados cadastrais são restritas para a conta Administrador.');
      return;
    }

    if (!nomeEdit.trim() || nomeEdit.trim().length < 3) {
      toast.error('O nome deve ter no mínimo 3 caracteres.');
      return;
    }

    setSavingData(true);
    try {
      await api.put('/api/usuarios/me', {
        nome: nomeEdit.trim(),
        telefone: telefoneEdit.replace(/\D/g, ''),
        endereco: enderecoEdit.trim(),
      });
      toast.success('Dossiê do piloto atualizado com sucesso!');
      carregarPerfil();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao salvar dados do perfil.');
    } finally {
      setSavingData(false);
    }
  };

  // Solicita envio de código OTP via WhatsApp para autorizar troca de senha
  const handleSolicitarCodigoWhatsApp = async () => {
    const tel = profile?.telefone || telefoneEdit;
    if (!tel || tel.replace(/\D/g, '').length < 10) {
      toast.error('Número de WhatsApp inválido no cadastro. Atualize seu telefone primeiro.');
      return;
    }
    setEnviandoCodigo(true);
    try {
      await api.post('/api/usuarios/recuperar-senha-whatsapp/solicitar', {
        telefone: tel.replace(/\D/g, ''),
      });
      setCodigoEnviado(true);
      toast.success('Código de 6 dígitos enviado para seu WhatsApp! Digite-o para verificar.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao enviar código pelo WhatsApp.');
    } finally {
      setEnviandoCodigo(false);
    }
  };

  // Salva nova senha com verificação obrigatória (Senha Atual OU Código WhatsApp)
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error('A senha da conta de Administrador é protegida e não pode ser alterada.');
      return;
    }

    if (metodoVerificacao === 'senha_atual' && !senhaAtual) {
      toast.error('Digite sua Senha Atual para verificar sua identidade.');
      return;
    }

    if (metodoVerificacao === 'whatsapp' && (!codigoWhatsApp || codigoWhatsApp.trim().length < 4)) {
      toast.error('Digite o Código de Verificação recebido no WhatsApp.');
      return;
    }

    if (!novaSenha || novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('A confirmação não coincide com a nova senha.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/api/usuarios/me/senha', {
        senhaAtual: metodoVerificacao === 'senha_atual' ? senhaAtual : undefined,
        codigoWhatsApp: metodoVerificacao === 'whatsapp' ? codigoWhatsApp.trim() : undefined,
        novaSenha: novaSenha.trim(),
      });

      toast.success('Senha alterada com sucesso mediante validação de segurança!');
      setSenhaAtual('');
      setCodigoWhatsApp('');
      setNovaSenha('');
      setConfirmarSenha('');
      setCodigoEnviado(false);
      setActiveTab('dossie');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const maskCPFDisplay = (cpf?: string) => {
    if (!cpf) return 'Não informado';
    const c = cpf.replace(/\D/g, '');
    if (c.length !== 11) return cpf;
    return `***.${c.slice(3, 6)}.***-${c.slice(9)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[460px] max-h-[90vh] rounded-[28px] bg-[#0A0D14]/95 border border-white/15 p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(255,23,23,0.12)] text-white flex flex-col justify-between overflow-hidden"
        >
          {/* Brilho radial no topo */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#FF1717]/15 blur-3xl pointer-events-none rounded-full" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Shield size={16} className="text-[#FF1717]" />
              ) : (
                <User size={16} className="text-[#FF1717]" />
              )}
              <h2 className="text-sm font-semibold tracking-wider uppercase text-white/90">
                {isAdmin ? 'Acesso Administrativo' : 'Dossiê do Piloto'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-white/60">
              <Loader2 className="animate-spin text-[#FF1717]" size={24} />
              <span className="text-xs">Carregando credenciais...</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-0.5 my-3 space-y-4">
              {/* Card Resumo do Piloto */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF1717] via-rose-600 to-black p-[2px] shrink-0">
                  <div className="w-full h-full rounded-full bg-[#0E121A] flex items-center justify-center overflow-hidden">
                    {isAdmin ? (
                      <Shield size={24} className="text-[#FF1717]" />
                    ) : (
                      <User size={24} className="text-white/80" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {profile?.nome || (isAdmin ? 'Administrador Apex' : 'Piloto Apex')}
                  </h3>
                  <p className="text-xs text-white/50 truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-500/30 text-red-300 text-[9px] font-mono font-bold uppercase">
                        <Lock size={9} className="text-[#FF1717]" /> Master Protegido
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono font-bold uppercase">
                          <CheckCircle2 size={9} /> Piloto Ativo
                        </span>
                        {profile?.saldoCarteira !== undefined && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-white/70">
                            <Wallet size={10} className="text-[#FF1717]" />
                            {formatPrice(profile.saldoCarteira)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Seletor de Abas (Dossiê vs Segurança & Senha) - Somente para Cliente */}
              {!isAdmin && (
                <div className="flex rounded-full bg-white/5 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dossie')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'dossie'
                        ? 'bg-white text-[#08090C] font-semibold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Dossiê Cadastral
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('senha')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'senha'
                        ? 'bg-white text-[#08090C] font-semibold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <KeyRound size={12} />
                    <span>Segurança & Senha</span>
                  </button>
                </div>
              )}

              {isAdmin ? (
                /* ========================================================
                   VISÃO ADMINISTRADOR: PROTEGIDO (SEM ALTERAÇÕES)
                   ======================================================== */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
                    <div className="flex items-center justify-between text-white/70 pb-1.5 border-b border-white/5">
                      <span className="text-white/45">Função:</span>
                      <span className="font-medium text-white">Race Control & Gestão Master</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70 pb-1.5 border-b border-white/5">
                      <span className="text-white/45">Identificador:</span>
                      <span className="font-mono text-white/90">admin@apex.com</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span className="text-white/45">Criptografia:</span>
                      <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <CheckCircle2 size={12} /> BCrypt Salt rounds
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs flex items-start gap-2.5 leading-relaxed">
                    <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Conta Master Protegida:</strong> A alteração de nome, credenciais e senha está bloqueada para o Administrador por política de integridade do ambiente.
                    </span>
                  </div>
                </div>
              ) : activeTab === 'dossie' ? (
                /* ========================================================
                   VISÃO CLIENTE: DOSSIÊ COMPLETO E EDIÇÃO DE DADOS
                   ======================================================== */
                <form onSubmit={handleSaveData} className="space-y-3">
                  {/* Grid de Dados Oficiais Protegidos (CPF, RG, CNH, Nascimento) */}
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] space-y-2">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider font-bold">
                      Documentos Homologados
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-white/70">
                      <div>
                        <span className="text-white/40 block text-[10px]">CPF:</span>
                        <span className="font-mono text-white/90">{maskCPFDisplay(profile?.cpf)}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">RG:</span>
                        <span className="font-mono text-white/90">{profile?.rg || 'Registrado'}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">CNH:</span>
                        <span className="font-mono text-white/90">
                          {profile?.cnhNumero ? `${profile.cnhNumero} (Cat. ${profile.cnhCategoria || 'B'})` : 'Opcional'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">Nascimento:</span>
                        <span className="font-mono text-white/90">{profile?.dataNascimento || 'Registrado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Campos Editáveis */}
                  <div>
                    <label className="block text-[11px] font-medium text-white/75 mb-1 pl-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={nomeEdit}
                      onChange={(e) => setNomeEdit(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/75 mb-1 pl-1 flex items-center justify-between">
                      <span>WhatsApp / Telefone</span>
                      <span className="text-[10px] text-white/40">Usado para verificação</span>
                    </label>
                    <input
                      type="tel"
                      value={telefoneEdit}
                      onChange={(e) => setTelefoneEdit(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/75 mb-1 pl-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={enderecoEdit}
                      onChange={(e) => setEnderecoEdit(e.target.value)}
                      placeholder="Cidade, estado"
                      className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingData}
                    className="w-full py-2.5 rounded-full bg-white text-[#08090C] hover:bg-white/90 text-xs font-semibold transition-all cursor-pointer shadow-md mt-1"
                  >
                    {savingData ? 'Salvando dados...' : 'Atualizar Dados Cadastrais'}
                  </button>
                </form>
              ) : (
                /* ========================================================
                   VISÃO CLIENTE: ALTERAÇÃO SEGURA DE SENHA COM VERIFICAÇÃO
                   ======================================================== */
                <form onSubmit={handleSavePassword} className="space-y-3">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                    <p className="text-[11px] text-white/60 mb-2 font-medium">
                      Escolha como comprovar sua identidade para liberar a troca:
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodoVerificacao('senha_atual')}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          metodoVerificacao === 'senha_atual'
                            ? 'bg-[#FF1717]/15 border-[#FF1717] text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="block text-xs font-semibold">Senha Atual</span>
                        <span className="text-[10px] text-white/40">Digite sua senha de login</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetodoVerificacao('whatsapp')}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          metodoVerificacao === 'whatsapp'
                            ? 'bg-[#FF1717]/15 border-[#FF1717] text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="block text-xs font-semibold flex items-center gap-1">
                          <MessageCircle size={11} className="text-emerald-400" /> WhatsApp
                        </span>
                        <span className="text-[10px] text-white/40">Receba código OTP</span>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Verificação Condicional */}
                  {metodoVerificacao === 'senha_atual' ? (
                    <div>
                      <label className="block text-[11px] font-medium text-white/75 mb-1 pl-1">
                        Sua Senha Atual *
                      </label>
                      <input
                        type="password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        placeholder="Digite a senha atual da sua conta"
                        className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1 pl-1">
                        <label className="text-[11px] font-medium text-white/75">
                          Código de 6 dígitos via WhatsApp *
                        </label>
                        <button
                          type="button"
                          onClick={handleSolicitarCodigoWhatsApp}
                          disabled={enviandoCodigo}
                          className="text-[10px] text-[#FF1717] hover:underline font-medium cursor-pointer"
                        >
                          {enviandoCodigo ? 'Enviando...' : codigoEnviado ? 'Reenviar código' : 'Enviar código'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={codigoWhatsApp}
                        onChange={(e) => setCodigoWhatsApp(e.target.value)}
                        placeholder="Ex: 582914"
                        maxLength={6}
                        className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10 font-mono tracking-widest text-center"
                      />
                    </div>
                  )}

                  {/* Campos da Nova Senha */}
                  <div>
                    <label className="block text-[11px] font-medium text-white/75 mb-1 pl-1">
                      Nova Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 pr-10 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/75 mb-1 pl-1">
                      Confirmar Nova Senha *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-white/10 text-white placeholder:text-white/30 text-xs rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#FF1717] border border-white/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="w-full py-2.5 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-[#FF1717]/25 mt-1"
                  >
                    {savingPassword ? 'Validando e salvando...' : 'Salvar Nova Senha com Verificação'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Rodapé: Botões Fechar e Sair */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-medium transition-all cursor-pointer shadow-sm"
            >
              <LogOut size={13} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfileModal;