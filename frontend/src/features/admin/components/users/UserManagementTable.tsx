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
    // Busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNome = c.nome?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchCnh = c.cnhNumero?.includes(q);
      const matchTel = c.telefone?.includes(q);
      if (!matchNome && !matchEmail && !matchCnh && !matchTel) return false;
    }

    // Filtros por pílula
    if (filter === 'DEVEDORES') return c.inadimplente;
    if (filter === 'EM_DIA') return !c.inadimplente;
    if (filter === 'SEM_CNH') return !c.cnhNumero || c.cnhNumero.trim() === '';
    if (filter === 'BLOQUEADOS') return c.statusConta === 'BLOQUEADO_RESERVAS' || c.statusConta === 'SUSPENSO';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar piloto por nome, e-mail, CNH ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 focus:border-[#FF1717] px-3.5 py-2 rounded-xl text-xs text-white outline-none pl-9 transition-colors"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          </div>

          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF1717] hover:bg-[#E10600] text-white text-xs font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="Cadastrar novo piloto ou administrador"
            >
              <Plus size={14} />
              <span>Novo Piloto</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'TODOS', label: 'Todos' },
              { id: 'DEVEDORES', label: 'Inadimplentes' },
              { id: 'EM_DIA', label: 'Em Dia' },
              { id: 'SEM_CNH', label: 'Sem CNH' },
              { id: 'BLOQUEADOS', label: 'Bloqueados' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer border ${
                filter === item.id
                  ? 'bg-white text-[#08090C] border-white font-semibold shadow-sm'
                  : 'bg-white/[0.03] text-white/60 border-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="text-[11px] font-mono text-white/40 pl-2">
            {filteredClients.length} piloto(s)
          </span>
        </div>
      </div>

      {/* Tabela de Pilotos */}
      {filteredClients.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-xs text-white/50 space-y-1.5">
          <AlertCircle size={20} className="mx-auto text-white/30" />
          <p>Nenhum piloto encontrado para os critérios de busca.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.015]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-white/50 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Piloto & Contato</th>
                <th className="py-3.5 px-4">Habilitação (CNH)</th>
                <th className="py-3.5 px-4">Recargas Sandbox</th>
                <th className="py-3.5 px-4">Saldo Carteira</th>
                <th className="py-3.5 px-4">Status Conta</th>
                <th className="py-3.5 px-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-white">{c.nome}</p>
                    <p className="text-[11px] text-white/45 font-mono">{c.email}</p>
                    {c.telefone && (
                      <p className="text-[10px] text-white/40 font-mono flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-[#25D366]" />
                        <span>{c.telefone}</span>
                      </p>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    {c.cnhNumero ? (
                      <div className="flex items-center gap-1.5 text-white/80">
                        <ShieldCheck size={13} className="text-emerald-400" />
                        <span>{c.cnhNumero}</span>
                        {c.cnhCategoria && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/70">
                            {c.cnhCategoria}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-white/40 text-[11px] italic">Não informada</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-white/80">
                    {formatPrice(c.totalDepositadoHistorico)}
                  </td>

                  <td
                    className={`py-3.5 px-4 font-mono font-semibold ${
                      c.saldoCarteira < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatPrice(c.saldoCarteira)}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                          c.inadimplente
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {c.statusFinanceiro}
                      </span>
                      {c.statusConta && c.statusConta !== 'ATIVO' && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {c.statusConta}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                    {/* Botão de Edição Completa da Ficha (Drawer) */}
                    <button
                      type="button"
                      onClick={() => onOpenEditDrawer(c.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-medium cursor-pointer transition-colors"
                      title="Editar ficha completa do piloto"
                    >
                      <Edit3 size={12} />
                      <span>Editar Ficha</span>
                    </button>

                    {/* Botão de Crédito Administrativo */}
                    <button
                      type="button"
                      onClick={() => onOpenCreditModal(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium cursor-pointer transition-colors"
                      title="Lançar recarga ou crédito de saldo"
                    >
                      <Wallet size={12} />
                      <span>Creditar</span>
                    </button>

                    {/* Botão de Aplicação de Juros Diários para Inadimplentes */}
                    {c.inadimplente && (
                      <button
                        type="button"
                        disabled={processingId === `interest-${c.id}`}
                        onClick={() => onApplyInterest(c.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 text-[11px] font-medium cursor-pointer transition-colors"
                        title="Aplicar juros contratuais de atraso (0,1%/dia)"
                      >
                        <Percent size={11} />
                        <span>Juros (0,1%)</span>
                      </button>
                    )}

                    {/* Ação de Exclusão ou Indicador de Admin Protegido */}
                    {c.email === 'admin@apex.com' || (c.role && c.role.includes('ADMIN')) ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono"
                        title="Conta Administrador protegida contra exclusão e alteração de senha"
                      >
                        <Lock size={10} />
                        <span>Protegido</span>
                      </span>
                    ) : (
                      onDeleteUser && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 text-[11px] font-medium cursor-pointer transition-colors"
                          title="Excluir piloto do sistema"
                        >
                          <Trash2 size={11} />
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
