'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UserPlus,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  Calendar,
  MapPin,
  Wallet,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const CNH_TESTE_SUGERIDA = '52798802310';

const maskPhone = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const maskCPF = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');

export default function UserCreateModal({
  isOpen,
  onClose,
  onUserCreated,
}: UserCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CLIENTE' | 'ADMIN'>('CLIENTE');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnhNumero, setCnhNumero] = useState('');
  const [cnhCategoria, setCnhCategoria] = useState('B');
  const [dataNascimento, setDataNascimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [statusConta, setStatusConta] = useState<'ATIVO' | 'BLOQUEADO_RESERVAS' | 'SUSPENSO'>('ATIVO');

  const resetForm = () => {
    setNome('');
    setEmail('');
    setPassword('');
    setRole('CLIENTE');
    setTelefone('');
    setCpf('');
    setCnhNumero('');
    setCnhCategoria('B');
    setDataNascimento('');
    setEndereco('');
    setSaldoInicial('');
    setStatusConta('ATIVO');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || nome.trim().length < 3) {
      toast.error('O nome deve ter no mínimo 3 caracteres.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Digite um e-mail válido.');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('A senha provisória deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Record<string, any> = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        statusConta,
      };

      if (telefone.trim()) payload.telefone = telefone.replace(/\D/g, '');
      if (cpf.trim()) payload.cpf = cpf.replace(/\D/g, '');
      if (cnhNumero.trim()) {
        payload.cnhNumero = cnhNumero.replace(/\D/g, '');
        payload.cnhCategoria = cnhCategoria;
      }
      if (dataNascimento) payload.dataNascimento = dataNascimento;
      if (endereco.trim()) payload.endereco = endereco.trim();
      if (saldoInicial && Number(saldoInicial) > 0) {
        payload.saldoInicial = Number(saldoInicial);
      }

      await api.post('/api/admin/usuarios', payload);
      toast.success(`Piloto ${nome} cadastrado com sucesso no Paddock!`);
      resetForm();
      onUserCreated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao cadastrar piloto.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-10 w-full max-w-2xl bg-[#0D1017] border border-white/15 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0A0D14]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF1717]/15 border border-[#FF1717]/30 flex items-center justify-center text-[#FF1717]">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                    Novo Cadastro no Paddock
                  </h3>
                  <p className="text-xs text-white/50">
                    Cadastrar novo piloto ou administrador executivo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body Scrollable */}
            <form id="create-user-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Seletor de Role (Nível de Acesso) */}
              <div>
                <label className="block text-xs font-mono uppercase text-white/70 mb-2">
                  Tipo de Conta & Acesso
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('CLIENTE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      role === 'CLIENTE'
                        ? 'bg-[#FF1717]/15 border-[#FF1717] text-white shadow-md'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase font-mono">Piloto (Cliente)</p>
                    <p className="text-[11px] text-white/50 mt-0.5">Acesso a reservas de pista, telemetria e ApexPay</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      role === 'ADMIN'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase font-mono text-amber-400">Administrador</p>
                    <p className="text-[11px] text-white/50 mt-0.5">Acesso integral ao Painel Executivo e Race Control</p>
                  </button>
                </div>
              </div>

              {/* Linha 1: Nome e E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gabriel Verstappen"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    E-mail de Acesso *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="piloto@apex.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9"
                    />
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  </div>
                </div>
              </div>

              {/* Linha 2: Senha Provisória e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Senha Provisória (Mín. 6) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9 pr-9"
                    />
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9"
                    />
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Linha 3: CPF e CNH */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono uppercase text-white/60">
                      Número CNH
                    </label>
                    <button
                      type="button"
                      onClick={() => setCnhNumero(CNH_TESTE_SUGERIDA)}
                      className="text-[9px] text-[#FF1717] hover:underline font-mono"
                    >
                      Usar CNH Teste
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: 52798802310"
                      value={cnhNumero}
                      onChange={(e) => setCnhNumero(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9 font-mono"
                    />
                    <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Categoria CNH
                  </label>
                  <select
                    value={cnhCategoria}
                    onChange={(e) => setCnhCategoria(e.target.value)}
                    className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="B">B (Automóvel / Supercarro)</option>
                    <option value="C">C (Carga / Apoio)</option>
                    <option value="D">D (Transporte Paddock)</option>
                    <option value="E">E (Especial Competição)</option>
                  </select>
                </div>
              </div>

              {/* Linha 4: Data de Nascimento e Saldo Inicial ApexPay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Data de Nascimento (Mín. 21 anos)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9"
                    />
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Crédito Inicial ApexPay (R$, opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="50"
                      placeholder="0.00"
                      value={saldoInicial}
                      onChange={(e) => setSaldoInicial(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9 font-mono"
                    />
                    <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Linha 5: Endereço e Status Inicial */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Endereço / Box Paddock
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: Av. Interlagos, 1000 - Box 04"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none pl-9"
                    />
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={statusConta}
                    onChange={(e) => setStatusConta(e.target.value as any)}
                    className="w-full bg-[#11131A] border border-white/15 focus:border-[#FF1717] px-3.5 py-2.5 rounded-xl text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="BLOQUEADO_RESERVAS">BLOQUEADO</option>
                    <option value="SUSPENSO">SUSPENSO</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-white/10 bg-[#0A0D14] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={isSubmitting}
                className="relative px-6 py-2.5 rounded-full bg-[#FF1717] hover:bg-[#E10600] text-white text-xs font-semibold tracking-wide transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Cadastrar no Paddock</span>
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
