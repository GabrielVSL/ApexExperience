'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trash2, Users, Wallet } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import UserManagementTable, { AdminClientItem } from '../components/users/UserManagementTable';
import UserEditDrawer from '../components/users/UserEditDrawer';
import UserCreateModal from '../components/users/UserCreateModal';

interface AdminUsersDashboardResponse {
  clientes: AdminClientItem[];
  metricasApexPay: {
    totalPilotosCadastrados: number;
    pilotosInadimplentes: number;
    pilotosEmDia: number;
    saldoTotalCustodiadoBRL: number;
    dividaAtivaTotalBRL: number;
  };
}

export default function AdminUsersPage() {
  const { formatPrice } = useCurrencyStore();
  const [clientes, setClientes] = useState<AdminClientItem[]>([]);
  const [metrics, setMetrics] = useState<AdminUsersDashboardResponse['metricasApexPay'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  const [creditModalClient, setCreditModalClient] = useState<AdminClientItem | null>(null);
  const [creditValor, setCreditValor] = useState('500');
  const [creditDescricao, setCreditDescricao] = useState('Ajuste Administrativo Apex');

  const [deleteTargetClient, setDeleteTargetClient] = useState<AdminClientItem | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<AdminUsersDashboardResponse>('/api/admin/dashboard');
      setClientes(res.data?.clientes || []);
      setMetrics(res.data?.metricasApexPay || null);
    } catch {
      toast.error('Erro ao carregar lista de pilotos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeleteUser = (client: AdminClientItem) => {
    if (client.email === 'admin@apex.com') {
      toast.error('A conta do Administrador principal é protegida e não pode ser excluída.');
      return;
    }
    setDeleteTargetClient(client);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetClient) return;

    try {
      setProcessingId(`delete-${deleteTargetClient.id}`);
      const res = await api.delete(`/api/admin/usuarios/${deleteTargetClient.id}`);
      toast.success(
        res.data?.message || `Piloto ${deleteTargetClient.nome} removido com sucesso.`
      );
      setDeleteTargetClient(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao excluir piloto.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApplyInterest = async (clientId: number) => {
    try {
      setProcessingId(`interest-${clientId}`);
      await api.post(`/api/admin/clientes/${clientId}/aplicar-juros`, {});
      toast.success('Juros diários (0,1%) aplicados sobre o saldo devedor!');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao aplicar juros.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreditBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalClient) return;
    const valorNum = Number(creditValor);
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    try {
      setProcessingId(`credit-${creditModalClient.id}`);
      await api.post('/api/apexpay/deposito', {
        email: creditModalClient.email,
        valor: valorNum,
        descricao: creditDescricao.trim() || 'Ajuste Administrativo Apex',
      });
      toast.success(`Crédito de ${formatPrice(valorNum)} lançado para ${creditModalClient.nome}!`);
      setCreditModalClient(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao creditar saldo do piloto.');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C] font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF1717]" size={30} />
          <span className="text-xs text-white/50">Carregando gestão de pilotos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-white pt-28 pb-24 px-6 font-sans selection:bg-[#FF1717] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
              <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                <Users size={12} />
              </span>
              <span className="text-xs font-medium text-white/80">
                Base de clientes · {clientes.length}{' '}
                {clientes.length === 1 ? 'piloto' : 'pilotos'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.08]">
              Gestão de{' '}
              <span className="italic font-light text-white/85">pilotos.</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/55 max-w-2xl leading-relaxed">
              Consulte CNH cadastrada, gerencie saldo ApexPay, aplique juros contratuais em pendências e edite dados ou permissões de acesso.
            </p>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            className="self-start sm:self-auto px-5 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-white/90 text-[#08090C] transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw size={13} />
            <span>Atualizar</span>
          </button>
        </header>

        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[#0D1017] space-y-1.5">
              <span className="text-xs text-white/50 block">Total cadastrados</span>
              <span className="text-2xl font-medium text-white tabular-nums">
                {metrics.totalPilotosCadastrados}
              </span>
            </div>
            <div className="p-5 rounded-3xl bg-[#0D1017] space-y-1.5">
              <span className="text-xs text-white/50 block">Contas em dia</span>
              <span className="text-2xl font-medium text-emerald-300 tabular-nums">
                {metrics.pilotosEmDia}
              </span>
            </div>
            <div className="p-5 rounded-3xl bg-[#0D1017] space-y-1.5">
              <span className="text-xs text-white/50 block">Inadimplentes</span>
              <span className="text-2xl font-medium text-rose-300 tabular-nums">
                {metrics.pilotosInadimplentes}
              </span>
            </div>
            <div className="p-5 rounded-3xl bg-[#0D1017] space-y-1.5">
              <span className="text-xs text-white/50 block">Saldo total em custódia</span>
              <span className="text-2xl font-medium text-white tabular-nums">
                {formatPrice(metrics.saldoTotalCustodiadoBRL)}
              </span>
            </div>
          </div>
        )}

        <UserManagementTable
          clients={clientes}
          onOpenEditDrawer={(id) => setEditingUserId(id)}
          onOpenCreateModal={() => setIsCreateUserModalOpen(true)}
          onDeleteUser={handleDeleteUser}
          onOpenCreditModal={(client) => {
            setCreditModalClient(client);
            setCreditValor('500');
            setCreditDescricao('Ajuste Administrativo Apex');
          }}
          onApplyInterest={handleApplyInterest}
          processingId={processingId}
        />
      </div>

      <UserEditDrawer
        userId={editingUserId}
        isOpen={editingUserId !== null}
        onClose={() => setEditingUserId(null)}
        onUserUpdated={loadUsers}
      />

      <UserCreateModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onUserCreated={loadUsers}
      />

      {creditModalClient && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#08090C]/80 backdrop-blur-md font-sans"
          onClick={() => setCreditModalClient(null)}
        >
          <form
            onSubmit={handleCreditBalance}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#0D1017] shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Wallet size={18} className="text-emerald-400" />
              Creditar Saldo ApexPay
            </h3>
            <p className="text-xs text-white/60">
              Piloto: <strong className="text-white">{creditModalClient.nome}</strong> (
              {creditModalClient.email}).
            </p>
            <div>
              <label className="text-xs text-white/60 block mb-1.5">Valor do crédito (R$)</label>
              <input
                type="number"
                min="1"
                step="50"
                required
                value={creditValor}
                onChange={(e) => setCreditValor(e.target.value)}
                className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400/40 tabular-nums transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1.5">Descrição / Motivo</label>
              <input
                type="text"
                required
                value={creditDescricao}
                onChange={(e) => setCreditDescricao(e.target.value)}
                className="w-full bg-[#121622] focus:bg-[#171C2B] px-4 py-3 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreditModalClient(null)}
                className="flex-1 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={processingId === `credit-${creditModalClient.id}`}
                className="flex-1 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#08090C] text-xs font-semibold cursor-pointer transition-colors"
              >
                Confirmar crédito
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTargetClient && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#08090C]/80 backdrop-blur-md font-sans"
          onClick={() => setDeleteTargetClient(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar exclusão de piloto"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#0D1017] shadow-2xl space-y-5"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-lg font-medium text-white">Excluir conta do piloto</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Tem certeza que deseja excluir ou desativar{' '}
                  <strong className="text-white">{deleteTargetClient.nome}</strong> (
                  {deleteTargetClient.email})?
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#121622] p-3.5 text-xs text-white/55 leading-relaxed">
              Contas sem histórico serão removidas definitivamente; contas com sessões registradas serão desativadas para preservar o histórico financeiro.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTargetClient(null)}
                className="flex-1 py-2.5 rounded-full bg-[#121622] hover:bg-white/[0.08] text-xs font-medium text-white/80 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingId === `delete-${deleteTargetClient.id}`}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 rounded-full bg-[#FF1717] hover:bg-[#e01414] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                {processingId === `delete-${deleteTargetClient.id}`
                  ? 'Processando...'
                  : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
