'use client';

import { useState } from 'react';
import {
  Search,
  Wallet,
  Percent,
  Edit3,
  ShieldCheck,
  Phone,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { useCurrencyStore } from '@/store/useCurrencyStore';

export interface AdminClientItem {
  id: number;
  nome: string;
  email: string;
  role?: string;
  telefone?: string;
  endereco?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  dataNascimento?: string;
  statusConta?: string;
  saldoCarteira: number;
  totalDepositadoHistorico: number;
  statusFinanceiro: string;
  inadimplente: boolean;
}

interface UserManagementTableProps {
  clients: AdminClientItem[];
  onOpenEditDrawer: (userId: number) => void;
  onOpenCreditModal: (client: AdminClientItem) => void;
  onApplyInterest: (clientId: number) => void;
  onOpenCreateModal?: () => void;
  onDeleteUser?: (client: AdminClientItem) => void;
  processingId: string | null;
}

type ClientFilterType = 'TODOS' | 'DEVEDORES' | 'EM_DIA' | 'SEM_CNH' | 'BLOQUEADOS';

export default function UserManagementTable({
  clients,
  onOpenEditDrawer,
  onOpenCreditModal,
  onApplyInterest,
  onOpenCreateModal,
  onDeleteUser,
  processingId,
}: UserManagementTableProps) {
  const { formatPrice } = useCurrencyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ClientFilterType>('TODOS');

  const filteredClients = (clients || []).filter((c) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNome = c.nome?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchCnh = c.cnhNumero?.includes(q);
      const matchTel = c.telefone?.includes(q);
      if (!matchNome && !matchEmail && !matchCnh && !matchTel) return false;
    }

    if (filter === 'DEVEDORES') return c.inadimplente;
    if (filter === 'EM_DIA') return !c.inadimplente;
    if (filter === 'SEM_CNH') return !c.cnhNumero || c.cnhNumero.trim() === '';
    if (filter === 'BLOQUEADOS') {
      return c.statusConta === 'BLOQUEADO_RESERVAS' || c.statusConta === 'SUSPENSO';
    }
    return true;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 max-w-xl">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar piloto por nome, e-mail, CNH ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0D1017] focus:bg-[#121622] px-4 py-2.5 rounded-full text-xs text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#FF1717]/40 pl-10 transition-all"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          </div>

          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="Cadastrar novo piloto ou administrador"
            >
              <Plus size={14} />
              <span>Novo Piloto</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#0D1017] p-1 rounded-full self-start lg:self-auto">
          {(
            [
              { id: 'TODOS', label: 'Todos' },
              { id: 'DEVEDORES', label: 'Inadimplentes' },
              { id: 'EM_DIA', label: 'Em dia' },
              { id: 'SEM_CNH', label: 'Sem CNH' },
              { id: 'BLOQUEADOS', label: 'Bloqueados' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filter === item.id
                  ? 'bg-white text-[#08090C]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="text-[11px] text-white/40 px-2.5 tabular-nums">
            {filteredClients.length} {filteredClients.length === 1 ? 'piloto' : 'pilotos'}
          </span>
        </div>
      </div>

      {/* Tabela de Pilotos */}
      {filteredClients.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0D1017] text-center text-xs text-white/50 space-y-2">
          <AlertCircle size={20} className="mx-auto text-white/30" />
          <p>Nenhum piloto encontrado para os critérios de busca.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-[#0D1017]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-white/45 text-[11px] font-medium">
              <tr>
                <th className="py-4 px-5">Piloto e Contato</th>
                <th className="py-4 px-5">Habilitação (CNH)</th>
                <th className="py-4 px-5">Total Depositado</th>
                <th className="py-4 px-5">Saldo Atual</th>
                <th className="py-4 px-5">Situação</th>
                <th className="py-4 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-5">
                    <p className="font-medium text-white">{c.nome}</p>
                    <p className="text-[11px] text-white/45 mt-0.5">{c.email}</p>
                    {c.telefone && (
                      <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Phone size={10} className="text-emerald-400" />
                        <span>{c.telefone}</span>
                      </p>
                    )}
                  </td>

                  <td className="py-4 px-5 tabular-nums">
                    {c.cnhNumero ? (
                      <div className="flex items-center gap-1.5 text-white/85">
                        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                        <span>{c.cnhNumero}</span>
                        {c.cnhCategoria && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#121622] text-white/70">
                            {c.cnhCategoria}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-white/40 text-xs">Não informada</span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-white/80 tabular-nums">
                    {formatPrice(c.totalDepositadoHistorico)}
                  </td>

                  <td
                    className={`py-4 px-5 font-semibold tabular-nums ${
                      c.saldoCarteira < 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {formatPrice(c.saldoCarteira)}
                  </td>

                  <td className="py-4 px-5">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                          c.inadimplente
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {c.inadimplente ? 'Inadimplente' : 'Regular'}
                      </span>
                      {c.statusConta && c.statusConta !== 'ATIVO' && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                          {c.statusConta === 'BLOQUEADO_RESERVAS' ? 'Bloqueado' : c.statusConta}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-5 text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenEditDrawer(c.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-white text-xs font-medium cursor-pointer transition-colors"
                      title="Editar ficha completa do piloto"
                    >
                      <Edit3 size={12} />
                      <span>Editar Ficha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCreditModal(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium cursor-pointer transition-colors"
                      title="Lançar recarga ou crédito de saldo"
                    >
                      <Wallet size={12} />
                      <span>Creditar</span>
                    </button>

                    {c.inadimplente && (
                      <button
                        type="button"
                        disabled={processingId === `interest-${c.id}`}
                        onClick={() => onApplyInterest(c.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium cursor-pointer transition-colors"
                        title="Aplicar juros contratuais de atraso (0,1%/dia)"
                      >
                        <Percent size={11} />
                        <span>Juros (0,1%)</span>
                      </button>
                    )}

                    {c.email === 'admin@apex.com' || (c.role && c.role.includes('ADMIN')) ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-medium"
                        title="Conta Administrador protegida"
                      >
                        <Lock size={11} />
                        <span>Protegido</span>
                      </span>
                    ) : (
                      onDeleteUser && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium cursor-pointer transition-colors"
                          title="Excluir piloto do sistema"
                        >
                          <Trash2 size={12} />
                          <span>Excluir</span>
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
