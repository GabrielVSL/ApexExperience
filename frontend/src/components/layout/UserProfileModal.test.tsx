import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserProfileModal from './UserProfileModal';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('UserProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: 'jwt-teste',
      user: { email: 'piloto@apex.com', role: 'CLIENTE' },
    });
    (api.get as any).mockResolvedValue({
      data: {
        id: 10,
        nome: 'Gabriel Piloto',
        email: 'piloto@apex.com',
        role: 'CLIENTE',
        telefone: '11987654321',
        endereco: 'Interlagos, SP',
        saldoCarteira: 5000,
      },
    });
    (api.put as any).mockResolvedValue({
      data: { message: 'Senha alterada com sucesso mediante validação de segurança.' },
    });
  });

  it('permite alterar senha e fecha sem deixar overlay bloqueando cliques', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <UserProfileModal isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );

    const securityTab = await screen.findByRole('button', { name: /Segurança/i });
    fireEvent.click(securityTab);

    fireEvent.change(screen.getByPlaceholderText('Digite sua senha atual'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'nova123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a nova senha'), {
      target: { value: 'nova123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Atualizar senha/i }));

    await waitFor(() => {
      expect(screen.getByText(/Senha alterada com sucesso\./i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Fechar painel da conta/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <UserProfileModal isOpen={false} onClose={onClose} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Minha conta/i })).toBeNull();
    });
  });
});
