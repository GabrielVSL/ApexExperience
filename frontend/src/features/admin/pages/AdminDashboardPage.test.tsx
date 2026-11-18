import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from './AdminDashboardPage';
import AdminUsersPage from './AdminUsersPage';
import { api } from '@/services/api';

vi.mock('@/services/api');

// Mock ResizeObserver para compatibilidade do Recharts com JSDOM
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockDashboardData = {
  faturamentoTotalBRL: 85000,
  faturamentoConfirmadoBRL: 70000,
  faturamentoPendenteBRL: 15000,
  lucroLiquidoEstimadoBRL: 47600,
  totalDescontosConcedidosBRL: 0,
  totalSinistrosCobradosBRL: 4500,
  totalJurosRecebidosBRL: 120,
  totalSessoesAgendadas: 18,
  sessoesConfirmadas: 14,
  sessoesPendentes: 4,
  timelineFaturamento: [
    { mes: 'NOV/26', faturamento: 70000, lucro: 47600, sessoes: 14 },
  ],
  distribuicaoModalidades: [
    { modalidade: 'Track Experience', tipoServico: 'TRACK_EXPERIENCE', quantidade: 10, totalBRL: 50000 },
    { modalidade: 'Fast Lap', tipoServico: 'FAST_LAP', quantidade: 4, totalBRL: 20000 },
  ],
  faturamentoPorCircuito: {
    Interlagos: 35000,
    Nürburgring: 35000,
  },
  ocupacaoBoxesPorAutodromo: {
    interlagos: {
      circuitoNome: 'Interlagos',
      totalVagas: 30,
      totalOcupadas: 18,
      taxaOcupacaoPercentual: 60,
    },
  },
  supercarrosMaisPilotados: {
    'Porsche 911 GT3 RS': 8,
    'Mercedes-AMG GT Track': 6,
  },
  metricasApexPay: {
    totalPilotosCadastrados: 25,
    pilotosInadimplentes: 2,
    pilotosEmDia: 23,
    saldoTotalCustodiadoBRL: 120000,
    dividaAtivaTotalBRL: 9000,
  },
  clientes: [
    {
      id: 1,
      nome: 'Ayrton Senna',
      email: 'senna@apex.com',
      telefone: '11987654321',
      cnhNumero: '52798802310',
      cnhCategoria: 'B',
      statusConta: 'ATIVO',
      saldoCarteira: 25000,
      totalDepositadoHistorico: 50000,
      statusFinanceiro: 'REGULAR',
      inadimplente: false,
    },
    {
      id: 2,
      nome: 'Alain Prost',
      email: 'prost@apex.com',
      telefone: '11911112222',
      cnhNumero: '',
      cnhCategoria: 'B',
      statusConta: 'BLOQUEADO_RESERVAS',
      saldoCarteira: -4500,
      totalDepositadoHistorico: 10000,
      statusFinanceiro: 'INADIMPLENTE',
      inadimplente: true,
    },
  ],
  agendamentos: [],
  saudeMensageriaQueue: {
    motor: 'VirtualThreads',
    status: 'ONLINE',
    tamanhoFilaAtual: 0,
    tamanhoDlqAtual: 0,
    totalEnfileiradas: 18,
    totalSucessos: 18,
    totalFalhas: 0,
    totalDlq: 0,
    dlqNome: 'apex.reservas.dlq',
  },
};

describe('AdminDashboardPage e AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({ data: mockDashboardData });
  });

  it('deve renderizar o Painel Executivo focado em KPIs, gráficos reais e ocupação sem bandeiras fictícias', async () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Painel Executivo Apex')).toBeDefined();
    expect(screen.getByText('Lucro Líquido Operacional')).toBeDefined();
    expect(screen.getByText('Dívida Ativa ApexPay')).toBeDefined();
    expect(screen.getByText('Custódia ApexPay Sandbox')).toBeDefined();
    expect(screen.getByText(/Receita & Lucro por Mês/i)).toBeDefined();
    expect(screen.getByText(/Ocupação das vagas nos 8 autódromos/i)).toBeDefined();
    expect(screen.queryByText(/Bandeira Verde/i)).toBeNull();
  });

  it('deve renderizar a página separada de Gestão de Pilotos com busca', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Ayrton Senna')).toBeDefined();
    expect(screen.getByText('Alain Prost')).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar piloto por nome/i)).toBeDefined();
  });

  it('deve abrir o Drawer de Edição 360° ao clicar em Editar Ficha em AdminUsersPage', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/api/admin/usuarios/1')) {
        return Promise.resolve({
          data: {
            ...mockDashboardData.clientes[0],
            endereco: 'Rua de Interlagos, 100',
            dataNascimento: '1985-03-21',
            historicoSessoes: [],
            resumoCarteira: { saldo: 25000, totalDepositado: 50000, faturaPendente: 0 },
          },
        });
      }
      return Promise.resolve({ data: mockDashboardData });
    });

    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    const editBtns = await screen.findAllByRole('button', { name: /Editar Ficha/i });
    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Piloto #1/i)).toBeDefined();
      expect(screen.getByText('CNH & Piloto')).toBeDefined();
      expect(screen.getByText('ApexPay')).toBeDefined();
      expect(screen.getByText('Segurança & Status')).toBeDefined();
    });
  });

  it('deve abrir o modal de cadastro de novo piloto ao clicar em Novo Piloto em AdminUsersPage', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    const novoPilotoBtn = await screen.findByRole('button', { name: /Novo Piloto/i });
    fireEvent.click(novoPilotoBtn);

    expect(await screen.findByText(/Novo Cadastro no Paddock/i)).toBeDefined();
    expect(screen.getByPlaceholderText('Ex: Gabriel Verstappen')).toBeDefined();
    expect(screen.getByPlaceholderText('piloto@apex.com')).toBeDefined();
    expect(screen.getByRole('button', { name: /Cadastrar no Paddock/i })).toBeDefined();
  });
});
