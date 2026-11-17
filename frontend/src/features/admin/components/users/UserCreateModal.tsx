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
      toast.success(`Piloto ${nome} cadastrado com sucesso!`);
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
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[#08090C]/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Novo Cadastro no Paddock"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-2xl bg-[#0D1017] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF1717]/15 flex items-center justify-center text-[#FF1717]">
                  <UserPlus size={19} />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Novo Cadastro no Paddock</h3>
                  <p className="text-xs text-white/50">
                    Cadastrar novo piloto ou administrador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-[#121622] hover:bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form
              id="create-user-form"
              onSubmit={handleSubmit}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Tipo de conta
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('CLIENTE')}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                      role === 'CLIENTE'
                        ? 'bg-white text-[#08090C]'
                        : 'bg-[#121622] text-white/75 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">Piloto (Cliente)</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        role === 'CLIENTE' ? 'text-[#08090C]/65' : 'text-white/45'
                      }`}
                    >
                      Acesso a reservas, sessões e ApexPay
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                      role === 'ADMIN'
                        ? 'bg-[#FF1717] text-white'
                        : 'bg-[#121622] text-white/75 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">Administrador</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        role === 'ADMIN' ? 'text-white/85' : 'text-white/45'
                      }`}
                    >
                      Acesso completo ao painel administrativo
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Nome completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gabriel Verstappen"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">E-mail de acesso *</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="piloto@apex.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 transition-all"
                    />
                    <Mail
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">
                    Senha provisória (mín. 6) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 pr-9 transition-all"
                    />
                    <Lock
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
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
                  <label className="block text-xs text-white/60 mb-1.5">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 tabular-nums transition-all"
                    />
                    <Phone
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 tabular-nums transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-white/60">Número CNH</label>
                    <button
                      type="button"
                      onClick={() => setCnhNumero(CNH_TESTE_SUGERIDA)}
                      className="text-[11px] text-[#FF1717] hover:underline cursor-pointer"
                    >
                      Usar CNH teste
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: 52798802310"
                      value={cnhNumero}
                      onChange={(e) => setCnhNumero(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 tabular-nums transition-all"
                    />
                    <ShieldCheck
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Categoria CNH</label>
                  <select
                    value={cnhCategoria}
                    onChange={(e) => setCnhCategoria(e.target.value)}
                    className="w-full bg-[#121622] focus:bg-[#171C2B] px-3.5 py-2.5 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 cursor-pointer transition-all"
                  >
                    <option value="B">B (Carros)</option>
                    <option value="C">C (Carga)</option>
                    <option value="D">D (Passageiros)</option>
                    <option value="E">E (Especiais)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">
                    Data de nascimento (mín. 21 anos)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 tabular-nums transition-all"
                    />
                    <Calendar
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">
                    Crédito inicial ApexPay (R$, opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="50"
                      placeholder="0.00"
                      value={saldoInicial}
                      onChange={(e) => setSaldoInicial(e.target.value)}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 tabular-nums transition-all"
                    />
                    <Wallet
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-white/60 mb-1.5">Endereço</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rua, número e cidade"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-9 transition-all"
                    />
                    <MapPin
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Status inicial</label>
                  <select
                    value={statusConta}
                    onChange={(e) => setStatusConta(e.target.value as any)}
                    className="w-full bg-[#121622] focus:bg-[#171C2B] px-3.5 py-2.5 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-[#FF1717]/40 cursor-pointer transition-all"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="BLOQUEADO_RESERVAS">Bloqueado</option>
                    <option value="SUSPENSO">Suspenso</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#0B0E14] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#08090C] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
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
